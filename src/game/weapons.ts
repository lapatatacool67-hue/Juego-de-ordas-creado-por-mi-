import * as THREE from 'three';
import type { CharacterSkinId, WeaponId, WeaponSpec } from './types';

export interface CharacterSkinMeta {
  id: CharacterSkinId;
  name: string;
  tag: string;
  description: string;
  primaryHex: string;
  accentHex: string;
  sleeveHex: number;
  gloveHex: number;
  knuckleHex: number;
}

export const SKIN_CATALOG: CharacterSkinMeta[] = [
  {
    id: 'soldier',
    name: 'Soldado Táctico',
    tag: 'Clásico',
    description: 'Armadura azul cobalto con visor balístico y guantes militares.',
    primaryHex: '#2563eb',
    accentHex: '#38bdf8',
    sleeveHex: 0x2c3430,
    gloveHex: 0x17191d,
    knuckleHex: 0x2f353f,
  },
  {
    id: 'astronaut',
    name: 'Astronauta Orbital',
    tag: 'Espacio',
    description: 'Traje EVA presurizado blanco, mochila de oxígeno y visor dorado.',
    primaryHex: '#f1f5f9',
    accentHex: '#f59e0b',
    sleeveHex: 0xe2e8f0,
    gloveHex: 0xf8fafc,
    knuckleHex: 0xd97706,
  },
  {
    id: 'detective',
    name: 'Detective Noir',
    tag: 'Misterio',
    description: 'Gabardina beige, corbata carmesí, sombrero fedora y gafas oscuras.',
    primaryHex: '#a17c52',
    accentHex: '#dc2626',
    sleeveHex: 0x8b6b46,
    gloveHex: 0x3b2618,
    knuckleHex: 0x1f2937,
  },
  {
    id: 'chicken',
    name: 'Traje de Pollo',
    tag: 'Tonto',
    description: 'Disfraz esponjoso de pollo con cresta roja, pico naranja y alitas.',
    primaryHex: '#ffffff',
    accentHex: '#ef4444',
    sleeveHex: 0xf8fafc,
    gloveHex: 0xf97316,
    knuckleHex: 0xef4444,
  },
  {
    id: 'knight',
    name: 'Caballero Dorado',
    tag: 'Épico',
    description: 'Yelmo de acero templado con penacho carmesí y hombreras doradas.',
    primaryHex: '#64748b',
    accentHex: '#eab308',
    sleeveHex: 0x475569,
    gloveHex: 0x334155,
    knuckleHex: 0xfacc15,
  },
  {
    id: 'banana_duck',
    name: 'Pato Plátano',
    tag: 'Absurdo',
    description: 'Pato amarillo neón con gafas de sol y pico de goma reglamentario.',
    primaryHex: '#facc15',
    accentHex: '#fb923c',
    sleeveHex: 0xfde047,
    gloveHex: 0xf97316,
    knuckleHex: 0x111827,
  },
  {
    id: 'toaster',
    name: 'Cyborg Tostadora',
    tag: 'Cyborg',
    description: 'Torso cromado con dos tostadas recién hechas y ojo láser rojo.',
    primaryHex: '#cbd5e1',
    accentHex: '#ef4444',
    sleeveHex: 0x94a3b8,
    gloveHex: 0x1e293b,
    knuckleHex: 0xef4444,
  },
];

const WEAPON_MODEL_MATERIALS = new WeakMap<
  Record<WeaponId, BuiltWeaponModel>,
  {
    sleeveFabric: THREE.MeshStandardMaterial;
    gloveLeather: THREE.MeshStandardMaterial;
    gloveKnuckle: THREE.MeshStandardMaterial;
  }
>();

export function applySkinToWeaponModels(
  models: Record<WeaponId, BuiltWeaponModel>,
  skinId: CharacterSkinId
): void {
  const mats = WEAPON_MODEL_MATERIALS.get(models);
  if (!mats) return;
  const meta = SKIN_CATALOG.find((s) => s.id === skinId) ?? SKIN_CATALOG[0];
  mats.sleeveFabric.color.setHex(meta.sleeveHex);
  mats.gloveLeather.color.setHex(meta.gloveHex);
  mats.gloveKnuckle.color.setHex(meta.knuckleHex);
}

export const WEAPON_ORDER: WeaponId[] = [
  'pistol',
  'rifle',
  'sniper',
  'shotgun',
  'rocket',
  'chicken_combo',
  'chainsaw',
];

export const WEAPON_SPECS: Record<WeaponId, WeaponSpec> = {
  pistol: {
    id: 'pistol',
    slot: 1,
    name: 'Pistola Táctica P-9',
    category: 'Arma corta',
    fireMode: 'semi',
    fireRateMs: 185,
    damageBody: 34,
    damageHead: 70,
    pellets: 1,
    spreadHip: 0.004,
    spreadAds: 0.0009,
    magazineSize: 12,
    reloadTimeSec: 1.15,
    recoilKickY: 0.048,
    recoilKickZ: 0.058,
    cameraKickPitch: 0.022,
    adsFov: 58,
    hipPosition: [0.22, -0.22, -0.44],
    adsPosition: [0.0, -0.145, -0.34],
    muzzleColor: 0xffb347,
  },
  rifle: {
    id: 'rifle',
    slot: 2,
    name: 'Rifle de Asalto AR-47',
    category: 'Automático',
    fireMode: 'auto',
    fireRateMs: 102,
    damageBody: 25,
    damageHead: 52,
    pellets: 1,
    spreadHip: 0.011,
    spreadAds: 0.0022,
    magazineSize: 30,
    reloadTimeSec: 1.65,
    recoilKickY: 0.032,
    recoilKickZ: 0.048,
    cameraKickPitch: 0.016,
    adsFov: 50,
    hipPosition: [0.24, -0.23, -0.48],
    adsPosition: [0.0, -0.158, -0.31],
    muzzleColor: 0xffc864,
  },
  sniper: {
    id: 'sniper',
    slot: 2,
    name: 'Francotirador AWP-X',
    category: 'Cerrojo · Zoom 4×/8×',
    fireMode: 'semi',
    fireRateMs: 1050,
    damageBody: 145,
    damageHead: 320,
    pellets: 1,
    spreadHip: 0.024,
    spreadAds: 0.0001,
    magazineSize: 5,
    reloadTimeSec: 2.15,
    recoilKickY: 0.11,
    recoilKickZ: 0.145,
    cameraKickPitch: 0.052,
    adsFov: 19,
    hipPosition: [0.25, -0.23, -0.46],
    adsPosition: [0.0, -0.15, -0.28],
    muzzleColor: 0x60a5fa,
  },
  shotgun: {
    id: 'shotgun',
    slot: 3,
    name: 'Escopeta SG-12',
    category: 'Corredera',
    fireMode: 'semi',
    fireRateMs: 700,
    damageBody: 18,
    damageHead: 34,
    pellets: 8,
    spreadHip: 0.046,
    spreadAds: 0.03,
    magazineSize: 6,
    reloadTimeSec: 1.9,
    recoilKickY: 0.095,
    recoilKickZ: 0.115,
    cameraKickPitch: 0.048,
    adsFov: 60,
    hipPosition: [0.25, -0.245, -0.48],
    adsPosition: [0.0, -0.155, -0.34],
    muzzleColor: 0xff9a3c,
  },
  rocket: {
    id: 'rocket',
    slot: 4,
    name: 'Lanzacohetes RL-3',
    category: 'Explosivo pesado',
    fireMode: 'semi',
    fireRateMs: 920,
    damageBody: 280,
    damageHead: 340,
    pellets: 1,
    spreadHip: 0.002,
    spreadAds: 0.0005,
    magazineSize: 3,
    reloadTimeSec: 2.2,
    recoilKickY: 0.11,
    recoilKickZ: 0.145,
    cameraKickPitch: 0.055,
    adsFov: 56,
    hipPosition: [0.26, -0.22, -0.44],
    adsPosition: [0.08, -0.155, -0.32],
    muzzleColor: 0xff7b1c,
  },
  chicken_combo: {
    id: 'chicken_combo',
    slot: 5,
    name: 'The Chiken Combinacion',
    category: 'Todas las armas en 1',
    fireMode: 'auto',
    fireRateMs: 140,
    damageBody: 68,
    damageHead: 150,
    pellets: 6,
    spreadHip: 0.015,
    spreadAds: 0.004,
    magazineSize: 60,
    reloadTimeSec: 1.5,
    recoilKickY: 0.022,
    recoilKickZ: 0.032,
    cameraKickPitch: 0.01,
    adsFov: 44,
    hipPosition: [0.25, -0.23, -0.45],
    adsPosition: [0.0, -0.152, -0.31],
    muzzleColor: 0xfacc15,
  },
  chainsaw: {
    id: 'chainsaw',
    slot: 6,
    name: 'Motosierra',
    category: 'Cuerpo a cuerpo ∞',
    fireMode: 'auto',
    fireRateMs: 95,
    damageBody: 78,
    damageHead: 140,
    pellets: 1,
    spreadHip: 0,
    spreadAds: 0,
    magazineSize: 999,
    reloadTimeSec: 0.5,
    recoilKickY: 0.012,
    recoilKickZ: 0.02,
    cameraKickPitch: 0.006,
    adsFov: 68,
    hipPosition: [0.24, -0.25, -0.46],
    adsPosition: [0.1, -0.19, -0.42],
    muzzleColor: 0xff9f1c,
  },
};

export interface BuiltWeaponModel {
  id: WeaponId;
  root: THREE.Group;
  muzzlePoint: THREE.Object3D;
  ejectionPort: THREE.Object3D;
  muzzleFlash: THREE.Group;
  movingPart?: THREE.Object3D;
  movingPartRestZ: number;
  magazinePart?: THREE.Object3D;
  magazineRestY: number;
  hammerPart?: THREE.Object3D;
  triggerPart?: THREE.Object3D;
  chainBladeParts?: THREE.Object3D[];
}

export interface BuiltGrenadeMesh {
  root: THREE.Group;
  ledMat: THREE.MeshStandardMaterial;
  dispose: () => void;
}

