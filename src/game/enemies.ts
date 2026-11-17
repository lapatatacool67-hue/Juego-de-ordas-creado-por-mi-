import * as THREE from 'three';

export type NextbotKind = 'bob_esponja' | 'en_este_pueblo' | 'among_us';

export type RobloxPuebloVariant = 'suit' | 'green_npc' | 'blue_npc' | 'mayor';

export interface ActiveEnemy {
  id: string;
  label: string;
  isBoss: boolean;
  isMiniBoss?: boolean;
  root: THREE.Group;
  bodyGroup: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  leftLegGroup: THREE.Group;
  rightLegGroup: THREE.Group;
  leftArmGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  // Boss-specific articulated nodes
  turretGroup?: THREE.Group;
  leftBarrels?: THREE.Group;
  rightBarrels?: THREE.Group;
  roadWheels?: THREE.Mesh[];
  // Armless desert mech walker nodes
  isArmlessBot?: boolean;
  jawGroup?: THREE.Group;
  // Cube World Transformer Truck mech
  isTruckBot?: boolean;
  tireCooldown?: number;
  // Pixel World Winged Koopa Troopa
  isKoopa?: boolean;
  leftWingGroup?: THREE.Group;
  rightWingGroup?: THREE.Group;
  hoverBaseY?: number;
  boomerangCooldown?: number;
  throwAnimTimer?: number;
  fireAnimTimer?: number;
  tireThrowAnimTimer?: number;
  stunTimer?: number;
  heldBoomerangMesh?: THREE.Object3D;
  // Backrooms 2D Meme Nextbot
  isNextbot?: boolean;
  nextbotKind?: NextbotKind;
  meleeCooldown?: number;
  // Pueblo Desconocido 3D Recreated Roblox Characters
  isRobloxPueblo?: boolean;
  muzzlePoints: THREE.Object3D[];
  muzzleFlashes: THREE.Mesh[];
  muzzleFlashTimer: number;
  headAnchor: THREE.Object3D;
  hp: number;
  maxHp: number;
  alive: boolean;
  deathCleanupTimer: number;
  hitFlashTimer: number;
  staggerX: number;
  staggerY: number;
  headFlinch: number;
  collapseProgress: number;
  walkSpeed: number;
  walkPhase: number;
  preferredRange: number;
  fireCooldown: number;
  burstRemaining: number;
  burstShotTimer: number;
  barrelIndex: number;
  strafeSign: number;
  collisionRadius: number;
  hitboxMeshes: THREE.Mesh[];
  flashMaterials: THREE.MeshStandardMaterial[];
  disposeOwnMaterials: () => void;
}

function createRadialShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(10, 12, 16, 0.68)');
  grad.addColorStop(0.55, 'rgba(10, 12, 16, 0.28)');
  grad.addColorStop(1, 'rgba(10, 12, 16, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class EnemyFactory {
  private shadowTex = createRadialShadowTexture();
  private shadowMat: THREE.MeshBasicMaterial;
  private shadowGeo = new THREE.PlaneGeometry(1.5, 1.5);
  private bossShadowGeo = new THREE.PlaneGeometry(5.2, 6.2);

  // Zombie shared geometries
  private bootGeo = new THREE.BoxGeometry(0.18, 0.14, 0.3);
  private shinGeo = new THREE.CylinderGeometry(0.082, 0.07, 0.38, 10);
  private thighGeo = new THREE.CylinderGeometry(0.1, 0.082, 0.38, 10);
  private pelvisGeo = new THREE.BoxGeometry(0.4, 0.18, 0.24);
  private torsoGeo = new THREE.BoxGeometry(0.46, 0.58, 0.27);
  private tatteredVestGeo = new THREE.BoxGeometry(0.44, 0.34, 0.3);
  private bloodPatchGeo = new THREE.BoxGeometry(0.22, 0.24, 0.04);
  private shoulderGeo = new THREE.BoxGeometry(0.16, 0.16, 0.2);
  private sleeveGeo = new THREE.CylinderGeometry(0.068, 0.058, 0.24, 10);
  private rottedArmGeo = new THREE.CylinderGeometry(0.052, 0.045, 0.28, 10);
  private handGeo = new THREE.BoxGeometry(0.075, 0.08, 0.09);
  private neckGeo = new THREE.CylinderGeometry(0.068, 0.082, 0.12, 10);
  private skullGeo = new THREE.BoxGeometry(0.27, 0.26, 0.29);
  private jawGeo = new THREE.BoxGeometry(0.21, 0.08, 0.22);
  private teethGeo = new THREE.BoxGeometry(0.16, 0.028, 0.04);
  private eyeGeo = new THREE.SphereGeometry(0.028, 8, 8);
  private rifleBodyGeo = new THREE.BoxGeometry(0.05, 0.08, 0.62);
  private rifleBarrelGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.34, 8);
  private pistolGeo = new THREE.BoxGeometry(0.042, 0.11, 0.24);
  private flashGeo = new THREE.OctahedronGeometry(0.09, 0);
  private headBloodGeo = new THREE.BoxGeometry(0.14, 0.1, 0.03);

  // Armless Desert Walker Mech shared geometries
  private botPelvisGeo = new THREE.BoxGeometry(0.48, 0.24, 0.44);
  private botCarapaceGeo = new THREE.BoxGeometry(0.68, 0.62, 0.92);
  private botHumpGeo = new THREE.SphereGeometry(0.44, 12, 10);
  private botRidgeGeo = new THREE.BoxGeometry(0.28, 0.24, 0.72);
  private botSpikeGeo = new THREE.ConeGeometry(0.075, 0.44, 7);
  private botSnoutGeo = new THREE.BoxGeometry(0.36, 0.24, 0.36);
  private botJawGeo = new THREE.BoxGeometry(0.32, 0.12, 0.32);
  private botFangGeo = new THREE.ConeGeometry(0.026, 0.09, 5);
  private botPodGeo = new THREE.BoxGeometry(0.22, 0.22, 0.48);
  private botCannonGeo = new THREE.CylinderGeometry(0.052, 0.064, 0.56, 10);
  private botCoreGeo = new THREE.OctahedronGeometry(0.055, 0);
  private botThighGeo = new THREE.BoxGeometry(0.18, 0.48, 0.22);
  private botShinGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.56, 8);
  private botFootHubGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.1, 8);
  private botToeGeo = new THREE.ConeGeometry(0.042, 0.24, 6);

  // Boss tank shared geometries
  private hullGeo = new THREE.BoxGeometry(2.55, 1.05, 4.1);
  private glacisGeo = new THREE.BoxGeometry(2.5, 0.55, 1.2);
  private trackGeo = new THREE.BoxGeometry(0.62, 0.92, 4.45);
  private wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.66, 14);
  private exhaustGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.1, 10);
  private turretGeo = new THREE.BoxGeometry(2.05, 0.85, 2.35);
  private hatchGeo = new THREE.CylinderGeometry(0.68, 0.72, 0.22, 16);
  private gunPodGeo = new THREE.BoxGeometry(0.46, 0.44, 0.95);
  private gunBarrelGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.45, 8);
  private gunCollarGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12);
  private bossHeadGeo = new THREE.BoxGeometry(0.92, 0.88, 0.96);
  private bossJawGeo = new THREE.BoxGeometry(0.76, 0.28, 0.78);
  private bossTeethGeo = new THREE.BoxGeometry(0.58, 0.1, 0.12);
  private bossEyeGeo = new THREE.SphereGeometry(0.095, 10, 10);
  private bossFlashGeo = new THREE.OctahedronGeometry(0.22, 0);

  // Transformer Truck Mech shared geometries
  private trCabGeo = new THREE.BoxGeometry(0.96, 0.72, 0.78);
  private trRoofCapGeo = new THREE.BoxGeometry(1.02, 0.2, 0.82);
  private trVisorGeo = new THREE.BoxGeometry(0.84, 0.28, 0.08);
  private trGrilleGeo = new THREE.BoxGeometry(0.62, 0.34, 0.1);
  private trBumperGeo = new THREE.BoxGeometry(1.06, 0.18, 0.2);
  private trLampGeo = new THREE.BoxGeometry(0.14, 0.12, 0.06);
  private trPelvisGeo = new THREE.BoxGeometry(0.74, 0.28, 0.56);
  private trLegGeo = new THREE.BoxGeometry(0.32, 0.88, 0.38);
  private trFootGeo = new THREE.BoxGeometry(0.38, 0.18, 0.54);
  private trShoulderGeo = new THREE.BoxGeometry(0.34, 0.42, 0.42);
  private trCannonTubeGeo = new THREE.BoxGeometry(0.2, 0.22, 0.88);
  private trBarrelTipGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.35, 10);

  // Pixel World Winged Koopa shared geometries
  private kpShellGeo = new THREE.SphereGeometry(0.44, 12, 10);
  private kpRimGeo = new THREE.TorusGeometry(0.42, 0.075, 8, 16);
  private kpBellyGeo = new THREE.BoxGeometry(0.56, 0.62, 0.22);
  private kpHeadGeo = new THREE.SphereGeometry(0.27, 12, 10);
  private kpSnoutGeo = new THREE.SphereGeometry(0.23, 12, 10);
  private kpEyeWhiteGeo = new THREE.SphereGeometry(0.11, 10, 10);
  private kpPupilGeo = new THREE.SphereGeometry(0.055, 8, 8);
  private kpLimbGeo = new THREE.CylinderGeometry(0.072, 0.068, 0.36, 8);
  private kpFistGeo = new THREE.SphereGeometry(0.09, 8, 8);
  private kpBootGeo = new THREE.BoxGeometry(0.22, 0.16, 0.34);
  private kpWingBladeGeo = new THREE.BoxGeometry(0.46, 0.24, 0.06);
  private kpWingTipGeo = new THREE.BoxGeometry(0.28, 0.16, 0.05);
  private kpBoomA = new THREE.BoxGeometry(0.32, 0.04, 0.09);

  // Backrooms 2D Nextbot shared geometries & cached meme textures
  private nextbotPlaneGeo = new THREE.PlaneGeometry(1.75, 2.2);
  private nextbotHeadHitGeo = new THREE.BoxGeometry(1.15, 0.78, 0.42);
  private nextbotBodyHitGeo = new THREE.BoxGeometry(1.35, 1.32, 0.44);
  private nextbotTexCache: Partial<Record<NextbotKind, THREE.CanvasTexture>> = {};

  // Pueblo Desconocido 3D Roblox R6 shared geometries & cached textures
  private rbxTorsoGeo = new THREE.BoxGeometry(0.76, 0.78, 0.38);
  private rbxLimbGeo = new THREE.BoxGeometry(0.35, 0.76, 0.36);
  private rbxHeadGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.42, 16);
  private rbxHatBrimGeo = new THREE.CylinderGeometry(0.42, 0.44, 0.055, 18);
  private rbxHatCrownGeo = new THREE.CylinderGeometry(0.23, 0.26, 0.23, 16);
  private rbxHatBandGeo = new THREE.CylinderGeometry(0.264, 0.264, 0.055, 16);
  private rbxGlassLensGeo = new THREE.CylinderGeometry(0.088, 0.088, 0.025, 16);
  private rbxGlassBridgeGeo = new THREE.BoxGeometry(0.11, 0.018, 0.02);
  private rbxHairTopGeo = new THREE.BoxGeometry(0.52, 0.16, 0.5);
  private rbxHairSideGeo = new THREE.BoxGeometry(0.11, 0.36, 0.44);
  private rbxTexCache: Record<string, THREE.CanvasTexture> = {};

  private flashMat = new THREE.MeshBasicMaterial({
    color: 0xffb347,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });

  private idCounter = 0;

  constructor() {
    this.shadowMat = new THREE.MeshBasicMaterial({
      map: this.shadowTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.flashGeo.scale(0.8, 0.8, 2.2);
    this.bossFlashGeo.scale(0.8, 0.8, 2.4);
    this.wheelGeo.rotateZ(Math.PI / 2);
    this.gunBarrelGeo.rotateX(Math.PI / 2);
    this.gunCollarGeo.rotateX(Math.PI / 2);
    this.botCannonGeo.rotateX(Math.PI / 2);
    this.botHumpGeo.scale(0.95, 0.82, 1.25);
    this.trBarrelTipGeo.rotateX(Math.PI / 2);
  }

  public spawnArmedZombie(
    parent: THREE.Object3D,
    x: number,
    z: number,
    weaponType: 'rifle' | 'shotgun' | 'pistol',
    wave: number,
    label?: string,
    isMiniBoss = false
  ): ActiveEnemy {
    this.idCounter += 1;
    const id = isMiniBoss ? `zombie-mini-${this.idCounter}` : `zombie-${this.idCounter}`;
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    const shadowPlane = new THREE.Mesh(this.shadowGeo, this.shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.015;
    if (isMiniBoss) shadowPlane.scale.setScalar(1.45);
    root.add(shadowPlane);

    const bodyGroup = new THREE.Group();
    if (isMiniBoss) bodyGroup.scale.setScalar(1.36);
    root.add(bodyGroup);

    const skinMat = new THREE.MeshStandardMaterial({
      color: isMiniBoss ? 0x4d5d42 : 0x6b7f5d,
      roughness: 0.78,
      metalness: 0.06,
    });
    const tornClothMat = new THREE.MeshStandardMaterial({
      color: isMiniBoss ? 0x1e1b24 : 0x2c3037,
      roughness: 0.94,
      metalness: 0.03,
    });
    const bloodMat = new THREE.MeshStandardMaterial({
      color: 0x6b1212,
      roughness: 0.42,
      metalness: 0.08,
    });
    const vestMat = new THREE.MeshStandardMaterial({
      color: isMiniBoss ? 0x92400e : 0x3b4036,
      roughness: isMiniBoss ? 0.5 : 0.86,
      metalness: isMiniBoss ? 0.68 : 0.14,
    });
    const eyeGlowMat = new THREE.MeshStandardMaterial({
      color: isMiniBoss ? 0xff2a2a : 0xf59e0b,
      emissive: isMiniBoss ? 0xef4444 : 0xd97706,
      emissiveIntensity: isMiniBoss ? 3.5 : 2.5,
      roughness: 0.2,
    });
    const teethMat = new THREE.MeshStandardMaterial({
      color: 0xd6cfb8,
      roughness: 0.5,
    });
    const rustedGunMat = new THREE.MeshStandardMaterial({
      color: isMiniBoss ? 0xb45309 : 0x241f1e,
      roughness: 0.4,
      metalness: 0.85,
    });

    const ownMats = [skinMat, tornClothMat, bloodMat, vestMat, eyeGlowMat, teethMat, rustedGunMat];
    const hitboxMeshes: THREE.Mesh[] = [];
    const registerHitbox = (mesh: THREE.Mesh, hitZone: 'head' | 'body') => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { enemyId: id, hitZone };
      hitboxMeshes.push(mesh);
    };

    // Articulated Legs pivoting at hip (y = 0.88)
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.15, 0.88, 0);
    const leftThigh = new THREE.Mesh(this.thighGeo, tornClothMat);
    leftThigh.position.set(0, -0.19, 0);
    const leftShin = new THREE.Mesh(this.shinGeo, tornClothMat);
    leftShin.position.set(0, -0.55, 0);
    const leftBoot = new THREE.Mesh(this.bootGeo, tornClothMat);
    leftBoot.position.set(0, -0.81, 0.03);
    registerHitbox(leftThigh, 'body');
    registerHitbox(leftShin, 'body');
    registerHitbox(leftBoot, 'body');
    leftLegGroup.add(leftThigh, leftShin, leftBoot);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.15, 0.88, 0);
    const rightThigh = new THREE.Mesh(this.thighGeo, tornClothMat);
    rightThigh.position.set(0, -0.19, 0);
    const rightShin = new THREE.Mesh(this.shinGeo, skinMat);
    rightShin.position.set(0, -0.55, 0);
    const rightBoot = new THREE.Mesh(this.bootGeo, tornClothMat);
    rightBoot.position.set(0, -0.81, 0.03);
    registerHitbox(rightThigh, 'body');
    registerHitbox(rightShin, 'body');
    registerHitbox(rightBoot, 'body');
    rightLegGroup.add(rightThigh, rightShin, rightBoot);

    const pelvis = new THREE.Mesh(this.pelvisGeo, tornClothMat);
    pelvis.position.set(0, 0.92, 0);
    registerHitbox(pelvis, 'body');

    bodyGroup.add(leftLegGroup, rightLegGroup, pelvis);

    // Hunched Torso
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.98, 0);
    torsoGroup.rotation.x = 0.14;
    bodyGroup.add(torsoGroup);

    const torso = new THREE.Mesh(this.torsoGeo, tornClothMat);
    torso.position.set(0, 0.32, 0);
    registerHitbox(torso, 'body');

    const vest = new THREE.Mesh(this.tatteredVestGeo, vestMat);
    vest.position.set(0, 0.35, 0.01);
    vest.rotation.z = 0.04;
    registerHitbox(vest, 'body');

    const bloodPatch = new THREE.Mesh(this.bloodPatchGeo, bloodMat);
    bloodPatch.position.set(-0.07, 0.28, 0.155);
    registerHitbox(bloodPatch, 'body');

    torsoGroup.add(torso, vest, bloodPatch);

    // Arms + Firearm + Muzzle Anchor
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.31, 0.54, 0);
    const leftShoulder = new THREE.Mesh(this.shoulderGeo, vestMat);
    const leftSleeve = new THREE.Mesh(this.sleeveGeo, tornClothMat);
    leftSleeve.position.set(0.03, -0.1, 0.06);
    leftSleeve.rotation.x = -0.55;
    leftSleeve.rotation.z = 0.25;
    const leftForearm = new THREE.Mesh(this.rottedArmGeo, skinMat);
    leftForearm.position.set(0.08, -0.22, 0.2);
    leftForearm.rotation.x = -0.95;
    leftForearm.rotation.z = 0.35;
    const leftHand = new THREE.Mesh(this.handGeo, skinMat);
    leftHand.position.set(0.11, -0.26, 0.34);
    registerHitbox(leftShoulder, 'body');
    registerHitbox(leftSleeve, 'body');
    registerHitbox(leftForearm, 'body');
    registerHitbox(leftHand, 'body');
    leftArmGroup.add(leftShoulder, leftSleeve, leftForearm, leftHand);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.31, 0.54, 0);
    const rightShoulder = new THREE.Mesh(this.shoulderGeo, vestMat);
    const rightSleeve = new THREE.Mesh(this.sleeveGeo, tornClothMat);
    rightSleeve.position.set(-0.02, -0.11, 0.08);
    rightSleeve.rotation.x = -0.65;
    rightSleeve.rotation.z = -0.18;
    const rightForearm = new THREE.Mesh(this.rottedArmGeo, skinMat);
    rightForearm.position.set(-0.06, -0.22, 0.22);
    rightForearm.rotation.x = -1.05;
    rightForearm.rotation.z = -0.22;
    const rightHand = new THREE.Mesh(this.handGeo, skinMat);
    rightHand.position.set(-0.1, -0.26, 0.34);
    registerHitbox(rightShoulder, 'body');
    registerHitbox(rightSleeve, 'body');
    registerHitbox(rightForearm, 'body');
    registerHitbox(rightHand, 'body');
    rightArmGroup.add(rightShoulder, rightSleeve, rightForearm, rightHand);

    const muzzlePoint = new THREE.Object3D();
    const muzzleFlash = new THREE.Mesh(this.flashGeo, this.flashMat);
    muzzleFlash.visible = false;

    if (weaponType === 'pistol') {
      const pistol = new THREE.Mesh(this.pistolGeo, rustedGunMat);
      pistol.position.set(-0.1, -0.22, 0.44);
      muzzlePoint.position.set(-0.1, -0.2, 0.58);
      rightArmGroup.add(pistol);
    } else {
      const gunBody = new THREE.Mesh(this.rifleBodyGeo, rustedGunMat);
      gunBody.position.set(-0.14, -0.26, 0.36);
      gunBody.rotation.y = -0.2;
      const gunBarrel = new THREE.Mesh(this.rifleBarrelGeo, rustedGunMat);
      gunBarrel.rotation.x = Math.PI / 2;
      gunBarrel.position.set(-0.2, -0.25, 0.68);
      gunBarrel.rotation.z = 0.2;
      if (weaponType === 'shotgun') {
        gunBody.scale.set(1.2, 1.15, 1.1);
      }
      muzzlePoint.position.set(-0.22, -0.25, 0.86);
      rightArmGroup.add(gunBody, gunBarrel);
    }
    muzzleFlash.position.copy(muzzlePoint.position);
    rightArmGroup.add(muzzlePoint, muzzleFlash);

    torsoGroup.add(leftArmGroup, rightArmGroup);

    // Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.64, 0.03);
    headGroup.rotation.z = (this.idCounter % 2 === 0 ? 1 : -1) * 0.14;

    const neck = new THREE.Mesh(this.neckGeo, skinMat);
    neck.position.set(0, 0.04, 0);
    registerHitbox(neck, 'body');

    const skull = new THREE.Mesh(this.skullGeo, skinMat);
    skull.position.set(0, 0.22, 0);
    registerHitbox(skull, 'head');

    const jaw = new THREE.Mesh(this.jawGeo, skinMat);
    jaw.position.set(0, 0.09, 0.04);
    jaw.rotation.x = 0.24;
    registerHitbox(jaw, 'head');

    const teeth = new THREE.Mesh(this.teethGeo, teethMat);
    teeth.position.set(0, 0.125, 0.14);
    registerHitbox(teeth, 'head');

    const leftEye = new THREE.Mesh(this.eyeGeo, eyeGlowMat);
    leftEye.position.set(-0.065, 0.24, 0.14);
    const rightEye = new THREE.Mesh(this.eyeGeo, eyeGlowMat);
    rightEye.position.set(0.065, 0.24, 0.14);

    const headBlood = new THREE.Mesh(this.headBloodGeo, bloodMat);
    headBlood.position.set(0.05, 0.15, 0.14);
    registerHitbox(headBlood, 'head');

    if (isMiniBoss) {
      // Heavy armored helmet crest & golden visor ridge for Mini-Boss Zombie
      const crest = new THREE.Mesh(this.tatteredVestGeo, vestMat);
      crest.scale.set(0.68, 0.36, 1.05);
      crest.position.set(0, 0.38, 0.0);
      registerHitbox(crest, 'head');
      headGroup.add(crest);
    }

    const headAnchor = new THREE.Object3D();
    headAnchor.position.set(0, isMiniBoss ? 0.62 : 0.54, 0);

    headGroup.add(neck, skull, jaw, teeth, leftEye, rightEye, headBlood, headAnchor);
    torsoGroup.add(headGroup);

    parent.add(root);

    const waveScale = 1 + (wave - 1) * 0.28;
    const baseHp = Math.round((95 + (wave - 1) * 24) * (isMiniBoss ? 3.15 * (0.9 + wave * 0.04) : 1));
    void waveScale;
    return {
      id,
      label: label ?? (isMiniBoss ? `MINI-JEFE · ZOMBI BLINDADO` : `Zombi Armado #${this.idCounter}`),
      isBoss: false,
      isMiniBoss,
      root,
      bodyGroup,
      torsoGroup,
      headGroup,
      leftLegGroup,
      rightLegGroup,
      leftArmGroup,
      rightArmGroup,
      muzzlePoints: [muzzlePoint],
      muzzleFlashes: [muzzleFlash],
      muzzleFlashTimer: 0,
      headAnchor,
      hp: baseHp,
      maxHp: baseHp,
      alive: true,
      deathCleanupTimer: isMiniBoss ? 4.2 : 3.5,
      hitFlashTimer: 0,
      fireAnimTimer: 0,
      tireThrowAnimTimer: 0,
      stunTimer: 0,
      staggerX: 0,
      staggerY: 0,
      headFlinch: 0,
      collapseProgress: 0,
      walkSpeed: (isMiniBoss ? 2.45 : 1.95 + Math.random() * 0.75) + (wave - 1) * 0.2,
      walkPhase: Math.random() * Math.PI * 2,
      preferredRange: isMiniBoss ? 9.5 : weaponType === 'shotgun' ? 6.5 : 10.5 + Math.random() * 4.5,
      fireCooldown: isMiniBoss ? 0.9 : 1.35 + Math.random() * 1.15,
      burstRemaining: 0,
      burstShotTimer: 0,
      barrelIndex: 0,
      strafeSign: this.idCounter % 2 === 0 ? 1 : -1,
      collisionRadius: isMiniBoss ? 0.74 : 0.5,
      hitboxMeshes,
      flashMaterials: [skinMat, tornClothMat, vestMat],
      disposeOwnMaterials: () => ownMats.forEach((m) => m.dispose()),
    };
  }

  public spawnArmlessDesertBot(
    parent: THREE.Object3D,
    x: number,
    z: number,
    wave: number,
    isBoss = false,
    isMiniBoss = false
  ): ActiveEnemy {
    this.idCounter += 1;
    const id = isBoss
      ? `desert-boss-${this.idCounter}`
      : isMiniBoss
      ? `bot-mini-${this.idCounter}`
      : `bot-${this.idCounter}`;
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    const scale = isBoss ? 2.45 : isMiniBoss ? 1.46 : 1.05;
    const bodyGroup = new THREE.Group();
    bodyGroup.scale.setScalar(scale);
    root.add(bodyGroup);

    const shadowPlane = new THREE.Mesh(
      isBoss ? this.bossShadowGeo : this.shadowGeo,
      this.shadowMat
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.018;
    if (!isBoss && isMiniBoss) shadowPlane.scale.setScalar(1.45);
    root.add(shadowPlane);

    const primaryArmorMat = new THREE.MeshStandardMaterial({
      color: isBoss ? 0xb91c1c : isMiniBoss ? 0x4338ca : 0x1d4ed8,
      roughness: 0.36,
      metalness: 0.62,
    });
    const secondaryPlateMat = new THREE.MeshStandardMaterial({
      color: isBoss ? 0xef4444 : isMiniBoss ? 0xf59e0b : 0x3b82f6,
      roughness: 0.32,
      metalness: 0.55,
    });
    const frameMetalMat = new THREE.MeshStandardMaterial({
      color: isBoss ? 0x261a1c : isMiniBoss ? 0x312e81 : 0x64748b,
      roughness: 0.48,
      metalness: 0.82,
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x1e242c,
      roughness: 0.35,
      metalness: 0.9,
    });
    const teethMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.32,
      metalness: 0.85,
    });
    const coreGlowMat = new THREE.MeshStandardMaterial({
      color: isBoss ? 0xff4500 : isMiniBoss ? 0xfbbf24 : 0x38bdf8,
      emissive: isBoss ? 0xff2a00 : isMiniBoss ? 0xd97706 : 0x0ea5e9,
      emissiveIntensity: 3.4,
      roughness: 0.15,
    });

    const ownMats = [
      primaryArmorMat,
      secondaryPlateMat,
      frameMetalMat,
      darkSteelMat,
      teethMat,
      coreGlowMat,
    ];
    const hitboxMeshes: THREE.Mesh[] = [];
    const registerHitbox = (mesh: THREE.Mesh, hitZone: 'head' | 'body') => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { enemyId: id, hitZone };
      hitboxMeshes.push(mesh);
    };

    // 1. Reverse-jointed Bipedal Mechanical Legs (NO ARMS)
    const buildMechLeg = (sideX: number) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(sideX, 1.0, 0);

      const thigh = new THREE.Mesh(this.botThighGeo, primaryArmorMat);
      thigh.position.set(0, -0.22, 0.14);
      thigh.rotation.x = -0.45;
      registerHitbox(thigh, 'body');

      const kneeJoint = new THREE.Mesh(this.botFootHubGeo, darkSteelMat);
      kneeJoint.rotation.z = Math.PI / 2;
      kneeJoint.position.set(0, -0.46, 0.26);
      registerHitbox(kneeJoint, 'body');

      const shin = new THREE.Mesh(this.botShinGeo, frameMetalMat);
      shin.position.set(0, -0.72, 0.06);
      shin.rotation.x = 0.38;
      registerHitbox(shin, 'body');

      const footHub = new THREE.Mesh(this.botFootHubGeo, frameMetalMat);
      footHub.position.set(0, -0.95, -0.05);
      registerHitbox(footHub, 'body');

      // 3-toed mechanical talons
      [
        [-0.08, -0.97, 0.1, -0.35],
        [0.08, -0.97, 0.1, 0.35],
        [0, -0.97, -0.18, Math.PI],
      ].forEach(([tx, ty, tz, ry]) => {
        const toe = new THREE.Mesh(this.botToeGeo, darkSteelMat);
        toe.rotation.x = Math.PI / 2;
        toe.rotation.z = ry;
        toe.position.set(tx, ty, tz);
        registerHitbox(toe, 'body');
        legGroup.add(toe);
      });

      legGroup.add(thigh, kneeJoint, shin, footHub);
      return legGroup;
    };

    const leftLegGroup = buildMechLeg(-0.32);
    const rightLegGroup = buildMechLeg(0.32);

    const pelvis = new THREE.Mesh(this.botPelvisGeo, frameMetalMat);
    pelvis.position.set(0, 1.0, 0);
    registerHitbox(pelvis, 'body');
    bodyGroup.add(leftLegGroup, rightLegGroup, pelvis);

    // 2. Forward-Hunched Armored Biomechanical Carapace (Armless Hull)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 1.12, 0);
    bodyGroup.add(torsoGroup);

    const hull = new THREE.Mesh(this.botCarapaceGeo, frameMetalMat);
    hull.position.set(0, 0.32, 0.02);
    registerHitbox(hull, 'body');

    const hump = new THREE.Mesh(this.botHumpGeo, primaryArmorMat);
    hump.position.set(0, 0.52, -0.06);
    hump.rotation.x = 0.24;
    registerHitbox(hump, 'body');

    const dorsalRidge = new THREE.Mesh(this.botRidgeGeo, secondaryPlateMat);
    dorsalRidge.position.set(0, 0.72, -0.12);
    dorsalRidge.rotation.x = 0.22;
    registerHitbox(dorsalRidge, 'body');

    // Dorsal curved horns/spikes along the back
    [
      [0, 0.96, -0.16, -0.22, 0, 1.15],
      [-0.24, 0.78, -0.44, -0.58, 0.32, 0.9],
      [0.24, 0.78, -0.44, -0.58, -0.32, 0.9],
    ].forEach(([sx, sy, sz, rx, rz, sc]) => {
      const spike = new THREE.Mesh(this.botSpikeGeo, secondaryPlateMat);
      spike.position.set(sx, sy, sz);
      spike.rotation.set(rx, 0, rz);
      spike.scale.setScalar(sc);
      registerHitbox(spike, 'body');
      torsoGroup.add(spike);
    });

    torsoGroup.add(hull, hump, dorsalRidge);

    // 3. Snout & Jagged Metallic Jaw (Critical Headshot Zone)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.34, 0.44);
    torsoGroup.add(headGroup);

    const snout = new THREE.Mesh(this.botSnoutGeo, frameMetalMat);
    snout.position.set(0, 0.06, 0.14);
    registerHitbox(snout, 'head');

    const brow = new THREE.Mesh(this.botJawGeo, primaryArmorMat);
    brow.position.set(0, 0.2, 0.1);
    brow.rotation.x = 0.18;
    registerHitbox(brow, 'head');

    const jawGroup = new THREE.Group();
    jawGroup.position.set(0, -0.05, 0.04);
    const lowerJaw = new THREE.Mesh(this.botJawGeo, darkSteelMat);
    lowerJaw.position.set(0, -0.05, 0.12);
    registerHitbox(lowerJaw, 'head');
    jawGroup.add(lowerJaw);

    // Upper & lower jagged steel fangs
    for (let f = -2; f <= 2; f++) {
      const upperFang = new THREE.Mesh(this.botFangGeo, teethMat);
      upperFang.rotation.x = Math.PI;
      upperFang.position.set(f * 0.062, -0.04, 0.29);
      registerHitbox(upperFang, 'head');
      headGroup.add(upperFang);

      const lowerFang = new THREE.Mesh(this.botFangGeo, teethMat);
      lowerFang.position.set(f * 0.062, 0.01, 0.26);
      registerHitbox(lowerFang, 'head');
      jawGroup.add(lowerFang);
    }

    const leftSensor = new THREE.Mesh(this.eyeGeo, coreGlowMat);
    leftSensor.position.set(-0.11, 0.13, 0.31);
    const rightSensor = new THREE.Mesh(this.eyeGeo, coreGlowMat);
    rightSensor.position.set(0.11, 0.13, 0.31);

    const headAnchor = new THREE.Object3D();
    headAnchor.position.set(0, 0.65, 0);

    headGroup.add(snout, brow, jawGroup, leftSensor, rightSensor, headAnchor);

    // 4. Twin Flank-Mounted Energy Cannons (Directly attached to torso sides, NO arms)
    const muzzlePoints: THREE.Object3D[] = [];
    const muzzleFlashes: THREE.Mesh[] = [];

    [-0.46, 0.46].forEach((sideX) => {
      const pod = new THREE.Mesh(this.botPodGeo, primaryArmorMat);
      pod.position.set(sideX, 0.22, 0.12);
      registerHitbox(pod, 'body');

      const barrel = new THREE.Mesh(this.botCannonGeo, darkSteelMat);
      barrel.position.set(sideX, 0.22, 0.48);
      registerHitbox(barrel, 'body');

      const core = new THREE.Mesh(this.botCoreGeo, coreGlowMat);
      core.position.set(sideX, 0.22, 0.77);

      const muzzle = new THREE.Object3D();
      muzzle.position.set(sideX, 0.22, 0.84);
      const flash = new THREE.Mesh(isBoss ? this.bossFlashGeo : this.flashGeo, this.flashMat);
      flash.position.copy(muzzle.position);
      flash.visible = false;

      torsoGroup.add(pod, barrel, core, muzzle, flash);
      muzzlePoints.push(muzzle);
      muzzleFlashes.push(flash);
    });

    parent.add(root);

    const baseHp = isBoss
      ? 1850
      : Math.round((115 + (wave - 1) * 28) * (isMiniBoss ? 3.1 : 1));
    return {
      id,
      label: isBoss
        ? 'JEFE · COLOSO CARMESÍ'
        : isMiniBoss
        ? 'MINI-JEFE · CENTINELA DORADO'
        : `Autómata del Desierto #${this.idCounter}`,
      isBoss,
      isMiniBoss: !isBoss && isMiniBoss,
      isArmlessBot: true,
      jawGroup,
      root,
      bodyGroup,
      torsoGroup,
      headGroup,
      leftLegGroup,
      rightLegGroup,
      leftArmGroup: new THREE.Group(),
      rightArmGroup: new THREE.Group(),
      muzzlePoints,
      muzzleFlashes,
      muzzleFlashTimer: 0,
      headAnchor,
      hp: baseHp,
      maxHp: baseHp,
      alive: true,
      deathCleanupTimer: isBoss ? 6.0 : isMiniBoss ? 4.2 : 3.5,
      hitFlashTimer: 0,
      fireAnimTimer: 0,
      tireThrowAnimTimer: 0,
      stunTimer: 0,
      staggerX: 0,
      staggerY: 0,
      headFlinch: 0,
      collapseProgress: 0,
      walkSpeed: isBoss
        ? 2.25
        : (isMiniBoss ? 2.75 : 2.35 + Math.random() * 0.75) + (wave - 1) * 0.2,
      walkPhase: Math.random() * Math.PI * 2,
      preferredRange: isBoss ? 12.5 : isMiniBoss ? 11.0 : 9.5 + Math.random() * 4.0,
      fireCooldown: isBoss ? 1.35 : isMiniBoss ? 0.95 : 1.3 + Math.random() * 1.1,
      burstRemaining: 0,
      burstShotTimer: 0,
      barrelIndex: 0,
      strafeSign: this.idCounter % 2 === 0 ? 1 : -1,
      collisionRadius: isBoss ? 1.65 : isMiniBoss ? 0.88 : 0.62,
      hitboxMeshes,
      flashMaterials: [primaryArmorMat, secondaryPlateMat, frameMetalMat],
      disposeOwnMaterials: () => ownMats.forEach((m) => m.dispose()),
    };
  }

  public spawnZombieTankBoss(parent: THREE.Object3D, x: number, z: number): ActiveEnemy {
    this.idCounter += 1;
    const id = `boss-${this.idCounter}`;
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    const shadowPlane = new THREE.Mesh(this.bossShadowGeo, this.shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.02;
    root.add(shadowPlane);

    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    // Boss materials
    const armorSteelMat = new THREE.MeshStandardMaterial({
      color: 0x353c46,
      roughness: 0.44,
      metalness: 0.78,
    });
    const treadMat = new THREE.MeshStandardMaterial({
      color: 0x16181d,
      roughness: 0.92,
      metalness: 0.18,
    });
    const rustHazardMat = new THREE.MeshStandardMaterial({
      color: 0x7c2d12,
      roughness: 0.62,
      metalness: 0.45,
    });
    const gunMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1e222a,
      roughness: 0.28,
      metalness: 0.92,
    });
    const zombieSkinMat = new THREE.MeshStandardMaterial({
      color: 0x5c734e,
      roughness: 0.76,
      metalness: 0.06,
    });
    const bloodMat = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      roughness: 0.38,
      metalness: 0.1,
    });
    const bossEyeMat = new THREE.MeshStandardMaterial({
      color: 0xff2a2a,
      emissive: 0xef4444,
      emissiveIntensity: 3.4,
      roughness: 0.15,
    });
    const teethMat = new THREE.MeshStandardMaterial({
      color: 0xd6cfb8,
      roughness: 0.5,
    });

    const ownMats = [
      armorSteelMat,
      treadMat,
      rustHazardMat,
      gunMetalMat,
      zombieSkinMat,
      bloodMat,
      bossEyeMat,
      teethMat,
    ];
    const hitboxMeshes: THREE.Mesh[] = [];
    const registerHitbox = (mesh: THREE.Mesh, hitZone: 'head' | 'body') => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { enemyId: id, hitZone };
      hitboxMeshes.push(mesh);
    };

    // 1. Armored Tank Lower Hull & Sloped Front Glacis
    const hull = new THREE.Mesh(this.hullGeo, armorSteelMat);
    hull.position.set(0, 0.9, 0);
    registerHitbox(hull, 'body');

    const glacis = new THREE.Mesh(this.glacisGeo, rustHazardMat);
    glacis.position.set(0, 0.85, 2.05);
    glacis.rotation.x = 0.42;
    registerHitbox(glacis, 'body');

    // Left & Right Caterpillar Tracks + 8 Road Wheels
    const leftTrack = new THREE.Mesh(this.trackGeo, treadMat);
    leftTrack.position.set(-1.45, 0.46, 0);
    registerHitbox(leftTrack, 'body');

    const rightTrack = new THREE.Mesh(this.trackGeo, treadMat);
    rightTrack.position.set(1.45, 0.46, 0);
    registerHitbox(rightTrack, 'body');

    const roadWheels: THREE.Mesh[] = [];
    [-1.55, -0.52, 0.52, 1.55].forEach((wz) => {
      const lw = new THREE.Mesh(this.wheelGeo, armorSteelMat);
      lw.position.set(-1.45, 0.36, wz);
      const rw = new THREE.Mesh(this.wheelGeo, armorSteelMat);
      rw.position.set(1.45, 0.36, wz);
      bodyGroup.add(lw, rw);
      roadWheels.push(lw, rw);
    });

    // Twin Rear Exhaust Stacks
    [-0.9, 0.9].forEach((ex) => {
      const pipe = new THREE.Mesh(this.exhaustGeo, gunMetalMat);
      pipe.position.set(ex, 1.65, -1.95);
      pipe.rotation.x = -0.15;
      registerHitbox(pipe, 'body');
      bodyGroup.add(pipe);
    });

    bodyGroup.add(hull, glacis, leftTrack, rightTrack);

    // 2. Rotating Armored Turret Group (pivots at y = 1.45)
    const turretGroup = new THREE.Group();
    turretGroup.position.set(0, 1.45, 0);
    bodyGroup.add(turretGroup);

    const turret = new THREE.Mesh(this.turretGeo, armorSteelMat);
    turret.position.set(0, 0.42, 0);
    registerHitbox(turret, 'body');

    const hatch = new THREE.Mesh(this.hatchGeo, rustHazardMat);
    hatch.position.set(0, 0.92, 0.1);
    registerHitbox(hatch, 'body');

    turretGroup.add(turret, hatch);

    // 3. Twin Heavy Rotary Machine Guns ("Metralletas") mounted on Turret Flanks
    const buildMinigun = (sideX: number) => {
      const pod = new THREE.Mesh(this.gunPodGeo, gunMetalMat);
      pod.position.set(sideX, 0.46, 0.45);
      registerHitbox(pod, 'body');
      turretGroup.add(pod);

      const barrelsGroup = new THREE.Group();
      barrelsGroup.position.set(sideX, 0.46, 1.45);
      for (let b = 0; b < 4; b++) {
        const ang = (b / 4) * Math.PI * 2;
        const barrel = new THREE.Mesh(this.gunBarrelGeo, gunMetalMat);
        barrel.position.set(Math.cos(ang) * 0.085, Math.sin(ang) * 0.085, 0);
        registerHitbox(barrel, 'body');
        barrelsGroup.add(barrel);
      }
      const collar = new THREE.Mesh(this.gunCollarGeo, rustHazardMat);
      collar.position.z = 0.48;
      barrelsGroup.add(collar);
      turretGroup.add(barrelsGroup);

      const muzzlePoint = new THREE.Object3D();
      muzzlePoint.position.set(sideX, 0.46, 2.25);
      const flash = new THREE.Mesh(this.bossFlashGeo, this.flashMat);
      flash.position.copy(muzzlePoint.position);
      flash.visible = false;
      turretGroup.add(muzzlePoint, flash);

      return { barrelsGroup, muzzlePoint, flash };
    };

    const leftGun = buildMinigun(-1.26);
    const rightGun = buildMinigun(1.26);

    // 4. Giant Mutated Zombie Head Emerging from Tank Hatch (Headshot Critical Zone!)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.05, 0.12);
    turretGroup.add(headGroup);

    const bossSkull = new THREE.Mesh(this.bossHeadGeo, zombieSkinMat);
    bossSkull.position.set(0, 0.45, 0);
    registerHitbox(bossSkull, 'head');

    const bossJaw = new THREE.Mesh(this.bossJawGeo, zombieSkinMat);
    bossJaw.position.set(0, 0.04, 0.12);
    bossJaw.rotation.x = 0.28;
    registerHitbox(bossJaw, 'head');

    const bossTeeth = new THREE.Mesh(this.bossTeethGeo, teethMat);
    bossTeeth.position.set(0, 0.15, 0.48);
    registerHitbox(bossTeeth, 'head');

    const bossBlood = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.06), bloodMat);
    bossBlood.position.set(-0.18, 0.32, 0.47);
    registerHitbox(bossBlood, 'head');

    const leftEye = new THREE.Mesh(this.bossEyeGeo, bossEyeMat);
    leftEye.position.set(-0.22, 0.54, 0.47);
    const rightEye = new THREE.Mesh(this.bossEyeGeo, bossEyeMat);
    rightEye.position.set(0.22, 0.54, 0.47);

    const headAnchor = new THREE.Object3D();
    headAnchor.position.set(0, 1.25, 0);

    headGroup.add(bossSkull, bossJaw, bossTeeth, bossBlood, leftEye, rightEye, headAnchor);

    // Dummy articulated groups for unified interface
    const dummyLeftLeg = new THREE.Group();
    const dummyRightLeg = new THREE.Group();
    const dummyLeftArm = new THREE.Group();
    const dummyRightArm = new THREE.Group();

    parent.add(root);

    return {
      id,
      label: 'JEFE · TANQUE ZOMBI',
      isBoss: true,
      root,
      bodyGroup,
      torsoGroup: turretGroup,
      headGroup,
      leftLegGroup: dummyLeftLeg,
      rightLegGroup: dummyRightLeg,
      leftArmGroup: dummyLeftArm,
      rightArmGroup: dummyRightArm,
      turretGroup,
      leftBarrels: leftGun.barrelsGroup,
      rightBarrels: rightGun.barrelsGroup,
      roadWheels,
      muzzlePoints: [leftGun.muzzlePoint, rightGun.muzzlePoint],
      muzzleFlashes: [leftGun.flash, rightGun.flash],
      muzzleFlashTimer: 0,
      headAnchor,
      hp: 1100,
      maxHp: 1100,
      alive: true,
      deathCleanupTimer: 6.0,
      hitFlashTimer: 0,
      fireAnimTimer: 0,
      tireThrowAnimTimer: 0,
      stunTimer: 0,
      staggerX: 0,
      staggerY: 0,
      headFlinch: 0,
      collapseProgress: 0,
      walkSpeed: 1.85,
      walkPhase: 0,
      preferredRange: 13.5,
      fireCooldown: 1.95,
      burstRemaining: 0,
      burstShotTimer: 0,
      barrelIndex: 0,
      strafeSign: 1,
      collisionRadius: 2.1,
      hitboxMeshes,
      flashMaterials: [armorSteelMat, rustHazardMat, zombieSkinMat],
      disposeOwnMaterials: () => ownMats.forEach((m) => m.dispose()),
    };
  }

  public spawnTruckTransformer(
    parent: THREE.Object3D,
    x: number,
    z: number,
    wave: number,
    isBoss = false,
    isMiniBoss = false
  ): ActiveEnemy {
    this.idCounter += 1;
    const id = isBoss
      ? `truck-boss-${this.idCounter}`
      : isMiniBoss
      ? `truck-mini-${this.idCounter}`
      : `truck-${this.idCounter}`;
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    const scale = isBoss ? 2.25 : isMiniBoss ? 1.46 : 1.05;
    const bodyGroup = new THREE.Group();
    bodyGroup.scale.setScalar(scale);
    root.add(bodyGroup);

    const shadowPlane = new THREE.Mesh(
      isBoss ? this.bossShadowGeo : this.shadowGeo,
      this.shadowMat
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.018;
    if (!isBoss && isMiniBoss) shadowPlane.scale.setScalar(1.45);
    root.add(shadowPlane);

    const truckArmorMat = new THREE.MeshStandardMaterial({
      color: isBoss ? 0x14532d : isMiniBoss ? 0x1e293b : 0x16a34a,
      roughness: 0.42,
      metalness: isMiniBoss ? 0.58 : 0.38,
    });
    const truckTrimMat = new THREE.MeshStandardMaterial({
      color: isBoss ? 0xb91c1c : isMiniBoss ? 0xd97706 : 0x15803d,
      roughness: 0.45,
      metalness: 0.45,
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1c2026,
      roughness: 0.42,
      metalness: 0.82,
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: isBoss ? 0x3b0d0c : isMiniBoss ? 0x451a03 : 0x0b2615,
      emissive: isBoss ? 0x7f1d1d : isMiniBoss ? 0xd97706 : 0x052e16,
      emissiveIntensity: isMiniBoss ? 1.4 : 0.9,
      roughness: 0.18,
      metalness: 0.65,
    });
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: isBoss ? 0xff4500 : isMiniBoss ? 0xf59e0b : 0xfacc15,
      emissiveIntensity: 3.2,
      roughness: 0.2,
    });

    const ownMats = [truckArmorMat, truckTrimMat, darkMetalMat, visorMat, lightMat];
    const hitboxMeshes: THREE.Mesh[] = [];
    const registerHitbox = (mesh: THREE.Mesh, hitZone: 'head' | 'body') => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { enemyId: id, hitZone };
      hitboxMeshes.push(mesh);
    };

    // 1. Heavy Blocky Mech Legs
    const buildLeg = (sideX: number) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(sideX, 0.92, 0);
      const leg = new THREE.Mesh(this.trLegGeo, truckArmorMat);
      leg.position.set(0, -0.42, 0);
      registerHitbox(leg, 'body');
      const knee = new THREE.Mesh(this.trShoulderGeo, truckTrimMat);
      knee.scale.set(0.95, 0.55, 0.65);
      knee.position.set(0, -0.35, 0.1);
      registerHitbox(knee, 'body');
      const foot = new THREE.Mesh(this.trFootGeo, darkMetalMat);
      foot.position.set(0, -0.84, 0.08);
      registerHitbox(foot, 'body');
      legGroup.add(leg, knee, foot);
      return legGroup;
    };

    const leftLegGroup = buildLeg(-0.28);
    const rightLegGroup = buildLeg(0.28);
    const pelvis = new THREE.Mesh(this.trPelvisGeo, truckTrimMat);
    pelvis.position.set(0, 0.96, 0);
    registerHitbox(pelvis, 'body');
    bodyGroup.add(leftLegGroup, rightLegGroup, pelvis);

    // 2. Boxy Truck-Cab Torso (Front grille, bumper, yellow headlights)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 1.08, 0);
    bodyGroup.add(torsoGroup);

    const cabLower = new THREE.Mesh(this.trCabGeo, truckArmorMat);
    cabLower.position.set(0, 0.36, 0.02);
    registerHitbox(cabLower, 'body');

    const grille = new THREE.Mesh(this.trGrilleGeo, darkMetalMat);
    grille.position.set(0, 0.34, 0.42);
    registerHitbox(grille, 'body');

    const bumper = new THREE.Mesh(this.trBumperGeo, darkMetalMat);
    bumper.position.set(0, 0.1, 0.44);
    registerHitbox(bumper, 'body');

    const headlightL = new THREE.Mesh(this.trLampGeo, lightMat);
    headlightL.position.set(-0.36, 0.44, 0.42);
    const headlightR = new THREE.Mesh(this.trLampGeo, lightMat);
    headlightR.position.set(0.36, 0.44, 0.42);

    torsoGroup.add(cabLower, grille, bumper, headlightL, headlightR);

    // 3. Upper Truck Windshield Cab (Headshot Zone!)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.72, 0.02);
    torsoGroup.add(headGroup);

    const cabTop = new THREE.Mesh(this.trCabGeo, truckArmorMat);
    cabTop.scale.set(0.94, 0.68, 0.92);
    cabTop.position.set(0, 0.24, 0);
    registerHitbox(cabTop, 'head');

    const visor = new THREE.Mesh(this.trVisorGeo, visorMat);
    visor.position.set(0, 0.25, 0.36);
    registerHitbox(visor, 'head');

    const roofCap = new THREE.Mesh(this.trRoofCapGeo, truckTrimMat);
    roofCap.position.set(0, 0.56, 0);
    registerHitbox(roofCap, 'head');

    // 3 Yellow Cab Marker Lights across roof visor
    [-0.18, 0, 0.18].forEach((lx) => {
      const marker = new THREE.Mesh(this.trLampGeo, lightMat);
      marker.scale.set(0.65, 0.65, 0.8);
      marker.position.set(lx, 0.56, 0.41);
      headGroup.add(marker);
    });

    const headAnchor = new THREE.Object3D();
    headAnchor.position.set(0, 0.82, 0);
    headGroup.add(cabTop, visor, roofCap, headAnchor);

    // 4. Twin Arm-Mounted Heavy Cannons ("2 cañones que disparan")
    const muzzlePoints: THREE.Object3D[] = [];
    const muzzleFlashes: THREE.Mesh[] = [];

    const buildCannonArm = (sideX: number) => {
      const armGroup = new THREE.Group();
      armGroup.position.set(sideX, 0.55, 0);

      const shoulder = new THREE.Mesh(this.trShoulderGeo, truckTrimMat);
      shoulder.position.set(0, -0.05, 0);
      registerHitbox(shoulder, 'body');

      const cannonHousing = new THREE.Mesh(this.trCannonTubeGeo, truckArmorMat);
      cannonHousing.position.set(0, -0.22, 0.28);
      registerHitbox(cannonHousing, 'body');

      const barrelTip = new THREE.Mesh(this.trBarrelTipGeo, darkMetalMat);
      barrelTip.position.set(0, -0.22, 0.84);
      registerHitbox(barrelTip, 'body');

      const muzzle = new THREE.Object3D();
      muzzle.position.set(0, -0.22, 1.05);
      const flash = new THREE.Mesh(isBoss ? this.bossFlashGeo : this.flashGeo, this.flashMat);
      flash.position.copy(muzzle.position);
      flash.visible = false;

      armGroup.add(shoulder, cannonHousing, barrelTip, muzzle, flash);
      torsoGroup.add(armGroup);
      muzzlePoints.push(muzzle);
      muzzleFlashes.push(flash);
      return armGroup;
    };

    const leftArmGroup = buildCannonArm(-0.66);
    const rightArmGroup = buildCannonArm(0.66);

    parent.add(root);

    const baseHp = isBoss
      ? 2100
      : Math.round((140 + (wave - 1) * 32) * (isMiniBoss ? 3.05 : 1));
    return {
      id,
      label: isBoss
        ? 'JEFE · MEGA-CAMIÓN TITÁN'
        : isMiniBoss
        ? 'MINI-JEFE · CAMIÓN ARTILLERO'
        : `Camión Transformer #${this.idCounter}`,
      isBoss,
      isMiniBoss: !isBoss && isMiniBoss,
      isTruckBot: true,
      tireCooldown: isBoss ? 3.2 : isMiniBoss ? 3.6 : 4.6 + Math.random() * 2.8,
      root,
      bodyGroup,
      torsoGroup,
      headGroup,
      leftLegGroup,
      rightLegGroup,
      leftArmGroup,
      rightArmGroup,
      muzzlePoints,
      muzzleFlashes,
      muzzleFlashTimer: 0,
      headAnchor,
      hp: baseHp,
      maxHp: baseHp,
      alive: true,
      deathCleanupTimer: isBoss ? 6.0 : isMiniBoss ? 4.2 : 3.5,
      hitFlashTimer: 0,
      fireAnimTimer: 0,
      tireThrowAnimTimer: 0,
      stunTimer: 0,
      staggerX: 0,
      staggerY: 0,
      headFlinch: 0,
      collapseProgress: 0,
      walkSpeed: isBoss
        ? 2.15
        : (isMiniBoss ? 2.65 : 2.25 + Math.random() * 0.65) + (wave - 1) * 0.18,
      walkPhase: Math.random() * Math.PI * 2,
      preferredRange: isBoss ? 13.5 : isMiniBoss ? 11.5 : 10.5 + Math.random() * 3.5,
      fireCooldown: isBoss ? 1.25 : isMiniBoss ? 0.95 : 1.35 + Math.random() * 0.9,
      burstRemaining: 0,
      burstShotTimer: 0,
      barrelIndex: 0,
      strafeSign: this.idCounter % 2 === 0 ? 1 : -1,
      collisionRadius: isBoss ? 1.7 : isMiniBoss ? 0.96 : 0.72,
      hitboxMeshes,
      flashMaterials: [truckArmorMat, truckTrimMat],
      disposeOwnMaterials: () => ownMats.forEach((m) => m.dispose()),
    };
  }

  public spawnWingedKoopa(
    parent: THREE.Object3D,
    x: number,
    z: number,
    wave: number,
    isBoss = false,
    isMiniBoss = false
  ): ActiveEnemy {
    this.idCounter += 1;
    const id = isBoss
      ? `koopa-boss-${this.idCounter}`
      : isMiniBoss
      ? `koopa-mini-${this.idCounter}`
      : `koopa-${this.idCounter}`;
    const hoverBaseY = isBoss ? 1.85 : isMiniBoss ? 1.55 : 1.25 + (this.idCounter % 3) * 0.32;
    const root = new THREE.Group();
    root.position.set(x, hoverBaseY, z);

    const scale = isBoss ? 2.35 : isMiniBoss ? 1.46 : 1.05;
    const bodyGroup = new THREE.Group();
    bodyGroup.scale.setScalar(scale);
    root.add(bodyGroup);

    const shadowPlane = new THREE.Mesh(
      isBoss ? this.bossShadowGeo : this.shadowGeo,
      this.shadowMat
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -hoverBaseY + 0.02;
    if (!isBoss && isMiniBoss) shadowPlane.scale.setScalar(1.45);
    root.add(shadowPlane);

    const yellowSkinMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.42,
      metalness: 0.06,
    });
    const shellMat = new THREE.MeshStandardMaterial({
      color: isBoss
        ? 0x991b1b
        : isMiniBoss
        ? 0x6b21a8
        : this.idCounter % 3 === 0
        ? 0x16a34a
        : 0xdc2626,
      roughness: 0.36,
      metalness: isMiniBoss ? 0.35 : 0.14,
    });
    const creamMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.55,
      metalness: 0.04,
    });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.38,
      metalness: 0.04,
    });
    const bootRedMat = new THREE.MeshStandardMaterial({
      color: isBoss ? 0x7f1d1d : isMiniBoss ? 0x581c87 : 0xdc2626,
      roughness: 0.38,
      metalness: 0.08,
    });
    const pupilMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.18,
    });
    const laserGemMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: isBoss ? 0xff2a2a : isMiniBoss ? 0xf59e0b : 0x00e5ff,
      emissiveIntensity: 3.4,
      roughness: 0.12,
    });
    const boomBlueMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.85,
      roughness: 0.3,
    });

    const ownMats = [
      yellowSkinMat,
      shellMat,
      creamMat,
      whiteMat,
      bootRedMat,
      pupilMat,
      laserGemMat,
      boomBlueMat,
    ];
    const hitboxMeshes: THREE.Mesh[] = [];
    const registerHitbox = (mesh: THREE.Mesh, hitZone: 'head' | 'body') => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { enemyId: id, hitZone };
      hitboxMeshes.push(mesh);
    };

    // 1. Koopa Legs + Big Red Mario Boots
    const buildKoopaLeg = (sideX: number) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(sideX, 0.58, 0);
      const leg = new THREE.Mesh(this.kpLimbGeo, yellowSkinMat);
      leg.position.set(0, -0.18, 0);
      registerHitbox(leg, 'body');
      const boot = new THREE.Mesh(this.kpBootGeo, bootRedMat);
      boot.position.set(0, -0.39, 0.06);
      registerHitbox(boot, 'body');
      const sole = new THREE.Mesh(this.kpBootGeo, creamMat);
      sole.scale.set(1.02, 0.25, 1.02);
      sole.position.set(0, -0.47, 0.06);
      legGroup.add(leg, boot, sole);
      return legGroup;
    };

    const leftLegGroup = buildKoopaLeg(-0.2);
    const rightLegGroup = buildKoopaLeg(0.2);
    bodyGroup.add(leftLegGroup, rightLegGroup);

    // 2. Koopa Shell & Belly Plastron Torso
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.96, 0);
    bodyGroup.add(torsoGroup);

    const shellBack = new THREE.Mesh(this.kpShellGeo, shellMat);
    shellBack.scale.set(0.95, 1.15, 0.85);
    shellBack.position.set(0, 0.05, -0.14);
    registerHitbox(shellBack, 'body');

    const shellRim = new THREE.Mesh(this.kpRimGeo, whiteMat);
    shellRim.scale.set(0.95, 1.12, 0.7);
    shellRim.position.set(0, 0.05, 0.02);
    registerHitbox(shellRim, 'body');

    const belly = new THREE.Mesh(this.kpBellyGeo, creamMat);
    belly.position.set(0, 0.04, 0.14);
    registerHitbox(belly, 'body');

    // Chest Laser Emitter Gem ("rayo laser")
    const laserEmitter = new THREE.Mesh(this.eyeGeo, laserGemMat);
    laserEmitter.scale.setScalar(1.8);
    laserEmitter.position.set(0, 0.16, 0.26);

    const muzzlePoint = new THREE.Object3D();
    muzzlePoint.position.set(0, 0.16, 0.34);
    const muzzleFlash = new THREE.Mesh(isBoss ? this.bossFlashGeo : this.flashGeo, this.flashMat);
    muzzleFlash.position.copy(muzzlePoint.position);
    muzzleFlash.visible = false;

    torsoGroup.add(shellBack, shellRim, belly, laserEmitter, muzzlePoint, muzzleFlash);

    // 3. Animated White Feathered Wings on Shell Flanks ("tienen alas y vuelan")
    const buildWing = (side: -1 | 1) => {
      const wg = new THREE.Group();
      wg.position.set(side * 0.34, 0.24, -0.2);
      const inner = new THREE.Mesh(this.kpWingBladeGeo, whiteMat);
      inner.position.set(side * 0.24, 0.04, -0.02);
      inner.rotation.z = side * 0.18;
      registerHitbox(inner, 'body');

      const outer = new THREE.Mesh(this.kpWingTipGeo, whiteMat);
      outer.position.set(side * 0.52, 0.12, -0.04);
      outer.rotation.z = side * 0.36;
      registerHitbox(outer, 'body');

      wg.add(inner, outer);
      torsoGroup.add(wg);
      return wg;
    };
    const leftWingGroup = buildWing(-1);
    const rightWingGroup = buildWing(1);

    // 4. Koopa Arms + Held Boomerang in Right Hand
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.36, 0.18, 0.08);
    const lArm = new THREE.Mesh(this.kpLimbGeo, yellowSkinMat);
    lArm.position.set(-0.08, -0.14, 0.08);
    lArm.rotation.set(-0.55, 0, 0.32);
    const lFist = new THREE.Mesh(this.kpFistGeo, yellowSkinMat);
    lFist.position.set(-0.14, -0.24, 0.18);
    registerHitbox(lArm, 'body');
    leftArmGroup.add(lArm, lFist);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.36, 0.18, 0.08);
    const rArm = new THREE.Mesh(this.kpLimbGeo, yellowSkinMat);
    rArm.position.set(0.08, -0.14, 0.08);
    rArm.rotation.set(-0.65, 0, -0.32);
    const rFist = new THREE.Mesh(this.kpFistGeo, yellowSkinMat);
    rFist.position.set(0.14, -0.22, 0.22);
    registerHitbox(rArm, 'body');

    // Held Boomerang in right hand
    const heldBoom = new THREE.Group();
    const b1 = new THREE.Mesh(this.kpBoomA, boomBlueMat);
    b1.position.set(0.1, 0, 0.06);
    b1.rotation.y = -0.55;
    const b2 = new THREE.Mesh(this.kpBoomA, boomBlueMat);
    b2.position.set(-0.1, 0, 0.06);
    b2.rotation.y = 0.55;
    heldBoom.add(b1, b2);
    heldBoom.position.set(0.18, -0.22, 0.32);
    heldBoom.rotation.x = 0.4;
    rightArmGroup.add(rArm, rFist, heldBoom);

    torsoGroup.add(leftArmGroup, rightArmGroup);

    // 5. Expressive Koopa Head & Beak Snout (Critical Headshot Zone!)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.44, 0.12);
    torsoGroup.add(headGroup);

    const cranium = new THREE.Mesh(this.kpHeadGeo, yellowSkinMat);
    cranium.position.set(0, 0.22, 0);
    registerHitbox(cranium, 'head');

    const snout = new THREE.Mesh(this.kpSnoutGeo, yellowSkinMat);
    snout.scale.set(1.05, 0.82, 1.18);
    snout.position.set(0, 0.14, 0.22);
    registerHitbox(snout, 'head');

    const eyeL = new THREE.Mesh(this.kpEyeWhiteGeo, whiteMat);
    eyeL.scale.set(0.9, 1.25, 0.7);
    eyeL.position.set(-0.1, 0.34, 0.16);
    registerHitbox(eyeL, 'head');
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.1;
    registerHitbox(eyeR, 'head');

    const pupilL = new THREE.Mesh(this.kpPupilGeo, pupilMat);
    pupilL.position.set(-0.09, 0.34, 0.23);
    const pupilR = pupilL.clone();
    pupilR.position.x = 0.09;

    const laserVisorL = new THREE.Mesh(this.kpPupilGeo, laserGemMat);
    laserVisorL.scale.setScalar(0.55);
    laserVisorL.position.set(-0.09, 0.34, 0.265);
    const laserVisorR = laserVisorL.clone();
    laserVisorR.position.x = 0.09;

    if (isBoss || isMiniBoss) {
      // Golden Royal Koopa Crown on Boss / Spike Crest on Mini-Boss!
      const crownMat = new THREE.MeshStandardMaterial({
        color: isBoss ? 0xfacc15 : 0xe879f9,
        emissive: isBoss ? 0xca8a04 : 0x9333ea,
        emissiveIntensity: 0.65,
        roughness: 0.2,
        metalness: 0.85,
      });
      ownMats.push(crownMat);
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(isBoss ? 0.24 : 0.17, isBoss ? 0.18 : 0.13, isBoss ? 0.2 : 0.16, 6),
        crownMat
      );
      crown.position.set(0, 0.56, 0);
      registerHitbox(crown, 'head');
      headGroup.add(crown);
    }

    const headAnchor = new THREE.Object3D();
    headAnchor.position.set(0, 0.65, 0);
    headGroup.add(cranium, snout, eyeL, eyeR, pupilL, pupilR, laserVisorL, laserVisorR, headAnchor);

    parent.add(root);

    const baseHp = isBoss
      ? 2950
      : Math.round((155 + (wave - 1) * 38) * (isMiniBoss ? 2.9 : 1));
    return {
      id,
      label: isBoss
        ? 'JEFE · REY KOOPA ALADO'
        : isMiniBoss
        ? 'MINI-JEFE · KOOPA GUARDIÁN'
        : `Koopa Alado #${this.idCounter}`,
      isBoss,
      isMiniBoss: !isBoss && isMiniBoss,
      isKoopa: true,
      leftWingGroup,
      rightWingGroup,
      hoverBaseY,
      boomerangCooldown: isBoss ? 1.75 : isMiniBoss ? 2.0 : 2.45 + Math.random() * 1.4,
      throwAnimTimer: 0,
      fireAnimTimer: 0,
      tireThrowAnimTimer: 0,
      stunTimer: 0,
      heldBoomerangMesh: heldBoom,
      root,
      bodyGroup,
      torsoGroup,
      headGroup,
      leftLegGroup,
      rightLegGroup,
      leftArmGroup,
      rightArmGroup,
      muzzlePoints: [muzzlePoint],
      muzzleFlashes: [muzzleFlash],
      muzzleFlashTimer: 0,
      headAnchor,
      hp: baseHp,
      maxHp: baseHp,
      alive: true,
      deathCleanupTimer: isBoss ? 6.0 : isMiniBoss ? 4.2 : 3.5,
      hitFlashTimer: 0,
      staggerX: 0,
      staggerY: 0,
      headFlinch: 0,
      collapseProgress: 0,
      walkSpeed: isBoss
        ? 3.45
        : (isMiniBoss ? 4.15 : 3.55 + Math.random() * 0.9) + (wave - 1) * 0.25,
      walkPhase: Math.random() * Math.PI * 2,
      preferredRange: isBoss ? 14.0 : isMiniBoss ? 11.5 : 10.5 + Math.random() * 3.5,
      fireCooldown: isBoss ? 0.9 : isMiniBoss ? 0.72 : 0.9 + Math.random() * 0.65,
      burstRemaining: 0,
      burstShotTimer: 0,
      barrelIndex: 0,
      strafeSign: this.idCounter % 2 === 0 ? 1 : -1,
      collisionRadius: isBoss ? 1.6 : isMiniBoss ? 0.9 : 0.65,
      hitboxMeshes,
      flashMaterials: [yellowSkinMat, shellMat, bootRedMat],
      disposeOwnMaterials: () => ownMats.forEach((m) => m.dispose()),
    };
  }

  private getOrCreateNextbotTexture(kind: NextbotKind): THREE.CanvasTexture {
    const cached = this.nextbotTexCache[kind];
    if (cached) return cached;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 640;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 640);

    const drawCaption = (text: string, bg: string, fg: string) => {
      ctx.fillStyle = bg;
      ctx.fillRect(28, 558, 456, 60);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 6;
      ctx.strokeRect(28, 558, 456, 60);
      ctx.fillStyle = fg;
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 588);
    };

    if (kind === 'bob_esponja') {
      // Bob Esponja enfadado chasing meme cutout
      ctx.fillStyle = '#000000';
      ctx.fillRect(92, 46, 328, 370);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(104, 58, 304, 346);

      // Sponge pores
      ctx.fillStyle = '#ca8a04';
      [
        [135, 95, 16],
        [368, 108, 18],
        [128, 330, 14],
        [374, 322, 15],
        [345, 225, 11],
      ].forEach(([px, py, pr]) => {
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      });

      // Huge bloodshot glaring eyes
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(198, 185, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(314, 185, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Angry red veins & piercing blue/red pupils
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(155, 175);
      ctx.lineTo(175, 185);
      ctx.moveTo(355, 172);
      ctx.lineTo(334, 184);
      ctx.stroke();

      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(204, 188, 22, 0, Math.PI * 2);
      ctx.arc(308, 188, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(204, 188, 10, 0, Math.PI * 2);
      ctx.arc(308, 188, 10, 0, Math.PI * 2);
      ctx.fill();

      // Furrowed angry V-brows
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(140, 122);
      ctx.lineTo(240, 158);
      ctx.moveTo(372, 122);
      ctx.lineTo(272, 158);
      ctx.stroke();

      // Nose & angry grimace mouth with buck teeth
      ctx.fillStyle = '#eab308';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.ellipse(256, 232, 22, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.roundRect(156, 268, 200, 68, 18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(214, 272, 34, 28);
      ctx.strokeRect(214, 272, 34, 28);
      ctx.fillRect(264, 272, 34, 28);
      ctx.strokeRect(264, 272, 34, 28);

      // Shirt + red tie + brown square pants
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(104, 376, 304, 58);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(104, 434, 304, 72);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(242, 380);
      ctx.lineTo(270, 380);
      ctx.lineTo(266, 444);
      ctx.lineTo(256, 462);
      ctx.lineTo(246, 444);
      ctx.closePath();
      ctx.fill();

      // Legs
      ctx.fillStyle = '#facc15';
      ctx.fillRect(168, 506, 28, 46);
      ctx.fillRect(316, 506, 28, 46);

      drawCaption('BOB ESPONJA ENFADADO', '#dc2626', '#fef08a');
    } else if (kind === 'among_us') {
      // Classic Red Among Us Sus cutout
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 14;

      // Backpack
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.roundRect(88, 178, 76, 184, 26);
      ctx.fill();
      ctx.stroke();

      // Main bean body + legs
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.roundRect(142, 82, 238, 355, 110);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.roundRect(148, 392, 92, 134, 26);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(276, 392, 92, 134, 26);
      ctx.fill();
      ctx.stroke();

      // Cyan shiny visor
      ctx.fillStyle = '#67e8f9';
      ctx.beginPath();
      ctx.roundRect(204, 152, 190, 96, 46);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ecfeff';
      ctx.beginPath();
      ctx.ellipse(276, 178, 52, 14, -0.1, 0, Math.PI * 2);
      ctx.fill();

      drawCaption('AMONG US (SUS)', '#111827', '#f87171');
    } else {
      // 'en_este_pueblo': Draw crisp Roblox red-suit / red-hat / yellow-glasses placeholder immediately,
      // then overwrite with the exact user-uploaded /assets/aistudio/image_c36319d9.png portrait once loaded!
      ctx.fillStyle = '#18181b';
      ctx.fillRect(36, 36, 440, 510);
      // Red suit torso & arms
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(156, 260, 200, 195);
      ctx.fillRect(92, 268, 60, 165);
      ctx.fillRect(360, 268, 60, 165);
      // White shirt & red tie
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(228, 262, 56, 55);
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(248, 272, 16, 80);
      // Roblox head
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(194, 134, 124, 122, 24);
      ctx.fill();
      // Yellow round glasses
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(228, 192, 22, 0, Math.PI * 2);
      ctx.arc(284, 192, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Red fedora hat
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(152, 122, 208, 20);
      ctx.fillRect(184, 68, 144, 58);
      ctx.fillStyle = '#111827';
      ctx.fillRect(184, 110, 144, 12);

      drawCaption('EN ESTE PUEBLO', '#7f1d1d', '#fde047');
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    if (kind === 'en_este_pueblo') {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, 512, 640);
        // Crop central frame of uploaded meme screenshot (trims top/bottom black bars)
        const sx = Math.floor(img.width * 0.08);
        const sy = Math.floor(img.height * 0.23);
        const sw = Math.floor(img.width * 0.84);
        const sh = Math.floor(img.height * 0.57);
        ctx.fillStyle = '#111827';
        ctx.fillRect(22, 20, 468, 530);
        ctx.drawImage(img, sx, sy, sw, sh, 32, 30, 448, 510);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 10;
        ctx.strokeRect(27, 25, 458, 520);
        drawCaption('EN ESTE PUEBLO', '#991b1b', '#fef08a');
        tex.needsUpdate = true;
      };
      img.src = '/assets/aistudio/image_c36319d9.png';
    }

    this.nextbotTexCache[kind] = tex;
    return tex;
  }

  public spawnNextbot(
    parent: THREE.Object3D,
    x: number,
    z: number,
    kind: NextbotKind,
    waveScale = 1,
    isMiniBoss = false
  ): ActiveEnemy {
    this.idCounter += 1;
    const id = isMiniBoss
      ? `nextbot-mini-${kind}-${this.idCounter}`
      : `nextbot-${kind}-${this.idCounter}`;
    const ownMats: THREE.Material[] = [];
    const hitboxMeshes: THREE.Mesh[] = [];

    const tex = this.getOrCreateNextbotTexture(kind);
    const cardMat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.14,
      side: THREE.DoubleSide,
      roughness: 0.45,
      metalness: 0.05,
      emissive: new THREE.Color(isMiniBoss ? 0x3b0764 : 0x000000),
      emissiveIntensity: isMiniBoss ? 0.55 : 0.45,
    });
    const hitboxMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    ownMats.push(cardMat, hitboxMat);

    const root = new THREE.Group();
    root.position.set(x, 0, z);
    if (isMiniBoss) root.scale.setScalar(1.38);

    const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    root.add(shadow);

    const bodyGroup = new THREE.Group();
    const torsoGroup = new THREE.Group();
    const headGroup = new THREE.Group();
    const leftLegGroup = new THREE.Group();
    const rightLegGroup = new THREE.Group();
    const leftArmGroup = new THREE.Group();
    const rightArmGroup = new THREE.Group();

    const billboard = new THREE.Mesh(this.nextbotPlaneGeo, cardMat);
    billboard.position.set(0, 1.18, 0);
    billboard.castShadow = true;
    torsoGroup.add(billboard);

    if (isMiniBoss) {
      const auraMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.82,
      });
      ownMats.push(auraMat);
      const auraFrame = new THREE.Mesh(this.nextbotPlaneGeo, auraMat);
      auraFrame.scale.set(1.08, 1.06, 1);
      auraFrame.position.set(0, 1.18, -0.025);
      torsoGroup.add(auraFrame);
    }

    const bodyHit = new THREE.Mesh(this.nextbotBodyHitGeo, hitboxMat);
    bodyHit.position.set(0, 0.78, 0);
    bodyHit.userData = { enemyId: id, hitZone: 'body' as const };
    hitboxMeshes.push(bodyHit);

    const headHit = new THREE.Mesh(this.nextbotHeadHitGeo, hitboxMat);
    headHit.position.set(0, 1.78, 0);
    headHit.userData = { enemyId: id, hitZone: 'head' as const };
    hitboxMeshes.push(headHit);

    const headAnchor = new THREE.Object3D();
    headAnchor.position.set(0, 2.38, 0);

    torsoGroup.add(bodyHit, headHit, headAnchor);
    bodyGroup.add(torsoGroup, headGroup, leftLegGroup, rightLegGroup, leftArmGroup, rightArmGroup);
    root.add(bodyGroup);
    parent.add(root);

    const labelMap: Record<NextbotKind, string> = {
      bob_esponja: 'Bob Esponja Enfadado',
      en_este_pueblo: 'En Este Pueblo',
      among_us: 'Among Us (Sus)',
    };
    const speedMap: Record<NextbotKind, number> = {
      bob_esponja: 5.75,
      en_este_pueblo: 5.35,
      among_us: 5.2,
    };

    const baseHp = Math.round((145 + (waveScale - 1) * 28) * (isMiniBoss ? 2.95 : 1));
    return {
      id,
      label: isMiniBoss ? `MINI-JEFE · GIGA ${labelMap[kind].toUpperCase()}` : labelMap[kind],
      isBoss: false,
      isMiniBoss,
      isNextbot: true,
      nextbotKind: kind,
      meleeCooldown: 0.4,
      root,
      bodyGroup,
      torsoGroup,
      headGroup,
      leftLegGroup,
      rightLegGroup,
      leftArmGroup,
      rightArmGroup,
      muzzlePoints: [],
      muzzleFlashes: [],
      muzzleFlashTimer: 0,
      headAnchor,
      hp: baseHp,
      maxHp: baseHp,
      alive: true,
      deathCleanupTimer: 1.6,
      hitFlashTimer: 0,
      staggerX: 0,
      staggerY: 0,
      headFlinch: 0,
      collapseProgress: 0,
      walkSpeed: (speedMap[kind] + Math.random() * 0.55) * (isMiniBoss ? 1.15 : 1),
      walkPhase: Math.random() * Math.PI * 2,
      preferredRange: 0.95,
      fireCooldown: 999,
      burstRemaining: 0,
      burstShotTimer: 0,
      barrelIndex: 0,
      strafeSign: this.idCounter % 2 === 0 ? 1 : -1,
      collisionRadius: isMiniBoss ? 0.8 : 0.58,
      hitboxMeshes,
      flashMaterials: [cardMat],
      disposeOwnMaterials: () => ownMats.forEach((m) => m.dispose()),
    };
  }

  private getRobloxFaceTexture(variant: RobloxPuebloVariant): THREE.CanvasTexture {
    const key = `face-${variant === 'suit' || variant === 'mayor' ? 'suit' : variant}`;
    if (this.rbxTexCache[key]) return this.rbxTexCache[key];

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;

    const isSuit = variant === 'suit' || variant === 'mayor';
    ctx.fillStyle = isSuit ? '#a1a8b3' : variant === 'green_npc' ? '#e2c5a6' : '#ecd4bd';
    ctx.fillRect(0, 0, 256, 160);

    if (isSuit) {
      // Classic gray sly grin beneath yellow round glasses
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(128, 102, 34, 0.18 * Math.PI, 0.82 * Math.PI);
      ctx.stroke();

      // Subtle brow shadow
      ctx.fillStyle = '#334155';
      ctx.fillRect(72, 48, 36, 10);
      ctx.fillRect(148, 48, 36, 10);
    } else {
      // Classic friendly-ominous Roblox town NPC eyes + smile
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.ellipse(98, 66, 9, 14, 0, 0, Math.PI * 2);
      ctx.ellipse(158, 66, 9, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(128, 92, 28, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.rbxTexCache[key] = tex;
    return tex;
  }

  private getRobloxSuitChestTexture(): THREE.CanvasTexture {
    const key = 'suit-chest';
    if (this.rbxTexCache[key]) return this.rbxTexCache[key];

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Crimson red suit base
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, 256, 256);

    // Subtle fabric shading
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(0, 0, 20, 256);
    ctx.fillRect(236, 0, 20, 256);

    // Crisp white shirt V-opening
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(86, 0);
    ctx.lineTo(170, 0);
    ctx.lineTo(128, 128);
    ctx.closePath();
    ctx.fill();

    // Suit lapels
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(78, 0);
    ctx.lineTo(128, 134);
    ctx.lineTo(178, 0);
    ctx.stroke();

    // Dark crimson necktie
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(118, 18);
    ctx.lineTo(138, 18);
    ctx.lineTo(142, 92);
    ctx.lineTo(128, 120);
    ctx.lineTo(114, 92);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Center suit seam + two black buttons
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(128, 134);
    ctx.lineTo(128, 256);
    ctx.stroke();

    ctx.fillStyle = '#111827';
    [164, 202].forEach((by) => {
      ctx.beginPath();
      ctx.arc(138, by, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.rbxTexCache[key] = tex;
    return tex;
  }

  public spawnRobloxPuebloEnemy(
    parent: THREE.Object3D,
    x: number,
    z: number,
    variant: RobloxPuebloVariant,
    wave: number,
    label: string,
    isBoss = false,
    isMiniBoss = false
  ): ActiveEnemy {
    this.idCounter += 1;
    const id = isMiniBoss
      ? `pueblo-mini-${variant}-${this.idCounter}`
      : `pueblo-${variant}-${this.idCounter}`;
    const ownMats: THREE.Material[] = [];
    const hitboxMeshes: THREE.Mesh[] = [];
    const flashMaterials: THREE.MeshStandardMaterial[] = [];

    const regMat = <T extends THREE.Material>(m: T): T => {
      ownMats.push(m);
      return m;
    };

    const isSuit = variant === 'suit' || variant === 'mayor' || isMiniBoss;
    const skinColor = isSuit ? 0xa1a8b3 : variant === 'green_npc' ? 0xe2c5a6 : 0xecd4bd;
    const torsoColor = isMiniBoss && !isBoss
      ? 0x7f1d1d
      : isSuit
      ? 0xdc2626
      : variant === 'green_npc'
      ? 0x4ade80
      : 0x60a5fa;
    const pantsColor = isMiniBoss && !isBoss
      ? 0x18181b
      : isSuit
      ? 0xb91c1c
      : variant === 'green_npc'
      ? 0x3b82f6
      : 0x374151;

    const skinMat = regMat(new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.52 }));
    const pantsMat = regMat(new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.62 }));
    const suitCoatMat = regMat(new THREE.MeshStandardMaterial({ color: torsoColor, roughness: 0.48 }));
    const suitFrontMat = isSuit
      ? regMat(
          new THREE.MeshStandardMaterial({
            map: this.getRobloxSuitChestTexture(),
            roughness: 0.45,
          })
        )
      : suitCoatMat;
    const blackTrimMat = regMat(
      new THREE.MeshStandardMaterial({
        color: isMiniBoss && !isBoss ? 0xf59e0b : 0x111827,
        roughness: 0.35,
        metalness: isMiniBoss && !isBoss ? 0.65 : 0.2,
      })
    );
    const glassMat = regMat(
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: variant === 'mayor' || isMiniBoss ? 0xeab308 : 0x000000,
        emissiveIntensity: variant === 'mayor' ? 1.0 : isMiniBoss ? 0.85 : 0.25,
        roughness: 0.18,
        metalness: 0.25,
      })
    );
    const faceMat = regMat(
      new THREE.MeshStandardMaterial({
        map: this.getRobloxFaceTexture(isSuit ? 'suit' : variant),
        roughness: 0.48,
      })
    );
    const gunMat = regMat(
      new THREE.MeshStandardMaterial({
        color: isBoss || isMiniBoss ? 0xfbbf24 : 0x1e293b,
        roughness: 0.3,
        metalness: isBoss || isMiniBoss ? 0.85 : 0.65,
      })
    );
    const localFlashMat = regMat(this.flashMat.clone());

    flashMaterials.push(skinMat, pantsMat, suitCoatMat);
    if (suitFrontMat !== suitCoatMat) flashMaterials.push(suitFrontMat);

    const root = new THREE.Group();
    root.position.set(x, 0, z);
    const scale = isBoss ? 1.94 : isMiniBoss ? 1.42 : isSuit ? 1.08 : 1.0;
    root.scale.setScalar(scale);

    const shadow = new THREE.Mesh(isBoss ? this.bossShadowGeo : this.shadowGeo, this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    root.add(shadow);

    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    // Blocky Roblox R6 legs
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.19, 0.76, 0);
    const lLegMesh = new THREE.Mesh(this.rbxLimbGeo, pantsMat);
    lLegMesh.position.y = -0.38;
    lLegMesh.castShadow = true;
    lLegMesh.userData = { enemyId: id, hitZone: 'body' as const };
    hitboxMeshes.push(lLegMesh);
    leftLegGroup.add(lLegMesh);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.19, 0.76, 0);
    const rLegMesh = new THREE.Mesh(this.rbxLimbGeo, pantsMat);
    rLegMesh.position.y = -0.38;
    rLegMesh.castShadow = true;
    rLegMesh.userData = { enemyId: id, hitZone: 'body' as const };
    hitboxMeshes.push(rLegMesh);
    rightLegGroup.add(rLegMesh);

    // Blocky Roblox R6 torso (multi-material on front +Z face for red suit shirt/tie!)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 1.15, 0);
    const torsoMesh = new THREE.Mesh(this.rbxTorsoGeo, [
      suitCoatMat,
      suitCoatMat,
      suitCoatMat,
      suitCoatMat,
      suitFrontMat,
      suitCoatMat,
    ]);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    torsoMesh.userData = { enemyId: id, hitZone: 'body' as const };
    hitboxMeshes.push(torsoMesh);
    torsoGroup.add(torsoMesh);

    // Blocky Roblox R6 arms
    const armMat = isSuit ? suitCoatMat : skinMat;
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.56, 1.5, 0);
    const lArmMesh = new THREE.Mesh(this.rbxLimbGeo, armMat);
    lArmMesh.position.y = -0.34;
    lArmMesh.castShadow = true;
    lArmMesh.userData = { enemyId: id, hitZone: 'body' as const };
    hitboxMeshes.push(lArmMesh);
    leftArmGroup.add(lArmMesh);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.56, 1.5, 0);
    const rArmMesh = new THREE.Mesh(this.rbxLimbGeo, armMat);
    rArmMesh.position.y = -0.34;
    rArmMesh.castShadow = true;
    rArmMesh.userData = { enemyId: id, hitZone: 'body' as const };
    hitboxMeshes.push(rArmMesh);
    rightArmGroup.add(rArmMesh);

    // Pistol in right hand (and second golden pistol on Boss AND Mini-Boss!)
    const muzzlePoints: THREE.Object3D[] = [];
    const muzzleFlashes: THREE.Mesh[] = [];

    const attachPistol = (armGrp: THREE.Group, sideX: number) => {
      const gun = new THREE.Mesh(this.pistolGeo, gunMat);
      gun.position.set(sideX * 0.02, -0.68, 0.25);
      gun.rotation.x = Math.PI / 2;
      armGrp.add(gun);

      const mp = new THREE.Object3D();
      mp.position.set(sideX * 0.02, -0.68, 0.56);
      armGrp.add(mp);
      muzzlePoints.push(mp);

      const mf = new THREE.Mesh(this.flashGeo, localFlashMat);
      mf.position.copy(mp.position);
      mf.visible = false;
      armGrp.add(mf);
      muzzleFlashes.push(mf);
    };

    attachPistol(rightArmGroup, 1);
    if (isBoss || isMiniBoss) {
      attachPistol(leftArmGroup, -1);
    }

    // Classic Roblox Cylinder Head + Face Plate + Accessories
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.55, 0);

    const headMesh = new THREE.Mesh(this.rbxHeadGeo, skinMat);
    headMesh.position.y = 0.22;
    headMesh.castShadow = true;
    headMesh.userData = { enemyId: id, hitZone: 'head' as const };
    hitboxMeshes.push(headMesh);
    headGroup.add(headMesh);

    const facePlaneGeo = this.trVisorGeo;
    void facePlaneGeo;
    const facePlate = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.25), faceMat);
    facePlate.position.set(0, 0.22, 0.242);
    ownMats.push({ dispose: () => facePlate.geometry.dispose() } as unknown as THREE.Material);
    headGroup.add(facePlate);

    if (isSuit) {
      // Iconic Yellow Round Sunglasses perched cleanly over the face
      [-0.092, 0.092].forEach((gx) => {
        const rim = new THREE.Mesh(this.rbxGlassLensGeo, blackTrimMat);
        rim.rotation.x = Math.PI / 2;
        rim.scale.set(1.12, 1, 1.12);
        rim.position.set(gx, 0.255, 0.255);

        const lens = new THREE.Mesh(this.rbxGlassLensGeo, glassMat);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(gx, 0.255, 0.262);
        headGroup.add(rim, lens);
      });
      const bridge = new THREE.Mesh(this.rbxGlassBridgeGeo, blackTrimMat);
      bridge.position.set(0, 0.26, 0.26);
      headGroup.add(bridge);

      // Iconic Red Fedora Hat with Black/Gold Band
      const brim = new THREE.Mesh(this.rbxHatBrimGeo, suitCoatMat);
      brim.position.y = 0.43;
      brim.castShadow = true;
      const crown = new THREE.Mesh(this.rbxHatCrownGeo, suitCoatMat);
      crown.position.y = 0.56;
      crown.castShadow = true;
      const band = new THREE.Mesh(this.rbxHatBandGeo, blackTrimMat);
      band.position.y = 0.475;
      headGroup.add(brim, crown, band);
    } else {
      // Sculpted blocky Roblox hair for Green & Blue town neighbors
      const hairColor = variant === 'green_npc' ? 0x4a3525 : 0x18181b;
      const hairMat = regMat(new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.72 }));
      const hairTop = new THREE.Mesh(this.rbxHairTopGeo, hairMat);
      hairTop.position.set(0, 0.46, -0.02);
      const hairL = new THREE.Mesh(this.rbxHairSideGeo, hairMat);
      hairL.position.set(-0.24, 0.26, -0.02);
      const hairR = new THREE.Mesh(this.rbxHairSideGeo, hairMat);
      hairR.position.set(0.24, 0.26, -0.02);
      headGroup.add(hairTop, hairL, hairR);
    }

    const headAnchor = new THREE.Object3D();
    headAnchor.position.set(0, isSuit ? 0.74 : 0.62, 0);
    headGroup.add(headAnchor);

    bodyGroup.add(leftLegGroup, rightLegGroup, torsoGroup, leftArmGroup, rightArmGroup, headGroup);
    parent.add(root);

    const waveHpScale = 1 + (wave - 1) * 0.4;
    const baseHp = isBoss
      ? 3150
      : isMiniBoss
      ? Math.round(195 * waveHpScale * 2.9)
      : Math.round((isSuit ? 185 : 140) * waveHpScale);

    return {
      id,
      label,
      isBoss,
      isMiniBoss: !isBoss && isMiniBoss,
      isRobloxPueblo: true,
      root,
      bodyGroup,
      torsoGroup,
      headGroup,
      leftLegGroup,
      rightLegGroup,
      leftArmGroup,
      rightArmGroup,
      muzzlePoints,
      muzzleFlashes,
      muzzleFlashTimer: 0,
      headAnchor,
      hp: baseHp,
      maxHp: baseHp,
      alive: true,
      deathCleanupTimer: isBoss ? 2.6 : isMiniBoss ? 2.2 : 1.7,
      hitFlashTimer: 0,
      staggerX: 0,
      staggerY: 0,
      headFlinch: 0,
      collapseProgress: 0,
      walkSpeed: isBoss
        ? 4.35
        : isMiniBoss
        ? 5.15 + (wave - 1) * 0.2
        : isSuit
        ? 4.85 + (wave - 1) * 0.24
        : 4.45 + (wave - 1) * 0.22,
      walkPhase: Math.random() * Math.PI * 2,
      preferredRange: isBoss ? 12.0 : isMiniBoss ? 10.5 : isSuit ? 9.5 + Math.random() * 2.5 : 8.5 + Math.random() * 2.5,
      fireCooldown: isBoss ? 0.55 : isMiniBoss ? 0.68 : 0.72 + Math.random() * 0.45,
      burstRemaining: 0,
      burstShotTimer: 0,
      barrelIndex: 0,
      strafeSign: this.idCounter % 2 === 0 ? 1 : -1,
      collisionRadius: isBoss ? 1.25 : isMiniBoss ? 0.8 : 0.56,
      hitboxMeshes,
      flashMaterials,
      disposeOwnMaterials: () => ownMats.forEach((m) => m.dispose()),
    };
  }

  public dispose() {
    this.shadowTex.dispose();
    this.shadowMat.dispose();
    this.shadowGeo.dispose();
    this.bossShadowGeo.dispose();
    this.bootGeo.dispose();
    this.shinGeo.dispose();
    this.thighGeo.dispose();
    this.pelvisGeo.dispose();
    this.torsoGeo.dispose();
    this.tatteredVestGeo.dispose();
    this.bloodPatchGeo.dispose();
    this.shoulderGeo.dispose();
    this.sleeveGeo.dispose();
    this.rottedArmGeo.dispose();
    this.handGeo.dispose();
    this.neckGeo.dispose();
    this.skullGeo.dispose();
    this.jawGeo.dispose();
    this.teethGeo.dispose();
    this.eyeGeo.dispose();
    this.rifleBodyGeo.dispose();
    this.rifleBarrelGeo.dispose();
    this.pistolGeo.dispose();
    this.flashGeo.dispose();
    this.headBloodGeo.dispose();
    this.botPelvisGeo.dispose();
    this.botCarapaceGeo.dispose();
    this.botHumpGeo.dispose();
    this.botRidgeGeo.dispose();
    this.botSpikeGeo.dispose();
    this.botSnoutGeo.dispose();
    this.botJawGeo.dispose();
    this.botFangGeo.dispose();
    this.botPodGeo.dispose();
    this.botCannonGeo.dispose();
    this.botCoreGeo.dispose();
    this.botThighGeo.dispose();
    this.botShinGeo.dispose();
    this.botFootHubGeo.dispose();
    this.botToeGeo.dispose();
    this.hullGeo.dispose();
    this.glacisGeo.dispose();
    this.trackGeo.dispose();
    this.wheelGeo.dispose();
    this.exhaustGeo.dispose();
    this.turretGeo.dispose();
    this.hatchGeo.dispose();
    this.gunPodGeo.dispose();
    this.gunBarrelGeo.dispose();
    this.gunCollarGeo.dispose();
    this.bossHeadGeo.dispose();
    this.bossJawGeo.dispose();
    this.bossTeethGeo.dispose();
    this.bossEyeGeo.dispose();
    this.bossFlashGeo.dispose();
    this.trCabGeo.dispose();
    this.trRoofCapGeo.dispose();
    this.trVisorGeo.dispose();
    this.trGrilleGeo.dispose();
    this.trBumperGeo.dispose();
    this.trLampGeo.dispose();
    this.trPelvisGeo.dispose();
    this.trLegGeo.dispose();
    this.trFootGeo.dispose();
    this.trShoulderGeo.dispose();
    this.trCannonTubeGeo.dispose();
    this.trBarrelTipGeo.dispose();
    this.kpShellGeo.dispose();
    this.kpRimGeo.dispose();
    this.kpBellyGeo.dispose();
    this.kpHeadGeo.dispose();
    this.kpSnoutGeo.dispose();
    this.kpEyeWhiteGeo.dispose();
    this.kpPupilGeo.dispose();
    this.kpLimbGeo.dispose();
    this.kpFistGeo.dispose();
    this.kpBootGeo.dispose();
    this.kpWingBladeGeo.dispose();
    this.kpWingTipGeo.dispose();
    this.kpBoomA.dispose();
    this.nextbotPlaneGeo.dispose();
    this.nextbotHeadHitGeo.dispose();
    this.nextbotBodyHitGeo.dispose();
    Object.values(this.nextbotTexCache).forEach((t) => t?.dispose());
    this.nextbotTexCache = {};
    this.rbxTorsoGeo.dispose();
    this.rbxLimbGeo.dispose();
    this.rbxHeadGeo.dispose();
    this.rbxHatBrimGeo.dispose();
    this.rbxHatCrownGeo.dispose();
    this.rbxHatBandGeo.dispose();
    this.rbxGlassLensGeo.dispose();
    this.rbxGlassBridgeGeo.dispose();
    this.rbxHairTopGeo.dispose();
    this.rbxHairSideGeo.dispose();
    Object.values(this.rbxTexCache).forEach((t) => t?.dispose());
    this.rbxTexCache = {};
    this.flashMat.dispose();
  }
}
