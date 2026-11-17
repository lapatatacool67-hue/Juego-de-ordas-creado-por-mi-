import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { SoundEngine } from './audio';
import {
  BUILD_MAX_HP,
  BuildingManager,
  getDefaultEditMask,
} from './building';
import { createChickenInstructor, type ChickenNpcHandle } from './chickenNpc';
import { EnemyFactory, type ActiveEnemy, type NextbotKind, type RobloxPuebloVariant } from './enemies';
import {
  createAbandonedCityMap,
  createBackroomsMap,
  createCubeWorldMap,
  createDesertArsanalMap,
  createDuel1v1Map,
  createNightCampMap,
  createPixelWorldMap,
  createPuebloDesconocidoMap,
} from './map';
import {
  createNightForestMenuScene,
  type DeployBoardAction,
  type DeployBoardButton,
  type DeployBoardPage,
} from './menuForest';
import { MultiplayerClient } from './multiplayerClient';
import { createTutorialRangeMap, type RangeTarget } from './tutorialMap';
import type {
  BoxCollider,
  BuildPieceType,
  CharacterSkinId,
  ChestCeremonyState,
  ChestRewardKind,
  ChestStage,
  CompanionSide,
  EnemyHudTarget,
  GameOptions,
  GrenadeHudState,
  GrenadeWorldMarker,
  HordeHudState,
  HudSnapshot,
  MapId,
  MultiplayerHudState,
  TentShopState,
  TutorialHudState,
  TutorialStepId,
  UpgradeId,
  UpgradeOption,
  WeaponId,
} from './types';
import { CORONEL_TENT_GREETINGS, pickTentUpgradeOptions, UPGRADE_CATALOG } from './upgrades';
import {
  applySkinToWeaponModels,
  buildAllWeaponModels,
  createBoomerangMesh,
  createCaptainPolloMesh,
  createExplosiveTireMesh,
  createGrenadeModel,
  createMedkitMesh,
  createRemotePlayerAvatar,
  createRewardChestModel,
  createRocketProjectileMesh,
  createStandaloneChainsawMesh,
  createStandaloneRocketLauncherMesh,
  createStandaloneSniperMesh,
  WEAPON_ORDER,
  WEAPON_SPECS,
  type BuiltGrenadeMesh,
  type BuiltRocketProjectile,
  type BuiltWeaponModel,
  type CaptainPolloHandle,
  type MedkitPickupMesh,
  type RemotePlayerAvatarHandle,
  type RewardChestModel,
} from './weapons';

// Module-scope reusable math helpers (Zero GC in render loop)
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _muzzleWorld = new THREE.Vector3();
const _ejectWorld = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _tracerMid = new THREE.Vector3();
const _enemyAimOrigin = new THREE.Vector3();
const _enemyMuzzleWorld = new THREE.Vector3();
const _enemyShotTarget = new THREE.Vector3();
const _enemyShotDir = new THREE.Vector3();
const _enemyClosestPt = new THREE.Vector3();
const _arcPos = new THREE.Vector3();
const _arcVel = new THREE.Vector3();
const _arcDummy = new THREE.Object3D();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _boardNdc = new THREE.Vector2();

const TRAJECTORY_BEAD_COUNT = 18;
const GRENADE_GRAVITY = 16.5;
const GRENADE_THROW_SPEED = 16.2;
const GRENADE_THROW_LIFT = 4.4;
const BASE_GRENADE_FUSE = 2.2;
const BASE_GRENADE_RADIUS = 5.6;

interface TracerEffect {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

interface SparkEffect {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface SmokePuff {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface ShellCasing {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  life: number;
}

interface ActiveGrenade {
  id: number;
  model: BuiltGrenadeMesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  fuseRemaining: number;
  fuseMax: number;
  bounceCooldown: number;
  owner: 'player' | 'enemy' | 'pet';
  visualType: 'frag' | 'tire';
  damageScale: number;
}

interface ExplosionEffect {
  coreMesh: THREE.Mesh;
  ringMesh: THREE.Mesh;
  light: THREE.PointLight;
  life: number;
  maxLife: number;
  maxRadius: number;
}

interface ActiveRocket {
  model: BuiltRocketProjectile;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  smokeAccum: number;
  noSelfDamage?: boolean;
}

interface ActiveBoomerang {
  mesh: { root: THREE.Group; dispose: () => void };
  startPos: THREE.Vector3;
  apexPos: THREE.Vector3;
  sideVec: THREE.Vector3;
  arcWidth: number;
  ownerEnemy: ActiveEnemy;
  age: number;
  duration: number;
  hitPlayer: boolean;
  damage: number;
}

export interface BoardButtonHoverInfo {
  action: DeployBoardAction;
  title: string;
  description: string;
}

export interface FpsEngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onContextLost: (lost: boolean) => void;
  onRequestCityDeploy: () => void;
  onRequestDeployMapFromBoard?: (mapId: MapId) => void;
  onRequestBackToMenuFromBoard?: () => void;
  onBoardHoverChange?: (info: BoardButtonHoverInfo | null) => void;
  onMultiplayerMapSync?: (mapId: MapId) => void;
  onReady?: () => void;
}

interface WaveConfig {
  totalInWave: number;
  maxAlive: number;
  spawnInterval: number;
}

const UNLOCKED_WEAPONS_STORAGE_KEY = 'shell_stroukout_unlocked_weapons';
const UNLOCKED_PET_STORAGE_KEY = 'shell_stroukout_unlocked_pet';
const SKIN_STORAGE_KEY = 'shell_stroukout_skin';

interface ActiveMedkit {
  id: number;
  mesh: MedkitPickupMesh;
  x: number;
  y: number;
  z: number;
  phase: number;
}

const WAVE_CONFIGS_CITY: Record<number, WaveConfig> = {
  1: { totalInWave: 8, maxAlive: 4, spawnInterval: 1.65 },
  2: { totalInWave: 11, maxAlive: 5, spawnInterval: 1.45 },
  3: { totalInWave: 14, maxAlive: 6, spawnInterval: 1.32 },
  4: { totalInWave: 17, maxAlive: 7, spawnInterval: 1.18 },
  5: { totalInWave: 16, maxAlive: 7, spawnInterval: 1.22 }, // 1 Tank Boss + Mini-Bosses + Armed Zombies
};

const WAVE_CONFIGS_DESERT: Record<number, WaveConfig> = {
  1: { totalInWave: 8, maxAlive: 4, spawnInterval: 1.7 },
  2: { totalInWave: 11, maxAlive: 5, spawnInterval: 1.45 },
  3: { totalInWave: 14, maxAlive: 6, spawnInterval: 1.34 },
  4: { totalInWave: 16, maxAlive: 7, spawnInterval: 1.2 },
  5: { totalInWave: 15, maxAlive: 6, spawnInterval: 1.25 }, // 1 Giant Red Robot Boss + Mini-Bosses + Blue Bots
};

const WAVE_CONFIGS_CUBES: Record<number, WaveConfig> = {
  1: { totalInWave: 8, maxAlive: 4, spawnInterval: 1.75 },
  2: { totalInWave: 11, maxAlive: 5, spawnInterval: 1.5 },
  3: { totalInWave: 14, maxAlive: 6, spawnInterval: 1.35 },
  4: { totalInWave: 16, maxAlive: 7, spawnInterval: 1.22 },
  5: { totalInWave: 15, maxAlive: 6, spawnInterval: 1.28 }, // 1 Titan Truck Boss + Mini-Bosses + Transformer Trucks
};

const WAVE_CONFIGS_PIXEL: Record<number, WaveConfig> = {
  1: { totalInWave: 10, maxAlive: 5, spawnInterval: 1.3 },
  2: { totalInWave: 14, maxAlive: 6, spawnInterval: 1.12 },
  3: { totalInWave: 17, maxAlive: 7, spawnInterval: 1.02 },
  4: { totalInWave: 20, maxAlive: 8, spawnInterval: 0.92 },
  5: { totalInWave: 18, maxAlive: 8, spawnInterval: 0.98 }, // 1 King Koopa Boss + Mini-Bosses + Winged Koopas
};

const WAVE_CONFIGS_PUEBLO: Record<number, WaveConfig> = {
  1: { totalInWave: 9, maxAlive: 5, spawnInterval: 1.25 },
  2: { totalInWave: 13, maxAlive: 6, spawnInterval: 1.08 },
  3: { totalInWave: 16, maxAlive: 7, spawnInterval: 0.98 },
  4: { totalInWave: 19, maxAlive: 8, spawnInterval: 0.9 },
  5: { totalInWave: 20, maxAlive: 8, spawnInterval: 0.88 }, // 1 Alcalde Boss + 3 Mini-Bosses + Roblox NPCs
};

const CITY_SPAWN_LANES: Array<[number, number]> = [
  [-6.4, -46],
  [6.4, -46],
  [-3.2, -52],
  [3.4, -52],
  [0.0, -44],
  [-7.2, -38],
  [7.2, -38],
];

const DESERT_SPAWN_LANES: Array<[number, number]> = [
  [-12.0, -52],
  [12.0, -52],
  [-5.5, -56],
  [5.5, -56],
  [0.0, -48],
  [-14.5, -36],
  [14.5, -36],
];

const CUBES_SPAWN_LANES: Array<[number, number]> = [
  [-8.0, -52],
  [8.0, -52],
  [-4.2, -56],
  [4.2, -56],
  [0.0, -48],
  [-8.5, -36],
  [8.5, -36],
];

const PIXEL_SPAWN_LANES: Array<[number, number]> = [
  [-8.0, -52],
  [8.0, -52],
  [-4.2, -56],
  [4.2, -56],
  [0.0, -48],
  [-8.5, -36],
  [8.5, -36],
];

const PUEBLO_SPAWN_LANES: Array<[number, number]> = [
  [-5.2, -46],
  [5.2, -46],
  [-2.4, -54],
  [2.4, -54],
  [0.0, -42],
  [-8.0, -32],
  [8.0, -32],
];

const BACKROOMS_SPAWN_LANES: Array<[number, number]> = [
  [-19.5, -18.5],
  [19.5, -18.5],
  [0.0, -33.0],
  [-38.0, -34.0],
  [38.0, -34.0],
  [-50.0, -50.0],
  [50.0, -50.0],
  [0.0, -54.0],
  [-46.0, 0.0],
  [46.0, 0.0],
  [-38.0, 32.0],
  [38.0, 32.0],
  [-52.0, 48.0],
  [52.0, 48.0],
  [0.0, 50.0],
  [0.0, -10.0],
];

const NEXTBOT_POOL: NextbotKind[] = ['bob_esponja', 'en_este_pueblo', 'among_us'];

const TUTORIAL_LINES: Record<TutorialStepId, { title: string; dialogue: string; goal: number }> = {
  move: {
    title: 'Lección 1 · Desplazamiento',
    dialogue:
      '¡Buenos días, recluta! Soy el Coronel Plumaje. Usa WASD para caminar por la línea de tiro y Espacio para saltar.',
    goal: 1,
  },
  static_targets: {
    title: 'Lección 2 · Puntería básica',
    dialogue:
      '¡Excelente porte! Ahora apunta con el ratón y pulsa Clic Izquierdo para acertar a 3 dianas fijas.',
    goal: 3,
  },
  moving_targets: {
    title: 'Lección 3 · Dianas móviles',
    dialogue:
      '¡Magnífico! Mantén Clic Derecho para apuntar fino (ADS) y acierta a 3 dianas en movimiento.',
    goal: 3,
  },
  weapon_reload: {
    title: 'Lección 4 · Arsenal y recarga',
    dialogue:
      'Un caballero domina todo su equipo. Pulsa 1, 2 o 3 para cambiar de arma, R para recargar y G para lanzar granadas.',
    goal: 2,
  },
  complete: {
    title: 'Entrenamiento completado',
    dialogue:
      '¡Impecable puntería! Visita mi carpa en la Ciudad Abandonada para equipar mejoras cada horda. Pulsa Enter para desplegarte.',
    goal: 1,
  },
};

function normalizeAngleDiff(target: number, current: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export class FpsEngine {
  private container: HTMLElement;
  private callbacks: FpsEngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private scene: THREE.Scene;
  private worldGroup = new THREE.Group();
  private camera: THREE.PerspectiveCamera;
  private sound = new SoundEngine();
  private enemyFactory = new EnemyFactory();
  private isSoftwareGl: boolean;

  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();
  private elapsed = 0;

  // Current Map State
  private currentMapId: MapId = 'city';
  private isMenuForestActive = true;
  private menuCameraPreset: 'campfire' | 'deploy_board' = 'campfire';
  private menuCamPos = new THREE.Vector3(-0.35, 1.38, 3.35);
  private menuCamLook = new THREE.Vector3(0.92, 0.58, -0.32);
  private menuForestUpdate: ((delta: number, elapsed: number) => void) | null = null;
  private menuDeployButtons: DeployBoardButton[] = [];
  private menuCaptainPolloMeshes: THREE.Object3D[] = [];
  private triggerMenuPolloHop: (() => void) | null = null;
  private titlePolloClicks = 0;
  private setMenuBoardHover: ((action: DeployBoardAction | null) => void) | null = null;
  private setMenuBoardPage: ((page: DeployBoardPage) => void) | null = null;
  private lastHoveredBoardAction: DeployBoardAction | null = null;
  private colliders: BoxCollider[] = [];
  private obstacles: THREE.Mesh[] = [];
  private enemies: ActiveEnemy[] = [];
  private enemyHitboxes: THREE.Mesh[] = [];
  private targets: RangeTarget[] = [];
  private targetHitboxes: THREE.Mesh[] = [];
  private updateTutorialTargets: ((delta: number, elapsed: number) => void) | null = null;
  private chickenNpc: ChickenNpcHandle | null = null;
  private flickerLight: THREE.PointLight | null = null;
  private flickerBulbMat: THREE.MeshStandardMaterial | null = null;
  private fireLights: THREE.PointLight[] = [];
  private fireMeshes: THREE.Mesh[] = [];
  private dustParticles: THREE.Points | null = null;
  private disposeMap: () => void = () => {};
  private envRT: THREE.WebGLRenderTarget | null = null;
  private hemiLight: THREE.HemisphereLight;
  private sunLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;

  // Horde / Wave Director State
  private readonly maxWaves = 5;
  private hordeWave = 1;
  private hordeSpawnedInWave = 0;
  private hordeDefeatedInWave = 0;
  private hordeTotalInWave = WAVE_CONFIGS_CITY[1].totalInWave;
  private hordeMaxAlive = WAVE_CONFIGS_CITY[1].maxAlive;
  private hordeSpawnInterval = WAVE_CONFIGS_CITY[1].spawnInterval;
  private hordeSpawnTimer = 0.8;
  private hordeIntermissionTimer = 0;
  private hordeBossSpawnedForWave = false;
  private hordeMiniBossesSpawnedInWave = 0;
  private hordeMiniBossTargetForWave = 0;
  private nextbotSpawnCount = 0;
  private hordeVictory = false;
  private spawnLaneIndex = 0;

  // Interactive Chest Unlock Ceremony (Ciudad -> Rocket Launcher, Mundo de Cubos -> Capitán Pollo)
  private chestActive = false;
  private chestStage: ChestStage = 'idle';
  private chestRewardKind: ChestRewardKind = 'rocket';
  private chestTimer = 0;
  private rewardChest: RewardChestModel | null = null;
  private rewardRocketMesh: { root: THREE.Group; dispose: () => void } | null = null;
  private rewardSniperMesh: { root: THREE.Group; dispose: () => void } | null = null;
  private rewardChainsawMesh: { root: THREE.Group; dispose: () => void } | null = null;
  private rewardPetMesh: CaptainPolloHandle | null = null;
  private chestLookTarget = new THREE.Vector3();

  // Companion Pet: Capitán Pollo
  private petUnlocked = this.loadPetUnlocked();
  private captainPollo: CaptainPolloHandle | null = null;
  private petGrenadeCooldown = 4.2;
  private companionSide: CompanionSide = 'front';

  // Mobile Touch Control State
  private mobileMode = false;
  private virtualMoveX = 0;
  private virtualMoveY = 0;
  private virtualShootDown = false;

  // Local WebSocket Multiplayer
  private mpClient: MultiplayerClient;
  private mpState: MultiplayerHudState;
  private remoteAvatars = new Map<string, RemotePlayerAvatarHandle>();
  private netSyncAccum = 0;
  private hordeSyncAccum = 0;

  // Skin customization
  private skinId: CharacterSkinId = this.loadSavedSkin();

  // Random Medkits (every 10s)
  private activeMedkits: ActiveMedkit[] = [];
  private medkitIdCounter = 0;
  private medkitSpawnTimer = 10.0;
  private medkitsUsed = 0;
  private medkitNotice: string | null = null;
  private medkitNoticeTimer = 0;

  // 1v1 Building & Blue-Grid Editing
  private buildingManager: BuildingManager;
  private activeBuildPiece: BuildPieceType | null = null;
  private isEditingBuild = false;
  private editPaintTarget: boolean | null = null;
  private hoveredEditTile = -1;
  private buildsPlaced = 0;
  private editsMade = 0;
  private duelBotEnabled = true;
  private duelBotRespawnTimer = 0;
  private duelBuildIdCounter = 0;

  // Coronel Plumaje's Tent Shop & Upgrades State
  private tentShopOpen = false;
  private ownedUpgrades: UpgradeId[] = [];
  private currentShopOptions: UpgradeOption[] = [];
  private damageMul = 1;
  private headshotMul = 1;
  private fireRateMul = 1;
  private recoilMul = 1;
  private spreadMul = 1;
  private reloadSpeedMul = 1;
  private magBonusMul = 1;
  private speedMul = 1;
  private jumpMul = 1;
  private dashCooldownMul = 1;
  private dashPowerMul = 1;
  private regenPerSec = 0;
  private timeSinceDamaged = 0;
  private vampirismHeal = 0;
  private grenadeDamageMul = 1;
  private grenadeRadiusMul = 1;
  private grenadeStunSec = 0;

  // Tutorial progression
  private tutorialStep: TutorialStepId = 'move';
  private tutorialProgress = 0;
  private tutorialMoveDist = 0;
  private tutorialSwitchedWeapon = false;
  private tutorialReloaded = false;

  // Viewmodel & weapons
  private weaponRig = new THREE.Group();
  private weapons: Record<WeaponId, BuiltWeaponModel>;
  private unlockedWeapons: WeaponId[] = this.loadUnlockedWeapons();
  private activeWeaponId: WeaponId = this.unlockedWeapons.includes('sniper') ? 'sniper' : 'rifle';
  private sniperZoom: 4 | 8 = 4;
  private muzzleLight = new THREE.PointLight(0xffb85c, 0, 7, 1.8);
  private muzzleFlashTimer = 0;
  private ammoByWeapon: Record<WeaponId, number> = {
    pistol: WEAPON_SPECS.pistol.magazineSize,
    rifle: WEAPON_SPECS.rifle.magazineSize,
    sniper: WEAPON_SPECS.sniper.magazineSize,
    shotgun: WEAPON_SPECS.shotgun.magazineSize,
    rocket: WEAPON_SPECS.rocket.magazineSize,
    chicken_combo: WEAPON_SPECS.chicken_combo.magazineSize,
    chainsaw: WEAPON_SPECS.chainsaw.magazineSize,
  };
  private chainsawChainPhase = 0;
  private activeRockets: ActiveRocket[] = [];
  private activeBoomerangs: ActiveBoomerang[] = [];

  // Grenade System & Trajectory Preview
  private grenadeCount = 3;
  private maxGrenades = 3;
  private grenadeIdCounter = 0;
  private isAimingGrenade = false;
  private grenadeHoldTime = 0;
  private grenadeThrowDip = 0;
  private handGrenadePreview: BuiltGrenadeMesh;
  private activeGrenades: ActiveGrenade[] = [];
  private explosions: ExplosionEffect[] = [];
  private trajectoryBeads: THREE.InstancedMesh;
  private trajectoryBeadGeo = new THREE.SphereGeometry(0.055, 8, 8);
  private trajectoryBeadMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.9,
  });
  private landingMarkerGroup = new THREE.Group();
  private landingRingMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
  private landingDiscMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  private explosionCoreGeo = new THREE.SphereGeometry(1, 18, 14);
  private explosionRingGeo = new THREE.RingGeometry(0.72, 1.0, 28);

