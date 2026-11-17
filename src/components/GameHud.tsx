import { useRef, useState, type TouchEvent as ReactTouchEvent } from 'react';
import {
  Award,
  Bomb,
  Bot,
  Check,
  ChevronLeft,
  Clock,
  Copy,
  Crosshair,
  Flame,
  Hammer,
  HeartPulse,
  Layers,
  Lock,
  Mail,
  Pause,
  Play,
  RotateCcw,
  Rocket,
  Settings,
  Share2,
  Shield,
  Smartphone,
  Sparkles,
  Target,
  Trash2,
  User,
  Users,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from 'lucide-react';
import type { BoardButtonHoverInfo } from '../game/FpsEngine';
import type {
  BuildPieceType,
  GameOptions,
  HudSnapshot,
  MapId,
  MobileControlMode,
  UpgradeId,
  UpgradeOption,
  WeaponId,
} from '../game/types';
import { UPGRADE_CATALOG } from '../game/upgrades';
import { SKIN_CATALOG, WEAPON_ORDER, WEAPON_SPECS } from '../game/weapons';

export type UiMenuState = 'menu' | 'play_select' | 'options' | 'playing';

export type LoadingPhase = 'entering' | 'visible' | 'leaving' | 'hidden';

export interface LoadingScreenState {
  active: boolean;
  phase?: LoadingPhase;
  progress: number;
  title: string;
  subtitle: string;
  tip: string;
  isBoot: boolean;
}

interface GameHudProps {
  uiState: UiMenuState;
  hud: HudSnapshot;
  options: GameOptions;
  isMobile: boolean;
  contextLost: boolean;
  loading?: LoadingScreenState | null;
  boardHoverInfo?: BoardButtonHoverInfo | null;
  onSetUiState: (state: UiMenuState) => void;
  onLaunchMap: (mapId: MapId) => void;
  onResume: () => void;
  onReturnToMainMenu: () => void;
  onSelectWeapon: (id: WeaponId) => void;
  onToggleSniperZoom: () => void;
  onCycleCompanionSide?: () => void;
  onSelectBuildPiece?: (piece: BuildPieceType | null) => void;
  onClearDuelBuilds?: () => void;
  onToggleDuelBot?: () => void;
  onSelectTentUpgrade: (id: UpgradeId) => void;
  onOpenRewardChest: () => void;
  onResetRange: () => void;
  onUpdateOptions: (next: GameOptions) => void;
  onLeaveRoom: () => void;
  onVoteMap?: (mapId: MapId) => void;
  onStartVotedMatch?: () => void;
  onTouchMove: (x: number, y: number) => void;
  onTouchLook: (dx: number, dy: number) => void;
  onTouchShoot: (active: boolean) => void;
  onTouchAds: (active: boolean) => void;
  onTouchJump: () => void;
  onTouchCrouch: () => void;
  onTouchDash: () => void;
  onTouchReload: () => void;
  onTouchGrenadeStart: () => void;
  onTouchGrenadeRelease: () => void;
  onTouchPause: () => void;
}

function renderUpgradeIcon(opt: UpgradeOption) {
  switch (opt.id) {
    case 'ap_ammo':
    case 'stabilized_barrel':
    case 'steady_grip':
      return <Crosshair className="h-5 w-5 text-amber-400" />;
    case 'hollow_point':
      return <Target className="h-5 w-5 text-amber-400" />;
    case 'extended_mags':
      return <Zap className="h-5 w-5 text-amber-400" />;
    case 'thermobaric_grenades':
      return <Flame className="h-5 w-5 text-orange-400" />;
    case 'cluster_grenades':
      return <Bomb className="h-5 w-5 text-orange-400" />;
    case 'tactical_boots':
      return <Zap className="h-5 w-5 text-emerald-400" />;
    case 'rapid_dash':
      return <Wind className="h-5 w-5 text-sky-400" />;
    case 'reinforced_armor':
      return <Shield className="h-5 w-5 text-emerald-400" />;
    case 'regen_serum':
      return <HeartPulse className="h-5 w-5 text-emerald-400" />;
    case 'combat_vampirism':
      return <Award className="h-5 w-5 text-emerald-400" />;
  }
}

function mapDisplayName(mapId: MapId): string {
  switch (mapId) {
    case 'tutorial':
      return 'Entrenamiento';
    case 'desert':
      return 'Desierto Arsanal';
    case 'cubes':
      return 'Mundo de Cubos';
    case 'pixel':
      return 'Mundo Pixel';
    case 'pueblo':
      return 'Pueblo Desconocido';
    case 'backrooms':
      return 'Nextbox Sandbox';
    case 'duel':
      return 'Arena 1v1';
    case 'nightcamp':
      return 'Campamento nocturno';
    default:
      return 'Ciudad Abandonada';
  }
}

function formatSurvivalTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function computeCombatRank(
  victory: boolean,
  kills: number,
  accuracy: number,
  headshots: number
): { rank: 'S' | 'A' | 'B' | 'C'; label: string; colorClass: string } {
  const hsRate = kills > 0 ? headshots / kills : 0;
  const score =
    (victory ? 45 : 0) +
    Math.min(30, kills * 0.7) +
    Math.min(15, accuracy * 0.22) +
    Math.min(12, hsRate * 18);
  if (score >= 76) {
    return {
      rank: 'S',
      label: 'Élite Imparable',
      colorClass: 'border-amber-400 bg-amber-500/20 text-amber-300',
    };
  }
  if (score >= 52) {
    return {
      rank: 'A',
      label: 'Táctico Veterano',
      colorClass: 'border-sky-400 bg-sky-500/20 text-sky-300',
    };
  }
  if (score >= 28) {
    return {
      rank: 'B',
      label: 'Escuadrón Activo',
      colorClass: 'border-emerald-400 bg-emerald-500/15 text-emerald-300',
    };
  }
  return {
    rank: 'C',
    label: 'Recluta en Campo',
    colorClass: 'border-slate-500 bg-slate-800/70 text-slate-200',
  };
}

export function GameHud({
  uiState,
  hud,
  options,
  isMobile,
  contextLost,
  loading,
  boardHoverInfo,
  onSetUiState,
  onLaunchMap,
  onResume,
  onReturnToMainMenu,
  onSelectWeapon,
  onToggleSniperZoom,
  onCycleCompanionSide,
  onSelectBuildPiece,
  onClearDuelBuilds,
  onToggleDuelBot,
  onSelectTentUpgrade,
  onOpenRewardChest,
  onResetRange,
  onUpdateOptions,
  onLeaveRoom,
  onVoteMap,
  onStartVotedMatch,
  onTouchMove,
  onTouchLook,
  onTouchShoot,
  onTouchAds,
  onTouchJump,
  onTouchCrouch,
  onTouchDash,
  onTouchReload,
  onTouchGrenadeStart,
  onTouchGrenadeRelease,
  onTouchPause,
}: GameHudProps) {
  const [optionsReturnTarget, setOptionsReturnTarget] = useState<'menu' | 'playing'>('menu');
  const [shareCopied, setShareCopied] = useState(false);

  // Multitouch tracking refs for mobile HUD
  const moveTouchIdRef = useRef<number | null>(null);
  const moveCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const lookTouchIdRef = useRef<number | null>(null);
  const lookLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const activeWeapon = WEAPON_SPECS[hud.activeWeaponId];
  const currentAmmo = hud.ammoByWeapon[hud.activeWeaponId];
  const maxAmmo = hud.maxAmmoByWeapon[hud.activeWeaponId];
  const accuracy =
    hud.shotsFired > 0 ? Math.round((hud.shotsHit / hud.shotsFired) * 100) : 0;

  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    return window.location.href;
  };

  const handleCopyShareUrl = async () => {
    const url = getShareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2200);
    } catch {
      // Fallback if clipboard permission denied
      setShareCopied(false);
    }
  };

  const getGmailShareHref = () => {
    const url = getShareUrl();
    const subject = encodeURIComponent('Juega conmigo a Shell Stroukout');
    const body = encodeURIComponent(
      `¡Entra a Shell Stroukout y sobrevive a las hordas conmigo!\n\nEnlace del juego: ${url}`
    );
    return `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
  };

  if (contextLost) {
    return (
      <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-[#101318] p-6 text-slate-100">
        <div className="max-w-md border border-white/15 bg-[#181c23] p-6 text-center">
          <h2 className="font-display text-xl font-bold text-white">
            Contexto gráfico interrumpido
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            El navegador suspendió el renderizado 3D temporalmente. Recarga la
            página si no se restablece automáticamente.
          </p>
        </div>
      </div>
    );
  }

  // PANTALLA DE CARGA CON TRANSICIÓN PREVIA (Cortina de despliegue -> Tarjeta -> Salida)
  if (loading?.active) {
    const pct = Math.max(0, Math.min(100, Math.round(loading.progress)));
    const phase = loading.phase ?? 'visible';
    const curtainAnimClass =
      phase === 'entering'
        ? 'animate-loading-curtain-enter'
        : phase === 'leaving'
        ? 'animate-loading-curtain-leave'
        : '';

    return (
      <div
        className={`pointer-events-auto fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#06080d] p-6 text-slate-100 ${curtainAnimClass}`}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 44%, rgba(245, 130, 32, 0.16) 0%, rgba(12, 18, 30, 0.78) 48%, #05070c 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 28px)',
          }}
        />

        {phase === 'entering' ? (
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-3 h-0.5 w-24 bg-amber-500" />
            <div className="text-[11px] font-bold uppercase tracking-[0.34em] text-amber-400">
              Preparando Despliegue
            </div>
            <div className="mt-1 font-display text-xl font-bold text-white">
              {loading.title}
            </div>
            <div className="mt-3 h-0.5 w-24 bg-amber-500" />
          </div>
        ) : (
          <div className="animate-loading-card-enter relative z-10 flex w-full max-w-md flex-col items-center text-center">
            <div className="animate-loading-emblem mb-6 flex h-20 w-20 items-center justify-center border border-amber-500/45 bg-[#101520] shadow-2xl">
              <Flame className="h-9 w-9 text-amber-400" />
            </div>

            <div className="text-[11px] font-bold uppercase tracking-[0.26em] text-amber-400/90">
              Shell Stroukout
            </div>
            <h2 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {loading.title}
            </h2>
            <p className="mt-2 text-sm text-slate-300">{loading.subtitle}</p>

            <div className="mt-7 w-full border border-white/15 bg-[#0e131c] p-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium text-slate-400">
                  {loading.isBoot ? 'Inicializando campamento nocturno' : 'Desplegando zona'}
                </span>
                <span className="font-mono-num font-bold text-amber-400">{pct}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden bg-black/70 border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-orange-300 transition-[width] duration-150 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="mt-5 flex items-start gap-2.5 border border-amber-500/20 bg-[#0d121b] px-4 py-3 text-left text-xs text-slate-300">
              <Wind className="h-4 w-4 shrink-0 text-sky-400 mt-0.5" />
              <span>{loading.tip}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mobile touch handlers
  const handleJoystickStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (moveTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    moveTouchIdRef.current = touch.identifier;
    moveCenterRef.current = { x: cx, y: cy };
    updateJoystickFromTouch(touch.clientX, touch.clientY, cx, cy);
  };

  const updateJoystickFromTouch = (tx: number, ty: number, cx: number, cy: number) => {
    const maxR = 42;
    let dx = tx - cx;
    let dy = ty - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnobOffset({ x: dx, y: dy });
    onTouchMove(dx / maxR, -dy / maxR);
  };

  const handleJoystickMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (moveTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === moveTouchIdRef.current) {
        updateJoystickFromTouch(
          t.clientX,
          t.clientY,
          moveCenterRef.current.x,
          moveCenterRef.current.y
        );
        break;
      }
    }
  };

  const handleJoystickEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (moveTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === moveTouchIdRef.current) {
        moveTouchIdRef.current = null;
        setKnobOffset({ x: 0, y: 0 });
        onTouchMove(0, 0);
        break;
      }
    }
  };

  const handleLookStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (lookTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    lookTouchIdRef.current = touch.identifier;
    lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (lookTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === lookTouchIdRef.current) {
        const dx = t.clientX - lookLastPosRef.current.x;
        const dy = t.clientY - lookLastPosRef.current.y;
        lookLastPosRef.current = { x: t.clientX, y: t.clientY };
        onTouchLook(dx * 1.9, dy * 1.9);
        break;
      }
    }
  };

  const handleLookEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (lookTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        break;
      }
    }
  };

  // MAIN MENU / MAP SELECT / OPTIONS OVERLAY
  if (
    uiState === 'menu' ||
    uiState === 'play_select' ||
    uiState === 'options'
  ) {
    if (uiState === 'menu') {
      return (
        <div
          className="pointer-events-auto fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-7 md:p-9 text-slate-100 overflow-y-auto"
          style={{
            background:
              'linear-gradient(90deg, rgba(6, 9, 15, 0.72) 0%, rgba(8, 12, 20, 0.24) 36%, rgba(8, 12, 20, 0.0) 68%)',
          }}
        >
          {/* Compact Top-Left Title so the campfire and Capitán Pollo stay completely visible */}
          <div
            key="menu-title"
            className="animate-menu-item max-w-xs sm:max-w-sm border-l-2 border-amber-500/80 pl-3.5 py-0.5 drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]"
            style={{ animationDelay: '30ms' }}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400">
              <Flame className="h-3 w-3 text-orange-400" />
              <span>Bosque Nocturno</span>
            </div>
            <h1 className="mt-0.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Shell Stroukout
            </h1>
            <p className="mt-0.5 text-xs text-slate-300/90">
              Combate táctico · Granadas, dash y hordas
            </p>
          </div>

          {/* Compact Bottom-Left Action Dock */}
          <div
            key="menu-dock"
            className="animate-menu-panel w-full max-w-[310px] sm:max-w-[335px] border border-amber-500/30 bg-[#0b1018]/82 p-4 sm:p-5 shadow-2xl mt-auto"
          >
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => onSetUiState('play_select')}
                style={{ animationDelay: '80ms' }}
                className="animate-menu-item flex items-center justify-between bg-amber-500 px-4 py-3 font-display text-base font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
              >
                <span>Jugar</span>
                <Play className="h-4 w-4 fill-current" />
              </button>

              <button
                type="button"
                onClick={() => onLaunchMap('duel')}
                style={{ animationDelay: '130ms' }}
                className="animate-menu-item flex items-center justify-between border border-sky-400/45 bg-[#122236]/92 px-4 py-3 font-display text-sm sm:text-base font-semibold text-sky-100 hover:bg-[#19304c] transition-colors cursor-pointer"
              >
                <div className="flex flex-col items-start text-left">
                  <span>Multijugador</span>
                  <span className="text-[11px] font-normal text-sky-300">
                    Sala de espera 1v1 y votación de modo
                  </span>
                </div>
                <Hammer className="h-4 w-4 text-sky-400 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setOptionsReturnTarget('menu');
                  onSetUiState('options');
                }}
                style={{ animationDelay: '190ms' }}
                className="animate-menu-item flex items-center justify-between border border-white/15 bg-[#161c27]/90 px-4 py-3 font-display text-sm sm:text-base font-semibold text-slate-100 hover:bg-[#202838] transition-colors cursor-pointer"
              >
                <span>Opciones</span>
                <Settings className="h-4 w-4 text-slate-300" />
              </button>

              <div
                style={{ animationDelay: '230ms' }}
                className="animate-menu-item mt-0.5 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-2.5"
              >
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 mr-auto">
                  <Share2 className="h-3 w-3 text-amber-400" />
                  <span>Compartir</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyShareUrl}
                  className="inline-flex items-center gap-1 border border-white/15 bg-[#141923] px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-[#1e2533] transition-colors cursor-pointer"
                >
                  {shareCopied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-300">Copiada</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 text-slate-300" />
                      <span>URL</span>
                    </>
                  )}
                </button>
                <a
                  href={getGmailShareHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 border border-red-400/30 bg-[#1e1417] px-2.5 py-1 text-[11px] font-semibold text-red-200 hover:bg-[#2b1b20] transition-colors"
                >
                  <Mail className="h-3 w-3 text-red-400" />
                  <span>Gmail</span>
                </a>
              </div>

              {isMobile && (
                <div
                  style={{ animationDelay: '270ms' }}
                  className="animate-menu-item flex items-center gap-2 border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 text-[11px] text-emerald-300"
                >
                  <Smartphone className="h-3.5 w-3.5 shrink-0" />
                  <span>Controles táctiles activados</span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (uiState === 'play_select') {
      const unlockDetail =
        boardHoverInfo?.action === 'city'
          ? hud.unlockedWeapons.includes('rocket')
            ? ' · Lanzacohetes RL-3 desbloqueado.'
            : ' · Desbloquea Lanzacohetes RL-3 al superar las 5 hordas.'
          : boardHoverInfo?.action === 'cubes'
            ? hud.unlockedWeapons.includes('sniper')
              ? ' · Francotirador AWP-X y Capitán Pollo desbloqueados.'
              : ' · Desbloquea Francotirador AWP-X y Capitán Pollo.'
            : '';

      return (
        <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 text-slate-100">
          {/* Subtle top-left whisper badge without touching the 3D Cartel */}
          <div className="flex items-start justify-between gap-3">
            <div className="inline-flex items-center gap-2 border border-amber-500/35 bg-[#0b1018]/80 px-3 py-1.5 text-[11px] font-medium text-amber-200 shadow-lg">
              <Flame className="h-3.5 w-3.5 text-orange-400 shrink-0" />
              <span>Haz clic directamente en un tablón del cartel para desplegarte</span>
            </div>
          </div>

          {/* Compact bottom bar showing hovered plaque details + fallback Back button */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-xl border border-amber-500/35 bg-[#0b1018]/86 px-4 py-2.5 shadow-2xl">
              {boardHoverInfo ? (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                    {boardHoverInfo.action === 'back'
                      ? 'Regresar al campamento'
                      : boardHoverInfo.action === 'to_extras' || boardHoverInfo.action === 'to_main'
                      ? 'Cambiar página del cartel'
                      : boardHoverInfo.action === 'locked_slot'
                      ? 'Espacio reservado'
                      : 'Zona seleccionada en cartel'}
                  </div>
                  <div className="mt-0.5 font-display text-sm sm:text-base font-bold text-white">
                    {boardHoverInfo.title}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-300">
                    {boardHoverInfo.description}
                    {unlockDetail && (
                      <span className="font-semibold text-amber-300">{unlockDetail}</span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <span className="font-mono-num font-bold text-amber-300">Zzz</span>
                  <span>
                    Shh... el pato duerme junto al cartel. Apunta y pulsa sobre cualquier placa del tablero.
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onSetUiState('menu')}
              className="pointer-events-auto inline-flex items-center gap-1.5 border border-amber-500/40 bg-[#12161f]/90 px-3.5 py-2 font-display text-xs font-semibold text-slate-100 hover:bg-[#1e2432] transition-colors cursor-pointer shadow-lg"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-amber-400" />
              <span>Volver al menú</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-start px-4 sm:px-8 md:pl-14 lg:pl-20 text-slate-100 overflow-y-auto py-6"
        style={{
          background:
            'linear-gradient(90deg, rgba(6, 9, 15, 0.88) 0%, rgba(8, 12, 20, 0.56) 46%, rgba(8, 12, 20, 0.12) 100%)',
        }}
      >
        <div
          key={uiState}
          className="animate-menu-panel w-full max-w-2xl border border-amber-500/30 bg-[#0d1119]/92 p-5 sm:p-7 shadow-2xl my-auto"
        >
          <div
            className="animate-menu-item flex items-center justify-between gap-4 border-b border-white/10 pb-4"
            style={{ animationDelay: '40ms' }}
          >
            <div>
              <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                <Flame className="h-3 w-3 text-orange-400" />
                <span>Shell Stroukout</span>
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
                Configuración y aspecto de personaje
              </h1>
            </div>
            <Crosshair className="h-6 w-6 text-amber-400 shrink-0" />
          </div>

          {uiState === 'options' && (
            <div className="mt-6 flex flex-col gap-5">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <label htmlFor="opt-sens" className="font-medium text-slate-200">
                    Sensibilidad de cámara
                  </label>
                  <span className="font-mono-num text-amber-400">
                    {(options.sensitivity * 1000).toFixed(1)}
                  </span>
                </div>
                <input
                  id="opt-sens"
                  type="range"
                  min="0.0008"
                  max="0.005"
                  step="0.0002"
                  value={options.sensitivity}
                  onChange={(e) =>
                    onUpdateOptions({ ...options, sensitivity: parseFloat(e.target.value) })
                  }
                  className="mt-2 w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-sm">
                  <label htmlFor="opt-fov" className="font-medium text-slate-200">
                    Campo de visión (FOV)
                  </label>
                  <span className="font-mono-num text-amber-400">{options.fov}°</span>
                </div>
                <input
                  id="opt-fov"
                  type="range"
                  min="65"
                  max="92"
                  step="1"
                  value={options.fov}
                  onChange={(e) =>
                    onUpdateOptions({ ...options, fov: parseInt(e.target.value, 10) })
                  }
                  className="mt-2 w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-sm font-medium text-slate-200">Audio del juego</span>
                <button
                  type="button"
                  onClick={() => onUpdateOptions({ ...options, muted: !options.muted })}
                  className="inline-flex items-center gap-2 border border-white/15 bg-[#1b212c] px-4 py-2 text-xs font-medium text-slate-100 hover:bg-[#252d3c] cursor-pointer"
                >
                  {options.muted ? (
                    <>
                      <VolumeX className="h-4 w-4 text-red-400" />
                      <span>Silenciado</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 text-emerald-400" />
                      <span>Activado</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">Invertir eje vertical (Y)</span>
                <button
                  type="button"
                  onClick={() => onUpdateOptions({ ...options, invertY: !options.invertY })}
                  className="border border-white/15 bg-[#1b212c] px-4 py-2 text-xs font-medium text-slate-100 hover:bg-[#252d3c] cursor-pointer"
                >
                  {options.invertY ? 'Activado' : 'Desactivado'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">Controles HUD (Móvil / PC)</span>
                <div className="flex border border-white/15 bg-[#141820]">
                  {(['auto', 'on', 'off'] as MobileControlMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onUpdateOptions({ ...options, mobileControls: mode })}
                      className={`px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                        options.mobileControls === mode
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {mode === 'auto' ? 'Auto' : mode === 'on' ? 'Móvil' : 'PC'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Character Skin Selector */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-semibold text-white">
                      Personalizar personaje (Skin)
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-amber-300">
                    {SKIN_CATALOG.find((s) => s.id === options.skinId)?.name ?? 'Soldado Táctico'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SKIN_CATALOG.map((skin) => {
                    const selected = options.skinId === skin.id;
                    return (
                      <button
                        key={skin.id}
                        type="button"
                        onClick={() => onUpdateOptions({ ...options, skinId: skin.id })}
                        className={`flex items-start gap-3 border p-2.5 text-left transition-colors cursor-pointer ${
                          selected
                            ? 'border-amber-400 bg-amber-500/15'
                            : 'border-white/12 bg-[#141923] hover:bg-[#1b2230]'
                        }`}
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 flex-col overflow-hidden border border-white/25">
                          <div className="h-1/2 w-full" style={{ backgroundColor: skin.primaryHex }} />
                          <div className="h-1/2 w-full" style={{ backgroundColor: skin.accentHex }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-bold text-white">
                              {skin.name}
                            </span>
                            <span className="shrink-0 border border-white/15 bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                              {skin.tag}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
                            {skin.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onSetUiState(optionsReturnTarget === 'playing' ? 'playing' : 'menu')
                }
                className="mt-2 inline-flex items-center gap-2 self-start bg-[#1e2430] border border-white/15 px-4 py-2.5 text-sm font-medium text-white hover:bg-[#283040] cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Guardar y volver</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const hordePct =
    hud.horde.totalInWave > 0
      ? Math.min(100, Math.round((hud.horde.defeatedInWave / hud.horde.totalInWave) * 100))
      : 0;
  const bossPct =
    hud.horde.bossMaxHp > 0
      ? Math.max(0, Math.min(100, (hud.horde.bossHp / hud.horde.bossMaxHp) * 100))
      : 0;
  const miniBossPct =
    (hud.horde.miniBossMaxHp ?? 0) > 0
      ? Math.max(
          0,
          Math.min(100, ((hud.horde.miniBossHp ?? 0) / (hud.horde.miniBossMaxHp ?? 1)) * 100)
        )
      : 0;

  // PLAYING HUD + TENT SHOP + PAUSE / GAME OVER / VICTORY OVERLAY
  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden text-slate-100">
      {/* Lateral Dash Speed Flash Overlay */}
      {hud.isDashing && (
        <div
          className="pointer-events-none fixed inset-0 z-10"
          style={{
            background:
              'radial-gradient(circle at center, transparent 48%, rgba(56, 189, 248, 0.24) 100%)',
          }}
        />
      )}

      {/* Player Damage Flash Overlay */}
      {hud.damageFlash > 0.01 && (
        <div
          className="pointer-events-none fixed inset-0 z-10"
          style={{
            background: `radial-gradient(circle at center, transparent 42%, rgba(220, 38, 38, ${(
              hud.damageFlash * 0.55
            ).toFixed(2)}) 100%)`,
          }}
        />
      )}

      {/* World-Space Grenade & Explosive Tire Countdown Markers */}
      {hud.isLocked &&
        hud.grenade.activeMarkers.map((marker) => {
          if (!marker.visible) return null;
          const pct = Math.max(
            0,
            Math.min(100, (marker.fuseRemaining / marker.fuseMax) * 100)
          );
          const isEnemyTire = marker.owner === 'enemy';
          const isPet = marker.owner === 'pet';
          const urgent = isEnemyTire || marker.fuseRemaining < 0.75;
          return (
            <div
              key={marker.id}
              className="fixed -translate-x-1/2 -translate-y-full"
              style={{
                left: `${marker.screenX}px`,
                top: `${marker.screenY}px`,
              }}
            >
              <div
                className={`flex flex-col items-center gap-1 border px-2 py-1 shadow-lg ${
                  isEnemyTire
                    ? 'border-red-500 bg-[#320a0d]/95'
                    : isPet
                    ? 'border-sky-400 bg-[#0d1d2e]/92'
                    : urgent
                    ? 'border-red-500 bg-[#2a0e10]/92'
                    : 'border-amber-500/70 bg-[#14171f]/90'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  <Bomb
                    className={`h-3 w-3 ${
                      isEnemyTire
                        ? 'text-red-400'
                        : isPet
                        ? 'text-sky-300'
                        : urgent
                        ? 'text-red-400'
                        : 'text-amber-400'
                    }`}
                  />
                  {marker.label && (
                    <span
                      className={
                        isEnemyTire
                          ? 'text-red-200'
                          : isPet
                          ? 'text-sky-200'
                          : 'text-amber-200'
                      }
                    >
                      {marker.label}
                    </span>
                  )}
                  <span
                    className={`font-mono-num ${
                      isEnemyTire || urgent
                        ? 'text-red-300'
                        : isPet
                        ? 'text-sky-300'
                        : 'text-amber-300'
                    }`}
                  >
                    {marker.fuseRemaining.toFixed(1)}s
                  </span>
                </div>
                <div className="h-1 w-12 overflow-hidden bg-black/75">
                  <div
                    className={`h-full ${
                      isEnemyTire || urgent ? 'bg-red-500' : isPet ? 'bg-sky-400' : 'bg-amber-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}

      {/* Top-Center Horde Progress Bar & Boss HP Bar (Ciudad Abandonada) */}
      {hud.horde.active && (
        <div className="fixed left-1/2 top-5 z-10 flex w-[min(410px,82vw)] -translate-x-1/2 flex-col gap-2">
          <div className="bg-[#101318]/90 border border-amber-500/25 px-4 py-2.5 shadow-lg">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-display font-bold tracking-wide text-amber-400">
                {hud.horde.wave >= hud.horde.maxWaves
                  ? `Horda ${hud.horde.wave} / ${hud.horde.maxWaves} · Oleada Final`
                  : `Horda ${hud.horde.wave} / ${hud.horde.maxWaves}`}
              </span>
              <span className="font-mono-num font-semibold text-slate-200">
                {hud.horde.defeatedInWave} / {hud.horde.totalInWave}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden bg-white/10 border border-white/10">
              <div
                className={`h-full transition-[width] duration-200 ${
                  hud.horde.wave >= hud.horde.maxWaves ? 'bg-red-500' : 'bg-amber-500'
                }`}
                style={{ width: `${hordePct}%` }}
              />
            </div>
            {hud.horde.intermissionSec > 0 && (
              <div className="mt-1.5 text-center text-[11px] font-medium text-emerald-400">
                Horda superada (+25 Salud) · Carpa del Coronel en {hud.horde.intermissionSec}s
              </div>
            )}
          </div>

          {hud.horde.bossActive && (
            <div className="bg-[#180f12]/94 border border-red-500/60 px-4 py-2 shadow-lg">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-display font-bold tracking-wide text-red-400">
                  {hud.horde.bossName}
                </span>
                <span className="font-mono-num font-bold text-white">
                  {hud.horde.bossHp} / {hud.horde.bossMaxHp}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden bg-black/75 border border-red-500/35">
                <div
                  className="h-full bg-red-600 transition-[width] duration-100"
                  style={{ width: `${bossPct}%` }}
                />
              </div>
            </div>
          )}

          {hud.horde.miniBossActive && (
            <div className="bg-[#1c140a]/94 border border-amber-400/65 px-4 py-1.5 shadow-lg">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-display font-bold tracking-wide text-amber-300">
                  {hud.horde.miniBossName}
                </span>
                <span className="font-mono-num font-bold text-white">
                  {hud.horde.miniBossHp} / {hud.horde.miniBossMaxHp}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden bg-black/75 border border-amber-400/35">
                <div
                  className="h-full bg-amber-500 transition-[width] duration-100"
                  style={{ width: `${miniBossPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top-Center Nextbox Sandbox (Backrooms) Readout & Proximity Alert */}
      {hud.mapId === 'backrooms' && !hud.horde.active && (
        <div className="fixed left-1/2 top-5 z-10 flex w-[min(390px,82vw)] -translate-x-1/2 flex-col gap-2">
          <div className="bg-[#18160d]/92 border border-yellow-400/35 px-4 py-2 shadow-lg">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-display font-bold tracking-wide text-yellow-300">
                Nextbox Sandbox · Nivel 0
              </span>
              <span className="font-mono-num font-semibold text-slate-200">
                Activos: {hud.aliveEnemies} · Abatidos: {hud.kills}
              </span>
            </div>
          </div>

          {hud.horde.miniBossActive && (
            <div className="bg-[#1c140a]/94 border border-amber-400/65 px-4 py-1.5 shadow-lg">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-display font-bold tracking-wide text-amber-300">
                  {hud.horde.miniBossName}
                </span>
                <span className="font-mono-num font-bold text-white">
                  {hud.horde.miniBossHp} / {hud.horde.miniBossMaxHp}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden bg-black/75 border border-amber-400/35">
                <div
                  className="h-full bg-amber-500 transition-[width] duration-100"
                  style={{ width: `${miniBossPct}%` }}
                />
              </div>
            </div>
          )}

          {hud.nextbotAlert && (
            <div className="bg-[#290c0f]/94 border border-red-500/70 px-4 py-1.5 text-center text-xs font-bold tracking-wide text-red-200 shadow-lg">
              {hud.nextbotAlert}
            </div>
          )}
        </div>
      )}

      {/* Top-Center 1v1 Waiting Room & Arena Header */}
      {hud.build.enabled && (
        <div className="pointer-events-auto fixed left-1/2 top-4 z-10 flex w-[min(560px,92vw)] -translate-x-1/2 flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border border-sky-400/40 bg-[#0d1522]/92 px-3.5 py-2 shadow-lg">
            <div className="flex items-center gap-2.5">
              <Hammer className="h-4 w-4 text-sky-400 shrink-0" />
              <div>
                <div className="font-display text-xs font-bold tracking-wide text-sky-300">
                  Sala de Espera 1v1 · Construcción y Edición
                </div>
                <div className="font-mono-num text-[11px] text-slate-300">
                  Piezas: {hud.build.pieceCount} · Editadas: {hud.build.editsMade}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleDuelBot}
                title="Activar o desactivar Bot 1v1 [B]"
                className={`inline-flex items-center gap-1 border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                  hud.build.sparringBotEnabled
                    ? 'border-emerald-400/55 bg-emerald-950/60 text-emerald-200 hover:bg-emerald-900/60'
                    : 'border-white/15 bg-[#151b26] text-slate-300 hover:bg-[#1e2636]'
                }`}
              >
                <Bot className="h-3.5 w-3.5" />
                <span>Bot [B]: {hud.build.sparringBotEnabled ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={onClearDuelBuilds}
                title="Limpiar todas las construcciones [K]"
                className="inline-flex items-center gap-1 border border-red-400/40 bg-[#251217] px-2.5 py-1 text-[11px] font-semibold text-red-200 hover:bg-[#351820] transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Limpiar [K]</span>
              </button>
            </div>
          </div>

          {/* Live Map Voting Waiting-Room Strip */}
          {hud.multiplayer.inRoom && hud.multiplayer.vote?.phase === 'waiting' && (
            <div className="flex flex-wrap items-center justify-between gap-2 border border-amber-400/40 bg-[#0b1320]/90 px-3 py-1.5 text-[11px] shadow-lg">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold text-amber-200">
                  {hud.multiplayer.vote.secondsRemaining !== null
                    ? `Despliegue en ${hud.multiplayer.vote.secondsRemaining}s`
                    : 'Esperando más jugadores'}
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-200">
                  Líder:{' '}
                  <strong className="text-sky-300">
                    {mapDisplayName(hud.multiplayer.vote.winningMapId)}
                  </strong>
                </span>
              </div>
              <span className="font-mono-num text-[10px] text-amber-300">
                {isMobile ? 'Toca Pausa para votar' : 'Pulsa [M] para votar modo'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Medkit Heal Pickup Notification */}
      {hud.medkitNotice && (
        <div className="fixed left-1/2 top-24 z-20 -translate-x-1/2 border border-emerald-400/75 bg-[#0a1f16]/94 px-4 py-1.5 shadow-xl">
          <div className="flex items-center gap-2 font-display text-xs font-bold tracking-wide text-emerald-300">
            <HeartPulse className="h-4 w-4 text-emerald-400" />
            <span>{hud.medkitNotice}</span>
          </div>
        </div>
      )}

      {/* Blue-Grid Building Edit Banner (while holding G aiming at a build) */}
      {hud.isLocked && hud.build.enabled && hud.build.isEditing && (
        <div className="fixed left-1/2 bottom-36 z-20 -translate-x-1/2 flex items-center gap-4 border border-sky-400/80 bg-[#08192e]/94 px-4 py-2.5 shadow-2xl">
          <div>
            <div className="font-display text-xs font-bold uppercase tracking-wider text-sky-300">
              Editando construcción [G]
            </div>
            <div className="mt-0.5 text-[11px] text-slate-200">
              Mantén <span className="font-mono-num font-bold text-sky-300">G</span> · Clic o arrastra los cuadros azules · Clic Der. reinicia · Suelta <span className="font-mono-num font-bold text-sky-300">G</span> para confirmar
            </div>
          </div>
          {hud.build.editMask.length > 0 && (
            <div
              className={`grid gap-0.5 border border-sky-400/50 bg-[#040c18] p-1 ${
                hud.build.editMask.length === 9 ? 'grid-cols-3' : 'grid-cols-2'
              }`}
            >
              {hud.build.editMask.map((solid, idx) => (
                <div
                  key={idx}
                  className={`h-3.5 w-3.5 border ${
                    hud.build.hoveredTileIndex === idx
                      ? 'border-white bg-sky-300'
                      : solid
                      ? 'border-sky-300/60 bg-sky-500/75'
                      : 'border-white/20 bg-slate-900/80'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Multi-Kill Grenade / Streak Banner */}
      {hud.isLocked && hud.multiKillBanner && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 border border-amber-400/75 bg-[#1b1209]/92 px-5 py-2 shadow-xl ${
            hud.horde.bossActive
              ? 'top-56'
              : hud.horde.miniBossActive
              ? 'top-40'
              : hud.horde.active
              ? 'top-32'
              : 'top-20'
          }`}
        >
          <div className="flex items-center gap-2 font-display text-sm font-bold tracking-wide text-amber-300">
            <Flame className="h-4 w-4 text-orange-400" />
            <span>{hud.multiKillBanner}</span>
          </div>
        </div>
      )}

      {/* Floating Target HP indicator */}
      {hud.isLocked && hud.activeTarget && hud.activeTarget.visible && (
        <div
          className="fixed -translate-x-1/2 -translate-y-full"
          style={{
            left: `${hud.activeTarget.screenX}px`,
            top: `${hud.activeTarget.screenY}px`,
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex items-center gap-2 px-2 py-0.5 text-[11px] font-medium border ${
                hud.activeTarget.isMiniBoss
                  ? 'bg-[#241608]/92 text-amber-200 border-amber-400/65'
                  : 'bg-[#101318]/88 text-slate-200 border-white/15'
              }`}
            >
              <span>{hud.activeTarget.label}</span>
              <span className="text-slate-400">·</span>
              <span className="font-mono-num text-amber-400">
                {hud.activeTarget.distance} m
              </span>
            </div>
            <div className="h-1.5 w-24 overflow-hidden bg-black/70 border border-white/15">
              <div
                className={`h-full transition-[width] duration-100 ${
                  hud.activeTarget.isMiniBoss ? 'bg-amber-400' : 'bg-red-500'
                }`}
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, (hud.activeTarget.hp / hud.activeTarget.maxHp) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Optical Sniper Scope Overlay when aiming with Francotirador */}
      {hud.isLocked &&
        hud.activeWeaponId === 'sniper' &&
        hud.isAds &&
        !hud.isReloading &&
        !hud.grenade.isAiming &&
        !hud.isGameOver &&
        !hud.horde.victory &&
        !hud.tentShop.open &&
        !hud.chestCeremony.active && (
          <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at center, transparent 32%, rgba(3, 6, 12, 0.94) 35.5%, #020408 66%)',
              }}
            />
            <div className="relative h-[68vmin] w-[68vmin] rounded-full border-4 border-slate-900 shadow-2xl flex items-center justify-center">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-black/85" />
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/85" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-7">
                <span className="h-2.5 w-0.5 bg-black/80" />
                <span className="h-2.5 w-0.5 bg-black/80" />
                <span className="w-8" />
                <span className="h-2.5 w-0.5 bg-black/80" />
                <span className="h-2.5 w-0.5 bg-black/80" />
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-7">
                <span className="h-0.5 w-2.5 bg-black/80" />
                <span className="h-0.5 w-2.5 bg-black/80" />
                <span className="h-8" />
                <span className="h-0.5 w-2.5 bg-black/80" />
                <span className="h-0.5 w-2.5 bg-black/80" />
              </div>
              <div className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
              {hud.hitmarkerType !== 'none' && (
                <svg
                  viewBox="0 0 28 28"
                  className={`absolute h-8 w-8 ${
                    hud.hitmarkerType === 'kill' || hud.hitmarkerType === 'head'
                      ? 'text-red-500'
                      : 'text-white'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                >
                  <line x1="4" y1="4" x2="10" y2="10" />
                  <line x1="24" y1="4" x2="18" y2="10" />
                  <line x1="4" y1="24" x2="10" y2="18" />
                  <line x1="24" y1="24" x2="18" y2="18" />
                </svg>
              )}
              <div className="absolute bottom-6 flex items-center gap-2 border border-sky-400/50 bg-[#0a1220]/90 px-3 py-1 text-xs font-bold text-sky-300">
                <span className="font-mono-num">ZOOM {hud.sniperZoom}×</span>
                {!isMobile && <span className="text-[10px] text-slate-400">[Rueda / Z]</span>}
              </div>
            </div>
          </div>
        )}

      {/* Dynamic Center Crosshair, Hitmarker & Grenade Fuse Aiming Indicator */}
      {hud.isLocked &&
        !(hud.activeWeaponId === 'sniper' && hud.isAds && !hud.isReloading && !hud.grenade.isAiming) &&
        !hud.isGameOver &&
        !hud.horde.victory &&
        !hud.tentShop.open &&
        !hud.chestCeremony.active && (
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div
              className={`h-1 w-1 rounded-full ${
                hud.grenade.isAiming
                  ? 'bg-orange-400'
                  : hud.isAds
                  ? 'bg-amber-400'
                  : 'bg-white/95'
              }`}
            />

            {!hud.isAds && !hud.grenade.isAiming && (
              <>
                <div
                  className="absolute h-2.5 w-0.5 bg-white/90"
                  style={{ transform: `translateY(-${hud.spreadPixels}px)` }}
                />
                <div
                  className="absolute h-2.5 w-0.5 bg-white/90"
                  style={{ transform: `translateY(${hud.spreadPixels}px)` }}
                />
                <div
                  className="absolute h-0.5 w-2.5 bg-white/90"
                  style={{ transform: `translateX(-${hud.spreadPixels}px)` }}
                />
                <div
                  className="absolute h-0.5 w-2.5 bg-white/90"
                  style={{ transform: `translateX(${hud.spreadPixels}px)` }}
                />
              </>
            )}

            {hud.hitmarkerType !== 'none' && (
              <svg
                viewBox="0 0 28 28"
                className={`absolute h-7 w-7 ${
                  hud.hitmarkerType === 'kill' || hud.hitmarkerType === 'head'
                    ? 'text-red-500'
                    : 'text-white'
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
              >
                <line x1="4" y1="4" x2="10" y2="10" />
                <line x1="24" y1="4" x2="18" y2="10" />
                <line x1="4" y1="24" x2="10" y2="18" />
                <line x1="24" y1="24" x2="18" y2="18" />
              </svg>
            )}

            {hud.grenade.isAiming && (
              <div className="absolute top-10 flex w-64 flex-col items-center gap-1.5 border border-orange-500/60 bg-[#141110]/90 px-3 py-2 shadow-xl">
                <div className="flex w-full items-center justify-between text-[11px] font-bold">
                  <span className="text-orange-400">GRANADA LISTA · RADIO {hud.grenade.blastRadius.toFixed(1)}m</span>
                  <span className="font-mono-num text-amber-300">
                    {hud.grenade.heldFuseSec.toFixed(1)}s
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden bg-black/75 border border-white/10">
                  <div
                    className={`h-full ${
                      hud.grenade.heldFuseSec < 0.9 ? 'bg-red-500' : 'bg-orange-400'
                    }`}
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, (hud.grenade.heldFuseSec / hud.grenade.maxFuseSec) * 100)
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-300">
                  Suelta G o Clic Izq. para lanzar · Clic Der. cancela
                </span>
              </div>
            )}

            {hud.isReloading && !hud.grenade.isAiming && (
              <div className="absolute top-8 flex flex-col items-center gap-1">
                <div className="h-1 w-20 bg-black/65 border border-white/15">
                  <div
                    className="h-full bg-amber-400"
                    style={{ width: `${Math.round(hud.reloadProgress * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] font-medium tracking-wide text-amber-300">
                  Recargando
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Elimination confirmation notice */}
      {hud.isLocked && hud.lastEliminationName && !hud.multiKillBanner && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 bg-[#101318]/88 border border-red-500/45 px-4 py-1.5 text-xs font-medium text-slate-100 ${
            hud.horde.bossActive ? 'top-36' : hud.horde.active ? 'top-24' : 'top-14'
          }`}
        >
          Eliminado: <span className="text-red-400">{hud.lastEliminationName}</span>
        </div>
      )}

      {/* Chicken Instructor Dialogue Subtitle Card (Tutorial Map) */}
      {hud.tutorial.active && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[min(560px,92vw)] bg-[#101318]/92 border border-amber-500/45 px-5 py-3.5 shadow-xl">
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-amber-400">
                {hud.tutorial.speakerName}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-300">{hud.tutorial.title}</span>
            </div>
            {!hud.tutorial.completed && hud.tutorial.goal > 1 && (
              <span className="font-mono-num font-bold text-amber-300">
                {hud.tutorial.progress} / {hud.tutorial.goal}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm leading-snug text-slate-100">
            {hud.tutorial.dialogue}
          </p>
          {hud.tutorial.completed && (
            <div className="pointer-events-auto mt-2.5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => onLaunchMap('city')}
                className="bg-amber-500 px-3.5 py-1.5 font-display text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
              >
                Desplegar en Ciudad Abandonada (Enter)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Top-Left Compact Combat Metrics */}
      <div className="fixed left-3 sm:left-5 top-3 sm:top-5 flex items-center gap-3 sm:gap-4 bg-[#101318]/88 border border-white/12 px-3 sm:px-4 py-2 sm:py-2.5">
        <div>
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-400">Zona</div>
          <div className="font-display text-xs sm:text-sm font-bold text-amber-400">
            {mapDisplayName(hud.mapId)}
          </div>
        </div>
        <div className="h-7 w-px bg-white/10" />
        {(hud.mapId === 'city' ||
          hud.mapId === 'desert' ||
          hud.mapId === 'cubes' ||
          hud.mapId === 'pixel' ||
          hud.mapId === 'pueblo' ||
          hud.mapId === 'backrooms' ||
          hud.mapId === 'nightcamp') && (
          <>
            <div>
              <div className="text-[10px] sm:text-[11px] font-medium text-slate-400">
                {hud.mapId === 'desert'
                  ? 'Autómatas abatidos'
                  : hud.mapId === 'cubes'
                  ? 'Camiones abatidos'
                  : hud.mapId === 'pixel'
                  ? 'Koopas abatidos'
                  : hud.mapId === 'pueblo'
                  ? 'Vecinos abatidos'
                  : hud.mapId === 'backrooms'
                  ? 'Memes abatidos'
                  : hud.mapId === 'nightcamp'
                  ? 'Enemigos abatidos'
                  : 'Zombis abatidos'}
              </div>
              <div className="font-display font-mono-num text-lg sm:text-xl font-bold text-white">
                {hud.kills}
              </div>
            </div>
            <div className="h-7 w-px bg-white/10" />
          </>
        )}
        <div>
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-400">Precisión</div>
          <div className="font-display font-mono-num text-lg sm:text-xl font-bold text-slate-200">
            {accuracy}%
          </div>
        </div>
        {hud.activeMedkits > 0 && (
          <>
            <div className="h-7 w-px bg-white/10" />
            <div>
              <div className="text-[10px] sm:text-[11px] font-medium text-emerald-400">
                Botiquines
              </div>
              <div className="font-display font-mono-num text-lg sm:text-xl font-bold text-emerald-300">
                {hud.activeMedkits}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Live Multiplayer Teammate Movement & HP Strip */}
      {hud.multiplayer.inRoom && hud.multiplayer.peers.length > 0 && (
        <div className="fixed left-3 sm:left-5 top-20 sm:top-24 z-10 flex flex-col gap-1.5 w-[min(245px,62vw)]">
          {hud.multiplayer.peers.map((peer) => {
            const hpPct = Math.max(
              0,
              Math.min(100, Math.round((peer.health / Math.max(1, peer.maxHealth)) * 100))
            );
            const moveState = peer.isDashing
              ? 'Dash'
              : peer.isSprinting
              ? 'Esprintando'
              : peer.isCrouching
              ? 'Agachado'
              : peer.isMoving
              ? 'En movimiento'
              : 'En posición';
            const moveColor = peer.isDashing
              ? 'text-sky-300'
              : peer.isSprinting
              ? 'text-amber-300'
              : peer.isMoving
              ? 'text-emerald-300'
              : 'text-slate-400';
            return (
              <div
                key={peer.id}
                className="bg-[#0f1622]/90 border border-sky-400/35 px-3 py-1.5 text-[11px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-white">{peer.name}</span>
                  <span className={`shrink-0 font-medium ${moveColor}`}>{moveState}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden bg-black/65">
                    <div
                      className={`h-full transition-[width] duration-100 ${
                        hpPct > 50 ? 'bg-emerald-500' : hpPct > 25 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${hpPct}%` }}
                    />
                  </div>
                  <span className="font-mono-num text-[10px] text-slate-300">
                    {WEAPON_SPECS[peer.weaponId as WeaponId]?.name.split(' ')[0] ?? 'Arma'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Top-Right Quick Controls + Multiplayer Room Status */}
      <div className="pointer-events-auto fixed right-3 sm:right-5 top-3 sm:top-5 flex items-center gap-2">
        {hud.multiplayer.inRoom && (
          <div className="hidden sm:flex items-center gap-2 border border-sky-400/40 bg-[#0f1a28]/90 px-3 py-2 text-xs text-sky-200">
            <Users className="h-3.5 w-3.5 text-sky-400" />
            <span className="font-mono-num font-bold">{hud.multiplayer.roomId}</span>
            <span className="text-slate-400">·</span>
            <span>{1 + hud.multiplayer.peers.length} jugadores</span>
          </div>
        )}
        {(hud.petUnlocked || hud.mapId === 'pueblo') &&
          hud.mapId !== 'tutorial' &&
          hud.mapId !== 'backrooms' &&
          hud.mapId !== 'duel' && (
            <button
              type="button"
              onClick={onCycleCompanionSide}
              title="Cambiar posición del Capitán Pollo [V]"
              className="hidden sm:flex items-center gap-1.5 border border-yellow-400/45 bg-[#1a180d]/92 px-3 py-2 text-xs font-semibold text-yellow-300 hover:bg-[#272312] transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>
                Capitán Pollo ·{' '}
                {hud.companionSide === 'left'
                  ? 'Izq.'
                  : hud.companionSide === 'right'
                  ? 'Der.'
                  : 'Delante'}
              </span>
              <span className="font-mono-num text-[10px] text-amber-200/80">[V]</span>
            </button>
          )}
        <button
          type="button"
          onClick={() => onUpdateOptions({ ...options, muted: !options.muted })}
          title={options.muted ? 'Activar sonido' : 'Silenciar sonido'}
          className="flex h-10 w-10 items-center justify-center bg-[#101318]/88 border border-white/12 text-slate-200 hover:bg-[#1c212b] transition-colors cursor-pointer"
        >
          {options.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        {!isMobile && (
          <button
            type="button"
            onClick={onResetRange}
            title="Reiniciar zona"
            className="flex h-10 items-center gap-2 bg-[#101318]/88 border border-white/12 px-3 text-xs font-medium text-slate-200 hover:bg-[#1c212b] transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reiniciar</span>
          </button>
        )}
        {isMobile && hud.isLocked && (
          <button
            type="button"
            onClick={onTouchPause}
            title="Pausa"
            className="flex h-10 w-10 items-center justify-center bg-[#101318]/90 border border-amber-500/40 text-amber-300 cursor-pointer"
          >
            <Pause className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Bottom-Left Active Upgrades Strip + Player Health & Posture */}
      <div
        className={`fixed left-3 sm:left-5 flex flex-col gap-2 ${
          isMobile ? 'top-16 sm:top-20' : 'bottom-5'
        }`}
      >
        {(hud.mapId === 'city' ||
          hud.mapId === 'desert' ||
          hud.mapId === 'cubes' ||
          hud.mapId === 'pixel' ||
          hud.mapId === 'pueblo' ||
          hud.mapId === 'nightcamp') &&
          hud.tentShop.ownedIds.length > 0 &&
          !isMobile && (
            <div className="bg-[#101318]/88 border border-amber-500/30 px-3.5 py-2 max-w-[270px]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                Mejoras del Coronel
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {hud.tentShop.ownedIds.map((id) => {
                  const up = UPGRADE_CATALOG[id];
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between gap-2 text-[11px] text-slate-200"
                    >
                      <span className="truncate font-medium">{up.name}</span>
                      <span className="shrink-0 font-mono-num text-[10px] text-emerald-400">
                        {up.category === 'weapon' ? 'Arma' : 'Hab.'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        <div className="bg-[#101318]/88 border border-white/12 px-3 sm:px-4 py-2 sm:py-3 min-w-[165px] sm:min-w-[205px]">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs font-medium text-slate-400">Salud</span>
            <div>
              <span
                className={`font-display font-mono-num text-xl sm:text-2xl font-bold ${
                  hud.health <= 30 ? 'text-red-400' : 'text-white'
                }`}
              >
                {hud.health}
              </span>
              <span className="font-mono-num text-xs text-slate-400"> / {hud.maxHealth}</span>
            </div>
          </div>
          <div className="mt-1.5 h-2 w-full bg-white/10">
            <div
              className={`h-full transition-[width] duration-150 ${
                hud.health <= 30
                  ? 'bg-red-500'
                  : hud.health <= 60
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (hud.health / hud.maxHealth) * 100)}%` }}
            />
          </div>
          {!isMobile && (
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-400">
              <div>
                <span>Postura: </span>
                <span className="font-medium text-slate-200">
                  {hud.isDashing
                    ? 'Dash lateral'
                    : hud.isCrouching
                    ? 'Agachado'
                    : hud.isSprinting
                    ? 'Esprintando'
                    : 'De pie'}
                </span>
              </div>
              <span className="font-mono-num text-[11px] text-slate-400">[F] Inspeccionar</span>
            </div>
          )}

          {/* Lateral Dash Cooldown / Readiness Strip */}
          <div className="mt-2 border-t border-white/10 pt-2">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Wind className="h-3.5 w-3.5 text-sky-400" />
                <span>{isMobile ? 'Dash' : '[Ctrl] Dash'}</span>
              </span>
              <span
                className={`font-mono-num font-bold ${
                  hud.isDashing
                    ? 'text-sky-300'
                    : hud.dashCooldown <= 0.02
                    ? 'text-emerald-400'
                    : 'text-amber-300'
                }`}
              >
                {hud.isDashing
                  ? 'IMPULSO'
                  : hud.dashCooldown <= 0.02
                  ? 'LISTO'
                  : `${hud.dashCooldown.toFixed(1)}s`}
              </span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden bg-white/10">
              <div
                className={`h-full transition-[width] duration-75 ${
                  hud.isDashing
                    ? 'bg-sky-300'
                    : hud.dashCooldown <= 0.02
                    ? 'bg-sky-400'
                    : 'bg-amber-400'
                }`}
                style={{
                  width: `${
                    hud.dashCooldownMax > 0
                      ? Math.max(
                          0,
                          Math.min(
                            100,
                            ((hud.dashCooldownMax - hud.dashCooldown) / hud.dashCooldownMax) * 100
                          )
                        )
                      : 100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-Right / Top-Right Weapon & Grenade Strip */}
      <div
        className={`fixed right-3 sm:right-5 flex flex-col items-end gap-2 ${
          isMobile ? 'top-16 sm:top-20' : 'bottom-5'
        }`}
      >
        {hud.build.enabled && (
          <div className="pointer-events-auto flex items-center gap-1 border border-sky-400/40 bg-[#0d1624]/92 p-1 shadow-lg">
            {(
              [
                { type: 'stairs', key: 'C', label: 'Escaleras' },
                { type: 'floor', key: 'X', label: 'Suelo' },
                { type: 'ramp', key: 'Z', label: 'Rampa' },
                { type: 'wall', key: 'V', label: 'Pared' },
              ] as { type: BuildPieceType; key: string; label: string }[]
            ).map((item) => {
              const active = hud.build.activePiece === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => onSelectBuildPiece?.(active ? null : item.type)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-sky-400 text-slate-950 font-bold'
                      : 'text-sky-100 hover:bg-sky-500/20'
                  }`}
                >
                  <span className="font-mono-num text-[10px] opacity-85">[{item.key}]</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
            <div
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold border-l border-white/10 ${
                hud.build.isEditing ? 'bg-sky-500 text-slate-950 font-bold' : 'text-sky-300'
              }`}
            >
              <Layers className="h-3 w-3" />
              <span className="font-mono-num">[G]</span>
              <span className="hidden sm:inline">Editar</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {!isMobile && !hud.build.enabled && (
            <div
              className={`flex items-center gap-2 border px-3 py-1.5 text-xs ${
                hud.grenade.count > 0
                  ? 'border-orange-500/45 bg-[#171310]/90 text-slate-100'
                  : 'border-white/10 bg-[#101318]/85 text-slate-500'
              }`}
            >
              <Bomb
                className={`h-4 w-4 ${
                  hud.grenade.count > 0 ? 'text-orange-400' : 'text-slate-600'
                }`}
              />
              <span className="font-mono-num font-bold text-amber-300">[G]</span>
              <span className="font-medium">Granadas</span>
              <span className="font-mono-num font-bold text-white">
                {hud.grenade.count} / {hud.grenade.maxCount}
              </span>
            </div>
          )}

          <div className="pointer-events-auto flex items-center gap-1 bg-[#101318]/88 border border-white/12 p-1">
            {WEAPON_ORDER.filter((wId) => {
              const hasSniper = hud.unlockedWeapons.includes('sniper');
              if (hasSniper && wId === 'rifle') return false;
              if (!hasSniper && wId === 'sniper') return false;
              if (wId === 'chicken_combo' && hud.mapId !== 'nightcamp') return false;
              return true;
            }).map((wId) => {
              const spec = WEAPON_SPECS[wId];
              const unlocked = hud.unlockedWeapons.includes(wId);
              const active = hud.activeWeaponId === wId;
              const lockedTitle =
                wId === 'chainsaw'
                  ? 'Arma especial bloqueada'
                  : 'Supera Ciudad Abandonada para desbloquear';
              return (
                <button
                  key={wId}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => unlocked && onSelectWeapon(wId)}
                  title={unlocked ? spec.name : lockedTitle}
                  className={`flex items-center gap-1 px-2 py-1 text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
                    !unlocked
                      ? 'text-slate-600 cursor-not-allowed opacity-65'
                      : active
                      ? 'bg-amber-500 text-slate-950 font-semibold cursor-pointer'
                      : 'text-slate-300 hover:bg-white/10 cursor-pointer'
                  }`}
                >
                  <span className="font-mono-num">{spec.slot}</span>
                  <span className="hidden sm:inline">{spec.name.split(' ')[0]}</span>
                  {!unlocked && <Lock className="h-3 w-3 text-slate-500" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-[#101318]/88 border border-white/12 px-3 sm:px-4 py-2 sm:py-3 min-w-[175px] sm:min-w-[245px]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-display text-xs sm:text-sm font-semibold text-white">
                {activeWeapon.name}
              </div>
              <div className="hidden sm:block text-[11px] text-slate-400">
                {activeWeapon.category} ·{' '}
                {activeWeapon.fireMode === 'auto' ? 'Automático' : 'Semiautomático'}
              </div>
            </div>
            <div className="text-right">
              <span
                className={`font-display font-mono-num text-2xl sm:text-3xl font-bold ${
                  hud.activeWeaponId !== 'chainsaw' &&
                  currentAmmo <= Math.ceil(maxAmmo * 0.25)
                    ? 'text-red-400'
                    : 'text-white'
                }`}
              >
                {hud.activeWeaponId === 'chainsaw' ? '∞' : currentAmmo}
              </span>
              <span className="font-mono-num text-xs sm:text-sm text-slate-400">
                {' '}
                / {hud.activeWeaponId === 'chainsaw' ? '∞' : maxAmmo}
              </span>
            </div>
          </div>
          {currentAmmo === 0 &&
            hud.activeWeaponId !== 'chainsaw' &&
            !hud.isReloading &&
            !isMobile && (
              <div className="mt-1.5 text-right text-[11px] font-medium text-amber-400">
                Pulsa R para recargar
              </div>
            )}
        </div>
      </div>

      {/* AUTOMATIC MOBILE TOUCH HUD (when touch/mobile mode is active) */}
      {isMobile &&
        hud.isLocked &&
        !hud.isGameOver &&
        !hud.horde.victory &&
        !hud.tentShop.open &&
        !hud.chestCeremony.active && (
          <div className="pointer-events-none fixed inset-0 z-15">
            {/* Right-Half Camera Swipe Look Zone */}
            <div
              onTouchStart={handleLookStart}
              onTouchMove={handleLookMove}
              onTouchEnd={handleLookEnd}
              onTouchCancel={handleLookEnd}
              className="pointer-events-auto fixed right-0 top-24 bottom-0 left-[38%] touch-none"
            />

            {/* Left Virtual Thumbstick */}
            <div
              onTouchStart={handleJoystickStart}
              onTouchMove={handleJoystickMove}
              onTouchEnd={handleJoystickEnd}
              onTouchCancel={handleJoystickEnd}
              className="pointer-events-auto fixed bottom-6 left-6 flex h-28 w-28 items-center justify-center rounded-full border-2 border-white/25 bg-[#0f131b]/55 touch-none"
            >
              <div
                className="h-12 w-12 rounded-full border-2 border-amber-400 bg-amber-500/80 shadow-lg"
                style={{
                  transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
                }}
              />
            </div>

            {/* Right-Hand Combat Action Buttons */}
            <div className="pointer-events-auto fixed bottom-5 right-5 flex flex-col items-end gap-2.5 touch-none">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    onTouchGrenadeStart();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    onTouchGrenadeRelease();
                  }}
                  onTouchCancel={(e) => {
                    e.stopPropagation();
                    onTouchGrenadeRelease();
                  }}
                  className="flex h-12 px-3 items-center gap-1.5 border border-orange-400/60 bg-[#23140c]/85 text-xs font-bold text-orange-300 active:bg-orange-500 active:text-slate-950"
                >
                  <Bomb className="h-4 w-4" />
                  <span className="font-mono-num">{hud.grenade.count}</span>
                </button>
                <button
                  type="button"
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    onTouchReload();
                  }}
                  className="flex h-12 px-3.5 items-center justify-center border border-white/25 bg-[#111722]/85 text-xs font-bold text-slate-100 active:bg-amber-500 active:text-slate-950"
                >
                  RECARGAR
                </button>
                <button
                  type="button"
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    onTouchAds(!hud.isAds);
                  }}
                  className={`flex h-12 px-3.5 items-center justify-center border text-xs font-bold ${
                    hud.isAds
                      ? 'border-amber-400 bg-amber-500 text-slate-950'
                      : 'border-white/25 bg-[#111722]/85 text-slate-100'
                  }`}
                >
                  MIRA
                </button>
                {hud.activeWeaponId === 'sniper' && hud.isAds && (
                  <button
                    type="button"
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      onToggleSniperZoom();
                    }}
                    className="flex h-12 px-3 items-center justify-center border border-sky-400 bg-[#0d1c2e]/90 font-mono-num text-xs font-bold text-sky-300 active:bg-sky-400 active:text-slate-950"
                  >
                    {hud.sniperZoom}×
                  </button>
                )}
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    onTouchDash();
                  }}
                  className={`flex h-12 px-3 items-center gap-1 border text-xs font-bold transition-colors ${
                    hud.dashCooldown <= 0.02
                      ? 'border-sky-400/75 bg-[#0e2030]/90 text-sky-300 active:bg-sky-400 active:text-slate-950'
                      : 'border-white/15 bg-[#111722]/65 text-slate-500'
                  }`}
                >
                  <Wind className="h-3.5 w-3.5" />
                  <span>DASH</span>
                </button>
                <button
                  type="button"
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    onTouchCrouch();
                  }}
                  className={`flex h-12 px-3 items-center justify-center border text-xs font-bold ${
                    hud.isCrouching
                      ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                      : 'border-white/25 bg-[#111722]/85 text-slate-200'
                  }`}
                >
                  AGACHAR
                </button>
                <button
                  type="button"
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    onTouchJump();
                  }}
                  className="flex h-12 px-3.5 items-center justify-center border border-white/25 bg-[#111722]/85 text-xs font-bold text-white active:bg-white active:text-slate-950"
                >
                  SALTAR
                </button>
                <button
                  type="button"
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    onTouchShoot(true);
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    onTouchShoot(false);
                  }}
                  onTouchCancel={(e) => {
                    e.stopPropagation();
                    onTouchShoot(false);
                  }}
                  className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-red-400 bg-red-600/85 font-display text-xs font-bold text-white shadow-xl active:scale-95 active:bg-red-500"
                >
                  DISPARAR
                </button>
              </div>
            </div>
          </div>
        )}

      {/* LA CARPA DEL CAPITÁN CORONEL — Per-Horde Upgrade Shop */}
      {hud.tentShop.open && !hud.isGameOver && !hud.horde.victory && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-[#090b10]/82 p-4 md:p-8">
          <div className="w-full max-w-4xl border border-amber-500/45 bg-[#13161e] shadow-2xl overflow-hidden">
            {/* Striped Crimson & Cream Canvas Tent Awning */}
            <div
              className="h-5 w-full border-b-2 border-amber-500/60"
              style={{
                background:
                  'repeating-linear-gradient(90deg, #991b1b 0px, #991b1b 32px, #e7dec8 32px, #e7dec8 64px)',
              }}
            />

            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-amber-400">
                    Suministros de Campaña · Horda {hud.tentShop.wave} de {hud.horde.maxWaves}
                  </div>
                  <h2 className="mt-1 font-display text-2xl md:text-3xl font-bold text-white">
                    La Carpa del Capitán Coronel
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm italic text-amber-100/90">
                    &ldquo;{hud.tentShop.greeting}&rdquo;
                  </p>
                </div>

                <div className="border border-amber-500/35 bg-[#1b1f29] px-3.5 py-2 text-right">
                  <div className="text-[11px] text-slate-400">Equipadas</div>
                  <div className="font-display font-mono-num text-lg font-bold text-amber-400">
                    {hud.tentShop.ownedIds.length}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                {hud.tentShop.options.map((opt, idx) => {
                  const isWeapon = opt.category === 'weapon';
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectTentUpgrade(opt.id)}
                      className={`group flex flex-col justify-between border p-5 text-left transition-colors cursor-pointer ${
                        isWeapon
                          ? 'border-amber-500/40 bg-[#191c25] hover:border-amber-400 hover:bg-[#222634]'
                          : 'border-emerald-500/35 bg-[#171d23] hover:border-emerald-400 hover:bg-[#1e2730]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {renderUpgradeIcon(opt)}
                            <span
                              className={`text-[11px] font-bold uppercase tracking-wider ${
                                isWeapon ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                            >
                              {opt.subtitle}
                            </span>
                          </div>
                          <span className="border border-white/20 bg-black/40 px-2 py-0.5 font-mono-num text-xs font-bold text-white">
                            {idx + 1}
                          </span>
                        </div>

                        <h3 className="mt-3 font-display text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                          {opt.name}
                        </h3>

                        <p className="mt-2 text-xs leading-relaxed text-slate-300">
                          {opt.description}
                        </p>
                      </div>

                      <div className="mt-5 border-t border-white/10 pt-3">
                        <div
                          className={`text-xs font-bold ${
                            isWeapon ? 'text-amber-300' : 'text-emerald-300'
                          }`}
                        >
                          {opt.bonusLabel}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-white">
                          <span>Equipar mejora</span>
                          <span className="font-mono-num text-amber-400">→</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
                <span>Haz clic en una mejora o pulsa las teclas 1, 2 o 3 para equiparla.</span>
                <span className="text-amber-400 font-medium">El combate iniciará al salir de la carpa</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE 3D REWARD CHEST CEREMONY */}
      {hud.chestCeremony.active && (
        <div className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-between p-6 md:p-10">
          <div className="border border-amber-500/50 bg-[#101318]/90 px-6 py-3 text-center shadow-2xl">
            <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400">
              <Sparkles className="h-4 w-4" />
              <span>
                {hud.chestCeremony.rewardKind === 'chainsaw'
                  ? '¡Campamento Nocturno Superado!'
                  : hud.chestCeremony.rewardKind === 'rocket'
                  ? '¡Ciudad Abandonada Superada!'
                  : '¡Mundo de Cubos Superado!'}
              </span>
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold text-white">
              {hud.chestCeremony.stage === 'waiting_click'
                ? hud.chestCeremony.rewardKind === 'chainsaw'
                  ? 'Cofre de Supervivencia Extrema'
                  : hud.chestCeremony.rewardKind === 'pet'
                  ? 'Cofre de Mascota Legendaria'
                  : hud.chestCeremony.rewardKind === 'sniper' ||
                    hud.chestCeremony.rewardKind === 'cubes_bundle'
                  ? 'Cofre de Francotirador Épico'
                  : 'Cofre de Arsenal Táctico'
                : hud.chestCeremony.stage === 'opening'
                ? 'Desbloqueando recompensa...'
                : hud.chestCeremony.rewardKind === 'chainsaw'
                ? '¡Motosierra Desbloqueada!'
                : hud.chestCeremony.rewardKind === 'cubes_bundle'
                ? '¡Francotirador AWP-X y Capitán Pollo!'
                : hud.chestCeremony.rewardKind === 'sniper'
                ? '¡Francotirador AWP-X Desbloqueado!'
                : hud.chestCeremony.rewardKind === 'pet'
                ? '¡Mascota Capitán Pollo Desbloqueada!'
                : '¡Lanzacohetes RL-3 Desbloqueado!'}
            </h2>
          </div>

          {hud.chestCeremony.stage === 'waiting_click' && (
            <div className="pointer-events-auto flex flex-col items-center gap-3 mb-4">
              <button
                type="button"
                onClick={onOpenRewardChest}
                className="flex items-center gap-3 border-2 border-amber-300 bg-amber-500 px-8 py-4 font-display text-base font-bold text-slate-950 shadow-2xl hover:bg-amber-400 transition-colors cursor-pointer"
              >
                <Sparkles className="h-5 w-5" />
                <span>Haz clic en el cofre (o pulsa aquí) para abrirlo</span>
              </button>
            </div>
          )}

          {hud.chestCeremony.stage === 'revealed' && (
            <div className="pointer-events-auto w-full max-w-lg border border-amber-400/60 bg-[#12161f]/95 p-6 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="flex h-11 w-11 items-center justify-center bg-amber-500/20 border border-amber-400/50 text-amber-400 shrink-0">
                  {hud.chestCeremony.rewardKind === 'chainsaw' ? (
                    <Zap className="h-6 w-6 text-red-400" />
                  ) : hud.chestCeremony.rewardKind === 'pet' ? (
                    <Sparkles className="h-6 w-6" />
                  ) : hud.chestCeremony.rewardKind === 'sniper' ||
                    hud.chestCeremony.rewardKind === 'cubes_bundle' ? (
                    <Crosshair className="h-6 w-6 text-sky-400" />
                  ) : (
                    <Rocket className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    {hud.chestCeremony.rewardKind === 'chainsaw'
                      ? 'Nueva arma cuerpo a cuerpo infinita · Tecla 6'
                      : hud.chestCeremony.rewardKind === 'cubes_bundle'
                      ? 'Reemplaza al fusil (Tecla 2) + Mascota aliada'
                      : hud.chestCeremony.rewardKind === 'sniper'
                      ? 'Reemplaza al fusil · Tecla 2'
                      : hud.chestCeremony.rewardKind === 'pet'
                      ? 'Mascota aliada permanente · Estilo Lego'
                      : 'Nueva arma permanente · Tecla 4'}
                  </div>
                  <h3 className="font-display text-xl font-bold text-white">
                    {hud.chestCeremony.rewardKind === 'chainsaw'
                      ? 'Motosierra (Daño continuo ∞)'
                      : hud.chestCeremony.rewardKind === 'cubes_bundle'
                      ? 'Francotirador AWP-X + Capitán Pollo'
                      : hud.chestCeremony.rewardKind === 'sniper'
                      ? 'Francotirador AWP-X (Zoom 4× / 8×)'
                      : hud.chestCeremony.rewardKind === 'pet'
                      ? 'Capitán Pollo (Lanzagranadas)'
                      : 'Lanzacohetes RL-3 (3 cohetes)'}
                  </h3>
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-300">
                {hud.chestCeremony.rewardKind === 'chainsaw'
                  ? 'Corta hordas completas cuerpo a cuerpo sin gastar munición ni recargar. Desbloqueada permanentemente en todas las zonas.'
                  : hud.chestCeremony.rewardKind === 'cubes_bundle'
                  ? 'El Francotirador AWP-X reemplaza al fusil en la ranura 2 con mira telescópica de zoom 4×/8× (rueda del ratón o Z). Además, el Capitán Pollo te acompañará lanzando granadas aliadas.'
                  : hud.chestCeremony.rewardKind === 'sniper'
                  ? 'El Francotirador AWP-X reemplaza al fusil en la ranura 2 con mira óptica de largo alcance. Apunta con Clic Derecho y cambia el zoom (4× / 8×) con la rueda del ratón o la tecla Z.'
                  : hud.chestCeremony.rewardKind === 'pet'
                  ? 'El valiente Capitán Pollo te acompaña en todos los mapas de combate, saltando con animaciones tipo Lego y lanzando granadas aliadas contra los enemigos.'
                  : 'Dispara cohetes explosivos de alto impacto con 3 proyectiles por cargador y daño masivo de área. Ya está disponible en todas las zonas.'}
              </p>

              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                {hud.chestCeremony.rewardKind === 'chainsaw' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onLaunchMap('city')}
                      className="flex-1 bg-red-500 px-4 py-3 font-display text-sm font-bold text-white hover:bg-red-400 transition-colors cursor-pointer"
                    >
                      Ir a Ciudad Abandonada
                    </button>
                    <button
                      type="button"
                      onClick={onResetRange}
                      className="border border-white/15 bg-[#1a202c] px-4 py-3 text-xs font-semibold text-slate-100 hover:bg-[#242c3d] transition-colors cursor-pointer"
                    >
                      Rejugar Campamento
                    </button>
                  </>
                ) : hud.chestCeremony.rewardKind === 'sniper' ||
                  hud.chestCeremony.rewardKind === 'cubes_bundle' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onLaunchMap('pixel')}
                      className="flex-1 bg-sky-500 px-4 py-3 font-display text-sm font-bold text-slate-950 hover:bg-sky-400 transition-colors cursor-pointer"
                    >
                      Ir a Mundo Pixel
                    </button>
                    <button
                      type="button"
                      onClick={onResetRange}
                      className="border border-white/15 bg-[#1a202c] px-4 py-3 text-xs font-semibold text-slate-100 hover:bg-[#242c3d] transition-colors cursor-pointer"
                    >
                      Rejugar Cubos
                    </button>
                  </>
                ) : hud.chestCeremony.rewardKind === 'pet' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onLaunchMap('pixel')}
                      className="flex-1 bg-sky-500 px-4 py-3 font-display text-sm font-bold text-slate-950 hover:bg-sky-400 transition-colors cursor-pointer"
                    >
                      Ir a Mundo Pixel
                    </button>
                    <button
                      type="button"
                      onClick={onResetRange}
                      className="border border-white/15 bg-[#1a202c] px-4 py-3 text-xs font-semibold text-slate-100 hover:bg-[#242c3d] transition-colors cursor-pointer"
                    >
                      Rejugar Cubos
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onLaunchMap('desert')}
                      className="flex-1 bg-amber-500 px-4 py-3 font-display text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
                    >
                      Ir a Desierto Arsanal
                    </button>
                    <button
                      type="button"
                      onClick={onResetRange}
                      className="border border-white/15 bg-[#1a202c] px-4 py-3 text-xs font-semibold text-slate-100 hover:bg-[#242c3d] transition-colors cursor-pointer"
                    >
                      Reintentar Ciudad
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={onReturnToMainMenu}
                  className="border border-white/15 bg-[#161a24] px-4 py-3 text-xs font-medium text-slate-300 hover:bg-[#212735] transition-colors cursor-pointer"
                >
                  Menú
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upgraded Game Over / Victory Overlay */}
      {(hud.isGameOver || hud.horde.victory) && !hud.chestCeremony.active && (() => {
        const rankInfo = computeCombatRank(
          hud.horde.victory,
          hud.kills,
          accuracy,
          hud.headshots
        );
        const survivalFormatted = formatSurvivalTime(hud.survivalTimeSec);
        const damageFormatted = Math.round(hud.damageDealt).toLocaleString('es-ES');

        return (
          <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-[#090b10]/88 p-4 sm:p-6 overflow-y-auto">
            <div className="w-full max-w-lg border border-white/15 bg-[#12161f] p-6 sm:p-7 shadow-2xl my-auto">
              {/* Top Header with Computed Performance Rank */}
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <div
                    className={`text-[11px] font-bold uppercase tracking-[0.22em] ${
                      hud.horde.victory ? 'text-amber-400' : 'text-red-400'
                    }`}
                  >
                    {hud.horde.victory
                      ? 'Misión Completada · Operación Exitosa'
                      : 'Informe de Combate · Caído en Acción'}
                  </div>
                  <h2
                    className={`mt-1 font-display text-2xl sm:text-3xl font-bold ${
                      hud.horde.victory ? 'text-white' : 'text-red-400'
                    }`}
                  >
                    {hud.horde.victory
                      ? hud.mapId === 'desert'
                        ? '¡Victoria en Desierto Arsanal!'
                        : hud.mapId === 'cubes'
                        ? '¡Victoria en Mundo de Cubos!'
                        : hud.mapId === 'pixel'
                        ? '¡Victoria en Mundo Pixel!'
                        : hud.mapId === 'pueblo'
                        ? '¡Victoria en Pueblo Desconocido!'
                        : hud.mapId === 'nightcamp'
                        ? '¡Victoria en Campamento nocturno!'
                        : '¡Victoria en Ciudad Abandonada!'
                      : 'Has sido derrotado'}
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-300">
                    {hud.horde.victory
                      ? hud.mapId === 'desert'
                        ? 'Has destruido al Jefe Coloso Carmesí y sobrevivido a las 5 hordas del desierto.'
                        : hud.mapId === 'cubes'
                        ? 'Has destruido al Mega-Camión Titán y superado las 5 hordas junto al Capitán Pollo.'
                        : hud.mapId === 'pixel'
                        ? 'Has vencido al Rey Koopa Alado y sobrevivido a las 5 hordas pixeladas.'
                        : hud.mapId === 'pueblo'
                        ? 'Has derrotado al Alcalde de Este Pueblo y a sus Mini-Jefes tras 5 intensas hordas.'
                        : hud.mapId === 'nightcamp'
                        ? 'Has sobrevivido a la mega-horda final con todos los jefes y enemigos a la vez.'
                        : 'Has destruido al Jefe Tanque Zombi y sobrevivido a las 5 hordas.'
                      : hud.mapId === 'backrooms'
                      ? `Los memes de Nivel 0 te alcanzaron tras abatir a ${hud.kills} Nextbots.`
                      : hud.mapId === 'duel'
                      ? `Combate finalizado en Arena 1v1 con ${hud.build.buildsPlaced} piezas construidas.`
                      : `Caíste en la Horda ${hud.horde.wave} de ${hud.horde.maxWaves}.`}
                  </p>
                </div>

                <div
                  className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center border-2 ${rankInfo.colorClass}`}
                >
                  <span className="font-display text-3xl font-bold leading-none">
                    {rankInfo.rank}
                  </span>
                  <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider opacity-90">
                    Rango
                  </span>
                </div>
              </div>

              {/* 6-Tile Tactical Metrics Grid */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="border border-white/10 bg-[#171c27] px-3 py-2.5">
                  <div className="text-[11px] text-slate-400">
                    {hud.mapId === 'backrooms' || hud.mapId === 'duel' ? 'Modo' : 'Horda'}
                  </div>
                  <div className="mt-0.5 font-display font-mono-num text-lg font-bold text-white">
                    {hud.mapId === 'backrooms'
                      ? 'Sandbox ∞'
                      : hud.mapId === 'duel'
                      ? 'Arena 1v1'
                      : `${hud.horde.wave} / ${hud.horde.maxWaves}`}
                  </div>
                </div>

                <div className="border border-white/10 bg-[#171c27] px-3 py-2.5">
                  <div className="text-[11px] text-slate-400">
                    {hud.mapId === 'desert'
                      ? 'Autómatas'
                      : hud.mapId === 'cubes'
                      ? 'Camiones'
                      : hud.mapId === 'pixel'
                      ? 'Koopas'
                      : hud.mapId === 'pueblo'
                      ? 'Vecinos'
                      : hud.mapId === 'backrooms'
                      ? 'Memes'
                      : hud.mapId === 'nightcamp'
                      ? 'Enemigos'
                      : 'Abatidos'}
                  </div>
                  <div className="mt-0.5 font-display font-mono-num text-lg font-bold text-white">
                    {hud.kills}
                  </div>
                </div>

                <div className="border border-white/10 bg-[#171c27] px-3 py-2.5">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="h-3 w-3 text-sky-400" />
                    <span>Supervivencia</span>
                  </div>
                  <div className="mt-0.5 font-display font-mono-num text-lg font-bold text-sky-300">
                    {survivalFormatted}
                  </div>
                </div>

                <div className="border border-white/10 bg-[#171c27] px-3 py-2.5">
                  <div className="text-[11px] text-slate-400">Daño total</div>
                  <div className="mt-0.5 font-display font-mono-num text-lg font-bold text-orange-300">
                    {damageFormatted}
                  </div>
                </div>

                <div className="border border-white/10 bg-[#171c27] px-3 py-2.5">
                  <div className="text-[11px] text-slate-400">Precisión</div>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="font-display font-mono-num text-lg font-bold text-white">
                      {accuracy}%
                    </span>
                    <span className="font-mono-num text-[10px] text-slate-400">
                      {hud.shotsHit}/{hud.shotsFired}
                    </span>
                  </div>
                </div>

                <div className="border border-white/10 bg-[#171c27] px-3 py-2.5">
                  <div className="text-[11px] text-slate-400">
                    {hud.mapId === 'duel' ? 'Construcciones' : 'Cabeza · Botiquines'}
                  </div>
                  <div className="mt-0.5 font-display font-mono-num text-lg font-bold text-emerald-300">
                    {hud.mapId === 'duel'
                      ? `${hud.build.buildsPlaced} / ${hud.build.editsMade} ed.`
                      : `${hud.headshots} · ${hud.medkitsUsed}`}
                  </div>
                </div>
              </div>

              {/* Rank Subtitle + Upgrades Strip */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-[#0e121a] px-3.5 py-2.5 text-xs">
                <div>
                  <span className="text-slate-400">Clasificación: </span>
                  <span className="font-semibold text-amber-300">{rankInfo.label}</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Skin: {SKIN_CATALOG.find((s) => s.id === hud.skinId)?.name ?? 'Soldado'}
                </span>
              </div>

              {hud.tentShop.ownedIds.length > 0 && (
                <div className="mt-3 border border-amber-500/25 bg-[#151822] px-3.5 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Mejoras equipadas ({hud.tentShop.ownedIds.length})
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {hud.tentShop.ownedIds.map((id) => (
                      <span
                        key={id}
                        className="border border-white/12 bg-[#1c2130] px-2 py-0.5 text-[11px] text-slate-200"
                      >
                        {UPGRADE_CATALOG[id].name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={onResetRange}
                  className="w-full bg-amber-500 px-5 py-3 font-display text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
                >
                  Reintentar {mapDisplayName(hud.mapId)}
                </button>
                {hud.horde.victory && hud.mapId === 'city' && (
                  <button
                    type="button"
                    onClick={() => onLaunchMap('desert')}
                    className="w-full border border-orange-400/50 bg-[#221c15] px-5 py-2.5 text-sm font-semibold text-orange-300 hover:bg-[#2d241b] transition-colors cursor-pointer"
                  >
                    Ir a Desierto Arsanal
                  </button>
                )}
                {hud.horde.victory && hud.mapId === 'desert' && (
                  <button
                    type="button"
                    onClick={() => onLaunchMap('cubes')}
                    className="w-full border border-emerald-400/50 bg-[#152018] px-5 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-[#1c2b20] transition-colors cursor-pointer"
                  >
                    Ir a Mundo de Cubos
                  </button>
                )}
                {hud.horde.victory && hud.mapId === 'cubes' && (
                  <button
                    type="button"
                    onClick={() => onLaunchMap('pixel')}
                    className="w-full border border-sky-400/50 bg-[#122036] px-5 py-2.5 text-sm font-semibold text-sky-300 hover:bg-[#192d4b] transition-colors cursor-pointer"
                  >
                    Ir a Mundo Pixel
                  </button>
                )}
                {hud.horde.victory && hud.mapId === 'pixel' && (
                  <button
                    type="button"
                    onClick={() => onLaunchMap('pueblo')}
                    className="w-full border border-rose-400/50 bg-[#261218] px-5 py-2.5 text-sm font-semibold text-rose-200 hover:bg-[#351921] transition-colors cursor-pointer"
                  >
                    Ir a Pueblo Desconocido
                  </button>
                )}
                {hud.horde.victory && hud.mapId === 'pueblo' && (
                  <button
                    type="button"
                    onClick={() => onLaunchMap('backrooms')}
                    className="w-full border border-yellow-400/50 bg-[#221f12] px-5 py-2.5 text-sm font-semibold text-yellow-200 hover:bg-[#2f2b18] transition-colors cursor-pointer"
                  >
                    Probar Nextbox Sandbox
                  </button>
                )}
                {hud.horde.victory && hud.mapId === 'nightcamp' && (
                  <button
                    type="button"
                    onClick={() => onLaunchMap('city')}
                    className="w-full border border-red-400/50 bg-[#261215] px-5 py-2.5 text-sm font-semibold text-red-200 hover:bg-[#35191d] transition-colors cursor-pointer"
                  >
                    Ir a Ciudad Abandonada
                  </button>
                )}
                <button
                  type="button"
                  onClick={onReturnToMainMenu}
                  className="w-full border border-white/15 bg-[#1a1f29] px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-[#242b38] transition-colors cursor-pointer"
                >
                  Menú principal
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pause Overlay (when pointer unlocked while playing, alive, tent shop closed, and chest closed) */}
      {!hud.isLocked &&
        !hud.isGameOver &&
        !hud.horde.victory &&
        !hud.tentShop.open &&
        !hud.chestCeremony.active && (
        <div className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center bg-[#0d1015]/78 p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-md border border-white/15 bg-[#141820] p-6 sm:p-7 shadow-2xl my-auto">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-white">
                  Shell Stroukout · Pausa
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {hud.mapId === 'tutorial'
                    ? 'Campo de Entrenamiento con el Coronel Plumaje'
                    : hud.mapId === 'backrooms'
                    ? 'Nextbox Sandbox · Backrooms Nivel 0'
                    : hud.mapId === 'duel'
                    ? 'Sala de Espera 1v1 · Votación de Modo'
                    : hud.mapId === 'nightcamp'
                    ? 'Campamento nocturno · Horda Única (Extrema)'
                    : `${mapDisplayName(hud.mapId)} · Horda ${hud.horde.wave} de ${hud.horde.maxWaves}`}
                </p>
              </div>
              <Crosshair className="h-6 w-6 text-amber-400 shrink-0" />
            </div>

            {hud.multiplayer.inRoom && (
              <div className="mt-4 flex items-center justify-between gap-2 border border-sky-500/35 bg-sky-950/35 px-3 py-2 text-xs">
                <div>
                  <span className="text-sky-300 font-semibold">
                    Sala {hud.multiplayer.roomId}
                  </span>
                  <span className="text-slate-300">
                    {' '}
                    · {1 + hud.multiplayer.peers.length} jugador(es)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onLeaveRoom}
                  className="border border-red-400/40 bg-red-950/50 px-2.5 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-900/60 cursor-pointer"
                >
                  Salir sala
                </button>
              </div>
            )}

            {!isMobile && (
              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-2 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Moverse</span>
                  <span className="font-mono-num font-semibold text-white">WASD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Disparar</span>
                  <span className="font-mono-num font-semibold text-white">Clic Izq.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Apuntar (ADS)</span>
                  <span className="font-mono-num font-semibold text-white">Clic Der.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Armas / Recarga</span>
                  <span className="font-mono-num font-semibold text-white">
                    {hud.unlockedWeapons.includes('chainsaw')
                      ? '1-6 / R'
                      : hud.mapId === 'nightcamp'
                      ? '1-5 / R'
                      : hud.unlockedWeapons.includes('rocket')
                      ? '1-4 / R'
                      : '1-3 / R'}
                  </span>
                </div>
                {hud.build.enabled ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Construir (Esc / Suelo / Rampa / Pared)</span>
                      <span className="font-mono-num font-semibold text-sky-300">C / X / Z / V</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Editar (mantener)</span>
                      <span className="font-mono-num font-semibold text-sky-400">G + Clic</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bot 1v1 / Limpiar</span>
                      <span className="font-mono-num font-semibold text-emerald-300">B / K</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Granada (mantener)</span>
                      <span className="font-mono-num font-semibold text-amber-400">G</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Inspeccionar arma</span>
                      <span className="font-mono-num font-semibold text-white">F</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Saltar / Esprint</span>
                      <span className="font-mono-num font-semibold text-white">Espacio / Shift</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Dash lateral</span>
                      <span className="font-mono-num font-semibold text-sky-400">Ctrl</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Agacharse</span>
                      <span className="font-mono-num font-semibold text-white">C</span>
                    </div>
                    {hud.unlockedWeapons.includes('sniper') && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Zoom Francotirador</span>
                        <span className="font-mono-num font-semibold text-sky-400">Rueda / Z</span>
                      </div>
                    )}
                    {(hud.petUnlocked || hud.mapId === 'pueblo') && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Mover Capitán Pollo</span>
                        <span className="font-mono-num font-semibold text-yellow-300">V</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onResume}
                className="w-full bg-amber-500 px-5 py-3 font-display text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
              >
                Reanudar partida
              </button>

              {hud.mapId === 'duel' && hud.multiplayer.vote?.phase === 'waiting' && (
                <div className="border border-sky-400/40 bg-[#0d1726] p-3.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-display font-bold text-sky-300">
                      Votar próximo modo (Sala de espera)
                    </span>
                    <span className="font-mono-num text-[11px] text-amber-300">
                      {hud.multiplayer.vote.secondsRemaining !== null
                        ? `${hud.multiplayer.vote.secondsRemaining}s`
                        : 'Esperando'}
                    </span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                    {(
                      hud.multiplayer.vote.voteableMaps?.length
                        ? hud.multiplayer.vote.voteableMaps
                        : (['city', 'desert', 'cubes', 'pixel', 'pueblo', 'backrooms'] as MapId[])
                    ).map((mId) => {
                      const votes = hud.multiplayer.vote?.votesByMap[mId] ?? 0;
                      const isMine = hud.multiplayer.vote?.myVote === mId;
                      const isLeading = hud.multiplayer.vote?.winningMapId === mId;
                      return (
                        <button
                          key={mId}
                          type="button"
                          onClick={() => onVoteMap?.(mId)}
                          className={`flex items-center justify-between gap-2 border px-2.5 py-2 text-left text-[11px] font-semibold transition-colors cursor-pointer ${
                            isMine
                              ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                              : isLeading
                              ? 'border-sky-400/60 bg-sky-500/15 text-sky-100'
                              : 'border-white/12 bg-[#131b29] text-slate-200 hover:bg-[#1a2538]'
                          }`}
                        >
                          <span className="truncate">{mapDisplayName(mId)}</span>
                          <span className="shrink-0 font-mono-num text-[10px] font-bold text-amber-300">
                            {votes}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {hud.multiplayer.isHost && (
                    <button
                      type="button"
                      onClick={() => onStartVotedMatch?.()}
                      className="mt-2.5 w-full bg-sky-500 px-3 py-2 font-display text-xs font-bold text-slate-950 hover:bg-sky-400 transition-colors cursor-pointer"
                    >
                      Iniciar modo más votado ({mapDisplayName(hud.multiplayer.vote.winningMapId)})
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                {hud.mapId !== 'duel' && (
                  <button
                    type="button"
                    onClick={() => onLaunchMap('duel')}
                    className="border border-sky-400/45 bg-[#122036] px-3 py-2.5 text-xs font-semibold text-sky-200 hover:bg-[#192d4b] transition-colors cursor-pointer"
                  >
                    Arena 1v1 (Construir)
                  </button>
                )}
                {hud.mapId !== 'city' && (
                  <button
                    type="button"
                    onClick={() => onLaunchMap('city')}
                    className="border border-white/15 bg-[#1d222d] px-3 py-2.5 text-xs font-medium text-slate-100 hover:bg-[#272e3d] transition-colors cursor-pointer"
                  >
                    Ciudad Abandonada
                  </button>
                )}
                {hud.mapId !== 'desert' && (
                  <button
                    type="button"
                    onClick={() => onLaunchMap('desert')}
                    className="border border-orange-400/35 bg-[#221d16] px-3 py-2.5 text-xs font-medium text-orange-200 hover:bg-[#2d261c] transition-colors cursor-pointer"
                  >
                    Desierto Arsanal
                  </button>
                )}
                {hud.mapId !== 'cubes' && (
                  <button
                    type="button"
                    onClick={() => onLaunchMap('cubes')}
                    className="border border-emerald-400/35 bg-[#162218] px-3 py-2.5 text-xs font-medium text-emerald-200 hover:bg-[#1e2e21] transition-colors cursor-pointer"
                  >
                    Mundo de Cubos
                  </button>
                )}
                {hud.mapId !== 'pixel' && (
                  <button
                    type="button"
                    onClick={() => onLaunchMap('pixel')}
                    className="border border-sky-400/40 bg-[#122036] px-3 py-2.5 text-xs font-medium text-sky-200 hover:bg-[#192d4b] transition-colors cursor-pointer"
                  >
                    Mundo Pixel
                  </button>
                )}
                {hud.mapId !== 'pueblo' && (
                  <button
                    type="button"
                    onClick={() => onLaunchMap('pueblo')}
                    className="border border-rose-400/40 bg-[#261218] px-3 py-2.5 text-xs font-medium text-rose-200 hover:bg-[#351921] transition-colors cursor-pointer"
                  >
                    Pueblo Desconocido
                  </button>
                )}
                {hud.mapId !== 'backrooms' && (
                  <button
                    type="button"
                    onClick={() => onLaunchMap('backrooms')}
                    className="border border-yellow-400/40 bg-[#221f12] px-3 py-2.5 text-xs font-medium text-yellow-200 hover:bg-[#2e2917] transition-colors cursor-pointer"
                  >
                    Nextbox Sandbox
                  </button>
                )}
                {hud.mapId !== 'tutorial' && (
                  <button
                    type="button"
                    onClick={() => onLaunchMap('tutorial')}
                    className="border border-white/15 bg-[#1d222d] px-3 py-2.5 text-xs font-medium text-slate-100 hover:bg-[#272e3d] transition-colors cursor-pointer"
                  >
                    Tutorial
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setOptionsReturnTarget('playing');
                    onSetUiState('options');
                  }}
                  className="border border-white/15 bg-[#1a1f29] px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-[#242b38] transition-colors cursor-pointer"
                >
                  Opciones
                </button>
                <button
                  type="button"
                  onClick={onReturnToMainMenu}
                  className="border border-white/15 bg-[#1a1f29] px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-[#242b38] transition-colors cursor-pointer"
                >
                  Menú principal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
