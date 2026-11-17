import type {
  BuildPieceNetState,
  CharacterSkinId,
  MapId,
  MultiplayerHudState,
  MultiplayerRoomSummary,
  RemotePlayerNetState,
  VoteHudState,
} from './types';

export interface SyncedEnemySnapshot {
  id: string;
  x: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  isBoss: boolean;
}

export interface MultiplayerClientCallbacks {
  onHudState: (state: MultiplayerHudState) => void;
  onPeerState?: (state: MultiplayerHudState) => void;
  onRoomJoined: (roomId: string, mapId: MapId, isHost: boolean) => void;
  onRoomMapChanged: (mapId: MapId) => void;
  onRemoteShoot: (
    playerId: string,
    start: [number, number, number],
    end: [number, number, number],
    weaponId: string
  ) => void;
  onRemoteGrenade: (
    playerId: string,
    pos: [number, number, number],
    vel: [number, number, number],
    fuseRemaining: number
  ) => void;
  onHordeSync: (payload: {
    wave: number;
    defeatedInWave: number;
    totalInWave: number;
    victory: boolean;
    enemies: SyncedEnemySnapshot[];
  }) => void;
  onEnemyDamageFromPeer: (enemyId: string, damage: number, hitZone: 'head' | 'body') => void;
  onBuildSync?: (builds: BuildPieceNetState[]) => void;
  onBuildPlace?: (piece: BuildPieceNetState) => void;
  onBuildEdit?: (id: string, editMask: boolean[]) => void;
  onBuildHp?: (id: string, hp: number) => void;
  onBuildDestroy?: (id: string) => void;
  onBuildClear?: () => void;
  onPvpHit?: (fromPlayerId: string, fromPlayerName: string, damage: number, hitZone: 'head' | 'body') => void;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private callbacks: MultiplayerClientCallbacks;
  private disposed = false;
  private reconnectTimer: number | null = null;

  private connected = false;
  private inRoom = false;
  private roomId: string | null = null;
  private playerId: string | null = null;
  private hostId: string | null = null;
  private playerName = 'Soldado';
  private peers = new Map<string, RemotePlayerNetState>();
  private rooms: MultiplayerRoomSummary[] = [];
  private error: string | null = null;
  private vote: VoteHudState | undefined = undefined;

  constructor(callbacks: MultiplayerClientCallbacks) {
    this.callbacks = callbacks;
    this.connect();
  }

  public getState(): MultiplayerHudState {
    const peerList: RemotePlayerNetState[] = [];
    for (const p of this.peers.values()) {
      if (p.id !== this.playerId) {
        peerList.push(p);
      }
    }
    return {
      connected: this.connected,
      inRoom: this.inRoom,
      roomId: this.roomId,
      playerId: this.playerId,
      playerName: this.playerName,
      isHost: Boolean(this.playerId && this.hostId && this.playerId === this.hostId),
      peers: peerList,
      rooms: [...this.rooms],
      error: this.error,
      vote: this.vote,
    };
  }

  private emit() {
    this.callbacks.onHudState(this.getState());
  }

  private connect() {
    if (this.disposed) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        this.connected = true;
        this.error = null;
        this.emit();
      };