function createWeaponMaterials() {
  return {
    polymerDark: new THREE.MeshStandardMaterial({
      color: 0x1b1f26,
      roughness: 0.84,
      metalness: 0.06,
    }),
    polymerGrip: new THREE.MeshStandardMaterial({
      color: 0x111419,
      roughness: 0.94,
      metalness: 0.03,
    }),
    steelBrushed: new THREE.MeshPhysicalMaterial({
      color: 0x4b5563,
      roughness: 0.22,
      metalness: 0.92,
      clearcoat: 0.22,
    }),
    steelDark: new THREE.MeshStandardMaterial({
      color: 0x242932,
      roughness: 0.34,
      metalness: 0.88,
    }),
    chromeBarrel: new THREE.MeshPhysicalMaterial({
      color: 0xbac2cf,
      roughness: 0.15,
      metalness: 0.96,
      clearcoat: 0.28,
    }),
    accentBrass: new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.28,
      metalness: 0.78,
    }),
    shellRed: new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.42,
      metalness: 0.18,
    }),
    sleeveFabric: new THREE.MeshStandardMaterial({
      color: 0x2c3430,
      roughness: 0.92,
      metalness: 0.02,
    }),
    gloveLeather: new THREE.MeshStandardMaterial({
      color: 0x17191d,
      roughness: 0.78,
      metalness: 0.08,
    }),
    gloveKnuckle: new THREE.MeshStandardMaterial({
      color: 0x2f353f,
      roughness: 0.46,
      metalness: 0.42,
    }),
    watchDial: new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 1.6,
      roughness: 0.2,
    }),
    sightGlowGreen: new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 2.8,
      roughness: 0.2,
    }),
    sightGlowRed: new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 3.1,
      roughness: 0.2,
    }),
    opticGlass: new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.05,
      metalness: 0.0,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    }),
    oliveDrab: new THREE.MeshStandardMaterial({
      color: 0x3f4f36,
      roughness: 0.72,
      metalness: 0.22,
    }),
    hazardYellow: new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.42,
      metalness: 0.28,
    }),
  };
}

function createMuzzleFlashGroup(color: number, scale: number): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.98,
    depthWrite: false,
  });

  const star1 = new THREE.Mesh(new THREE.PlaneGeometry(0.18 * scale, 0.048 * scale), mat);
  const star2 = new THREE.Mesh(new THREE.PlaneGeometry(0.18 * scale, 0.048 * scale), mat);
  star2.rotation.z = Math.PI / 2;
  const star3 = new THREE.Mesh(new THREE.PlaneGeometry(0.13 * scale, 0.036 * scale), mat);
  star3.rotation.z = Math.PI / 4;
  const star4 = new THREE.Mesh(new THREE.PlaneGeometry(0.13 * scale, 0.036 * scale), mat);
  star4.rotation.z = -Math.PI / 4;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.042 * scale, 0.16 * scale, 8), coreMat);
  cone.rotation.x = -Math.PI / 2;
  cone.position.z = -0.07 * scale;

  group.add(star1, star2, star3, star4, cone);
  group.visible = false;
  return group;
}

function createGlovedHand(
  mats: ReturnType<typeof createWeaponMaterials>,
  armStart: [number, number, number],
  handPos: [number, number, number],
  isRight: boolean,
  hasTacticalWatch = false
): THREE.Group {
  const group = new THREE.Group();

  const dir = new THREE.Vector3(
    handPos[0] - armStart[0],
    handPos[1] - armStart[1],
    handPos[2] - armStart[2]
  );
  const len = dir.length();
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.052, len, 12), mats.sleeveFabric);
  sleeve.position.set(
    (armStart[0] + handPos[0]) * 0.5,
    (armStart[1] + handPos[1]) * 0.5,
    (armStart[2] + handPos[2]) * 0.5
  );
  sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  group.add(sleeve);

  // Wrist cuff strap & optional tactical watch on left wrist
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.032, 12), mats.gloveLeather);
  cuff.position.set(
    THREE.MathUtils.lerp(armStart[0], handPos[0], 0.78),
    THREE.MathUtils.lerp(armStart[1], handPos[1], 0.78),
    THREE.MathUtils.lerp(armStart[2], handPos[2], 0.78)
  );
  cuff.quaternion.copy(sleeve.quaternion);
  group.add(cuff);

  if (hasTacticalWatch) {
    const watchBezel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.034), mats.steelDark);
    watchBezel.position.set(cuff.position.x, cuff.position.y + 0.038, cuff.position.z);
    const watchFace = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.024), mats.watchDial);
    watchFace.rotation.x = -Math.PI / 2;
    watchFace.position.set(cuff.position.x, cuff.position.y + 0.045, cuff.position.z);
    group.add(watchBezel, watchFace);
  }

  // Tactical glove palm + knuckle armor + thumb
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.072, 0.078), mats.gloveLeather);
  palm.position.set(...handPos);
  group.add(palm);

  const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.022, 0.042), mats.gloveKnuckle);
  knuckle.position.set(handPos[0] + (isRight ? 0.004 : -0.004), handPos[1] + 0.028, handPos[2] - 0.01);
  group.add(knuckle);

  const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.024, 0.042), mats.gloveLeather);
  thumb.position.set(handPos[0] + (isRight ? -0.03 : 0.03), handPos[1] + 0.02, handPos[2] - 0.012);
  thumb.rotation.x = 0.25;
  group.add(thumb);

  return group;
}