  // Shooting & effects
  private raycaster = new THREE.Raycaster();
  private tracers: TracerEffect[] = [];
  private sparks: SparkEffect[] = [];
  private smokes: SmokePuff[] = [];
  private shells: ShellCasing[] = [];
  private tracerGeo = new THREE.CylinderGeometry(0.007, 0.007, 1, 6);
  private tracerMatPlayer = new THREE.MeshBasicMaterial({
    color: 0xfde68a,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  private tracerMatUpgraded = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
  });
  private tracerMatEnemy = new THREE.MeshBasicMaterial({
    color: 0xff6b4a,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  private tracerMatKoopaLaser = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
  });
  private sparkGeo = new THREE.BoxGeometry(0.038, 0.038, 0.038);
  private sparkMatEnemy = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  private sparkMatMetal = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  private sparkMatConcrete = new THREE.MeshBasicMaterial({ color: 0xd1d5db });
  private sparkMatExplosion = new THREE.MeshBasicMaterial({ color: 0xff9f1c });
  private smokeGeo = new THREE.SphereGeometry(0.045, 7, 7);
  private shellGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.026, 8);
  private shellMatBrass = new THREE.MeshStandardMaterial({
    color: 0xd4a438,
    roughness: 0.25,
    metalness: 0.92,
  });
  private shellMatRed = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.45,
    metalness: 0.25,
  });

  // Player state & options
  private playerPos = new THREE.Vector3(0, 0, 10);
  private playerVel = new THREE.Vector3();
  private eyeHeight = 1.68;
  private yaw = 0;
  private pitch = 0;
  private sensitivity = 0.0022;
  private baseFov = 74;
  private invertY = false;
  private isGrounded = true;
  private wasGrounded = true;
  private isCrouching = false;
  private isSprinting = false;
  private dashActiveTimer = 0;
  private dashCooldownTimer = 0;
  private dashCooldownMax = 1.1;
  private dashDirX = 0;
  private dashDirZ = 0;
  private dashSideSign = 1;
  private dashRollBoost = 0;
  private isAds = false;
  private health = 100;
  private maxHealth = 100;
  private isGameOver = false;
  private damageFlash = 0;
  private cameraShake = 0;

  // Input state
  private keys: Record<string, boolean> = {};
  private isLocked = false;
  private hasStarted = false;
  private mouseDownLeft = false;
  private isDraggingFallback = false;
  private pointerLockFailed = false;

  // Weapon kinematics, sway & micro-animations
  private lastShotTime = 0;
  private isReloading = false;
  private reloadElapsed = 0;
  private recoilOffsetZ = 0;
  private recoilOffsetY = 0;
  private recoilPitch = 0;
  private recoilRoll = 0;
  private movingPartKick = 0;
  private triggerKick = 0;
  private hammerKick = 0;
  private shotgunPumpTimer = 0;
  private sniperBoltTimer = 0;
  private inspectTimer = 0;
  private strafeRoll = 0;
  private dashTilt = 0;
  private jumpLandDip = 0;
  private swayX = 0;
  private swayY = 0;
  private walkBobPhase = 0;
  private stepSoundCooldown = 0;
  private switchDip = 0;

  // Combat telemetry
  private kills = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private headshots = 0;
  private survivalTimeSec = 0;
  private damageDealt = 0;
  private hitmarkerType: 'none' | 'body' | 'head' | 'kill' = 'none';
  private hitmarkerTimer = 0;
  private lastEliminationName: string | null = null;
  private eliminationBannerTimer = 0;
  private multiKillBanner: string | null = null;
  private multiKillTimer = 0;
  private lastDamagedEnemy: ActiveEnemy | null = null;
  private lastDamagedTimer = 0;
  private hudEmitAccum = 0;
  private nextbotSpawnTimer = 1.6;
  private nextbotGrenadeRegenTimer = 0;
  private nextbotAlert: string | null = null;

  // Bound event listeners
  private onResizeBound: () => void;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseUpBound: (e: MouseEvent) => void;
  private onWheelBound: (e: WheelEvent) => void;
  private onContextMenuBound: (e: MouseEvent) => void;
  private onPointerLockChangeBound: () => void;
  private onPointerLockErrorBound: () => void;
  private onContextLostBound: (e: Event) => void;
  private onContextRestoredBound: () => void;
  private onMenuAudioUnlockBound: () => void;

  constructor(container: HTMLElement, callbacks: FpsEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.78;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const fogColor = 0x080e1a;
    this.scene.background = new THREE.Color(fogColor);
    this.scene.fog = new THREE.FogExp2(fogColor, 0.028);
    this.scene.add(this.worldGroup);

    this.camera = new THREE.PerspectiveCamera(this.baseFov, width / height, 0.06, 260);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.28;
    pmremGenerator.dispose();

    this.hemiLight = new THREE.HemisphereLight(0x8fa8c8, 0x262930, 0.42);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffdfb8, 1.15);
    this.sunLight.position.set(28, 34, 18);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 4;
    this.sunLight.shadow.camera.far = 115;
    const d = 42;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0x6b9ad4, 0.28);
    this.rimLight.position.set(-26, 18, -36);
    this.scene.add(this.rimLight);

    // Build Weapons & Viewmodel Rig
    this.weapons = buildAllWeaponModels();
    applySkinToWeaponModels(this.weapons, this.skinId);
    this.camera.add(this.weaponRig);
    this.muzzleLight.position.set(0.18, -0.1, -0.75);
    this.camera.add(this.muzzleLight);
    this.buildingManager = new BuildingManager(this.scene);

    WEAPON_ORDER.forEach((id) => {
      const model = this.weapons[id];
      model.root.visible = id === this.activeWeaponId;
      this.weaponRig.add(model.root);
    });
    const activeSpec = WEAPON_SPECS[this.activeWeaponId];
    this.weaponRig.position.set(...activeSpec.hipPosition);

    // Handheld grenade viewmodel preview when aiming grenade
    this.handGrenadePreview = createGrenadeModel();
    this.handGrenadePreview.root.position.set(-0.22, -0.22, -0.44);
    this.handGrenadePreview.root.visible = false;
    this.camera.add(this.handGrenadePreview.root);

    // Grenade Trajectory Arc Beads (InstancedMesh) & Blast Radius Ring
    this.trajectoryBeads = new THREE.InstancedMesh(
      this.trajectoryBeadGeo,
      this.trajectoryBeadMat,
      TRAJECTORY_BEAD_COUNT
    );
    this.trajectoryBeads.frustumCulled = false;
    this.trajectoryBeads.visible = false;
    this.scene.add(this.trajectoryBeads);

    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.92, 1.0, 42),
      this.landingRingMat
    );
    ringMesh.rotation.x = -Math.PI / 2;
    const discMesh = new THREE.Mesh(new THREE.CircleGeometry(0.92, 42), this.landingDiscMat);
    discMesh.rotation.x = -Math.PI / 2;
    this.landingMarkerGroup.add(ringMesh, discMesh);
    this.landingMarkerGroup.visible = false;
    this.scene.add(this.landingMarkerGroup);

    this.tracerGeo.rotateX(Math.PI / 2);
    this.shellGeo.rotateX(Math.PI / 2);
    this.explosionRingGeo.rotateX(-Math.PI / 2);

    // Initialize Real WebSocket Local Multiplayer Client
    this.mpClient = new MultiplayerClient({
      onHudState: (st) => {
        this.mpState = st;
        this.syncRemoteAvatars();
        this.emitHud();
      },
      onPeerState: (st) => {
        this.mpState = st;
      },
      onRoomJoined: (_roomId, mapId) => {
        if (!(this.currentMapId === 'duel' && mapId === 'duel')) {
          this.loadMap(mapId, true);
        }
        this.callbacks.onMultiplayerMapSync?.(mapId);
      },
      onRoomMapChanged: (mapId) => {
        if (mapId !== this.currentMapId) {
          this.loadMap(mapId, true);
        }
        this.callbacks.onMultiplayerMapSync?.(mapId);
      },
      onRemoteShoot: (_pid, start, end) => {
        this.spawnTracer(
          new THREE.Vector3(start[0], start[1], start[2]),
          new THREE.Vector3(end[0], end[1], end[2]),
          'player'
        );
      },
      onRemoteGrenade: (_pid, pos, vel, fuseRemaining) => {
        const model = createGrenadeModel();
        const p = new THREE.Vector3(pos[0], pos[1], pos[2]);
        model.root.position.copy(p);
        this.scene.add(model.root);
        this.grenadeIdCounter += 1;
        this.activeGrenades.push({
          id: this.grenadeIdCounter,
          model,
          pos: p,
          vel: new THREE.Vector3(vel[0], vel[1], vel[2]),
          rotVel: new THREE.Vector3(8, 7, 10),
          fuseRemaining,
          fuseMax: BASE_GRENADE_FUSE,
          bounceCooldown: 0,
          owner: 'pet',
          visualType: 'frag',
          damageScale: 1,
        });
      },
      onHordeSync: (payload) => {
        if (this.mpState.isHost) return;
        this.hordeWave = payload.wave;
        this.hordeDefeatedInWave = payload.defeatedInWave;
        this.hordeTotalInWave = payload.totalInWave;
        if (payload.victory && !this.hordeVictory) {
          this.hordeVictory = true;
          this.unlockPointer();
        }
        // Keep local enemy HP/positions aligned with host snapshot
        for (const snap of payload.enemies) {
          const existing = this.enemies.find((e) => e.id === snap.id);
          if (existing) {
            existing.hp = snap.hp;
            existing.maxHp = snap.maxHp;
            existing.alive = snap.alive;
            existing.root.position.x = THREE.MathUtils.lerp(existing.root.position.x, snap.x, 0.45);
            existing.root.position.z = THREE.MathUtils.lerp(existing.root.position.z, snap.z, 0.45);
          }
        }
      },
      onEnemyDamageFromPeer: (enemyId, damage, hitZone) => {
        if (!this.mpState.isHost) return;
        const target = this.enemies.find((e) => e.id === enemyId && e.alive);
        if (target) {
          this.applyEnemyDamage(target, damage, hitZone, target.root.position.x);
        }
      },
      onBuildSync: (pieces) => {
        if (this.currentMapId !== 'duel') return;
        this.buildingManager.clearAll();
        for (const p of pieces) {
          this.buildingManager.addOrReplacePiece(p);
        }
      },
      onBuildPlace: (piece) => {
        if (this.currentMapId !== 'duel') return;
        this.buildingManager.addOrReplacePiece(piece);
        this.sound.playBuildPlace();
      },
      onBuildEdit: (buildId, editMask) => {
        if (this.currentMapId !== 'duel') return;
        this.buildingManager.updatePieceMask(buildId, editMask);
        this.sound.playEditConfirm();
      },
      onBuildHp: (buildId, hp) => {
        if (this.currentMapId !== 'duel') return;
        this.buildingManager.updatePieceHp(buildId, hp);
      },
      onBuildDestroy: (buildId) => {
        if (this.currentMapId !== 'duel') return;
        this.buildingManager.removePiece(buildId);
        this.sound.playBuildBreak();
      },
      onBuildClear: () => {
        if (this.currentMapId !== 'duel') return;
        this.buildingManager.clearAll();
        this.sound.playBuildBreak();
      },
      onPvpHit: (_fromPlayerId, attackerName, damage, _hitZone) => {
        if (this.currentMapId !== 'duel' || this.isGameOver) return;
        this.health = Math.max(0, this.health - damage);
        this.timeSinceDamaged = 0;
        this.damageFlash = 1.0;
        this.cameraShake = Math.max(this.cameraShake, 0.22);
        this.sound.playPlayerHurt();
        if (this.health <= 0) {
          this.health = this.maxHealth;
          const spawnZ = Math.random() > 0.5 ? 12 : -12;
          this.playerPos.set(0, 0, spawnZ);
          this.playerVel.set(0, 0, 0);
          this.yaw = spawnZ > 0 ? 0 : Math.PI;
          this.medkitNotice = `¡ELIMINADO POR ${attackerName.toUpperCase()} · REAPARECIENDO!`;
          this.medkitNoticeTimer = 2.6;
        }
        this.emitHud();
      },
    });
    this.mpState = this.mpClient.getState();

    if (!this.isSoftwareGl) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));

      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.14, 0.28, 0.9);
      this.composer.addPass(this.bloomPass);

      const vignettePass = new ShaderPass(VignetteShader);
      vignettePass.uniforms['offset'].value = 1.04;
      vignettePass.uniforms['darkness'].value = 0.9;
      this.composer.addPass(vignettePass);

      this.composer.addPass(new OutputPass());
    }

    // Load night forest campfire scene initially as live menu backdrop
    this.showMenuBackdrop();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Bind events
    this.onResizeBound = this.handleResize.bind(this);
    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onKeyUpBound = this.handleKeyUp.bind(this);
    this.onMouseMoveBound = this.handleMouseMove.bind(this);
    this.onMouseDownBound = this.handleMouseDown.bind(this);
    this.onMouseUpBound = this.handleMouseUp.bind(this);
    this.onWheelBound = this.handleWheel.bind(this);
    this.onContextMenuBound = (e: MouseEvent) => e.preventDefault();
    this.onPointerLockChangeBound = this.handlePointerLockChange.bind(this);
    this.onPointerLockErrorBound = this.handlePointerLockError.bind(this);
    this.onContextLostBound = (e: Event) => {
      e.preventDefault();
      this.callbacks.onContextLost(true);
    };
    this.onContextRestoredBound = () => {
      this.callbacks.onContextLost(false);
    };
    this.onMenuAudioUnlockBound = () => {
      if (this.isMenuForestActive) {
        this.sound.resumeTitleMusicIfWanted();
      }
    };

    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('mousemove', this.onMouseMoveBound);
    window.addEventListener('mousedown', this.onMouseDownBound);
    window.addEventListener('pointerdown', this.onMenuAudioUnlockBound);
    window.addEventListener('mouseup', this.onMouseUpBound);
    window.addEventListener('wheel', this.onWheelBound, { passive: true });
    this.renderer.domElement.addEventListener('contextmenu', this.onContextMenuBound);
    document.addEventListener('pointerlockchange', this.onPointerLockChangeBound);
    document.addEventListener('pointerlockerror', this.onPointerLockErrorBound);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLostBound);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestoredBound);

    this.emitHud();
    this.callbacks.onReady?.();
    this.scheduleNextFrame();
  }

  private loadUnlockedWeapons(): WeaponId[] {
    const base: WeaponId[] = ['pistol', 'rifle', 'shotgun'];
    try {
      const raw = localStorage.getItem(UNLOCKED_WEAPONS_STORAGE_KEY);
      if (!raw) return base;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        if (parsed.includes('sniper')) base.push('sniper');
        if (parsed.includes('rocket')) base.push('rocket');
        if (parsed.includes('chainsaw')) base.push('chainsaw');
      }
    } catch {
      // Ignore storage failures
    }
    return base;
  }

  private getSelectableWeapons(): WeaponId[] {
    const hasSniper = this.unlockedWeapons.includes('sniper');
    const base = this.unlockedWeapons.filter(
      (id) => !(hasSniper && id === 'rifle') && id !== 'chicken_combo'
    );
    if (this.currentMapId === 'nightcamp' && !base.includes('chicken_combo')) {
      base.push('chicken_combo');
    }
    return base;
  }

  private getMaxWavesForMap(): number {
    return this.currentMapId === 'nightcamp' ? 1 : this.maxWaves;
  }

  private saveUnlockedWeapons() {
    try {
      localStorage.setItem(UNLOCKED_WEAPONS_STORAGE_KEY, JSON.stringify(this.unlockedWeapons));
    } catch {
      // Ignore storage failures
    }
  }

  private loadPetUnlocked(): boolean {
    try {
      return localStorage.getItem(UNLOCKED_PET_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private savePetUnlocked() {
    try {
      localStorage.setItem(UNLOCKED_PET_STORAGE_KEY, '1');
    } catch {
      // Ignore storage failures
    }
  }

  private loadSavedSkin(): CharacterSkinId {
    try {
      const raw = localStorage.getItem(SKIN_STORAGE_KEY);
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

  private saveSkin(skinId: CharacterSkinId) {
    try {
      localStorage.setItem(SKIN_STORAGE_KEY, skinId);
    } catch {
      // Ignore storage failures
    }
  }

  private clearActiveMedkits() {
    for (const mk of this.activeMedkits) {
      this.scene.remove(mk.mesh.root);
      mk.mesh.dispose();
    }
    this.activeMedkits = [];
  }

  private applyMapAtmosphere(mapId: MapId | 'menu_forest') {
    if (mapId === 'menu_forest') {
      const nightFog = 0x080d18;
      this.scene.background = new THREE.Color(nightFog);
      this.scene.fog = new THREE.FogExp2(nightFog, 0.032);
      this.scene.environmentIntensity = 0.12;
      this.hemiLight.color.setHex(0x283e66);
      this.hemiLight.groundColor.setHex(0x0b120c);
      this.hemiLight.intensity = 0.28;
      this.sunLight.color.setHex(0x88abef);
      this.sunLight.intensity = 0.38;
      this.rimLight.color.setHex(0x3a5b99);
      this.rimLight.intensity = 0.18;
      this.renderer.toneMappingExposure = 0.82;
      if (this.bloomPass) {
        this.bloomPass.strength = 0.14;
        this.bloomPass.radius = 0.28;
        this.bloomPass.threshold = 0.88;
      }
    } else if (mapId === 'desert') {
      const desertFog = 0xb59568;
      this.scene.background = new THREE.Color(desertFog);
      this.scene.fog = new THREE.FogExp2(desertFog, 0.011);
      this.scene.environmentIntensity = 0.28;
      this.hemiLight.color.setHex(0x7caad8);
      this.hemiLight.groundColor.setHex(0x6e5332);
      this.hemiLight.intensity = 0.44;
      this.sunLight.color.setHex(0xffd9a0);
      this.sunLight.intensity = 1.15;
      this.rimLight.color.setHex(0xd99b26);
      this.rimLight.intensity = 0.22;
      this.renderer.toneMappingExposure = 0.76;
      if (this.bloomPass) {
        this.bloomPass.strength = 0.08;
        this.bloomPass.radius = 0.2;
        this.bloomPass.threshold = 0.95;
      }
    } else if (mapId === 'cubes') {
      const cubeFog = 0x73a6db;
      this.scene.background = new THREE.Color(cubeFog);
      this.scene.fog = new THREE.FogExp2(cubeFog, 0.0082);
      this.scene.environmentIntensity = 0.28;
      this.hemiLight.color.setHex(0xa8ccf2);
      this.hemiLight.groundColor.setHex(0x37591f);
      this.hemiLight.intensity = 0.48;
      this.sunLight.color.setHex(0xffeec2);
      this.sunLight.intensity = 1.16;
      this.rimLight.color.setHex(0x4b87d6);
      this.rimLight.intensity = 0.24;
      this.renderer.toneMappingExposure = 0.76;
      if (this.bloomPass) {
        this.bloomPass.strength = 0.08;
        this.bloomPass.radius = 0.2;
        this.bloomPass.threshold = 0.95;
      }
    } else if (mapId === 'pixel') {
      const pixelFog = 0x4574cc;
      this.scene.background = new THREE.Color(pixelFog);
      this.scene.fog = new THREE.FogExp2(pixelFog, 0.0068);
      this.scene.environmentIntensity = 0.26;
      this.hemiLight.color.setHex(0xb8dcf4);
      this.hemiLight.groundColor.setHex(0x5c361a);
      this.hemiLight.intensity = 0.48;
      this.sunLight.color.setHex(0xfef3c7);
      this.sunLight.intensity = 1.12;
      this.rimLight.color.setHex(0x4b87d6);
      this.rimLight.intensity = 0.24;
      this.renderer.toneMappingExposure = 0.74;
      if (this.bloomPass) {
        this.bloomPass.strength = 0.08;
        this.bloomPass.radius = 0.2;
        this.bloomPass.threshold = 0.95;
      }
    } else if (mapId === 'backrooms') {
      const backroomsFog = 0x8e8349;
      this.scene.background = new THREE.Color(backroomsFog);
      this.scene.fog = new THREE.FogExp2(backroomsFog, 0.036);
      this.scene.environmentIntensity = 0.16;
      this.hemiLight.color.setHex(0xe8dc98);
      this.hemiLight.groundColor.setHex(0x4b4220);
      this.hemiLight.intensity = 0.42;
      this.sunLight.color.setHex(0xf3e8aa);
      this.sunLight.intensity = 0.28;
      this.rimLight.color.setHex(0x8a7e40);
      this.rimLight.intensity = 0.14;
      this.renderer.toneMappingExposure = 0.78;
      if (this.bloomPass) {
        this.bloomPass.strength = 0.1;
        this.bloomPass.radius = 0.24;
        this.bloomPass.threshold = 0.9;
      }
    } else if (mapId === 'pueblo') {
      const puebloFog = 0x88bef2;
      this.scene.background = new THREE.Color(puebloFog);
      this.scene.fog = new THREE.FogExp2(puebloFog, 0.0068);
      this.scene.environmentIntensity = 0.28;
      this.hemiLight.color.setHex(0xcbe5ff);
      this.hemiLight.groundColor.setHex(0x3a6429);
      this.hemiLight.intensity = 0.5;
      this.sunLight.color.setHex(0xfff1c9);
      this.sunLight.intensity = 1.14;
      this.rimLight.color.setHex(0x528ad4);
      this.rimLight.intensity = 0.22;
      this.renderer.toneMappingExposure = 0.76;
      if (this.bloomPass) {
        this.bloomPass.strength = 0.08;
        this.bloomPass.radius = 0.2;
        this.bloomPass.threshold = 0.95;
      }
    } else if (mapId === 'duel') {
      const duelFog = 0x0d1b30;
      this.scene.background = new THREE.Color(duelFog);
      this.scene.fog = new THREE.FogExp2(duelFog, 0.0085);
      this.scene.environmentIntensity = 0.34;
      this.hemiLight.color.setHex(0xbae6fd);
      this.hemiLight.groundColor.setHex(0x1e293b);
      this.hemiLight.intensity = 0.52;
      this.sunLight.color.setHex(0xfffbeb);
      this.sunLight.intensity = 1.2;
      this.rimLight.color.setHex(0x38bdf8);
      this.rimLight.intensity = 0.26;
      this.renderer.toneMappingExposure = 0.8;
      if (this.bloomPass) {
        this.bloomPass.strength = 0.1;
        this.bloomPass.radius = 0.22;
        this.bloomPass.threshold = 0.92;
      }
    } else if (mapId === 'nightcamp') {
      const nightFog = 0x090b16;
      this.scene.background = new THREE.Color(nightFog);
      this.scene.fog = new THREE.FogExp2(nightFog, 0.0155);
      this.scene.environmentIntensity = 0.2;
      this.hemiLight.color.setHex(0x475e8a);
      this.hemiLight.groundColor.setHex(0x131710);
      this.hemiLight.intensity = 0.42;
      this.sunLight.color.setHex(0x9fb8ef);
      this.sunLight.intensity = 0.68;
      this.rimLight.color.setHex(0xe11d48);
      this.rimLight.intensity = 0.28;
      this.renderer.toneMappingExposure = 0.85;
      if (this.bloomPass) {
        this.bloomPass.strength = 0.14;
        this.bloomPass.radius = 0.26;
        this.bloomPass.threshold = 0.86;
      }
    } else {
      const fogColor = 0x6a727e;
      this.scene.background = new THREE.Color(fogColor);
      this.scene.fog = new THREE.FogExp2(fogColor, 0.0155);
      this.scene.environmentIntensity = 0.28;
      this.hemiLight.color.setHex(0x9ab0ca);
      this.hemiLight.groundColor.setHex(0x282b30);
      this.hemiLight.intensity = 0.42;
      this.sunLight.color.setHex(0xf5d0a0);
      this.sunLight.intensity = 1.12;
      this.rimLight.color.setHex(0x5f8ac2);
      this.rimLight.intensity = 0.28;
      this.renderer.toneMappingExposure = 0.78;
      if (this.bloomPass) {
        this.bloomPass.strength = 0.09;
        this.bloomPass.radius = 0.22;
        this.bloomPass.threshold = 0.95;
      }
    }
  }

  private getMaxAmmo(id: WeaponId): number {
    if (id === 'chainsaw') return WEAPON_SPECS.chainsaw.magazineSize;
    return Math.round(WEAPON_SPECS[id].magazineSize * this.magBonusMul);
  }

  private getGrenadeBlastRadius(): number {
    return BASE_GRENADE_RADIUS * this.grenadeRadiusMul;
  }

  private clearAllEnemies() {
    for (let i = 0; i < this.enemies.length; i++) {
      const en = this.enemies[i];
      this.worldGroup.remove(en.root);
      en.disposeOwnMaterials();
    }
    this.enemies = [];
    this.enemyHitboxes = [];
    this.lastDamagedEnemy = null;
  }

  private clearChestCeremony() {
    this.chestActive = false;
    this.chestStage = 'idle';
    this.chestTimer = 0;
    this.weaponRig.visible = true;
    if (this.rewardChest) {
      this.scene.remove(this.rewardChest.root);
      this.rewardChest.dispose();
      this.rewardChest = null;
    }
    if (this.rewardRocketMesh) {
      this.scene.remove(this.rewardRocketMesh.root);
      this.rewardRocketMesh.dispose();
      this.rewardRocketMesh = null;
    }
    if (this.rewardSniperMesh) {
      this.scene.remove(this.rewardSniperMesh.root);
      this.rewardSniperMesh.dispose();
      this.rewardSniperMesh = null;
    }
    if (this.rewardChainsawMesh) {
      this.scene.remove(this.rewardChainsawMesh.root);
      this.rewardChainsawMesh.dispose();
      this.rewardChainsawMesh = null;
    }
    if (this.rewardPetMesh) {
      this.scene.remove(this.rewardPetMesh.root);
      this.rewardPetMesh.dispose();
      this.rewardPetMesh = null;
    }
  }

  private clearActiveGrenadesAndExplosions() {
    for (let i = 0; i < this.activeGrenades.length; i++) {
      this.scene.remove(this.activeGrenades[i].model.root);
      this.activeGrenades[i].model.dispose();
    }
    this.activeGrenades = [];

    for (let i = 0; i < this.activeRockets.length; i++) {
      this.scene.remove(this.activeRockets[i].model.root);
      this.activeRockets[i].model.dispose();
    }
    this.activeRockets = [];

    for (let i = 0; i < this.activeBoomerangs.length; i++) {
      this.scene.remove(this.activeBoomerangs[i].mesh.root);
      this.activeBoomerangs[i].mesh.dispose();
    }
    this.activeBoomerangs = [];

    for (let i = 0; i < this.explosions.length; i++) {
      const ex = this.explosions[i];
      this.scene.remove(ex.coreMesh, ex.ringMesh, ex.light);
      (ex.coreMesh.material as THREE.Material).dispose();
      (ex.ringMesh.material as THREE.Material).dispose();
    }
    this.explosions = [];
    this.isAimingGrenade = false;
    this.grenadeHoldTime = 0;
    this.handGrenadePreview.root.visible = false;
    this.trajectoryBeads.visible = false;
    this.landingMarkerGroup.visible = false;
  }

  private rebuildEnemyHitboxes() {
    const boxes: THREE.Mesh[] = [];
    for (let i = 0; i < this.enemies.length; i++) {
      const en = this.enemies[i];
      if (!en.alive) continue;
      for (let j = 0; j < en.hitboxMeshes.length; j++) {
        boxes.push(en.hitboxMeshes[j]);
      }
    }
    this.enemyHitboxes = boxes;
  }

  private configureWave(wave: number) {
    if (this.currentMapId === 'nightcamp') {
      this.hordeWave = 1;
      this.hordeSpawnedInWave = 0;
      this.hordeDefeatedInWave = 0;
      this.hordeTotalInWave = 25; // All 5 Bosses + 20 mixed enemies & mini-bosses
      this.hordeMaxAlive = 14;
      this.hordeSpawnInterval = 0.45;
      this.hordeSpawnTimer = 0.25;
      this.hordeBossSpawnedForWave = false;
      this.hordeMiniBossesSpawnedInWave = 0;
      this.hordeMiniBossTargetForWave = 5;
      return;
    }
    const table =
      this.currentMapId === 'desert'
        ? WAVE_CONFIGS_DESERT
        : this.currentMapId === 'cubes'
        ? WAVE_CONFIGS_CUBES
        : this.currentMapId === 'pixel'
        ? WAVE_CONFIGS_PIXEL
        : this.currentMapId === 'pueblo'
        ? WAVE_CONFIGS_PUEBLO
        : WAVE_CONFIGS_CITY;
    const cfg = table[wave] ?? table[5];
    this.hordeWave = wave;
    this.hordeSpawnedInWave = 0;
    this.hordeDefeatedInWave = 0;
    this.hordeTotalInWave = cfg.totalInWave;
    this.hordeMaxAlive = cfg.maxAlive;
    this.hordeSpawnInterval = cfg.spawnInterval;
    this.hordeSpawnTimer = 0.65;
    this.hordeBossSpawnedForWave = false;
    this.hordeMiniBossesSpawnedInWave = 0;
    if (this.currentMapId === 'pueblo') {
      this.hordeMiniBossTargetForWave = wave === 1 ? 1 : wave <= 3 ? 2 : 3;
    } else {
      this.hordeMiniBossTargetForWave = wave === 1 ? 0 : wave === 2 ? 1 : 2;
    }
  }

  private openTentShopForWave(wave: number) {
    this.tentShopOpen = true;
    this.currentShopOptions = pickTentUpgradeOptions(this.ownedUpgrades, wave);
    this.mouseDownLeft = false;
    this.isAds = false;
    this.isAimingGrenade = false;
    this.handGrenadePreview.root.visible = false;
    this.trajectoryBeads.visible = false;
    this.landingMarkerGroup.visible = false;
    this.unlockPointer();
    this.sound.playChickenCluck();
    this.chickenNpc?.triggerTalk();
    this.emitHud();
  }

  public selectTentUpgrade(upgradeId: UpgradeId) {
    if (!this.tentShopOpen) return;
    if (!this.ownedUpgrades.includes(upgradeId)) {
      this.ownedUpgrades.push(upgradeId);
    }

    switch (upgradeId) {
      case 'ap_ammo':
        this.damageMul *= 1.32;
        break;
      case 'hollow_point':
        this.headshotMul *= 1.4;
        break;
      case 'extended_mags':
        this.magBonusMul *= 1.5;
        this.reloadSpeedMul *= 1.3;
        WEAPON_ORDER.forEach((wId) => {
          this.ammoByWeapon[wId] = this.getMaxAmmo(wId);
        });
        break;
      case 'thermobaric_grenades':
        this.grenadeDamageMul *= 1.45;
        this.grenadeRadiusMul *= 1.45;
        this.maxGrenades += 1;
        this.grenadeCount = Math.min(this.maxGrenades, this.grenadeCount + 2);
        break;
      case 'cluster_grenades':
        this.grenadeStunSec = Math.max(this.grenadeStunSec, 2.0);
        this.maxGrenades += 1;
        this.grenadeCount = Math.min(this.maxGrenades, this.grenadeCount + 1);
        break;
      case 'stabilized_barrel':
        this.fireRateMul *= 0.78;
        this.recoilMul *= 0.65;
        break;
      case 'steady_grip':
        this.spreadMul *= 0.6;
        this.recoilMul *= 0.7;
        break;
      case 'tactical_boots':
        this.speedMul *= 1.24;
        this.jumpMul *= 1.15;
        break;
      case 'rapid_dash':
        this.dashCooldownMul *= 0.55;
        this.dashPowerMul *= 1.25;
        this.dashCooldownMax = 1.1 * this.dashCooldownMul;
        this.dashCooldownTimer = Math.min(this.dashCooldownTimer, this.dashCooldownMax);
        break;
      case 'reinforced_armor':
        this.maxHealth += 45;
        this.health = this.maxHealth;
        break;
      case 'regen_serum':
        this.regenPerSec += 4;
        break;
      case 'combat_vampirism':
        this.vampirismHeal += 10;
        this.grenadeCount = Math.min(this.maxGrenades, this.grenadeCount + 1);
        break;
    }

    this.tentShopOpen = false;
    this.sound.playUpgradePickup();
    this.sound.playChickenCluck();
    this.startOrResume();
  }

  public showMenuBackdrop() {
    this.unlockPointer();
    this.hasStarted = false;
    this.tentShopOpen = false;
    this.isGameOver = false;
    this.hordeVictory = false;
    this.disposeMap();
    this.sound.stopBackroomsHum();
    this.sound.stopAllNextbotAudio();
    this.nextbotAlert = null;
    this.clearAllEnemies();
    this.clearActiveGrenadesAndExplosions();
    this.clearChestCeremony();
    this.clearActiveMedkits();
    this.buildingManager.clearAll();
    this.activeBuildPiece = null;
    this.isEditingBuild = false;
    this.hoveredEditTile = -1;
    if (this.chickenNpc) {
      this.chickenNpc.dispose();
      this.chickenNpc = null;
    }
    if (this.captainPollo) {
      this.scene.remove(this.captainPollo.root);
      this.captainPollo.dispose();
      this.captainPollo = null;
    }
    this.worldGroup.clear();
    this.clearTransientEffects();

    this.isMenuForestActive = true;
    this.colliders = [];
    this.obstacles = [];
    this.targets = [];
    this.targetHitboxes = [];
    this.updateTutorialTargets = null;
    this.flickerLight = null;
    this.flickerBulbMat = null;
    this.fireLights = [];
    this.fireMeshes = [];
    this.dustParticles = null;

    this.applyMapAtmosphere('menu_forest');
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const targetParent = this.worldGroup as unknown as THREE.Scene;
    const forest = createNightForestMenuScene(targetParent, maxAniso);
    this.menuForestUpdate = forest.update;
    this.menuDeployButtons = forest.deployButtons;
    this.menuCaptainPolloMeshes = forest.captainPolloMeshes;
    this.triggerMenuPolloHop = forest.triggerCaptainPolloHop;
    this.titlePolloClicks = 0;
    this.setMenuBoardHover = forest.setHoveredBoardAction;
    this.setMenuBoardPage = forest.setBoardPage;
    this.lastHoveredBoardAction = null;
    this.disposeMap = forest.dispose;

    this.menuCameraPreset = 'campfire';
    this.menuCamPos.set(-0.35, 1.38, 3.35);
    this.menuCamLook.set(0.92, 0.58, -0.32);
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(this.menuCamPos);
    this.camera.lookAt(this.menuCamLook);
    this.renderer.domElement.style.cursor = 'default';
    this.sound.startTitleMusic();
    this.emitHud();
  }

  public setMenuCameraMode(mode: 'campfire' | 'deploy_board') {
    this.menuCameraPreset = mode;
    if (mode !== 'deploy_board') {
      this.setMenuBoardHover?.(null);
      if (this.lastHoveredBoardAction !== null) {
        this.lastHoveredBoardAction = null;
        this.callbacks.onBoardHoverChange?.(null);
      }
      this.renderer.domElement.style.cursor = 'default';
    }
    if (this.isMenuForestActive) {
      this.sound.resumeTitleMusicIfWanted();
    }
  }

  public cycleCompanionSide() {
    const order: CompanionSide[] = ['front', 'left', 'right'];
    const idx = order.indexOf(this.companionSide);
    this.companionSide = order[(idx + 1) % order.length];
    this.sound.playCaptainPolloSqawk();
    this.emitHud();
  }

  public loadMap(mapId: MapId, lockAfterLoad = false) {
    this.isMenuForestActive = false;
    this.menuDeployButtons = [];
    this.menuCaptainPolloMeshes = [];
    this.triggerMenuPolloHop = null;
    this.titlePolloClicks = 0;
    this.setMenuBoardHover = null;
    this.setMenuBoardPage = null;
    this.lastHoveredBoardAction = null;
    this.callbacks.onBoardHoverChange?.(null);
    this.renderer.domElement.style.cursor = 'default';
    this.sound.stopTitleMusic();
    this.sound.stopBackroomsHum();
    this.sound.stopAllNextbotAudio();
    this.nextbotAlert = null;
    this.menuForestUpdate = null;
    this.disposeMap();
    this.clearAllEnemies();
    this.clearActiveGrenadesAndExplosions();
    this.clearChestCeremony();
    this.clearActiveMedkits();
    this.buildingManager.clearAll();
    this.activeBuildPiece = null;
    this.isEditingBuild = false;
    this.hoveredEditTile = -1;
    this.medkitSpawnTimer = 10.0;
    this.medkitsUsed = 0;
    this.medkitNotice = null;
    this.medkitNoticeTimer = 0;
    this.survivalTimeSec = 0;
    this.damageDealt = 0;
    this.buildsPlaced = 0;
    this.editsMade = 0;
    this.duelBotRespawnTimer = 0;
    if (this.chickenNpc) {
      this.chickenNpc.dispose();
      this.chickenNpc = null;
    }
    if (this.captainPollo) {
      this.scene.remove(this.captainPollo.root);
      this.captainPollo.dispose();
      this.captainPollo = null;
    }
    this.worldGroup.clear();
    this.clearTransientEffects();

    this.currentMapId = mapId;
    this.applyMapAtmosphere(mapId);
    this.colliders = [];
    this.obstacles = [];
    this.targets = [];
    this.targetHitboxes = [];
    this.updateTutorialTargets = null;
    this.flickerLight = null;
    this.flickerBulbMat = null;
    this.fireLights = [];
    this.fireMeshes = [];
    this.dustParticles = null;

    // Reset player survival & upgrade multipliers
    this.maxHealth = 100;
    this.health = 100;
    this.isGameOver = false;
    this.damageFlash = 0;
    this.cameraShake = 0;
    this.hordeVictory = false;
    this.hordeIntermissionTimer = 0;
    this.tentShopOpen = false;
    this.ownedUpgrades = [];
    this.currentShopOptions = [];
    this.damageMul = 1;
    this.headshotMul = 1;
    this.fireRateMul = 1;
    this.recoilMul = 1;
    this.spreadMul = 1;
    this.reloadSpeedMul = 1;
    this.magBonusMul = 1;
    this.speedMul = 1;
    this.jumpMul = 1;
    this.dashCooldownMul = 1;
    this.dashPowerMul = 1;
    this.dashCooldownMax = 1.1;
    this.regenPerSec = 0;
    this.timeSinceDamaged = 0;
    this.vampirismHeal = 0;
    this.grenadeDamageMul = 1;
    this.grenadeRadiusMul = 1;
    this.grenadeStunSec = 0;
    this.maxGrenades = 3;
    this.grenadeCount = 3;
    this.multiKillBanner = null;
    this.multiKillTimer = 0;
    this.petGrenadeCooldown = 3.8;

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const targetParent = this.worldGroup as unknown as THREE.Scene;

    if (mapId === 'tutorial') {
      const tut = createTutorialRangeMap(targetParent, maxAniso);
      this.colliders = tut.colliders;
      this.obstacles = tut.obstacles;
      this.targets = tut.targets;
      this.targetHitboxes = tut.targetHitboxes;
      this.updateTutorialTargets = tut.updateTargets;
      this.disposeMap = tut.dispose;

      this.chickenNpc = createChickenInstructor(targetParent, new THREE.Vector3(-2.6, 0, 5.5));

      this.playerPos.set(0, 0, 7.2);
      this.yaw = 0.14;
      this.pitch = -0.02;

      this.tutorialStep = 'move';
      this.tutorialProgress = 0;
      this.tutorialMoveDist = 0;
      this.tutorialSwitchedWeapon = false;
      this.tutorialReloaded = false;
      if (lockAfterLoad) {
        this.sound.playChickenCluck();
        this.chickenNpc.triggerTalk();
      }
    } else if (mapId === 'desert') {
      const desert = createDesertArsanalMap(targetParent, maxAniso);
      this.colliders = desert.colliders;
      this.obstacles = desert.obstacles;
      this.flickerLight = desert.flickerLight;
      this.flickerBulbMat = desert.flickerBulbMat;
      this.fireLights = desert.fireLights;
      this.fireMeshes = desert.fireMeshes;
      this.dustParticles = desert.dustParticles;
      this.disposeMap = desert.dispose;

      this.chickenNpc = createChickenInstructor(targetParent, new THREE.Vector3(-11.8, 0, 6.2));

      this.configureWave(1);
      this.spawnLaneIndex = 0;

      this.playerPos.set(0, 0, 10);
      this.yaw = 0.08;
      this.pitch = 0;
    } else if (mapId === 'cubes') {
      const cubes = createCubeWorldMap(targetParent, maxAniso);
      this.colliders = cubes.colliders;
      this.obstacles = cubes.obstacles;
      this.flickerLight = cubes.flickerLight;
      this.flickerBulbMat = cubes.flickerBulbMat;
      this.fireLights = cubes.fireLights;
      this.fireMeshes = cubes.fireMeshes;
      this.dustParticles = cubes.dustParticles;
      this.disposeMap = cubes.dispose;

      this.chickenNpc = createChickenInstructor(targetParent, new THREE.Vector3(-11.3, 0, 6.4));

      this.configureWave(1);
      this.spawnLaneIndex = 0;

      this.playerPos.set(0, 0, 10);
      this.yaw = 0.06;
      this.pitch = 0;
    } else if (mapId === 'pixel') {
      const pixel = createPixelWorldMap(targetParent, maxAniso);
      this.colliders = pixel.colliders;
      this.obstacles = pixel.obstacles;
      this.flickerLight = pixel.flickerLight;
      this.flickerBulbMat = pixel.flickerBulbMat;
      this.fireLights = pixel.fireLights;
      this.fireMeshes = pixel.fireMeshes;
      this.dustParticles = pixel.dustParticles;
      this.disposeMap = pixel.dispose;

      this.chickenNpc = createChickenInstructor(targetParent, new THREE.Vector3(-11.3, 0, 6.4));

      this.configureWave(1);
      this.spawnLaneIndex = 0;

      this.playerPos.set(0, 0, 10);
      this.yaw = 0.06;
      this.pitch = 0;
    } else if (mapId === 'backrooms') {
      const backrooms = createBackroomsMap(targetParent, maxAniso);
      this.colliders = backrooms.colliders;
      this.obstacles = backrooms.obstacles;
      this.flickerLight = backrooms.flickerLight;
      this.flickerBulbMat = backrooms.flickerBulbMat;
      this.fireLights = backrooms.fireLights;
      this.fireMeshes = backrooms.fireMeshes;
      this.dustParticles = backrooms.dustParticles;
      this.disposeMap = backrooms.dispose;

      this.nextbotSpawnTimer = 2.0;
      this.nextbotGrenadeRegenTimer = 0;
      this.maxGrenades = 4;
      this.grenadeCount = 4;
      this.sound.startBackroomsHum();

      // Spawn 4 initial Meme Nextbots across the expanded Backrooms corridors
      const initialSpawns: Array<[NextbotKind, number, number]> = [
        ['bob_esponja', -19.5, -18.5],
        ['en_este_pueblo', 19.5, -18.5],
        ['among_us', -38.0, 32.0],
        ['bob_esponja', 38.0, -34.0],
      ];
      for (const [kind, sx, sz] of initialSpawns) {
        this.enemies.push(this.enemyFactory.spawnNextbot(this.worldGroup, sx, sz, kind, 1));
      }
      this.rebuildEnemyHitboxes();

      this.playerPos.set(0, 0, 16);
      this.yaw = 0.0;
      this.pitch = 0;
    } else if (mapId === 'pueblo') {
      const pueblo = createPuebloDesconocidoMap(targetParent, maxAniso);
      this.colliders = pueblo.colliders;
      this.obstacles = pueblo.obstacles;
      this.flickerLight = pueblo.flickerLight;
      this.flickerBulbMat = pueblo.flickerBulbMat;
      this.fireLights = pueblo.fireLights;
      this.fireMeshes = pueblo.fireMeshes;
      this.dustParticles = pueblo.dustParticles;
      this.disposeMap = pueblo.dispose;

      this.chickenNpc = createChickenInstructor(targetParent, new THREE.Vector3(-11.2, 0, 6.8));

      this.configureWave(1);
      this.spawnLaneIndex = 0;

      this.playerPos.set(0, 0, 10);
      this.yaw = 0.0;
      this.pitch = 0;
    } else if (mapId === 'duel') {
      const duel = createDuel1v1Map(targetParent, maxAniso);
      this.colliders = duel.colliders;
      this.obstacles = duel.obstacles;
      this.flickerLight = duel.flickerLight;
      this.flickerBulbMat = duel.flickerBulbMat;
      this.fireLights = duel.fireLights;
      this.fireMeshes = duel.fireMeshes;
      this.dustParticles = duel.dustParticles;
      this.disposeMap = duel.dispose;

      this.playerPos.set(0, 0, 12);
      this.yaw = 0.0;
      this.pitch = 0;

      if (this.duelBotEnabled && this.mpState.peers.length === 0) {
        this.spawnDuelSparringBot();
      }
      if (lockAfterLoad && (!this.mpState.inRoom || this.mpState.vote?.phase !== 'waiting')) {
        this.mpClient.joinLobby(this.mpState.playerName, this.skinId);
      }
    } else if (mapId === 'nightcamp') {
      const nightCamp = createNightCampMap(targetParent, maxAniso);
      this.colliders = nightCamp.colliders;
      this.obstacles = nightCamp.obstacles;
      this.flickerLight = nightCamp.flickerLight;
      this.flickerBulbMat = nightCamp.flickerBulbMat;
      this.fireLights = nightCamp.fireLights;
      this.fireMeshes = nightCamp.fireMeshes;
      this.dustParticles = nightCamp.dustParticles;
      this.disposeMap = nightCamp.dispose;

      this.chickenNpc = createChickenInstructor(targetParent, new THREE.Vector3(-11.4, 0, 6.8));

      // Secret Overdrive Loadout: x10 life, x10 grenades, x10 fire & reload speed + all upgrades + The Chiken Combinacion
      this.ownedUpgrades = Object.keys(UPGRADE_CATALOG) as UpgradeId[];
      this.maxHealth = 1000;
      this.health = 1000;
      this.maxGrenades = 30;
      this.grenadeCount = 30;
      this.fireRateMul = 0.08;
      this.reloadSpeedMul = 10.0;
      this.magBonusMul = 2.0;
      this.damageMul = 2.35;
      this.headshotMul = 1.6;
      this.recoilMul = 0.35;
      this.spreadMul = 0.55;
      this.speedMul = 1.42;
      this.jumpMul = 1.18;
      this.dashCooldownMul = 0.35;
      this.dashCooldownMax = 0.38;
      this.dashPowerMul = 1.25;
      this.regenPerSec = 10;
      this.vampirismHeal = 25;
      this.grenadeDamageMul = 2.2;
      this.grenadeRadiusMul = 1.45;
      this.grenadeStunSec = 2.0;

      this.configureWave(1);
      this.spawnLaneIndex = 0;

      this.playerPos.set(0, 0, 12);
      this.yaw = 0.0;
      this.pitch = 0;
    } else {
      const city = createAbandonedCityMap(targetParent, maxAniso);
      this.colliders = city.colliders;
      this.obstacles = city.obstacles;
      this.flickerLight = city.flickerLight;
      this.flickerBulbMat = city.flickerBulbMat;
      this.fireLights = city.fireLights;
      this.fireMeshes = city.fireMeshes;
      this.dustParticles = city.dustParticles;
      this.disposeMap = city.dispose;

      // Coronel Plumaje standing outside his Command Tent in the city!
      this.chickenNpc = createChickenInstructor(targetParent, new THREE.Vector3(-10.4, 0.22, 6.2));

      this.configureWave(1);
      this.spawnLaneIndex = 0;

      if (!lockAfterLoad) {
        this.enemies.push(
          this.enemyFactory.spawnArmedZombie(this.worldGroup, -2.5, -14, 'rifle', 1, 'Zombi Armado #1'),
          this.enemyFactory.spawnArmedZombie(this.worldGroup, 3.0, -21, 'shotgun', 1, 'Zombi Armado #2'),
          this.enemyFactory.spawnArmedZombie(this.worldGroup, -0.5, -29, 'pistol', 1, 'Zombi Armado #3')
        );
        this.rebuildEnemyHitboxes();
      }

      this.playerPos.set(0, 0, 10);
      this.yaw = 0.12;
      this.pitch = 0;
    }

    // Spawn Capitán Pollo companion on combat maps (unlocked permanently or always in Pueblo Desconocido / Campamento nocturno)
    if (
      (this.petUnlocked || mapId === 'pueblo' || mapId === 'nightcamp') &&
      mapId !== 'tutorial' &&
      mapId !== 'backrooms' &&
      mapId !== 'duel'
    ) {
      this.captainPollo = createCaptainPolloMesh();
      const startOffX = this.companionSide === 'left' ? -1.6 : this.companionSide === 'right' ? 1.6 : 0.88;
      const startOffZ = this.companionSide === 'front' ? -2.25 : -0.85;
      this.captainPollo.root.position.set(
        this.playerPos.x + startOffX,
        0,
        this.playerPos.z + startOffZ
      );
      this.scene.add(this.captainPollo.root);
    }

    this.playerVel.set(0, 0, 0);
    this.eyeHeight = 1.68;
    this.isCrouching = false;
    this.dashActiveTimer = 0;
    this.dashCooldownTimer = 0;
    this.dashRollBoost = 0;
    this.isAds = false;
    this.isReloading = false;
    this.reloadElapsed = 0;
    this.inspectTimer = 0;
    this.shotgunPumpTimer = 0;
    this.sniperBoltTimer = 0;
    this.dashTilt = 0;
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.headshots = 0;
    this.lastEliminationName = null;
    this.lastDamagedEnemy = null;

    if (mapId === 'nightcamp') {
      this.activeWeaponId = 'chicken_combo';
    } else if (this.activeWeaponId === 'chicken_combo') {
      this.activeWeaponId = this.unlockedWeapons.includes('sniper') ? 'sniper' : 'rifle';
    }
    WEAPON_ORDER.forEach((wId) => {
      this.weapons[wId].root.visible = wId === this.activeWeaponId;
      if (this.weapons[wId].magazinePart) {
        this.weapons[wId].magazinePart!.position.y = this.weapons[wId].magazineRestY;
      }
    });

    this.ammoByWeapon = {
      pistol: this.getMaxAmmo('pistol'),
      rifle: this.getMaxAmmo('rifle'),
      sniper: this.getMaxAmmo('sniper'),
      shotgun: this.getMaxAmmo('shotgun'),
      rocket: this.getMaxAmmo('rocket'),
      chicken_combo: this.getMaxAmmo('chicken_combo'),
      chainsaw: this.getMaxAmmo('chainsaw'),
    };

    this.camera.position.set(this.playerPos.x, this.playerPos.y + this.eyeHeight, this.playerPos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');

    if (lockAfterLoad) {
      if (
        mapId === 'city' ||
        mapId === 'desert' ||
        mapId === 'cubes' ||
        mapId === 'pixel' ||
        mapId === 'pueblo'
      ) {
        this.hasStarted = true;
        this.sound.startAmbience();
        this.openTentShopForWave(1);
      } else {
        if (mapId === 'nightcamp') {
          this.multiKillBanner = '¡NIVEL SECRETO: CAMPAMENTO NOCTURNO!';
          this.multiKillTimer = 3.6;
        }
        this.startOrResume();
      }
    } else {
      this.emitHud();
    }
  }

  private clearTransientEffects() {
    this.tracers.forEach((t) => {
      this.scene.remove(t.mesh);
      (t.mesh.material as THREE.Material).dispose();
    });
    this.tracers = [];
    this.sparks.forEach((s) => this.scene.remove(s.mesh));
    this.sparks = [];
    this.smokes.forEach((sm) => {
      this.scene.remove(sm.mesh);
      (sm.mesh.material as THREE.Material).dispose();
    });
    this.smokes = [];
    this.shells.forEach((sh) => this.scene.remove(sh.mesh));
    this.shells = [];
  }

  public startOrResume() {
    if (this.isGameOver || this.hordeVictory || this.tentShopOpen || this.chestActive) return;
    this.hasStarted = true;
    this.sound.startAmbience();
    if (this.mobileMode) {
      this.isLocked = true;
      this.emitHud();
      return;
    }
    const canvas = this.renderer.domElement;
    if (document.pointerLockElement !== canvas) {
      try {
        const res = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
        if (res && typeof res.catch === 'function') {
          res.catch(() => {
            this.pointerLockFailed = true;
            this.isLocked = true;
            this.emitHud();
          });
        }
      } catch {
        this.pointerLockFailed = true;
        this.isLocked = true;
        this.emitHud();
      }
    }
    this.emitHud();
  }

  public unlockPointer() {
    this.pointerLockFailed = false;
    this.isLocked = false;
    this.virtualShootDown = false;
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
    this.emitHud();
  }

  public applyOptions(opts: GameOptions) {
    this.sensitivity = opts.sensitivity;
    this.sound.setMuted(opts.muted);
    this.baseFov = opts.fov;
    this.invertY = opts.invertY;
    if (opts.skinId && opts.skinId !== this.skinId) {
      this.skinId = opts.skinId;
      this.saveSkin(opts.skinId);
      applySkinToWeaponModels(this.weapons, opts.skinId);
    }
    if (!this.isAds && !this.isSprinting) {
      this.camera.fov = this.baseFov;
      this.camera.updateProjectionMatrix();
    }
    this.emitHud();
  }

  public setMobileMode(enabled: boolean) {
    this.mobileMode = enabled;
    if (enabled && document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
  }

  public setVirtualMove(x: number, y: number) {
    this.virtualMoveX = THREE.MathUtils.clamp(x, -1, 1);
    this.virtualMoveY = THREE.MathUtils.clamp(y, -1, 1);
  }

  public applyTouchLook(dx: number, dy: number) {
    if (!this.isLocked || this.isGameOver || this.hordeVictory || this.tentShopOpen || this.chestActive) return;
    const ySign = this.invertY ? -1 : 1;
    const zoomSensMul =
      this.activeWeaponId === 'sniper' && this.isAds
        ? Math.max(0.16, this.camera.fov / this.baseFov)
        : 1.0;
    this.yaw -= dx * this.sensitivity * 1.45 * zoomSensMul;
    this.pitch -= dy * this.sensitivity * 1.35 * ySign * zoomSensMul;
    const limit = Math.PI / 2 - 0.04;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -limit, limit);
  }

  public setVirtualShoot(active: boolean) {
    this.virtualShootDown = active;
    if (active) {
      this.tryShoot(true);
    }
  }

  public setVirtualAds(active: boolean) {
    this.isAds = active;
    this.emitHud();
  }

  public toggleSniperZoom() {
    if (this.activeWeaponId !== 'sniper') return;
    this.sniperZoom = this.sniperZoom === 4 ? 8 : 4;
    this.sound.playZoomClick(this.sniperZoom);
    this.emitHud();
  }

  public triggerVirtualJump() {
    if (this.isGrounded && this.isLocked && !this.tentShopOpen && !this.chestActive) {
      this.playerVel.y = 6.3 * this.jumpMul;
      this.isGrounded = false;
      this.isCrouching = false;
      this.jumpLandDip = -0.042;
    }
  }

  public triggerVirtualCrouch() {
    if (!this.isLocked || this.tentShopOpen || this.chestActive) return;
    this.isCrouching = !this.isCrouching;
    this.emitHud();
  }

  public triggerVirtualReload() {
    if (!this.isLocked || this.tentShopOpen || this.chestActive) return;
    this.startReload();
  }

  public triggerVirtualGrenadeStart() {
    if (!this.isLocked || this.tentShopOpen || this.chestActive) return;
    this.beginGrenadeAim();
  }

  public triggerVirtualGrenadeRelease() {
    if (this.isAimingGrenade) {
      this.releaseGrenadeThrow();
    }
  }

  public triggerVirtualDash() {
    this.triggerDash();
  }

  public triggerDash() {
    if (
      !this.isLocked ||
      this.isGameOver ||
      this.hordeVictory ||
      this.tentShopOpen ||
      this.chestActive ||
      this.isMenuForestActive
    ) {
      return;
    }
    if (this.dashCooldownTimer > 0 || this.dashActiveTimer > 0) return;

    const keyForward =
      Number(Boolean(this.keys['KeyW'] || this.keys['ArrowUp'])) -
      Number(Boolean(this.keys['KeyS'] || this.keys['ArrowDown']));
    const keyRight =
      Number(Boolean(this.keys['KeyD'] || this.keys['ArrowRight'])) -
      Number(Boolean(this.keys['KeyA'] || this.keys['ArrowLeft']));

    const moveForward = THREE.MathUtils.clamp(keyForward + this.virtualMoveY, -1, 1);
    const moveRight = THREE.MathUtils.clamp(keyRight + this.virtualMoveX, -1, 1);

    _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    _right.crossVectors(_forward, _upAxis).normalize();
    _moveDir.set(0, 0, 0);

    let lateralSign = 0;
    if (Math.abs(moveForward) > 0.1 || Math.abs(moveRight) > 0.1) {
      _moveDir.addScaledVector(_forward, moveForward);
      _moveDir.addScaledVector(_right, moveRight);
      _moveDir.normalize();
      lateralSign = moveRight;
    } else {
      // Standing still and pressing Ctrl: dash sideways ("al lado o al otro"), alternating sides
      lateralSign = this.dashSideSign;
      _moveDir.copy(_right).multiplyScalar(lateralSign);
      this.dashSideSign *= -1;
    }

    this.dashDirX = _moveDir.x;
    this.dashDirZ = _moveDir.z;
    this.dashActiveTimer = 0.16;
    this.dashCooldownMax = 1.1 * this.dashCooldownMul;
    this.dashCooldownTimer = this.dashCooldownMax;
    this.dashRollBoost = -lateralSign * 0.085;
    this.dashTilt = -lateralSign * 0.24;
    this.isCrouching = false;
    this.sound.playDash();
    if (this.mpState.inRoom) {
      this.mpClient.sendPlayerState({
        x: this.playerPos.x,
        y: this.playerPos.y,
        z: this.playerPos.z,
        yaw: this.yaw,
        pitch: this.pitch,
        weaponId: this.activeWeaponId,
        isCrouching: this.isCrouching,
        isMoving: true,
        isSprinting: false,
        isDashing: true,
        health: this.health,
        maxHealth: this.maxHealth,
        kills: this.kills,
      });
    }
    this.emitHud();
  }

  public createMultiplayerRoom(mapId: MapId, playerName: string) {
    this.mpClient.createRoom(mapId, playerName, this.skinId);
  }

  public joinMultiplayerRoom(roomId: string, playerName: string) {
    this.mpClient.joinRoom(roomId, playerName, this.skinId);
  }

  public leaveMultiplayerRoom() {
    this.mpClient.leaveRoom();
  }

  public refreshMultiplayerRooms() {
    this.mpClient.refreshRooms();
  }

  public setMultiplayerPlayerName(name: string) {
    this.mpClient.setPlayerName(name);
  }

  public voteForMap(mapId: MapId) {
    this.mpClient.voteMap(mapId);
  }

  public startVotedMatch() {
    this.mpClient.startVotedMatch();
  }

  public selectBuildPiece(type: BuildPieceType | null) {
    if (this.currentMapId !== 'duel') return;
    if (this.isEditingBuild) {
      this.buildingManager.cancelEdit();
      this.isEditingBuild = false;
      this.hoveredEditTile = -1;
    }
    this.activeBuildPiece = this.activeBuildPiece === type ? null : type;
    if (this.activeBuildPiece) {
      this.isAds = false;
      this.isReloading = false;
      this.sound.playSwitch();
    }
    this.emitHud();
  }

  public clearDuelBuilds() {
    if (this.currentMapId !== 'duel') return;
    this.buildingManager.clearAll();
    this.sound.playBuildBreak();
    if (this.mpState.inRoom) {
      this.mpClient.sendBuildClear();
    }
    this.emitHud();
  }

  public toggleDuelBot() {
    if (this.currentMapId !== 'duel') return;
    this.duelBotEnabled = !this.duelBotEnabled;
    if (!this.duelBotEnabled) {
      this.clearAllEnemies();
    } else if (this.mpState.peers.length === 0 && this.enemies.filter((e) => e.alive).length === 0) {
      this.spawnDuelSparringBot();
    }
    this.sound.playSwitch();
    this.emitHud();
  }

  private spawnDuelSparringBot() {
    const bot = this.enemyFactory.spawnArmedZombie(
      this.worldGroup,
      0,
      -12,
      'rifle',
      2,
      'Bot 1v1 · Sparring',
      false
    );
    bot.hp = 150;
    bot.maxHp = 150;
    this.enemies.push(bot);
    this.rebuildEnemyHitboxes();
  }

  private syncRemoteAvatars() {
    const activeIds = new Set(this.mpState.peers.map((p) => p.id));
    for (const [id, handle] of this.remoteAvatars.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(handle.root);
        handle.dispose();
        this.remoteAvatars.delete(id);
      }
    }
    for (const peer of this.mpState.peers) {
      const peerSkin: CharacterSkinId = peer.skinId ?? 'soldier';
      const existing = this.remoteAvatars.get(peer.id);
      if (existing && existing.skinId !== peerSkin) {
        this.scene.remove(existing.root);
        existing.dispose();
        this.remoteAvatars.delete(peer.id);
      }
      if (!this.remoteAvatars.has(peer.id)) {
        const avatar = createRemotePlayerAvatar(peer.name, peerSkin);
        avatar.hitboxMeshes.forEach((m) => {
          m.userData.peerId = peer.id;
        });
        avatar.root.position.set(peer.x, peer.y, peer.z);
        this.scene.add(avatar.root);
        this.remoteAvatars.set(peer.id, avatar);
      }
    }

    // Hide solo sparring bot if real players join the 1v1 room
    if (this.currentMapId === 'duel' && this.mpState.peers.length > 0 && this.enemies.length > 0) {
      this.clearAllEnemies();
    }
  }

  public selectWeapon(id: WeaponId) {
    if (this.activeBuildPiece !== null) {
      this.activeBuildPiece = null;
    }
    const resolvedId = id === 'rifle' && this.unlockedWeapons.includes('sniper') ? 'sniper' : id;
    if (resolvedId === 'chicken_combo' && this.currentMapId !== 'nightcamp') return;
    const isAllowed =
      resolvedId === 'chicken_combo'
        ? this.currentMapId === 'nightcamp'
        : this.currentMapId === 'duel'
        ? resolvedId !== 'chainsaw' || this.unlockedWeapons.includes('chainsaw')
        : this.unlockedWeapons.includes(resolvedId);
    if (!isAllowed) return;
    if (resolvedId === this.activeWeaponId) {
      this.emitHud();
      return;
    }
    this.activeWeaponId = resolvedId;
    this.isReloading = false;
    this.reloadElapsed = 0;
    this.inspectTimer = 0;
    this.switchDip = -0.22;
    WEAPON_ORDER.forEach((wId) => {
      this.weapons[wId].root.visible = wId === resolvedId;
      if (this.weapons[wId].magazinePart) {
        this.weapons[wId].magazinePart!.position.y = this.weapons[wId].magazineRestY;
      }
    });
    this.sound.playSwitch();

    if (this.currentMapId === 'tutorial' && this.tutorialStep === 'weapon_reload') {
      if (!this.tutorialSwitchedWeapon) {
        this.tutorialSwitchedWeapon = true;
        this.advanceWeaponReloadCheck();
      }
    }

    this.emitHud();
  }

  public resetRange() {
    this.loadMap(this.currentMapId, true);
  }

  private advanceTutorialStep(nextStep: TutorialStepId) {
    this.tutorialStep = nextStep;
    this.tutorialProgress = 0;
    this.sound.playChickenCluck();
    this.chickenNpc?.triggerTalk();
    this.emitHud();
  }

  private advanceWeaponReloadCheck() {
    const count = Number(this.tutorialSwitchedWeapon) + Number(this.tutorialReloaded);
    this.tutorialProgress = count;
    if (count >= 2) {
      this.advanceTutorialStep('complete');
    } else {
      this.emitHud();
    }
  }

  private handlePointerLockChange() {
    const locked = document.pointerLockElement === this.renderer.domElement;
    if (!this.pointerLockFailed) {
      this.isLocked = locked;
    }
    if (!this.isLocked) {
      this.mouseDownLeft = false;
      this.isAds = false;
      this.isAimingGrenade = false;
      this.handGrenadePreview.root.visible = false;
      this.trajectoryBeads.visible = false;
      this.landingMarkerGroup.visible = false;
      this.keys = {};
    }
    this.emitHud();
  }

  private handlePointerLockError() {
    this.pointerLockFailed = true;
    this.isLocked = true;
    this.emitHud();
  }

  private handleResize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.composer) {
      this.composer.setSize(width, height);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    this.keys[e.code] = true;

    if (this.tentShopOpen) {
      if (e.code === 'Digit1' && this.currentShopOptions[0]) {
        this.selectTentUpgrade(this.currentShopOptions[0].id);
      } else if (e.code === 'Digit2' && this.currentShopOptions[1]) {
        this.selectTentUpgrade(this.currentShopOptions[1].id);
      } else if (e.code === 'Digit3' && this.currentShopOptions[2]) {
        this.selectTentUpgrade(this.currentShopOptions[2].id);
      }
      return;
    }

    if (!this.isLocked || this.isGameOver || this.hordeVictory || this.chestActive) return;

    if (e.code === 'Digit1') this.selectWeapon('pistol');
    else if (e.code === 'Digit2')
      this.selectWeapon(this.unlockedWeapons.includes('sniper') ? 'sniper' : 'rifle');
    else if (e.code === 'Digit3') this.selectWeapon('shotgun');
    else if (e.code === 'Digit4') this.selectWeapon('rocket');
    else if (e.code === 'Digit5' && this.currentMapId === 'nightcamp')
      this.selectWeapon('chicken_combo');
    else if (e.code === 'Digit6') this.selectWeapon('chainsaw');
    else if (e.code === 'KeyM' && !e.repeat && this.currentMapId === 'duel') {
      this.unlockPointer();
    } else if (e.code === 'KeyQ' && !e.repeat && this.currentMapId === 'duel') {
      if (this.activeBuildPiece !== null) {
        this.activeBuildPiece = null;
        this.sound.playSwitch();
        this.emitHud();
      }
    } else if (e.code === 'KeyC' && !e.repeat && this.currentMapId === 'duel') {
      this.selectBuildPiece('stairs');
    } else if (e.code === 'KeyX' && !e.repeat && this.currentMapId === 'duel') {
      this.selectBuildPiece('floor');
    } else if (e.code === 'KeyZ' && !e.repeat && this.currentMapId === 'duel' && !(this.activeWeaponId === 'sniper' && this.isAds)) {
      this.selectBuildPiece('ramp');
    } else if (e.code === 'KeyV' && !e.repeat && this.currentMapId === 'duel') {
      this.selectBuildPiece('wall');
    } else if (e.code === 'KeyB' && !e.repeat && this.currentMapId === 'duel') {
      this.toggleDuelBot();
    } else if (e.code === 'KeyK' && !e.repeat && this.currentMapId === 'duel') {
      this.clearDuelBuilds();
    } else if (e.code === 'KeyZ' && !e.repeat && this.activeWeaponId === 'sniper' && this.isAds) {
      this.toggleSniperZoom();
    } else if (e.code === 'KeyR') this.startReload();
    else if (e.code === 'KeyF' && !this.isReloading && !this.isAds && !this.isAimingGrenade) {
      this.inspectTimer = 1.85;
      this.sound.playSwitch();
    } else if (e.code === 'KeyG' && !e.repeat) {
      if (this.currentMapId === 'duel') {
        _rayOrigin.copy(this.camera.position);
        _rayDir.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
        this.raycaster.set(_rayOrigin, _rayDir);
        this.raycaster.far = 15;
        if (this.buildingManager.beginEditFromRay(this.raycaster)) {
          this.isEditingBuild = true;
          this.activeBuildPiece = null;
          this.isAds = false;
          this.editPaintTarget = null;
          this.hoveredEditTile = this.buildingManager.updateEditHover(this.raycaster);
          this.sound.playEditStart();
          this.emitHud();
        }
      } else {
        this.beginGrenadeAim();
      }
    } else if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
      e.preventDefault();
      if (!e.repeat) {
        this.triggerDash();
      }
    } else if (e.code === 'KeyC') {
      this.isCrouching = !this.isCrouching;
      this.emitHud();
    } else if (e.code === 'KeyV' && !e.repeat && this.captainPollo) {
      this.cycleCompanionSide();
    } else if (e.code === 'Space' && this.isGrounded) {
      this.playerVel.y = 6.3 * this.jumpMul;
      this.isGrounded = false;
      this.isCrouching = false;
      this.jumpLandDip = -0.042;
    } else if (
      e.code === 'Enter' &&
      this.currentMapId === 'tutorial' &&
      this.tutorialStep === 'complete'
    ) {
      this.callbacks.onRequestCityDeploy();
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keys[e.code] = false;
    if (e.code === 'KeyG') {
      if (this.isEditingBuild) {
        const committed = this.buildingManager.commitEdit();
        this.isEditingBuild = false;
        this.editPaintTarget = null;
        this.hoveredEditTile = -1;
        if (committed) {
          this.editsMade += 1;
          this.sound.playEditConfirm();
          if (this.mpState.inRoom) {
            this.mpClient.sendBuildEdit(committed.id, committed.editMask);
          }
        }
        this.emitHud();
      } else if (this.isAimingGrenade) {
        this.releaseGrenadeThrow();
      }
    }
  }

  private beginGrenadeAim() {
    if (this.grenadeCount <= 0 || this.isAimingGrenade) return;
    this.isAimingGrenade = true;
    this.grenadeHoldTime = 0;
    this.isAds = false;
    this.inspectTimer = 0;
    this.handGrenadePreview.root.visible = true;
    this.sound.playGrenadePin();
    this.emitHud();
  }

  private releaseGrenadeThrow() {
    if (!this.isAimingGrenade) return;
    this.isAimingGrenade = false;
    this.handGrenadePreview.root.visible = false;
    this.trajectoryBeads.visible = false;
    this.landingMarkerGroup.visible = false;

    if (this.grenadeCount <= 0) return;
    this.grenadeCount -= 1;
    this.grenadeThrowDip = 0.25;
    this.sound.playGrenadeThrow();

    const fuseRemaining = Math.max(0.45, BASE_GRENADE_FUSE - this.grenadeHoldTime * 0.55);
    this.grenadeHoldTime = 0;

    _forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    _right.set(1, 0, 0).applyQuaternion(this.camera.quaternion).normalize();

    const spawnPos = this.camera.position
      .clone()
      .addScaledVector(_forward, 0.55)
      .addScaledVector(_right, 0.18)
      .add(new THREE.Vector3(0, -0.08, 0));

    const vel = _forward
      .clone()
      .multiplyScalar(GRENADE_THROW_SPEED)
      .add(new THREE.Vector3(0, GRENADE_THROW_LIFT, 0));

    const model = createGrenadeModel();
    model.root.position.copy(spawnPos);
    this.scene.add(model.root);

    this.grenadeIdCounter += 1;
    this.activeGrenades.push({
      id: this.grenadeIdCounter,
      model,
      pos: spawnPos,
      vel,
      rotVel: new THREE.Vector3(9 + Math.random() * 5, 7, 11),
      fuseRemaining,
      fuseMax: BASE_GRENADE_FUSE,
      bounceCooldown: 0,
      owner: 'player',
      visualType: 'frag',
      damageScale: 1,
    });

    if (this.mpState.inRoom) {
      this.mpClient.sendGrenade(
        [spawnPos.x, spawnPos.y, spawnPos.z],
        [vel.x, vel.y, vel.z],
        fuseRemaining
      );
    }

    this.emitHud();
  }

  private pickDeployBoardButton(clientX: number, clientY: number): DeployBoardButton | null {
    if (!this.isMenuForestActive || this.menuCameraPreset !== 'deploy_board') return null;
    if (this.menuDeployButtons.length === 0) return null;

    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    _boardNdc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(_boardNdc, this.camera);
    this.raycaster.far = 16;

    const meshes = this.menuDeployButtons.filter((b) => b.mesh.visible).map((b) => b.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;

    const hitMesh = hits[0].object;
    return this.menuDeployButtons.find((b) => b.mesh === hitMesh && b.mesh.visible) ?? null;
  }

  private handleMouseMove(e: MouseEvent) {
    if (this.isMenuForestActive && this.menuCameraPreset === 'deploy_board') {
      const targetEl = e.target as HTMLElement | null;
      const hit = targetEl?.closest('button, input, a')
        ? null
        : this.pickDeployBoardButton(e.clientX, e.clientY);
      const nextAction = hit ? hit.action : null;
      if (nextAction !== this.lastHoveredBoardAction) {
        this.lastHoveredBoardAction = nextAction;
        this.setMenuBoardHover?.(nextAction);
        this.renderer.domElement.style.cursor =
          nextAction && nextAction !== 'locked_slot' ? 'pointer' : 'default';
        if (hit) {
          this.sound.playBoardTick(false);
          this.callbacks.onBoardHoverChange?.({
            action: hit.action,
            title: hit.title,
            description: hit.description,
          });
        } else {
          this.callbacks.onBoardHoverChange?.(null);
        }
      }
      return;
    }

    if (!this.isLocked || this.isGameOver || this.hordeVictory || this.tentShopOpen || this.chestActive) return;
    if (
      this.pointerLockFailed &&
      !this.isDraggingFallback &&
      document.pointerLockElement !== this.renderer.domElement
    ) {
      return;
    }
    const ySign = this.invertY ? -1 : 1;
    const zoomSensMul =
      this.activeWeaponId === 'sniper' && this.isAds
        ? Math.max(0.16, this.camera.fov / this.baseFov)
        : 1.0;
    this.yaw -= e.movementX * this.sensitivity * zoomSensMul;
    this.pitch -= e.movementY * this.sensitivity * ySign * zoomSensMul;
    const limit = Math.PI / 2 - 0.04;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -limit, limit);

    const swayMul = this.isAds ? 0.28 : 1.0;
    this.swayX = THREE.MathUtils.clamp(this.swayX - e.movementX * 0.00018 * swayMul, -0.04, 0.04);
    this.swayY = THREE.MathUtils.clamp(this.swayY + e.movementY * 0.00018 * swayMul, -0.035, 0.035);
  }

  private handleMouseDown(e: MouseEvent) {
    if (this.isMenuForestActive && this.menuCameraPreset === 'campfire' && e.button === 0) {
      if ((e.target as HTMLElement)?.closest('button, input, a')) return;
      if (this.menuCaptainPolloMeshes.length > 0) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          _boardNdc.set(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
          );
          this.raycaster.setFromCamera(_boardNdc, this.camera);
          this.raycaster.far = 18;
          const hits = this.raycaster.intersectObjects(this.menuCaptainPolloMeshes, false);
          if (hits.length > 0) {
            this.titlePolloClicks += 1;
            this.triggerMenuPolloHop?.();
            if (this.titlePolloClicks >= 3) {
              this.titlePolloClicks = 0;
              this.sound.playChickenCluck();
              this.callbacks.onRequestDeployMapFromBoard?.('nightcamp');
            } else {
              this.sound.playCaptainPolloSqawk();
            }
          }
        }
      }
      return;
    }

    if (this.isMenuForestActive && this.menuCameraPreset === 'deploy_board' && e.button === 0) {
      if ((e.target as HTMLElement)?.closest('button, input, a')) return;
      const hit = this.pickDeployBoardButton(e.clientX, e.clientY);
      if (hit) {
        if (hit.action === 'locked_slot') {
          this.sound.playBoardTick(false);
          return;
        }
        this.sound.playBoardTick(true);
        if (hit.action === 'back') {
          this.callbacks.onRequestBackToMenuFromBoard?.();
        } else if (hit.action === 'to_extras') {
          this.setMenuBoardPage?.('extras');
          this.lastHoveredBoardAction = null;
          this.setMenuBoardHover?.(null);
          this.callbacks.onBoardHoverChange?.(null);
          this.renderer.domElement.style.cursor = 'default';
        } else if (hit.action === 'to_main') {
          this.setMenuBoardPage?.('main');
          this.lastHoveredBoardAction = null;
          this.setMenuBoardHover?.(null);
          this.callbacks.onBoardHoverChange?.(null);
          this.renderer.domElement.style.cursor = 'default';
        } else {
          this.callbacks.onRequestDeployMapFromBoard?.(hit.action);
        }
      }
      return;
    }

    if (this.chestActive && this.chestStage === 'waiting_click' && e.button === 0) {
      if ((e.target as HTMLElement)?.closest('button, input')) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      this.raycaster.setFromCamera(ndc, this.camera);
      this.raycaster.far = 20;
      if (this.rewardChest) {
        const hits = this.raycaster.intersectObjects(this.rewardChest.hitMeshes, false);
        if (hits.length > 0) {
          this.openRewardChest();
        }
      }
      return;
    }

    if (!this.isLocked || this.isGameOver || this.hordeVictory || this.tentShopOpen || this.chestActive) return;
    if ((e.target as HTMLElement)?.closest('button, input')) return;

    if (e.button === 0) {
      if (this.isEditingBuild) {
        this.mouseDownLeft = true;
        this.isDraggingFallback = true;
        if (this.hoveredEditTile >= 0) {
          const cur = this.buildingManager.getDraftTileValue(this.hoveredEditTile);
          this.editPaintTarget = cur === null ? false : !cur;
          if (this.buildingManager.toggleEditTile(this.hoveredEditTile, this.editPaintTarget)) {
            this.sound.playEditTile();
          }
        }
        return;
      }
      if (this.activeBuildPiece !== null && this.currentMapId === 'duel') {
        this.placeCurrentBuildPiece();
        return;
      }
      if (this.isAimingGrenade) {
        this.releaseGrenadeThrow();
        return;
      }
      this.mouseDownLeft = true;
      this.isDraggingFallback = true;
      this.tryShoot(true);
    } else if (e.button === 2) {
      if (this.isEditingBuild) {
        this.buildingManager.resetDraftMask();
        this.sound.playEditTile();
        return;
      }
      if (this.activeBuildPiece !== null) {
        this.activeBuildPiece = null;
        this.sound.playSwitch();
        this.emitHud();
        return;
      }
      if (this.isAimingGrenade) {
        // Cancel grenade throw
        this.isAimingGrenade = false;
        this.grenadeHoldTime = 0;
        this.handGrenadePreview.root.visible = false;
        this.trajectoryBeads.visible = false;
        this.landingMarkerGroup.visible = false;
        this.emitHud();
        return;
      }
      this.isAds = true;
      this.inspectTimer = 0;
      this.emitHud();
    }
  }

  private placeCurrentBuildPiece() {
    if (!this.activeBuildPiece || this.currentMapId !== 'duel') return;
    const { gx, gy, gz, dir } = this.buildingManager.computePlacement(
      this.activeBuildPiece,
      this.playerPos,
      this.yaw,
      this.pitch
    );
    if (this.buildingManager.hasPieceAt(this.activeBuildPiece, gx, gy, gz, dir)) return;
    this.duelBuildIdCounter += 1;
    const id = `${this.mpState.playerId ?? 'local'}-${Date.now()}-${this.duelBuildIdCounter}`;
    const piece = {
      id,
      type: this.activeBuildPiece,
      gx,
      gy,
      gz,
      dir,
      editMask: getDefaultEditMask(this.activeBuildPiece),
      hp: BUILD_MAX_HP,
      maxHp: BUILD_MAX_HP,
      ownerId: this.mpState.playerId ?? 'local',
    };
    this.buildingManager.addOrReplacePiece(piece);
    this.buildsPlaced += 1;
    this.sound.playBuildPlace();
    if (this.mpState.inRoom) {
      this.mpClient.sendBuildPlace(piece);
    }
    this.emitHud();
  }

  private handleMouseUp(e: MouseEvent) {
    if (e.button === 0) {
      this.mouseDownLeft = false;
      this.isDraggingFallback = false;
      this.editPaintTarget = null;
    } else if (e.button === 2) {
      this.isAds = false;
      this.emitHud();
    }
  }

  private handleWheel(e: WheelEvent) {
    if (!this.isLocked || this.isGameOver || this.hordeVictory || this.tentShopOpen || this.chestActive) return;
    if (this.activeWeaponId === 'sniper' && this.isAds) {
      this.toggleSniperZoom();
      return;
    }
    const pool = this.getSelectableWeapons();
    const currentIdx = pool.indexOf(this.activeWeaponId);
    const safeIdx = currentIdx >= 0 ? currentIdx : 0;
    const dir = e.deltaY > 0 ? 1 : -1;
    const nextIdx = (safeIdx + dir + pool.length) % pool.length;
    this.selectWeapon(pool[nextIdx]);
  }

  private startReload() {
    if (this.isReloading || this.activeWeaponId === 'chainsaw') return;
    const maxMag = this.getMaxAmmo(this.activeWeaponId);
    if (this.ammoByWeapon[this.activeWeaponId] >= maxMag) return;
    this.isReloading = true;
    this.reloadElapsed = 0;
    this.isAds = false;
    this.inspectTimer = 0;
    this.sound.playReload(this.activeWeaponId);

    if (this.currentMapId === 'tutorial' && this.tutorialStep === 'weapon_reload') {
      if (!this.tutorialReloaded) {
        this.tutorialReloaded = true;
        this.advanceWeaponReloadCheck();
      }
    }

    this.emitHud();
  }

  private applyEnemyDamage(
    enemy: ActiveEnemy,
    dmg: number,
    hitZone: 'head' | 'body',
    impactX: number,
    fromNetwork = false
  ): 'body' | 'head' | 'kill' {
    if (!fromNetwork && this.mpState.inRoom && !this.mpState.isHost) {
      this.mpClient.sendEnemyDamage(enemy.id, dmg, hitZone);
    }

    const applied = Math.min(enemy.hp, dmg);
    if (!fromNetwork && applied > 0) {
      this.damageDealt += applied;
    }

    enemy.hp = Math.max(0, enemy.hp - dmg);
    enemy.hitFlashTimer = 0.1;

    const localOffset = impactX - enemy.root.position.x;
    enemy.staggerX = hitZone === 'head' ? -0.2 : -0.28;
    enemy.staggerY = THREE.MathUtils.clamp(-localOffset * 0.9, -0.45, 0.45);
    if (hitZone === 'head') {
      enemy.headFlinch = -0.55;
    }

    enemy.flashMaterials.forEach((m) => m.emissive.setHex(0x881313));
    this.lastDamagedEnemy = enemy;
    this.lastDamagedTimer = 3.2;

    if (enemy.hp <= 0) {
      enemy.alive = false;
      enemy.collapseProgress = 0;
      enemy.muzzleFlashes.forEach((f) => {
        f.visible = false;
      });
      this.rebuildEnemyHitboxes();
      this.kills += 1;
      this.hordeDefeatedInWave += 1;
      this.lastEliminationName = enemy.label;
      this.eliminationBannerTimer = 2.6;

      if (this.vampirismHeal > 0) {
        this.health = Math.min(this.maxHealth, this.health + this.vampirismHeal);
      }

      if (enemy.isBoss) {
        this.sound.playExplosion();
        this.cameraShake = Math.max(this.cameraShake, 0.65);
        this.spawnImpactSparks(
          enemy.root.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
          'explosion'
        );
      } else if (enemy.isNextbot) {
        this.sound.playNextbotSlap();
      } else {
        this.sound.playZombieGroan(true);
      }

      if (
        (this.currentMapId === 'city' ||
          this.currentMapId === 'desert' ||
          this.currentMapId === 'cubes' ||
          this.currentMapId === 'pixel' ||
          this.currentMapId === 'pueblo' ||
          this.currentMapId === 'nightcamp') &&
        this.hordeDefeatedInWave >= this.hordeTotalInWave
      ) {
        const mapMaxWaves = this.getMaxWavesForMap();
        if (this.hordeWave >= mapMaxWaves) {
          if (this.currentMapId === 'city' && !this.unlockedWeapons.includes('rocket')) {
            this.startChestCeremony('rocket');
          } else if (this.currentMapId === 'cubes' && !this.unlockedWeapons.includes('sniper')) {
            this.startChestCeremony(!this.petUnlocked ? 'cubes_bundle' : 'sniper');
          } else if (this.currentMapId === 'cubes' && !this.petUnlocked) {
            this.startChestCeremony('pet');
          } else if (this.currentMapId === 'nightcamp' && !this.unlockedWeapons.includes('chainsaw')) {
            this.startChestCeremony('chainsaw');
          } else {
            this.hordeVictory = true;
            this.unlockPointer();
          }
        } else {
          this.hordeIntermissionTimer = 2.6;
        }
      }
      return 'kill';
    }

    return hitZone === 'head' ? 'head' : 'body';
  }

  private tryShoot(isInitialPress: boolean) {
    if (this.isReloading || this.isGameOver || this.hordeVictory || this.tentShopOpen || this.chestActive) return;
    const spec = WEAPON_SPECS[this.activeWeaponId];
    if (spec.fireMode === 'semi' && !isInitialPress) return;

    const now = performance.now();
    const minIntervalMs =
      this.currentMapId === 'nightcamp'
        ? Math.max(26, spec.fireRateMs * this.fireRateMul)
        : spec.fireRateMs * this.fireRateMul;
    if (now - this.lastShotTime < minIntervalMs) return;

    // Motosierra: melee infinito sin consumo de munición ni recarga
    if (this.activeWeaponId === 'chainsaw') {
      this.lastShotTime = now;
      this.shotsFired += 1;
      this.inspectTimer = 0;
      this.recoilOffsetZ += spec.recoilKickZ * 0.65;
      this.cameraShake = Math.max(this.cameraShake, 0.035);

      const sawRange = 3.45;
      _rayOrigin.copy(this.camera.position);
      _rayDir.set(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
      this.raycaster.set(_rayOrigin, _rayDir);
      this.raycaster.far = sawRange;

      let hitTarget = false;
      let bestHit: 'none' | 'body' | 'head' | 'kill' = 'none';

      // Check Duel remote peers in melee reach
      if (this.currentMapId === 'duel' && this.remoteAvatars.size > 0) {
        const remoteMeshes: THREE.Mesh[] = [];
        this.remoteAvatars.forEach((av) => {
          av.hitboxMeshes.forEach((m) => remoteMeshes.push(m));
        });
        const peerHits = this.raycaster.intersectObjects(remoteMeshes, false);
        if (peerHits.length > 0) {
          const pHit = peerHits[0];
          const peerId = pHit.object.userData.peerId as string | undefined;
          const hitZone = (pHit.object.userData.hitZone as 'head' | 'body' | undefined) ?? 'body';
          if (peerId) {
            hitTarget = true;
            const dmg = Math.round((hitZone === 'head' ? spec.damageHead : spec.damageBody) * this.damageMul);
            this.damageDealt += dmg;
            bestHit = hitZone === 'head' ? 'head' : 'body';
            this.spawnImpactSparks(pHit.point, 'enemy');
            this.mpClient.sendPvpHit(peerId, dmg, hitZone);
          }
        }
      }

      // Sweep enemies in close forward cone + direct ray
      let sawHitEnemy: ActiveEnemy | null = null;
      let sawHitPoint: THREE.Vector3 | null = null;
      let sawHitZone: 'head' | 'body' = 'body';
      const eHits = this.raycaster.intersectObjects(this.enemyHitboxes, false);
      if (eHits.length > 0) {
        const found = this.enemies.find((en) => en.id === eHits[0].object.userData.enemyId);
        if (found && found.alive) {
          sawHitEnemy = found;
          sawHitPoint = eHits[0].point.clone();
          sawHitZone = (eHits[0].object.userData.hitZone as 'head' | 'body') ?? 'body';
        }
      }
      if (!sawHitEnemy) {
        let bestDist = sawRange;
        for (let i = 0; i < this.enemies.length; i++) {
          const cand = this.enemies[i];
          if (!cand.alive) continue;
          const dx = cand.root.position.x - this.playerPos.x;
          const dz = cand.root.position.z - this.playerPos.z;
          const d = Math.hypot(dx, dz) - cand.collisionRadius * 0.7;
          if (d <= sawRange && d < bestDist) {
            const dot = (dx * _rayDir.x + dz * _rayDir.z) / Math.max(0.1, Math.hypot(dx, dz));
            if (dot > 0.35) {
              bestDist = d;
              sawHitEnemy = cand;
              sawHitPoint = cand.root.position.clone().add(new THREE.Vector3(0, 1.15, 0));
              sawHitZone = 'body';
            }
          }
        }
      }

      if (sawHitEnemy && sawHitPoint) {
        hitTarget = true;
        const baseDmg =
          sawHitZone === 'head' ? spec.damageHead * this.headshotMul : spec.damageBody;
        const dmg = Math.round(baseDmg * this.damageMul);
        const res = this.applyEnemyDamage(sawHitEnemy, dmg, sawHitZone, sawHitPoint.x);
        bestHit = res;
        this.spawnImpactSparks(sawHitPoint, 'enemy');
        if (sawHitEnemy.alive) {
          this.sound.playZombieGroan(false);
        }
      } else if (this.currentMapId === 'duel') {
        const buildMeshes = this.buildingManager.getRaycastHitMeshes();
        const buildHits = buildMeshes.length > 0 ? this.raycaster.intersectObjects(buildMeshes, false) : [];
        if (buildHits.length > 0) {
          hitTarget = true;
          const bId = buildHits[0].object.userData?.buildId as string | undefined;
          this.spawnImpactSparks(buildHits[0].point, 'metal');
          if (bId) {
            const bDmg = Math.round(spec.damageBody * 1.4);
            const res = this.buildingManager.damagePiece(bId, bDmg);
            if (res?.destroyed) this.sound.playBuildBreak();
            if (this.mpState.inRoom) this.mpClient.sendBuildDamage(bId, bDmg);
          }
        }
      } else if (this.currentMapId === 'tutorial') {
        const tHits = this.raycaster.intersectObjects(this.targetHitboxes, false);
        if (tHits.length > 0) {
          const tId = tHits[0].object.userData.targetId as string;
          const tObj = this.targets.find((t) => t.id === tId);
          if (tObj) {
            hitTarget = true;
            bestHit = 'body';
            tObj.hitTilt = -0.38;
            tObj.hitFlashTimer = 0.14;
            tObj.faceMat.emissive.setHex(0x991b1b);
            this.sound.playTargetClang(tObj.isMoving);
            this.spawnImpactSparks(tHits[0].point, 'metal');
          }
        }
      }

      if (hitTarget) {
        this.shotsHit += 1;
        this.cameraShake = Math.max(this.cameraShake, 0.08);
        if (bestHit !== 'none') {
          this.hitmarkerType = bestHit;
          this.hitmarkerTimer = 0.16;
          this.sound.playHit(bestHit);
        }
      }
      this.sound.playChainsawCut(hitTarget);
      this.emitHud();
      return;
    }

    const ammo = this.ammoByWeapon[this.activeWeaponId];
    if (ammo <= 0) {
      if (isInitialPress) {
        this.sound.playDryFire();
        this.startReload();
      }
      return;
    }

    this.lastShotTime = now;
    this.ammoByWeapon[this.activeWeaponId] = ammo - 1;
    this.shotsFired += 1;
    this.inspectTimer = 0;

    this.recoilOffsetZ += spec.recoilKickZ * this.recoilMul;
    this.recoilOffsetY += spec.recoilKickY * this.recoilMul;
    this.recoilPitch += spec.cameraKickPitch * this.recoilMul * (this.isAds ? 0.65 : 1.0);
    this.recoilRoll += (Math.random() - 0.5) * 0.06 * this.recoilMul;
    this.movingPartKick = 1.0;
    this.triggerKick = 1.0;
    this.hammerKick = 1.0;
    if (this.activeWeaponId === 'shotgun') {
      this.shotgunPumpTimer = 0.42;
      this.cameraShake = Math.max(this.cameraShake, 0.11);
    } else if (this.activeWeaponId === 'sniper') {
      this.sniperBoltTimer = 0.58;
      this.cameraShake = Math.max(this.cameraShake, 0.14);
    }

    const activeModel = this.weapons[this.activeWeaponId];
    activeModel.muzzleFlash.visible = true;
    activeModel.muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
    this.muzzleLight.color.setHex(spec.muzzleColor);
    this.muzzleLight.intensity = 7.2;
    this.muzzleFlashTimer = 0.052;

    this.sound.playShoot(this.activeWeaponId);

    activeModel.muzzlePoint.getWorldPosition(_muzzleWorld);
    this.spawnMuzzleSmoke(_muzzleWorld);

    if (this.activeWeaponId === 'rocket') {
      this.cameraShake = Math.max(this.cameraShake, 0.16);
      this.fireRocketProjectile();
      if (this.ammoByWeapon[this.activeWeaponId] === 0) {
        this.startReload();
      }
      this.emitHud();
      return;
    }

    // "The Chiken Combinacion" fires a fast micro-rocket alongside its multi-barrel volley!
    if (this.activeWeaponId === 'chicken_combo') {
      this.fireRocketProjectile(true);
    }

    activeModel.ejectionPort.getWorldPosition(_ejectWorld);
    this.spawnShellCasing(_ejectWorld, this.activeWeaponId);

    const baseSpread = this.isAds ? spec.spreadAds : spec.spreadHip;
    const crouchMul = this.isCrouching ? 0.72 : 1.0;
    const spread = baseSpread * crouchMul * this.spreadMul;

    let anyHit = false;
    let bestHitType: 'none' | 'body' | 'head' | 'kill' = 'none';
    let playedSurfaceSound = false;

    for (let p = 0; p < spec.pellets; p++) {
      _rayOrigin.copy(this.camera.position);
      _rayDir.set(
        (Math.random() - 0.5) * 2 * spread,
        (Math.random() - 0.5) * 2 * spread,
        -1
      );
      _rayDir.normalize().applyQuaternion(this.camera.quaternion);

      this.raycaster.set(_rayOrigin, _rayDir);
      this.raycaster.far = 150;

      const obsHits = this.raycaster.intersectObjects(this.obstacles, false);
      const buildMeshes = this.currentMapId === 'duel' ? this.buildingManager.getRaycastHitMeshes() : [];
      const buildHits = buildMeshes.length > 0 ? this.raycaster.intersectObjects(buildMeshes, false) : [];
      const obsMaxDist = obsHits.length > 0 ? obsHits[0].distance : 150;
      const buildMaxDist = buildHits.length > 0 ? buildHits[0].distance : 150;
      const maxDist = Math.min(obsMaxDist, buildMaxDist);

      let hitTargetPoint: THREE.Vector3 | null = null;
      let hitSurface: 'enemy' | 'metal' | 'concrete' = 'concrete';

      if (this.currentMapId === 'tutorial') {
        const targetHits = this.raycaster.intersectObjects(this.targetHitboxes, false);
        if (targetHits.length > 0 && targetHits[0].distance <= maxDist) {
          const hit = targetHits[0];
          const targetId = hit.object.userData.targetId as string;
          const targetObj = this.targets.find((t) => t.id === targetId);
          if (targetObj) {
            anyHit = true;
            hitSurface = 'metal';
            hitTargetPoint = hit.point;
            targetObj.hitTilt = -0.35;
            targetObj.hitFlashTimer = 0.12;
            targetObj.faceMat.emissive.setHex(0x991b1b);

            if (!playedSurfaceSound) {
              this.sound.playTargetClang(targetObj.isMoving);
              playedSurfaceSound = true;
            }
            bestHitType = targetObj.isMoving ? 'head' : 'body';

            if (this.tutorialStep === 'static_targets' && !targetObj.isMoving) {
              this.tutorialProgress += 1;
              if (this.tutorialProgress >= 3) {
                this.advanceTutorialStep('moving_targets');
              }
            } else if (this.tutorialStep === 'moving_targets' && targetObj.isMoving) {
              this.tutorialProgress += 1;
              if (this.tutorialProgress >= 3) {
                this.advanceTutorialStep('weapon_reload');
              }
            }
          }
        }
      } else {
        // Check remote PvP players on Duel 1v1 arena
        let hitRemotePeer = false;
        if (this.currentMapId === 'duel' && this.remoteAvatars.size > 0) {
          const remoteMeshes: THREE.Mesh[] = [];
          this.remoteAvatars.forEach((av) => {
            av.hitboxMeshes.forEach((m) => remoteMeshes.push(m));
          });
          const peerHits = this.raycaster.intersectObjects(remoteMeshes, false);
          if (peerHits.length > 0 && peerHits[0].distance <= maxDist) {
            const pHit = peerHits[0];
            const peerId = pHit.object.userData.peerId as string | undefined;
            const hitZone = (pHit.object.userData.hitZone as 'head' | 'body' | undefined) ?? 'body';
            if (peerId) {
              hitRemotePeer = true;
              anyHit = true;
              hitSurface = 'enemy';
              hitTargetPoint = pHit.point;
              const dmg = Math.round((hitZone === 'head' ? spec.damageHead : spec.damageBody) * this.damageMul);
              this.damageDealt += dmg;
              if (hitZone === 'head') {
                this.headshots += 1;
                bestHitType = 'head';
              } else if (bestHitType === 'none') {
                bestHitType = 'body';
              }
              this.mpClient.sendPvpHit(peerId, dmg, hitZone);
            }
          }
        }

        const enemyHits = !hitRemotePeer ? this.raycaster.intersectObjects(this.enemyHitboxes, false) : [];
        if (enemyHits.length > 0 && enemyHits[0].distance <= maxDist) {
          const hit = enemyHits[0];
          const enemyId = hit.object.userData.enemyId as string;
          const hitZone = hit.object.userData.hitZone as 'head' | 'body';
          const enemy = this.enemies.find((en) => en.id === enemyId);

          if (enemy && enemy.alive) {
            anyHit = true;
            hitSurface = enemy.isBoss && hitZone !== 'head' ? 'metal' : 'enemy';
            hitTargetPoint = hit.point;

            const baseDmg =
              hitZone === 'head' ? spec.damageHead * this.headshotMul : spec.damageBody;
            const dmg = Math.round(baseDmg * this.damageMul);
            const result = this.applyEnemyDamage(enemy, dmg, hitZone, hit.point.x);

            if (result === 'head') {
              this.headshots += 1;
              if (bestHitType !== 'kill') bestHitType = 'head';
            } else if (result === 'kill') {
              bestHitType = 'kill';
            } else if (bestHitType === 'none') {
              bestHitType = 'body';
            }

            if (enemy.alive && p === 0) {
              if (enemy.isBoss && hitZone !== 'head') {
                this.sound.playSurfaceImpact('metal');
              } else {
                this.sound.playZombieGroan(false);
              }
            }
          }
        }
      }

      if (!hitTargetPoint && buildHits.length > 0 && buildHits[0].distance <= obsMaxDist) {
        const bHit = buildHits[0];
        hitTargetPoint = bHit.point;
        hitSurface = 'concrete';
        const buildId = bHit.object.userData?.buildId as string | undefined;
        if (buildId) {
          const dmg = Math.round(spec.damageBody * 0.75);
          const dmgRes = this.buildingManager.damagePiece(buildId, dmg);
          if (dmgRes?.destroyed) {
            this.sound.playBuildBreak();
          } else if (!playedSurfaceSound) {
            this.sound.playSurfaceImpact('concrete');
            playedSurfaceSound = true;
          }
          if (this.mpState.inRoom) {
            this.mpClient.sendBuildDamage(buildId, dmg);
          }
        }
      } else if (!hitTargetPoint && obsHits.length > 0) {
        hitTargetPoint = obsHits[0].point;
        hitSurface = obsHits[0].object.userData?.surface === 'metal' ? 'metal' : 'concrete';
        if (!playedSurfaceSound) {
          this.sound.playSurfaceImpact(hitSurface);
          playedSurfaceSound = true;
        }
      }

      const endPoint = hitTargetPoint
        ? hitTargetPoint
        : _rayOrigin.clone().addScaledVector(_rayDir, 85);

      this.spawnTracer(_muzzleWorld, endPoint, 'player');
      if (p === 0 && this.mpState.inRoom) {
        this.mpClient.sendShoot(
          [_muzzleWorld.x, _muzzleWorld.y, _muzzleWorld.z],
          [endPoint.x, endPoint.y, endPoint.z],
          this.activeWeaponId
        );
      }
      if (hitTargetPoint) {
        this.spawnImpactSparks(hitTargetPoint, hitSurface);
      }
    }

    if (anyHit) {
      this.shotsHit += 1;
    }

    if (bestHitType !== 'none') {
      this.hitmarkerType = bestHitType;
      this.hitmarkerTimer = 0.16;
      this.sound.playHit(bestHitType);
    }

    if (this.ammoByWeapon[this.activeWeaponId] === 0) {
      this.startReload();
    }

    this.emitHud();
  }

  private spawnTracer(
    start: THREE.Vector3,
    end: THREE.Vector3,
    source: 'player' | 'enemy' | 'koopa_laser'
  ) {
    const dist = start.distanceTo(end);
    if (dist < 0.4) return;
    const baseMat =
      source === 'koopa_laser'
        ? this.tracerMatKoopaLaser
        : source === 'enemy'
        ? this.tracerMatEnemy
        : this.damageMul > 1.05
        ? this.tracerMatUpgraded
        : this.tracerMatPlayer;
    const mesh = new THREE.Mesh(this.tracerGeo, baseMat.clone());
    _tracerMid.copy(start).lerp(end, 0.5);
    mesh.position.copy(_tracerMid);
    const widthScale = source === 'koopa_laser' ? 2.2 : source === 'enemy' ? 1.5 : 1.15;
    mesh.scale.set(widthScale, widthScale, dist);
    mesh.lookAt(end);
    this.scene.add(mesh);
    const maxLife = source === 'koopa_laser' ? 0.16 : source === 'enemy' ? 0.095 : 0.068;
    this.tracers.push({ mesh, life: maxLife, maxLife });
  }

  private spawnImpactSparks(
    point: THREE.Vector3,
    surface: 'enemy' | 'metal' | 'concrete' | 'explosion'
  ) {
    const count = surface === 'explosion' ? 22 : surface === 'metal' ? 6 : surface === 'enemy' ? 5 : 4;
    const mat =
      surface === 'explosion'
        ? this.sparkMatExplosion
        : surface === 'enemy'
        ? this.sparkMatEnemy
        : surface === 'metal'
        ? this.sparkMatMetal
        : this.sparkMatConcrete;

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.copy(point);
      if (surface === 'explosion') mesh.scale.setScalar(2.1);
      this.scene.add(mesh);
      const speedMul = surface === 'explosion' ? 13.5 : surface === 'metal' ? 6.2 : 3.8;
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * speedMul,
        Math.random() * (surface === 'explosion' ? 9.5 : 3.8) + 1.2,
        (Math.random() - 0.5) * speedMul
      );
      const life = surface === 'explosion' ? 0.55 : 0.25;
      this.sparks.push({ mesh, vel, life, maxLife: life });
    }
  }

  private spawnMuzzleSmoke(origin: THREE.Vector3, scale = 1.0) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xcbd5e1,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.smokeGeo, mat);
    mesh.position.copy(origin);
    mesh.scale.setScalar(scale);
    this.scene.add(mesh);
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.55 * scale,
      (0.55 + Math.random() * 0.4) * scale,
      (Math.random() - 0.5) * 0.55 * scale
    );
    this.smokes.push({ mesh, vel, life: 0.45 * Math.min(2, scale), maxLife: 0.45 * Math.min(2, scale) });
  }

  private spawnShellCasing(origin: THREE.Vector3, weaponId: WeaponId) {
    const mat = weaponId === 'shotgun' ? this.shellMatRed : this.shellMatBrass;
    const mesh = new THREE.Mesh(this.shellGeo, mat);
    if (weaponId === 'shotgun') mesh.scale.set(1.5, 1.5, 1.8);
    mesh.position.copy(origin);
    this.scene.add(mesh);

    _right.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const vel = new THREE.Vector3()
      .addScaledVector(_right, 1.8 + Math.random() * 1.1)
      .add(new THREE.Vector3(0, 1.4 + Math.random() * 0.6, 0));

    this.shells.push({
      mesh,
      vel,
      rotVel: new THREE.Vector3(12 + Math.random() * 8, 9, 14),
      life: 1.6,
    });
  }

  private collidesPointWithBox(x: number, y: number, z: number, pad = 0.1): boolean {
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (y < c.maxY && x + pad > c.minX && x - pad < c.maxX && z + pad > c.minZ && z - pad < c.maxZ) {
        return true;
      }
    }
    return false;
  }

  private updateGrenadeTrajectoryPreview() {
    if (!this.isAimingGrenade) {
      this.trajectoryBeads.visible = false;
      this.landingMarkerGroup.visible = false;
      return;
    }

    _forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    _right.set(1, 0, 0).applyQuaternion(this.camera.quaternion).normalize();

    _arcPos
      .copy(this.camera.position)
      .addScaledVector(_forward, 0.55)
      .addScaledVector(_right, 0.18);
    _arcPos.y -= 0.08;

    _arcVel.copy(_forward).multiplyScalar(GRENADE_THROW_SPEED);
    _arcVel.y += GRENADE_THROW_LIFT;

    const dtStep = 0.075;
    let hitFound = false;
    let landingX = _arcPos.x;
    let landingY = 0.05;
    let landingZ = _arcPos.z;

    for (let i = 0; i < TRAJECTORY_BEAD_COUNT; i++) {
      if (!hitFound) {
        const nextX = _arcPos.x + _arcVel.x * dtStep;
        const nextY = _arcPos.y + _arcVel.y * dtStep - 0.5 * GRENADE_GRAVITY * dtStep * dtStep;
        const nextZ = _arcPos.z + _arcVel.z * dtStep;
        _arcVel.y -= GRENADE_GRAVITY * dtStep;

        const floorY = this.groundHeightAt(nextX);
        if (nextY <= floorY + 0.08 || this.collidesPointWithBox(nextX, nextY, nextZ, 0.12)) {
          hitFound = true;
          landingX = nextX;
          landingY = Math.max(floorY + 0.05, nextY);
          landingZ = nextZ;
          _arcPos.set(landingX, landingY, landingZ);
        } else {
          _arcPos.set(nextX, nextY, nextZ);
          landingX = nextX;
          landingY = Math.max(floorY + 0.05, nextY);
          landingZ = nextZ;
        }
      }

      _arcDummy.position.copy(_arcPos);
      const scale = hitFound ? 0.001 : 1.0 - (i / TRAJECTORY_BEAD_COUNT) * 0.45;
      _arcDummy.scale.setScalar(scale);
      _arcDummy.updateMatrix();
      this.trajectoryBeads.setMatrixAt(i, _arcDummy.matrix);
    }

    this.trajectoryBeads.instanceMatrix.needsUpdate = true;
    this.trajectoryBeads.visible = true;

    const blastR = this.getGrenadeBlastRadius();
    this.landingMarkerGroup.position.set(landingX, this.groundHeightAt(landingX) + 0.04, landingZ);
    this.landingMarkerGroup.scale.setScalar(blastR);
    this.landingMarkerGroup.rotation.y = this.elapsed * 1.4;
    this.landingMarkerGroup.visible = true;
  }

  private detonateGrenade(g: ActiveGrenade) {
    const center = g.pos.clone();
    const isEnemyTire = g.owner === 'enemy';
    const isPet = g.owner === 'pet';
    const radius = isEnemyTire ? 4.6 : this.getGrenadeBlastRadius() * (isPet ? 0.92 : 1.0);
    const maxDmg = (isPet ? 185 : 215 * this.grenadeDamageMul) * g.damageScale;

    this.sound.playExplosion();
    this.cameraShake = Math.max(this.cameraShake, isEnemyTire ? 0.45 : 0.55);

    // Fiery 3D blast visuals (red tint for enemy explosive tires)
    const coreMat = new THREE.MeshBasicMaterial({
      color: isEnemyTire ? 0xef4444 : 0xffb703,
      transparent: true,
      opacity: 0.95,
    });
    const coreMesh = new THREE.Mesh(this.explosionCoreGeo, coreMat);
    coreMesh.position.copy(center);
    this.scene.add(coreMesh);

    const ringMat = new THREE.MeshBasicMaterial({
      color: isEnemyTire ? 0xdc2626 : 0xff5400,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(this.explosionRingGeo, ringMat);
    ringMesh.position.set(center.x, this.groundHeightAt(center.x) + 0.08, center.z);
    this.scene.add(ringMesh);

    const light = new THREE.PointLight(isEnemyTire ? 0xff3b30 : 0xff7b00, 18, radius * 3.2, 1.4);
    light.position.set(center.x, center.y + 0.8, center.z);
    this.scene.add(light);

    this.explosions.push({
      coreMesh,
      ringMesh,
      light,
      life: 0.48,
      maxLife: 0.48,
      maxRadius: radius,
    });

    this.spawnImpactSparks(center, 'explosion');
    for (let s = 0; s < 5; s++) {
      this.spawnMuzzleSmoke(
        center.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.4, 0.4, (Math.random() - 0.5) * 1.4)),
        3.4
      );
    }

    if (isEnemyTire) {
      // Explosive tire thrown by Transformer Trucks damages the player
      const distPlayer = this.playerPos.distanceTo(center);
      if (distPlayer <= radius && !this.isGameOver && !this.hordeVictory) {
        const tireDmg = Math.max(5, Math.round(26 * (1 - distPlayer / radius)));
        this.health = Math.max(0, this.health - tireDmg);
        this.timeSinceDamaged = 0;
        this.damageFlash = 1.0;
        this.sound.playPlayerHurt();
        if (this.health <= 0) {
          this.isGameOver = true;
          this.mouseDownLeft = false;
          this.unlockPointer();
        }
      }
      return;
    }

    // Area-of-Effect damage to Enemies & Boss
    let killedThisBlast = 0;
    let hitAny = false;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const en = this.enemies[i];
      if (!en.alive) continue;
      const ePos = en.root.position;
      const dist = Math.hypot(ePos.x - center.x, ePos.z - center.z);
      if (dist <= radius + en.collisionRadius * 0.5) {
        hitAny = true;
        const falloff = Math.max(0.35, 1 - dist / (radius + en.collisionRadius));
        const dmg = Math.round(maxDmg * falloff);
        const res = this.applyEnemyDamage(en, dmg, 'body', center.x);
        if (res === 'kill') {
          killedThisBlast += 1;
        } else if (this.grenadeStunSec > 0) {
          en.stunTimer = Math.max(en.stunTimer ?? 0, this.grenadeStunSec);
        }
      }
    }

    // Also ring Tutorial targets in Tutorial map for fun practice
    if (this.currentMapId === 'tutorial') {
      for (let i = 0; i < this.targets.length; i++) {
        const tgt = this.targets[i];
        tgt.hitboxMesh.getWorldPosition(_projVec);
        if (Math.hypot(_projVec.x - center.x, _projVec.z - center.z) <= radius + 1.0) {
          tgt.hitTilt = -0.5;
          tgt.hitFlashTimer = 0.2;
          tgt.faceMat.emissive.setHex(0x991b1b);
          this.sound.playTargetClang(true);
          hitAny = true;
        }
      }
    }

    if (killedThisBlast >= 2) {
      this.multiKillBanner = isPet
        ? `¡CAPITÁN POLLO ×${killedThisBlast}!`
        : `¡BAJA MÚLTIPLE ×${killedThisBlast}!`;
      this.multiKillTimer = 2.6;
    }

    if (hitAny) {
      this.hitmarkerType = killedThisBlast > 0 ? 'kill' : 'body';
      this.hitmarkerTimer = 0.22;
      this.sound.playHit(killedThisBlast > 0 ? 'kill' : 'body');
    }

    // Self-damage check if player throws own grenade right at their feet (not pet grenades)
    const distPlayer = this.playerPos.distanceTo(center);
    if (
      !isPet &&
      distPlayer < radius * 0.72 &&
      (this.currentMapId === 'city' ||
        this.currentMapId === 'desert' ||
        this.currentMapId === 'cubes' ||
        this.currentMapId === 'pixel' ||
        this.currentMapId === 'pueblo') &&
      !this.isGameOver
    ) {
      const selfDmg = Math.round(24 * (1 - distPlayer / (radius * 0.72)));
      if (selfDmg > 0) {
        this.health = Math.max(0, this.health - selfDmg);
        this.timeSinceDamaged = 0;
        this.damageFlash = 1.0;
        this.sound.playPlayerHurt();
        if (this.health <= 0) {
          this.isGameOver = true;
          this.unlockPointer();
        }
      }
    }
  }

  private fireRocketProjectile(noSelfDamage = false) {
    _forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    const spawnPos = this.camera.position.clone().addScaledVector(_forward, 0.75);
    const rocketModel = createRocketProjectileMesh();
    rocketModel.root.position.copy(spawnPos);
    rocketModel.root.lookAt(spawnPos.clone().add(_forward));
    this.scene.add(rocketModel.root);

    this.activeRockets.push({
      model: rocketModel,
      pos: spawnPos,
      vel: _forward.clone().multiplyScalar(noSelfDamage ? 58 : 42),
      life: 4.5,
      smokeAccum: 0,
      noSelfDamage,
    });
  }

  private detonateRocket(center: THREE.Vector3, noSelfDamage = false) {
    const radius = 6.4;
    const maxDmg = 285 * this.damageMul;

    this.sound.playExplosion();
    this.cameraShake = Math.max(this.cameraShake, 0.68);

    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffb703,
      transparent: true,
      opacity: 0.96,
    });
    const coreMesh = new THREE.Mesh(this.explosionCoreGeo, coreMat);
    coreMesh.position.copy(center);
    this.scene.add(coreMesh);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff5400,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(this.explosionRingGeo, ringMat);
    ringMesh.position.set(center.x, this.groundHeightAt(center.x) + 0.08, center.z);
    this.scene.add(ringMesh);

    const light = new THREE.PointLight(0xff7b00, 22, radius * 3.4, 1.4);
    light.position.set(center.x, center.y + 0.8, center.z);
    this.scene.add(light);

    this.explosions.push({
      coreMesh,
      ringMesh,
      light,
      life: 0.52,
      maxLife: 0.52,
      maxRadius: radius,
    });

    this.spawnImpactSparks(center, 'explosion');
    for (let s = 0; s < 6; s++) {
      this.spawnMuzzleSmoke(
        center.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.6, 0.45, (Math.random() - 0.5) * 1.6)),
        3.8
      );
    }

    let killedThisBlast = 0;
    let hitAny = false;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const en = this.enemies[i];
      if (!en.alive) continue;
      const ePos = en.root.position;
      const dist = Math.hypot(ePos.x - center.x, ePos.z - center.z);
      if (dist <= radius + en.collisionRadius * 0.5) {
        hitAny = true;
        const falloff = Math.max(0.4, 1 - dist / (radius + en.collisionRadius));
        const dmg = Math.round(maxDmg * falloff);
        const res = this.applyEnemyDamage(en, dmg, 'body', center.x);
        if (res === 'kill') {
          killedThisBlast += 1;
        } else if (this.grenadeStunSec > 0) {
          en.stunTimer = Math.max(en.stunTimer ?? 0, this.grenadeStunSec);
        }
      }
    }

    if (this.currentMapId === 'tutorial') {
      for (let i = 0; i < this.targets.length; i++) {
        const tgt = this.targets[i];
        tgt.hitboxMesh.getWorldPosition(_projVec);
        if (Math.hypot(_projVec.x - center.x, _projVec.z - center.z) <= radius + 1.0) {
          tgt.hitTilt = -0.5;
          tgt.hitFlashTimer = 0.2;
          tgt.faceMat.emissive.setHex(0x991b1b);
          this.sound.playTargetClang(true);
          hitAny = true;
        }
      }
    }

    if (killedThisBlast >= 2) {
      this.multiKillBanner = `¡IMPACTO DE COHETE ×${killedThisBlast}!`;
      this.multiKillTimer = 2.6;
    }

    if (hitAny) {
      this.shotsHit += 1;
      this.hitmarkerType = killedThisBlast > 0 ? 'kill' : 'body';
      this.hitmarkerTimer = 0.22;
      this.sound.playHit(killedThisBlast > 0 ? 'kill' : 'body');
    }

    const distPlayer = this.playerPos.distanceTo(center);
    if (
      !noSelfDamage &&
      distPlayer < radius * 0.62 &&
      (this.currentMapId === 'city' ||
        this.currentMapId === 'desert' ||
        this.currentMapId === 'cubes' ||
        this.currentMapId === 'pixel' ||
        this.currentMapId === 'pueblo' ||
        this.currentMapId === 'nightcamp') &&
      !this.isGameOver
    ) {
      const selfDmg = Math.round(28 * (1 - distPlayer / (radius * 0.62)));
      if (selfDmg > 0) {
        this.health = Math.max(0, this.health - selfDmg);
        this.timeSinceDamaged = 0;
        this.damageFlash = 1.0;
        this.sound.playPlayerHurt();
        if (this.health <= 0) {
          this.isGameOver = true;
          this.unlockPointer();
        }
      }
    }
  }

  private updateActiveRockets(delta: number) {
    for (let i = this.activeRockets.length - 1; i >= 0; i--) {
      const r = this.activeRockets[i];
      r.life -= delta;
      r.smokeAccum += delta;
      if (r.smokeAccum >= 0.025) {
        r.smokeAccum = 0;
        this.spawnMuzzleSmoke(r.pos.clone(), 0.9);
      }

      const stepDist = r.vel.length() * delta;
      const dir = r.vel.clone().normalize();
      this.raycaster.set(r.pos, dir);
      this.raycaster.far = stepDist + 0.35;

      let impactPoint: THREE.Vector3 | null = null;
      const enemyHits = this.raycaster.intersectObjects(this.enemyHitboxes, false);
      const obsHits = this.raycaster.intersectObjects(this.obstacles, false);

      if (enemyHits.length > 0 && (obsHits.length === 0 || enemyHits[0].distance <= obsHits[0].distance)) {
        impactPoint = enemyHits[0].point.clone();
      } else if (obsHits.length > 0) {
        impactPoint = obsHits[0].point.clone();
      }

      const nextPos = r.pos.clone().addScaledVector(r.vel, delta);
      const floorY = this.groundHeightAt(nextPos.x);
      if (!impactPoint && (nextPos.y <= floorY + 0.08 || this.collidesPointWithBox(nextPos.x, nextPos.y, nextPos.z, 0.14))) {
        impactPoint = nextPos.clone();
        impactPoint.y = Math.max(floorY + 0.08, impactPoint.y);
      }

      if (impactPoint || r.life <= 0) {
        this.detonateRocket(impactPoint ?? r.pos.clone(), Boolean(r.noSelfDamage));
        this.scene.remove(r.model.root);
        r.model.dispose();
        this.activeRockets.splice(i, 1);
      } else {
        r.pos.copy(nextPos);
        r.model.root.position.copy(r.pos);
        r.model.flameMesh.scale.setScalar(0.85 + Math.sin(this.elapsed * 45) * 0.25);
      }
    }
  }

  private startChestCeremony(kind: ChestRewardKind = 'rocket') {
    this.clearChestCeremony();
    this.chestActive = true;
    this.chestRewardKind = kind;
    this.chestStage = 'waiting_click';
    this.chestTimer = 0;
    this.mouseDownLeft = false;
    this.virtualShootDown = false;
    this.isAds = false;
    this.isAimingGrenade = false;
    this.weaponRig.visible = false;
    this.handGrenadePreview.root.visible = false;
    this.trajectoryBeads.visible = false;
    this.landingMarkerGroup.visible = false;
    this.unlockPointer();

    // Place armored reward chest 3.1m in front of player (clamped within arena)
    _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const chestX = THREE.MathUtils.clamp(this.playerPos.x + _forward.x * 3.1, -6.5, 6.5);
    const chestZ = THREE.MathUtils.clamp(this.playerPos.z + _forward.z * 3.1, -46, 11);
    const chestY = this.groundHeightAt(chestX);

    this.rewardChest = createRewardChestModel();
    this.rewardChest.root.position.set(chestX, chestY, chestZ);
    this.rewardChest.root.lookAt(this.playerPos.x, chestY, this.playerPos.z);
    this.scene.add(this.rewardChest.root);

    if (kind === 'pet') {
      this.rewardPetMesh = createCaptainPolloMesh();
      this.rewardPetMesh.root.position.set(chestX, chestY + 0.56, chestZ);
      this.rewardPetMesh.root.scale.setScalar(1.2);
      this.rewardPetMesh.root.visible = false;
      this.scene.add(this.rewardPetMesh.root);
    } else if (kind === 'sniper') {
      this.rewardSniperMesh = createStandaloneSniperMesh();
      this.rewardSniperMesh.root.position.set(chestX, chestY + 0.56, chestZ);
      this.rewardSniperMesh.root.scale.setScalar(0.8);
      this.rewardSniperMesh.root.visible = false;
      this.scene.add(this.rewardSniperMesh.root);
    } else if (kind === 'chainsaw') {
      this.rewardChainsawMesh = createStandaloneChainsawMesh();
      this.rewardChainsawMesh.root.position.set(chestX, chestY + 0.56, chestZ);
      this.rewardChainsawMesh.root.scale.setScalar(0.85);
      this.rewardChainsawMesh.root.visible = false;
      this.scene.add(this.rewardChainsawMesh.root);
    } else if (kind === 'cubes_bundle') {
      this.rewardPetMesh = createCaptainPolloMesh();
      this.rewardPetMesh.root.position.set(chestX - 0.36, chestY + 0.56, chestZ);
      this.rewardPetMesh.root.scale.setScalar(1.1);
      this.rewardPetMesh.root.visible = false;
      this.scene.add(this.rewardPetMesh.root);

      this.rewardSniperMesh = createStandaloneSniperMesh();
      this.rewardSniperMesh.root.position.set(chestX + 0.36, chestY + 0.56, chestZ);
      this.rewardSniperMesh.root.scale.setScalar(0.75);
      this.rewardSniperMesh.root.visible = false;
      this.scene.add(this.rewardSniperMesh.root);
    } else {
      this.rewardRocketMesh = createStandaloneRocketLauncherMesh();
      this.rewardRocketMesh.root.position.set(chestX, chestY + 0.56, chestZ);
      this.rewardRocketMesh.root.scale.setScalar(0.75);
      this.rewardRocketMesh.root.visible = false;
      this.scene.add(this.rewardRocketMesh.root);
    }

    this.chestLookTarget.set(chestX, chestY + 0.72, chestZ);
    this.camera.position.set(this.playerPos.x, this.playerPos.y + this.eyeHeight, this.playerPos.z);
    this.camera.lookAt(this.chestLookTarget);
    this.emitHud();
  }

  public openRewardChest() {
    if (!this.chestActive || this.chestStage !== 'waiting_click') return;
    this.chestStage = 'opening';
    this.chestTimer = 0;
    this.sound.playChestOpen();
    if (this.rewardChest) {
      this.rewardChest.beaconBeam.visible = true;
      this.spawnImpactSparks(
        this.rewardChest.root.position.clone().add(new THREE.Vector3(0, 0.85, 0)),
        'explosion'
      );
    }
    if (this.rewardPetMesh) {
      this.rewardPetMesh.root.visible = true;
      this.sound.playCaptainPolloSqawk();
    }
    if (this.rewardSniperMesh) {
      this.rewardSniperMesh.root.visible = true;
    }
    if (this.rewardChainsawMesh) {
      this.rewardChainsawMesh.root.visible = true;
    }
    if (this.rewardRocketMesh) {
      this.rewardRocketMesh.root.visible = true;
    }
    this.emitHud();
  }

  private updateChestCeremony(delta: number) {
    if (!this.chestActive || !this.rewardChest) return;

    const chestPos = this.rewardChest.root.position;
    if (this.chestStage === 'waiting_click') {
      this.chestTimer += delta;
      this.rewardChest.glowLight.intensity = 4.0 + Math.sin(this.elapsed * 4.5) * 1.4;
      this.chestLookTarget.set(chestPos.x, chestPos.y + 0.65, chestPos.z);
    } else if (this.chestStage === 'opening') {
      this.chestTimer += delta;
      const t = Math.min(1, this.chestTimer / 1.35);
      const easeOut = 1 - Math.pow(1 - t, 3);
      this.rewardChest.lidPivot.rotation.x = -easeOut * 1.95;
      this.rewardChest.glowLight.intensity = 5.5 + easeOut * 8.0;
      this.rewardChest.beaconBeam.rotation.y += delta * 1.8;

      const riseT = Math.max(0, (t - 0.18) / 0.82);
      const riseEase = 1 - Math.pow(1 - riseT, 3);
      const isBundle = this.chestRewardKind === 'cubes_bundle';

      if (this.rewardPetMesh) {
        this.rewardPetMesh.root.position.set(
          chestPos.x + (isBundle ? -0.38 : 0),
          chestPos.y + 0.56 + riseEase * 0.92,
          chestPos.z
        );
        this.rewardPetMesh.root.scale.setScalar((isBundle ? 1.05 : 1.2) + riseEase * 0.4);
        this.rewardPetMesh.root.rotation.y += delta * 3.8;
      }
      if (this.rewardSniperMesh) {
        this.rewardSniperMesh.root.position.set(
          chestPos.x + (isBundle ? 0.38 : 0),
          chestPos.y + 0.56 + riseEase * 1.08,
          chestPos.z
        );
        this.rewardSniperMesh.root.scale.setScalar((isBundle ? 0.72 : 0.8) + riseEase * 0.38);
        this.rewardSniperMesh.root.rotation.y += delta * 2.6;
        this.rewardSniperMesh.root.rotation.z = Math.sin(this.elapsed * 2.5) * 0.08;
      }
      if (this.rewardChainsawMesh) {
        this.rewardChainsawMesh.root.position.set(
          chestPos.x,
          chestPos.y + 0.56 + riseEase * 1.05,
          chestPos.z
        );
        this.rewardChainsawMesh.root.scale.setScalar(0.85 + riseEase * 0.42);
        this.rewardChainsawMesh.root.rotation.y += delta * 3.1;
        this.rewardChainsawMesh.root.rotation.z = Math.sin(this.elapsed * 3.2) * 0.12;
      }
      if (this.rewardRocketMesh) {
        this.rewardRocketMesh.root.position.set(
          chestPos.x,
          chestPos.y + 0.56 + riseEase * 1.05,
          chestPos.z
        );
        this.rewardRocketMesh.root.scale.setScalar(0.75 + riseEase * 0.4);
        this.rewardRocketMesh.root.rotation.y += delta * 2.6;
        this.rewardRocketMesh.root.rotation.z = Math.sin(this.elapsed * 2.5) * 0.08;
      }

      this.chestLookTarget.set(chestPos.x, chestPos.y + 0.65 + easeOut * 0.82, chestPos.z);

      if (t >= 1) {
        this.chestStage = 'revealed';
        if (this.chestRewardKind === 'pet' || this.chestRewardKind === 'cubes_bundle') {
          this.petUnlocked = true;
          this.savePetUnlocked();
          if (!this.captainPollo) {
            this.captainPollo = createCaptainPolloMesh();
            this.captainPollo.root.position.set(this.playerPos.x + 1.4, 0, this.playerPos.z - 0.5);
            this.scene.add(this.captainPollo.root);
          }
          this.sound.playCaptainPolloSqawk();
        }
        if (this.chestRewardKind === 'sniper' || this.chestRewardKind === 'cubes_bundle') {
          if (!this.unlockedWeapons.includes('sniper')) {
            this.unlockedWeapons.push('sniper');
            this.saveUnlockedWeapons();
          }
          this.activeWeaponId = 'sniper';
          WEAPON_ORDER.forEach((wId) => {
            this.weapons[wId].root.visible = wId === 'sniper';
          });
          this.ammoByWeapon.sniper = this.getMaxAmmo('sniper');
        }
        if (this.chestRewardKind === 'chainsaw') {
          if (!this.unlockedWeapons.includes('chainsaw')) {
            this.unlockedWeapons.push('chainsaw');
            this.saveUnlockedWeapons();
          }
          this.activeWeaponId = 'chainsaw';
          WEAPON_ORDER.forEach((wId) => {
            this.weapons[wId].root.visible = wId === 'chainsaw';
          });
          this.ammoByWeapon.chainsaw = this.getMaxAmmo('chainsaw');
        }
        if (this.chestRewardKind === 'rocket') {
          if (!this.unlockedWeapons.includes('rocket')) {
            this.unlockedWeapons.push('rocket');
            this.saveUnlockedWeapons();
          }
          this.activeWeaponId = 'rocket';
          WEAPON_ORDER.forEach((wId) => {
            this.weapons[wId].root.visible = wId === 'rocket';
          });
          this.ammoByWeapon.rocket = this.getMaxAmmo('rocket');
        }
        this.sound.playUpgradePickup();
        this.emitHud();
      }
    } else if (this.chestStage === 'revealed') {
      this.rewardChest.beaconBeam.rotation.y += delta * 1.4;
      this.rewardChest.glowLight.intensity = 9.0 + Math.sin(this.elapsed * 3.5) * 1.5;
      if (this.rewardPetMesh) {
        this.rewardPetMesh.root.position.y =
          chestPos.y + 1.48 + Math.abs(Math.sin(Math.floor(this.elapsed * 7) * 0.9)) * 0.14;
        this.rewardPetMesh.root.rotation.y += delta * 1.65;
      }
      if (this.rewardSniperMesh) {
        this.rewardSniperMesh.root.position.y = chestPos.y + 1.64 + Math.sin(this.elapsed * 2.8) * 0.07;
        this.rewardSniperMesh.root.rotation.y += delta * 1.25;
      }
      if (this.rewardChainsawMesh) {
        this.rewardChainsawMesh.root.position.y = chestPos.y + 1.62 + Math.sin(this.elapsed * 3.2) * 0.07;
        this.rewardChainsawMesh.root.rotation.y += delta * 1.65;
      }
      if (this.rewardRocketMesh) {
        this.rewardRocketMesh.root.position.y = chestPos.y + 1.61 + Math.sin(this.elapsed * 2.8) * 0.07;
        this.rewardRocketMesh.root.rotation.y += delta * 1.25;
      }
      this.chestLookTarget.set(chestPos.x, chestPos.y + 1.47, chestPos.z);
    }

    this.camera.lookAt(this.chestLookTarget);
  }

  private updateGrenadesAndExplosions(delta: number) {
    if (this.isAimingGrenade) {
      this.grenadeHoldTime += delta;
      const blink = Math.sin(this.elapsed * 18) > 0 ? 4.5 : 1.0;
      this.handGrenadePreview.ledMat.emissiveIntensity = blink;
      this.handGrenadePreview.root.position.y = -0.22 + Math.sin(this.elapsed * 9) * 0.008;
      this.handGrenadePreview.root.rotation.z = 0.25 + Math.sin(this.elapsed * 7) * 0.05;
      if (this.grenadeHoldTime >= 2.2) {
        this.releaseGrenadeThrow();
      }
    }
    this.updateGrenadeTrajectoryPreview();

    for (let i = this.activeGrenades.length - 1; i >= 0; i--) {
      const g = this.activeGrenades[i];
      g.fuseRemaining -= delta;
      if (g.bounceCooldown > 0) g.bounceCooldown -= delta;

      // Blink red LED faster near detonation
      const blinkRate = g.fuseRemaining < 0.8 ? 28 : 11;
      g.model.ledMat.emissiveIntensity = Math.sin(this.elapsed * blinkRate) > 0 ? 5.0 : 0.6;

      g.vel.y -= GRENADE_GRAVITY * delta;

      const nx = g.pos.x + g.vel.x * delta;
      if (this.collidesPointWithBox(nx, g.pos.y, g.pos.z, 0.1)) {
        g.vel.x *= -0.45;
        if (g.bounceCooldown <= 0 && Math.abs(g.vel.x) > 1.2) {
          this.sound.playGrenadeBounce();
          g.bounceCooldown = 0.14;
        }
      } else {
        g.pos.x = nx;
      }

      const nz = g.pos.z + g.vel.z * delta;
      if (this.collidesPointWithBox(g.pos.x, g.pos.y, nz, 0.1)) {
        g.vel.z *= -0.45;
        if (g.bounceCooldown <= 0 && Math.abs(g.vel.z) > 1.2) {
          this.sound.playGrenadeBounce();
          g.bounceCooldown = 0.14;
        }
      } else {
        g.pos.z = nz;
      }

      const ny = g.pos.y + g.vel.y * delta;
      const floorY = this.groundHeightAt(g.pos.x) + 0.09;
      if (ny <= floorY) {
        g.pos.y = floorY;
        if (Math.abs(g.vel.y) > 1.8 && g.bounceCooldown <= 0) {
          this.sound.playGrenadeBounce();
          g.bounceCooldown = 0.14;
        }
        g.vel.y = Math.abs(g.vel.y) * 0.42;
        if (g.vel.y < 0.7) g.vel.y = 0;
        g.vel.x *= 0.76;
        g.vel.z *= 0.76;
        g.rotVel.multiplyScalar(0.74);
      } else {
        g.pos.y = ny;
      }

      g.model.root.position.copy(g.pos);
      g.model.root.rotation.x += g.rotVel.x * delta;
      g.model.root.rotation.y += g.rotVel.y * delta;
      g.model.root.rotation.z += g.rotVel.z * delta;

      if (g.fuseRemaining <= 0) {
        this.detonateGrenade(g);
        this.scene.remove(g.model.root);
        g.model.dispose();
        this.activeGrenades.splice(i, 1);
      }
    }

    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.life -= delta;
      if (ex.life <= 0) {
        this.scene.remove(ex.coreMesh, ex.ringMesh, ex.light);
        (ex.coreMesh.material as THREE.Material).dispose();
        (ex.ringMesh.material as THREE.Material).dispose();
        this.explosions.splice(i, 1);
      } else {
        const progress = 1 - ex.life / ex.maxLife;
        const ease = 1 - Math.pow(1 - progress, 3);
        ex.coreMesh.scale.setScalar(0.5 + ease * ex.maxRadius * 0.65);
        (ex.coreMesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.92;
        ex.ringMesh.scale.setScalar(0.8 + ease * ex.maxRadius * 1.1);
        (ex.ringMesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.85;
        ex.light.intensity = 18 * (1 - progress);
      }
    }
  }

  private groundHeightAt(x: number, z = this.playerPos.z): number {
    if (this.currentMapId === 'city' && Math.abs(x) >= 9.2 && Math.abs(x) <= 17.2) {
      return 0.22;
    }
    if (this.currentMapId === 'duel') {
      return Math.max(0, this.buildingManager.groundHeightAt(x, z, this.playerPos.y));
    }
    return 0;
  }

  private updatePlayer(delta: number) {
    const keyForward =
      Number(Boolean(this.keys['KeyW'] || this.keys['ArrowUp'])) -
      Number(Boolean(this.keys['KeyS'] || this.keys['ArrowDown']));
    const keyRight =
      Number(Boolean(this.keys['KeyD'] || this.keys['ArrowRight'])) -
      Number(Boolean(this.keys['KeyA'] || this.keys['ArrowLeft']));

    const moveForward = THREE.MathUtils.clamp(keyForward + this.virtualMoveY, -1, 1);
    const moveRight = THREE.MathUtils.clamp(keyRight + this.virtualMoveX, -1, 1);

    const wantsSprint = Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    this.isSprinting =
      wantsSprint &&
      moveForward > 0 &&
      !this.isAds &&
      !this.isCrouching &&
      this.isGrounded &&
      !this.isAimingGrenade;

    const targetEye = this.isCrouching ? 1.06 : 1.68;
    this.eyeHeight = THREE.MathUtils.damp(this.eyeHeight, targetEye, 14, delta);

    const speed =
      (this.isCrouching ? 3.1 : this.isSprinting ? 8.4 : this.isAds ? 3.6 : 5.5) * this.speedMul;

    _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    _right.crossVectors(_forward, _upAxis).normalize();

    _moveDir.set(0, 0, 0);
    _moveDir.addScaledVector(_forward, moveForward);
    _moveDir.addScaledVector(_right, moveRight);
    if (_moveDir.lengthSq() > 1) {
      _moveDir.normalize();
    }

    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - delta);
    }
    this.dashRollBoost = THREE.MathUtils.damp(this.dashRollBoost, 0, 12, delta);
    this.dashTilt = THREE.MathUtils.damp(this.dashTilt, 0, 10, delta);

    if (this.regenPerSec > 0 && !this.isGameOver && !this.hordeVictory) {
      this.timeSinceDamaged += delta;
      if (this.timeSinceDamaged >= 3.0 && this.health < this.maxHealth) {
        this.health = Math.min(this.maxHealth, this.health + this.regenPerSec * delta);
      }
    }

    if (this.dashActiveTimer > 0) {
      this.dashActiveTimer = Math.max(0, this.dashActiveTimer - delta);
      const dashSpeed = 20.5 * this.speedMul * this.dashPowerMul;
      this.playerVel.x = this.dashDirX * dashSpeed;
      this.playerVel.z = this.dashDirZ * dashSpeed;
    } else {
      const accel = this.isGrounded ? 15 : 6;
      this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, _moveDir.x * speed, accel, delta);
      this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, _moveDir.z * speed, accel, delta);
    }

    this.strafeRoll = THREE.MathUtils.damp(this.strafeRoll, -moveRight * 0.048 + this.dashRollBoost, 12, delta);

    this.playerVel.y -= 18.5 * delta;

    const radius = 0.42;
    const prevX = this.playerPos.x;
    const prevZ = this.playerPos.z;
    const maxX =
      this.currentMapId === 'tutorial'
        ? 12.2
        : this.currentMapId === 'backrooms'
        ? 67.0
        : this.currentMapId === 'duel'
        ? 35.2
        : this.currentMapId === 'desert' || this.currentMapId === 'nightcamp'
        ? 20.4
        : this.currentMapId === 'cubes' || this.currentMapId === 'pixel' || this.currentMapId === 'pueblo'
        ? 19.2
        : 16.6;
    const minZ =
      this.currentMapId === 'tutorial'
        ? -1.2
        : this.currentMapId === 'backrooms'
        ? -67.0
        : this.currentMapId === 'duel'
        ? -35.2
        : this.currentMapId === 'desert' ||
          this.currentMapId === 'cubes' ||
          this.currentMapId === 'pixel' ||
          this.currentMapId === 'pueblo' ||
          this.currentMapId === 'nightcamp'
        ? -60.0
        : -58;
    const maxZ =
      this.currentMapId === 'tutorial'
        ? 9.5
        : this.currentMapId === 'backrooms'
        ? 67.0
        : this.currentMapId === 'duel'
        ? 35.2
        : this.currentMapId === 'nightcamp'
        ? 17.5
        : 16;

    const nextX = this.playerPos.x + this.playerVel.x * delta;
    if (!this.collidesHorizontal(nextX, this.playerPos.z, this.playerPos.y, radius)) {
      this.playerPos.x = THREE.MathUtils.clamp(nextX, -maxX, maxX);
    } else {
      this.playerVel.x = 0;
    }

    const nextZ = this.playerPos.z + this.playerVel.z * delta;
    if (!this.collidesHorizontal(this.playerPos.x, nextZ, this.playerPos.y, radius)) {
      this.playerPos.z = THREE.MathUtils.clamp(nextZ, minZ, maxZ);
    } else {
      this.playerVel.z = 0;
    }

    if (this.currentMapId === 'tutorial' && this.tutorialStep === 'move') {
      this.tutorialMoveDist += Math.hypot(this.playerPos.x - prevX, this.playerPos.z - prevZ);
      if (this.tutorialMoveDist >= 3.2) {
        this.advanceTutorialStep('static_targets');
      }
    }

    const floorY = this.groundHeightAt(this.playerPos.x, this.playerPos.z);
    this.playerPos.y += this.playerVel.y * delta;
    if (this.playerPos.y <= floorY) {
      if (!this.wasGrounded && this.playerVel.y < -4.2) {
        this.sound.playLand();
        this.jumpLandDip = -0.075;
      }
      this.playerPos.y = floorY;
      this.playerVel.y = 0;
      this.isGrounded = true;
    } else if (this.playerPos.y > floorY + 0.08) {
      this.isGrounded = false;
    }
    this.wasGrounded = this.isGrounded;

    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    if (this.isGrounded && horizSpeed > 0.8) {
      const bobRate = this.isSprinting ? 14 : 9.2;
      this.walkBobPhase += delta * bobRate;
      this.stepSoundCooldown -= delta;
      if (this.stepSoundCooldown <= 0) {
        this.sound.playFootstep(this.isSprinting);
        this.stepSoundCooldown = this.isSprinting ? 0.3 : 0.46;
      }
    } else {
      this.walkBobPhase = 0;
      this.stepSoundCooldown = 0.05;
    }

    this.recoilPitch = THREE.MathUtils.damp(this.recoilPitch, 0, 11, delta);
    this.cameraShake = Math.max(0, this.cameraShake - delta * 2.4);
    const shakeX = this.cameraShake > 0 ? (Math.random() - 0.5) * this.cameraShake * 0.06 : 0;
    const shakeY = this.cameraShake > 0 ? (Math.random() - 0.5) * this.cameraShake * 0.06 : 0;

    const effectivePitch = THREE.MathUtils.clamp(
      this.pitch + this.recoilPitch + shakeY,
      -Math.PI / 2 + 0.03,
      Math.PI / 2 - 0.03
    );

    const bobY = this.isGrounded && horizSpeed > 0.8 ? Math.sin(this.walkBobPhase) * 0.028 : 0;
    this.camera.position.set(
      this.playerPos.x,
      this.playerPos.y + this.eyeHeight + bobY,
      this.playerPos.z
    );
    this.camera.rotation.set(effectivePitch, this.yaw + shakeX, this.strafeRoll * 0.25, 'YXZ');

    const spec = WEAPON_SPECS[this.activeWeaponId];
    const sniperTargetFov = this.sniperZoom === 8 ? 9.5 : 19;
    const targetFov = this.isAds
      ? this.activeWeaponId === 'sniper'
        ? sniperTargetFov
        : Math.min(spec.adsFov, this.baseFov - 10)
      : this.dashActiveTimer > 0
      ? this.baseFov + 7
      : this.isSprinting
      ? this.baseFov + 5
      : this.baseFov;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 12, delta);
      this.camera.updateProjectionMatrix();
    }
  }

  private collidesHorizontal(x: number, z: number, y: number, r: number): boolean {
    if (this.currentMapId === 'duel' && this.buildingManager.collidesHorizontal(x, z, y, r)) {
      return true;
    }
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (y >= c.maxY - 0.12) continue;
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) {
        return true;
      }
    }
    for (let i = 0; i < this.enemies.length; i++) {
      const en = this.enemies[i];
      if (!en.alive) continue;
      const dx = x - en.root.position.x;
      const dz = z - en.root.position.z;
      const minR = r + en.collisionRadius;
      if (dx * dx + dz * dz < minR * minR) {
        return true;
      }
    }
    return false;
  }

  private collidesEnemyWorld(x: number, z: number, r: number, selfId: string): boolean {
    const boundX =
      this.currentMapId === 'backrooms'
        ? 67.0
        : this.currentMapId === 'duel'
        ? 34.5
        : this.currentMapId === 'desert' || this.currentMapId === 'nightcamp'
        ? 20.2
        : this.currentMapId === 'cubes' || this.currentMapId === 'pixel' || this.currentMapId === 'pueblo'
        ? 19.0
        : 15.8;
    const minBoundZ =
      this.currentMapId === 'backrooms'
        ? -67.0
        : this.currentMapId === 'duel'
        ? -34.5
        : this.currentMapId === 'desert' ||
          this.currentMapId === 'cubes' ||
          this.currentMapId === 'pixel' ||
          this.currentMapId === 'pueblo' ||
          this.currentMapId === 'nightcamp'
        ? -60.5
        : -58.5;
    const maxBoundZ =
      this.currentMapId === 'backrooms'
        ? 67.0
        : this.currentMapId === 'duel'
        ? 34.5
        : this.currentMapId === 'nightcamp'
        ? 17.0
        : 15.0;
    if (x < -boundX || x > boundX || z < minBoundZ || z > maxBoundZ) return true;
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) {
        return true;
      }
    }
    const pdx = x - this.playerPos.x;
    const pdz = z - this.playerPos.z;
    const minPlayerR = r + 0.55;
    if (pdx * pdx + pdz * pdz < minPlayerR * minPlayerR) {
      return true;
    }
    for (let i = 0; i < this.enemies.length; i++) {
      const other = this.enemies[i];
      if (!other.alive || other.id === selfId) continue;
      const dx = x - other.root.position.x;
      const dz = z - other.root.position.z;
      const minR = r + other.collisionRadius;
      if (dx * dx + dz * dz < minR * minR) {
        return true;
      }
    }
    return false;
  }

  private updateWeapons(delta: number) {
    this.weaponRig.visible =
      !this.isMenuForestActive &&
      !this.chestActive &&
      this.activeBuildPiece === null &&
      !this.isEditingBuild &&
      !(this.activeWeaponId === 'sniper' && this.isAds);
    const spec = WEAPON_SPECS[this.activeWeaponId];
    const model = this.weapons[this.activeWeaponId];
    const reloadDuration = spec.reloadTimeSec / this.reloadSpeedMul;

    if (
      this.isLocked &&
      !this.isGameOver &&
      !this.hordeVictory &&
      !this.tentShopOpen &&
      !this.isAimingGrenade &&
      this.activeBuildPiece === null &&
      !this.isEditingBuild &&
      (this.mouseDownLeft || this.virtualShootDown) &&
      spec.fireMode === 'auto'
    ) {
      this.tryShoot(false);
    }

    if (this.isReloading) {
      this.reloadElapsed += delta;
      const progress = Math.min(1, this.reloadElapsed / reloadDuration);
      if (this.activeWeaponId === 'rocket' && model.movingPart) {
        // Warhead slides into front muzzle during rocket reload
        const loadT = Math.min(1, Math.max(0, (progress - 0.25) / 0.65));
        model.movingPart.position.z = model.movingPartRestZ - (1 - loadT) * 0.34;
        model.movingPart.visible = progress > 0.22;
      } else if (model.magazinePart) {
        const magDip = progress < 0.65 ? Math.sin((progress / 0.65) * Math.PI) : 0;
        model.magazinePart.position.y = model.magazineRestY - magDip * 0.19;
        model.magazinePart.rotation.z = magDip * 0.28;
        model.magazinePart.rotation.x = magDip * 0.18;
      }
      if (progress >= 1) {
        this.ammoByWeapon[this.activeWeaponId] = this.getMaxAmmo(this.activeWeaponId);
        this.isReloading = false;
        this.reloadElapsed = 0;
        if (this.activeWeaponId === 'rocket' && model.movingPart) {
          model.movingPart.position.z = model.movingPartRestZ;
          model.movingPart.visible = true;
        }
        if (model.magazinePart) {
          model.magazinePart.position.y = model.magazineRestY;
          model.magazinePart.rotation.z = 0;
          model.magazinePart.rotation.x = 0;
        }
        this.switchDip = 0.036; // Crisp snap when magazine/warhead locks in
        this.emitHud();
      }
    }

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= delta;
      if (this.muzzleFlashTimer <= 0) {
        WEAPON_ORDER.forEach((id) => {
          this.weapons[id].muzzleFlash.visible = false;
        });
        this.muzzleLight.intensity = 0;
      }
    }

    if (this.inspectTimer > 0) this.inspectTimer = Math.max(0, this.inspectTimer - delta);
    if (this.shotgunPumpTimer > 0) this.shotgunPumpTimer = Math.max(0, this.shotgunPumpTimer - delta);
    if (this.sniperBoltTimer > 0) this.sniperBoltTimer = Math.max(0, this.sniperBoltTimer - delta);

    this.recoilOffsetZ = THREE.MathUtils.damp(this.recoilOffsetZ, 0, 14, delta);
    this.recoilOffsetY = THREE.MathUtils.damp(this.recoilOffsetY, 0, 14, delta);
    this.recoilRoll = THREE.MathUtils.damp(this.recoilRoll, 0, 12, delta);
    this.switchDip = THREE.MathUtils.damp(this.switchDip, 0, 11, delta);
    this.grenadeThrowDip = THREE.MathUtils.damp(this.grenadeThrowDip, 0, 10, delta);
    this.jumpLandDip = THREE.MathUtils.damp(this.jumpLandDip, 0, 10, delta);
    this.movingPartKick = THREE.MathUtils.damp(this.movingPartKick, 0, 16, delta);
    this.triggerKick = THREE.MathUtils.damp(this.triggerKick, 0, 18, delta);
    this.hammerKick = THREE.MathUtils.damp(this.hammerKick, 0, 14, delta);
    this.swayX = THREE.MathUtils.damp(this.swayX, 0, 10, delta);
    this.swayY = THREE.MathUtils.damp(this.swayY, 0, 10, delta);

    const basePos = this.isAds ? spec.adsPosition : spec.hipPosition;
    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);

    // Figure-8 idle breathing micro-motion
    const breathY = Math.sin(this.elapsed * 2.0) * (this.isAds ? 0.0008 : 0.0032);
    const breathX = Math.sin(this.elapsed * 1.0) * (this.isAds ? 0.0005 : 0.0022);
    const bobAmp = this.isAds ? 0.002 : this.isSprinting ? 0.022 : 0.011;
    const bobX = this.isGrounded && horizSpeed > 0.8 ? Math.cos(this.walkBobPhase * 0.5) * bobAmp : 0;
    const bobY =
      this.isGrounded && horizSpeed > 0.8 ? Math.abs(Math.sin(this.walkBobPhase)) * bobAmp : 0;

    const inspectAmount = this.inspectTimer > 0 ? Math.sin((this.inspectTimer / 1.85) * Math.PI) : 0;
    const sprintOffsetX = this.isSprinting ? -0.07 : 0;
    const sprintOffsetY = this.isSprinting ? -0.045 : 0;
    const reloadDipY = this.isReloading ? -0.15 : 0;
    const grenadeDipY = this.isAimingGrenade ? -0.22 : -this.grenadeThrowDip;
    const pumpWave =
      this.activeWeaponId === 'shotgun' && this.shotgunPumpTimer > 0
        ? Math.sin(((0.42 - this.shotgunPumpTimer) / 0.42) * Math.PI)
        : 0;
    const boltWave =
      this.activeWeaponId === 'sniper' && this.sniperBoltTimer > 0
        ? Math.sin(((0.58 - this.sniperBoltTimer) / 0.58) * Math.PI)
        : 0;

    const targetX =
      basePos[0] +
      bobX +
      breathX +
      this.swayX +
      sprintOffsetX -
      inspectAmount * 0.095 +
      pumpWave * 0.024 -
      boltWave * 0.018;
    const targetY =
      basePos[1] +
      bobY +
      breathY +
      this.swayY +
      this.recoilOffsetY * 0.35 +
      reloadDipY +
      sprintOffsetY +
      this.switchDip +
      this.jumpLandDip +
      grenadeDipY +
      inspectAmount * 0.032 +
      pumpWave * 0.022 +
      boltWave * 0.02;
    const targetZ = basePos[2] + this.recoilOffsetZ - inspectAmount * 0.035 + pumpWave * 0.02;

    this.weaponRig.position.x = THREE.MathUtils.damp(this.weaponRig.position.x, targetX, 16, delta);
    this.weaponRig.position.y = THREE.MathUtils.damp(this.weaponRig.position.y, targetY, 16, delta);
    this.weaponRig.position.z = THREE.MathUtils.damp(this.weaponRig.position.z, targetZ, 18, delta);

    const crouchCant = this.isCrouching && !this.isAds ? -0.06 : 0;
    const reloadCantX = this.isReloading
      ? -0.42 + Math.sin(Math.min(1, this.reloadElapsed / reloadDuration) * Math.PI * 2) * 0.08
      : 0;
    const targetRotX = this.isReloading
      ? reloadCantX
      : this.isAimingGrenade
      ? -0.42
      : this.isSprinting
      ? -0.18
      : this.recoilOffsetY * 1.45 + this.swayY * 1.8 + inspectAmount * 0.16 + pumpWave * 0.18 + boltWave * 0.12;
    const targetRotY = this.isSprinting
      ? 0.55
      : this.isReloading
      ? 0.24
      : -this.swayX * 2.2 - inspectAmount * 0.72 + boltWave * 0.16;
    const targetRotZ = this.isReloading
      ? 0.42
      : this.isSprinting
      ? 0.24
      : this.recoilRoll +
        this.strafeRoll +
        this.dashTilt +
        crouchCant +
        inspectAmount * 0.42 -
        pumpWave * 0.22 +
        boltWave * 0.24;

    this.weaponRig.rotation.x = THREE.MathUtils.damp(this.weaponRig.rotation.x, targetRotX, 13, delta);
    this.weaponRig.rotation.y = THREE.MathUtils.damp(this.weaponRig.rotation.y, targetRotY, 13, delta);
    this.weaponRig.rotation.z = THREE.MathUtils.damp(this.weaponRig.rotation.z, targetRotZ, 13, delta);

    // Moving parts: slide lock-back when empty, shotgun pump cycle, sniper bolt lift+pull, rocket warhead, trigger & hammer
    const isEmpty = this.ammoByWeapon[this.activeWeaponId] === 0 && !this.isReloading;
    if (model.movingPart) {
      if (this.activeWeaponId === 'shotgun' && this.shotgunPumpTimer > 0) {
        model.movingPart.position.z = model.movingPartRestZ + pumpWave * 0.11;
      } else if (this.activeWeaponId === 'sniper') {
        if (this.sniperBoltTimer > 0) {
          model.movingPart.position.z = model.movingPartRestZ + boltWave * 0.095;
          model.movingPart.rotation.z = boltWave * 0.85;
        } else {
          model.movingPart.position.z = model.movingPartRestZ;
          model.movingPart.rotation.z = THREE.MathUtils.damp(model.movingPart.rotation.z, 0, 16, delta);
        }
      } else if (this.activeWeaponId === 'rocket' && !this.isReloading) {
        model.movingPart.visible = !isEmpty;
        model.movingPart.position.z = model.movingPartRestZ;
      } else {
        const kick = isEmpty ? Math.max(this.movingPartKick, 0.62) : this.movingPartKick;
        model.movingPart.position.z = model.movingPartRestZ + kick * 0.062;
      }
    }
    if (model.triggerPart) {
      model.triggerPart.rotation.x = -0.28 + this.triggerKick * 0.42;
    }
    if (model.hammerPart) {
      model.hammerPart.rotation.x = -this.hammerKick * 0.72;
    }
    if (this.activeWeaponId === 'chainsaw' && model.chainBladeParts) {
      const isSawing =
        this.isLocked &&
        !this.isGameOver &&
        !this.hordeVictory &&
        (this.mouseDownLeft || this.virtualShootDown);
      this.chainsawChainPhase = (this.chainsawChainPhase + delta * (isSawing ? 4.8 : 0.75)) % 1;
      for (let tIdx = 0; tIdx < model.chainBladeParts.length; tIdx++) {
        const tooth = model.chainBladeParts[tIdx];
        const basePhase = (tooth.userData.chainPhase as number | undefined) ?? tIdx / 18;
        const p = (basePhase + this.chainsawChainPhase) % 1;
        const ang = p * Math.PI * 2;
        tooth.position.set(0, -0.015 + Math.sin(ang) * 0.056, -0.42 + Math.cos(ang) * 0.335);
        tooth.rotation.x = ang;
      }
    }
  }

  private pickZombieSpawnCoords(): [number, number] {
    const lanes =
      this.currentMapId === 'backrooms'
        ? BACKROOMS_SPAWN_LANES
        : this.currentMapId === 'desert'
        ? DESERT_SPAWN_LANES
        : this.currentMapId === 'cubes'
        ? CUBES_SPAWN_LANES
        : this.currentMapId === 'pixel'
        ? PIXEL_SPAWN_LANES
        : this.currentMapId === 'pueblo'
        ? PUEBLO_SPAWN_LANES
        : CITY_SPAWN_LANES;
    for (let attempt = 0; attempt < lanes.length; attempt++) {
      const idx = (this.spawnLaneIndex + attempt) % lanes.length;
      const [lx, lz] = lanes[idx];
      const jitterX = lx + (Math.random() - 0.5) * 1.1;
      const jitterZ = lz + (Math.random() - 0.5) * 2.2;
      const distPlayer = Math.hypot(jitterX - this.playerPos.x, jitterZ - this.playerPos.z);
      if (distPlayer >= 13 && !this.collidesEnemyWorld(jitterX, jitterZ, 0.55, '__spawn__')) {
        this.spawnLaneIndex = (idx + 1) % lanes.length;
        return [jitterX, jitterZ];
      }
    }
    return this.currentMapId === 'backrooms' ? [0, -54] : [0, -54];
  }

  private updateBackroomsSandbox(delta: number) {
    // Regenerate sandbox grenades smoothly
    if (this.grenadeCount < this.maxGrenades) {
      this.nextbotGrenadeRegenTimer += delta;
      if (this.nextbotGrenadeRegenTimer >= 4.5) {
        this.nextbotGrenadeRegenTimer = 0;
        this.grenadeCount = Math.min(this.maxGrenades, this.grenadeCount + 1);
      }
    } else {
      this.nextbotGrenadeRegenTimer = 0;
    }

    const aliveNextbots = this.enemies.filter((e) => e.alive).length;
    if (aliveNextbots >= 7) return;

    this.nextbotSpawnTimer -= delta;
    if (this.nextbotSpawnTimer > 0) return;

    const [sx, sz] = this.pickZombieSpawnCoords();
    const kind = NEXTBOT_POOL[Math.floor(Math.random() * NEXTBOT_POOL.length)];
    const difficultyScale = 1 + Math.floor(this.kills / 8);
    this.nextbotSpawnCount += 1;
    const isMiniBoss = this.nextbotSpawnCount % 4 === 0;
    const bot = this.enemyFactory.spawnNextbot(
      this.worldGroup,
      sx,
      sz,
      kind,
      difficultyScale,
      isMiniBoss
    );
    this.enemies.push(bot);
    this.rebuildEnemyHitboxes();
    this.sound.playNextbotSpawn();
    if (isMiniBoss) {
      this.multiKillBanner = `¡MINI-JEFE ENTRANTE: ${bot.label}!`;
      this.multiKillTimer = 2.8;
    }
    this.nextbotSpawnTimer = aliveNextbots < 4 ? 1.35 : 2.35;
  }

  private boostNightcampEnemy(en: ActiveEnemy) {
    const hpMul = en.isBoss ? 1.55 : en.isMiniBoss ? 2.1 : 2.6;
    en.hp = Math.round(en.hp * hpMul);
    en.maxHp = en.hp;
    en.walkSpeed *= en.isBoss ? 1.28 : 1.38;
    en.fireCooldown = Math.min(en.fireCooldown, 0.55);
  }

  private updateHordeDirector(delta: number) {
    if (this.currentMapId === 'backrooms') {
      this.updateBackroomsSandbox(delta);
      return;
    }
    if (this.hordeIntermissionTimer > 0) {
      this.hordeIntermissionTimer -= delta;
      if (this.hordeIntermissionTimer <= 0) {
        this.hordeIntermissionTimer = 0;
        const nextWave = Math.min(this.maxWaves, this.hordeWave + 1);
        this.configureWave(nextWave);
        this.health = Math.min(this.maxHealth, this.health + 25);
        this.grenadeCount = Math.min(this.maxGrenades, this.grenadeCount + 1);
        this.openTentShopForWave(nextWave);
      }
      return;
    }

    if (this.hordeSpawnedInWave >= this.hordeTotalInWave) return;

    const aliveCount = this.enemies.filter((e) => e.alive).length;
    if (aliveCount >= this.hordeMaxAlive) return;

    this.hordeSpawnTimer -= delta;
    if (this.hordeSpawnTimer > 0) return;

    // CAMPAMENTO NOCTURNO: 1 Mega-Horda con los 5 JEFES a la vez + todos los tipos de enemigos x10!
    if (this.currentMapId === 'nightcamp') {
      if (!this.hordeBossSpawnedForWave) {
        this.hordeBossSpawnedForWave = true;
        const allBosses: ActiveEnemy[] = [
          this.enemyFactory.spawnZombieTankBoss(this.worldGroup, -14, -46),
          this.enemyFactory.spawnArmlessDesertBot(this.worldGroup, -7, -50, 5, true),
          this.enemyFactory.spawnTruckTransformer(this.worldGroup, 0, -52, 5, true),
          this.enemyFactory.spawnWingedKoopa(this.worldGroup, 7, -50, 5, true),
          this.enemyFactory.spawnRobloxPuebloEnemy(
            this.worldGroup,
            14,
            -46,
            'mayor',
            5,
            'JEFE · ALCALDE DE ESTE PUEBLO',
            true
          ),
        ];
        for (const boss of allBosses) {
          this.boostNightcampEnemy(boss);
          this.enemies.push(boss);
        }
        this.hordeSpawnedInWave += allBosses.length;
        this.rebuildEnemyHitboxes();
        this.sound.playBossSpawnHorn();
        this.multiKillBanner = '¡LOS 5 JEFES Y TODAS LAS HORDAS HAN LLEGADO!';
        this.multiKillTimer = 3.6;
        this.hordeSpawnTimer = 0.8;
        return;
      }

      const [sx, sz] = this.pickZombieSpawnCoords();
      const idx = this.hordeSpawnedInWave;
      const isMini = idx % 3 === 0;
      const typeRoll = idx % 6;
      let spawned: ActiveEnemy;
      if (typeRoll === 0) {
        spawned = this.enemyFactory.spawnArmedZombie(
          this.worldGroup,
          sx,
          sz,
          idx % 2 === 0 ? 'rifle' : 'shotgun',
          5,
          undefined,
          isMini
        );
      } else if (typeRoll === 1) {
        spawned = this.enemyFactory.spawnArmlessDesertBot(this.worldGroup, sx, sz, 5, false, isMini);
      } else if (typeRoll === 2) {
        spawned = this.enemyFactory.spawnTruckTransformer(this.worldGroup, sx, sz, 5, false, isMini);
      } else if (typeRoll === 3) {
        spawned = this.enemyFactory.spawnWingedKoopa(this.worldGroup, sx, sz, 5, false, isMini);
      } else if (typeRoll === 4) {
        spawned = this.enemyFactory.spawnRobloxPuebloEnemy(
          this.worldGroup,
          sx,
          sz,
          'suit',
          5,
          isMini ? 'MINI-JEFE · PATRÓN DE ESTE PUEBLO' : 'Caballero de Rojo',
          false,
          isMini
        );
      } else {
        const nkKind = NEXTBOT_POOL[idx % NEXTBOT_POOL.length];
        spawned = this.enemyFactory.spawnNextbot(this.worldGroup, sx, sz, nkKind, 4, isMini);
      }
      this.boostNightcampEnemy(spawned);
      this.enemies.push(spawned);
      this.hordeSpawnedInWave += 1;
      this.rebuildEnemyHitboxes();
      this.hordeSpawnTimer = this.hordeSpawnInterval;
      return;
    }

    if (this.hordeWave === this.maxWaves && !this.hordeBossSpawnedForWave) {
      this.hordeBossSpawnedForWave = true;
      const bossZ = this.playerPos.z < -30 ? -52 : -48;
      const boss =
        this.currentMapId === 'desert'
          ? this.enemyFactory.spawnArmlessDesertBot(this.worldGroup, 0, bossZ, this.hordeWave, true)
          : this.currentMapId === 'cubes'
          ? this.enemyFactory.spawnTruckTransformer(this.worldGroup, 0, bossZ, this.hordeWave, true)
          : this.currentMapId === 'pixel'
          ? this.enemyFactory.spawnWingedKoopa(this.worldGroup, 0, bossZ, this.hordeWave, true)
          : this.currentMapId === 'pueblo'
          ? this.enemyFactory.spawnRobloxPuebloEnemy(
              this.worldGroup,
              0,
              bossZ,
              'mayor',
              this.hordeWave,
              'JEFE · ALCALDE DE ESTE PUEBLO',
              true
            )
          : this.enemyFactory.spawnZombieTankBoss(this.worldGroup, 0, bossZ);
      this.enemies.push(boss);
      this.sound.playBossSpawnHorn();
    } else {
      // Determine whether this slot spawns an upgraded Mini-Boss ("mini jefe")
      let spawnMiniBoss = false;
      if (this.hordeMiniBossesSpawnedInWave < this.hordeMiniBossTargetForWave) {
        const triggerAt = Math.max(
          1,
          Math.floor(
            ((this.hordeMiniBossesSpawnedInWave + 1) * (this.hordeTotalInWave - 1)) /
              (this.hordeMiniBossTargetForWave + 1)
          )
        );
        if (this.hordeSpawnedInWave >= triggerAt) {
          spawnMiniBoss = true;
          this.hordeMiniBossesSpawnedInWave += 1;
        }
      }

      const [sx, sz] = this.pickZombieSpawnCoords();
      let spawnedEnemy: ActiveEnemy;
      if (this.currentMapId === 'desert') {
        spawnedEnemy = this.enemyFactory.spawnArmlessDesertBot(
          this.worldGroup,
          sx,
          sz,
          this.hordeWave,
          false,
          spawnMiniBoss
        );
      } else if (this.currentMapId === 'cubes') {
        spawnedEnemy = this.enemyFactory.spawnTruckTransformer(
          this.worldGroup,
          sx,
          sz,
          this.hordeWave,
          false,
          spawnMiniBoss
        );
      } else if (this.currentMapId === 'pixel') {
        spawnedEnemy = this.enemyFactory.spawnWingedKoopa(
          this.worldGroup,
          sx,
          sz,
          this.hordeWave,
          false,
          spawnMiniBoss
        );
      } else if (this.currentMapId === 'pueblo') {
        const pool: RobloxPuebloVariant[] = ['suit', 'suit', 'green_npc', 'blue_npc'];
        const variant = spawnMiniBoss ? 'suit' : pool[this.hordeSpawnedInWave % pool.length];
        const npcLabel = spawnMiniBoss
          ? 'MINI-JEFE · PATRÓN DE ESTE PUEBLO'
          : variant === 'suit'
          ? 'Caballero de Rojo'
          : variant === 'green_npc'
          ? 'Vecino de Verde'
          : 'Vecino de Azul';
        spawnedEnemy = this.enemyFactory.spawnRobloxPuebloEnemy(
          this.worldGroup,
          sx,
          sz,
          variant,
          this.hordeWave,
          npcLabel,
          false,
          spawnMiniBoss
        );
      } else {
        const roll = this.hordeSpawnedInWave % 3;
        const weaponType = spawnMiniBoss
          ? 'rifle'
          : roll === 0
          ? 'rifle'
          : roll === 1
          ? 'shotgun'
          : 'pistol';
        spawnedEnemy = this.enemyFactory.spawnArmedZombie(
          this.worldGroup,
          sx,
          sz,
          weaponType,
          this.hordeWave,
          undefined,
          spawnMiniBoss
        );
      }
      this.enemies.push(spawnedEnemy);

      if (spawnMiniBoss) {
        this.sound.playBossSpawnHorn();
        this.multiKillBanner = `¡MINI-JEFE ENTRANTE: ${spawnedEnemy.label}!`;
        this.multiKillTimer = 3.0;
      }
    }

    this.hordeSpawnedInWave += 1;
    this.rebuildEnemyHitboxes();
    this.hordeSpawnTimer = this.hordeSpawnInterval;
  }

  private hasLineOfSightToPlayer(en: ActiveEnemy): boolean {
    _enemyAimOrigin.set(en.root.position.x, en.isBoss ? 2.15 : 1.48, en.root.position.z);
    _enemyShotTarget.copy(this.camera.position);
    _enemyShotDir.subVectors(_enemyShotTarget, _enemyAimOrigin);
    const dist = _enemyShotDir.length();
    if (dist < 0.5) return true;
    _enemyShotDir.divideScalar(dist);

    this.raycaster.set(_enemyAimOrigin, _enemyShotDir);
    this.raycaster.far = dist;
    const hits = this.raycaster.intersectObjects(this.obstacles, false);
    return hits.length === 0;
  }

  private spawnEnemyTireGrenade(en: ActiveEnemy) {
    en.tireThrowAnimTimer = 0.45;
    const startPos = en.root.position.clone().add(new THREE.Vector3(0, en.isBoss ? 2.5 : 1.55, 0));
    const dx = this.playerPos.x - startPos.x;
    const dz = this.playerPos.z - startPos.z;
    const dist = Math.max(2, Math.hypot(dx, dz));
    const flightTime = THREE.MathUtils.clamp(dist / 13.5, 0.9, 2.0);

    const vel = new THREE.Vector3(
      dx / flightTime + (Math.random() - 0.5) * 1.1,
      (this.playerPos.y + 0.35 - startPos.y + 0.5 * GRENADE_GRAVITY * flightTime * flightTime) /
        flightTime,
      dz / flightTime + (Math.random() - 0.5) * 1.1
    );

    const model = createExplosiveTireMesh();
    model.root.position.copy(startPos);
    this.scene.add(model.root);

    this.grenadeIdCounter += 1;
    this.activeGrenades.push({
      id: this.grenadeIdCounter,
      model,
      pos: startPos,
      vel,
      rotVel: new THREE.Vector3(14, 2, 1.5),
      fuseRemaining: flightTime + 0.65,
      fuseMax: flightTime + 0.65,
      bounceCooldown: 0,
      owner: 'enemy',
      visualType: 'tire',
      damageScale: en.isBoss ? 1.25 : 1.0,
    });
    this.sound.playGrenadeThrow();
  }

  private spawnPetAlliedGrenade(targetPos: THREE.Vector3) {
    if (!this.captainPollo) return;
    const startPos = this.captainPollo.root.position.clone().add(new THREE.Vector3(0, 0.75, 0));
    const dx = targetPos.x - startPos.x;
    const dz = targetPos.z - startPos.z;
    const dist = Math.max(2, Math.hypot(dx, dz));
    const flightTime = THREE.MathUtils.clamp(dist / 14.5, 0.75, 1.55);

    const vel = new THREE.Vector3(
      dx / flightTime,
      (0.35 - startPos.y + 0.5 * GRENADE_GRAVITY * flightTime * flightTime) / flightTime,
      dz / flightTime
    );

    const model = createGrenadeModel();
    model.root.position.copy(startPos);
    this.scene.add(model.root);

    this.grenadeIdCounter += 1;
    this.activeGrenades.push({
      id: this.grenadeIdCounter,
      model,
      pos: startPos,
      vel,
      rotVel: new THREE.Vector3(11, 8, 12),
      fuseRemaining: flightTime + 0.35,
      fuseMax: flightTime + 0.35,
      bounceCooldown: 0,
      owner: 'pet',
      visualType: 'frag',
      damageScale: 1.0,
    });
    this.sound.playCaptainPolloSqawk();
    this.sound.playLegoHop();
  }

  private spawnKoopaBoomerang(en: ActiveEnemy, sideSign = 1) {
    const startPos = en.root.position
      .clone()
      .add(new THREE.Vector3(0, (en.hoverBaseY ?? 1.35) + 0.55, 0));
    const targetPos = new THREE.Vector3(
      this.playerPos.x,
      this.playerPos.y + this.eyeHeight * 0.72,
      this.playerPos.z
    );
    const toPlayer = targetPos.clone().sub(startPos);
    const dist = Math.max(3, toPlayer.length());
    const dir = toPlayer.clone().normalize();
    const apexPos = startPos.clone().addScaledVector(dir, Math.min(dist + 3.2, 34));
    apexPos.y = Math.max(0.85, targetPos.y);

    const sideVec = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    const mesh = createBoomerangMesh();
    mesh.root.position.copy(startPos);
    if (en.isBoss) mesh.root.scale.setScalar(1.45);
    this.scene.add(mesh.root);

    this.activeBoomerangs.push({
      mesh,
      startPos,
      apexPos,
      sideVec,
      arcWidth: (en.isBoss ? 4.2 : 3.2) * sideSign,
      ownerEnemy: en,
      age: 0,
      duration: en.isBoss ? 1.95 : 2.15,
      hitPlayer: false,
      damage: en.isBoss ? 22 : 16,
    });
  }

  private updateActiveBoomerangs(delta: number) {
    for (let i = this.activeBoomerangs.length - 1; i >= 0; i--) {
      const b = this.activeBoomerangs[i];
      b.age += delta;
      const p = b.age / b.duration;
      if (p >= 1) {
        this.scene.remove(b.mesh.root);
        b.mesh.dispose();
        this.activeBoomerangs.splice(i, 1);
        continue;
      }

      const halfMix = p < 0.5 ? p * 2 : (1 - p) * 2;
      const smooth = halfMix * halfMix * (3 - 2 * halfMix);
      const returnAnchor = b.ownerEnemy.alive
        ? b.ownerEnemy.root.position
            .clone()
            .add(new THREE.Vector3(0, (b.ownerEnemy.hoverBaseY ?? 1.35) + 0.5, 0))
        : b.startPos;

      const baseOrigin = p < 0.5 ? b.startPos : returnAnchor;
      const pos = new THREE.Vector3().lerpVectors(baseOrigin, b.apexPos, smooth);
      const lateralDir = p < 0.5 ? 1 : -1;
      const lateralOffset = Math.sin(p * Math.PI) * b.arcWidth * lateralDir;
      pos.addScaledVector(b.sideVec, lateralOffset);

      b.mesh.root.position.copy(pos);
      b.mesh.root.rotation.y += delta * 18;
      b.mesh.root.rotation.z = Math.sin(p * Math.PI) * 0.28;

      if (
        !b.hitPlayer &&
        !this.isGameOver &&
        !this.hordeVictory &&
        !this.tentShopOpen &&
        !this.chestActive
      ) {
        const playerTorsoY = this.playerPos.y + this.eyeHeight * 0.65;
        const distPlayer = Math.hypot(
          pos.x - this.playerPos.x,
          pos.y - playerTorsoY,
          pos.z - this.playerPos.z
        );
        if (distPlayer < 0.95) {
          b.hitPlayer = true;
          const nightMul = this.currentMapId === 'nightcamp' ? 3.2 : 1.0;
          this.health = Math.max(0, this.health - Math.round(b.damage * nightMul));
          this.timeSinceDamaged = 0;
          this.damageFlash = 1.0;
          this.cameraShake = Math.max(this.cameraShake, 0.25);
          this.sound.playPlayerHurt();
          if (this.health <= 0) {
            this.isGameOver = true;
            this.mouseDownLeft = false;
            this.virtualShootDown = false;
            this.unlockPointer();
          }
        }
      }
    }
  }

  private fireEnemyRound(en: ActiveEnemy, muzzleIndex: number) {
    const muzzleObj = en.muzzlePoints[muzzleIndex] ?? en.muzzlePoints[0];
    const flashMesh = en.muzzleFlashes[muzzleIndex] ?? en.muzzleFlashes[0];
    if (!muzzleObj) return;

    muzzleObj.getWorldPosition(_enemyMuzzleWorld);
    if (flashMesh) {
      flashMesh.visible = true;
      flashMesh.rotation.z = Math.random() * Math.PI * 2;
      en.muzzleFlashTimer = 0.055;
    }
    en.fireAnimTimer = 0.22;

    if (en.isTruckBot) {
      this.sound.playTruckCannon(en.isBoss);
    } else if (en.isArmlessBot) {
      this.sound.playBotLaser(en.isBoss);
    } else if (en.isKoopa) {
      this.sound.playKoopaLaser(en.isBoss);
    } else {
      this.sound.playEnemyShoot(en.isBoss);
    }

    _enemyShotTarget.set(
      this.playerPos.x,
      this.playerPos.y + this.eyeHeight - 0.14,
      this.playerPos.z
    );
    _enemyShotDir.subVectors(_enemyShotTarget, _enemyMuzzleWorld).normalize();

    const spread = en.isKoopa
      ? en.isBoss
        ? 0.036
        : en.isMiniBoss
        ? 0.044
        : 0.055
      : en.isRobloxPueblo
      ? en.isBoss
        ? 0.032
        : en.isMiniBoss
        ? 0.04
        : 0.052
      : en.isMiniBoss
      ? 0.045
      : en.isBoss
      ? 0.054
      : 0.082;
    _enemyShotDir.x += (Math.random() - 0.5) * 2 * spread;
    _enemyShotDir.y += (Math.random() - 0.5) * 1.4 * spread;
    _enemyShotDir.z += (Math.random() - 0.5) * 2 * spread;
    _enemyShotDir.normalize();

    this.raycaster.set(_enemyMuzzleWorld, _enemyShotDir);
    this.raycaster.far = 75;
    const obsHits = this.raycaster.intersectObjects(this.obstacles, false);
    const maxDist = obsHits.length > 0 ? obsHits[0].distance : 75;

    _enemyShotTarget.set(
      this.playerPos.x,
      this.playerPos.y + this.eyeHeight * 0.72,
      this.playerPos.z
    );
    const tProj = _enemyClosestPt
      .subVectors(_enemyShotTarget, _enemyMuzzleWorld)
      .dot(_enemyShotDir);

    let hitPlayer = false;
    let tracerEndDist = maxDist;

    if (tProj > 0 && tProj < maxDist) {
      _enemyClosestPt.copy(_enemyMuzzleWorld).addScaledVector(_enemyShotDir, tProj);
      const missDist = _enemyClosestPt.distanceTo(_enemyShotTarget);
      if (missDist < 0.44) {
        hitPlayer = true;
        tracerEndDist = tProj;
      }
    }

    const endPoint = _enemyMuzzleWorld.clone().addScaledVector(_enemyShotDir, tracerEndDist);
    this.spawnTracer(_enemyMuzzleWorld, endPoint, en.isKoopa ? 'koopa_laser' : 'enemy');

    if (hitPlayer && !this.isGameOver && !this.hordeVictory) {
      const baseDmg = en.isRobloxPueblo
        ? en.isBoss
          ? 15
          : en.isMiniBoss
          ? 14
          : 12
        : en.isKoopa
        ? en.isBoss
          ? 12
          : en.isMiniBoss
          ? 14
          : 13
        : en.isMiniBoss
        ? 12
        : en.isBoss
        ? 9
        : 9;
      const dmg = this.currentMapId === 'nightcamp' ? Math.round(baseDmg * 3.0) : baseDmg;
      this.health = Math.max(0, this.health - dmg);
      this.timeSinceDamaged = 0;
      this.damageFlash = 1.0;
      this.cameraShake = Math.max(this.cameraShake, 0.16);
      this.sound.playPlayerHurt();
      if (this.health <= 0) {
        this.isGameOver = true;
        this.mouseDownLeft = false;
        this.virtualShootDown = false;
        this.unlockPointer();
      }
    }
  }

  private updateWorldAndEnemies(delta: number) {
    if (this.menuForestUpdate) {
      this.menuForestUpdate(delta, this.elapsed);
    }

    if (this.flickerLight && this.flickerBulbMat) {
      const flick =
        Math.sin(this.elapsed * 19.0) * Math.sin(this.elapsed * 7.3) > 0.72
          ? 0.25
          : 0.9 + Math.sin(this.elapsed * 3.5) * 0.1;
      this.flickerLight.intensity = 2.4 * flick;
      this.flickerBulbMat.emissiveIntensity = 1.6 * flick;
    }

    for (let i = 0; i < this.fireLights.length; i++) {
      const base = i < 3 ? 2.6 : i < 6 ? 1.4 : 2.5;
      this.fireLights[i].intensity =
        base + Math.sin(this.elapsed * (11 + i * 2.1)) * 0.45 + Math.cos(this.elapsed * 19) * 0.2;
    }
    for (let i = 0; i < this.fireMeshes.length; i++) {
      const fm = this.fireMeshes[i];
      fm.scale.set(
        0.85 + Math.sin(this.elapsed * 14 + i) * 0.16,
        0.85 + Math.cos(this.elapsed * 17 + i) * 0.28,
        0.85 + Math.sin(this.elapsed * 12 + i) * 0.16
      );
      fm.rotation.y += delta * 2.5;
    }

    if (this.dustParticles) {
      this.dustParticles.rotation.y = this.elapsed * 0.015;
      this.dustParticles.position.y = Math.sin(this.elapsed * 0.4) * 0.25;
    }

    if (this.chickenNpc) {
      this.chickenNpc.update(delta, this.elapsed, this.playerPos);
    }

    // Smoothly animate remote multiplayer teammates
    for (const peer of this.mpState.peers) {
      const avatar = this.remoteAvatars.get(peer.id);
      if (avatar) {
        const peerWeaponId: WeaponId =
          peer.weaponId === 'pistol' ||
          peer.weaponId === 'rifle' ||
          peer.weaponId === 'sniper' ||
          peer.weaponId === 'shotgun' ||
          peer.weaponId === 'rocket' ||
          peer.weaponId === 'chicken_combo' ||
          peer.weaponId === 'chainsaw'
            ? peer.weaponId
            : 'rifle';
        avatar.updateState(
          peer.x,
          peer.y,
          peer.z,
          peer.yaw,
          peer.pitch,
          peerWeaponId,
          peer.isCrouching,
          Boolean(peer.isMoving),
          Boolean(peer.isSprinting),
          Boolean(peer.isDashing),
          peer.health,
          peer.maxHealth,
          delta
        );
      }
    }

    if (this.updateTutorialTargets) {
      this.updateTutorialTargets(delta, this.elapsed);
    }

    if (this.damageFlash > 0) {
      this.damageFlash = Math.max(0, this.damageFlash - delta * 2.8);
    }

    const combatActive =
      (this.currentMapId === 'city' ||
        this.currentMapId === 'desert' ||
        this.currentMapId === 'cubes' ||
        this.currentMapId === 'pixel' ||
        this.currentMapId === 'pueblo' ||
        this.currentMapId === 'nightcamp' ||
        this.currentMapId === 'backrooms' ||
        this.currentMapId === 'duel') &&
      this.hasStarted &&
      this.isLocked &&
      !this.isGameOver &&
      !this.hordeVictory &&
      !this.tentShopOpen &&
      !this.chestActive;

    // Update Capitán Pollo companion pet (stands in front or on left/right side via [V])
    if (this.captainPollo && !this.tentShopOpen && !this.chestActive) {
      let nearestEnemy: ActiveEnemy | null = null;
      let nearestDist = 42;
      for (let i = 0; i < this.enemies.length; i++) {
        const cand = this.enemies[i];
        if (!cand.alive) continue;
        const d = cand.root.position.distanceTo(this.captainPollo.root.position);
        if (d < nearestDist) {
          nearestDist = d;
          nearestEnemy = cand;
        }
      }

      this.captainPollo.update(
        delta,
        this.elapsed,
        this.playerPos,
        this.yaw,
        nearestEnemy?.root.position,
        this.companionSide
      );

      if (combatActive && nearestEnemy) {
        this.petGrenadeCooldown -= delta;
        if (this.petGrenadeCooldown <= 0) {
          this.petGrenadeCooldown = 6.2;
          this.captainPollo.triggerThrowPose();
          this.spawnPetAlliedGrenade(nearestEnemy.root.position);
        }
      }
    }

    if (combatActive) {
      this.survivalTimeSec += delta;
      if (this.currentMapId === 'duel') {
        if (this.duelBotEnabled && this.mpState.peers.length === 0) {
          const aliveBot = this.enemies.some((e) => e.alive);
          if (!aliveBot) {
            this.duelBotRespawnTimer += delta;
            if (this.duelBotRespawnTimer >= 2.2) {
              this.duelBotRespawnTimer = 0;
              this.spawnDuelSparringBot();
            }
          } else {
            this.duelBotRespawnTimer = 0;
          }
        }
      } else {
        this.updateHordeDirector(delta);
      }
      this.updateMedkits(delta);
    }

    // Update 1v1 Building Blueprint Preview & Blue Edit Grid Hover
    if (this.currentMapId === 'duel' && this.isLocked && !this.isGameOver) {
      if (this.isEditingBuild) {
        _rayOrigin.copy(this.camera.position);
        _rayDir.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
        this.raycaster.set(_rayOrigin, _rayDir);
        this.raycaster.far = 15;
        this.hoveredEditTile = this.buildingManager.updateEditHover(this.raycaster);
        if (this.mouseDownLeft && this.hoveredEditTile >= 0 && this.editPaintTarget !== null) {
          if (this.buildingManager.toggleEditTile(this.hoveredEditTile, this.editPaintTarget)) {
            this.sound.playEditTile();
          }
        }
      } else {
        this.buildingManager.updatePreview(
          this.activeBuildPiece,
          this.playerPos,
          this.yaw,
          this.pitch
        );
      }
    } else {
      this.buildingManager.hidePreview();
    }

    // Update Grenades, Rockets, Boomerangs & Explosions whenever active
    if (!this.tentShopOpen) {
      this.updateGrenadesAndExplosions(delta);
      this.updateActiveRockets(delta);
      this.updateActiveBoomerangs(delta);
    }
    if (this.chestActive) {
      this.updateChestCeremony(delta);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const en = this.enemies[i];

      if (en.hitFlashTimer > 0) {
        en.hitFlashTimer -= delta;
        if (en.hitFlashTimer <= 0) {
          en.flashMaterials.forEach((m) => m.emissive.setHex(0x000000));
        }
      }

      if (en.muzzleFlashTimer > 0) {
        en.muzzleFlashTimer -= delta;
        if (en.muzzleFlashTimer <= 0) {
          en.muzzleFlashes.forEach((f) => {
            f.visible = false;
          });
        }
      }

      if (en.fireAnimTimer && en.fireAnimTimer > 0) {
        en.fireAnimTimer = Math.max(0, en.fireAnimTimer - delta);
      }
      if (en.tireThrowAnimTimer && en.tireThrowAnimTimer > 0) {
        en.tireThrowAnimTimer = Math.max(0, en.tireThrowAnimTimer - delta);
      }
      if (en.stunTimer && en.stunTimer > 0) {
        en.stunTimer = Math.max(0, en.stunTimer - delta);
      }

      if (!en.alive) {
        en.collapseProgress = Math.min(1, en.collapseProgress + delta * (en.isBoss ? 1.8 : 4.2));
        const ease = 1 - Math.pow(1 - en.collapseProgress, 2);
        if (en.isKoopa) {
          en.bodyGroup.rotation.x = -ease * (Math.PI / 2 - 0.12);
          en.bodyGroup.rotation.y += delta * 6.0;
          en.bodyGroup.position.y = THREE.MathUtils.damp(
            en.bodyGroup.position.y,
            -((en.hoverBaseY ?? 1.35) - 0.15),
            6,
            delta
          );
          if (en.leftWingGroup && en.rightWingGroup) {
            en.leftWingGroup.rotation.z = THREE.MathUtils.damp(en.leftWingGroup.rotation.z, 0.25, 8, delta);
            en.rightWingGroup.rotation.z = THREE.MathUtils.damp(en.rightWingGroup.rotation.z, -0.25, 8, delta);
          }
        } else if (en.isBoss && !en.isArmlessBot && !en.isTruckBot) {
          en.bodyGroup.rotation.z = ease * 0.18;
          en.bodyGroup.position.y = -ease * 0.22;
          if (en.turretGroup) {
            en.turretGroup.rotation.x = ease * 0.15;
          }
        } else if (en.isArmlessBot || en.isTruckBot) {
          en.bodyGroup.rotation.x = -ease * (Math.PI / 2 - 0.1);
          en.bodyGroup.position.y = ease * 0.22;
        } else {
          en.bodyGroup.rotation.x = -ease * (Math.PI / 2 - 0.08);
          en.bodyGroup.position.y = ease * 0.16;
          en.torsoGroup.rotation.x = 0.14 + ease * 0.25;
        }

        if (this.hasStarted && !this.tentShopOpen) {
          en.deathCleanupTimer -= delta;
          if (en.deathCleanupTimer <= 0) {
            this.worldGroup.remove(en.root);
            en.disposeOwnMaterials();
            this.enemies.splice(i, 1);
            this.rebuildEnemyHitboxes();
          }
        }
        continue;
      }

      const t = this.elapsed + en.walkPhase;
      en.staggerX = THREE.MathUtils.damp(en.staggerX, 0, 11, delta);
      en.staggerY = THREE.MathUtils.damp(en.staggerY, 0, 11, delta);
      en.headFlinch = THREE.MathUtils.damp(en.headFlinch, 0, 12, delta);

      const isStunned = (en.stunTimer ?? 0) > 0;
      const stunSpeedMul = isStunned ? 0.35 : 1.0;

      const dx = this.playerPos.x - en.root.position.x;
      const dz = this.playerPos.z - en.root.position.z;
      const dist = Math.hypot(dx, dz);
      const angleToPlayer = Math.atan2(dx, dz);

      if (combatActive) {
        const yawDiff = normalizeAngleDiff(angleToPlayer, en.root.rotation.y);
        en.root.rotation.y +=
          yawDiff * Math.min(1, delta * (en.isBoss && !en.isArmlessBot && !en.isTruckBot && !en.isKoopa ? 1.8 : 5.5));

        if (en.isBoss && !en.isArmlessBot && !en.isTruckBot && !en.isKoopa && en.turretGroup) {
          const desiredTurretRel = normalizeAngleDiff(angleToPlayer, en.root.rotation.y);
          const tDiff = normalizeAngleDiff(desiredTurretRel, en.turretGroup.rotation.y);
          en.turretGroup.rotation.y += tDiff * Math.min(1, delta * 4.2);
        }

        let moved = false;
        if (dist > en.preferredRange) {
          const dirX = dx / Math.max(0.01, dist);
          const dirZ = dz / Math.max(0.01, dist);

          let sepX = 0;
          let sepZ = 0;
          for (let j = 0; j < this.enemies.length; j++) {
            const other = this.enemies[j];
            if (!other.alive || other.id === en.id) continue;
            const odx = en.root.position.x - other.root.position.x;
            const odz = en.root.position.z - other.root.position.z;
            const oDist = Math.hypot(odx, odz);
            const minSep = en.collisionRadius + other.collisionRadius + 0.9;
            if (oDist > 0.01 && oDist < minSep) {
              const push = (minSep - oDist) / minSep;
              sepX += (odx / oDist) * push * 0.9;
              sepZ += (odz / oDist) * push * 0.9;
            }
          }

          let vx = dirX + sepX;
          let vz = dirZ + sepZ;
          const vLen = Math.hypot(vx, vz) || 1;
          vx /= vLen;
          vz /= vLen;

          const step = en.walkSpeed * stunSpeedMul * delta;
          const nx = en.root.position.x + vx * step;
          const nz = en.root.position.z + vz * step;

          if (!this.collidesEnemyWorld(nx, nz, en.collisionRadius, en.id)) {
            en.root.position.x = nx;
            en.root.position.z = nz;
            moved = true;
          } else if (!this.collidesEnemyWorld(nx, en.root.position.z, en.collisionRadius, en.id)) {
            en.root.position.x = nx;
            moved = true;
          } else if (!this.collidesEnemyWorld(en.root.position.x, nz, en.collisionRadius, en.id)) {
            en.root.position.z = nz;
            moved = true;
          } else {
            const strafeX = en.root.position.x - dirZ * en.strafeSign * step * 0.85;
            if (!this.collidesEnemyWorld(strafeX, en.root.position.z, en.collisionRadius, en.id)) {
              en.root.position.x = strafeX;
              moved = true;
            } else {
              en.strafeSign *= -1;
            }
          }
        } else if (en.isKoopa || en.isRobloxPueblo || en.isMiniBoss) {
          // Winged Koopas, Pueblo Roblox fighters & Mini-Bosses weave laterally even inside preferredRange!
          const dirX = dx / Math.max(0.01, dist);
          const dirZ = dz / Math.max(0.01, dist);
          const strafeFactor = en.isKoopa ? 0.72 : en.isRobloxPueblo ? 0.68 : 0.45;
          const strafeStep = en.walkSpeed * strafeFactor * stunSpeedMul * delta * en.strafeSign;
          const sx = en.root.position.x - dirZ * strafeStep;
          const sz = en.root.position.z + dirX * strafeStep;
          if (!this.collidesEnemyWorld(sx, sz, en.collisionRadius, en.id)) {
            en.root.position.x = sx;
            en.root.position.z = sz;
            moved = true;
          } else {
            en.strafeSign *= -1;
          }
        }

        if (en.isNextbot) {
          // 2D Nextbot Meme chases relentlessly, bobs wildly, and turns around Backrooms corners
          en.root.rotation.y = angleToPlayer;
          en.torsoGroup.position.y = Math.abs(Math.sin(t * 8.0)) * 0.14;
          en.torsoGroup.rotation.z = Math.sin(t * 9.5) * 0.065;
          en.torsoGroup.rotation.x = en.staggerX * 0.8;

          if (!moved && dist > 1.4) {
            // Try perpendicular corridor steering if blocked by a wall
            const perpX = -dz / Math.max(0.01, dist);
            const perpZ = dx / Math.max(0.01, dist);
            const altStep = en.walkSpeed * stunSpeedMul * delta * en.strafeSign;
            const ax = en.root.position.x + perpX * altStep;
            const az = en.root.position.z + perpZ * altStep;
            if (!this.collidesEnemyWorld(ax, az, en.collisionRadius, en.id)) {
              en.root.position.x = ax;
              en.root.position.z = az;
            } else {
              en.strafeSign *= -1;
            }
          }

          if (en.meleeCooldown !== undefined && en.meleeCooldown > 0) {
            en.meleeCooldown = Math.max(0, en.meleeCooldown - delta);
          }
          if (dist < 1.55 && (en.meleeCooldown ?? 0) <= 0) {
            en.meleeCooldown = 0.72;
            const slapDmg = this.currentMapId === 'nightcamp' ? 42 : 13;
            this.health = Math.max(0, this.health - slapDmg);
            this.timeSinceDamaged = 0;
            this.damageFlash = 1.0;
            this.cameraShake = Math.max(this.cameraShake, 0.28);
            this.sound.playNextbotSlap();
            this.sound.playPlayerHurt();
            if (this.health <= 0) {
              this.isGameOver = true;
              this.mouseDownLeft = false;
              this.virtualShootDown = false;
              this.unlockPointer();
            }
          }
          continue;
        }

        const fireRecoil = en.fireAnimTimer && en.fireAnimTimer > 0
          ? Math.sin((en.fireAnimTimer / 0.22) * Math.PI)
          : 0;

        if (en.isKoopa) {
          en.bodyGroup.position.y = Math.sin(t * 3.8) * 0.34;
          if (en.leftWingGroup && en.rightWingGroup) {
            en.leftWingGroup.rotation.z = -0.2 + Math.sin(t * 14) * 0.52;
            en.rightWingGroup.rotation.z = 0.2 - Math.sin(t * 14) * 0.52;
          }
          const legSwing = Math.sin(t * 5.2) * 0.28;
          en.leftLegGroup.rotation.x = legSwing;
          en.rightLegGroup.rotation.x = -legSwing;

          if (en.boomerangCooldown !== undefined) {
            en.boomerangCooldown -= delta * stunSpeedMul;
            if (en.boomerangCooldown <= 0 && dist > 3.6 && dist < 44 && this.hasLineOfSightToPlayer(en)) {
              en.throwAnimTimer = 0.52;
              this.spawnKoopaBoomerang(en, 1);
              if (en.isBoss) {
                this.spawnKoopaBoomerang(en, -1);
                this.spawnKoopaBoomerang(en, 0);
              }
              this.sound.playBoomerangThrow();
              en.boomerangCooldown = en.isBoss ? 2.35 : 3.1 + Math.random() * 1.5;
            }
          }

          if (en.throwAnimTimer && en.throwAnimTimer > 0) {
            en.throwAnimTimer = Math.max(0, en.throwAnimTimer - delta);
            const prog = 1 - en.throwAnimTimer / 0.52;
            en.rightArmGroup.rotation.x = prog < 0.45 ? -2.1 * (prog / 0.45) : -2.1 + 2.85 * ((prog - 0.45) / 0.55);
            if (en.heldBoomerangMesh) {
              en.heldBoomerangMesh.visible = false;
            }
          } else {
            en.rightArmGroup.rotation.x = THREE.MathUtils.damp(en.rightArmGroup.rotation.x, -0.35 + Math.sin(t * 3.2) * 0.14, 10, delta);
            if (en.heldBoomerangMesh) {
              en.heldBoomerangMesh.visible = true;
            }
          }
          en.leftArmGroup.rotation.x = -0.3 + Math.cos(t * 3.2) * 0.14;
        } else if (en.isBoss && !en.isArmlessBot && !en.isTruckBot) {
          if (moved && en.roadWheels) {
            for (let w = 0; w < en.roadWheels.length; w++) {
              en.roadWheels[w].rotation.x += delta * 2.8;
            }
          }
          const barrelSpinSpeed = en.burstRemaining > 0 ? 22 : 2.2;
          if (en.leftBarrels) en.leftBarrels.rotation.z += delta * barrelSpinSpeed;
          if (en.rightBarrels) en.rightBarrels.rotation.z -= delta * barrelSpinSpeed;
        } else if (en.isTruckBot) {
          const restTorsoY = 1.08;
          if (moved) {
            en.walkPhase += delta * en.walkSpeed * 3.4;
            const swing = Math.sin(en.walkPhase) * 0.52;
            en.leftLegGroup.rotation.x = swing;
            en.rightLegGroup.rotation.x = -swing;
            en.torsoGroup.position.y = restTorsoY + Math.abs(Math.sin(en.walkPhase)) * 0.045;
          } else {
            en.leftLegGroup.rotation.x = THREE.MathUtils.damp(en.leftLegGroup.rotation.x, 0, 8, delta);
            en.rightLegGroup.rotation.x = THREE.MathUtils.damp(en.rightLegGroup.rotation.x, 0, 8, delta);
            en.torsoGroup.position.y = restTorsoY + Math.sin(t * 2.5) * 0.015;
          }

          const swingArm = moved ? Math.sin(en.walkPhase) * 0.25 : 0;
          const throwHeave =
            en.tireThrowAnimTimer && en.tireThrowAnimTimer > 0
              ? -Math.sin((en.tireThrowAnimTimer / 0.45) * Math.PI) * 0.95
              : 0;
          const kickL = en.barrelIndex === 1 ? fireRecoil * 0.28 : 0;
          const kickR = en.barrelIndex === 0 ? fireRecoil * 0.28 : 0;
          en.leftArmGroup.rotation.x = -swingArm + throwHeave - kickL;
          en.rightArmGroup.rotation.x = swingArm + throwHeave - kickR;

          // Explosive Truck Tire Throw ("te tiran ruedas explosivas")
          if (en.tireCooldown !== undefined) {
            en.tireCooldown -= delta * stunSpeedMul;
            if (en.tireCooldown <= 0 && dist < 34 && dist > 4.2 && this.hasLineOfSightToPlayer(en)) {
              this.spawnEnemyTireGrenade(en);
              en.tireCooldown = en.isBoss ? 3.8 : 5.4 + Math.random() * 2.4;
            }
          }
        } else if (en.isArmlessBot) {
          const restTorsoY = 1.12;
          if (moved) {
            en.walkPhase += delta * en.walkSpeed * 3.6;
            const swing = Math.sin(en.walkPhase) * 0.58;
            en.leftLegGroup.rotation.x = swing;
            en.rightLegGroup.rotation.x = -swing;
            en.torsoGroup.position.y = restTorsoY + Math.abs(Math.sin(en.walkPhase)) * 0.055;
          } else {
            en.leftLegGroup.rotation.x = THREE.MathUtils.damp(en.leftLegGroup.rotation.x, 0, 8, delta);
            en.rightLegGroup.rotation.x = THREE.MathUtils.damp(en.rightLegGroup.rotation.x, 0, 8, delta);
            en.torsoGroup.position.y = restTorsoY + Math.sin(t * 2.8) * 0.018;
          }
          if (en.jawGroup) {
            en.jawGroup.rotation.x = 0.08 + Math.max(0, Math.sin(t * 5.2)) * 0.24 + fireRecoil * 0.2;
          }
        } else if (en.isRobloxPueblo) {
          if (moved) {
            en.walkPhase += delta * en.walkSpeed * 3.8;
            const legSwing = Math.sin(en.walkPhase) * 0.62;
            en.leftLegGroup.rotation.x = legSwing;
            en.rightLegGroup.rotation.x = -legSwing;
            en.torsoGroup.position.y = 1.0 + Math.abs(Math.sin(en.walkPhase)) * 0.04;
            en.bodyGroup.rotation.z = Math.sin(en.walkPhase) * 0.04;
          } else {
            en.leftLegGroup.rotation.x = THREE.MathUtils.damp(en.leftLegGroup.rotation.x, 0, 10, delta);
            en.rightLegGroup.rotation.x = THREE.MathUtils.damp(en.rightLegGroup.rotation.x, 0, 10, delta);
            en.torsoGroup.position.y = 1.0 + Math.sin(t * 2.6) * 0.014;
            en.bodyGroup.rotation.z = THREE.MathUtils.damp(en.bodyGroup.rotation.z, 0, 10, delta);
          }
          const armSwing = moved ? Math.sin(en.walkPhase) * 0.44 : 0;
          en.leftArmGroup.rotation.x = -armSwing - (en.isBoss ? fireRecoil * 0.25 : 0);
          en.rightArmGroup.rotation.x = -fireRecoil * 0.34 + (moved ? armSwing * 0.35 : 0);
        } else {
          if (moved) {
            en.walkPhase += delta * en.walkSpeed * 3.8;
            const swing = Math.sin(en.walkPhase) * 0.56;
            en.leftLegGroup.rotation.x = swing;
            en.rightLegGroup.rotation.x = -swing;
            en.torsoGroup.position.y = 0.98 + Math.abs(Math.sin(en.walkPhase)) * 0.036;
            en.bodyGroup.rotation.z = Math.sin(en.walkPhase) * 0.055;
          } else {
            en.leftLegGroup.rotation.x = THREE.MathUtils.damp(en.leftLegGroup.rotation.x, 0, 8, delta);
            en.rightLegGroup.rotation.x = THREE.MathUtils.damp(en.rightLegGroup.rotation.x, 0, 8, delta);
            en.torsoGroup.position.y = 0.98 + Math.sin(t * 2.4) * 0.014;
            en.bodyGroup.rotation.z = THREE.MathUtils.damp(en.bodyGroup.rotation.z, 0, 8, delta);
          }
          en.rightArmGroup.rotation.x = -fireRecoil * 0.36;
          en.leftArmGroup.rotation.x = -fireRecoil * 0.14;
        }

        if (en.burstRemaining > 0) {
          en.burstShotTimer -= delta * stunSpeedMul;
          if (en.burstShotTimer <= 0) {
            this.fireEnemyRound(en, en.barrelIndex);
            en.barrelIndex = (en.barrelIndex + 1) % en.muzzlePoints.length;
            en.burstRemaining -= 1;
            en.burstShotTimer = en.isKoopa
              ? 0.1
              : en.isRobloxPueblo
              ? 0.11
              : en.isTruckBot
              ? 0.15
              : en.isArmlessBot
              ? 0.13
              : 0.11;
          }
        } else {
          en.fireCooldown -= delta * stunSpeedMul;
          if (en.fireCooldown <= 0 && dist < 44) {
            if (this.hasLineOfSightToPlayer(en)) {
              if (en.isBoss) {
                en.burstRemaining = en.isRobloxPueblo
                  ? 7
                  : en.isKoopa
                  ? 6
                  : en.isArmlessBot || en.isTruckBot
                  ? 5
                  : 6;
                en.burstShotTimer = 0;
                en.fireCooldown = en.isRobloxPueblo ? 0.9 : en.isKoopa ? 1.2 : 1.5;
              } else if (en.isMiniBoss) {
                en.burstRemaining = en.isKoopa ? 4 : 3;
                en.burstShotTimer = 0;
                en.fireCooldown = Math.max(
                  0.68,
                  1.12 - (this.hordeWave - 1) * 0.08 + Math.random() * 0.28
                );
              } else if (en.isRobloxPueblo) {
                en.burstRemaining = en.label.includes('Rojo') ? 3 : 2;
                en.burstShotTimer = 0;
                en.fireCooldown = Math.max(
                  0.62,
                  1.08 - (this.hordeWave - 1) * 0.09 + Math.random() * 0.35
                );
              } else if (en.isKoopa) {
                en.burstRemaining = 3;
                en.burstShotTimer = 0;
                en.fireCooldown = Math.max(0.8, 1.32 - (this.hordeWave - 1) * 0.1 + Math.random() * 0.45);
              } else if (en.isArmlessBot || en.isTruckBot) {
                en.burstRemaining = 2;
                en.burstShotTimer = 0;
                en.fireCooldown = Math.max(0.95, 1.65 - (this.hordeWave - 1) * 0.12 + Math.random() * 0.6);
              } else {
                this.fireEnemyRound(en, 0);
                en.fireCooldown = Math.max(
                  0.85,
                  1.75 - (this.hordeWave - 1) * 0.14 + Math.random() * 0.75
                );
              }
            } else {
              en.fireCooldown = 0.45;
            }
          }
        }
      } else if (en.isKoopa) {
        en.bodyGroup.position.y = Math.sin(t * 3.8) * 0.34;
        if (en.leftWingGroup && en.rightWingGroup) {
          en.leftWingGroup.rotation.z = -0.2 + Math.sin(t * 14) * 0.52;
          en.rightWingGroup.rotation.z = 0.2 - Math.sin(t * 14) * 0.52;
        }
      } else if (!en.isBoss && !en.isArmlessBot && !en.isTruckBot) {
        en.torsoGroup.position.y = 0.98 + Math.sin(t * 2.4) * 0.014;
      }

      const fireChestPulse =
        en.fireAnimTimer && en.fireAnimTimer > 0
          ? -Math.sin((en.fireAnimTimer / 0.22) * Math.PI) * 0.14
          : 0;
      const stunShake = isStunned ? Math.sin(this.elapsed * 42) * 0.09 : 0;

      if (en.isKoopa) {
        en.torsoGroup.rotation.x = 0.1 + en.staggerX + fireChestPulse + Math.sin(t * 3.8) * 0.04;
        en.torsoGroup.rotation.y = en.staggerY + stunShake;
        en.headGroup.rotation.x = en.headFlinch;
      } else if (en.isTruckBot) {
        en.torsoGroup.rotation.x = 0.04 + en.staggerX + fireChestPulse * 0.5 + Math.sin(t * 2.2) * 0.02;
        en.torsoGroup.rotation.y = en.staggerY + stunShake;
        en.headGroup.rotation.x = en.headFlinch;
      } else if (en.isArmlessBot) {
        en.torsoGroup.rotation.x = 0.12 + en.staggerX + fireChestPulse + Math.sin(t * 2.6) * 0.025;
        en.torsoGroup.rotation.y = en.staggerY + stunShake + Math.sin(t * 1.1) * 0.04;
        en.headGroup.rotation.y = Math.sin(t * 1.4) * 0.1;
        en.headGroup.rotation.x = en.headFlinch;
      } else if (!en.isBoss) {
        const twitch = Math.sin(t * 7.5) > 0.93 ? Math.sin(t * 28) * 0.12 : 0;
        en.torsoGroup.rotation.x = 0.14 + en.staggerX + fireChestPulse * 0.4 + Math.sin(t * 2.4) * 0.02;
        en.torsoGroup.rotation.y = en.staggerY + stunShake + Math.sin(t * 0.9) * 0.05;
        en.headGroup.rotation.y = Math.sin(t * 1.1) * 0.18 + twitch;
        en.headGroup.rotation.x = en.headFlinch + Math.sin(t * 1.7) * 0.05;
      } else {
        en.headGroup.rotation.x = en.headFlinch + Math.sin(t * 2.1) * 0.06;
        en.headGroup.rotation.y = stunShake + Math.sin(t * 1.4) * 0.14;
      }
    }

    // Backrooms Spatial Proximity Audio (Bob Esponja, En este pueblo, Among Us) & Warning
    if (this.currentMapId === 'backrooms') {
      const nearestDist: Record<NextbotKind, number | null> = {
        bob_esponja: null,
        en_este_pueblo: null,
        among_us: null,
      };
      const nearestPan: Record<NextbotKind, number> = {
        bob_esponja: 0,
        en_este_pueblo: 0,
        among_us: 0,
      };
      let nearestAnyDist = 999;
      let nearestAnyLabel: string | null = null;

      _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

      for (let i = 0; i < this.enemies.length; i++) {
        const en = this.enemies[i];
        if (!en.alive || !en.isNextbot || !en.nextbotKind) continue;
        const dx = en.root.position.x - this.playerPos.x;
        const dz = en.root.position.z - this.playerPos.z;
        const d = Math.hypot(dx, dz);
        if (d < nearestAnyDist) {
          nearestAnyDist = d;
          nearestAnyLabel = en.label;
        }
        const kind = en.nextbotKind;
        const prevBest = nearestDist[kind];
        if (prevBest === null || d < prevBest) {
          nearestDist[kind] = d;
          const len = Math.max(0.01, d);
          nearestPan[kind] = (dx / len) * _right.x + (dz / len) * _right.z;
        }
      }

      const isActiveBackroomsAudio =
        combatActive ||
        (this.hasStarted && !this.isGameOver && this.isLocked);
      for (const kind of NEXTBOT_POOL) {
        this.sound.updateNextbotProximityAudio(
          kind,
          nearestDist[kind],
          nearestPan[kind],
          isActiveBackroomsAudio
        );
      }

      if (nearestAnyLabel && nearestAnyDist < 12.5) {
        this.nextbotAlert = `¡${nearestAnyLabel.toUpperCase()} ESTÁ CERCA!`;
      } else {
        this.nextbotAlert = null;
      }
    } else if (this.currentMapId === 'pueblo') {
      let nearestDist: number | null = null;
      let nearestPan = 0;
      _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
      for (let i = 0; i < this.enemies.length; i++) {
        const en = this.enemies[i];
        if (!en.alive) continue;
        const dx = en.root.position.x - this.playerPos.x;
        const dz = en.root.position.z - this.playerPos.z;
        const d = Math.hypot(dx, dz);
        if (nearestDist === null || d < nearestDist) {
          nearestDist = d;
          const len = Math.max(0.01, d);
          nearestPan = (dx / len) * _right.x + (dz / len) * _right.z;
        }
      }
      const isActivePuebloAudio =
        combatActive ||
        (this.hasStarted && !this.isGameOver && !this.hordeVictory && !this.tentShopOpen && this.isLocked);
      this.sound.updatePuebloThemeAudio(nearestDist, nearestPan, isActivePuebloAudio);
      this.nextbotAlert = null;
    } else {
      this.nextbotAlert = null;
    }

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tr = this.tracers[i];
      tr.life -= delta;
      if (tr.life <= 0) {
        this.scene.remove(tr.mesh);
        (tr.mesh.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
      } else {
        (tr.mesh.material as THREE.MeshBasicMaterial).opacity = (tr.life / tr.maxLife) * 0.88;
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= delta;
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.sparks.splice(i, 1);
      } else {
        s.vel.y -= 14 * delta;
        s.mesh.position.addScaledVector(s.vel, delta);
        if (s.mesh.position.y < 0.02) s.mesh.position.y = 0.02;
        s.mesh.scale.setScalar(s.life / s.maxLife);
      }
    }

    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const sm = this.smokes[i];
      sm.life -= delta;
      if (sm.life <= 0) {
        this.scene.remove(sm.mesh);
        (sm.mesh.material as THREE.Material).dispose();
        this.smokes.splice(i, 1);
      } else {
        sm.mesh.position.addScaledVector(sm.vel, delta);
        const progress = 1 - sm.life / sm.maxLife;
        sm.mesh.scale.setScalar(1 + progress * 3.5);
        (sm.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.32;
      }
    }

    for (let i = this.shells.length - 1; i >= 0; i--) {
      const sh = this.shells[i];
      sh.life -= delta;
      if (sh.life <= 0) {
        this.scene.remove(sh.mesh);
        this.shells.splice(i, 1);
      } else {
        sh.vel.y -= 13.5 * delta;
        sh.mesh.position.addScaledVector(sh.vel, delta);
        sh.mesh.rotation.x += sh.rotVel.x * delta;
        sh.mesh.rotation.y += sh.rotVel.y * delta;
        sh.mesh.rotation.z += sh.rotVel.z * delta;
        if (sh.mesh.position.y <= 0.02) {
          sh.mesh.position.y = 0.02;
          sh.vel.y = Math.abs(sh.vel.y) * 0.38;
          sh.vel.x *= 0.6;
          sh.vel.z *= 0.6;
          sh.rotVel.multiplyScalar(0.5);
        }
      }
    }

    if (this.hitmarkerTimer > 0) {
      this.hitmarkerTimer -= delta;
      if (this.hitmarkerTimer <= 0) {
        this.hitmarkerType = 'none';
      }
    }

    if (this.eliminationBannerTimer > 0) {
      this.eliminationBannerTimer -= delta;
      if (this.eliminationBannerTimer <= 0) {
        this.lastEliminationName = null;
      }
    }

    if (this.multiKillTimer > 0) {
      this.multiKillTimer -= delta;
      if (this.multiKillTimer <= 0) {
        this.multiKillBanner = null;
      }
    }

    if (this.lastDamagedTimer > 0) {
      this.lastDamagedTimer -= delta;
      if (this.lastDamagedTimer <= 0) {
        this.lastDamagedEnemy = null;
      }
    }

    if (this.medkitNoticeTimer > 0) {
      this.medkitNoticeTimer -= delta;
      if (this.medkitNoticeTimer <= 0) {
        this.medkitNotice = null;
      }
    }
  }

  private spawnRandomMedkit() {
    let rangeX = 13.5;
    let minZ = -48;
    let maxZ = 13;
    if (this.currentMapId === 'backrooms') {
      rangeX = 54;
      minZ = -54;
      maxZ = 54;
    } else if (this.currentMapId === 'duel') {
      rangeX = 28;
      minZ = -28;
      maxZ = 28;
    } else if (this.currentMapId === 'desert' || this.currentMapId === 'cubes' || this.currentMapId === 'pixel' || this.currentMapId === 'pueblo') {
      rangeX = 16;
      minZ = -52;
      maxZ = 13;
    }

    let chosenX = 0;
    let chosenZ = 0;
    let found = false;
    for (let attempt = 0; attempt < 18; attempt++) {
      const cx = (Math.random() * 2 - 1) * rangeX;
      const cz = minZ + Math.random() * (maxZ - minZ);
      if (Math.hypot(cx - this.playerPos.x, cz - this.playerPos.z) < 4.5) continue;
      if (!this.collidesPointWithBox(cx, 0.5, cz, 0.9)) {
        chosenX = cx;
        chosenZ = cz;
        found = true;
        break;
      }
    }
    if (!found) {
      chosenX = (Math.random() * 2 - 1) * 5;
      chosenZ = this.currentMapId === 'duel' || this.currentMapId === 'backrooms' ? 0 : 4;
    }

    const groundY = this.currentMapId === 'city' && Math.abs(chosenX) >= 9.2 && Math.abs(chosenX) <= 17.2 ? 0.22 : 0;
    const mesh = createMedkitMesh();
    mesh.root.position.set(chosenX, groundY, chosenZ);
    this.scene.add(mesh.root);
    this.medkitIdCounter += 1;
    this.activeMedkits.push({
      id: this.medkitIdCounter,
      mesh,
      x: chosenX,
      y: groundY,
      z: chosenZ,
      phase: Math.random() * Math.PI * 2,
    });
  }

  private updateMedkits(delta: number) {
    this.medkitSpawnTimer -= delta;
    if (this.medkitSpawnTimer <= 0) {
      this.medkitSpawnTimer = 10.0;
      if (this.activeMedkits.length < 4) {
        this.spawnRandomMedkit();
      }
    }

    for (let i = this.activeMedkits.length - 1; i >= 0; i--) {
      const mk = this.activeMedkits[i];
      mk.phase += delta * 2.4;
      mk.mesh.boxGroup.rotation.y += delta * 1.6;
      mk.mesh.boxGroup.position.y = 0.42 + Math.sin(mk.phase) * 0.1;
      const pulse = 1 + Math.sin(mk.phase * 1.4) * 0.1;
      mk.mesh.ringMesh.scale.setScalar(pulse);

      const distHoriz = Math.hypot(this.playerPos.x - mk.x, this.playerPos.z - mk.z);
      const distVert = Math.abs(this.playerPos.y - mk.y);
      if (distHoriz < 1.45 && distVert < 2.2 && this.health < this.maxHealth) {
        const healed = Math.min(40, this.maxHealth - this.health);
        this.health = Math.min(this.maxHealth, this.health + 40);
        this.medkitsUsed += 1;
        this.medkitNotice = `+${Math.round(healed)} PS · BOTIQUÍN`;
        this.medkitNoticeTimer = 2.4;
        this.sound.playMedkitPickup();
        this.scene.remove(mk.mesh.root);
        mk.mesh.dispose();
        this.activeMedkits.splice(i, 1);
      }
    }
  }

  private getInspectedTarget(): EnemyHudTarget | null {
    if (this.currentMapId === 'tutorial') return null;

    _rayOrigin.copy(this.camera.position);
    _rayDir.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.raycaster.set(_rayOrigin, _rayDir);
    this.raycaster.far = 95;

    let targetEnemy: ActiveEnemy | null = null;
    const hits = this.raycaster.intersectObjects(this.enemyHitboxes, false);
    if (hits.length > 0) {
      const obsHits = this.raycaster.intersectObjects(this.obstacles, false);
      const maxDist = obsHits.length > 0 ? obsHits[0].distance : 95;
      if (hits[0].distance <= maxDist) {
        const found = this.enemies.find((e) => e.id === hits[0].object.userData.enemyId);
        if (found && found.alive) {
          targetEnemy = found;
        }
      }
    }

    if (!targetEnemy && this.lastDamagedEnemy && this.lastDamagedEnemy.alive) {
      targetEnemy = this.lastDamagedEnemy;
    }

    if (!targetEnemy || targetEnemy.isBoss) return null;

    targetEnemy.headAnchor.getWorldPosition(_projVec);
    const dist = this.camera.position.distanceTo(_projVec);
    _projVec.project(this.camera);

    const visible =
      _projVec.z < 1 &&
      _projVec.x >= -0.95 &&
      _projVec.x <= 0.95 &&
      _projVec.y >= -0.95 &&
      _projVec.y <= 0.95;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    return {
      id: targetEnemy.id,
      label: targetEnemy.label,
      hp: targetEnemy.hp,
      maxHp: targetEnemy.maxHp,
      distance: Math.round(dist),
      screenX: ((_projVec.x + 1) / 2) * width,
      screenY: ((-_projVec.y + 1) / 2) * height,
      visible,
      isMiniBoss: Boolean(targetEnemy.isMiniBoss),
    };
  }

  private getTutorialHudState(): TutorialHudState {
    const info = TUTORIAL_LINES[this.tutorialStep];
    return {
      active: this.currentMapId === 'tutorial',
      step: this.tutorialStep,
      title: info.title,
      speakerName: 'Coronel Plumaje',
      dialogue: info.dialogue,
      progress: Math.min(this.tutorialProgress, info.goal),
      goal: info.goal,
      completed: this.tutorialStep === 'complete',
    };
  }

  private getHordeHudState(): HordeHudState {
    const aliveBosses = this.enemies.filter((e) => e.isBoss && e.alive);
    const boss = aliveBosses[0];
    const miniBoss = this.enemies.find((e) => e.isMiniBoss && !e.isBoss && e.alive);
    const totalBossHp =
      this.currentMapId === 'nightcamp'
        ? aliveBosses.reduce((sum, b) => sum + b.hp, 0)
        : boss
        ? boss.hp
        : 0;
    const totalBossMaxHp =
      this.currentMapId === 'nightcamp'
        ? aliveBosses.reduce((sum, b) => sum + b.maxHp, 0)
        : boss
        ? boss.maxHp
        : this.currentMapId === 'pixel'
        ? 2950
        : this.currentMapId === 'cubes'
        ? 2100
        : this.currentMapId === 'pueblo'
        ? 3150
        : this.currentMapId === 'desert'
        ? 1850
        : 1100;
    const defaultBossName =
      this.currentMapId === 'nightcamp'
        ? `COALICIÓN DE LOS ${aliveBosses.length} JEFES`
        : this.currentMapId === 'desert'
        ? 'JEFE · COLOSO CARMESÍ'
        : this.currentMapId === 'cubes'
        ? 'JEFE · MEGA-CAMIÓN TITÁN'
        : this.currentMapId === 'pixel'
        ? 'JEFE · REY KOOPA ALADO'
        : this.currentMapId === 'pueblo'
        ? 'JEFE · ALCALDE DE ESTE PUEBLO'
        : 'JEFE · TANQUE ZOMBI';
    const bossLabel =
      this.currentMapId === 'nightcamp' && aliveBosses.length > 1
        ? `5 JEFES SIMULTÁNEOS (${aliveBosses.length} activos)`
        : boss?.label ?? defaultBossName;
    return {
      active:
        this.currentMapId === 'city' ||
        this.currentMapId === 'desert' ||
        this.currentMapId === 'cubes' ||
        this.currentMapId === 'pixel' ||
        this.currentMapId === 'pueblo' ||
        this.currentMapId === 'nightcamp',
      wave: this.hordeWave,
      maxWaves: this.getMaxWavesForMap(),
      defeatedInWave: this.hordeDefeatedInWave,
      totalInWave: this.hordeTotalInWave,
      intermissionSec: Math.ceil(this.hordeIntermissionTimer),
      bossActive: aliveBosses.length > 0,
      bossName: bossLabel,
      bossHp: totalBossHp,
      bossMaxHp: Math.max(1, totalBossMaxHp),
      miniBossActive: Boolean(miniBoss),
      miniBossName: miniBoss?.label ?? '',
      miniBossHp: miniBoss ? miniBoss.hp : 0,
      miniBossMaxHp: miniBoss ? miniBoss.maxHp : 100,
      victory: this.hordeVictory,
    };
  }

  private getGrenadeHudState(): GrenadeHudState {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    const activeMarkers: GrenadeWorldMarker[] = [];
    for (let i = 0; i < this.activeGrenades.length; i++) {
      const g = this.activeGrenades[i];
      _projVec.copy(g.pos);
      _projVec.y += 0.32;
      _projVec.project(this.camera);
      const visible =
        _projVec.z < 1 &&
        _projVec.x >= -0.95 &&
        _projVec.x <= 0.95 &&
        _projVec.y >= -0.95 &&
        _projVec.y <= 0.95;

      activeMarkers.push({
        id: g.id,
        fuseRemaining: Math.max(0, g.fuseRemaining),
        fuseMax: g.fuseMax,
        screenX: ((_projVec.x + 1) / 2) * width,
        screenY: ((-_projVec.y + 1) / 2) * height,
        visible,
        owner: g.owner,
        label: g.visualType === 'tire' ? '¡Rueda!' : g.owner === 'pet' ? 'Pollo' : undefined,
      });
    }

    return {
      count: this.grenadeCount,
      maxCount: this.maxGrenades,
      isAiming: this.isAimingGrenade,
      heldFuseSec: Math.max(0.45, BASE_GRENADE_FUSE - this.grenadeHoldTime * 0.55),
      maxFuseSec: BASE_GRENADE_FUSE,
      blastRadius: this.getGrenadeBlastRadius(),
      activeMarkers,
    };
  }

  private getTentShopState(): TentShopState {
    return {
      open: this.tentShopOpen,
      wave: this.hordeWave,
      greeting: CORONEL_TENT_GREETINGS[this.hordeWave] ?? CORONEL_TENT_GREETINGS[1],
      options: this.currentShopOptions,
      ownedIds: [...this.ownedUpgrades],
    };
  }

  private getChestCeremonyState(): ChestCeremonyState {
    return {
      active: this.chestActive,
      stage: this.chestStage,
      progress:
        this.chestStage === 'opening'
          ? Math.min(1, this.chestTimer / 1.35)
          : this.chestStage === 'revealed'
          ? 1
          : 0,
      rewardKind: this.chestRewardKind,
    };
  }

  private emitHud() {
    const spec = WEAPON_SPECS[this.activeWeaponId];
    const spread = this.isAds ? spec.spreadAds : spec.spreadHip;
    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    const spreadPixels = Math.round(
      8 + spread * 460 + (horizSpeed > 1 ? 5 : 0) + this.recoilOffsetZ * 110
    );
    const aliveEnemies = this.enemies.filter((e) => e.alive).length;
    const reloadDuration = spec.reloadTimeSec / this.reloadSpeedMul;

    this.callbacks.onHudUpdate({
      mapId: this.currentMapId,
      isLocked: this.isLocked,
      hasStarted: this.hasStarted,
      isGameOver: this.isGameOver,
      isSprinting: this.isSprinting,
      isCrouching: this.isCrouching,
      isDashing: this.dashActiveTimer > 0,
      dashCooldown: this.dashCooldownTimer,
      dashCooldownMax: this.dashCooldownMax,
      isAds: this.isAds,
      sniperZoom: this.sniperZoom,
      isReloading: this.isReloading,
      reloadProgress: this.isReloading ? Math.min(1, this.reloadElapsed / reloadDuration) : 0,
      health: this.health,
      maxHealth: this.maxHealth,
      damageFlash: this.damageFlash,
      activeWeaponId: this.activeWeaponId,
      unlockedWeapons: [...this.unlockedWeapons],
      petUnlocked: this.petUnlocked,
      companionSide: this.companionSide,
      ammoByWeapon: { ...this.ammoByWeapon },
      maxAmmoByWeapon: {
        pistol: this.getMaxAmmo('pistol'),
        rifle: this.getMaxAmmo('rifle'),
        sniper: this.getMaxAmmo('sniper'),
        shotgun: this.getMaxAmmo('shotgun'),
        rocket: this.getMaxAmmo('rocket'),
        chicken_combo: this.getMaxAmmo('chicken_combo'),
        chainsaw: this.getMaxAmmo('chainsaw'),
      },
      kills: this.kills,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      headshots: this.headshots,
      survivalTimeSec: this.survivalTimeSec,
      damageDealt: this.damageDealt,
      medkitsUsed: this.medkitsUsed,
      activeMedkits: this.activeMedkits.length,
      medkitNotice: this.medkitNotice,
      skinId: this.skinId,
      aliveEnemies,
      totalEnemies: this.enemies.length,
      spreadPixels,
      hitmarkerType: this.hitmarkerType,
      lastEliminationName: this.lastEliminationName,
      multiKillBanner: this.multiKillBanner,
      activeTarget: this.getInspectedTarget(),
      tutorial: this.getTutorialHudState(),
      horde: this.getHordeHudState(),
      grenade: this.getGrenadeHudState(),
      tentShop: this.getTentShopState(),
      chestCeremony: this.getChestCeremonyState(),
      multiplayer: this.mpState,
      nextbotAlert: this.nextbotAlert,
      build: {
        enabled: this.currentMapId === 'duel',
        activePiece: this.activeBuildPiece,
        isEditing: this.isEditingBuild,
        editPieceType: this.buildingManager.getEditPieceType(),
        editMask: this.buildingManager.getEditMask(),
        hoveredTileIndex: this.hoveredEditTile >= 0 ? this.hoveredEditTile : null,
        pieceCount: this.buildingManager.getPieceCount(),
        buildsPlaced: this.buildsPlaced,
        editsMade: this.editsMade,
        sparringBotEnabled: this.duelBotEnabled,
      },
    });
  }

  private tick = () => {
    if (this.disposed) return;

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.elapsed += delta;

    if (this.isLocked && !this.isGameOver && !this.hordeVictory && !this.tentShopOpen && !this.chestActive) {
      this.updatePlayer(delta);
    } else if (this.isMenuForestActive) {
      let targetPosX: number;
      let targetPosY: number;
      let targetPosZ: number;
      let targetLookX: number;
      let targetLookY: number;
      let targetLookZ: number;
      let targetFov = this.baseFov;

      if (this.menuCameraPreset === 'deploy_board') {
        const narrowExtra =
          this.camera.aspect < 1.48 ? Math.min(2.45, (1.48 - this.camera.aspect) * 2.75) : 0;
        const dist = 3.88 + narrowExtra;
        targetLookX = -3.72;
        targetLookY = 1.56;
        targetLookZ = -1.22;
        targetPosX = targetLookX + 0.4259 * dist + Math.sin(this.elapsed * 0.22) * 0.035;
        targetPosY = 1.62 + Math.cos(this.elapsed * 0.27) * 0.02;
        targetPosZ = targetLookZ + 0.9048 * dist + Math.cos(this.elapsed * 0.18) * 0.03;
        targetFov = 56;
      } else {
        targetPosX = -0.35 + Math.sin(this.elapsed * 0.16) * 0.24;
        targetPosY = 1.38 + Math.cos(this.elapsed * 0.21) * 0.05;
        targetPosZ = 3.35 + Math.cos(this.elapsed * 0.13) * 0.18;
        targetLookX = 0.92;
        targetLookY = 0.58;
        targetLookZ = -0.32;
      }

      this.menuCamPos.x = THREE.MathUtils.damp(this.menuCamPos.x, targetPosX, 4.8, delta);
      this.menuCamPos.y = THREE.MathUtils.damp(this.menuCamPos.y, targetPosY, 4.8, delta);
      this.menuCamPos.z = THREE.MathUtils.damp(this.menuCamPos.z, targetPosZ, 4.8, delta);
      this.menuCamLook.x = THREE.MathUtils.damp(this.menuCamLook.x, targetLookX, 5.4, delta);
      this.menuCamLook.y = THREE.MathUtils.damp(this.menuCamLook.y, targetLookY, 5.4, delta);
      this.menuCamLook.z = THREE.MathUtils.damp(this.menuCamLook.z, targetLookZ, 5.4, delta);

      const nextFov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5.0, delta);
      if (Math.abs(nextFov - this.camera.fov) > 0.01) {
        this.camera.fov = nextFov;
        this.camera.updateProjectionMatrix();
      }

      this.camera.position.copy(this.menuCamPos);
      this.camera.lookAt(this.menuCamLook);
    } else if (!this.hasStarted && this.currentMapId === 'city') {
      this.camera.position.set(
        Math.sin(this.elapsed * 0.14) * 2.2,
        2.6,
        12 + Math.cos(this.elapsed * 0.12) * 1.5
      );
      this.camera.rotation.set(-0.04, Math.sin(this.elapsed * 0.1) * 0.12, 0, 'YXZ');
    }

    this.updateWeapons(delta);
    this.updateWorldAndEnemies(delta);

    // Local WebSocket multiplayer state & host horde synchronization (30Hz)
    if (this.mpState.inRoom && !this.isGameOver) {
      this.netSyncAccum += delta;
      if (this.netSyncAccum >= 0.033) {
        this.netSyncAccum = 0;
        const isMoving = Math.hypot(this.playerVel.x, this.playerVel.z) > 0.45;
        this.mpClient.sendPlayerState({
          x: this.playerPos.x,
          y: this.playerPos.y,
          z: this.playerPos.z,
          yaw: this.yaw,
          pitch: this.pitch,
          weaponId: this.activeWeaponId,
          skinId: this.skinId,
          isCrouching: this.isCrouching,
          isMoving,
          isSprinting: this.isSprinting,
          isDashing: this.dashActiveTimer > 0,
          health: this.health,
          maxHealth: this.maxHealth,
          kills: this.kills,
        });
      }

      if (this.mpState.isHost) {
        this.hordeSyncAccum += delta;
        if (this.hordeSyncAccum >= 0.1) {
          this.hordeSyncAccum = 0;
          this.mpClient.sendHordeSync({
            wave: this.hordeWave,
            defeatedInWave: this.hordeDefeatedInWave,
            totalInWave: this.hordeTotalInWave,
            victory: this.hordeVictory,
            enemies: this.enemies.slice(0, 12).map((en) => ({
              id: en.id,
              x: en.root.position.x,
              z: en.root.position.z,
              yaw: en.root.rotation.y,
              hp: en.hp,
              maxHp: en.maxHp,
              alive: en.alive,
              isBoss: en.isBoss,
            })),
          });
        }
      }
    }

    if (this.composer && !this.isSoftwareGl) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    this.hudEmitAccum += delta;
    if (this.hudEmitAccum >= 0.032) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }

    this.scheduleNextFrame();
  };

  private scheduleNextFrame() {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('mousemove', this.onMouseMoveBound);
    window.removeEventListener('mousedown', this.onMouseDownBound);
    window.removeEventListener('pointerdown', this.onMenuAudioUnlockBound);
    window.removeEventListener('mouseup', this.onMouseUpBound);
    window.removeEventListener('wheel', this.onWheelBound);
    this.renderer.domElement.removeEventListener('contextmenu', this.onContextMenuBound);
    document.removeEventListener('pointerlockchange', this.onPointerLockChangeBound);
    document.removeEventListener('pointerlockerror', this.onPointerLockErrorBound);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLostBound);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestoredBound);

    this.disposeMap();
    this.clearAllEnemies();
    this.clearActiveGrenadesAndExplosions();
    this.clearChestCeremony();
    this.clearActiveMedkits();
    this.buildingManager.dispose();
    this.enemyFactory.dispose();
    if (this.chickenNpc) this.chickenNpc.dispose();
    if (this.captainPollo) {
      this.scene.remove(this.captainPollo.root);
      this.captainPollo.dispose();
    }
    this.remoteAvatars.forEach((av) => {
      this.scene.remove(av.root);
      av.dispose();
    });
    this.remoteAvatars.clear();
    this.mpClient.dispose();
    this.handGrenadePreview.dispose();
    this.trajectoryBeadGeo.dispose();
    this.trajectoryBeadMat.dispose();
    this.landingRingMat.dispose();
    this.landingDiscMat.dispose();
    this.explosionCoreGeo.dispose();
    this.explosionRingGeo.dispose();
    this.clearTransientEffects();
    this.tracerGeo.dispose();
    this.tracerMatPlayer.dispose();
    this.tracerMatUpgraded.dispose();
    this.tracerMatEnemy.dispose();
    this.tracerMatKoopaLaser.dispose();
    this.sparkGeo.dispose();
    this.sparkMatEnemy.dispose();
    this.sparkMatMetal.dispose();
    this.sparkMatConcrete.dispose();
    this.sparkMatExplosion.dispose();
    this.smokeGeo.dispose();
    this.shellGeo.dispose();
    this.shellMatBrass.dispose();
    this.shellMatRed.dispose();
    if (this.envRT) this.envRT.dispose();
    if (this.composer) this.composer.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });

    this.sound.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
