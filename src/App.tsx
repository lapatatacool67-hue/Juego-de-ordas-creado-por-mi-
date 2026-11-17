import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud, type LoadingScreenState, type UiMenuState } from './components/GameHud';
import { FpsEngine, type BoardButtonHoverInfo } from './game/FpsEngine';
import type {
  BuildPieceType,
  CharacterSkinId,
  GameOptions,
  HudSnapshot,
  MapId,
  UpgradeId,
  WeaponId,
} from './game/types';
import { WEAPON_SPECS } from './game/weapons';

function loadInitialSkinId(): CharacterSkinId {
  if (typeof window === 'undefined') return 'soldier';
  try {
    const raw = window.localStorage.getItem('shell_stroukout_skin');
    if (
      raw === 'soldier' ||
      raw === 'astronaut' ||
      raw === 'detective' ||
      raw === 'chicken' ||
      raw === 'knight' ||
      raw === 'banana_duck' ||
      raw === 'toaster'
    ) {
      return raw;
    }
  } catch {
    // Ignore storage failures
  }
  return 'soldier';
}

const INITIAL_SKIN_ID = loadInitialSkinId();

const INITIAL_OPTIONS: GameOptions = {
  sensitivity: 0.0022,
  muted: false,
  fov: 74,
  invertY: false,
  mobileControls: 'auto',
  skinId: INITIAL_SKIN_ID,
};

const INITIAL_HUD: HudSnapshot = {
  mapId: 'city',
  isLocked: false,
  hasStarted: false,
  isGameOver: false,
  isSprinting: false,
  isCrouching: false,
  isDashing: false,
  dashCooldown: 0,
  dashCooldownMax: 1.1,
  isAds: false,
  sniperZoom: 4,
  isReloading: false,
  reloadProgress: 0,
  health: 100,
  maxHealth: 100,
  damageFlash: 0,
  activeWeaponId: 'rifle',
  unlockedWeapons: ['pistol', 'rifle', 'shotgun'],
  petUnlocked: false,
  companionSide: 'front',
  ammoByWeapon: {
    pistol: WEAPON_SPECS.pistol.magazineSize,
    rifle: WEAPON_SPECS.rifle.magazineSize,
    sniper: WEAPON_SPECS.sniper.magazineSize,
    shotgun: WEAPON_SPECS.shotgun.magazineSize,
    rocket: WEAPON_SPECS.rocket.magazineSize,
    chicken_combo: WEAPON_SPECS.chicken_combo.magazineSize,
    chainsaw: WEAPON_SPECS.chainsaw.magazineSize,
  },
  maxAmmoByWeapon: {
    pistol: WEAPON_SPECS.pistol.magazineSize,
    rifle: WEAPON_SPECS.rifle.magazineSize,
    sniper: WEAPON_SPECS.sniper.magazineSize,
    shotgun: WEAPON_SPECS.shotgun.magazineSize,
    rocket: WEAPON_SPECS.rocket.magazineSize,
    chicken_combo: WEAPON_SPECS.chicken_combo.magazineSize,
    chainsaw: WEAPON_SPECS.chainsaw.magazineSize,
  },
  kills: 0,
  shotsFired: 0,
  shotsHit: 0,
  headshots: 0,
  survivalTimeSec: 0,
  damageDealt: 0,
  medkitsUsed: 0,
  activeMedkits: 0,
  medkitNotice: null,
  skinId: INITIAL_SKIN_ID,
  aliveEnemies: 0,
  totalEnemies: 0,
  spreadPixels: 14,
  hitmarkerType: 'none',
  lastEliminationName: null,
  multiKillBanner: null,
  nextbotAlert: null,
  activeTarget: null,
  tutorial: {
    active: false,
    step: 'move',
    title: 'Lección 1',
    speakerName: 'Coronel Plumaje',
    dialogue: '',
    progress: 0,
    goal: 1,
    completed: false,
  },
  horde: {
    active: true,
    wave: 1,
    maxWaves: 5,
    defeatedInWave: 0,
    totalInWave: 8,
    intermissionSec: 0,
    bossActive: false,
    bossName: 'JEFE · TANQUE ZOMBI',
    bossHp: 0,
    bossMaxHp: 1100,
    miniBossActive: false,
    miniBossName: '',
    miniBossHp: 0,
    miniBossMaxHp: 100,
    victory: false,
  },
  grenade: {
    count: 3,
    maxCount: 3,
    isAiming: false,
    heldFuseSec: 2.2,
    maxFuseSec: 2.2,
    blastRadius: 5.6,
    activeMarkers: [],
  },
  build: {
    enabled: false,
    activePiece: null,
    isEditing: false,
    editPieceType: null,
    editMask: [],
    hoveredTileIndex: null,
    pieceCount: 0,
    buildsPlaced: 0,
    editsMade: 0,
    sparringBotEnabled: true,
  },
  tentShop: {
    open: false,
    wave: 1,
    greeting: '',
    options: [],
    ownedIds: [],
  },
  chestCeremony: {
    active: false,
    stage: 'idle',
    progress: 0,
    rewardKind: 'rocket',
  },
  multiplayer: {
    connected: false,
    inRoom: false,
    roomId: null,
    playerId: null,
    playerName: 'Soldado',
    isHost: false,
    peers: [],
    rooms: [],
    error: null,
  },
};