export function buildAllWeaponModels(): Record<WeaponId, BuiltWeaponModel> {
  const mats = createWeaponMaterials();

  // 1. PISTOL (Tactical P-9 with Laser Module, Serrations, Tritium 3-Dot Sights & Hammer)
  const pistolRoot = new THREE.Group();
  const pFrame = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.036, 0.22), mats.polymerDark);
  pFrame.position.set(0, 0, -0.02);
  const pRailUnder = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.014, 0.08), mats.steelDark);
  pRailUnder.position.set(0, -0.022, -0.08);
  const pLaserBody = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.024, 0.062), mats.steelDark);
  pLaserBody.position.set(0, -0.036, -0.09);
  const pLaserLens = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.008, 10), mats.sightGlowRed);
  pLaserLens.rotation.x = Math.PI / 2;
  pLaserLens.position.set(0, -0.036, -0.123);

  const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.055), mats.polymerGrip);
  pGrip.position.set(0, -0.068, 0.055);
  pGrip.rotation.x = 0.24;
  const pMag = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.11, 0.04), mats.steelBrushed);
  pMag.position.set(0, -0.075, 0.058);
  pMag.rotation.x = 0.24;
  const pMagBase = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.016, 0.048), mats.accentBrass);
  pMagBase.position.set(0, -0.056, 0);
  pMag.add(pMagBase);

  const pTriggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.055), mats.polymerDark);
  pTriggerGuard.position.set(0, -0.028, 0.005);
  const pTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.022, 0.008), mats.steelBrushed);
  pTrigger.position.set(0, -0.024, 0.01);
  pTrigger.rotation.x = -0.3;

  const pSlide = new THREE.Group();
  const pSlideBody = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.042, 0.235), mats.steelBrushed);
  const pPortInset = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.014, 0.046), mats.accentBrass);
  pPortInset.position.set(0.015, 0.016, -0.02);
  pSlide.add(pSlideBody, pPortInset);

  // Rear slide grip serrations
  for (let i = 0; i < 5; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.049, 0.026, 0.004), mats.steelDark);
    rib.position.set(0, 0.0, 0.055 + i * 0.01);
    pSlide.add(rib);
  }

  const pRearSightL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.012), mats.steelDark);
  pRearSightL.position.set(-0.011, 0.025, 0.095);
  const pRearDotL = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.004), mats.sightGlowGreen);
  pRearDotL.position.set(0, 0.002, 0.006);
  pRearSightL.add(pRearDotL);

  const pRearSightR = pRearSightL.clone();
  pRearSightR.position.x = 0.011;
  const pFrontSight = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.013, 0.012), mats.sightGlowGreen);
  pFrontSight.position.set(0, 0.025, -0.1);
  pSlide.add(pRearSightL, pRearSightR, pFrontSight);
  pSlide.position.set(0, 0.032, -0.015);

  const pHammer = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.022, 0.018), mats.steelDark);
  pHammer.position.set(0, 0.022, 0.106);

  const pBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.23, 12), mats.chromeBarrel);
  pBarrel.rotation.x = Math.PI / 2;
  pBarrel.position.set(0, 0.028, -0.028);

  const pMuzzlePoint = new THREE.Object3D();
  pMuzzlePoint.position.set(0, 0.03, -0.16);
  const pEject = new THREE.Object3D();
  pEject.position.set(0.028, 0.038, 0.0);
  const pFlash = createMuzzleFlashGroup(WEAPON_SPECS.pistol.muzzleColor, 0.95);
  pFlash.position.copy(pMuzzlePoint.position);

  const pRightArm = createGlovedHand(mats, [0.16, -0.26, 0.42], [0.008, -0.068, 0.065], true, false);
  const pLeftArm = createGlovedHand(mats, [-0.22, -0.28, 0.36], [-0.02, -0.075, 0.048], false, true);

  pistolRoot.add(
    pFrame,
    pRailUnder,
    pLaserBody,
    pLaserLens,
    pGrip,
    pMag,
    pTriggerGuard,
    pTrigger,
    pSlide,
    pHammer,
    pBarrel,
    pMuzzlePoint,
    pEject,
    pFlash,
    pRightArm,
    pLeftArm
  );

  // 2. ASSAULT RIFLE (AR-47 with Quad-Rail Ribs, Angled Foregrip, Gas Block & Holographic Sight)
  const rifleRoot = new THREE.Group();
  const rUpper = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.062, 0.34), mats.steelDark);
  rUpper.position.set(0, 0.015, 0.02);
  const rLower = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.046, 0.26), mats.polymerDark);
  rLower.position.set(0, -0.028, 0.04);
  const rSelector = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.026), mats.accentBrass);
  rSelector.position.set(-0.03, -0.022, 0.11);
  rSelector.rotation.x = 0.35;

  const rHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.058, 0.27), mats.polymerDark);
  rHandguard.position.set(0, 0.014, -0.275);
  for (let i = 0; i < 6; i++) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.018), mats.steelBrushed);
    vent.position.set(0, 0.016, -0.17 - i * 0.04);
    rifleRoot.add(vent);
  }
  const rAngledGrip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.072, 0.042), mats.polymerGrip);
  rAngledGrip.position.set(0, -0.045, -0.25);
  rAngledGrip.rotation.x = -0.32;

  const rRail = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.012, 0.46), mats.steelBrushed);
  rRail.position.set(0, 0.05, -0.08);
  const rOpticHousing = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.046, 0.072), mats.steelDark);
  rOpticHousing.position.set(0, 0.08, 0.03);
  const rOpticHood = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.076), mats.steelBrushed);
  rOpticHood.position.set(0, 0.104, 0.03);
  const rOpticLens = new THREE.Mesh(new THREE.PlaneGeometry(0.034, 0.03), mats.opticGlass);
  rOpticLens.position.set(0, 0.082, -0.007);
  const rOpticRearLens = new THREE.Mesh(new THREE.PlaneGeometry(0.034, 0.03), mats.opticGlass);
  rOpticRearLens.position.set(0, 0.082, 0.067);
  const rReticleDot = new THREE.Mesh(new THREE.SphereGeometry(0.0024, 8, 8), mats.sightGlowRed);
  rReticleDot.position.set(0, 0.082, 0.02);

  const rGasBlock = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.052, 0.038), mats.steelDark);
  rGasBlock.position.set(0, 0.034, -0.45);
  const rFrontPost = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.022, 0.006), mats.sightGlowGreen);
  rFrontPost.position.set(0, 0.064, -0.45);

  const rBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.014, 0.34, 14), mats.steelBrushed);
  rBarrel.rotation.x = Math.PI / 2;
  rBarrel.position.set(0, 0.018, -0.44);
  const rMuzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.016, 0.065, 8), mats.steelDark);
  rMuzzleBrake.rotation.x = Math.PI / 2;
  rMuzzleBrake.position.set(0, 0.018, -0.62);

  const rMag = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.175, 0.062), mats.accentBrass);
  rMag.position.set(0, -0.115, -0.035);
  rMag.rotation.x = -0.18;
  const rMagBand = new THREE.Mesh(new THREE.BoxGeometry(0.037, 0.022, 0.065), mats.steelDark);
  rMagBand.position.set(0, -0.04, 0);
  rMag.add(rMagBand);

  const rGrip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.12, 0.05), mats.polymerGrip);
  rGrip.position.set(0, -0.09, 0.12);
  rGrip.rotation.x = 0.28;
  const rTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.024, 0.008), mats.steelBrushed);
  rTrigger.position.set(0, -0.055, 0.075);
  rTrigger.rotation.x = -0.25;

  const rStock = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.095, 0.24), mats.polymerDark);
  rStock.position.set(0, -0.01, 0.29);
  const rBolt = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.015, 0.056), mats.chromeBarrel);
  rBolt.position.set(0.032, 0.025, 0.03);

  const rMuzzlePoint = new THREE.Object3D();
  rMuzzlePoint.position.set(0, 0.018, -0.67);
  const rEject = new THREE.Object3D();
  rEject.position.set(0.034, 0.025, 0.01);
  const rFlash = createMuzzleFlashGroup(WEAPON_SPECS.rifle.muzzleColor, 1.3);
  rFlash.position.copy(rMuzzlePoint.position);

  const rRightArm = createGlovedHand(mats, [0.16, -0.26, 0.45], [0.008, -0.08, 0.12], true, false);
  const rLeftArm = createGlovedHand(mats, [-0.26, -0.26, 0.22], [-0.015, -0.025, -0.24], false, true);

  rifleRoot.add(
    rUpper,
    rLower,
    rSelector,
    rHandguard,
    rAngledGrip,
    rRail,
    rOpticHousing,
    rOpticHood,
    rOpticLens,
    rOpticRearLens,
    rReticleDot,
    rGasBlock,
    rFrontPost,
    rBarrel,
    rMuzzleBrake,
    rMag,
    rGrip,
    rTrigger,
    rStock,
    rBolt,
    rMuzzlePoint,
    rEject,
    rFlash,
    rRightArm,
    rLeftArm
  );

  // 3. TACTICAL SHOTGUN (SG-12 with Heat Shield, Side-Saddle Red Shells & Ghost Ring)
  const shotgunRoot = new THREE.Group();
  const sReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.072, 0.28), mats.steelDark);
  sReceiver.position.set(0, 0.005, 0.03);

  // Side-saddle shell carrier on left side of receiver (4 red 12-gauge shells!)
  const sSaddlePlate = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.042, 0.13), mats.polymerDark);
  sSaddlePlate.position.set(-0.034, 0.008, 0.02);
  shotgunRoot.add(sSaddlePlate);
  for (let i = 0; i < 4; i++) {
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.052, 8), mats.shellRed);
    shell.position.set(-0.042, 0.01, -0.024 + i * 0.028);
    const brassCap = new THREE.Mesh(new THREE.CylinderGeometry(0.0088, 0.0088, 0.012, 8), mats.accentBrass);
    brassCap.position.y = -0.022;
    shell.add(brassCap);
    shotgunRoot.add(shell);
  }

  const sBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.021, 0.56, 16), mats.steelBrushed);
  sBarrel.rotation.x = Math.PI / 2;
  sBarrel.position.set(0, 0.026, -0.36);

  // Perforated heat shield on top of barrel
  const sHeatShield = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.023, 0.36, 12, 1, true, -Math.PI * 0.45, Math.PI * 0.9), mats.steelDark);
  sHeatShield.rotation.x = Math.PI / 2;
  sHeatShield.position.set(0, 0.028, -0.32);

  const sTube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.48, 14), mats.steelDark);
  sTube.rotation.x = Math.PI / 2;
  sTube.position.set(0, -0.012, -0.32);
  const sTubeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.028, 12), mats.accentBrass);
  sTubeCap.rotation.x = Math.PI / 2;
  sTubeCap.position.set(0, -0.012, -0.56);

  const sPump = new THREE.Group();
  const sPumpCore = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.19, 10), mats.polymerGrip);
  sPumpCore.rotation.x = Math.PI / 2;
  sPump.add(sPumpCore);
  for (let i = -2; i <= 2; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 6, 12), mats.steelDark);
    ring.position.z = i * 0.032;
    sPump.add(ring);
  }
  sPump.position.set(0, -0.014, -0.27);

  const sFrontBead = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 8), mats.sightGlowGreen);
  sFrontBead.position.set(0, 0.054, -0.61);
  const sRearRing = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.0032, 8, 16), mats.steelDark);
  sRearRing.position.set(0, 0.056, 0.12);
  const sStock = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.1, 0.28), mats.polymerDark);
  sStock.position.set(0, -0.032, 0.27);
  sStock.rotation.x = 0.12;
  const sTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.024, 0.008), mats.steelBrushed);
  sTrigger.position.set(0, -0.044, 0.11);
  sTrigger.rotation.x = -0.25;

  const sMuzzlePoint = new THREE.Object3D();
  sMuzzlePoint.position.set(0, 0.026, -0.66);
  const sEject = new THREE.Object3D();
  sEject.position.set(0.035, 0.01, -0.02);
  const sFlash = createMuzzleFlashGroup(WEAPON_SPECS.shotgun.muzzleColor, 1.7);
  sFlash.position.copy(sMuzzlePoint.position);

  const sRightArm = createGlovedHand(mats, [0.16, -0.28, 0.44], [0.008, -0.055, 0.16], true, false);
  const sLeftArm = createGlovedHand(mats, [-0.26, -0.28, 0.2], [-0.012, -0.03, -0.27], false, true);

  shotgunRoot.add(
    sReceiver,
    sBarrel,
    sHeatShield,
    sTube,
    sTubeCap,
    sPump,
    sFrontBead,
    sRearRing,
    sStock,
    sTrigger,
    sMuzzlePoint,
    sEject,
    sFlash,
    sRightArm,
    sLeftArm
  );

  // 4. ROCKET LAUNCHER (Lanzacohetes RL-3 with Olive Tube, Hazard Stripes, Optic & Warhead)
  const rocketRoot = new THREE.Group();
  const rlTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.054, 0.054, 0.72, 16),
    mats.oliveDrab
  );
  rlTube.rotation.x = Math.PI / 2;
  rlTube.position.set(0, 0.028, -0.14);

  const rlFrontCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.064, 0.058, 0.08, 16),
    mats.steelDark
  );
  rlFrontCollar.rotation.x = Math.PI / 2;
  rlFrontCollar.position.set(0, 0.028, -0.5);

  const rlRearVenturi = new THREE.Mesh(
    new THREE.CylinderGeometry(0.054, 0.068, 0.14, 16),
    mats.steelDark
  );
  rlRearVenturi.rotation.x = Math.PI / 2;
  rlRearVenturi.position.set(0, 0.028, 0.26);

  const rlBand1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.056, 0.056, 0.036, 16),
    mats.hazardYellow
  );
  rlBand1.rotation.x = Math.PI / 2;
  rlBand1.position.set(0, 0.028, -0.34);

  const rlBand2 = rlBand1.clone();
  rlBand2.position.z = 0.05;

  // Exposed rocket warhead tip seated in front muzzle
  const rlWarhead = new THREE.Mesh(
    new THREE.ConeGeometry(0.044, 0.13, 12),
    mats.shellRed
  );
  rlWarhead.rotation.x = -Math.PI / 2;
  rlWarhead.position.set(0, 0.028, -0.55);

  const rlTopRail = new THREE.Mesh(
    new THREE.BoxGeometry(0.036, 0.024, 0.34),
    mats.steelBrushed
  );
  rlTopRail.position.set(0, 0.088, -0.12);

  // Side-mounted rangefinder optical sight
  const rlSightArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.02, 0.05),
    mats.steelDark
  );
  rlSightArm.position.set(-0.062, 0.064, -0.16);
  const rlSightBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.12, 12),
    mats.steelDark
  );
  rlSightBody.rotation.x = Math.PI / 2;
  rlSightBody.position.set(-0.085, 0.068, -0.16);
  const rlSightLens = new THREE.Mesh(
    new THREE.CircleGeometry(0.017, 12),
    mats.opticGlass
  );
  rlSightLens.position.set(-0.085, 0.068, -0.099);
  const rlSightDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.004, 8, 8),
    mats.sightGlowRed
  );
  rlSightDot.position.set(-0.085, 0.068, -0.12);

  // Forward & rear pistol grips + trigger
  const rlRearGrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.036, 0.12, 0.048),
    mats.polymerGrip
  );
  rlRearGrip.position.set(0, -0.072, 0.02);
  rlRearGrip.rotation.x = 0.22;

  const rlFrontGrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.036, 0.11, 0.046),
    mats.polymerGrip
  );
  rlFrontGrip.position.set(0, -0.068, -0.25);
  rlFrontGrip.rotation.x = -0.15;

  const rlTrigger = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.024, 0.008),
    mats.steelBrushed
  );
  rlTrigger.position.set(0, -0.042, -0.015);
  rlTrigger.rotation.x = -0.25;

  const rlPodBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.044, 0.14),
    mats.steelBrushed
  );
  rlPodBox.position.set(0.042, 0.02, -0.08);

  const rlMuzzlePoint = new THREE.Object3D();
  rlMuzzlePoint.position.set(0, 0.028, -0.62);
  const rlEject = new THREE.Object3D();
  rlEject.position.set(0, 0.028, 0.32);
  const rlFlash = createMuzzleFlashGroup(WEAPON_SPECS.rocket.muzzleColor, 2.0);
  rlFlash.position.copy(rlMuzzlePoint.position);

  const rlRightArm = createGlovedHand(mats, [0.17, -0.26, 0.38], [0.008, -0.072, 0.025], true, false);
  const rlLeftArm = createGlovedHand(mats, [-0.24, -0.26, 0.18], [-0.01, -0.068, -0.25], false, true);

  rocketRoot.add(
    rlTube,
    rlFrontCollar,
    rlRearVenturi,
    rlBand1,
    rlBand2,
    rlWarhead,
    rlTopRail,
    rlSightArm,
    rlSightBody,
    rlSightLens,
    rlSightDot,
    rlRearGrip,
    rlFrontGrip,
    rlTrigger,
    rlPodBox,
    rlMuzzlePoint,
    rlEject,
    rlFlash,
    rlRightArm,
    rlLeftArm
  );

  // 2B. SNIPER RIFLE (AWP-X Precision Bolt-Action with Telescopic Scope, Bipod & Muzzle Brake)
  const sniperRoot = new THREE.Group();
  const snChassis = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.068, 0.56), mats.oliveDrab);
  snChassis.position.set(0, -0.008, 0.02);
  const snReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.052, 0.28), mats.steelDark);
  snReceiver.position.set(0, 0.032, 0.01);
  const snStock = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.092, 0.26), mats.oliveDrab);
  snStock.position.set(0, -0.014, 0.34);
  const snCheekRest = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.024, 0.14), mats.polymerGrip);
  snCheekRest.position.set(0, 0.038, 0.33);
  const snGrip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.11, 0.048), mats.polymerGrip);
  snGrip.position.set(0, -0.075, 0.17);
  snGrip.rotation.x = 0.22;

  const snMag = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.088, 0.076), mats.steelDark);
  snMag.position.set(0, -0.068, -0.02);
  const snTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.024, 0.008), mats.steelBrushed);
  snTrigger.position.set(0, -0.044, 0.11);
  snTrigger.rotation.x = -0.25;

  const snBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.62, 14), mats.steelBrushed);
  snBarrel.rotation.x = Math.PI / 2;
  snBarrel.position.set(0, 0.032, -0.44);
  const snBrake = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.028, 0.078), mats.steelDark);
  snBrake.position.set(0, 0.032, -0.77);

  // Folding Front Bipod
  [-0.032, 0.032].forEach((bx) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 8), mats.steelDark);
    leg.rotation.x = Math.PI / 2 - 0.18;
    leg.position.set(bx, -0.038, -0.34);
    sniperRoot.add(leg);
  });

  // Telescopic Scope Assembly
  const snScopeMount = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.024, 0.18), mats.steelDark);
  snScopeMount.position.set(0, 0.068, -0.01);
  const snScopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 14), mats.steelDark);
  snScopeTube.rotation.x = Math.PI / 2;
  snScopeTube.position.set(0, 0.095, -0.02);
  const snScopeBell = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.021, 0.09, 14), mats.steelBrushed);
  snScopeBell.rotation.x = Math.PI / 2;
  snScopeBell.position.set(0, 0.095, -0.18);
  const snScopeRear = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.06, 14), mats.steelBrushed);
  snScopeRear.rotation.x = Math.PI / 2;
  snScopeRear.position.set(0, 0.095, 0.13);
  const snScopeLensF = new THREE.Mesh(new THREE.CircleGeometry(0.024, 14), mats.opticGlass);
  snScopeLensF.position.set(0, 0.095, -0.226);
  const snScopeLensR = new THREE.Mesh(new THREE.CircleGeometry(0.021, 14), mats.opticGlass);
  snScopeLensR.position.set(0, 0.095, 0.161);
  const snScopeDot = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 8, 8), mats.sightGlowGreen);
  snScopeDot.position.set(0, 0.095, 0.08);
  const snTurretTop = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.018, 10), mats.accentBrass);
  snTurretTop.position.set(0, 0.12, -0.02);

  // Bolt-Action Handle (movingPart)
  const snBolt = new THREE.Group();
  const snBoltRod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.055, 8), mats.chromeBarrel);
  snBoltRod.rotation.z = Math.PI / 2;
  snBoltRod.position.set(0.028, 0, 0);
  const snBoltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 10), mats.chromeBarrel);
  snBoltKnob.position.set(0.052, -0.008, 0.005);
  snBolt.add(snBoltRod, snBoltKnob);
  snBolt.position.set(0.014, 0.036, 0.05);

  const snMuzzlePoint = new THREE.Object3D();
  snMuzzlePoint.position.set(0, 0.032, -0.82);
  const snEject = new THREE.Object3D();
  snEject.position.set(0.034, 0.038, 0.02);
  const snFlash = createMuzzleFlashGroup(WEAPON_SPECS.sniper.muzzleColor, 1.5);
  snFlash.position.copy(snMuzzlePoint.position);

  const snRightArm = createGlovedHand(mats, [0.16, -0.26, 0.45], [0.008, -0.075, 0.17], true, false);
  const snLeftArm = createGlovedHand(mats, [-0.26, -0.26, 0.22], [-0.014, -0.028, -0.22], false, true);

  sniperRoot.add(
    snChassis,
    snReceiver,
    snStock,
    snCheekRest,
    snGrip,
    snMag,
    snTrigger,
    snBarrel,
    snBrake,
    snScopeMount,
    snScopeTube,
    snScopeBell,
    snScopeRear,
    snScopeLensF,
    snScopeLensR,
    snScopeDot,
    snTurretTop,
    snBolt,
    snMuzzlePoint,
    snEject,
    snFlash,
    snRightArm,
    snLeftArm
  );

  // =====================================================
  // 6. THE CHIKEN COMBINACION (All-in-One Ultimate Hybrid)
  // =====================================================
  const chickenComboRoot = new THREE.Group();
  const ccGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.22,
    metalness: 0.78,
    emissive: 0x713f12,
    emissiveIntensity: 0.28,
  });
  const ccCombMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.35,
    emissive: 0x991b1b,
    emissiveIntensity: 0.35,
  });
  const ccOliveMat = new THREE.MeshStandardMaterial({
    color: 0x3b4d2b,
    roughness: 0.52,
    metalness: 0.28,
  });

  // Central RL-3 + AR-47 Hybrid Chassis
  const ccBody = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.105, 0.56), ccGoldMat);
  ccBody.position.set(0, 0.0, -0.04);
  const ccTubeTop = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.72, 14), ccOliveMat);
  ccTubeTop.rotation.x = Math.PI / 2;
  ccTubeTop.position.set(0.03, 0.075, -0.12);
  const ccTubeMuzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.08, 14), mats.steelDark);
  ccTubeMuzzle.rotation.x = Math.PI / 2;
  ccTubeMuzzle.position.set(0.03, 0.075, -0.49);

  // Twin Long Sniper & Rifle Chrome Barrels
  const ccBarrelSniper = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.66, 12), mats.chromeBarrel);
  ccBarrelSniper.rotation.x = Math.PI / 2;
  ccBarrelSniper.position.set(-0.026, 0.032, -0.46);
  const ccBarrelRifle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.5, 10), mats.steelBrushed);
  ccBarrelRifle.rotation.x = Math.PI / 2;
  ccBarrelRifle.position.set(-0.026, -0.004, -0.38);

  // Under-barrel Shotgun Red Pump Tube
  const ccShotgunTube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.44, 10), mats.shellRed);
  ccShotgunTube.rotation.x = Math.PI / 2;
  ccShotgunTube.position.set(0.015, -0.042, -0.32);

  // Chicken Crest & Beak Shroud on Front
  const ccCrest = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.055, 0.14), ccCombMat);
  ccCrest.position.set(-0.026, 0.095, -0.24);
  const ccBeakTop = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 4), ccGoldMat);
  ccBeakTop.rotation.x = -Math.PI / 2;
  ccBeakTop.position.set(-0.026, 0.032, -0.82);

  // Optical Holo-Sniper Scope
  const ccScope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.24, 12), mats.steelDark);
  ccScope.rotation.x = Math.PI / 2;
  ccScope.position.set(-0.02, 0.095, -0.02);
  const ccScopeLens = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), mats.opticGlass);
  ccScopeLens.position.set(-0.02, 0.095, 0.102);

  // Drum Magazine & Pistol Side-Grip
  const ccDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.06, 16), mats.steelDark);
  ccDrum.rotation.x = Math.PI / 2;
  ccDrum.position.set(0, -0.09, -0.1);
  const ccGrip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.125, 0.052), mats.polymerGrip);
  ccGrip.position.set(0, -0.09, 0.13);
  ccGrip.rotation.x = 0.24;
  const ccTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.024, 0.012), mats.accentBrass);
  ccTrigger.position.set(0, -0.056, 0.075);

  // Recoil Bolt
  const ccBolt = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.02, 0.08), mats.chromeBarrel);
  ccBolt.position.set(0.05, 0.02, 0.01);

  const ccMuzzlePoint = new THREE.Object3D();
  ccMuzzlePoint.position.set(0, 0.03, -0.86);
  const ccEject = new THREE.Object3D();
  ccEject.position.set(0.058, 0.025, -0.02);
  const ccFlash = createMuzzleFlashGroup(WEAPON_SPECS.chicken_combo.muzzleColor, 1.55);
  ccFlash.position.copy(ccMuzzlePoint.position);

  const ccRightArm = createGlovedHand(mats, [0.16, -0.25, 0.45], [0.008, -0.075, 0.15], true, false);
  const ccLeftArm = createGlovedHand(mats, [-0.24, -0.26, 0.24], [-0.016, -0.038, -0.21], false, true);

  chickenComboRoot.add(
    ccBody,
    ccTubeTop,
    ccTubeMuzzle,
    ccBarrelSniper,
    ccBarrelRifle,
    ccShotgunTube,
    ccCrest,
    ccBeakTop,
    ccScope,
    ccScopeLens,
    ccDrum,
    ccGrip,
    ccTrigger,
    ccBolt,
    ccMuzzlePoint,
    ccEject,
    ccFlash,
    ccRightArm,
    ccLeftArm
  );

  // =====================================================
  // 7. MOTOSIERRA (Chainsaw Melee Shredder)
  // =====================================================
  const chainsawRoot = new THREE.Group();
  const csRedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.36,
    metalness: 0.22,
  });
  const csHazardMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.42,
    metalness: 0.15,
  });

  const csMotor = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.15, 0.32), csRedMat);
  csMotor.position.set(0, -0.02, 0.02);
  const csExhaust = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.11), mats.steelDark);
  csExhaust.position.set(0.09, -0.02, -0.02);
  const csStripe = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.028, 0.18), csHazardMat);
  csStripe.position.set(0, 0.04, 0.01);

  // Top wrap-around handlebar
  const csBarTop = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.21, 10), mats.steelBrushed);
  csBarTop.rotation.z = Math.PI / 2;
  csBarTop.position.set(0, 0.115, -0.05);
  const csBarLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.17, 10), mats.steelBrushed);
  csBarLeft.position.set(-0.095, 0.035, -0.05);
  const csBarRight = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.17, 10), mats.steelBrushed);
  csBarRight.position.set(0.095, 0.035, -0.05);

  const csRearGrip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.09, 0.13), mats.polymerGrip);
  csRearGrip.position.set(0, -0.03, 0.22);
  const csTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.026, 0.02), mats.accentBrass);
  csTrigger.position.set(0, -0.01, 0.18);

  // Steel Guide Bar extending forward along -Z
  const csGuideBar = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.095, 0.62), mats.steelBrushed);
  csGuideBar.position.set(0, -0.015, -0.42);
  const csBarTip = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.019, 14), mats.steelDark);
  csBarTip.rotation.z = Math.PI / 2;
  csBarTip.position.set(0, -0.015, -0.73);

  // Animated orbiting saw chain teeth around guide bar perimeter
  const chainBladeParts: THREE.Object3D[] = [];
  const toothGeo = new THREE.BoxGeometry(0.026, 0.022, 0.032);
  for (let i = 0; i < 18; i++) {
    const tooth = new THREE.Mesh(toothGeo, mats.chromeBarrel);
    tooth.userData.chainPhase = i / 18;
    chainsawRoot.add(tooth);
    chainBladeParts.push(tooth);
  }

  const csMuzzlePoint = new THREE.Object3D();
  csMuzzlePoint.position.set(0, -0.015, -0.75);
  const csEject = new THREE.Object3D();
  csEject.position.set(0.09, 0.02, -0.04);
  const csFlash = createMuzzleFlashGroup(WEAPON_SPECS.chainsaw.muzzleColor, 0.85);
  csFlash.position.set(0, -0.015, -0.45);

  const csRightArm = createGlovedHand(mats, [0.16, -0.25, 0.48], [0.008, -0.03, 0.21], true, false);
  const csLeftArm = createGlovedHand(mats, [-0.26, -0.22, 0.25], [-0.055, 0.115, -0.05], false, true);

  chainsawRoot.add(
    csMotor,
    csExhaust,
    csStripe,
    csBarTop,
    csBarLeft,
    csBarRight,
    csRearGrip,
    csTrigger,
    csGuideBar,
    csBarTip,
    csMuzzlePoint,
    csEject,
    csFlash,
    csRightArm,
    csLeftArm
  );

  const result: Record<WeaponId, BuiltWeaponModel> = {
    pistol: {
      id: 'pistol',
      root: pistolRoot,
      muzzlePoint: pMuzzlePoint,
      ejectionPort: pEject,
      muzzleFlash: pFlash,
      movingPart: pSlide,
      movingPartRestZ: -0.015,
      magazinePart: pMag,
      magazineRestY: -0.075,
      hammerPart: pHammer,
      triggerPart: pTrigger,
    },
    rifle: {
      id: 'rifle',
      root: rifleRoot,
      muzzlePoint: rMuzzlePoint,
      ejectionPort: rEject,
      muzzleFlash: rFlash,
      movingPart: rBolt,
      movingPartRestZ: 0.03,
      magazinePart: rMag,
      magazineRestY: -0.115,
      triggerPart: rTrigger,
    },
    sniper: {
      id: 'sniper',
      root: sniperRoot,
      muzzlePoint: snMuzzlePoint,
      ejectionPort: snEject,
      muzzleFlash: snFlash,
      movingPart: snBolt,
      movingPartRestZ: 0.05,
      magazinePart: snMag,
      magazineRestY: -0.068,
      triggerPart: snTrigger,
    },
    shotgun: {
      id: 'shotgun',
      root: shotgunRoot,
      muzzlePoint: sMuzzlePoint,
      ejectionPort: sEject,
      muzzleFlash: sFlash,
      movingPart: sPump,
      movingPartRestZ: -0.27,
      magazineRestY: 0,
      triggerPart: sTrigger,
    },
    rocket: {
      id: 'rocket',
      root: rocketRoot,
      muzzlePoint: rlMuzzlePoint,
      ejectionPort: rlEject,
      muzzleFlash: rlFlash,
      movingPart: rlWarhead,
      movingPartRestZ: -0.55,
      magazinePart: rlTube,
      magazineRestY: 0.028,
      triggerPart: rlTrigger,
    },
    chicken_combo: {
      id: 'chicken_combo',
      root: chickenComboRoot,
      muzzlePoint: ccMuzzlePoint,
      ejectionPort: ccEject,
      muzzleFlash: ccFlash,
      movingPart: ccBolt,
      movingPartRestZ: 0.01,
      magazinePart: ccDrum,
      magazineRestY: -0.09,
      triggerPart: ccTrigger,
    },
    chainsaw: {
      id: 'chainsaw',
      root: chainsawRoot,
      muzzlePoint: csMuzzlePoint,
      ejectionPort: csEject,
      muzzleFlash: csFlash,
      movingPartRestZ: 0,
      magazineRestY: 0,
      triggerPart: csTrigger,
      chainBladeParts,
    },
  };

  WEAPON_MODEL_MATERIALS.set(result, {
    sleeveFabric: mats.sleeveFabric,
    gloveLeather: mats.gloveLeather,
    gloveKnuckle: mats.gloveKnuckle,
  });

  return result;
}

