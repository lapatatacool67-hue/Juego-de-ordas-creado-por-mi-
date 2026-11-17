import * as THREE from 'three';
import {
  createAsphaltPbr,
  createCorrugatedRustPbr,
  createDesertSandPbr,
  createDesertSkyDomeTexture,
  createPixelBrickBlockTex,
  createPixelBushTex,
  createPixelGroundBrickTex,
  createPixelHillTex,
  createPixelPipeTex,
  createPixelQuestionBlockTex,
  createPixelSkyDomeTexture,
  createSandstoneBlockPbr,
  createSkyDomeTexture,
  createUrbanBrickPbr,
  createVoxelCobbleTex,
  createVoxelDirtPathTex,
  createVoxelGrassSideTex,
  createVoxelGrassTopTex,
  createVoxelLeafTex,
  createVoxelLogTex,
  createVoxelPlankTex,
  createVoxelSkyDomeTexture,
  createVoxelWaterTex,
  createWeatheredConcretePbr,
  createBackroomsWallpaperTex,
  createBackroomsCarpetTex,
  createBackroomsCeilingTex,
} from './textures';
import type { BoxCollider } from './types';

export interface AbandonedCityBundle {
  colliders: BoxCollider[];
  obstacles: THREE.Mesh[];
  flickerLight: THREE.PointLight;
  flickerBulbMat: THREE.MeshStandardMaterial;
  fireLights: THREE.PointLight[];
  fireMeshes: THREE.Mesh[];
  dustParticles: THREE.Points;
  dispose: () => void;
}

function addCoronelTent(
  scene: THREE.Scene,
  colliders: BoxCollider[],
  obstacles: THREE.Mesh[],
  fireLights: THREE.PointLight[],
  disposables: Array<{ dispose: () => void }>,
  pos: [number, number, number],
  rotY: number,
  crateMat: THREE.Material
) {
  const tentGroup = new THREE.Group();
  tentGroup.position.set(pos[0], pos[1], pos[2]);
  tentGroup.rotation.y = rotY;

  const tentRedMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.85,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  const tentCreamMat = new THREE.MeshStandardMaterial({
    color: 0xe7dec8,
    roughness: 0.88,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const tentWoodMat = new THREE.MeshStandardMaterial({
    color: 0x4e3622,
    roughness: 0.86,
    metalness: 0.05,
  });
  const tentGoldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.28,
    metalness: 0.84,
  });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.5,
    roughness: 0.25,
  });
  disposables.push(tentRedMat, tentCreamMat, tentWoodMat, tentGoldMat, lanternGlowMat);

  const poleTentGeo = new THREE.CylinderGeometry(0.06, 0.075, 2.6, 10);
  const finialGeo = new THREE.SphereGeometry(0.11, 10, 10);
  const roofWedgeGeo = new THREE.ConeGeometry(2.65, 1.45, 4);
  const wallBackGeo = new THREE.BoxGeometry(3.6, 2.4, 0.14);
  const wallSideGeo = new THREE.BoxGeometry(0.14, 2.4, 3.2);
  const awningStripeGeo = new THREE.BoxGeometry(0.45, 0.36, 0.08);
  const counterGeo = new THREE.BoxGeometry(2.4, 0.92, 0.72);
  const crateAmmoGeo = new THREE.BoxGeometry(0.64, 0.44, 0.48);
  const lanternGeo = new THREE.SphereGeometry(0.14, 10, 10);
  disposables.push(
    poleTentGeo,
    finialGeo,
    roofWedgeGeo,
    wallBackGeo,
    wallSideGeo,
    awningStripeGeo,
    counterGeo,
    crateAmmoGeo,
    lanternGeo
  );

  [
    [-1.7, -1.5],
    [1.7, -1.5],
    [-1.7, 1.5],
    [1.7, 1.5],
  ].forEach(([px, pz]) => {
    const pole = new THREE.Mesh(poleTentGeo, tentWoodMat);
    pole.position.set(px, 1.3, pz);
    pole.castShadow = true;
    tentGroup.add(pole);

    const finial = new THREE.Mesh(finialGeo, tentGoldMat);
    finial.position.set(px, 2.66, pz);
    tentGroup.add(finial);
  });

  const backWall = new THREE.Mesh(wallBackGeo, tentCreamMat);
  backWall.position.set(0, 1.2, -1.52);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  backWall.userData = { surface: 'concrete' };
  obstacles.push(backWall);

  const leftWall = new THREE.Mesh(wallSideGeo, tentRedMat);
  leftWall.position.set(-1.72, 1.2, 0);
  leftWall.castShadow = true;
  const rightWall = new THREE.Mesh(wallSideGeo, tentRedMat);
  rightWall.position.set(1.72, 1.2, 0);
  rightWall.castShadow = true;

  const roof = new THREE.Mesh(roofWedgeGeo, tentRedMat);
  roof.position.set(0, 3.22, 0);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  const peakFinial = new THREE.Mesh(finialGeo, tentGoldMat);
  peakFinial.position.set(0, 4.02, 0);
  peakFinial.scale.setScalar(1.35);

  for (let s = 0; s < 8; s++) {
    const stripe = new THREE.Mesh(
      awningStripeGeo,
      s % 2 === 0 ? tentRedMat : tentCreamMat
    );
    stripe.position.set(-1.575 + s * 0.45, 2.38, 1.58);
    stripe.rotation.x = -0.18;
    tentGroup.add(stripe);
  }

  const counter = new THREE.Mesh(counterGeo, tentWoodMat);
  counter.position.set(0, 0.46, 0.92);
  counter.castShadow = true;
  counter.receiveShadow = true;
  counter.userData = { surface: 'concrete' };
  obstacles.push(counter);

  const crate1 = new THREE.Mesh(crateAmmoGeo, crateMat);
  crate1.position.set(-0.9, 0.22, 0.2);
  crate1.rotation.y = 0.22;
  const crate2 = new THREE.Mesh(crateAmmoGeo, tentGoldMat);
  crate2.position.set(0.75, 1.14, 0.92);
  crate2.scale.setScalar(0.65);

  const lantern = new THREE.Mesh(lanternGeo, lanternGlowMat);
  lantern.position.set(0, 2.25, 0.75);
  const tentLight = new THREE.PointLight(0xffb84d, 2.8, 10, 1.6);
  tentLight.position.set(0, 2.1, 0.85);
  fireLights.push(tentLight);

  tentGroup.add(backWall, leftWall, rightWall, roof, peakFinial, counter, crate1, crate2, lantern, tentLight);
  scene.add(tentGroup);

  colliders.push({
    minX: pos[0] - 2.2,
    maxX: pos[0] + 2.2,
    minZ: pos[2] - 2.1,
    maxZ: pos[2] + 2.1,
    maxY: 3.8,
  });
}

