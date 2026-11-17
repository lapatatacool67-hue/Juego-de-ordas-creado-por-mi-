import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

type MapId =
  | 'tutorial'
  | 'city'
  | 'desert'
  | 'cubes'
  | 'pixel'
  | 'backrooms'
  | 'pueblo'
  | 'duel'
  | 'nightcamp';

const VOTEABLE_MAPS: MapId[] = ['city', 'desert', 'cubes', 'pixel', 'pueblo', 'backrooms'];

type BuildPieceType = 'stairs' | 'floor' | 'ramp' | 'wall';

interface BuildPieceNetState {
  id: string;
  type: BuildPieceType;
  gx: number;
  gy: number;
  gz: number;
  dir: number;
  editMask: boolean[];
  hp: number;
  maxHp: number;
  ownerId: string;
}

interface PlayerNetState {
  id: string;
  name: string;
  skinId?: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  weaponId: string;
  isCrouching: boolean;
  isMoving?: boolean;
  isSprinting?: boolean;
  isDashing?: boolean;
  health: number;
  maxHealth: number;
  kills: number;
}

interface RoomState {
  roomId: string;
  mapId: MapId;
  hostId: string;
  wave: number;
  phase: 'waiting' | 'playing';
  votes: Map<string, MapId>;
  voteDeadlineMs: number | null;
  players: Map<string, { ws: WebSocket; state: PlayerNetState }>;
  builds: Map<string, BuildPieceNetState>;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

const rooms = new Map<string, RoomState>();
const clientMeta = new Map<WebSocket, { playerId: string; roomId: string | null }>();

let playerSeq = 0;

function isValidMapId(raw: string): raw is MapId {
  return (
    raw === 'tutorial' ||
    raw === 'city' ||
    raw === 'desert' ||
    raw === 'cubes' ||
    raw === 'pixel' ||
    raw === 'backrooms' ||
    raw === 'pueblo' ||
    raw === 'duel' ||
    raw === 'nightcamp'
  );
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function sendJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function getRoomSummaries() {
  const list: Array<{
    roomId: string;
    mapId: MapId;
    hostName: string;
    playerCount: number;
    wave: number;
  }> = [];
  for (const room of rooms.values()) {
    const hostEntry = room.players.get(room.hostId);
    list.push({
      roomId: room.roomId,
      mapId: room.mapId,
      hostName: hostEntry?.state.name ?? 'Anfitrión',
      playerCount: room.players.size,
      wave: room.wave,
    });
  }
  return list;
}

function broadcastRoomList(wss: WebSocketServer) {
  const payload = { type: 'room:list', rooms: getRoomSummaries() };
  for (const client of wss.clients) {
    sendJson(client, payload);
  }
}

function broadcastToRoom(room: RoomState, payload: unknown, excludePlayerId?: string) {
  for (const [pid, entry] of room.players.entries()) {
    if (excludePlayerId && pid === excludePlayerId) continue;
    sendJson(entry.ws, payload);
  }
}

function broadcastRoomPeers(room: RoomState) {
  const peers = Array.from(room.players.values()).map((entry) => entry.state);
  broadcastToRoom(room, {
    type: 'room:peers',
    roomId: room.roomId,
    mapId: room.mapId,
    hostId: room.hostId,
    wave: room.wave,
    peers,
  });
}

function computeVoteSnapshot(room: RoomState) {
  const votesByMap: Partial<Record<MapId, number>> = {};
  const votesByPlayer: Record<string, MapId> = {};
  for (const m of VOTEABLE_MAPS) {
    votesByMap[m] = 0;
  }
  for (const [pid, m] of room.votes.entries()) {
    if (VOTEABLE_MAPS.includes(m)) {
      votesByPlayer[pid] = m;
      votesByMap[m] = (votesByMap[m] ?? 0) + 1;
    }
  }
  let winningMapId: MapId = 'city';
  let bestCount = -1;
  for (const m of VOTEABLE_MAPS) {
    const count = votesByMap[m] ?? 0;
    if (count > bestCount) {
      bestCount = count;
      winningMapId = m;
    }
  }
  const secondsRemaining =
    room.phase === 'waiting' && room.voteDeadlineMs !== null
      ? Math.max(0, Math.ceil((room.voteDeadlineMs - Date.now()) / 1000))
      : null;
  return {
    type: 'room:votes',
    phase: room.phase,
    votesByMap,
    votesByPlayer,
    winningMapId,
    secondsRemaining,
    voteableMaps: VOTEABLE_MAPS,
  };
}

function broadcastRoomVotes(room: RoomState) {
  broadcastToRoom(room, computeVoteSnapshot(room));
}

function launchVotedMap(room: RoomState, wss: WebSocketServer) {
  const snap = computeVoteSnapshot(room);
  const winner = snap.winningMapId;
  room.mapId = winner;
  room.phase = 'playing';
  room.wave = 1;
  room.votes.clear();
  room.voteDeadlineMs = null;
  room.builds.clear();
  broadcastToRoom(room, { type: 'room:map', mapId: winner });
  broadcastRoomVotes(room);
  broadcastRoomPeers(room);
  broadcastRoomList(wss);
}

function leaveCurrentRoom(ws: WebSocket, wss: WebSocketServer) {
  const meta = clientMeta.get(ws);
  if (!meta || !meta.roomId) return;
  const room = rooms.get(meta.roomId);
  meta.roomId = null;
  if (!room) return;

  room.players.delete(meta.playerId);
  room.votes.delete(meta.playerId);
  if (room.players.size === 0) {
    rooms.delete(room.roomId);
  } else {
    if (room.hostId === meta.playerId) {
      const nextHost = room.players.keys().next().value as string | undefined;
      if (nextHost) {
        room.hostId = nextHost;
      }
    }
    broadcastRoomPeers(room);
    if (room.phase === 'waiting') {
      broadcastRoomVotes(room);
    }
  }
  broadcastRoomList(wss);
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size });
  });

  app.get('/api/rooms', (_req, res) => {
    res.json({ rooms: getRoomSummaries() });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    playerSeq += 1;
    const playerId = `p-${playerSeq}-${Math.random().toString(36).slice(2, 6)}`;
    clientMeta.set(ws, { playerId, roomId: null });

    sendJson(ws, {
      type: 'welcome',
      playerId,
      rooms: getRoomSummaries(),
    });

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(raw)) as Record<string, unknown>;
      } catch {
        return;
      }

      const meta = clientMeta.get(ws);
      if (!meta) return;

      const type = String(msg.type || '');

      if (type === 'room:list') {
        sendJson(ws, { type: 'room:list', rooms: getRoomSummaries() });
        return;
      }

      if (type === 'room:join_lobby') {
        const playerName = String(msg.playerName || `Soldado ${playerSeq}`).slice(0, 18);
        const skinId = String(msg.skinId || 'soldier');

        if (meta.roomId) {
          const existing = rooms.get(meta.roomId);
          if (existing && existing.phase === 'waiting' && existing.mapId === 'duel') {
            const pEntry = existing.players.get(meta.playerId);
            if (pEntry) {
              pEntry.state.name = playerName;
              pEntry.state.skinId = skinId;
            }
            sendJson(ws, {
              type: 'room:joined',
              roomId: existing.roomId,
              mapId: existing.mapId,
              hostId: existing.hostId,
              playerId: meta.playerId,
            });
            sendJson(ws, {
              type: 'build:sync',
              builds: Array.from(existing.builds.values()),
            });
            sendJson(ws, computeVoteSnapshot(existing));
            broadcastRoomPeers(existing);
            return;
          }
          leaveCurrentRoom(ws, wss);
        }

        let lobbyRoom: RoomState | undefined;
        for (const candidate of rooms.values()) {
          if (candidate.phase === 'waiting' && candidate.mapId === 'duel' && candidate.players.size < 8) {
            lobbyRoom = candidate;
            break;
          }
        }

        if (lobbyRoom) {
          const spawnZ = lobbyRoom.players.size % 2 === 1 ? -12 : 12;
          const joinedPlayer: PlayerNetState = {
            id: meta.playerId,
            name: playerName,
            skinId,
            x: ((lobbyRoom.players.size % 3) - 1) * 2.5,
            y: 0,
            z: spawnZ,
            yaw: spawnZ < 0 ? Math.PI : 0,
            pitch: 0,
            weaponId: 'rifle',
            isCrouching: false,
            health: 100,
            maxHealth: 100,
            kills: 0,
          };
          lobbyRoom.players.set(meta.playerId, { ws, state: joinedPlayer });
          meta.roomId = lobbyRoom.roomId;

          sendJson(ws, {
            type: 'room:joined',
            roomId: lobbyRoom.roomId,
            mapId: lobbyRoom.mapId,
            hostId: lobbyRoom.hostId,
            playerId: meta.playerId,
          });
          sendJson(ws, {
            type: 'build:sync',
            builds: Array.from(lobbyRoom.builds.values()),
          });
          broadcastRoomVotes(lobbyRoom);
          broadcastRoomPeers(lobbyRoom);
          broadcastRoomList(wss);
          return;
        }

        const roomId = generateRoomCode();
        const initialPlayer: PlayerNetState = {
          id: meta.playerId,
          name: playerName,
          skinId,
          x: 0,
          y: 0,
          z: 12,
          yaw: 0,
          pitch: 0,
          weaponId: 'rifle',
          isCrouching: false,
          health: 100,
          maxHealth: 100,
          kills: 0,
        };
        const newLobby: RoomState = {
          roomId,
          mapId: 'duel',
          hostId: meta.playerId,
          wave: 1,
          phase: 'waiting',
          votes: new Map(),
          voteDeadlineMs: null,
          players: new Map([[meta.playerId, { ws, state: initialPlayer }]]),
          builds: new Map(),
        };
        rooms.set(roomId, newLobby);
        meta.roomId = roomId;

        sendJson(ws, {
          type: 'room:joined',
          roomId,
          mapId: 'duel',
          hostId: newLobby.hostId,
          playerId: meta.playerId,
        });
        sendJson(ws, computeVoteSnapshot(newLobby));
        broadcastRoomPeers(newLobby);
        broadcastRoomList(wss);
        return;
      }

      if (type === 'room:create') {
        leaveCurrentRoom(ws, wss);
        const rawMap = String(msg.mapId || 'duel');
        const mapId: MapId = isValidMapId(rawMap) ? rawMap : 'duel';
        const playerName = String(msg.playerName || `Soldado ${playerSeq}`).slice(0, 18);
        const skinId = String(msg.skinId || 'soldier');
        const roomId = generateRoomCode();

        const initialPlayer: PlayerNetState = {
          id: meta.playerId,
          name: playerName,
          skinId,
          x: 0,
          y: 0,
          z: mapId === 'duel' ? 12 : 10,
          yaw: 0,
          pitch: 0,
          weaponId: 'rifle',
          isCrouching: false,
          health: 100,
          maxHealth: 100,
          kills: 0,
        };

        const room: RoomState = {
          roomId,
          mapId,
          hostId: meta.playerId,
          wave: 1,
          phase: mapId === 'duel' ? 'waiting' : 'playing',
          votes: new Map(),
          voteDeadlineMs: null,
          players: new Map([[meta.playerId, { ws, state: initialPlayer }]]),
          builds: new Map(),
        };
        rooms.set(roomId, room);
        meta.roomId = roomId;

        sendJson(ws, {
          type: 'room:joined',
          roomId,
          mapId,
          hostId: room.hostId,
          playerId: meta.playerId,
        });
        sendJson(ws, computeVoteSnapshot(room));
        broadcastRoomPeers(room);
        broadcastRoomList(wss);
        return;
      }

      if (type === 'room:join') {
        const roomId = String(msg.roomId || '').trim().toUpperCase();
        const room = rooms.get(roomId);
        if (!room) {
          sendJson(ws, { type: 'room:error', message: `No existe ninguna sala con código ${roomId}.` });
          return;
        }
        leaveCurrentRoom(ws, wss);
        const playerName = String(msg.playerName || `Soldado ${playerSeq}`).slice(0, 18);
        const skinId = String(msg.skinId || 'soldier');
        const joinedPlayer: PlayerNetState = {
          id: meta.playerId,
          name: playerName,
          skinId,
          x: 0,
          y: 0,
          z: room.mapId === 'duel' ? -12 : 10,
          yaw: room.mapId === 'duel' ? Math.PI : 0,
          pitch: 0,
          weaponId: 'rifle',
          isCrouching: false,
          health: 100,
          maxHealth: 100,
          kills: 0,
        };
        room.players.set(meta.playerId, { ws, state: joinedPlayer });
        meta.roomId = roomId;

        sendJson(ws, {
          type: 'room:joined',
          roomId,
          mapId: room.mapId,
          hostId: room.hostId,
          playerId: meta.playerId,
        });
        sendJson(ws, {
          type: 'build:sync',
          builds: Array.from(room.builds.values()),
        });
        sendJson(ws, computeVoteSnapshot(room));
        broadcastRoomPeers(room);
        broadcastRoomList(wss);
        return;
      }

      if (type === 'room:leave') {
        leaveCurrentRoom(ws, wss);
        sendJson(ws, { type: 'room:left' });
        return;
      }

      if (!meta.roomId) return;
      const room = rooms.get(meta.roomId);
      if (!room) return;

      if (type === 'room:vote') {
        if (room.phase !== 'waiting') return;
        const rawMap = String(msg.mapId || '');
        if (!VOTEABLE_MAPS.includes(rawMap as MapId)) return;
        room.votes.set(meta.playerId, rawMap as MapId);
        if (room.voteDeadlineMs === null) {
          room.voteDeadlineMs = Date.now() + 20000;
        }
        broadcastRoomVotes(room);
        return;
      }

      if (type === 'room:start_voted' && room.hostId === meta.playerId) {
        if (room.phase === 'waiting') {
          launchVotedMap(room, wss);
        }
        return;
      }

      if (type === 'room:map' && room.hostId === meta.playerId) {
        const rawMap = String(msg.mapId || room.mapId);
        if (isValidMapId(rawMap)) {
          room.mapId = rawMap;
          room.phase = rawMap === 'duel' ? 'waiting' : 'playing';
          room.wave = 1;
          room.votes.clear();
          room.voteDeadlineMs = null;
          room.builds.clear();
          broadcastToRoom(room, { type: 'room:map', mapId: room.mapId }, meta.playerId);
          broadcastRoomVotes(room);
          broadcastRoomPeers(room);
          broadcastRoomList(wss);
        }
        return;
      }

      if (type === 'player:state') {
        const entry = room.players.get(meta.playerId);
        if (!entry) return;
        const s = entry.state;
        s.x = Number(msg.x) || 0;
        s.y = Number(msg.y) || 0;
        s.z = Number(msg.z) || 0;
        s.yaw = Number(msg.yaw) || 0;
        s.pitch = Number(msg.pitch) || 0;
        s.weaponId = String(msg.weaponId || 'rifle');
        if (typeof msg.skinId === 'string') s.skinId = msg.skinId;
        s.isCrouching = Boolean(msg.isCrouching);
        s.isMoving = Boolean(msg.isMoving);
        s.isSprinting = Boolean(msg.isSprinting);
        s.isDashing = Boolean(msg.isDashing);
        s.health = Number(msg.health ?? s.health);
        s.maxHealth = Number(msg.maxHealth ?? s.maxHealth);
        s.kills = Number(msg.kills ?? s.kills);

        broadcastToRoom(
          room,
          {
            type: 'player:state',
            player: s,
          },
          meta.playerId
        );
        return;
      }

      if (type === 'player:shoot') {
        broadcastToRoom(
          room,
          {
            type: 'player:shoot',
            playerId: meta.playerId,
            start: msg.start,
            end: msg.end,
            weaponId: msg.weaponId,
          },
          meta.playerId
        );
        return;
      }

      if (type === 'player:grenade') {
        broadcastToRoom(
          room,
          {
            type: 'player:grenade',
            playerId: meta.playerId,
            pos: msg.pos,
            vel: msg.vel,
            fuseRemaining: msg.fuseRemaining,
          },
          meta.playerId
        );
        return;
      }

      if (type === 'build:place') {
        const rawPiece = msg.piece as BuildPieceNetState | undefined;
        if (!rawPiece || !rawPiece.id) return;
        const piece: BuildPieceNetState = {
          id: String(rawPiece.id),
          type: rawPiece.type,
          gx: Number(rawPiece.gx) || 0,
          gy: Number(rawPiece.gy) || 0,
          gz: Number(rawPiece.gz) || 0,
          dir: Number(rawPiece.dir) || 0,
          editMask: Array.isArray(rawPiece.editMask) ? rawPiece.editMask.map(Boolean) : [true],
          hp: Number(rawPiece.hp) || 180,
          maxHp: Number(rawPiece.maxHp) || 180,
          ownerId: meta.playerId,
        };
        if (room.builds.size < 450) {
          room.builds.set(piece.id, piece);
          broadcastToRoom(room, { type: 'build:place', piece }, meta.playerId);
        }
        return;
      }

      if (type === 'build:edit') {
        const id = String(msg.id || '');
        const piece = room.builds.get(id);
        if (!piece || !Array.isArray(msg.editMask)) return;
        piece.editMask = msg.editMask.map(Boolean);
        broadcastToRoom(
          room,
          { type: 'build:edit', id, editMask: piece.editMask },
          meta.playerId
        );
        return;
      }

      if (type === 'build:damage') {
        const id = String(msg.id || '');
        const dmg = Math.max(0, Number(msg.damage) || 0);
        const piece = room.builds.get(id);
        if (!piece) return;
        piece.hp = Math.max(0, piece.hp - dmg);
        if (piece.hp <= 0) {
          room.builds.delete(id);
          broadcastToRoom(room, { type: 'build:destroy', id });
        } else {
          broadcastToRoom(room, { type: 'build:hp', id, hp: piece.hp }, meta.playerId);
        }
        return;
      }

      if (type === 'build:clear') {
        room.builds.clear();
        broadcastToRoom(room, { type: 'build:clear' }, meta.playerId);
        return;
      }

      if (type === 'pvp:hit') {
        const targetPlayerId = String(msg.targetPlayerId || '');
        const damage = Math.max(0, Number(msg.damage) || 0);
        const hitZone = msg.hitZone === 'head' ? 'head' : 'body';
        const targetEntry = room.players.get(targetPlayerId);
        const senderEntry = room.players.get(meta.playerId);
        if (targetEntry && targetPlayerId !== meta.playerId) {
          sendJson(targetEntry.ws, {
            type: 'pvp:hit',
            fromPlayerId: meta.playerId,
            fromPlayerName: senderEntry?.state.name ?? 'Rival',
            damage,
            hitZone,
          });
        }
        return;
      }

      if (type === 'horde:sync' && room.hostId === meta.playerId) {
        room.wave = Number(msg.wave ?? room.wave);
        broadcastToRoom(
          room,
          {
            type: 'horde:sync',
            wave: room.wave,
            defeatedInWave: msg.defeatedInWave,
            totalInWave: msg.totalInWave,
            victory: Boolean(msg.victory),
            enemies: msg.enemies,
          },
          meta.playerId
        );
        return;
      }

      if (type === 'enemy:damage') {
        const hostEntry = room.players.get(room.hostId);
        if (hostEntry && room.hostId !== meta.playerId) {
          sendJson(hostEntry.ws, {
            type: 'enemy:damage',
            fromPlayerId: meta.playerId,
            enemyId: msg.enemyId,
            damage: msg.damage,
            hitZone: msg.hitZone,
          });
        }
      }
    });

    ws.on('close', () => {
      leaveCurrentRoom(ws, wss);
      clientMeta.delete(ws);
    });
  });

  setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      if (room.phase === 'waiting' && room.voteDeadlineMs !== null) {
        if (now >= room.voteDeadlineMs) {
          launchVotedMap(room, wss);
        } else {
          broadcastRoomVotes(room);
        }
      }
    }
  }, 1000);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Shell Stroukout server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