const MAP_LOADING_META: Record<
  MapId,
  { title: string; subtitle: string; tip: string }
> = {
  tutorial: {
    title: 'Campo de Entrenamiento',
    subtitle: 'Preparando galería de tiro y al Coronel Plumaje...',
    tip: 'Pulsa Ctrl en cualquier dirección (o quieto) para hacer un dash lateral rápido.',
  },
  city: {
    title: 'Ciudad Abandonada',
    subtitle: 'Desplegando barricadas nocturnas y radar de hordas...',
    tip: 'Usa granadas [G] contra grupos de zombis y recoge botiquines cada 10s para recuperar salud.',
  },
  desert: {
    title: 'Desierto Arsanal',
    subtitle: 'Cargando ruinas antiguas, pirámides y autómatas...',
    tip: 'Los autómatas sin brazos disparan desde lejos; muévete lateralmente con [Ctrl].',
  },
  cubes: {
    title: 'Mundo de Cubos',
    subtitle: 'Construyendo aldea voxel y defensas contra Transformers...',
    tip: 'Esquiva las ruedas explosivas de los camiones con un dash lateral [Ctrl].',
  },
  pixel: {
    title: 'Mundo Pixel',
    subtitle: 'Inicializando plataformas retro y Koopas alados...',
    tip: 'Los bumeranes describen curvas; usa [Ctrl] para salir de su trayectoria.',
  },
  backrooms: {
    title: 'Nextbox Sandbox',
    subtitle: 'Cargando Nivel 0 de los Backrooms y memes 2D...',
    tip: 'Escucha el audio de "En este pueblo" para saber si se acerca detrás de una pared.',
  },
  pueblo: {
    title: 'Pueblo Desconocido',
    subtitle: 'Cargando calles Roblox y personajes de En Este Pueblo...',
    tip: 'Pulsa [V] para poner al Capitán Pollo delante de ti o moverlo a los lados.',
  },
  duel: {
    title: 'Arena 1v1 · Sala de Espera',
    subtitle: 'Desplegando cuadrícula 1v1 de construcción, bot sparring y votación de modo...',
    tip: 'Construye con [C] Escaleras, [X] Suelo, [Z] Rampa, [V] Pared, edita con [G] y vota el próximo mapa con [M].',
  },
  nightcamp: {
    title: 'Campamento Nocturno',
    subtitle: 'Pesadilla extrema · Todos los jefes y hordas a la vez...',
    tip: 'Usa The Chiken Combinacion [5] y tus 30 granadas [G] para resistir la mega-horda final.',
  },
};