export function createGrenadeModel(): BuiltGrenadeMesh {
  const root = new THREE.Group();
  const bodyGeo = new THREE.SphereGeometry(0.085, 14, 12);
  bodyGeo.scale(0.9, 1.18, 0.9);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x3b4d2b,
    roughness: 0.65,
    metalness: 0.28,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;

  const bandGeo = new THREE.CylinderGeometry(0.082, 0.082, 0.022, 14);
  const bandMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.35,
    metalness: 0.78,
  });
  const band = new THREE.Mesh(bandGeo, bandMat);

  const capGeo = new THREE.CylinderGeometry(0.032, 0.038, 0.048, 12);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x2a2f38,
    roughness: 0.35,
    metalness: 0.85,
  });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = 0.108;

  const leverGeo = new THREE.BoxGeometry(0.022, 0.11, 0.012);
  const lever = new THREE.Mesh(leverGeo, capMat);
  lever.position.set(0.048, 0.055, 0);
  lever.rotation.z = -0.22;

  const ledGeo = new THREE.SphereGeometry(0.022, 10, 10);
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xff2a2a,
    emissive: 0xef4444,
    emissiveIntensity: 3.4,
    roughness: 0.15,
  });
  const led = new THREE.Mesh(ledGeo, ledMat);
  led.position.y = 0.136;

  root.add(body, band, cap, lever, led);

  return {
    root,
    ledMat,
    dispose: () => {
      bodyGeo.dispose();
      bandGeo.dispose();
      capGeo.dispose();
      leverGeo.dispose();
      ledGeo.dispose();
      bodyMat.dispose();
      bandMat.dispose();
      capMat.dispose();
      ledMat.dispose();
    },
  };
}