export function createAbandonedCityMap(
  scene: THREE.Scene,
  maxAnisotropy: number
): AbandonedCityBundle {
  const colliders: BoxCollider[] = [];
  const obstacles: THREE.Mesh[] = [];
  const disposables: Array<{ dispose: () => void }> = [];

  const registerPbr = (set: {
    map: THREE.Texture;
    normalMap: THREE.Texture;
    roughnessMap: THREE.Texture;
  }) => {
    disposables.push(set.map, set.normalMap, set.roughnessMap);
    return set;
  };

  // 1. Atmospheric Sky Dome
  const skyTex = createSkyDomeTexture();
  const skyGeo = new THREE.SphereGeometry(220, 32, 20);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    fog: false,
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);
  disposables.push(skyTex, skyGeo, skyMat);

  // 2. Cracked Asphalt Boulevard & Outer Urban Ground
  const asphaltPbr = registerPbr(createAsphaltPbr(22, 34, maxAnisotropy));
  const roadGeo = new THREE.PlaneGeometry(180, 260);
  const roadMat = new THREE.MeshStandardMaterial({
    map: asphaltPbr.map,
    normalMap: asphaltPbr.normalMap,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: asphaltPbr.roughnessMap,
    roughness: 0.95,
    metalness: 0.06,
  });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.rotation.x = -Math.PI / 2;
  roadMesh.receiveShadow = true;
  roadMesh.userData = { surface: 'concrete' };
  obstacles.push(roadMesh);
  scene.add(roadMesh);
  disposables.push(roadGeo, roadMat);

  // Faded Yellow Center Road Lines & Crosswalk Stripes
  const roadPaintMat = new THREE.MeshStandardMaterial({
    color: 0xc29b38,
    roughness: 0.9,
    metalness: 0.02,
    transparent: true,
    opacity: 0.72,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const crosswalkMat = new THREE.MeshStandardMaterial({
    color: 0xc8ccd2,
    roughness: 0.92,
    metalness: 0.02,
    transparent: true,
    opacity: 0.55,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const dashGeo = new THREE.PlaneGeometry(0.22, 2.8);
  const stripeGeo = new THREE.PlaneGeometry(0.65, 3.2);
  disposables.push(roadPaintMat, crosswalkMat, dashGeo, stripeGeo);

  for (let z = 12; z >= -54; z -= 6) {
    const dash = new THREE.Mesh(dashGeo, roadPaintMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.014, z);
    dash.receiveShadow = true;
    scene.add(dash);
  }
  for (let x = -6.5; x <= 6.5; x += 1.6) {
    const stripe = new THREE.Mesh(stripeGeo, crosswalkMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(x, 0.015, -3.5);
    stripe.receiveShadow = true;
    scene.add(stripe);
  }

  // 3. Raised Concrete Sidewalks (Left & Right)
  const concretePbr = registerPbr(createWeatheredConcretePbr(6, 28, maxAnisotropy, 0x82878e));
  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: concretePbr.map,
    normalMap: concretePbr.normalMap,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughnessMap: concretePbr.roughnessMap,
    roughness: 0.92,
    metalness: 0.04,
  });
  disposables.push(sidewalkMat);

  const swGeo = new THREE.BoxGeometry(8, 0.22, 110);
  disposables.push(swGeo);
  [-13.2, 13.2].forEach((xPos) => {
    const sw = new THREE.Mesh(swGeo, sidewalkMat);
    sw.position.set(xPos, 0.11, -22);
    sw.receiveShadow = true;
    sw.castShadow = true;
    sw.userData = { surface: 'concrete' };
    obstacles.push(sw);
    scene.add(sw);
  });

  // 4. Multi-Story Abandoned Buildings flanking the boulevard
  const brickRedPbr = registerPbr(createUrbanBrickPbr(3, 5, maxAnisotropy, 0x6c473e));
  const brickGreyPbr = registerPbr(createUrbanBrickPbr(3, 5, maxAnisotropy, 0x5c6068));
  const wallConcretePbr = registerPbr(createWeatheredConcretePbr(3, 4, maxAnisotropy, 0x74787f));

  const brickRedMat = new THREE.MeshStandardMaterial({
    map: brickRedPbr.map,
    normalMap: brickRedPbr.normalMap,
    roughnessMap: brickRedPbr.roughnessMap,
    roughness: 0.92,
  });
  const brickGreyMat = new THREE.MeshStandardMaterial({
    map: brickGreyPbr.map,
    normalMap: brickGreyPbr.normalMap,
    roughnessMap: brickGreyPbr.roughnessMap,
    roughness: 0.9,
  });
  const wallConcreteMat = new THREE.MeshStandardMaterial({
    map: wallConcretePbr.map,
    normalMap: wallConcretePbr.normalMap,
    roughnessMap: wallConcretePbr.roughnessMap,
    roughness: 0.88,
  });
  const darkInteriorMat = new THREE.MeshStandardMaterial({
    color: 0x0c0e12,
    roughness: 0.95,
    metalness: 0.05,
  });
  const dustyGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x2f3b47,
    roughness: 0.22,
    metalness: 0.15,
    clearcoat: 0.85,
    transparent: true,
    opacity: 0.65,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x22262c,
    roughness: 0.55,
    metalness: 0.78,
  });
  disposables.push(
    brickRedMat,
    brickGreyMat,
    wallConcreteMat,
    darkInteriorMat,
    dustyGlassMat,
    darkMetalMat
  );

  const buildings: Array<{
    x: number;
    z: number;
    w: number;
    d: number;
    stories: number;
    mat: THREE.MeshStandardMaterial;
    faceDir: number; // +1 faces +X (left side), -1 faces -X (right side)
  }> = [
    { x: -23.5, z: -2, w: 13, d: 18, stories: 4, mat: brickRedMat, faceDir: 1 },
    { x: -24.0, z: -23, w: 14, d: 20, stories: 5, mat: wallConcreteMat, faceDir: 1 },
    { x: -23.5, z: -45, w: 13, d: 19, stories: 3, mat: brickGreyMat, faceDir: 1 },
    { x: 23.5, z: -4, w: 13, d: 18, stories: 3, mat: brickGreyMat, faceDir: -1 },
    { x: 24.5, z: -25, w: 15, d: 21, stories: 5, mat: brickRedMat, faceDir: -1 },
    { x: 23.5, z: -46, w: 13, d: 18, stories: 4, mat: wallConcreteMat, faceDir: -1 },
    // Far end blockade building across the street
    { x: 0, z: -68, w: 46, d: 14, stories: 4, mat: wallConcreteMat, faceDir: 0 },
  ];

  const sillGeo = new THREE.BoxGeometry(0.32, 0.16, 1.9);
  const windowBackGeo = new THREE.BoxGeometry(0.14, 2.0, 1.5);
  const glassPaneGeo = new THREE.PlaneGeometry(1.48, 1.95);
  const acUnitGeo = new THREE.BoxGeometry(0.65, 0.52, 0.85);
  disposables.push(sillGeo, windowBackGeo, glassPaneGeo, acUnitGeo);

  buildings.forEach((b) => {
    const h = b.stories * 3.8 + 1.2;
    const bGroup = new THREE.Group();
    bGroup.position.set(b.x, 0, b.z);

    const bodyGeo = new THREE.BoxGeometry(b.w, h, b.d);
    const body = new THREE.Mesh(bodyGeo, b.mat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    body.userData = { surface: 'concrete' };
    obstacles.push(body);
    bGroup.add(body);
    disposables.push(bodyGeo);

    // Roof cornice parapet
    const parapetGeo = new THREE.BoxGeometry(b.w + 0.5, 0.55, b.d + 0.5);
    const parapet = new THREE.Mesh(parapetGeo, wallConcreteMat);
    parapet.position.y = h + 0.2;
    parapet.castShadow = true;
    parapet.receiveShadow = true;
    bGroup.add(parapet);
    disposables.push(parapetGeo);

    // Rooftop HVAC unit
    const hvacGeo = new THREE.BoxGeometry(2.6, 1.4, 2.2);
    const hvac = new THREE.Mesh(hvacGeo, darkMetalMat);
    hvac.position.set(0, h + 1.1, 0);
    hvac.castShadow = true;
    bGroup.add(hvac);
    disposables.push(hvacGeo);

    // Street-facing windows, sills & weathered AC units
    if (b.faceDir !== 0) {
      const wallX = b.faceDir * (b.w / 2);
      const cols = Math.floor(b.d / 4.2);
      for (let s = 1; s < b.stories; s++) {
        const wy = s * 3.8 + 0.3;
        for (let c = 0; c < cols; c++) {
          const wz = -b.d / 2 + 2.6 + c * 4.0;
          const recess = new THREE.Mesh(windowBackGeo, darkInteriorMat);
          recess.position.set(wallX + b.faceDir * 0.02, wy, wz);
          bGroup.add(recess);

          // Some windows intact dusty glass, some shattered/missing
          if ((s + c) % 3 !== 0) {
            const pane = new THREE.Mesh(glassPaneGeo, dustyGlassMat);
            pane.rotation.y = b.faceDir > 0 ? Math.PI / 2 : -Math.PI / 2;
            pane.position.set(wallX + b.faceDir * 0.095, wy, wz);
            bGroup.add(pane);
          }

          const sill = new THREE.Mesh(sillGeo, wallConcreteMat);
          sill.position.set(wallX + b.faceDir * 0.14, wy - 1.05, wz);
          bGroup.add(sill);

          if ((s * 3 + c) % 5 === 0) {
            const ac = new THREE.Mesh(acUnitGeo, darkMetalMat);
            ac.position.set(wallX + b.faceDir * 0.34, wy - 0.72, wz + 0.55);
            ac.castShadow = true;
            bGroup.add(ac);
          }
        }
      }
    }

    scene.add(bGroup);

    colliders.push({
      minX: b.x - b.w / 2,
      maxX: b.x + b.w / 2,
      minZ: b.z - b.d / 2,
      maxZ: b.z + b.d / 2,
      maxY: h,
    });
  });

  // Distant urban skyline silhouettes + elevated highway viaduct + radio tower + rooftop props
  const skylinePositions: Array<[number, number, number, number, number]> = [
    [-46, -55, 16, 28, 16],
    [-48, -18, 18, 22, 18],
    [46, -52, 16, 32, 16],
    [48, -15, 18, 24, 18],
    [-34, -92, 22, 38, 18],
    [32, -96, 24, 44, 18],
    [0, -104, 22, 52, 18],
    [-64, -84, 24, 30, 22],
    [64, -86, 26, 35, 22],
  ];
  skylinePositions.forEach(([x, z, w, h, d]) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, wallConcreteMat);
    mesh.position.set(x, h / 2, z);
    scene.add(mesh);
    disposables.push(geo);
  });

  // Elevated Concrete Highway Viaduct spanning the background horizon
  const viaductDeckGeo = new THREE.BoxGeometry(118, 1.4, 7.5);
  const viaductRailGeo = new THREE.BoxGeometry(118, 0.85, 0.35);
  const viaductPierGeo = new THREE.BoxGeometry(2.6, 12.5, 4.2);
  disposables.push(viaductDeckGeo, viaductRailGeo, viaductPierGeo);

  const viaductDeck = new THREE.Mesh(viaductDeckGeo, wallConcreteMat);
  viaductDeck.position.set(0, 12.2, -82);
  const viaductRailF = new THREE.Mesh(viaductRailGeo, sidewalkMat);
  viaductRailF.position.set(0, 13.2, -78.4);
  const viaductRailB = new THREE.Mesh(viaductRailGeo, sidewalkMat);
  viaductRailB.position.set(0, 13.2, -85.6);
  scene.add(viaductDeck, viaductRailF, viaductRailB);

  [-44, -22, 0, 22, 44].forEach((px) => {
    const pier = new THREE.Mesh(viaductPierGeo, sidewalkMat);
    pier.position.set(px, 6.0, -82);
    scene.add(pier);
  });

  // Tall Lattice Radio Communications Tower with Red Aviation Beacon
  const radioTowerMat = new THREE.MeshStandardMaterial({
    color: 0x3b424d,
    roughness: 0.45,
    metalness: 0.82,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xff2a2a,
    emissive: 0xef4444,
    emissiveIntensity: 3.6,
    roughness: 0.15,
  });
  const towerBaseGeo = new THREE.CylinderGeometry(0.45, 2.2, 34, 4);
  const towerMastGeo = new THREE.CylinderGeometry(0.08, 0.25, 14, 6);
  const towerBeaconGeo = new THREE.SphereGeometry(0.45, 10, 10);
  disposables.push(radioTowerMat, beaconMat, towerBaseGeo, towerMastGeo, towerBeaconGeo);

  const towerBase = new THREE.Mesh(towerBaseGeo, radioTowerMat);
  towerBase.position.set(-34, 17, -76);
  towerBase.rotation.y = Math.PI / 4;
  const towerMast = new THREE.Mesh(towerMastGeo, radioTowerMat);
  towerMast.position.set(-34, 41, -76);
  const towerBeacon = new THREE.Mesh(towerBeaconGeo, beaconMat);
  towerBeacon.position.set(-34, 48.2, -76);
  scene.add(towerBase, towerMast, towerBeacon);

  // Rooftop Water Towers & Billboard Frame above flanking buildings
  const waterTankMat = new THREE.MeshStandardMaterial({
    color: 0x5d4633,
    roughness: 0.88,
    metalness: 0.1,
  });
  const tankGeo = new THREE.CylinderGeometry(1.75, 1.75, 3.1, 12);
  const tankRoofGeo = new THREE.ConeGeometry(1.9, 1.1, 12);
  const tankLegGeo = new THREE.CylinderGeometry(0.12, 0.14, 2.2, 6);
  disposables.push(waterTankMat, tankGeo, tankRoofGeo, tankLegGeo);

  [
    { x: -23.5, y: 16.9, z: -4 },
    { x: 24.5, y: 20.7, z: -27 },
  ].forEach((wt) => {
    const wtGroup = new THREE.Group();
    wtGroup.position.set(wt.x, wt.y, wt.z);
    [
      [-0.95, -0.95],
      [0.95, -0.95],
      [-0.95, 0.95],
      [0.95, 0.95],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(tankLegGeo, darkMetalMat);
      leg.position.set(lx, 1.1, lz);
      wtGroup.add(leg);
    });
    const tank = new THREE.Mesh(tankGeo, waterTankMat);
    tank.position.y = 3.55;
    const tRoof = new THREE.Mesh(tankRoofGeo, darkMetalMat);
    tRoof.position.y = 5.65;
    wtGroup.add(tank, tRoof);
    scene.add(wtGroup);
  });

  // Glowing Weathered Storefront Signs along ground facades + Rooftop Billboard
  const signAmberMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 1.8,
    roughness: 0.3,
  });
  const signCyanMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.5,
    roughness: 0.3,
  });
  const signBoxGeo = new THREE.BoxGeometry(0.32, 0.95, 4.4);
  const billboardGeo = new THREE.BoxGeometry(0.35, 3.8, 9.6);
  const billboardPostGeo = new THREE.CylinderGeometry(0.16, 0.18, 2.6, 8);
  disposables.push(signAmberMat, signCyanMat, signBoxGeo, billboardGeo, billboardPostGeo);

  const sign1 = new THREE.Mesh(signBoxGeo, signAmberMat);
  sign1.position.set(-16.9, 3.4, -18);
  const sign2 = new THREE.Mesh(signBoxGeo, signCyanMat);
  sign2.position.set(16.9, 3.4, -10);
  const sign3 = new THREE.Mesh(signBoxGeo, signAmberMat);
  sign3.position.set(16.9, 3.4, -38);
  scene.add(sign1, sign2, sign3);

  const bPost1 = new THREE.Mesh(billboardPostGeo, darkMetalMat);
  bPost1.position.set(17.8, 13.9, -43);
  const bPost2 = new THREE.Mesh(billboardPostGeo, darkMetalMat);
  bPost2.position.set(17.8, 13.9, -49);
  const billboard = new THREE.Mesh(billboardGeo, brickGreyMat);
  billboard.position.set(17.8, 16.4, -46);
  scene.add(bPost1, bPost2, billboard);

  // Bare / Autumn Urban Street Trees flanking the sidewalks
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2f24, roughness: 0.94 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x6b5b3b, roughness: 0.92 });
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 3.6, 8);
  const canopyGeo = new THREE.DodecahedronGeometry(1.55, 1);
  disposables.push(trunkMat, canopyMat, trunkGeo, canopyGeo);

  [
    [-10.4, -11],
    [-10.4, -33],
    [10.4, -8],
    [10.4, -29],
    [10.4, -44],
  ].forEach(([tx, tz]) => {
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(tx, 2.0, tz);
    trunk.castShadow = true;
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(tx, 4.3, tz);
    canopy.scale.set(1.1, 0.9, 1.1);
    canopy.castShadow = true;
    scene.add(trunk, canopy);
  });

  // 5. Derelict Abandoned Cars (Composite 10-part vehicles as tactical street cover)
  const carPaintRust = registerPbr(createCorrugatedRustPbr(2, 2, maxAnisotropy, 0x4c5a64));
  const carBodyMatA = new THREE.MeshStandardMaterial({
    map: carPaintRust.map,
    normalMap: carPaintRust.normalMap,
    roughnessMap: carPaintRust.roughnessMap,
    roughness: 0.72,
    metalness: 0.45,
  });
  const carPaintRustB = registerPbr(createCorrugatedRustPbr(2, 2, maxAnisotropy, 0x6e473b));
  const carBodyMatB = new THREE.MeshStandardMaterial({
    map: carPaintRustB.map,
    normalMap: carPaintRustB.normalMap,
    roughnessMap: carPaintRustB.roughnessMap,
    roughness: 0.74,
    metalness: 0.42,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x16181c,
    roughness: 0.94,
    metalness: 0.04,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x6b7280,
    roughness: 0.35,
    metalness: 0.82,
  });
  disposables.push(carBodyMatA, carBodyMatB, tireMat, rimMat);

  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.25, 10);
  rimGeo.rotateZ(Math.PI / 2);
  disposables.push(wheelGeo, rimGeo);

  const carSpecs = [
    { x: -5.4, z: -10.2, rotY: 0.32, mat: carBodyMatA },
    { x: 5.0, z: -22.8, rotY: -0.45, mat: carBodyMatB },
    { x: -4.2, z: -30.5, rotY: 0.18, mat: carBodyMatA },
  ];

  carSpecs.forEach((car) => {
    const group = new THREE.Group();
    group.position.set(car.x, 0, car.z);
    group.rotation.y = car.rotY;

    const chassisGeo = new THREE.BoxGeometry(1.9, 0.56, 4.3);
    const chassis = new THREE.Mesh(chassisGeo, car.mat);
    chassis.position.y = 0.56;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    chassis.userData = { surface: 'metal' };
    obstacles.push(chassis);

    const cabinGeo = new THREE.BoxGeometry(1.66, 0.54, 2.15);
    const cabin = new THREE.Mesh(cabinGeo, car.mat);
    cabin.position.set(0, 1.08, -0.15);
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    cabin.userData = { surface: 'metal' };
    obstacles.push(cabin);

    const windshieldGeo = new THREE.BoxGeometry(1.52, 0.44, 2.18);
    const windshield = new THREE.Mesh(windshieldGeo, dustyGlassMat);
    windshield.position.set(0, 1.07, -0.15);

    const bumperGeo = new THREE.BoxGeometry(1.94, 0.2, 0.22);
    const frontBumper = new THREE.Mesh(bumperGeo, darkMetalMat);
    frontBumper.position.set(0, 0.36, 2.16);
    const rearBumper = new THREE.Mesh(bumperGeo, darkMetalMat);
    rearBumper.position.set(0, 0.36, -2.16);

    group.add(chassis, cabin, windshield, frontBumper, rearBumper);
    disposables.push(chassisGeo, cabinGeo, windshieldGeo, bumperGeo);

    const wheelCoords: Array<[number, number]> = [
      [-0.92, 1.32],
      [0.92, 1.32],
      [-0.92, -1.32],
      [0.92, -1.32],
    ];
    wheelCoords.forEach(([wx, wz]) => {
      const tire = new THREE.Mesh(wheelGeo, tireMat);
      tire.position.set(wx, 0.36, wz);
      tire.castShadow = true;
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.position.set(wx, 0.36, wz);
      group.add(tire, rim);
    });

    scene.add(group);

    colliders.push({
      minX: car.x - 1.35,
      maxX: car.x + 1.35,
      minZ: car.z - 2.25,
      maxZ: car.z + 2.25,
      maxY: 1.4,
    });
  });

  // 6. Rusted Shipping Containers
  const containerPbr = registerPbr(createCorrugatedRustPbr(4, 2, maxAnisotropy, 0x2d4a57));
  const containerMat = new THREE.MeshStandardMaterial({
    map: containerPbr.map,
    normalMap: containerPbr.normalMap,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughnessMap: containerPbr.roughnessMap,
    roughness: 0.78,
    metalness: 0.55,
  });
  disposables.push(containerMat);

  const containerSpecs = [
    { x: 6.2, z: -11.5, w: 2.5, h: 2.6, d: 5.8 },
    { x: -11.5, z: -17.5, w: 2.5, h: 2.6, d: 5.8 },
  ];
  containerSpecs.forEach((c) => {
    const geo = new THREE.BoxGeometry(c.w, c.h, c.d);
    const mesh = new THREE.Mesh(geo, containerMat);
    mesh.position.set(c.x, c.h / 2, c.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { surface: 'metal' };
    obstacles.push(mesh);
    scene.add(mesh);
    disposables.push(geo);

    colliders.push({
      minX: c.x - c.w / 2,
      maxX: c.x + c.w / 2,
      minZ: c.z - c.d / 2,
      maxZ: c.z + c.d / 2,
      maxY: c.h,
    });
  });

  // 7. Concrete Jersey Barriers
  const barrierGeo = new THREE.BoxGeometry(2.6, 1.05, 0.75);
  disposables.push(barrierGeo);
  const barrierPositions: Array<[number, number, number]> = [
    [-1.4, -18.5, 0.1],
    [1.4, -18.5, -0.08],
    [0.0, -7.2, 0],
    [-4.5, -27.0, 0.25],
    [4.2, -31.5, -0.2],
  ];
  barrierPositions.forEach(([x, z, rotY]) => {
    const mesh = new THREE.Mesh(barrierGeo, sidewalkMat);
    mesh.position.set(x, 0.525, z);
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { surface: 'concrete' };
    obstacles.push(mesh);
    scene.add(mesh);

    colliders.push({
      minX: x - 1.35,
      maxX: x + 1.35,
      minZ: z - 0.5,
      maxZ: z + 0.5,
      maxY: 1.05,
    });
  });

  // 8. Streetlights + Overhead Power Cables + One Flickering Emergency Lamp
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 6.2, 10);
  const armGeo = new THREE.BoxGeometry(1.8, 0.1, 0.1);
  const lampHeadGeo = new THREE.BoxGeometry(0.65, 0.14, 0.34);
  const bulbGeo = new THREE.PlaneGeometry(0.5, 0.24);
  const deadBulbMat = new THREE.MeshStandardMaterial({ color: 0x3b4048, roughness: 0.3 });
  const flickerBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffb347,
    emissive: 0xff9f1c,
    emissiveIntensity: 1.6,
    roughness: 0.25,
  });
  disposables.push(poleGeo, armGeo, lampHeadGeo, bulbGeo, deadBulbMat, flickerBulbMat);

  const flickerLight = new THREE.PointLight(0xff9f2e, 2.6, 20, 1.8);

  const streetLamps = [
    { x: -9.4, z: -6, side: 1, active: false },
    { x: 9.4, z: -15, side: -1, active: true },
    { x: -9.4, z: -26, side: 1, active: false },
    { x: 9.4, z: -36, side: -1, active: false },
  ];

  streetLamps.forEach((l) => {
    const group = new THREE.Group();
    group.position.set(l.x, 0.22, l.z);

    const pole = new THREE.Mesh(poleGeo, darkMetalMat);
    pole.position.y = 3.1;
    pole.castShadow = true;
    const arm = new THREE.Mesh(armGeo, darkMetalMat);
    arm.position.set(l.side * 0.85, 6.1, 0);
    const head = new THREE.Mesh(lampHeadGeo, darkMetalMat);
    head.position.set(l.side * 1.65, 6.02, 0);
    const bulb = new THREE.Mesh(bulbGeo, l.active ? flickerBulbMat : deadBulbMat);
    bulb.rotation.x = Math.PI / 2;
    bulb.position.set(l.side * 1.65, 5.94, 0);

    group.add(pole, arm, head, bulb);
    scene.add(group);

    if (l.active) {
      flickerLight.position.set(l.x + l.side * 1.65, 5.7, l.z);
      scene.add(flickerLight);
    }
  });

  // Sagging overhead power lines across the street
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x181a1e, roughness: 0.8 });
  disposables.push(cableMat);
  [-10, -24, -38].forEach((cz) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-17, 7.6, cz),
      new THREE.Vector3(0, 6.2, cz + 0.6),
      new THREE.Vector3(17, 7.6, cz),
    ]);
    const cableGeo = new THREE.TubeGeometry(curve, 18, 0.028, 6, false);
    const cable = new THREE.Mesh(cableGeo, cableMat);
    scene.add(cable);
    disposables.push(cableGeo);
  });

  // 9. Overgrown Dry Weeds & Grass Tufts pushing through cracks (InstancedMesh)
  const weedGeo = new THREE.ConeGeometry(0.18, 0.48, 5);
  weedGeo.translate(0, 0.24, 0);
  const weedMat = new THREE.MeshStandardMaterial({
    color: 0x5c6340,
    roughness: 0.92,
    metalness: 0.02,
  });
  disposables.push(weedGeo, weedMat);

  const weedCount = 75;
  const weedInstanced = new THREE.InstancedMesh(weedGeo, weedMat, weedCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < weedCount; i++) {
    const onLeft = i % 2 === 0;
    const wx = (onLeft ? -1 : 1) * (8.9 + Math.random() * 4.5);
    const wz = 10 - Math.random() * 62;
    dummy.position.set(wx, 0.21, wz);
    dummy.rotation.set((Math.random() - 0.5) * 0.25, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.25);
    dummy.scale.setScalar(0.75 + Math.random() * 0.75);
    dummy.updateMatrix();
    weedInstanced.setMatrixAt(i, dummy.matrix);
    weedInstanced.setColorAt(
      i,
      new THREE.Color().setHSL(0.2 + Math.random() * 0.05, 0.25, 0.26 + Math.random() * 0.14)
    );
  }
  weedInstanced.instanceMatrix.needsUpdate = true;
  if (weedInstanced.instanceColor) weedInstanced.instanceColor.needsUpdate = true;
  weedInstanced.computeBoundingSphere();
  scene.add(weedInstanced);

  // 10. Drifting Atmospheric Dust & Ash Motes
  const dustCount = 280;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 34;
    dustPos[i * 3 + 1] = 0.4 + Math.random() * 7.5;
    dustPos[i * 3 + 2] = 10 - Math.random() * 62;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xfde6c4,
    size: 0.062,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  const dustParticles = new THREE.Points(dustGeo, dustMat);
  scene.add(dustParticles);
  disposables.push(dustGeo, dustMat);

  // 11. Burning Hazard Oil Drums & Emergency Road Flares (Dramatic Rim Glow)
  const fireLights: THREE.PointLight[] = [];
  const fireMeshes: THREE.Mesh[] = [];

  const drumGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.05, 14);
  const drumMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d12,
    roughness: 0.65,
    metalness: 0.58,
  });
  const flameGeo = new THREE.ConeGeometry(0.28, 0.65, 8);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xff7b1c,
    transparent: true,
    opacity: 0.92,
  });
  const flareGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.24, 8);
  flareGeo.rotateZ(Math.PI / 2);
  const flareMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xff2a2a,
    emissiveIntensity: 1.8,
    roughness: 0.35,
  });
  disposables.push(drumGeo, drumMat, flameGeo, flameMat, flareGeo, flareMat);

  const drumPositions: Array<[number, number, number]> = [
    [8.2, 0, -4.5],
    [-8.1, 0, -19.2],
    [8.1, 0, -34.0],
  ];
  drumPositions.forEach(([dx, dy, dz]) => {
    const drum = new THREE.Mesh(drumGeo, drumMat);
    drum.position.set(dx, dy + 0.525, dz);
    drum.castShadow = true;
    drum.receiveShadow = true;
    drum.userData = { surface: 'metal' };
    obstacles.push(drum);
    scene.add(drum);

    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(dx, dy + 1.25, dz);
    scene.add(flame);
    fireMeshes.push(flame);

    const light = new THREE.PointLight(0xff6b1a, 3.0, 12, 1.7);
    light.position.set(dx, dy + 1.55, dz);
    scene.add(light);
    fireLights.push(light);

    colliders.push({
      minX: dx - 0.5,
      maxX: dx + 0.5,
      minZ: dz - 0.5,
      maxZ: dz + 0.5,
      maxY: 1.15,
    });
  });

  const flareSpots: Array<[number, number]> = [
    [-2.1, -6.5],
    [2.6, -17.6],
    [-3.1, -26.2],
  ];
  flareSpots.forEach(([fx, fz]) => {
    const flare = new THREE.Mesh(flareGeo, flareMat);
    flare.position.set(fx, 0.04, fz);
    flare.rotation.y = fx;
    scene.add(flare);

    const fLight = new THREE.PointLight(0xff2e2e, 2.8, 7.5, 1.8);
    fLight.position.set(fx, 0.28, fz);
    scene.add(fLight);
    fireLights.push(fLight);
  });

  // 12. La Carpa del Capitán Coronel (Command Armory Tent on Left Sidewalk Plaza)
  addCoronelTent(
    scene,
    colliders,
    obstacles,
    fireLights,
    disposables,
    [-12.6, 0.22, 5.2],
    0.52,
    drumMat
  );

  return {
    colliders,
    obstacles,
    flickerLight,
    flickerBulbMat,
    fireLights,
    fireMeshes,
    dustParticles,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

export function createDesertArsanalMap(
  scene: THREE.Scene,
  maxAnisotropy: number
): AbandonedCityBundle {
  const colliders: BoxCollider[] = [];
  const obstacles: THREE.Mesh[] = [];
  const disposables: Array<{ dispose: () => void }> = [];

  const registerPbr = (set: {
    map: THREE.Texture;
    normalMap: THREE.Texture;
    roughnessMap: THREE.Texture;
  }) => {
    disposables.push(set.map, set.normalMap, set.roughnessMap);
    return set;
  };

  // 1. Warm Sunlit Desert Sky Dome
  const skyTex = createDesertSkyDomeTexture();
  const skyGeo = new THREE.SphereGeometry(240, 32, 20);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    fog: false,
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);
  disposables.push(skyTex, skyGeo, skyMat);

  // 2. Vast Desert Sand Floor
  const sandPbr = registerPbr(createDesertSandPbr(28, 34, maxAnisotropy));
  const groundGeo = new THREE.PlaneGeometry(320, 360);
  const groundMat = new THREE.MeshStandardMaterial({
    map: sandPbr.map,
    normalMap: sandPbr.normalMap,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: sandPbr.roughnessMap,
    roughness: 0.95,
    metalness: 0.02,
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  groundMesh.userData = { surface: 'concrete' };
  obstacles.push(groundMesh);
  scene.add(groundMesh);
  disposables.push(groundGeo, groundMat);

  // Sandstone block PBR material for pyramids, obelisks, ruins & arches
  const sandstonePbr = registerPbr(createSandstoneBlockPbr(8, 8, maxAnisotropy, 0xc79e65));
  const sandstoneMat = new THREE.MeshStandardMaterial({
    map: sandstonePbr.map,
    normalMap: sandstonePbr.normalMap,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: sandstonePbr.roughnessMap,
    roughness: 0.9,
    metalness: 0.04,
  });
  const darkSandstoneMat = new THREE.MeshStandardMaterial({
    map: sandstonePbr.map,
    normalMap: sandstonePbr.normalMap,
    color: 0xa47b45,
    roughness: 0.92,
    metalness: 0.04,
  });
  const sandbagMat = new THREE.MeshStandardMaterial({
    color: 0xb69b74,
    roughness: 0.95,
    metalness: 0.02,
  });
  const desertCargoPbr = registerPbr(createCorrugatedRustPbr(3, 2, maxAnisotropy, 0x9b7e50));
  const desertCargoMat = new THREE.MeshStandardMaterial({
    map: desertCargoPbr.map,
    normalMap: desertCargoPbr.normalMap,
    roughnessMap: desertCargoPbr.roughnessMap,
    roughness: 0.78,
    metalness: 0.45,
  });
  const oliveCargoPbr = registerPbr(createCorrugatedRustPbr(3, 2, maxAnisotropy, 0x4b563c));
  const oliveCargoMat = new THREE.MeshStandardMaterial({
    map: oliveCargoPbr.map,
    normalMap: oliveCargoPbr.normalMap,
    roughnessMap: oliveCargoPbr.roughnessMap,
    roughness: 0.76,
    metalness: 0.48,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x262930,
    roughness: 0.5,
    metalness: 0.8,
  });
  const solarCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 2.4,
    roughness: 0.15,
    metalness: 0.35,
  });
  disposables.push(
    sandstoneMat,
    darkSandstoneMat,
    sandbagMat,
    desertCargoMat,
    oliveCargoMat,
    darkMetalMat,
    solarCrystalMat
  );

  // 3. Monumental Background Pyramids & Distant Sandstone Mesas
  const pyramids: Array<{ x: number; z: number; radius: number; height: number; ry: number }> = [
    { x: 0, z: -116, radius: 38, height: 40, ry: Math.PI / 4 },
    { x: -64, z: -126, radius: 30, height: 32, ry: Math.PI / 4 + 0.12 },
    { x: 68, z: -120, radius: 32, height: 34, ry: Math.PI / 4 - 0.1 },
    { x: -32, z: -92, radius: 13, height: 14, ry: Math.PI / 4 },
    { x: 34, z: -94, radius: 11, height: 12, ry: Math.PI / 4 },
  ];

  pyramids.forEach((p) => {
    const pyrGeo = new THREE.ConeGeometry(p.radius, p.height, 4);
    const pyr = new THREE.Mesh(pyrGeo, sandstoneMat);
    pyr.position.set(p.x, p.height / 2 - 0.4, p.z);
    pyr.rotation.y = p.ry;
    pyr.receiveShadow = true;
    scene.add(pyr);
    disposables.push(pyrGeo);

    // Golden capstone on the largest central pyramid
    if (p.height >= 32) {
      const capMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.25,
        metalness: 0.85,
      });
      const capGeo = new THREE.ConeGeometry(p.radius * 0.14, p.height * 0.14, 4);
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(p.x, p.height * 0.93 - 0.4, p.z);
      cap.rotation.y = p.ry;
      scene.add(cap);
      disposables.push(capGeo, capMat);
    }
  });

  // Distant Desert Sandstone Mesas flanking left/right horizon
  [
    [-68, -45, 22, 16, 54],
    [68, -48, 22, 18, 56],
    [-75, 10, 20, 12, 42],
    [75, 8, 20, 14, 44],
  ].forEach(([mx, mz, mw, mh, md]) => {
    const mesaGeo = new THREE.BoxGeometry(mw, mh, md);
    const mesa = new THREE.Mesh(mesaGeo, darkSandstoneMat);
    mesa.position.set(mx, mh / 2 - 0.5, mz);
    scene.add(mesa);
    disposables.push(mesaGeo);
  });

  // 4. Desert Ruins Perimeter Walls & Ancient Sandstone Arches framing the Arsenal Arena
  const sideWallGeo = new THREE.BoxGeometry(2.4, 4.2, 82);
  disposables.push(sideWallGeo);
  [-22.5, 22.5].forEach((wx) => {
    const wall = new THREE.Mesh(sideWallGeo, darkSandstoneMat);
    wall.position.set(wx, 2.1, -24);
    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.userData = { surface: 'concrete' };
    obstacles.push(wall);
    scene.add(wall);

    colliders.push({
      minX: wx - 1.2,
      maxX: wx + 1.2,
      minZ: -65,
      maxZ: 17,
      maxY: 4.2,
    });
  });

  // Ancient Sandstone Temple Gate / Archway at the far north edge (z = -64)
  const gatePillarGeo = new THREE.BoxGeometry(3.2, 7.6, 3.2);
  const gateLintelGeo = new THREE.BoxGeometry(19.5, 2.0, 3.4);
  disposables.push(gatePillarGeo, gateLintelGeo);
  [-7.8, 7.8].forEach((gx) => {
    const gp = new THREE.Mesh(gatePillarGeo, sandstoneMat);
    gp.position.set(gx, 3.8, -64);
    gp.castShadow = true;
    gp.receiveShadow = true;
    gp.userData = { surface: 'concrete' };
    obstacles.push(gp);
    scene.add(gp);
    colliders.push({
      minX: gx - 1.6,
      maxX: gx + 1.6,
      minZ: -65.6,
      maxZ: -62.4,
      maxY: 7.6,
    });
  });
  const lintel = new THREE.Mesh(gateLintelGeo, darkSandstoneMat);
  lintel.position.set(0, 8.6, -64);
  lintel.castShadow = true;
  lintel.receiveShadow = true;
  scene.add(lintel);

  // Mid-arena Sandstone Colonnade Pillars & Obelisks (Tactical Cover)
  const colGeo = new THREE.BoxGeometry(1.5, 4.8, 1.5);
  const plinthGeo = new THREE.BoxGeometry(2.1, 0.7, 2.1);
  const obeliskShaftGeo = new THREE.CylinderGeometry(0.45, 0.85, 4.4, 4);
  const crystalGeo = new THREE.OctahedronGeometry(0.42, 0);
  disposables.push(colGeo, plinthGeo, obeliskShaftGeo, crystalGeo);

  const ruinColumns: Array<[number, number, boolean]> = [
    [-9.5, -16, false],
    [9.5, -16, false],
    [-11.0, -34, true],
    [11.0, -34, true],
    [-6.2, -46, false],
    [6.2, -46, false],
  ];

  ruinColumns.forEach(([cx, cz, hasCrystal]) => {
    const plinth = new THREE.Mesh(plinthGeo, darkSandstoneMat);
    plinth.position.set(cx, 0.35, cz);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    plinth.userData = { surface: 'concrete' };
    obstacles.push(plinth);
    scene.add(plinth);

    if (hasCrystal) {
      const obelisk = new THREE.Mesh(obeliskShaftGeo, sandstoneMat);
      obelisk.position.set(cx, 2.8, cz);
      obelisk.rotation.y = Math.PI / 4;
      obelisk.castShadow = true;
      obelisk.receiveShadow = true;
      obelisk.userData = { surface: 'concrete' };
      obstacles.push(obelisk);
      scene.add(obelisk);

      const crystal = new THREE.Mesh(crystalGeo, solarCrystalMat);
      crystal.position.set(cx, 5.5, cz);
      scene.add(crystal);
    } else {
      const col = new THREE.Mesh(colGeo, sandstoneMat);
      col.position.set(cx, 2.7, cz);
      col.castShadow = true;
      col.receiveShadow = true;
      col.userData = { surface: 'concrete' };
      obstacles.push(col);
      scene.add(col);
    }

    colliders.push({
      minX: cx - 1.05,
      maxX: cx + 1.05,
      minZ: cz - 1.05,
      maxZ: cz + 1.05,
      maxY: 5.0,
    });
  });

  // 5. Desert Military Arsenal Shipping Containers & Sandbag Bunkers
  const containerSpecs = [
    { x: -6.8, z: -11.5, w: 2.5, h: 2.6, d: 5.8, mat: desertCargoMat },
    { x: 7.4, z: -23.0, w: 2.5, h: 2.6, d: 5.8, mat: oliveCargoMat },
    { x: -13.5, z: -26.0, w: 5.4, h: 2.6, d: 2.5, mat: desertCargoMat },
  ];
  containerSpecs.forEach((c) => {
    const geo = new THREE.BoxGeometry(c.w, c.h, c.d);
    const mesh = new THREE.Mesh(geo, c.mat);
    mesh.position.set(c.x, c.h / 2, c.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { surface: 'metal' };
    obstacles.push(mesh);
    scene.add(mesh);
    disposables.push(geo);

    colliders.push({
      minX: c.x - c.w / 2,
      maxX: c.x + c.w / 2,
      minZ: c.z - c.d / 2,
      maxZ: c.z + c.d / 2,
      maxY: c.h,
    });
  });

  // Sandbag Defensive Cover Walls
  const sandbagWallGeo = new THREE.BoxGeometry(3.0, 1.05, 0.85);
  disposables.push(sandbagWallGeo);
  const sandbagPositions: Array<[number, number, number]> = [
    [0, -6.5, 0],
    [-4.2, -21.5, 0.22],
    [4.2, -31.5, -0.22],
    [0, -40.0, 0],
  ];
  sandbagPositions.forEach(([sx, sz, rotY]) => {
    const sb = new THREE.Mesh(sandbagWallGeo, sandbagMat);
    sb.position.set(sx, 0.525, sz);
    sb.rotation.y = rotY;
    sb.castShadow = true;
    sb.receiveShadow = true;
    sb.userData = { surface: 'concrete' };
    obstacles.push(sb);
    scene.add(sb);

    colliders.push({
      minX: sx - 1.55,
      maxX: sx + 1.55,
      minZ: sz - 0.55,
      maxZ: sz + 0.55,
      maxY: 1.05,
    });
  });

  // 6. Desert Date Palms & Dry Scrub
  const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4f35, roughness: 0.94 });
  const palmLeafMat = new THREE.MeshStandardMaterial({
    color: 0x4d6b34,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  const palmTrunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 5.4, 8);
  const palmFrondGeo = new THREE.ConeGeometry(0.48, 2.6, 5);
  palmFrondGeo.rotateX(Math.PI / 2);
  disposables.push(palmTrunkMat, palmLeafMat, palmTrunkGeo, palmFrondGeo);

  [
    [-18.0, -4],
    [18.0, -7],
    [-18.5, -39],
    [18.2, -41],
    [-15.5, -56],
    [15.5, -56],
  ].forEach(([px, pz]) => {
    const palmGroup = new THREE.Group();
    palmGroup.position.set(px, 0, pz);
    const trunk = new THREE.Mesh(palmTrunkGeo, palmTrunkMat);
    trunk.position.y = 2.7;
    trunk.rotation.z = px < 0 ? -0.08 : 0.08;
    trunk.castShadow = true;
    palmGroup.add(trunk);

    for (let f = 0; f < 6; f++) {
      const frond = new THREE.Mesh(palmFrondGeo, palmLeafMat);
      const ang = (f / 6) * Math.PI * 2;
      frond.position.set(Math.sin(ang) * 1.15, 5.3, Math.cos(ang) * 1.15);
      frond.rotation.y = ang;
      frond.rotation.x = 0.42;
      frond.castShadow = true;
      palmGroup.add(frond);
    }
    scene.add(palmGroup);
  });

  // 7. Burning Desert Fire Braziers & Flickering Warm Lights
  const fireLights: THREE.PointLight[] = [];
  const fireMeshes: THREE.Mesh[] = [];

  const brazierGeo = new THREE.CylinderGeometry(0.56, 0.38, 1.0, 8);
  const flameGeo = new THREE.ConeGeometry(0.32, 0.78, 8);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xff8c1a,
    transparent: true,
    opacity: 0.92,
  });
  const flickerBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffb347,
    emissive: 0xff9f1c,
    emissiveIntensity: 1.5,
    roughness: 0.25,
  });
  disposables.push(brazierGeo, flameGeo, flameMat, flickerBulbMat);

  const flickerLight = new THREE.PointLight(0xffae42, 2.4, 20, 1.7);
  flickerLight.position.set(0, 6.0, -18);
  scene.add(flickerLight);

  [
    [-6.0, -61.0],
    [6.0, -61.0],
    [13.0, -14.0],
    [-13.0, -40.0],
  ].forEach(([bx, bz]) => {
    const brazier = new THREE.Mesh(brazierGeo, darkMetalMat);
    brazier.position.set(bx, 0.5, bz);
    brazier.castShadow = true;
    brazier.userData = { surface: 'metal' };
    obstacles.push(brazier);
    scene.add(brazier);

    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(bx, 1.32, bz);
    scene.add(flame);
    fireMeshes.push(flame);

    const bLight = new THREE.PointLight(0xff7b1c, 2.8, 12, 1.6);
    bLight.position.set(bx, 1.7, bz);
    scene.add(bLight);
    fireLights.push(bLight);

    colliders.push({
      minX: bx - 0.6,
      maxX: bx + 0.6,
      minZ: bz - 0.6,
      maxZ: bz + 0.6,
      maxY: 1.1,
    });
  });

  // 8. Drifting Golden Desert Sand Motes
  const dustCount = 260;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 44;
    dustPos[i * 3 + 1] = 0.4 + Math.random() * 8.0;
    dustPos[i * 3 + 2] = 12 - Math.random() * 75;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xfde0a6,
    size: 0.068,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const dustParticles = new THREE.Points(dustGeo, dustMat);
  scene.add(dustParticles);
  disposables.push(dustGeo, dustMat);

  // 9. La Carpa del Capitán Coronel (Desert Command Outpost Tent)
  addCoronelTent(
    scene,
    colliders,
    obstacles,
    fireLights,
    disposables,
    [-14.0, 0, 5.2],
    0.55,
    oliveCargoMat
  );

  return {
    colliders,
    obstacles,
    flickerLight,
    flickerBulbMat,
    fireLights,
    fireMeshes,
    dustParticles,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

export function createCubeWorldMap(
  scene: THREE.Scene,
  _maxAnisotropy: number
): AbandonedCityBundle {
  const colliders: BoxCollider[] = [];
  const obstacles: THREE.Mesh[] = [];
  const disposables: Array<{ dispose: () => void }> = [];

  // 1. Crisp Voxel Daytime Sky Dome & Blocky White Clouds
  const skyTex = createVoxelSkyDomeTexture();
  const skyGeo = new THREE.SphereGeometry(240, 24, 16);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    fog: false,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
  disposables.push(skyTex, skyGeo, skyMat);

  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, fog: false });
  disposables.push(cloudMat);
  [
    [-38, 34, -45, 16, 2.2, 8],
    [22, 36, -68, 22, 2.2, 10],
    [-12, 35, -95, 18, 2.2, 9],
    [48, 33, -24, 14, 2.2, 7],
    [-55, 37, 5, 15, 2.2, 8],
  ].forEach(([cx, cy, cz, cw, ch, cd]) => {
    const cGeo = new THREE.BoxGeometry(cw, ch, cd);
    const cloud = new THREE.Mesh(cGeo, cloudMat);
    cloud.position.set(cx, cy, cz);
    scene.add(cloud);
    disposables.push(cGeo);
  });

  // 2. Voxel Textures & Materials (NearestFilter crisp pixels)
  const grassTopTex = createVoxelGrassTopTex(90, 120);
  const grassSideTex = createVoxelGrassSideTex(4, 1);
  const dirtPathTex = createVoxelDirtPathTex(3, 44);
  const dirtCrossTex = createVoxelDirtPathTex(18, 2);
  const cobbleTex = createVoxelCobbleTex(2, 2);
  const plankTex = createVoxelPlankTex(2, 2);
  const logTex = createVoxelLogTex(1, 3);
  const leafTex = createVoxelLeafTex(2, 2);
  const waterTex = createVoxelWaterTex(8, 30);

  disposables.push(
    grassTopTex,
    grassSideTex,
    dirtPathTex,
    dirtCrossTex,
    cobbleTex,
    plankTex,
    logTex,
    leafTex,
    waterTex
  );

  const grassGroundMat = new THREE.MeshStandardMaterial({
    map: grassTopTex,
    roughness: 0.94,
    metalness: 0.02,
  });
  const grassBlockMat = new THREE.MeshStandardMaterial({
    map: grassSideTex,
    roughness: 0.92,
    metalness: 0.02,
  });
  const dirtRoadMat = new THREE.MeshStandardMaterial({
    map: dirtPathTex,
    roughness: 0.96,
    metalness: 0.01,
  });
  const dirtCrossMat = new THREE.MeshStandardMaterial({
    map: dirtCrossTex,
    roughness: 0.96,
    metalness: 0.01,
  });
  const cobbleMat = new THREE.MeshStandardMaterial({
    map: cobbleTex,
    roughness: 0.88,
    metalness: 0.08,
  });
  const plankMat = new THREE.MeshStandardMaterial({
    map: plankTex,
    roughness: 0.86,
    metalness: 0.04,
  });
  const logMat = new THREE.MeshStandardMaterial({
    map: logTex,
    roughness: 0.92,
    metalness: 0.02,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    map: leafTex,
    roughness: 0.9,
    metalness: 0.02,
  });
  const waterMat = new THREE.MeshStandardMaterial({
    map: waterTex,
    roughness: 0.18,
    metalness: 0.15,
    transparent: true,
    opacity: 0.88,
  });
  const sandBorderMat = new THREE.MeshStandardMaterial({
    color: 0xe3d19a,
    roughness: 0.95,
    metalness: 0.01,
  });
  const voxelGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.15,
    metalness: 0.2,
    transparent: true,
    opacity: 0.72,
  });
  const darkForgeMat = new THREE.MeshStandardMaterial({
    color: 0x374151,
    roughness: 0.8,
    metalness: 0.25,
  });
  const lavaMat = new THREE.MeshStandardMaterial({
    color: 0xff6b00,
    emissive: 0xff4500,
    emissiveIntensity: 3.0,
    roughness: 0.3,
  });

  disposables.push(
    grassGroundMat,
    grassBlockMat,
    dirtRoadMat,
    dirtCrossMat,
    cobbleMat,
    plankMat,
    logMat,
    leafMat,
    waterMat,
    sandBorderMat,
    voxelGlassMat,
    darkForgeMat,
    lavaMat
  );

  // 3. Base Grass Ground & Village Dirt Paths
  const groundGeo = new THREE.PlaneGeometry(240, 300);
  const groundMesh = new THREE.Mesh(groundGeo, grassGroundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  groundMesh.userData = { surface: 'concrete' };
  obstacles.push(groundMesh);
  scene.add(groundMesh);
  disposables.push(groundGeo);

  const mainPathGeo = new THREE.PlaneGeometry(6.0, 90);
  const mainPath = new THREE.Mesh(mainPathGeo, dirtRoadMat);
  mainPath.rotation.x = -Math.PI / 2;
  mainPath.position.set(0, 0.012, -22);
  mainPath.receiveShadow = true;
  scene.add(mainPath);
  disposables.push(mainPathGeo);

  [-10, -28, -46].forEach((pz) => {
    const crossGeo = new THREE.PlaneGeometry(34, 4.0);
    const cross = new THREE.Mesh(crossGeo, dirtCrossMat);
    cross.rotation.x = -Math.PI / 2;
    cross.position.set(0, 0.014, pz);
    cross.receiveShadow = true;
    scene.add(cross);
    disposables.push(crossGeo);
  });

  // 4. Waterfront Canal, Sand Shore & Wooden Dock on West Flank (matching voxel village vibe)
  const riverGeo = new THREE.PlaneGeometry(18, 130);
  const river = new THREE.Mesh(riverGeo, waterMat);
  river.rotation.x = -Math.PI / 2;
  river.position.set(-29, 0.025, -24);
  river.receiveShadow = true;
  scene.add(river);
  disposables.push(riverGeo);

  const sandShoreGeo = new THREE.BoxGeometry(3.2, 0.22, 110);
  const sandShore = new THREE.Mesh(sandShoreGeo, sandBorderMat);
  sandShore.position.set(-20.2, 0.11, -24);
  sandShore.receiveShadow = true;
  scene.add(sandShore);
  disposables.push(sandShoreGeo);

  const dockGeo = new THREE.BoxGeometry(6.5, 0.35, 3.0);
  const dock = new THREE.Mesh(dockGeo, plankMat);
  dock.position.set(-22.8, 0.22, -6);
  dock.castShadow = true;
  dock.receiveShadow = true;
  scene.add(dock);
  disposables.push(dockGeo);

  // 5. Stepped Voxel Grass Terraces & Perimeter Hills
  const stepBlocks: Array<[number, number, number, number, number, number]> = [
    [-21.5, 0.6, -24, 2.2, 1.2, 86],
    [22.5, 0.75, -24, 3.0, 1.5, 86],
    [25.5, 1.8, -24, 4.0, 3.6, 92],
    [0, 1.5, -67, 48, 3.0, 4.0],
    [-34, 2.2, -88, 22, 4.4, 20],
    [34, 2.8, -92, 26, 5.6, 22],
    [0, 3.6, -98, 28, 7.2, 18],
  ];
  stepBlocks.forEach(([x, y, z, w, h, d]) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, grassBlockMat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData = { surface: 'concrete' };
    obstacles.push(m);
    scene.add(m);
    disposables.push(geo);

    if (Math.abs(x) < 24 && z > -69) {
      colliders.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
        maxY: h,
      });
    }
  });

  // 6. Central Cobblestone Village Well (Tactical Center Cover at [0, -19])
  const wellBaseGeo = new THREE.BoxGeometry(2.8, 1.15, 2.8);
  const wellWaterGeo = new THREE.BoxGeometry(1.6, 0.9, 1.6);
  const wellPostGeo = new THREE.BoxGeometry(0.32, 2.2, 0.32);
  const wellRoofGeo = new THREE.BoxGeometry(3.2, 0.45, 3.2);
  const wellTopGeo = new THREE.BoxGeometry(2.2, 0.42, 2.2);
  disposables.push(wellBaseGeo, wellWaterGeo, wellPostGeo, wellRoofGeo, wellTopGeo);

  const wellGroup = new THREE.Group();
  wellGroup.position.set(0, 0, -19);
  const wellBase = new THREE.Mesh(wellBaseGeo, cobbleMat);
  wellBase.position.y = 0.575;
  wellBase.castShadow = true;
  wellBase.receiveShadow = true;
  wellBase.userData = { surface: 'concrete' };
  obstacles.push(wellBase);

  const wellWater = new THREE.Mesh(wellWaterGeo, waterMat);
  wellWater.position.y = 0.72;
  wellGroup.add(wellBase, wellWater);

  [
    [-1.1, -1.1],
    [1.1, -1.1],
    [-1.1, 1.1],
    [1.1, 1.1],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(wellPostGeo, logMat);
    post.position.set(px, 2.2, pz);
    post.castShadow = true;
    wellGroup.add(post);
  });
  const wellRoof = new THREE.Mesh(wellRoofGeo, plankMat);
  wellRoof.position.y = 3.45;
  wellRoof.castShadow = true;
  const wellTop = new THREE.Mesh(wellTopGeo, plankMat);
  wellTop.position.y = 3.88;
  wellGroup.add(wellRoof, wellTop);
  scene.add(wellGroup);

  colliders.push({
    minX: -1.45,
    maxX: 1.45,
    minZ: -20.45,
    maxZ: -17.55,
    maxY: 3.6,
  });

  // 7. Helper: Minecraft-Style Villager Cottages with Stepped Pyramidal Roofs
  const addCottage = (cx: number, cz: number, w: number, d: number, h: number, isForge = false) => {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);

    const foundGeo = new THREE.BoxGeometry(w, 1.0, d);
    const found = new THREE.Mesh(foundGeo, cobbleMat);
    found.position.y = 0.5;
    found.castShadow = true;
    found.receiveShadow = true;
    found.userData = { surface: 'concrete' };
    obstacles.push(found);

    const wallGeo = new THREE.BoxGeometry(w - 0.12, h - 1.0, d - 0.12);
    const wall = new THREE.Mesh(wallGeo, isForge ? cobbleMat : plankMat);
    wall.position.y = 1.0 + (h - 1.0) / 2;
    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.userData = { surface: 'concrete' };
    obstacles.push(wall);
    g.add(found, wall);
    disposables.push(foundGeo, wallGeo);

    // Oak log corner pillars
    const pillarGeo = new THREE.BoxGeometry(0.45, h, 0.45);
    disposables.push(pillarGeo);
    [
      [-w / 2 + 0.18, -d / 2 + 0.18],
      [w / 2 - 0.18, -d / 2 + 0.18],
      [-w / 2 + 0.18, d / 2 - 0.18],
      [w / 2 - 0.18, d / 2 - 0.18],
    ].forEach(([px, pz]) => {
      const p = new THREE.Mesh(pillarGeo, logMat);
      p.position.set(px, h / 2, pz);
      p.castShadow = true;
      g.add(p);
    });

    // Stepped pyramid roof (3 tiers)
    for (let step = 0; step < 3; step++) {
      const rw = w + 1.0 - step * 1.45;
      const rd = d + 1.0 - step * 1.45;
      if (rw <= 0.6 || rd <= 0.6) break;
      const rGeo = new THREE.BoxGeometry(rw, 0.55, rd);
      const rMesh = new THREE.Mesh(rGeo, isForge ? darkForgeMat : plankMat);
      rMesh.position.y = h + 0.28 + step * 0.52;
      rMesh.castShadow = true;
      rMesh.receiveShadow = true;
      g.add(rMesh);
      disposables.push(rGeo);
    }

    // Glowing glass windows facing the village avenue
    const faceSign = cx < 0 ? 1 : -1;
    const winGeo = new THREE.BoxGeometry(0.16, 1.0, 1.0);
    const w1 = new THREE.Mesh(winGeo, voxelGlassMat);
    w1.position.set(faceSign * (w / 2), 2.1, -1.0);
    const w2 = new THREE.Mesh(winGeo, voxelGlassMat);
    w2.position.set(faceSign * (w / 2), 2.1, 1.0);
    g.add(w1, w2);
    disposables.push(winGeo);

    if (isForge) {
      const forgePitGeo = new THREE.BoxGeometry(1.4, 0.8, 1.4);
      const forgePit = new THREE.Mesh(forgePitGeo, darkForgeMat);
      forgePit.position.set(faceSign * (w / 2 + 0.7), 0.4, 0);
      const lavaGeo = new THREE.BoxGeometry(0.9, 0.18, 0.9);
      const lava = new THREE.Mesh(lavaGeo, lavaMat);
      lava.position.set(faceSign * (w / 2 + 0.7), 0.82, 0);
      g.add(forgePit, lava);
      disposables.push(forgePitGeo, lavaGeo);
    }

    scene.add(g);

    colliders.push({
      minX: cx - w / 2 - 0.1,
      maxX: cx + w / 2 + 0.1,
      minZ: cz - d / 2 - 0.1,
      maxZ: cz + d / 2 + 0.1,
      maxY: h + 1.5,
    });
  };

  addCottage(-13.8, -10, 6.2, 6.8, 3.8, false);
  addCottage(-14.2, -28, 6.8, 7.2, 4.0, true); // Blacksmith Forge!
  addCottage(-13.8, -46, 6.0, 6.6, 3.8, false);
  addCottage(13.8, -8, 6.4, 6.8, 3.8, false);
  addCottage(14.0, -27, 6.6, 7.2, 4.2, false);
  addCottage(13.8, -46, 6.2, 6.8, 3.8, false);

  // 8. Low Wooden Fence Pens & Cobble Crates (waist-high voxel cover)
  const fenceBarGeo = new THREE.BoxGeometry(3.2, 0.95, 0.35);
  const blockCrateGeo = new THREE.BoxGeometry(1.15, 1.15, 1.15);
  disposables.push(fenceBarGeo, blockCrateGeo);

  [
    [-4.6, -9.5, 0],
    [4.6, -13.0, 0.12],
    [-4.8, -32.0, -0.1],
    [4.8, -36.0, 0.08],
  ].forEach(([fx, fz, ry]) => {
    const f = new THREE.Mesh(fenceBarGeo, plankMat);
    f.position.set(fx, 0.475, fz);
    f.rotation.y = ry;
    f.castShadow = true;
    f.receiveShadow = true;
    f.userData = { surface: 'concrete' };
    obstacles.push(f);
    scene.add(f);
    colliders.push({
      minX: fx - 1.6,
      maxX: fx + 1.6,
      minZ: fz - 0.4,
      maxZ: fz + 0.4,
      maxY: 1.0,
    });
  });

  [
    [0.0, -6.8],
    [-6.6, -22.5],
    [6.6, -24.5],
    [0.0, -41.0],
  ].forEach(([bx, bz]) => {
    const c = new THREE.Mesh(blockCrateGeo, cobbleMat);
    c.position.set(bx, 0.575, bz);
    c.castShadow = true;
    c.receiveShadow = true;
    c.userData = { surface: 'concrete' };
    obstacles.push(c);
    scene.add(c);
    colliders.push({
      minX: bx - 0.6,
      maxX: bx + 0.6,
      minZ: bz - 0.6,
      maxZ: bz + 0.6,
      maxY: 1.2,
    });
  });

  // 9. Blocky Oak Trees around Village Perimeter
  const treeTrunkGeo = new THREE.BoxGeometry(0.95, 3.2, 0.95);
  const treeCrownLowerGeo = new THREE.BoxGeometry(3.4, 1.8, 3.4);
  const treeCrownTopGeo = new THREE.BoxGeometry(2.1, 1.1, 2.1);
  disposables.push(treeTrunkGeo, treeCrownLowerGeo, treeCrownTopGeo);

  [
    [-18.0, 2.0],
    [18.0, 2.0],
    [-18.0, -19.0],
    [18.2, -18.5],
    [-18.0, -37.5],
    [18.0, -37.5],
    [-12.0, -59.0],
    [12.0, -59.0],
  ].forEach(([tx, tz]) => {
    const tg = new THREE.Group();
    tg.position.set(tx, 0, tz);
    const trunk = new THREE.Mesh(treeTrunkGeo, logMat);
    trunk.position.y = 1.6;
    trunk.castShadow = true;
    const crownL = new THREE.Mesh(treeCrownLowerGeo, leafMat);
    crownL.position.y = 3.8;
    crownL.castShadow = true;
    const crownT = new THREE.Mesh(treeCrownTopGeo, leafMat);
    crownT.position.y = 5.2;
    crownT.castShadow = true;
    tg.add(trunk, crownL, crownT);
    scene.add(tg);
    colliders.push({
      minX: tx - 0.55,
      maxX: tx + 0.55,
      minZ: tz - 0.55,
      maxZ: tz + 0.55,
      maxY: 3.4,
    });
  });

  // 10. Village Torches & Light Sources
  const fireLights: THREE.PointLight[] = [];
  const fireMeshes: THREE.Mesh[] = [];
  const torchStickGeo = new THREE.BoxGeometry(0.18, 1.4, 0.18);
  const torchFlameGeo = new THREE.BoxGeometry(0.24, 0.28, 0.24);
  const torchFlameMat = new THREE.MeshBasicMaterial({ color: 0xffb703 });
  const flickerBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.5,
    roughness: 0.25,
  });
  disposables.push(torchStickGeo, torchFlameGeo, torchFlameMat, flickerBulbMat);

  const flickerLight = new THREE.PointLight(0xffcf70, 2.0, 18, 1.7);
  flickerLight.position.set(0, 4.5, -19);
  scene.add(flickerLight);

  [
    [-3.4, -10.0],
    [3.4, -10.0],
    [-3.4, -28.0],
    [3.4, -28.0],
    [-3.4, -46.0],
    [3.4, -46.0],
  ].forEach(([tx, tz]) => {
    const stick = new THREE.Mesh(torchStickGeo, plankMat);
    stick.position.set(tx, 0.7, tz);
    stick.castShadow = true;
    const flame = new THREE.Mesh(torchFlameGeo, torchFlameMat);
    flame.position.set(tx, 1.52, tz);
    scene.add(stick, flame);
    fireMeshes.push(flame);

    const tLight = new THREE.PointLight(0xffa62b, 2.2, 10, 1.7);
    tLight.position.set(tx, 1.75, tz);
    scene.add(tLight);
    fireLights.push(tLight);
  });

  // 11. Floating Pixel-Leaf / Pollen Motes
  const dustCount = 180;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 40;
    dustPos[i * 3 + 1] = 0.6 + Math.random() * 6.5;
    dustPos[i * 3 + 2] = 12 - Math.random() * 72;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xfef9c3,
    size: 0.08,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const dustParticles = new THREE.Points(dustGeo, dustMat);
  scene.add(dustParticles);
  disposables.push(dustGeo, dustMat);

  // 12. La Carpa del Capitán Coronel in the Village Square
  addCoronelTent(
    scene,
    colliders,
    obstacles,
    fireLights,
    disposables,
    [-13.5, 0, 5.5],
    0.55,
    plankMat
  );

  return {
    colliders,
    obstacles,
    flickerLight,
    flickerBulbMat,
    fireLights,
    fireMeshes,
    dustParticles,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

export function createPixelWorldMap(
  scene: THREE.Scene,
  _maxAnisotropy: number
): AbandonedCityBundle {
  const colliders: BoxCollider[] = [];
  const obstacles: THREE.Mesh[] = [];
  const disposables: Array<{ dispose: () => void }> = [];

  // 1. Classic 8-bit NES #5c94fc Sky Dome & Blocky Pixel Clouds
  const skyTex = createPixelSkyDomeTexture();
  const skyGeo = new THREE.SphereGeometry(240, 20, 14);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    fog: false,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
  disposables.push(skyTex, skyGeo, skyMat);

  const cloudWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
  const cloudShadeMat = new THREE.MeshBasicMaterial({ color: 0xb8dcff, fog: false });
  disposables.push(cloudWhiteMat, cloudShadeMat);

  const addPixelCloud = (cx: number, cy: number, cz: number, w: number) => {
    const g = new THREE.Group();
    g.position.set(cx, cy, cz);
    const baseGeo = new THREE.BoxGeometry(w, 2.2, 2.2);
    const topGeo = new THREE.BoxGeometry(w * 0.56, 2.0, 2.2);
    const rimGeo = new THREE.BoxGeometry(w, 0.45, 2.25);
    const mBase = new THREE.Mesh(baseGeo, cloudWhiteMat);
    const mTop = new THREE.Mesh(topGeo, cloudWhiteMat);
    mTop.position.y = 1.8;
    const mRim = new THREE.Mesh(rimGeo, cloudShadeMat);
    mRim.position.y = -0.95;
    g.add(mBase, mTop, mRim);
    scene.add(g);
    disposables.push(baseGeo, topGeo, rimGeo);
  };

  addPixelCloud(-28, 25, -42, 9);
  addPixelCloud(24, 29, -58, 12);
  addPixelCloud(-8, 31, -86, 10);
  addPixelCloud(38, 26, -20, 8);
  addPixelCloud(-36, 28, -10, 9);

  // 2. Retro Pixel Art Materials (NearestFilter)
  const groundTex = createPixelGroundBrickTex(76, 95);
  const wallGroundTex = createPixelGroundBrickTex(22, 2);
  const brickTex = createPixelBrickBlockTex(1, 1);
  const brickRowTex = createPixelBrickBlockTex(3, 1);
  const qBlockTex = createPixelQuestionBlockTex();
  const pipeTex = createPixelPipeTex(2, 1);
  const hillTex = createPixelHillTex();
  const bushTex = createPixelBushTex();

  disposables.push(
    groundTex,
    wallGroundTex,
    brickTex,
    brickRowTex,
    qBlockTex,
    pipeTex,
    hillTex,
    bushTex
  );

  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.92,
    metalness: 0.02,
  });
  const wallBrickMat = new THREE.MeshStandardMaterial({
    map: wallGroundTex,
    roughness: 0.9,
    metalness: 0.04,
  });
  const brickMat = new THREE.MeshStandardMaterial({
    map: brickTex,
    roughness: 0.85,
    metalness: 0.05,
  });
  const brickRowMat = new THREE.MeshStandardMaterial({
    map: brickRowTex,
    roughness: 0.85,
    metalness: 0.05,
  });
  const qBlockMat = new THREE.MeshStandardMaterial({
    map: qBlockTex,
    emissive: 0x5c2d00,
    emissiveIntensity: 0.35,
    roughness: 0.65,
    metalness: 0.1,
  });
  const pipeMat = new THREE.MeshStandardMaterial({
    map: pipeTex,
    roughness: 0.5,
    metalness: 0.18,
  });
  const hillMat = new THREE.MeshBasicMaterial({
    map: hillTex,
    transparent: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  const bushMat = new THREE.MeshBasicMaterial({
    map: bushTex,
    transparent: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  const castleGrayMat = new THREE.MeshStandardMaterial({
    color: 0x6b7280,
    roughness: 0.85,
    metalness: 0.05,
  });
  const castleDarkMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.9,
  });
  const coinGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xca8a04,
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.85,
  });
  const flagGreenMat = new THREE.MeshStandardMaterial({
    color: 0x80d010,
    roughness: 0.4,
  });

  disposables.push(
    groundMat,
    wallBrickMat,
    brickMat,
    brickRowMat,
    qBlockMat,
    pipeMat,
    hillMat,
    bushMat,
    castleGrayMat,
    castleDarkMat,
    coinGoldMat,
    flagGreenMat
  );

  // 3. Pixel Ground Plane
  const groundGeo = new THREE.PlaneGeometry(240, 300);
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  groundMesh.userData = { surface: 'concrete' };
  obstacles.push(groundMesh);
  scene.add(groundMesh);
  disposables.push(groundGeo);

  // 4. Perimeter Pixel Brick Walls framing the Arena
  const sideWallGeo = new THREE.BoxGeometry(2.4, 3.6, 82);
  disposables.push(sideWallGeo);
  [-21.2, 21.2].forEach((wx) => {
    const wall = new THREE.Mesh(sideWallGeo, wallBrickMat);
    wall.position.set(wx, 1.8, -24);
    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.userData = { surface: 'concrete' };
    obstacles.push(wall);
    scene.add(wall);
    colliders.push({
      minX: wx - 1.2,
      maxX: wx + 1.2,
      minZ: -65,
      maxZ: 17,
      maxY: 3.6,
    });
  });

  // 5. Iconic Green Warp Pipes (Tactical Cover across the Arena!)
  const pipeSpecs: Array<{ x: number; z: number; h: number; r: number }> = [
    { x: -6.2, z: -10.5, h: 2.0, r: 0.92 },
    { x: 6.4, z: -14.0, h: 2.4, r: 0.92 },
    { x: 0.0, z: -24.0, h: 2.8, r: 1.05 },
    { x: -9.5, z: -32.0, h: 2.2, r: 0.92 },
    { x: 9.5, z: -34.5, h: 2.6, r: 0.92 },
    { x: -5.5, z: -45.5, h: 2.2, r: 0.92 },
    { x: 5.5, z: -45.5, h: 2.2, r: 0.92 },
  ];

  pipeSpecs.forEach((p) => {
    const bodyGeo = new THREE.CylinderGeometry(p.r, p.r, p.h, 14);
    const lipGeo = new THREE.CylinderGeometry(p.r * 1.18, p.r * 1.18, 0.56, 14);
    const boreGeo = new THREE.CircleGeometry(p.r * 0.85, 14);
    disposables.push(bodyGeo, lipGeo, boreGeo);

    const pipeBody = new THREE.Mesh(bodyGeo, pipeMat);
    pipeBody.position.set(p.x, p.h / 2, p.z);
    pipeBody.castShadow = true;
    pipeBody.receiveShadow = true;
    pipeBody.userData = { surface: 'metal' };
    obstacles.push(pipeBody);

    const pipeLip = new THREE.Mesh(lipGeo, pipeMat);
    pipeLip.position.set(p.x, p.h - 0.16, p.z);
    pipeLip.castShadow = true;
    pipeLip.receiveShadow = true;
    pipeLip.userData = { surface: 'metal' };
    obstacles.push(pipeLip);

    const pipeBore = new THREE.Mesh(boreGeo, castleDarkMat);
    pipeBore.rotation.x = -Math.PI / 2;
    pipeBore.position.set(p.x, p.h + 0.125, p.z);

    scene.add(pipeBody, pipeLip, pipeBore);
    colliders.push({
      minX: p.x - p.r * 1.15,
      maxX: p.x + p.r * 1.15,
      minZ: p.z - p.r * 1.15,
      maxZ: p.z + p.r * 1.15,
      maxY: p.h + 0.25,
    });
  });

  // 6. Floating Mario-Style Brick & '?' Question Block Formations
  const blockGeo = new THREE.BoxGeometry(1.45, 1.45, 1.45);
  disposables.push(blockGeo);

  const floatingRows: Array<{
    cx: number;
    y: number;
    cz: number;
    pattern: Array<'B' | 'Q'>;
  }> = [
    { cx: -7.5, y: 4.1, cz: -17.5, pattern: ['B', 'Q', 'B', 'Q', 'B'] },
    { cx: 7.5, y: 4.1, cz: -21.0, pattern: ['B', 'Q', 'B'] },
    { cx: 0.0, y: 4.6, cz: -33.5, pattern: ['Q', 'B', 'Q', 'B', 'Q'] },
    { cx: -8.0, y: 6.4, cz: -39.0, pattern: ['B', 'Q', 'B'] },
    { cx: 8.5, y: 5.8, cz: -41.5, pattern: ['Q', 'B', 'Q'] },
  ];

  floatingRows.forEach((row) => {
    const startX = row.cx - ((row.pattern.length - 1) * 1.45) / 2;
    row.pattern.forEach((cell, idx) => {
      const m = new THREE.Mesh(blockGeo, cell === 'Q' ? qBlockMat : brickMat);
      m.position.set(startX + idx * 1.45, row.y, row.cz);
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData = { surface: 'concrete' };
      obstacles.push(m);
      scene.add(m);
    });
  });

  // Ground-level Stepped Brick Staircases (like end of SMB 1-1!)
  const stairBlocks: Array<[number, number, number]> = [
    [-14.5, 0.725, -49],
    [-14.5, 0.725, -50.45],
    [-14.5, 2.175, -50.45],
    [14.5, 0.725, -49],
    [14.5, 0.725, -50.45],
    [14.5, 2.175, -50.45],
  ];
  stairBlocks.forEach(([bx, by, bz]) => {
    const sb = new THREE.Mesh(blockGeo, brickRowMat);
    sb.position.set(bx, by, bz);
    sb.castShadow = true;
    sb.receiveShadow = true;
    sb.userData = { surface: 'concrete' };
    obstacles.push(sb);
    scene.add(sb);
    colliders.push({
      minX: bx - 0.75,
      maxX: bx + 0.75,
      minZ: bz - 0.75,
      maxZ: bz + 0.75,
      maxY: by + 0.75,
    });
  });

  // 7. Pixelated Green Hills (with eyes!) & Pixel Bushes around the horizon
  const hillGeo = new THREE.PlaneGeometry(11, 6.8);
  const bushGeo = new THREE.PlaneGeometry(7.2, 3.6);
  disposables.push(hillGeo, bushGeo);

  [
    [-17, 3.4, -18, Math.PI / 2],
    [17, 3.4, -28, -Math.PI / 2],
    [-16, 3.4, -56, 0.25],
    [16, 3.4, -56, -0.25],
    [-26, 4.4, -74, 0],
    [26, 4.4, -78, 0],
  ].forEach(([hx, hy, hz, ry]) => {
    const hill = new THREE.Mesh(hillGeo, hillMat);
    hill.position.set(hx, hy, hz);
    hill.rotation.y = ry;
    if (Math.abs(hx) > 20) hill.scale.setScalar(1.35);
    scene.add(hill);
  });

  [
    [-17.2, 1.8, -6, Math.PI / 2],
    [17.2, 1.8, -12, -Math.PI / 2],
    [-17.2, 1.8, -36, Math.PI / 2],
    [17.2, 1.8, -42, -Math.PI / 2],
    [-9.5, 1.8, -61, 0],
    [9.5, 1.8, -61, 0],
  ].forEach(([bx, by, bz, ry]) => {
    const bush = new THREE.Mesh(bushGeo, bushMat);
    bush.position.set(bx, by, bz);
    bush.rotation.y = ry;
    scene.add(bush);
  });

  // 8. Classic End-of-Level Flagpole & Pixel Brick Castle Backdrop (z = -64)
  const poleBase = new THREE.Mesh(blockGeo, brickMat);
  poleBase.position.set(-5.2, 0.725, -62.5);
  const poleGeo = new THREE.CylinderGeometry(0.14, 0.14, 9.6, 8);
  const poleMesh = new THREE.Mesh(poleGeo, cloudWhiteMat);
  poleMesh.position.set(-5.2, 5.5, -62.5);
  const finialGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
  const finial = new THREE.Mesh(finialGeo, coinGoldMat);
  finial.position.set(-5.2, 10.4, -62.5);
  const flagGeo = new THREE.BoxGeometry(2.1, 1.35, 0.14);
  const flag = new THREE.Mesh(flagGeo, flagGreenMat);
  flag.position.set(-4.1, 9.1, -62.5);
  scene.add(poleBase, poleMesh, finial, flag);
  disposables.push(poleGeo, finialGeo, flagGeo);

  // Pixel Castle Fortress at north center
  const castleBaseGeo = new THREE.BoxGeometry(9.2, 6.2, 5.5);
  const castleTowerGeo = new THREE.BoxGeometry(4.8, 3.2, 3.8);
  const castleDoorGeo = new THREE.BoxGeometry(2.2, 3.0, 0.4);
  const castleBase = new THREE.Mesh(castleBaseGeo, brickRowMat);
  castleBase.position.set(2.5, 3.1, -66);
  const castleTower = new THREE.Mesh(castleTowerGeo, castleGrayMat);
  castleTower.position.set(2.5, 7.8, -66);
  const castleDoor = new THREE.Mesh(castleDoorGeo, castleDarkMat);
  castleDoor.position.set(2.5, 1.5, -63.1);
  scene.add(castleBase, castleTower, castleDoor);
  disposables.push(castleBaseGeo, castleTowerGeo, castleDoorGeo);

  // 9. Glowing Pixel Coins & Floating Fire Lights
  const fireLights: THREE.PointLight[] = [];
  const fireMeshes: THREE.Mesh[] = [];
  const coinGeo = new THREE.BoxGeometry(0.45, 0.72, 0.14);
  disposables.push(coinGeo);

  [
    [-7.5, 5.6, -17.5],
    [0.0, 6.1, -33.5],
    [7.5, 5.6, -21.0],
    [-8.0, 7.9, -39.0],
    [8.5, 7.3, -41.5],
  ].forEach(([cx, cy, cz]) => {
    const coin = new THREE.Mesh(coinGeo, coinGoldMat);
    coin.position.set(cx, cy, cz);
    scene.add(coin);
    fireMeshes.push(coin);

    const cLight = new THREE.PointLight(0xfacc15, 1.6, 9, 1.6);
    cLight.position.set(cx, cy + 0.3, cz);
    scene.add(cLight);
    fireLights.push(cLight);
  });

  const flickerBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 1.5,
    roughness: 0.25,
  });
  disposables.push(flickerBulbMat);
  const flickerLight = new THREE.PointLight(0xfff3b0, 1.8, 22, 1.6);
  flickerLight.position.set(0, 8, -24);
  scene.add(flickerLight);

  // 10. Floating Pixel Starlight Motes
  const dustCount = 160;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 40;
    dustPos[i * 3 + 1] = 0.8 + Math.random() * 7.5;
    dustPos[i * 3 + 2] = 12 - Math.random() * 74;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xfef08a,
    size: 0.085,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const dustParticles = new THREE.Points(dustGeo, dustMat);
  scene.add(dustParticles);
  disposables.push(dustGeo, dustMat);

  // 11. La Carpa del Capitán Coronel in Pixel World
  addCoronelTent(
    scene,
    colliders,
    obstacles,
    fireLights,
    disposables,
    [-13.5, 0, 5.5],
    0.55,
    brickMat
  );

  return {
    colliders,
    obstacles,
    flickerLight,
    flickerBulbMat,
    fireLights,
    fireMeshes,
    dustParticles,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

export function createBackroomsMap(
  scene: THREE.Scene,
  maxAnisotropy: number
): AbandonedCityBundle {
  const disposables: Array<{ dispose: () => void }> = [];
  const colliders: BoxCollider[] = [];
  const obstacles: THREE.Mesh[] = [];
  const fireLights: THREE.PointLight[] = [];
  const fireMeshes: THREE.Mesh[] = [];

  const roomSpan = 136; // -68 .. +68 on X and Z (expanded Backrooms Level 0)
  const halfSpan = roomSpan / 2;
  const wallHeight = 3.95;

  const carpetTex = createBackroomsCarpetTex(42, 42);
  carpetTex.anisotropy = maxAnisotropy;
  const wallTex = createBackroomsWallpaperTex(2, 1);
  wallTex.anisotropy = maxAnisotropy;
  const wallLongTex = createBackroomsWallpaperTex(4, 1);
  wallLongTex.anisotropy = maxAnisotropy;
  const ceilingTex = createBackroomsCeilingTex(38, 38);
  ceilingTex.anisotropy = maxAnisotropy;
  disposables.push(carpetTex, wallTex, wallLongTex, ceilingTex);

  const carpetMat = new THREE.MeshStandardMaterial({
    map: carpetTex,
    roughness: 0.94,
    metalness: 0.02,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    roughness: 0.88,
    metalness: 0.02,
  });
  const wallLongMat = new THREE.MeshStandardMaterial({
    map: wallLongTex,
    roughness: 0.88,
    metalness: 0.02,
  });
  const ceilingMat = new THREE.MeshStandardMaterial({
    map: ceilingTex,
    roughness: 0.9,
    metalness: 0.04,
  });
  const fluorMat = new THREE.MeshStandardMaterial({
    color: 0xfefce8,
    emissive: 0xfbf2b4,
    emissiveIntensity: 1.55,
    roughness: 0.2,
  });
  const flickerBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfde047,
    emissiveIntensity: 1.85,
    roughness: 0.2,
  });
  const trimWoodMat = new THREE.MeshStandardMaterial({
    color: 0x5c4a26,
    roughness: 0.82,
    metalness: 0.05,
  });
  const exitSignMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.5,
    roughness: 0.35,
  });
  disposables.push(
    carpetMat,
    wallMat,
    wallLongMat,
    ceilingMat,
    fluorMat,
    flickerBulbMat,
    trimWoodMat,
    exitSignMat
  );

  // Damp mustard-beige carpet floor
  const floorGeo = new THREE.PlaneGeometry(roomSpan, roomSpan);
  floorGeo.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeo, carpetMat);
  floor.receiveShadow = true;
  scene.add(floor);
  obstacles.push(floor);
  disposables.push(floorGeo);

  // Acoustic drop ceiling
  const ceilingGeo = new THREE.PlaneGeometry(roomSpan, roomSpan);
  ceilingGeo.rotateX(Math.PI / 2);
  const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceiling.position.y = wallHeight;
  scene.add(ceiling);
  disposables.push(ceilingGeo);

  const registerWallBox = (
    cx: number,
    cz: number,
    w: number,
    d: number,
    h = wallHeight,
    mat: THREE.Material = w > 7 || d > 7 ? wallLongMat : wallMat
  ) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, h / 2, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    obstacles.push(mesh);
    disposables.push(geo);
    colliders.push({
      minX: cx - w / 2,
      maxX: cx + w / 2,
      minZ: cz - d / 2,
      maxZ: cz + d / 2,
      maxY: h + 0.1,
    });
  };

  // Perimeter enclosing walls (-68..68)
  registerWallBox(0, -halfSpan - 0.5, roomSpan + 2, 1.0, wallHeight, wallLongMat);
  registerWallBox(0, halfSpan + 0.5, roomSpan + 2, 1.0, wallHeight, wallLongMat);
  registerWallBox(-halfSpan - 0.5, 0, 1.0, roomSpan + 2, wallHeight, wallLongMat);
  registerWallBox(halfSpan + 0.5, 0, 1.0, roomSpan + 2, wallHeight, wallLongMat);

  // Interconnected Level 0 Backrooms Labyrinth Walls (wide 4.5m+ openings for fluid chases)
  const mazeWalls: Array<[number, number, number, number]> = [
    // Entry hall flanking walls (player starts around 0, 0, 16)
    [-10.5, 16, 0.7, 13],
    [10.5, 16, 0.7, 13],
    [-23.5, 22, 11, 0.7],
    [23.5, 22, 11, 0.7],
    [-26, 11, 0.7, 12],
    [26, 11, 0.7, 12],

    // Mid-south transverse dividers with wide doorways
    [-17.5, 4, 12, 0.7],
    [17.5, 4, 12, 0.7],
    [0, 5.5, 6.2, 0.7],

    // Central open atrium + inner office partition walls
    [-11.5, -5, 0.7, 11],
    [11.5, -5, 0.7, 11],
    [-24.5, -5, 10, 0.7],
    [24.5, -5, 10, 0.7],
    [-28, -16, 0.7, 12],
    [28, -16, 0.7, 12],

    // North-mid corridor baffles
    [-5.5, -15.5, 7.5, 0.7],
    [5.5, -15.5, 7.5, 0.7],
    [-16, -24, 0.7, 10],
    [16, -24, 0.7, 10],

    // Inner northern Backrooms wings
    [-24, -27, 10, 0.7],
    [24, -27, 10, 0.7],
    [0, -25, 8.5, 0.7],

    // Inner southern corridors behind spawn
    [-14, 28, 11, 0.7],
    [14, 28, 11, 0.7],
    [0, 31, 0.7, 8],

    // Outer North Expansion Wing (-38..-62)
    [-45, -42, 18, 0.7],
    [45, -42, 18, 0.7],
    [-18, -42, 14, 0.7],
    [18, -42, 14, 0.7],
    [-32, -48, 0.7, 15],
    [32, -48, 0.7, 15],
    [-56, -54, 0.7, 14],
    [56, -54, 0.7, 14],
    [-12, -57, 12, 0.7],
    [12, -57, 12, 0.7],
    [-42, -58, 14, 0.7],
    [42, -58, 14, 0.7],

    // Outer West & East Long Corridors (±36..±62)
    [-39, 10, 0.7, 22],
    [39, 10, 0.7, 22],
    [-39, -18, 0.7, 16],
    [39, -18, 0.7, 16],
    [-53, 8, 14, 0.7],
    [53, 8, 14, 0.7],
    [-53, -12, 14, 0.7],
    [53, -12, 14, 0.7],
    [-56, -28, 0.7, 16],
    [56, -28, 0.7, 16],
    [-56, 26, 0.7, 16],
    [56, 26, 0.7, 16],

    // Outer South Expansion Wings (38..62)
    [-44, 41, 16, 0.7],
    [44, 41, 16, 0.7],
    [-20, 42, 14, 0.7],
    [20, 42, 14, 0.7],
    [-30, 52, 0.7, 14],
    [30, 52, 0.7, 14],
    [-48, 56, 14, 0.7],
    [48, 56, 14, 0.7],
    [0, 56, 16, 0.7],
  ];

  for (const [wx, wz, ww, wd] of mazeWalls) {
    registerWallBox(wx, wz, ww, wd);
  }

  // Structural square Backrooms columns
  const pillars: Array<[number, number]> = [
    [-4.8, 11],
    [4.8, 11],
    [-5.8, -2],
    [5.8, -2],
    [0, -8.5],
    [-18, 12],
    [18, 12],
    [-18, -12],
    [18, -12],
    [-29, -2],
    [29, -2],
    [-6, -21],
    [6, -21],
    [-46, -22],
    [46, -22],
    [-46, 20],
    [46, 20],
    [-16, -50],
    [16, -50],
    [-16, 49],
    [16, 49],
    [0, -39],
    [0, 39],
  ];
  for (const [px, pz] of pillars) {
    registerWallBox(px, pz, 1.35, 1.35);
  }

  // Abandoned office desks & stacked damp cardboard boxes (low cover obstacles)
  const deskTopGeo = new THREE.BoxGeometry(2.1, 0.12, 1.05);
  const deskLegGeo = new THREE.BoxGeometry(0.14, 0.78, 0.92);
  const crateGeo = new THREE.BoxGeometry(0.95, 0.85, 0.95);
  const cardboardMat = new THREE.MeshStandardMaterial({
    color: 0x8b6f47,
    roughness: 0.92,
    metalness: 0.02,
  });
  disposables.push(deskTopGeo, deskLegGeo, crateGeo, cardboardMat);

  const props: Array<{ x: number; z: number; rotY: number; kind: 'desk' | 'crate' }> = [
    { x: -7.5, z: 19.5, rotY: 0.22, kind: 'desk' },
    { x: 7.5, z: -8.5, rotY: -0.3, kind: 'desk' },
    { x: -21.0, z: -14, rotY: 1.45, kind: 'desk' },
    { x: -46.5, z: -34, rotY: 0.15, kind: 'desk' },
    { x: 46.5, z: -34, rotY: -0.22, kind: 'desk' },
    { x: -46.5, z: 34, rotY: 0.35, kind: 'desk' },
    { x: 46.5, z: 34, rotY: -0.18, kind: 'desk' },
    { x: 20.5, z: 16, rotY: 0.1, kind: 'crate' },
    { x: -20.5, z: 16.5, rotY: -0.25, kind: 'crate' },
    { x: 13.8, z: -20.5, rotY: 0.4, kind: 'crate' },
    { x: -13.5, z: -21, rotY: -0.18, kind: 'crate' },
    { x: 24.0, z: -49, rotY: 0.3, kind: 'crate' },
    { x: -24.0, z: -49, rotY: -0.3, kind: 'crate' },
    { x: 24.0, z: 48, rotY: 0.2, kind: 'crate' },
    { x: -24.0, z: 48, rotY: -0.2, kind: 'crate' },
  ];

  for (const p of props) {
    if (p.kind === 'desk') {
      const grp = new THREE.Group();
      grp.position.set(p.x, 0, p.z);
      grp.rotation.y = p.rotY;
      const top = new THREE.Mesh(deskTopGeo, trimWoodMat);
      top.position.y = 0.82;
      const l1 = new THREE.Mesh(deskLegGeo, trimWoodMat);
      l1.position.set(-0.9, 0.39, 0);
      const l2 = new THREE.Mesh(deskLegGeo, trimWoodMat);
      l2.position.set(0.9, 0.39, 0);
      grp.add(top, l1, l2);
      scene.add(grp);
      obstacles.push(top);
      colliders.push({
        minX: p.x - 1.05,
        maxX: p.x + 1.05,
        minZ: p.z - 0.65,
        maxZ: p.z + 0.65,
        maxY: 0.95,
      });
    } else {
      const crate = new THREE.Mesh(crateGeo, cardboardMat);
      crate.position.set(p.x, 0.425, p.z);
      crate.rotation.y = p.rotY;
      crate.castShadow = true;
      crate.receiveShadow = true;
      scene.add(crate);
      obstacles.push(crate);
      colliders.push({
        minX: p.x - 0.55,
        maxX: p.x + 0.55,
        minZ: p.z - 0.55,
        maxZ: p.z + 0.55,
        maxY: 0.95,
      });
    }
  }

  // Overhead Fluorescent Light Troffers & Warm-Olive Backrooms PointLights
  const panelGeo = new THREE.BoxGeometry(1.9, 0.06, 0.68);
  const frameGeo = new THREE.BoxGeometry(2.04, 0.05, 0.82);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x6b6752,
    roughness: 0.6,
    metalness: 0.35,
  });
  disposables.push(panelGeo, frameGeo, frameMat);

  let flickerLight: THREE.PointLight | null = null;
  const lightGridCoords: Array<[number, number, boolean, boolean]> = [
    [0, 18, false, true],
    [0, 8, true, true],
    [-16, 14, false, true],
    [16, 14, false, true],
    [-46, 18, false, true],
    [46, 18, false, true],
    [0, -2, false, true],
    [-16, -2, false, true],
    [16, -2, false, true],
    [-46, -2, false, true],
    [46, -2, false, true],
    [0, -20, false, true],
    [-20, -20, false, true],
    [20, -20, false, true],
    [-48, -24, false, true],
    [48, -24, false, true],
    [-50, -50, false, true],
    [50, -50, false, true],
    [0, -49, false, true],
    [-22, -49, false, false],
    [22, -49, false, false],
    [0, 36, false, true],
    [-48, 48, false, true],
    [48, 48, false, true],
    [0, 50, false, true],
    [-22, 48, false, false],
    [22, 48, false, false],
  ];

  for (const [lx, lz, isFlicker, hasPointLight] of lightGridCoords) {
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(lx, wallHeight - 0.025, lz);
    const panel = new THREE.Mesh(panelGeo, isFlicker ? flickerBulbMat : fluorMat);
    panel.position.set(lx, wallHeight - 0.04, lz);
    scene.add(frame, panel);

    if (hasPointLight) {
      const pt = new THREE.PointLight(0xf6eab2, isFlicker ? 2.4 : 2.15, 29, 1.45);
      pt.position.set(lx, wallHeight - 0.35, lz);
      scene.add(pt);

      if (isFlicker) {
        flickerLight = pt;
      }
    }
  }

  // Eerie red "SALIDA" signs near distant outer hallways
  const exitGeo = new THREE.BoxGeometry(0.9, 0.34, 0.12);
  disposables.push(exitGeo);
  [
    [0, 3.35, -67.4],
    [0, 3.35, 67.4],
    [-67.4, 3.35, -18],
    [67.4, 3.35, 18],
  ].forEach(([ex, ey, ez]) => {
    const sign = new THREE.Mesh(exitGeo, exitSignMat);
    sign.position.set(ex, ey, ez);
    if (Math.abs(ex) > 50) sign.rotation.y = Math.PI / 2;
    scene.add(sign);
  });

  // Floating humid dust motes illuminated by fluorescent panels
  const dustCount = 280;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 128;
    dustPos[i * 3 + 1] = 0.25 + Math.random() * 3.3;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 128;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xf4eab8,
    size: 0.055,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const dustParticles = new THREE.Points(dustGeo, dustMat);
  scene.add(dustParticles);
  disposables.push(dustGeo, dustMat);

  return {
    colliders,
    obstacles,
    flickerLight: flickerLight ?? fireLights[0],
    flickerBulbMat,
    fireLights,
    fireMeshes,
    dustParticles,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

export function createPuebloDesconocidoMap(
  scene: THREE.Scene,
  maxAnisotropy: number
): AbandonedCityBundle {
  const disposables: Array<{ dispose: () => void }> = [];
  const colliders: BoxCollider[] = [];
  const obstacles: THREE.Mesh[] = [];
  const fireLights: THREE.PointLight[] = [];
  const fireMeshes: THREE.Mesh[] = [];

  // 1. Bright Classic Roblox Daytime Sky Dome & Blocky White Clouds
  const skyTex = createVoxelSkyDomeTexture();
  const skyGeo = new THREE.SphereGeometry(240, 24, 16);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    fog: false,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
  disposables.push(skyTex, skyGeo, skyMat);

  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, fog: false });
  disposables.push(cloudMat);
  [
    [-32, 34, -42, 16, 2.2, 8],
    [26, 36, -65, 20, 2.2, 9],
    [-8, 35, -90, 18, 2.2, 8],
    [46, 33, -22, 14, 2.2, 7],
  ].forEach(([cx, cy, cz, cw, ch, cd]) => {
    const cGeo = new THREE.BoxGeometry(cw, ch, cd);
    const cloud = new THREE.Mesh(cGeo, cloudMat);
    cloud.position.set(cx, cy, cz);
    scene.add(cloud);
    disposables.push(cGeo);
  });

  // 2. Classic Roblox Grass Lawns, Concrete Sidewalks, Paved Asphalt Main Street & Crosswalks
  const grassTex = createVoxelGrassTopTex(64, 64);
  grassTex.anisotropy = maxAnisotropy;
  disposables.push(grassTex);

  const grassMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.92,
    metalness: 0.02,
  });
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x3b4048,
    roughness: 0.88,
    metalness: 0.05,
  });
  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.85,
    metalness: 0.04,
  });
  const laneWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.72,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.45,
    metalness: 0.75,
  });
  const woodBenchMat = new THREE.MeshStandardMaterial({
    color: 0x8b5a2b,
    roughness: 0.82,
    metalness: 0.04,
  });
  const glassWinMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.16,
    metalness: 0.25,
  });
  const roofDarkMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.84,
    metalness: 0.08,
  });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f8f3d, roughness: 0.85 });
  disposables.push(
    grassMat,
    asphaltMat,
    sidewalkMat,
    laneWhiteMat,
    darkIronMat,
    woodBenchMat,
    glassWinMat,
    roofDarkMat,
    trunkMat,
    leafMat
  );

  const grassGroundGeo = new THREE.PlaneGeometry(240, 280);
  const grassGround = new THREE.Mesh(grassGroundGeo, grassMat);
  grassGround.rotation.x = -Math.PI / 2;
  grassGround.receiveShadow = true;
  scene.add(grassGround);
  obstacles.push(grassGround);
  disposables.push(grassGroundGeo);

  // Main town street running down center (-64..18)
  const streetGeo = new THREE.PlaneGeometry(13.2, 92);
  const street = new THREE.Mesh(streetGeo, asphaltMat);
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, 0.015, -24);
  street.receiveShadow = true;
  scene.add(street);
  disposables.push(streetGeo);

  // Raised concrete sidewalks flanking the street
  const sidewalkGeo = new THREE.BoxGeometry(3.8, 0.14, 92);
  disposables.push(sidewalkGeo);
  [-8.5, 8.5].forEach((sx) => {
    const sw = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    sw.position.set(sx, 0.07, -24);
    sw.receiveShadow = true;
    scene.add(sw);
  });

  // Dashed street center line + crosswalk stripes
  const dashGeo = new THREE.PlaneGeometry(0.28, 2.4);
  disposables.push(dashGeo);
  for (let lz = 14; lz >= -62; lz -= 5.2) {
    const dash = new THREE.Mesh(dashGeo, laneWhiteMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.025, lz);
    scene.add(dash);
  }
  const crossGeo = new THREE.PlaneGeometry(0.65, 2.6);
  disposables.push(crossGeo);
  for (const cz of [4.0, -24.0, -48.0]) {
    for (let cx = -5.4; cx <= 5.4; cx += 1.35) {
      const stripe = new THREE.Mesh(crossGeo, laneWhiteMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(cx, 0.025, cz);
      scene.add(stripe);
    }
  }

  // 3. Classic Roblox Town Houses & Storefronts along West and East Sidewalks
  const houseColors = [0xd97757, 0xe8dcc4, 0x60a5fa, 0xfbbf24, 0xc084fc, 0x94a3b8];
  const houseSpecs: Array<{ x: number; z: number; w: number; h: number; d: number; colIdx: number }> = [
    { x: -16.8, z: -2.0, w: 7.4, h: 6.2, d: 9.2, colIdx: 0 },
    { x: -16.8, z: -18.5, w: 7.6, h: 7.2, d: 10.0, colIdx: 1 },
    { x: -16.8, z: -36.0, w: 7.4, h: 6.4, d: 9.5, colIdx: 2 },
    { x: -16.8, z: -53.5, w: 7.6, h: 6.8, d: 9.2, colIdx: 3 },
    { x: 16.8, z: -2.0, w: 7.4, h: 6.5, d: 9.2, colIdx: 2 },
    { x: 16.8, z: -18.5, w: 7.6, h: 7.4, d: 10.0, colIdx: 3 },
    { x: 16.8, z: -36.0, w: 7.4, h: 6.2, d: 9.5, colIdx: 0 },
    { x: 16.8, z: -53.5, w: 7.6, h: 6.8, d: 9.2, colIdx: 1 },
    // North town hall plaza backdrop
    { x: 0, z: -66.5, w: 18.0, h: 8.6, d: 6.2, colIdx: 1 },
  ];

  const winGeo = new THREE.BoxGeometry(1.3, 1.35, 0.14);
  const doorGeo = new THREE.BoxGeometry(1.5, 2.5, 0.16);
  disposables.push(winGeo, doorGeo);

  houseSpecs.forEach((h) => {
    const bMat = new THREE.MeshStandardMaterial({
      color: houseColors[h.colIdx % houseColors.length],
      roughness: 0.76,
      metalness: 0.04,
    });
    const bGeo = new THREE.BoxGeometry(h.w, h.h, h.d);
    const roofGeo = new THREE.BoxGeometry(h.w + 0.7, 0.65, h.d + 0.7);
    disposables.push(bMat, bGeo, roofGeo);

    const mesh = new THREE.Mesh(bGeo, bMat);
    mesh.position.set(h.x, h.h / 2, h.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { surface: 'concrete' };
    obstacles.push(mesh);
    scene.add(mesh);

    const roof = new THREE.Mesh(roofGeo, roofDarkMat);
    roof.position.set(h.x, h.h + 0.32, h.z);
    roof.castShadow = true;
    scene.add(roof);

    // Classic Roblox windows & doorway facing street
    if (Math.abs(h.x) > 5) {
      const faceSign = h.x < 0 ? 1 : -1;
      const fx = h.x + faceSign * (h.w / 2 + 0.02);
      const door = new THREE.Mesh(doorGeo, woodBenchMat);
      door.rotation.y = Math.PI / 2;
      door.position.set(fx, 1.25, h.z);
      scene.add(door);

      [-2.4, 2.4].forEach((dz) => {
        const w1 = new THREE.Mesh(winGeo, glassWinMat);
        w1.rotation.y = Math.PI / 2;
        w1.position.set(fx, 3.8, h.z + dz);
        scene.add(w1);
      });
    } else {
      // Town Hall door & windows facing south
      const door = new THREE.Mesh(doorGeo, woodBenchMat);
      door.position.set(h.x, 1.25, h.z + h.d / 2 + 0.04);
      scene.add(door);
      [-5.2, -2.4, 2.4, 5.2].forEach((dx) => {
        const w = new THREE.Mesh(winGeo, glassWinMat);
        w.position.set(h.x + dx, 4.4, h.z + h.d / 2 + 0.04);
        scene.add(w);
      });
    }

    colliders.push({
      minX: h.x - h.w / 2,
      maxX: h.x + h.w / 2,
      minZ: h.z - h.d / 2,
      maxZ: h.z + h.d / 2,
      maxY: h.h + 0.7,
    });
  });

  // 4. Black Iron Plaza Railings (matching screenshot background!), Park Benches & Cover Planters
  const railPostGeo = new THREE.BoxGeometry(0.14, 1.1, 0.14);
  const railBarGeo = new THREE.BoxGeometry(0.08, 0.08, 7.2);
  const benchSeatGeo = new THREE.BoxGeometry(0.7, 0.12, 2.4);
  const benchLegGeo = new THREE.BoxGeometry(0.6, 0.48, 0.14);
  disposables.push(railPostGeo, railBarGeo, benchSeatGeo, benchLegGeo);

  [
    [-10.2, -10.0],
    [10.2, -10.0],
    [-10.2, -27.5],
    [10.2, -27.5],
    [-10.2, -45.0],
    [10.2, -45.0],
  ].forEach(([rx, rz]) => {
    const barTop = new THREE.Mesh(railBarGeo, darkIronMat);
    barTop.position.set(rx, 0.96, rz);
    const barMid = new THREE.Mesh(railBarGeo, darkIronMat);
    barMid.position.set(rx, 0.52, rz);
    scene.add(barTop, barMid);
    [-3.4, 0, 3.4].forEach((dz) => {
      const post = new THREE.Mesh(railPostGeo, darkIronMat);
      post.position.set(rx, 0.55, rz + dz);
      scene.add(post);
    });
    colliders.push({
      minX: rx - 0.25,
      maxX: rx + 0.25,
      minZ: rz - 3.6,
      maxZ: rz + 3.6,
      maxY: 1.1,
    });
  });

  // Street tactical cover planters / low concrete barriers & Roblox benches
  const planterGeo = new THREE.BoxGeometry(2.6, 1.0, 1.1);
  disposables.push(planterGeo);
  [
    [-3.6, -12.0],
    [3.6, -21.0],
    [-3.6, -32.0],
    [3.6, -42.0],
    [0, -52.5],
  ].forEach(([px, pz]) => {
    const planter = new THREE.Mesh(planterGeo, sidewalkMat);
    planter.position.set(px, 0.5, pz);
    planter.castShadow = true;
    planter.receiveShadow = true;
    planter.userData = { surface: 'concrete' };
    obstacles.push(planter);
    scene.add(planter);
    colliders.push({
      minX: px - 1.3,
      maxX: px + 1.3,
      minZ: pz - 0.55,
      maxZ: pz + 0.55,
      maxY: 1.0,
    });
  });

  // Park benches along the sidewalk
  [
    [-7.6, -9.5],
    [7.6, -9.5],
    [-7.6, -27.5],
    [7.6, -27.5],
  ].forEach(([bx, bz]) => {
    const seat = new THREE.Mesh(benchSeatGeo, woodBenchMat);
    seat.position.set(bx, 0.54, bz);
    const l1 = new THREE.Mesh(benchLegGeo, darkIronMat);
    l1.position.set(bx, 0.24, bz - 0.9);
    const l2 = new THREE.Mesh(benchLegGeo, darkIronMat);
    l2.position.set(bx, 0.24, bz + 0.9);
    scene.add(seat, l1, l2);
    obstacles.push(seat);
  });

  // 5. Classic Blocky Roblox Trees & Streetlamps
  const treeTrunkGeo = new THREE.BoxGeometry(0.65, 3.0, 0.65);
  const treeCanopyGeo = new THREE.BoxGeometry(2.8, 2.5, 2.8);
  const lampPoleGeo = new THREE.CylinderGeometry(0.08, 0.11, 4.6, 8);
  const lampGlobeGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
  const flickerBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfde047,
    emissiveIntensity: 1.45,
    roughness: 0.2,
  });
  disposables.push(treeTrunkGeo, treeCanopyGeo, lampPoleGeo, lampGlobeGeo, flickerBulbMat);

  [
    [-11.8, 12],
    [11.8, 12],
    [-11.8, -11],
    [11.8, -11],
    [-11.8, -28],
    [11.8, -28],
    [-11.8, -45],
    [11.8, -45],
  ].forEach(([tx, tz]) => {
    const trunk = new THREE.Mesh(treeTrunkGeo, trunkMat);
    trunk.position.set(tx, 1.5, tz);
    trunk.castShadow = true;
    const canopy = new THREE.Mesh(treeCanopyGeo, leafMat);
    canopy.position.set(tx, 4.1, tz);
    canopy.castShadow = true;
    scene.add(trunk, canopy);
  });

  let flickerLight: THREE.PointLight | null = null;
  [
    [-6.6, -4],
    [6.6, -4],
    [-6.6, -22],
    [6.6, -22],
    [-6.6, -40],
    [6.6, -40],
  ].forEach(([lx, lz], idx) => {
    const pole = new THREE.Mesh(lampPoleGeo, darkIronMat);
    pole.position.set(lx, 2.3, lz);
    const globe = new THREE.Mesh(lampGlobeGeo, flickerBulbMat);
    globe.position.set(lx, 4.75, lz);
    scene.add(pole, globe);
    if (idx === 0) {
      flickerLight = new THREE.PointLight(0xfff3b0, 1.6, 18, 1.6);
      flickerLight.position.set(lx, 4.75, lz);
      scene.add(flickerLight);
    }
  });

  // 6. Floating Sunny Pollen Motes
  const dustCount = 140;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 38;
    dustPos[i * 3 + 1] = 0.6 + Math.random() * 6.5;
    dustPos[i * 3 + 2] = 14 - Math.random() * 74;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xfef9c3,
    size: 0.06,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const dustParticles = new THREE.Points(dustGeo, dustMat);
  scene.add(dustParticles);
  disposables.push(dustGeo, dustMat);

  // 7. La Carpa del Capitán Coronel in Pueblo Desconocido
  addCoronelTent(
    scene,
    colliders,
    obstacles,
    fireLights,
    disposables,
    [-13.0, 0, 7.0],
    0.52,
    asphaltMat
  );

  return {
    colliders,
    obstacles,
    flickerLight: flickerLight ?? fireLights[0],
    flickerBulbMat,
    fireLights,
    fireMeshes,
    dustParticles,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

export function createDuel1v1Map(
  scene: THREE.Scene,
  maxAnisotropy: number
): AbandonedCityBundle {
  const disposables: Array<{ dispose: () => void }> = [];
  const colliders: BoxCollider[] = [];
  const obstacles: THREE.Mesh[] = [];
  const fireLights: THREE.PointLight[] = [];
  const fireMeshes: THREE.Mesh[] = [];

  scene.background = new THREE.Color(0x0b1628);
  scene.fog = new THREE.FogExp2(0x0d1b30, 0.0085);

  const skyGeo = new THREE.SphereGeometry(220, 24, 16);
  const skyTex = createSkyDomeTexture();
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);
  disposables.push(skyGeo, skyTex, skyMat);

  // Crisp bright stadium lighting for 1v1 building clarity
  const hemi = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 1.35);
  const sun = new THREE.DirectionalLight(0xfffbeb, 1.65);
  sun.position.set(22, 36, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 110;
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  scene.add(hemi, sun);

  // 4m x 4m Creative Build-Aligned Floor Canvas Texture
  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = 512;
  floorCanvas.height = 512;
  const fctx = floorCanvas.getContext('2d')!;
  fctx.fillStyle = '#172337';
  fctx.fillRect(0, 0, 512, 512);
  fctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
  fctx.lineWidth = 5;
  fctx.strokeRect(2, 2, 508, 508);
  fctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
  fctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    fctx.beginPath();
    fctx.moveTo(i * 128, 0);
    fctx.lineTo(i * 128, 512);
    fctx.stroke();
    fctx.beginPath();
    fctx.moveTo(0, i * 128);
    fctx.lineTo(512, i * 128);
    fctx.stroke();
  }
  const gridTex = new THREE.CanvasTexture(floorCanvas);
  gridTex.wrapS = THREE.RepeatWrapping;
  gridTex.wrapT = THREE.RepeatWrapping;
  gridTex.repeat.set(19, 19); // 76m / 4m = 19 exact 4m build cells!
  gridTex.anisotropy = maxAnisotropy;
  gridTex.colorSpace = THREE.SRGBColorSpace;
  disposables.push(gridTex);

  const floorGeo = new THREE.PlaneGeometry(76, 76);
  const floorMat = new THREE.MeshStandardMaterial({
    map: gridTex,
    roughness: 0.72,
    metalness: 0.14,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData = { surface: 'concrete' };
  obstacles.push(floor);
  scene.add(floor);
  disposables.push(floorGeo, floorMat);

  // Opposing 1v1 Duel Pads (Blue +Z vs Amber -Z) centered on grid cells
  const bluePadMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.75,
    roughness: 0.35,
  });
  const amberPadMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    emissive: 0xd97706,
    emissiveIntensity: 0.75,
    roughness: 0.35,
  });
  const wallPanelMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.65,
    metalness: 0.4,
  });
  const neonTrimMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });
  const flickerBulbMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    emissiveIntensity: 2.2,
  });
  disposables.push(bluePadMat, amberPadMat, wallPanelMat, neonTrimMat, flickerBulbMat);

  const padGeo = new THREE.BoxGeometry(3.8, 0.08, 3.8);
  const padBlue = new THREE.Mesh(padGeo, bluePadMat);
  padBlue.position.set(0, 0.04, 12);
  padBlue.receiveShadow = true;
  const padAmber = new THREE.Mesh(padGeo, amberPadMat);
  padAmber.position.set(0, 0.04, -12);
  padAmber.receiveShadow = true;
  scene.add(padBlue, padAmber);
  disposables.push(padGeo);

  // Perimeter sleek arena walls at ±36m
  const wallNSGeo = new THREE.BoxGeometry(74, 8, 1.2);
  const wallEWGeo = new THREE.BoxGeometry(1.2, 8, 74);
  const stripNSGeo = new THREE.BoxGeometry(72, 0.18, 0.14);
  const stripEWGeo = new THREE.BoxGeometry(0.14, 0.18, 72);
  disposables.push(wallNSGeo, wallEWGeo, stripNSGeo, stripEWGeo);

  [
    { pos: [0, 4, -36.5] as [number, number, number], geo: wallNSGeo, col: { minX: -37, maxX: 37, minZ: -37.2, maxZ: -35.8 } },
    { pos: [0, 4, 36.5] as [number, number, number], geo: wallNSGeo, col: { minX: -37, maxX: 37, minZ: 35.8, maxZ: 37.2 } },
    { pos: [-36.5, 4, 0] as [number, number, number], geo: wallEWGeo, col: { minX: -37.2, maxX: -35.8, minZ: -37, maxZ: 37 } },
    { pos: [36.5, 4, 0] as [number, number, number], geo: wallEWGeo, col: { minX: 35.8, maxX: 37.2, minZ: -37, maxZ: 37 } },
  ].forEach((w) => {
    const mesh = new THREE.Mesh(w.geo, wallPanelMat);
    mesh.position.set(...w.pos);
    mesh.receiveShadow = true;
    mesh.userData = { surface: 'metal' };
    obstacles.push(mesh);
    scene.add(mesh);
    colliders.push({ ...w.col, maxY: 9 });
  });

  const stripN = new THREE.Mesh(stripNSGeo, neonTrimMat);
  stripN.position.set(0, 4.2, -35.8);
  const stripS = new THREE.Mesh(stripNSGeo, neonTrimMat);
  stripS.position.set(0, 4.2, 35.8);
  const stripW = new THREE.Mesh(stripEWGeo, neonTrimMat);
  stripW.position.set(-35.8, 4.2, 0);
  const stripE = new THREE.Mesh(stripEWGeo, neonTrimMat);
  stripE.position.set(35.8, 4.2, 0);
  scene.add(stripN, stripS, stripW, stripE);

  // Corner floodlight towers
  const towerGeo = new THREE.BoxGeometry(0.9, 10, 0.9);
  const bulbGeo = new THREE.BoxGeometry(1.4, 0.5, 0.4);
  disposables.push(towerGeo, bulbGeo);

  let flickerLight: THREE.PointLight | null = null;
  [
    [-33, -33],
    [33, -33],
    [-33, 33],
    [33, 33],
  ].forEach(([tx, tz], idx) => {
    const tower = new THREE.Mesh(towerGeo, wallPanelMat);
    tower.position.set(tx, 5, tz);
    const bulb = new THREE.Mesh(bulbGeo, flickerBulbMat);
    bulb.position.set(tx, 9.6, tz);
    bulb.lookAt(0, 0, 0);
    scene.add(tower, bulb);
    if (idx === 0) {
      flickerLight = new THREE.PointLight(0x7dd3fc, 2.5, 45, 1.4);
      flickerLight.position.set(tx * 0.85, 9.2, tz * 0.85);
      scene.add(flickerLight);
    }
  });

  // Subtle ambient dust motes
  const dustCount = 90;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 60;
    dustPos[i * 3 + 1] = 0.8 + Math.random() * 9;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xbae6fd,
    size: 0.055,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const dustParticles = new THREE.Points(dustGeo, dustMat);
  scene.add(dustParticles);
  disposables.push(dustGeo, dustMat);

  return {
    colliders,
    obstacles,
    flickerLight: flickerLight ?? new THREE.PointLight(0x7dd3fc, 1.5, 30),
    flickerBulbMat,
    fireLights,
    fireMeshes,
    dustParticles,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

function createNightCampSkyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#02040a');
  grad.addColorStop(0.35, '#070b18');
  grad.addColorStop(0.65, '#120d1d');
  grad.addColorStop(0.88, '#180c12');
  grad.addColorStop(1.0, '#05060b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  let seed = 9311;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 380; i++) {
    const x = rand() * 1024;
    const y = rand() * 260;
    const r = 0.5 + rand() * 1.3;
    const alpha = 0.25 + rand() * 0.72;
    ctx.fillStyle = `rgba(220, 232, 255, ${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Blood-tinted full moon over the dark forest
  const moonX = 680;
  const moonY = 122;
  const halo = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 145);
  halo.addColorStop(0, 'rgba(255, 205, 175, 0.42)');
  halo.addColorStop(0.4, 'rgba(185, 70, 55, 0.16)');
  halo.addColorStop(1, 'rgba(40, 20, 30, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 1024, 512);

  ctx.fillStyle = '#ffe4d6';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 18, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createNightCampMap(
  scene: THREE.Scene,
  maxAnisotropy: number
): AbandonedCityBundle {
  const disposables: Array<{ dispose: () => void }> = [];
  const colliders: BoxCollider[] = [];
  const obstacles: THREE.Mesh[] = [];
  const fireLights: THREE.PointLight[] = [];
  const fireMeshes: THREE.Mesh[] = [];

  scene.background = new THREE.Color(0x060812);
  scene.fog = new THREE.FogExp2(0x090b16, 0.0155);

  const skyGeo = new THREE.SphereGeometry(220, 24, 16);
  const skyTex = createNightCampSkyTexture();
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);
  disposables.push(skyGeo, skyTex, skyMat);

  // Dark forest moss & pine-needle ground texture
  const groundCanvas = document.createElement('canvas');
  groundCanvas.width = 256;
  groundCanvas.height = 256;
  const gctx = groundCanvas.getContext('2d')!;
  gctx.fillStyle = '#121a11';
  gctx.fillRect(0, 0, 256, 256);
  let gSeed = 4417;
  const gRand = () => {
    gSeed = (gSeed * 16807) % 2147483647;
    return (gSeed - 1) / 2147483646;
  };
  for (let i = 0; i < 3400; i++) {
    const x = gRand() * 256;
    const y = gRand() * 256;
    const w = 1 + gRand() * 3.5;
    const h = 1 + gRand() * 2.2;
    const r = gRand();
    gctx.fillStyle =
      r < 0.35 ? 'rgba(26, 40, 20, 0.58)' : r < 0.7 ? 'rgba(36, 26, 18, 0.55)' : 'rgba(13, 18, 12, 0.6)';
    gctx.fillRect(x, y, w, h);
  }
  const groundTex = new THREE.CanvasTexture(groundCanvas);
  groundTex.colorSpace = THREE.SRGBColorSpace;
  groundTex.wrapS = THREE.RepeatWrapping;
  groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(22, 22);
  groundTex.anisotropy = maxAnisotropy;
  disposables.push(groundTex);

  const floorGeo = new THREE.PlaneGeometry(140, 140);
  const floorMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.94,
    metalness: 0.02,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData = { surface: 'concrete' };
  obstacles.push(floor);
  scene.add(floor);
  disposables.push(floorGeo, floorMat);

  // Trampled dirt clearing in center
  const clearingGeo = new THREE.CircleGeometry(15.5, 28);
  const clearingMat = new THREE.MeshStandardMaterial({
    color: 0x261d14,
    roughness: 0.96,
    metalness: 0.01,
  });
  const clearing = new THREE.Mesh(clearingGeo, clearingMat);
  clearing.rotation.x = -Math.PI / 2;
  clearing.position.set(0, 0.015, -14);
  clearing.receiveShadow = true;
  scene.add(clearing);
  disposables.push(clearingGeo, clearingMat);

  // Materials for timber cover, crates, rocks, and pine trees
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x3b2819, roughness: 0.92, metalness: 0.03 });
  const woodCrateMat = new THREE.MeshStandardMaterial({ color: 0x5c3d22, roughness: 0.85, metalness: 0.06 });
  const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x6b6048, roughness: 0.94, metalness: 0.02 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3f434a, roughness: 0.9, metalness: 0.08 });
  const pineMats = [
    new THREE.MeshStandardMaterial({ color: 0x0f2518, roughness: 0.9, metalness: 0.02 }),
    new THREE.MeshStandardMaterial({ color: 0x153120, roughness: 0.9, metalness: 0.02 }),
    new THREE.MeshStandardMaterial({ color: 0x0c1e14, roughness: 0.9, metalness: 0.02 }),
  ];
  disposables.push(barkMat, woodCrateMat, sandbagMat, stoneMat, ...pineMats);

  // Central campfire clearing at (0, 0, -2)
  const firePos = new THREE.Vector3(0, 0, -2);
  const stoneGeo = new THREE.DodecahedronGeometry(0.28, 0);
  disposables.push(stoneGeo);
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const st = new THREE.Mesh(stoneGeo, stoneMat);
    st.position.set(firePos.x + Math.cos(ang) * 1.15, 0.16, firePos.z + Math.sin(ang) * 1.15);
    st.scale.set(1.15, 0.72, 1.0);
    st.rotation.y = ang;
    st.castShadow = true;
    st.receiveShadow = true;
    scene.add(st);
  }

  const logGeo = new THREE.CylinderGeometry(0.11, 0.13, 1.45, 8);
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0x261209,
    emissive: 0xff4500,
    emissiveIntensity: 1.4,
    roughness: 0.75,
  });
  disposables.push(logGeo, emberMat);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const lg = new THREE.Mesh(logGeo, emberMat);
    lg.position.set(firePos.x + Math.cos(a) * 0.25, 0.22, firePos.z + Math.sin(a) * 0.25);
    lg.rotation.z = Math.PI / 2 - 0.32;
    lg.rotation.y = a;
    scene.add(lg);
  }

  const outerFlameGeo = new THREE.ConeGeometry(0.45, 1.45, 7);
  const innerFlameGeo = new THREE.ConeGeometry(0.24, 0.92, 6);
  const flameOuterMat = new THREE.MeshBasicMaterial({
    color: 0xff6a00,
    transparent: true,
    opacity: 0.86,
  });
  const flameInnerMat = new THREE.MeshBasicMaterial({
    color: 0xffe066,
    transparent: true,
    opacity: 0.94,
  });
  disposables.push(outerFlameGeo, innerFlameGeo, flameOuterMat, flameInnerMat);

  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(
      i < 2 ? outerFlameGeo : innerFlameGeo,
      i < 2 ? flameOuterMat : flameInnerMat
    );
    f.position.set(
      firePos.x + (Math.random() - 0.5) * 0.25,
      0.55 + (i % 2) * 0.12,
      firePos.z + (Math.random() - 0.5) * 0.25
    );
    scene.add(f);
    fireMeshes.push(f);
  }

  const fireLight = new THREE.PointLight(0xff7b24, 4.2, 26, 1.4);
  fireLight.position.set(firePos.x, 1.4, firePos.z);
  fireLight.castShadow = true;
  scene.add(fireLight);
  fireLights.push(fireLight);

  // Additional camp lanterns along the clearing edges so all 5 bosses are readable
  const flickerBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.8,
  });
  const lanternGeo = new THREE.SphereGeometry(0.18, 10, 10);
  const postGeo = new THREE.CylinderGeometry(0.08, 0.1, 2.5, 8);
  disposables.push(flickerBulbMat, lanternGeo, postGeo);

  let flickerLight: THREE.PointLight | null = null;
  [
    [-11, -18],
    [11, -18],
    [-12, -38],
    [12, -38],
    [0, -48],
  ].forEach(([lx, lz], idx) => {
    const post = new THREE.Mesh(postGeo, barkMat);
    post.position.set(lx, 1.25, lz);
    post.castShadow = true;
    const bulb = new THREE.Mesh(lanternGeo, flickerBulbMat);
    bulb.position.set(lx, 2.55, lz);
    scene.add(post, bulb);

    const pt = new THREE.PointLight(0xff9e3d, 2.6, 26, 1.4);
    pt.position.set(lx, 2.55, lz);
    scene.add(pt);
    fireLights.push(pt);
    if (idx === 0) flickerLight = pt;
  });

  // Tactical military crates & sandbag barricades (solid cover against 5 bosses!)
  const crateGeo = new THREE.BoxGeometry(1.8, 1.25, 1.4);
  const wallGeo = new THREE.BoxGeometry(3.4, 1.25, 0.9);
  const boulderGeo = new THREE.DodecahedronGeometry(1.5, 0);
  disposables.push(crateGeo, wallGeo, boulderGeo);

  const coverSpots: Array<{ x: number; z: number; kind: 'wall' | 'crate' | 'rock'; rotY?: number }> = [
    { x: -6.2, z: -9.5, kind: 'wall', rotY: 0.15 },
    { x: 6.2, z: -9.5, kind: 'wall', rotY: -0.15 },
    { x: -10.5, z: -22.0, kind: 'crate', rotY: 0.4 },
    { x: 10.5, z: -22.0, kind: 'crate', rotY: -0.4 },
    { x: 0.0, z: -26.0, kind: 'wall', rotY: 0 },
    { x: -7.5, z: -36.0, kind: 'rock' },
    { x: 7.5, z: -36.0, kind: 'rock' },
    { x: -14.0, z: -4.0, kind: 'rock' },
    { x: 14.0, z: -4.0, kind: 'rock' },
  ];

  coverSpots.forEach((spot) => {
    if (spot.kind === 'wall') {
      const m = new THREE.Mesh(wallGeo, sandbagMat);
      m.position.set(spot.x, 0.625, spot.z);
      m.rotation.y = spot.rotY ?? 0;
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData = { surface: 'concrete' };
      obstacles.push(m);
      scene.add(m);
      colliders.push({
        minX: spot.x - 1.75,
        maxX: spot.x + 1.75,
        minZ: spot.z - 0.65,
        maxZ: spot.z + 0.65,
        maxY: 1.35,
      });
    } else if (spot.kind === 'crate') {
      const m = new THREE.Mesh(crateGeo, woodCrateMat);
      m.position.set(spot.x, 0.625, spot.z);
      m.rotation.y = spot.rotY ?? 0;
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData = { surface: 'concrete' };
      obstacles.push(m);
      scene.add(m);
      colliders.push({
        minX: spot.x - 1.0,
        maxX: spot.x + 1.0,
        minZ: spot.z - 0.85,
        maxZ: spot.z + 0.85,
        maxY: 1.35,
      });
    } else {
      const m = new THREE.Mesh(boulderGeo, stoneMat);
      m.position.set(spot.x, 0.9, spot.z);
      m.scale.set(1.15, 0.85, 1.05);
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData = { surface: 'concrete' };
      obstacles.push(m);
      scene.add(m);
      colliders.push({
        minX: spot.x - 1.4,
        maxX: spot.x + 1.4,
        minZ: spot.z - 1.4,
        maxZ: spot.z + 1.4,
        maxY: 2.1,
      });
    }
  });

  // Dense nocturnal pine forest perimeter enclosing the battlegrounds
  const trunkGeo = new THREE.CylinderGeometry(0.24, 0.34, 2.4, 7);
  const cone1Geo = new THREE.ConeGeometry(1.75, 2.8, 7);
  const cone2Geo = new THREE.ConeGeometry(1.38, 2.4, 7);
  const cone3Geo = new THREE.ConeGeometry(0.95, 2.0, 7);
  disposables.push(trunkGeo, cone1Geo, cone2Geo, cone3Geo);

  const addPine = (px: number, pz: number, scale = 1, matIdx = 0) => {
    const g = new THREE.Group();
    g.position.set(px, 0, pz);
    g.scale.setScalar(scale);
    const trunk = new THREE.Mesh(trunkGeo, barkMat);
    trunk.position.y = 1.2;
    trunk.castShadow = true;
    const fMat = pineMats[matIdx % pineMats.length];
    const c1 = new THREE.Mesh(cone1Geo, fMat);
    c1.position.y = 2.9;
    c1.castShadow = true;
    const c2 = new THREE.Mesh(cone2Geo, fMat);
    c2.position.y = 4.3;
    c2.castShadow = true;
    const c3 = new THREE.Mesh(cone3Geo, fMat);
    c3.position.y = 5.5;
    c3.castShadow = true;
    g.add(trunk, c1, c2, c3);
    scene.add(g);
  };

  let pIdx = 0;
  for (let z = -60; z <= 20; z += 4.5) {
    addPine(-23.0 - (pIdx % 2) * 2.2, z, 1.05 + (pIdx % 3) * 0.14, pIdx);
    addPine(23.0 + (pIdx % 2) * 2.2, z, 1.05 + ((pIdx + 1) % 3) * 0.14, pIdx + 1);
    pIdx += 1;
  }
  for (let x = -22; x <= 22; x += 4.4) {
    addPine(x, -60.5 - (pIdx % 2) * 2.0, 1.15 + (pIdx % 3) * 0.12, pIdx);
    addPine(x, 19.5 + (pIdx % 2) * 2.0, 1.1 + ((pIdx + 1) % 3) * 0.12, pIdx + 2);
    pIdx += 1;
  }

  // Invisible perimeter collider walls keeping everyone inside the clearing
  colliders.push(
    { minX: -24, maxX: -21.5, minZ: -64, maxZ: 22, maxY: 8 },
    { minX: 21.5, maxX: 24, minZ: -64, maxZ: 22, maxY: 8 },
    { minX: -24, maxX: 24, minZ: -63, maxZ: -60.5, maxY: 8 },
    { minX: -24, maxX: 24, minZ: 18.2, maxZ: 21, maxY: 8 }
  );

  // La Carpa del Capitán Coronel in Night Camp
  addCoronelTent(
    scene,
    colliders,
    obstacles,
    fireLights,
    disposables,
    [-13.2, 0, 7.2],
    0.52,
    woodCrateMat
  );

  // Floating nocturnal fireflies & campfire embers
  const dustCount = 130;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 40;
    dustPos[i * 3 + 1] = 0.6 + Math.random() * 6.5;
    dustPos[i * 3 + 2] = -52 + Math.random() * 66;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xfdba74,
    size: 0.085,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });
  const dustParticles = new THREE.Points(dustGeo, dustMat);
  scene.add(dustParticles);
  disposables.push(dustGeo, dustMat);

  return {
    colliders,
    obstacles,
    flickerLight: flickerLight ?? fireLight,
    flickerBulbMat,
    fireLights,
    fireMeshes,
    dustParticles,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}