function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const touchPoints = navigator.maxTouchPoints > 0;
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return coarse || touchPoints || mobileUa;
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<FpsEngine | null>(null);
  const deployTimersRef = useRef<number[]>([]);

  const [uiState, setUiState] = useState<UiMenuState>('menu');
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [options, setOptions] = useState<GameOptions>(INITIAL_OPTIONS);
  const [contextLost, setContextLost] = useState(false);
  const [boardHoverInfo, setBoardHoverInfo] = useState<BoardButtonHoverInfo | null>(null);
  const [detectedMobile, setDetectedMobile] = useState<boolean>(() => detectTouchDevice());
  const [loading, setLoading] = useState<LoadingScreenState>({
    active: true,
    phase: 'visible',
    progress: 18,
    title: 'Shell Stroukout',
    subtitle: 'Encendiendo fogata del bosque nocturno...',
    tip: 'Pulsa Ctrl para ejecutar un dash lateral y esquivar ataques enemigos.',
    isBoot: true,
  });

  const isMobileActive =
    options.mobileControls === 'on' ||
    (options.mobileControls === 'auto' && detectedMobile);

  const clearDeployTimers = useCallback(() => {
    for (const id of deployTimersRef.current) {
      window.clearTimeout(id);
    }
    deployTimersRef.current = [];
  }, []);

  const launchMapWithLoading = useCallback(
    (mapId: MapId) => {
      clearDeployTimers();
      const meta = MAP_LOADING_META[mapId];
      // Etapa 1: Cortina táctica de transición previa a mostrar la pantalla de carga
      setLoading({
        active: true,
        phase: 'entering',
        progress: 0,
        title: meta.title,
        subtitle: meta.subtitle,
        tip: meta.tip,
        isBoot: false,
      });

      // Etapa 2: Tarjeta de carga visible y carga del escenario 3D
      const t1 = window.setTimeout(() => {
        setLoading((prev) => ({ ...prev, phase: 'visible', progress: 34 }));
        engineRef.current?.loadMap(mapId, true);
        setUiState('playing');
      }, 240);

      // Etapa 3: Barra de progreso al 100%
      const t2 = window.setTimeout(() => {
        setLoading((prev) => ({ ...prev, phase: 'visible', progress: 100 }));
      }, 540);

      // Etapa 4: Transición suave de salida
      const t3 = window.setTimeout(() => {
        setLoading((prev) => ({ ...prev, phase: 'leaving' }));
      }, 760);

      // Etapa 5: Ocultar pantalla de carga
      const t4 = window.setTimeout(() => {
        setLoading((prev) => ({ ...prev, active: false, phase: 'hidden' }));
      }, 1000);

      deployTimersRef.current.push(t1, t2, t3, t4);
    },
    [clearDeployTimers]
  );

  useEffect(() => {
    const updateMobile = () => setDetectedMobile(detectTouchDevice());
    const mq = window.matchMedia?.('(pointer: coarse)');
    mq?.addEventListener?.('change', updateMobile);
    window.addEventListener('resize', updateMobile);
    return () => {
      mq?.removeEventListener?.('change', updateMobile);
      window.removeEventListener('resize', updateMobile);
    };
  }, []);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    let bootFinished = false;
    const bootInterval = window.setInterval(() => {
      setLoading((prev) => {
        if (!prev.active || !prev.isBoot || bootFinished) return prev;
        const next = Math.min(86, prev.progress + 11);
        return { ...prev, progress: next };
      });
    }, 90);

    const finishBoot = () => {
      if (bootFinished) return;
      bootFinished = true;
      window.clearInterval(bootInterval);
      setLoading((prev) => ({
        ...prev,
        progress: 100,
        subtitle: 'Campamento listo · Bienvenido, soldado',
      }));
      const leaveTimer = window.setTimeout(() => {
        setLoading((prev) => ({ ...prev, phase: 'leaving' }));
      }, 260);
      const hideTimer = window.setTimeout(() => {
        setLoading((prev) => ({ ...prev, active: false, phase: 'hidden' }));
      }, 500);
      deployTimersRef.current.push(leaveTimer, hideTimer);
    };

    const engine = new FpsEngine(mount, {
      onHudUpdate: (snapshot) => setHud(snapshot),
      onContextLost: (lost) => setContextLost(lost),
      onRequestCityDeploy: () => {
        launchMapWithLoading('city');
      },
      onRequestDeployMapFromBoard: (mapId) => {
        setBoardHoverInfo(null);
        launchMapWithLoading(mapId);
      },
      onRequestBackToMenuFromBoard: () => {
        setBoardHoverInfo(null);
        setUiState('menu');
      },
      onBoardHoverChange: (info) => setBoardHoverInfo(info),
      onMultiplayerMapSync: () => {
        setUiState('playing');
      },
      onReady: finishBoot,
    });
    engineRef.current = engine;

    // Fallback in case onReady fired synchronously or context took extra time
    const fallbackTimer = window.setTimeout(finishBoot, 900);

    return () => {
      window.clearInterval(bootInterval);
      window.clearTimeout(fallbackTimer);
      clearDeployTimers();
      engine.dispose();
      engineRef.current = null;
    };
  }, [clearDeployTimers, launchMapWithLoading]);

  useEffect(() => {
    engineRef.current?.setMobileMode(isMobileActive);
  }, [isMobileActive]);

  useEffect(() => {
    if (uiState === 'play_select') {
      engineRef.current?.setMenuCameraMode('deploy_board');
    } else if (uiState === 'menu' || uiState === 'options') {
      setBoardHoverInfo(null);
      engineRef.current?.setMenuCameraMode('campfire');
    } else {
      setBoardHoverInfo(null);
    }
  }, [uiState]);

  const handleLaunchMap = useCallback(
    (mapId: MapId) => {
      launchMapWithLoading(mapId);
    },
    [launchMapWithLoading]
  );

  const handleResume = useCallback(() => {
    setUiState('playing');
    engineRef.current?.startOrResume();
  }, []);

  const handleReturnToMainMenu = useCallback(() => {
    engineRef.current?.showMenuBackdrop();
    setUiState('menu');
  }, []);

  const handleSelectWeapon = useCallback((id: WeaponId) => {
    engineRef.current?.selectWeapon(id);
  }, []);

  const handleSelectTentUpgrade = useCallback((id: UpgradeId) => {
    engineRef.current?.selectTentUpgrade(id);
  }, []);

  const handleOpenRewardChest = useCallback(() => {
    engineRef.current?.openRewardChest();
  }, []);

  const handleResetRange = useCallback(() => {
    engineRef.current?.resetRange();
  }, []);

  const handleUpdateOptions = useCallback((next: GameOptions) => {
    setOptions(next);
    engineRef.current?.applyOptions(next);
  }, []);

  const handleLeaveRoom = useCallback(() => {
    engineRef.current?.leaveMultiplayerRoom();
  }, []);

  const handleVoteMap = useCallback((mapId: MapId) => {
    engineRef.current?.voteForMap(mapId);
  }, []);

  const handleStartVotedMatch = useCallback(() => {
    engineRef.current?.startVotedMatch();
  }, []);

  const handleTouchMove = useCallback((x: number, y: number) => {
    engineRef.current?.setVirtualMove(x, y);
  }, []);

  const handleTouchLook = useCallback((dx: number, dy: number) => {
    engineRef.current?.applyTouchLook(dx, dy);
  }, []);

  const handleTouchShoot = useCallback((active: boolean) => {
    engineRef.current?.setVirtualShoot(active);
  }, []);

  const handleTouchAds = useCallback((active: boolean) => {
    engineRef.current?.setVirtualAds(active);
  }, []);

  const handleTouchJump = useCallback(() => {
    engineRef.current?.triggerVirtualJump();
  }, []);

  const handleTouchCrouch = useCallback(() => {
    engineRef.current?.triggerVirtualCrouch();
  }, []);

  const handleTouchDash = useCallback(() => {
    engineRef.current?.triggerVirtualDash();
  }, []);

  const handleTouchReload = useCallback(() => {
    engineRef.current?.triggerVirtualReload();
  }, []);

  const handleTouchGrenadeStart = useCallback(() => {
    engineRef.current?.triggerVirtualGrenadeStart();
  }, []);

  const handleTouchGrenadeRelease = useCallback(() => {
    engineRef.current?.triggerVirtualGrenadeRelease();
  }, []);

  const handleTouchPause = useCallback(() => {
    engineRef.current?.unlockPointer();
  }, []);

  const handleToggleSniperZoom = useCallback(() => {
    engineRef.current?.toggleSniperZoom();
  }, []);

  const handleCycleCompanionSide = useCallback(() => {
    engineRef.current?.cycleCompanionSide();
  }, []);

  const handleSelectBuildPiece = useCallback((piece: BuildPieceType | null) => {
    engineRef.current?.selectBuildPiece(piece);
  }, []);

  const handleClearDuelBuilds = useCallback(() => {
    engineRef.current?.clearDuelBuilds();
  }, []);

  const handleToggleDuelBot = useCallback(() => {
    engineRef.current?.toggleDuelBot();
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#070a10] select-none touch-none">
      <div ref={canvasMountRef} className="h-full w-full" />

      <GameHud
        uiState={uiState}
        hud={hud}
        options={options}
        isMobile={isMobileActive}
        contextLost={contextLost}
        loading={loading}
        boardHoverInfo={boardHoverInfo}
        onSetUiState={setUiState}
        onLaunchMap={handleLaunchMap}
        onResume={handleResume}
        onReturnToMainMenu={handleReturnToMainMenu}
        onSelectWeapon={handleSelectWeapon}
        onToggleSniperZoom={handleToggleSniperZoom}
        onCycleCompanionSide={handleCycleCompanionSide}
        onSelectBuildPiece={handleSelectBuildPiece}
        onClearDuelBuilds={handleClearDuelBuilds}
        onToggleDuelBot={handleToggleDuelBot}
        onSelectTentUpgrade={handleSelectTentUpgrade}
        onOpenRewardChest={handleOpenRewardChest}
        onResetRange={handleResetRange}
        onUpdateOptions={handleUpdateOptions}
        onLeaveRoom={handleLeaveRoom}
        onVoteMap={handleVoteMap}
        onStartVotedMatch={handleStartVotedMatch}
        onTouchMove={handleTouchMove}
        onTouchLook={handleTouchLook}
        onTouchShoot={handleTouchShoot}
        onTouchAds={handleTouchAds}
        onTouchJump={handleTouchJump}
        onTouchCrouch={handleTouchCrouch}
        onTouchDash={handleTouchDash}
        onTouchReload={handleTouchReload}
        onTouchGrenadeStart={handleTouchGrenadeStart}
        onTouchGrenadeRelease={handleTouchGrenadeRelease}
        onTouchPause={handleTouchPause}
      />
    </main>
  );
}