export interface BuiltRocketProjectile {
  root: THREE.Group;
  flameMesh: THREE.Mesh;
  dispose: () => void;
}

export function createRocketProjectileMesh(): BuiltRocketProjectile {
  const root = new THREE.Group();

  const bodyGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.42, 10);
  bodyGeo.rotateX(Math.PI / 2);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x3f4f36,
    roughness: 0.52,
    metalness: 0.45,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);

  const coneGeo = new THREE.ConeGeometry(0.052, 0.16, 10);
  coneGeo.rotateX(-Math.PI / 2);
  const coneMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.38,
    metalness: 0.35,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.z = -0.28;

  const bandGeo = new THREE.CylinderGeometry(0.053, 0.053, 0.05, 10);
  bandGeo.rotateX(Math.PI / 2);
  const bandMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.35,
    metalness: 0.55,
  });
  const band = new THREE.Mesh(bandGeo, bandMat);
  band.position.z = -0.12;

  const finGeo = new THREE.BoxGeometry(0.16, 0.012, 0.11);
  const finMat = new THREE.MeshStandardMaterial({
    color: 0x1e222a,
    roughness: 0.45,
    metalness: 0.85,
  });
  const finH = new THREE.Mesh(finGeo, finMat);
  finH.position.z = 0.17;
  const finV = new THREE.Mesh(finGeo, finMat);
  finV.rotation.z = Math.PI / 2;
  finV.position.z = 0.17;

  const flameGeo = new THREE.ConeGeometry(0.062, 0.32, 8);
  flameGeo.rotateX(Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xff9f1c,
    transparent: true,
    opacity: 0.94,
  });
  const flameMesh = new THREE.Mesh(flameGeo, flameMat);
  flameMesh.position.z = 0.35;

  root.add(body, cone, band, finH, finV, flameMesh);

  return {
    root,
    flameMesh,
    dispose: () => {
      bodyGeo.dispose();
      coneGeo.dispose();
      bandGeo.dispose();
      finGeo.dispose();
      flameGeo.dispose();
      bodyMat.dispose();
      coneMat.dispose();
      bandMat.dispose();
      finMat.dispose();
      flameMat.dispose();
    },
  };
}