      ws.onmessage = (evt) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(String(evt.data)) as Record<string, unknown>;
        } catch {
          return;
        }
        const type = String(msg.type || '');

        if (type === 'welcome') {
          this.playerId = String(msg.playerId || '');
          if (Array.isArray(msg.rooms)) {
            this.rooms = msg.rooms as MultiplayerRoomSummary[];
          }
          this.emit();
        } else if (type === 'room:list') {
          if (Array.isArray(msg.rooms)) {
            this.rooms = msg.rooms as MultiplayerRoomSummary[];
          }
          this.emit();
        } else if (type === 'room:error') {
          this.error = String(msg.message || 'Error en la sala local');
          this.emit();
        } else if (type === 'room:joined') {
          this.inRoom = true;
          this.roomId = String(msg.roomId || '');
          this.hostId = String(msg.hostId || '');
          this.playerId = String(msg.playerId || this.playerId || '');
          this.error = null;
          this.peers.clear();
          const mapId = (String(msg.mapId || 'duel') as MapId);
          const isHost = this.playerId === this.hostId;
          this.emit();
          this.callbacks.onRoomJoined(this.roomId, mapId, isHost);
        } else if (type === 'room:left') {
          this.inRoom = false;
          this.roomId = null;
          this.hostId = null;
          this.peers.clear();
          this.vote = undefined;
          this.emit();
        } else if (type === 'room:peers') {
          this.hostId = String(msg.hostId || this.hostId || '');
          const list = Array.isArray(msg.peers) ? (msg.peers as RemotePlayerNetState[]) : [];
          this.peers.clear();
          for (const p of list) {
            this.peers.set(p.id, p);
          }
          this.emit();
        } else if (type === 'room:votes') {
          const votesByPlayer = (msg.votesByPlayer as Record<string, MapId> | undefined) ?? {};
          const myVote = (this.playerId && votesByPlayer[this.playerId]) || null;
          this.vote = {
            phase: msg.phase === 'playing' ? 'playing' : 'waiting',
            votesByMap: (msg.votesByMap as Partial<Record<MapId, number>>) ?? {},
            myVote,
            winningMapId: (msg.winningMapId as MapId) ?? 'city',
            secondsRemaining:
              msg.secondsRemaining === null || msg.secondsRemaining === undefined
                ? null
                : Number(msg.secondsRemaining),
            voteableMaps: Array.isArray(msg.voteableMaps)
              ? (msg.voteableMaps as MapId[])
              : ['city', 'desert', 'cubes', 'pixel', 'pueblo', 'backrooms'],
          };
          this.emit();
        } else if (type === 'room:map') {
          const mapId = String(msg.mapId || 'duel') as MapId;
          this.callbacks.onRoomMapChanged(mapId);
        } else if (type === 'player:state') {
          const p = msg.player as RemotePlayerNetState | undefined;
          if (p && p.id !== this.playerId) {
            this.peers.set(p.id, p);
            this.callbacks.onPeerState?.(this.getState());
          }
        } else if (type === 'player:shoot') {
          const pid = String(msg.playerId || '');
          if (pid && pid !== this.playerId) {
            this.callbacks.onRemoteShoot(
              pid,
              msg.start as [number, number, number],
              msg.end as [number, number, number],
              String(msg.weaponId || 'rifle')
            );
          }
        } else if (type === 'player:grenade') {
          const pid = String(msg.playerId || '');
          if (pid && pid !== this.playerId) {
            this.callbacks.onRemoteGrenade(
              pid,
              msg.pos as [number, number, number],
              msg.vel as [number, number, number],
              Number(msg.fuseRemaining ?? 1.8)
            );
          }
        } else if (type === 'build:sync') {
          if (Array.isArray(msg.builds)) {
            this.callbacks.onBuildSync?.(msg.builds as BuildPieceNetState[]);
          }
        } else if (type === 'build:place') {
          if (msg.piece) {
            this.callbacks.onBuildPlace?.(msg.piece as BuildPieceNetState);
          }
        } else if (type === 'build:edit') {
          if (msg.id && Array.isArray(msg.editMask)) {
            this.callbacks.onBuildEdit?.(String(msg.id), msg.editMask.map(Boolean));
          }
        } else if (type === 'build:hp') {
          if (msg.id) {
            this.callbacks.onBuildHp?.(String(msg.id), Number(msg.hp ?? 100));
          }
        } else if (type === 'build:destroy') {
          if (msg.id) {
            this.callbacks.onBuildDestroy?.(String(msg.id));
          }
        } else if (type === 'build:clear') {
          this.callbacks.onBuildClear?.();
        } else if (type === 'pvp:hit') {
          this.callbacks.onPvpHit?.(
            String(msg.fromPlayerId || ''),
            String(msg.fromPlayerName || 'Rival'),
            Number(msg.damage ?? 0),
            msg.hitZone === 'head' ? 'head' : 'body'
          );
        } else if (type === 'horde:sync') {
          this.callbacks.onHordeSync({
            wave: Number(msg.wave ?? 1),
            defeatedInWave: Number(msg.defeatedInWave ?? 0),
            totalInWave: Number(msg.totalInWave ?? 7),
            victory: Boolean(msg.victory),
            enemies: Array.isArray(msg.enemies) ? (msg.enemies as SyncedEnemySnapshot[]) : [],
          });
        } else if (type === 'enemy:damage') {
          this.callbacks.onEnemyDamageFromPeer(
            String(msg.enemyId || ''),
            Number(msg.damage ?? 0),
            msg.hitZone === 'head' ? 'head' : 'body'
          );
        }
      };

      ws.onclose = () => {
        this.connected = false;
        this.inRoom = false;
        this.roomId = null;
        this.peers.clear();
        this.vote = undefined;
        this.emit();
        if (!this.disposed && this.reconnectTimer === null) {
          this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 1800);
        }
      };

      ws.onerror = () => {
        this.error = 'Sin conexión con el servidor local.';
        this.emit();
      };
    } catch {
      this.connected = false;
      this.emit();
    }
  }

  private send(payload: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public setPlayerName(name: string) {
    const clean = name.trim().slice(0, 18);
    this.playerName = clean || 'Soldado';
    this.emit();
  }

  public refreshRooms() {
    this.send({ type: 'room:list' });
  }

  public createRoom(mapId: MapId, playerName: string, skinId: CharacterSkinId = 'soldier') {
    this.setPlayerName(playerName);
    this.error = null;
    this.send({ type: 'room:create', mapId, playerName: this.playerName, skinId });
  }

  public joinRoom(roomId: string, playerName: string, skinId: CharacterSkinId = 'soldier') {
    this.setPlayerName(playerName);
    this.error = null;
    this.send({
      type: 'room:join',
      roomId: roomId.trim().toUpperCase(),
      playerName: this.playerName,
      skinId,
    });
  }

  public joinLobby(playerName: string, skinId: CharacterSkinId = 'soldier') {
    this.setPlayerName(playerName);
    this.error = null;
    this.send({ type: 'room:join_lobby', playerName: this.playerName, skinId });
  }

  public voteMap(mapId: MapId) {
    if (!this.inRoom) return;
    this.send({ type: 'room:vote', mapId });
  }

  public startVotedMatch() {
    if (!this.inRoom) return;
    this.send({ type: 'room:start_voted' });
  }

  public leaveRoom() {
    this.send({ type: 'room:leave' });
    this.inRoom = false;
    this.roomId = null;
    this.hostId = null;
    this.peers.clear();
    this.vote = undefined;
    this.emit();
  }

  public sendRoomMap(mapId: MapId) {
    if (!this.inRoom) return;
    this.send({ type: 'room:map', mapId });
  }

  public sendPlayerState(state: Omit<RemotePlayerNetState, 'id' | 'name'>) {
    if (!this.inRoom) return;
    this.send({ type: 'player:state', ...state });
  }

  public sendShoot(start: [number, number, number], end: [number, number, number], weaponId: string) {
    if (!this.inRoom) return;
    this.send({ type: 'player:shoot', start, end, weaponId });
  }

  public sendGrenade(
    pos: [number, number, number],
    vel: [number, number, number],
    fuseRemaining: number
  ) {
    if (!this.inRoom) return;
    this.send({ type: 'player:grenade', pos, vel, fuseRemaining });
  }

  public sendBuildPlace(piece: BuildPieceNetState) {
    if (!this.inRoom) return;
    this.send({ type: 'build:place', piece });
  }

  public sendBuildEdit(id: string, editMask: boolean[]) {
    if (!this.inRoom) return;
    this.send({ type: 'build:edit', id, editMask });
  }

  public sendBuildDamage(id: string, damage: number) {
    if (!this.inRoom) return;
    this.send({ type: 'build:damage', id, damage });
  }

  public sendBuildClear() {
    if (!this.inRoom) return;
    this.send({ type: 'build:clear' });
  }

  public sendPvpHit(targetPlayerId: string, damage: number, hitZone: 'head' | 'body') {
    if (!this.inRoom) return;
    this.send({ type: 'pvp:hit', targetPlayerId, damage, hitZone });
  }

  public sendHordeSync(payload: {
    wave: number;
    defeatedInWave: number;
    totalInWave: number;
    victory: boolean;
    enemies: SyncedEnemySnapshot[];
  }) {
    if (!this.inRoom) return;
    this.send({ type: 'horde:sync', ...payload });
  }

  public sendEnemyDamage(enemyId: string, damage: number, hitZone: 'head' | 'body') {
    if (!this.inRoom) return;
    this.send({ type: 'enemy:damage', enemyId, damage, hitZone });
  }

  public dispose() {
    this.disposed = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
