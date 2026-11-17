export type WeaponId =
  | 'pistol'
  | 'rifle'
  | 'sniper'
  | 'shotgun'
  | 'rocket'
  | 'chicken_combo'
  | 'chainsaw';

export type MapId =
  | 'tutorial'
  | 'city'
  | 'desert'
  | 'cubes'
  | 'pixel'
  | 'backrooms'
  | 'pueblo'
  | 'duel'
  | 'nightcamp';

export type CharacterSkinId =
  | 'soldier'
  | 'astronaut'
  | 'detective'
  | 'chicken'
  | 'knight'
  | 'banana_duck'
  | 'toaster';

export type BuildPieceType = 'stairs' | 'floor' | 'ramp' | 'wall';

export interface BuildPieceNetState {
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

export type CompanionSide = 'front' | 'left' | 'right';

export type GameScreen = 'menu' | 'options' | 'playing' | 'paused';

export type MobileControlMode = 'auto' | 'on' | 'off';

export interface GameOptions {
  sensitivity: number;
  muted: boolean;
  fov: number;
  invertY: boolean;
  mobileControls: MobileControlMode;
  skinId: CharacterSkinId;
}

export interface WeaponSpec {
  id: WeaponId;
  slot: 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  category: string;
  fireMode: 'semi' | 'auto';
  fireRateMs: number;
  damageBody: number;
  damageHead: number;
  pellets: number;
  spreadHip: number;
  spreadAds: number;
  magazineSize: number;
  reloadTimeSec: number;
  recoilKickY: number;
  recoilKickZ: number;
  cameraKickPitch: number;
  adsFov: number;
  hipPosition: [number, number, number];
  adsPosition: [number, number, number];
  muzzleColor: number;
}

export interface EnemyHudTarget {
  id: string;
  label: string;
  hp: number;
  maxHp: number;
  distance: number;
  screenX: number;
  screenY: number;
  visible: boolean;
  isMiniBoss?: boolean;
}

export type TutorialStepId = 'move' | 'static_targets' | 'moving_targets' | 'weapon_reload' | 'complete';

export interface TutorialHudState {
  active: boolean;
  step: TutorialStepId;
  title: string;
  speakerName: string;
  dialogue: string;
  progress: number;
  goal: number;
  completed: boolean;
}

export interface HordeHudState {
  active: boolean;
  wave: number;
  maxWaves: number;
  defeatedInWave: number;
  totalInWave: number;
  intermissionSec: number;
  bossActive: boolean;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  miniBossActive?: boolean;
  miniBossName?: string;
  miniBossHp?: number;
  miniBossMaxHp?: number;
  victory: boolean;
}

export interface GrenadeWorldMarker {
  id: number;
  fuseRemaining: number;
  fuseMax: number;
  screenX: number;
  screenY: number;
  visible: boolean;
  owner: 'player' | 'enemy' | 'pet';
  label?: string;
}

export interface GrenadeHudState {
  count: number;
  maxCount: number;
  isAiming: boolean;
  heldFuseSec: number;
  maxFuseSec: number;
  blastRadius: number;
  activeMarkers: GrenadeWorldMarker[];
}

export interface BuildHudState {
  enabled: boolean;
  activePiece: BuildPieceType | null;
  isEditing: boolean;
  editPieceType: BuildPieceType | null;
  editMask: boolean[];
  hoveredTileIndex: number | null;
  pieceCount: number;
  buildsPlaced: number;
  editsMade: number;
  sparringBotEnabled: boolean;
}

export type UpgradeCategory = 'weapon' | 'skill';

export type UpgradeId =
  | 'ap_ammo'
  | 'extended_mags'
  | 'thermobaric_grenades'
  | 'stabilized_barrel'
  | 'hollow_point'
  | 'steady_grip'
  | 'cluster_grenades'
  | 'tactical_boots'
  | 'reinforced_armor'
  | 'combat_vampirism'
  | 'rapid_dash'
  | 'regen_serum';

export interface UpgradeOption {
  id: UpgradeId;
  category: UpgradeCategory;
  name: string;
  subtitle: string;
  description: string;
  bonusLabel: string;
}

export interface TentShopState {
  open: boolean;
  wave: number;
  greeting: string;
  options: UpgradeOption[];
  ownedIds: UpgradeId[];
}

export type ChestStage = 'idle' | 'waiting_click' | 'opening' | 'revealed';

export type ChestRewardKind = 'rocket' | 'pet' | 'sniper' | 'cubes_bundle' | 'chainsaw';

export interface ChestCeremonyState {
  active: boolean;
  stage: ChestStage;
  progress: number;
  rewardKind: ChestRewardKind;
}

export interface MultiplayerRoomSummary {
  roomId: string;
  mapId: MapId;
  hostName: string;
  playerCount: number;
  wave: number;
}

export interface RemotePlayerNetState {
  id: string;
  name: string;
  skinId?: CharacterSkinId;
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

export interface VoteHudState {
  phase: 'waiting' | 'playing';
  votesByMap: Partial<Record<MapId, number>>;
  myVote: MapId | null;
  winningMapId: MapId;
  secondsRemaining: number | null;
  voteableMaps: MapId[];
}

export interface MultiplayerHudState {
  connected: boolean;
  inRoom: boolean;
  roomId: string | null;
  playerId: string | null;
  playerName: string;
  isHost: boolean;
  peers: RemotePlayerNetState[];
  rooms: MultiplayerRoomSummary[];
  error: string | null;
  vote?: VoteHudState;
}

export interface HudSnapshot {
  mapId: MapId;
  isLocked: boolean;
  hasStarted: boolean;
  isGameOver: boolean;
  isSprinting: boolean;
  isCrouching: boolean;
  isDashing: boolean;
  dashCooldown: number;
  dashCooldownMax: number;
  isAds: boolean;
  sniperZoom: 4 | 8;
  isReloading: boolean;
  reloadProgress: number;
  health: number;
  maxHealth: number;
  damageFlash: number;
  activeWeaponId: WeaponId;
  unlockedWeapons: WeaponId[];
  petUnlocked: boolean;
  ammoByWeapon: Record<WeaponId, number>;
  maxAmmoByWeapon: Record<WeaponId, number>;
  kills: number;
  shotsFired: number;
  shotsHit: number;
  headshots: number;
  survivalTimeSec: number;
  damageDealt: number;
  medkitsUsed: number;
  activeMedkits: number;
  medkitNotice: string | null;
  skinId: CharacterSkinId;
  aliveEnemies: number;
  totalEnemies: number;
  spreadPixels: number;
  hitmarkerType: 'none' | 'body' | 'head' | 'kill';
  lastEliminationName: string | null;
  multiKillBanner: string | null;
  activeTarget: EnemyHudTarget | null;
  tutorial: TutorialHudState;
  horde: HordeHudState;
  grenade: GrenadeHudState;
  build: BuildHudState;
  tentShop: TentShopState;
  chestCeremony: ChestCeremonyState;
  multiplayer: MultiplayerHudState;
  nextbotAlert?: string | null;
  companionSide?: CompanionSide;
}

export interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxY: number;
}