export function createStandaloneRocketLauncherMesh(): {
  root: THREE.Group;
  dispose: () => void;
} {
  const root = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  const oliveMat = new THREE.MeshStandardMaterial({
    color: 0x45583a,
    roughness: 0.58,
    metalness: 0.3,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x262b34,
    roughness: 0.32,
    metalness: 0.88,
  });
  const hazardMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.34,
    metalness: 0.55,
  });
  const warheadMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.35,
    metalness: 0.32,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 2.2,
    roughness: 0.18,
  });
  mats.push(oliveMat, steelMat, hazardMat, warheadMat, glowMat);

  const track = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };

  const tube = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.082, 0.082, 1.18, 18)),
    oliveMat
  );
  tube.rotation.z = Math.PI / 2;

  const frontCollar = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.098, 0.088, 0.12, 18)),
    steelMat
  );
  frontCollar.rotation.z = Math.PI / 2;
  frontCollar.position.x = 0.58;

  const rearVenturi = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.082, 0.104, 0.2, 18)),
    steelMat
  );
  rearVenturi.rotation.z = Math.PI / 2;
  rearVenturi.position.x = -0.64;

  const stripeA = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.085, 0.085, 0.06, 18)),
    hazardMat
  );
  stripeA.rotation.z = Math.PI / 2;
  stripeA.position.x = 0.34;

  const stripeB = stripeA.clone();
  stripeB.position.x = -0.26;

  const warhead = new THREE.Mesh(
    track(new THREE.ConeGeometry(0.068, 0.22, 14)),
    warheadMat
  );
  warhead.rotation.z = -Math.PI / 2;
  warhead.position.x = 0.72;

  const topRail = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.55, 0.04, 0.055)),
    steelMat
  );
  topRail.position.set(0.05, 0.098, 0);

  const optic = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.032, 0.032, 0.18, 12)),
    steelMat
  );
  optic.rotation.z = Math.PI / 2;
  optic.position.set(0.08, 0.12, 0.09);

  const opticLens = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12)),
    glowMat
  );
  opticLens.rotation.z = Math.PI / 2;
  opticLens.position.set(0.17, 0.12, 0.09);

  const gripRear = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.07, 0.18, 0.05)),
    steelMat
  );
  gripRear.position.set(-0.08, -0.14, 0);
  gripRear.rotation.z = -0.2;

  const gripFront = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.065, 0.16, 0.05)),
    steelMat
  );
  gripFront.position.set(0.28, -0.13, 0);
  gripFront.rotation.z = 0.18;

  root.add(
    tube,
    frontCollar,
    rearVenturi,
    stripeA,
    stripeB,
    warhead,
    topRail,
    optic,
    opticLens,
    gripRear,
    gripFront
  );

  return {
    root,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

export interface RewardChestModel {
  root: THREE.Group;
  lidPivot: THREE.Group;
  glowLight: THREE.PointLight;
  beaconBeam: THREE.Mesh;
  hitMeshes: THREE.Mesh[];
  dispose: () => void;
}

export function createRewardChestModel(): RewardChestModel {
  const root = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const hitMeshes: THREE.Mesh[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    mats.push(m);
    return m;
  };

  const oliveArmorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x263228,
      roughness: 0.52,
      metalness: 0.62,
    })
  );
  const darkIronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1b1f26,
      roughness: 0.36,
      metalness: 0.88,
    })
  );
  const goldTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.24,
      metalness: 0.88,
      emissive: 0x78350f,
      emissiveIntensity: 0.35,
    })
  );
  const coreGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 3.4,
      roughness: 0.15,
    })
  );
  const beamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );

  // Chest base box
  const baseBox = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.56, 0.72, 0.98)),
    oliveArmorMat
  );
  baseBox.position.y = 0.36;
  baseBox.castShadow = true;
  baseBox.receiveShadow = true;
  hitMeshes.push(baseBox);

  // Interior dark recess + glowing amber cushion
  const interiorPad = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.38, 0.12, 0.8)),
    coreGlowMat
  );
  interiorPad.position.y = 0.69;

  // Gold corner straps on base
  [-0.72, 0, 0.72].forEach((bx) => {
    const strap = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.11, 0.76, 1.04)),
      goldTrimMat
    );
    strap.position.set(bx, 0.38, 0);
    strap.castShadow = true;
    hitMeshes.push(strap);
    root.add(strap);
  });

  // Heavy front clasp plate + glowing lock emblem
  const claspPlate = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.32, 0.34, 0.08)),
    darkIronMat
  );
  claspPlate.position.set(0, 0.62, 0.51);
  const lockCore = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.09, 0)),
    coreGlowMat
  );
  lockCore.position.set(0, 0.62, 0.56);
  hitMeshes.push(claspPlate, lockCore);

  // Hinged Lid Group (pivots at back top edge y=0.72, z=-0.49)
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.72, -0.49);

  const lidSlab = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.6, 0.28, 1.02)),
    oliveArmorMat
  );
  lidSlab.position.set(0, 0.14, 0.49);
  lidSlab.castShadow = true;
  hitMeshes.push(lidSlab);

  const lidCrown = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.38, 0.14, 0.76)),
    darkIronMat
  );
  lidCrown.position.set(0, 0.31, 0.49);
  lidCrown.castShadow = true;
  hitMeshes.push(lidCrown);

  [-0.72, 0, 0.72].forEach((bx) => {
    const lidStrap = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.12, 0.34, 1.06)),
      goldTrimMat
    );
    lidStrap.position.set(bx, 0.17, 0.49);
    hitMeshes.push(lidStrap);
    lidPivot.add(lidStrap);
  });

  lidPivot.add(lidSlab, lidCrown);

  const glowLight = new THREE.PointLight(0xffb703, 4.5, 9, 1.5);
  glowLight.position.set(0, 1.25, 0.15);

  const beaconBeam = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.65, 0.32, 4.2, 16, 1, true)),
    beamMat
  );
  beaconBeam.position.set(0, 2.5, 0);
  beaconBeam.visible = false;

  root.add(baseBox, interiorPad, claspPlate, lockCore, lidPivot, glowLight, beaconBeam);

  return {
    root,
    lidPivot,
    glowLight,
    beaconBeam,
    hitMeshes,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

export function createExplosiveTireMesh(): BuiltGrenadeMesh {
  const root = new THREE.Group();
  const tireGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.16, 14);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x15181c,
    roughness: 0.9,
    metalness: 0.08,
  });
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.castShadow = true;

  const rimGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.175, 10);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.35,
    metalness: 0.85,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);

  const ledGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.19, 10);
  ledGeo.rotateZ(Math.PI / 2);
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xff2a2a,
    emissive: 0xef4444,
    emissiveIntensity: 3.6,
    roughness: 0.15,
  });
  const led = new THREE.Mesh(ledGeo, ledMat);

  root.add(tire, rim, led);

  return {
    root,
    ledMat,
    dispose: () => {
      tireGeo.dispose();
      rimGeo.dispose();
      ledGeo.dispose();
      tireMat.dispose();
      rimMat.dispose();
      ledMat.dispose();
    },
  };
}

export interface CaptainPolloHandle {
  root: THREE.Group;
  triggerThrowPose: () => void;
  update: (
    delta: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    playerYaw: number,
    aimTarget?: THREE.Vector3,
    side?: 'front' | 'left' | 'right'
  ) => void;
  dispose: () => void;
}

export function createCaptainPolloMesh(): CaptainPolloHandle {
  const root = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    mats.push(m);
    return m;
  };

  // Glossy Lego-brick plastic materials
  const whiteBrick = trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.24, metalness: 0.04 }));
  const orangeBrick = trackMat(new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.26, metalness: 0.05 }));
  const redBrick = trackMat(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.26, metalness: 0.05 }));
  const navyHat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.28, metalness: 0.12 }));
  const goldTrim = trackMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.22, metalness: 0.85 }));
  const blackBrick = trackMat(new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2, metalness: 0.1 }));

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // Blocky Lego torso + studs
  const torso = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.36, 0.48)), whiteBrick);
  torso.position.y = 0.38;
  torso.castShadow = true;
  bodyPivot.add(torso);

  // Gold captain epaulettes on shoulders
  [-0.24, 0.24].forEach((ex) => {
    const ep = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.1, 0.06, 0.16)), goldTrim);
    ep.position.set(ex, 0.56, 0.02);
    bodyPivot.add(ep);
  });

  // Mini red backpack grenade pouch
  const pack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.22, 0.14)), redBrick);
  pack.position.set(0, 0.4, -0.28);
  bodyPivot.add(pack);

  // Stiff hinged Lego wings
  const leftWing = new THREE.Group();
  leftWing.position.set(-0.23, 0.46, 0);
  const lwMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.09, 0.22, 0.32)), whiteBrick);
  lwMesh.position.set(-0.04, -0.06, 0);
  leftWing.add(lwMesh);

  const rightWing = new THREE.Group();
  rightWing.position.set(0.23, 0.46, 0);
  const rwMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.09, 0.22, 0.32)), whiteBrick);
  rwMesh.position.set(0.04, -0.06, 0);
  rightWing.add(rwMesh);
  bodyPivot.add(leftWing, rightWing);

  // Stiff Lego feet/legs
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.11, 0.2, 0);
  const lLegBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.07, 0.16, 0.07)), orangeBrick);
  lLegBar.position.y = -0.08;
  const lFoot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.05, 0.18)), orangeBrick);
  lFoot.position.set(0, -0.17, 0.04);
  leftLeg.add(lLegBar, lFoot);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.11, 0.2, 0);
  const rLegBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.07, 0.16, 0.07)), orangeBrick);
  rLegBar.position.y = -0.08;
  const rFoot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.05, 0.18)), orangeBrick);
  rFoot.position.set(0, -0.17, 0.04);
  rightLeg.add(rLegBar, rFoot);
  bodyPivot.add(leftLeg, rightLeg);

  // Blocky Lego Head + Captain Hat
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.56, 0.14);
  bodyPivot.add(headPivot);

  const headCube = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.26, 0.26)), whiteBrick);
  headCube.position.y = 0.13;
  headCube.castShadow = true;

  const beak = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.08, 0.14)), orangeBrick);
  beak.position.set(0, 0.11, 0.18);

  const wattle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.09, 0.07)), redBrick);
  wattle.position.set(0, 0.03, 0.15);

  const eyeGeo = trackGeo(new THREE.BoxGeometry(0.045, 0.045, 0.03));
  const eyeL = new THREE.Mesh(eyeGeo, blackBrick);
  eyeL.position.set(-0.08, 0.17, 0.13);
  const eyeR = new THREE.Mesh(eyeGeo, blackBrick);
  eyeR.position.set(0.08, 0.17, 0.13);

  // Navy Blue Captain's Hat with Gold Brim & Anchor Emblem
  const hatBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.07, 0.34)), navyHat);
  hatBase.position.set(0, 0.28, 0.03);
  const hatVisor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.3, 0.035, 0.14)), blackBrick);
  hatVisor.position.set(0, 0.255, 0.19);
  const hatCrown = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.12, 0.32)), navyHat);
  hatCrown.position.set(0, 0.36, 0.01);
  const hatBand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.33, 0.035, 0.35)), goldTrim);
  hatBand.position.set(0, 0.305, 0.03);
  const hatBadge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.08, 0.04)), goldTrim);
  hatBadge.position.set(0, 0.37, 0.18);

  headPivot.add(headCube, beak, wattle, eyeL, eyeR, hatBase, hatVisor, hatCrown, hatBand, hatBadge);

  let throwSpinTimer = 0;
  let steppedPhase = 0;

  return {
    root,
    triggerThrowPose: () => {
      throwSpinTimer = 0.55;
    },
    update: (delta, elapsed, playerPos, playerYaw, aimTarget, side = 'front') => {
      // Follow in front of player (vanguard, slightly offset) or to left/right flank
      const fwdX = -Math.sin(playerYaw);
      const fwdZ = -Math.cos(playerYaw);
      const rightX = Math.cos(playerYaw);
      const rightZ = -Math.sin(playerYaw);

      let forwardDist = 2.25;
      let rightDist = 0.88;
      if (side === 'left') {
        forwardDist = 0.85;
        rightDist = -1.6;
      } else if (side === 'right') {
        forwardDist = 0.85;
        rightDist = 1.6;
      }

      const targetX = playerPos.x + fwdX * forwardDist + rightX * rightDist;
      const targetZ = playerPos.z + fwdZ * forwardDist + rightZ * rightDist;

      const dx = targetX - root.position.x;
      const dz = targetZ - root.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.22) {
        const moveStep = Math.min(dist, delta * 8.2);
        root.position.x += (dx / dist) * moveStep;
        root.position.z += (dz / dist) * moveStep;
        steppedPhase += delta * 14;
        // Funny quantized Lego hop-waddle (snaps at 12fps steps like stop-motion Lego!)
        const q = Math.floor(steppedPhase) / 14;
        const hop = Math.abs(Math.sin(q * 14)) * 0.26;
        bodyPivot.position.y = hop;
        bodyPivot.rotation.z = Math.sin(q * 14) * 0.22;
        leftLeg.rotation.x = Math.sin(q * 14) * 0.95;
        rightLeg.rotation.x = -Math.sin(q * 14) * 0.95;
        leftWing.rotation.z = -0.35 - Math.abs(Math.sin(q * 14)) * 0.65;
        rightWing.rotation.z = 0.35 + Math.abs(Math.sin(q * 14)) * 0.65;
      } else {
        // Comical idle Lego bob & salute pecks
        const qIdle = Math.floor(elapsed * 8) / 8;
        bodyPivot.position.y = Math.abs(Math.sin(qIdle * 4)) * 0.08;
        bodyPivot.rotation.z = Math.sin(qIdle * 2.5) * 0.08;
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        leftWing.rotation.z = -0.15;
        rightWing.rotation.z = 0.15;
      }

      if (throwSpinTimer > 0) {
        throwSpinTimer -= delta;
        bodyPivot.rotation.y += delta * 18;
        rightWing.rotation.x = -1.6;
      } else {
        bodyPivot.rotation.y = THREE.MathUtils.damp(bodyPivot.rotation.y, 0, 10, delta);
        rightWing.rotation.x = 0;
      }

      headPivot.rotation.x = Math.sin(Math.floor(elapsed * 6) * 0.8) * 0.14;

      if (aimTarget) {
        const desiredYaw = Math.atan2(aimTarget.x - root.position.x, aimTarget.z - root.position.z);
        root.rotation.y = desiredYaw;
      } else if (dist > 0.35) {
        root.rotation.y = Math.atan2(dx, dz);
      } else {
        root.rotation.y = playerYaw + Math.PI;
      }
    },
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

export interface RemotePlayerAvatarHandle {
  root: THREE.Group;
  updateState: (
    x: number,
    y: number,
    z: number,
    yaw: number,
    pitch: number,
    weaponId: WeaponId,
    isCrouching: boolean,
    isMoving: boolean,
    isSprinting: boolean,
    isDashing: boolean,
    health: number,
    maxHealth: number,
    delta: number
  ) => void;
  skinId: CharacterSkinId;
  hitboxMeshes: THREE.Mesh[];
  dispose: () => void;
}

export function createRemotePlayerAvatar(
  name: string,
  skinId: CharacterSkinId = 'soldier'
): RemotePlayerAvatarHandle {
  const root = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const hitboxMeshes: THREE.Mesh[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    mats.push(m);
    return m;
  };

  const armorColors: Record<CharacterSkinId, { primary: number; suit: number; visor: number; visorEmissive: number }> = {
    soldier: { primary: 0x2563eb, suit: 0x1e293b, visor: 0x38bdf8, visorEmissive: 0x0284c7 },
    astronaut: { primary: 0xf1f5f9, suit: 0xdbeafe, visor: 0xf59e0b, visorEmissive: 0xd97706 },
    detective: { primary: 0xa17c52, suit: 0x3f2e21, visor: 0x111827, visorEmissive: 0x000000 },
    chicken: { primary: 0xffffff, suit: 0xf8fafc, visor: 0x111827, visorEmissive: 0x000000 },
    knight: { primary: 0x94a3b8, suit: 0x334155, visor: 0x1e293b, visorEmissive: 0xf59e0b },
    banana_duck: { primary: 0xfacc15, suit: 0xfde047, visor: 0x0f172a, visorEmissive: 0x000000 },
    toaster: { primary: 0xcbd5e1, suit: 0x475569, visor: 0xef4444, visorEmissive: 0xdc2626 },
  };
  const palette = armorColors[skinId] ?? armorColors.soldier;

  const armorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: palette.primary,
      roughness: skinId === 'toaster' || skinId === 'knight' ? 0.24 : 0.48,
      metalness: skinId === 'toaster' || skinId === 'knight' ? 0.85 : 0.28,
    })
  );
  const suitMat = trackMat(new THREE.MeshStandardMaterial({ color: palette.suit, roughness: 0.78, metalness: 0.1 }));
  const visorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: palette.visor,
      emissive: palette.visorEmissive,
      emissiveIntensity: palette.visorEmissive ? 2.0 : 0.1,
      roughness: 0.18,
    })
  );
  const redAccentMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 }));
  const orangeAccentMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.42 }));
  const goldAccentMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.26, metalness: 0.78 })
  );
  const darkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 }));
  const breadMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd99b52, roughness: 0.88 }));
  const crustMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x7c4a21, roughness: 0.9 }));
  const gunMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.35, metalness: 0.85 }));
  const rocketOliveMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x3f4f36, roughness: 0.6, metalness: 0.25 }));
  const dashMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const legMat = skinId === 'chicken' || skinId === 'banana_duck' ? orangeAccentMat : suitMat;
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.14, 0.84, 0);
  const leftLeg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.84, 0.2)), legMat);
  leftLeg.position.set(0, -0.42, 0);
  leftLeg.userData = { hitZone: 'body' };
  hitboxMeshes.push(leftLeg);
  leftLegPivot.add(leftLeg);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.14, 0.84, 0);
  const rightLeg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.84, 0.2)), legMat);
  rightLeg.position.set(0, -0.42, 0);
  rightLeg.userData = { hitZone: 'body' };
  hitboxMeshes.push(rightLeg);
  rightLegPivot.add(rightLeg);

  const torsoW = skinId === 'toaster' ? 0.56 : skinId === 'chicken' ? 0.54 : 0.48;
  const torsoD = skinId === 'toaster' ? 0.38 : 0.28;
  const torso = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(torsoW, 0.62, torsoD)), armorMat);
  torso.position.set(0, 1.15, 0);
  torso.userData = { hitZone: 'body' };
  hitboxMeshes.push(torso);

  // Skin-specific torso accessories
  if (skinId === 'astronaut') {
    const pack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.48, 0.2)), armorMat);
    pack.position.set(0, 1.18, 0.24);
    const stripe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.38, 0.08, 0.05)), orangeAccentMat);
    stripe.position.set(0, 1.24, 0.34);
    bodyGroup.add(pack, stripe);
  } else if (skinId === 'detective') {
    const tie = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.38, 0.04)), redAccentMat);
    tie.position.set(0, 1.19, -0.15);
    const coatTail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.5, 0.3, 0.3)), armorMat);
    coatTail.position.set(0, 0.76, 0);
    bodyGroup.add(tie, coatTail);
  } else if (skinId === 'knight') {
    const trim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.54, 0.14, 0.32)), goldAccentMat);
    trim.position.set(0, 1.38, 0);
    bodyGroup.add(trim);
  } else if (skinId === 'toaster') {
    // Two toast slices popping out of toaster shoulders
    [-0.12, 0.12].forEach((tx) => {
      const slice = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 0.18, 0.06)), breadMat);
      slice.position.set(tx, 1.5, 0.05);
      const crust = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.17, 0.04, 0.07)), crustMat);
      crust.position.set(tx, 1.59, 0.05);
      bodyGroup.add(slice, crust);
    });
    const lever = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.08, 0.08)), darkMat);
    lever.position.set(0.3, 1.2, -0.06);
    bodyGroup.add(lever);
  }

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.5, 0);
  const headMeshMat = skinId === 'detective' ? trackMat(new THREE.MeshStandardMaterial({ color: 0xe7c6a5, roughness: 0.7 })) : armorMat;
  const head = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.28, 0.28)), headMeshMat);
  head.position.set(0, 0.14, 0);
  head.userData = { hitZone: 'head' };
  hitboxMeshes.push(head);
  const visor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.1, 0.04)), visorMat);
  visor.position.set(0, 0.15, -0.14);
  visor.userData = { hitZone: 'head' };
  hitboxMeshes.push(visor);
  headGroup.add(head, visor);

  // Skin-specific head accessories
  if (skinId === 'astronaut') {
    const helmet = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.34, 0.34)), armorMat);
    helmet.position.set(0, 0.15, 0);
    const goldShield = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.2, 0.05)), visorMat);
    goldShield.position.set(0, 0.15, -0.165);
    headGroup.add(helmet, goldShield);
  } else if (skinId === 'detective') {
    const brim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.04, 0.46)), darkMat);
    brim.position.set(0, 0.29, 0);
    const crown = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.14, 0.28)), darkMat);
    crown.position.set(0, 0.37, 0);
    const hatBand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.29, 0.03, 0.29)), redAccentMat);
    hatBand.position.set(0, 0.31, 0);
    headGroup.add(brim, crown, hatBand);
  } else if (skinId === 'chicken') {
    const comb = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.14, 0.22)), redAccentMat);
    comb.position.set(0, 0.34, 0);
    const beak = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.07, 0.16, 4)), orangeAccentMat);
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 0.12, -0.2);
    const wattle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.08, 0.06)), redAccentMat);
    wattle.position.set(0, 0.05, -0.16);
    headGroup.add(comb, beak, wattle);
  } else if (skinId === 'knight') {
    const crest = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.07, 0.18, 0.32)), redAccentMat);
    crest.position.set(0, 0.36, 0.02);
    const slit = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.04, 0.05)), goldAccentMat);
    slit.position.set(0, 0.15, -0.15);
    headGroup.add(crest, slit);
  } else if (skinId === 'banana_duck') {
    const bill = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.06, 0.16)), orangeAccentMat);
    bill.position.set(0, 0.1, -0.2);
    const stem = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.14, 0.08)), darkMat);
    stem.position.set(0, 0.34, 0.02);
    stem.rotation.x = 0.25;
    headGroup.add(bill, stem);
  } else if (skinId === 'toaster') {
    const antenna = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8)), darkMat);
    antenna.position.set(0.1, 0.36, 0);
    const eyeLed = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.05, 8, 8)), visorMat);
    eyeLed.position.set(-0.06, 0.16, -0.15);
    headGroup.add(antenna, eyeLed);
  }

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.32, 1.38, 0);
  const leftArm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.52, 0.16)), suitMat);
  leftArm.position.set(0, -0.22, -0.06);
  leftArm.rotation.x = 0.55;
  leftArmPivot.add(leftArm);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.32, 1.38, 0);
  const rightArm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.52, 0.16)), suitMat);
  rightArm.position.set(0, -0.2, -0.14);
  rightArm.rotation.x = 1.05;

  const gunMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.11, 0.7)), gunMat);
  gunMesh.position.set(-0.04, -0.2, -0.44);
  rightArmPivot.add(rightArm, gunMesh);

  // Dash ring aura around feet when dashing
  const dashRing = new THREE.Mesh(trackGeo(new THREE.RingGeometry(0.45, 0.64, 24)), dashMat);
  dashRing.rotation.x = -Math.PI / 2;
  dashRing.position.set(0, 0.08, 0);
  dashRing.visible = false;

  bodyGroup.add(leftLegPivot, rightLegPivot, torso, headGroup, leftArmPivot, rightArmPivot);
  root.add(dashRing);

  // Floating Name + Live HP Sprite
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 76;
  const ctx = canvas.getContext('2d')!;
  const labelTex = new THREE.CanvasTexture(canvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const spriteMat = trackMat(new THREE.SpriteMaterial({ map: labelTex, transparent: true }));
  const nameSprite = new THREE.Sprite(spriteMat);
  nameSprite.position.set(0, 2.28, 0);
  nameSprite.scale.set(1.55, 0.46, 1);
  root.add(nameSprite);

  let lastDrawnHp = -1;
  let lastDrawnMax = -1;
  let lastWeapon: WeaponId | '' = '';
  const drawNameplate = (hp: number, maxHp: number) => {
    const safeMax = Math.max(1, maxHp);
    const pct = Math.max(0, Math.min(1, hp / safeMax));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
    ctx.fillRect(14, 8, 228, 58);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 8, 228, 58);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.slice(0, 16), 128, 28);
    // HP bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(28, 46, 200, 10);
    ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(28, 46, Math.round(200 * pct), 10);
    labelTex.needsUpdate = true;
    lastDrawnHp = hp;
    lastDrawnMax = maxHp;
  };
  drawNameplate(100, 100);

  let walkPhase = 0;

  return {
    root,
    skinId,
    hitboxMeshes,
    updateState: (
      x,
      y,
      z,
      yaw,
      pitch,
      weaponId,
      isCrouching,
      isMoving,
      isSprinting,
      isDashing,
      health,
      maxHealth,
      delta
    ) => {
      const dist = Math.hypot(x - root.position.x, z - root.position.z);
      const posDamp = isDashing ? 24 : 18;
      root.position.x = THREE.MathUtils.damp(root.position.x, x, posDamp, delta);
      root.position.y = THREE.MathUtils.damp(root.position.y, y, posDamp, delta);
      root.position.z = THREE.MathUtils.damp(root.position.z, z, posDamp, delta);

      let yawDiff = yaw - root.rotation.y;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      root.rotation.y += yawDiff * Math.min(1, delta * 18);

      bodyGroup.scale.y = THREE.MathUtils.damp(bodyGroup.scale.y, isCrouching ? 0.72 : 1.0, 12, delta);
      headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, pitch * 0.65, 16, delta);
      rightArmPivot.rotation.x = THREE.MathUtils.damp(rightArmPivot.rotation.x, pitch * 0.7, 16, delta);

      if (weaponId !== lastWeapon) {
        lastWeapon = weaponId;
        if (weaponId === 'pistol') {
          gunMesh.scale.set(0.75, 0.85, 0.42);
          gunMesh.material = gunMat;
        } else if (weaponId === 'sniper') {
          gunMesh.scale.set(0.85, 0.9, 1.48);
          gunMesh.material = gunMat;
        } else if (weaponId === 'shotgun') {
          gunMesh.scale.set(1.15, 1.05, 1.05);
          gunMesh.material = gunMat;
        } else if (weaponId === 'rocket') {
          gunMesh.scale.set(1.85, 1.75, 1.35);
          gunMesh.material = rocketOliveMat;
        } else if (weaponId === 'chicken_combo') {
          gunMesh.scale.set(1.65, 1.45, 1.45);
          gunMesh.material = rocketOliveMat;
        } else if (weaponId === 'chainsaw') {
          gunMesh.scale.set(1.35, 1.35, 1.35);
          gunMesh.material = gunMat;
        } else {
          gunMesh.scale.set(1, 1, 1);
          gunMesh.material = gunMat;
        }
      }

      if (isDashing) {
        dashRing.visible = true;
        dashRing.rotation.z += delta * 12;
        dashRing.scale.setScalar(1.0 + Math.sin(walkPhase * 2) * 0.12);
        leftLegPivot.rotation.x = -0.38;
        rightLegPivot.rotation.x = 0.38;
        leftArmPivot.rotation.x = 0.45;
      } else {
        dashRing.visible = false;
        if (isMoving || dist > 0.015) {
          const speedRate = isSprinting ? 17 : 12;
          const amp = isSprinting ? 0.68 : 0.48;
          walkPhase += delta * speedRate;
          leftLegPivot.rotation.x = Math.sin(walkPhase) * amp;
          rightLegPivot.rotation.x = -Math.sin(walkPhase) * amp;
          leftArmPivot.rotation.x = -Math.sin(walkPhase) * amp * 0.7;
        } else {
          leftLegPivot.rotation.x = THREE.MathUtils.damp(leftLegPivot.rotation.x, 0, 10, delta);
          rightLegPivot.rotation.x = THREE.MathUtils.damp(rightLegPivot.rotation.x, 0, 10, delta);
          leftArmPivot.rotation.x = THREE.MathUtils.damp(leftArmPivot.rotation.x, 0, 10, delta);
        }
      }

      if (Math.round(health) !== Math.round(lastDrawnHp) || Math.round(maxHealth) !== Math.round(lastDrawnMax)) {
        drawNameplate(health, maxHealth);
      }
    },
    dispose: () => {
      labelTex.dispose();
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

export interface MedkitPickupMesh {
  root: THREE.Group;
  ringMesh: THREE.Mesh;
  boxGroup: THREE.Group;
  dispose: () => void;
}

export function createMedkitMesh(): MedkitPickupMesh {
  const root = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    mats.push(m);
    return m;
  };

  const caseMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.28,
      metalness: 0.14,
      emissive: 0x064e3b,
      emissiveIntensity: 0.18,
    })
  );
  const crossMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x16a34a,
      emissiveIntensity: 1.6,
      roughness: 0.2,
    })
  );
  const redCrossMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 1.4,
      roughness: 0.25,
    })
  );
  const trimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.6,
    })
  );
  const ringMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );

  const boxGroup = new THREE.Group();
  const body = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.56, 0.34, 0.4)), caseMat);
  body.castShadow = true;
  const handle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.08, 0.08)), trimMat);
  handle.position.set(0, 0.21, 0);

  // Raised medical crosses on top & front/back
  const topCrossV = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.09, 0.03, 0.24)), crossMat);
  topCrossV.position.set(0, 0.18, 0);
  const topCrossH = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.03, 0.09)), crossMat);
  topCrossH.position.set(0, 0.18, 0);

  const frontCrossV = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.2, 0.03)), redCrossMat);
  frontCrossV.position.set(0, 0, 0.21);
  const frontCrossH = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.2, 0.08, 0.03)), redCrossMat);
  frontCrossH.position.set(0, 0, 0.21);

  const backCrossV = frontCrossV.clone();
  backCrossV.position.z = -0.21;
  const backCrossH = frontCrossH.clone();
  backCrossH.position.z = -0.21;

  boxGroup.add(body, handle, topCrossV, topCrossH, frontCrossV, frontCrossH, backCrossV, backCrossH);
  boxGroup.position.y = 0.42;

  const ringMesh = new THREE.Mesh(trackGeo(new THREE.RingGeometry(0.46, 0.62, 24)), ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.04;

  root.add(boxGroup, ringMesh);

  return {
    root,
    ringMesh,
    boxGroup,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

export function createStandaloneSniperMesh(): {
  root: THREE.Group;
  dispose: () => void;
} {
  const root = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    mats.push(m);
    return m;
  };

  const oliveMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x3f4f36, roughness: 0.55, metalness: 0.28 }));
  const steelMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e242d, roughness: 0.3, metalness: 0.9 }));
  const chromeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.16, metalness: 0.96 }));
  const lensMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 2.5,
      roughness: 0.1,
    })
  );
  const goldMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.85 }));

  const chassis = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.95, 0.11, 0.08)), oliveMat);
  const stock = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.15, 0.07)), oliveMat);
  stock.position.set(-0.56, -0.02, 0);
  const barrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.022, 0.026, 0.98, 12)), chromeMat);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(0.68, 0.05, 0);
  const brake = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.05, 0.06)), steelMat);
  brake.position.set(1.18, 0.05, 0);

  const scopeTube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.44, 14)), steelMat);
  scopeTube.rotation.z = Math.PI / 2;
  scopeTube.position.set(0.06, 0.15, 0);
  const scopeBell = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.052, 0.038, 0.14, 14)), steelMat);
  scopeBell.rotation.z = Math.PI / 2;
  scopeBell.position.set(0.32, 0.15, 0);
  const scopeLens = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.044, 0.044, 0.02, 14)), lensMat);
  scopeLens.rotation.z = Math.PI / 2;
  scopeLens.position.set(0.39, 0.15, 0);
  const turret = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.035, 10)), goldMat);
  turret.position.set(0.06, 0.2, 0);

  const mag = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.14, 0.055)), steelMat);
  mag.position.set(0.08, -0.1, 0);
  const grip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.16, 0.06)), steelMat);
  grip.position.set(-0.24, -0.11, 0);
  grip.rotation.z = -0.22;

  root.add(chassis, stock, barrel, brake, scopeTube, scopeBell, scopeLens, turret, mag, grip);

  return {
    root,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

export function createBoomerangMesh(): {
  root: THREE.Group;
  dispose: () => void;
} {
  const root = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    mats.push(m);
    return m;
  };

  const bladeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.85,
      roughness: 0.28,
      metalness: 0.35,
    })
  );
  const tipMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    })
  );
  const trimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
    })
  );

  // V-shaped curved pixel boomerang
  const wingA = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.05, 0.13)), bladeMat);
  wingA.position.set(0.18, 0, 0.12);
  wingA.rotation.y = -0.58;

  const wingB = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.05, 0.13)), bladeMat);
  wingB.position.set(-0.18, 0, 0.12);
  wingB.rotation.y = 0.58;

  const centerHub = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 0.06, 0.16)), trimMat);
  centerHub.position.set(0, 0, 0.22);

  const tipA = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.06, 0.14)), tipMat);
  tipA.position.set(0.36, 0, -0.02);
  tipA.rotation.y = -0.58;

  const tipB = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.06, 0.14)), tipMat);
  tipB.position.set(-0.36, 0, -0.02);
  tipB.rotation.y = 0.58;

  root.add(wingA, wingB, centerHub, tipA, tipB);

  return {
    root,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

export function createStandaloneChainsawMesh(): {
  root: THREE.Group;
  dispose: () => void;
} {
  const root = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    mats.push(m);
    return m;
  };

  const redMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.25 }));
  const steelMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.22, metalness: 0.9 }));
  const darkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.5 }));
  const hazardMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.2 }));
  const chromeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.95 }));

  const motor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.28, 0.28)), redMat);
  motor.position.set(-0.26, 0, 0);
  const stripe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.06, 0.29)), hazardMat);
  stripe.position.set(-0.24, 0.11, 0);
  const handleTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.14, 0.36)), steelMat);
  handleTop.position.set(-0.1, 0.2, 0);
  const rearGrip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.14, 0.1)), darkMat);
  rearGrip.position.set(-0.56, 0.02, 0);

  const bar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.78, 0.16, 0.03)), steelMat);
  bar.position.set(0.32, 0, 0);
  const tip = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 0.032, 14)), darkMat);
  tip.rotation.x = Math.PI / 2;
  tip.position.set(0.71, 0, 0);

  const toothGeo = trackGeo(new THREE.BoxGeometry(0.05, 0.04, 0.05));
  for (let i = 0; i < 12; i++) {
    const t = new THREE.Mesh(toothGeo, chromeMat);
    const px = -0.02 + (i % 6) * 0.14;
    const py = i < 6 ? 0.095 : -0.095;
    t.position.set(px, py, 0);
    root.add(t);
  }

  root.add(motor, stripe, handleTop, rearGrip, bar, tip);

  return {
    root,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}




