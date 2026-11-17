import * as THREE from 'three';
import { createChickenInstructor, type ChickenNpcHandle } from './chickenNpc';
import { EnemyFactory, type ActiveEnemy } from './enemies';
import { createCaptainPolloMesh } from './weapons';

import type { MapId } from './types';

export type DeployBoardAction =
  | MapId
  | 'back'
  | 'to_extras'
  | 'to_main'
  | 'locked_slot';

export type DeployBoardPage = 'main' | 'extras';

export interface DeployBoardButton {
  action: DeployBoardAction;
  page: DeployBoardPage | 'both';
  title: string;
  description: string;
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  baseZ: number;
  baseX?: number;
  hovered: boolean;
  isArrow?: boolean;
}

export interface NightForestMenuBundle {
  fireLights: THREE.PointLight[];
  fireMeshes: THREE.Mesh[];
  deployButtons: DeployBoardButton[];
  captainPolloMeshes: THREE.Object3D[];
  triggerCaptainPolloHop: () => void;
  setHoveredBoardAction: (action: DeployBoardAction | null) => void;
  getBoardPage: () => DeployBoardPage;
  setBoardPage: (page: DeployBoardPage) => void;
  update: (delta: number, elapsed: number) => void;
  dispose: () => void;
}

function createNightSkyDomeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#03060f');
  grad.addColorStop(0.35, '#070d1d');
  grad.addColorStop(0.62, '#0d172b');
  grad.addColorStop(0.85, '#0a1220');
  grad.addColorStop(1.0, '#04070e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle starfield
  let seed = 4219;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 360; i++) {
    const x = rand() * 1024;
    const y = rand() * 255;
    const r = 0.5 + rand() * 1.25;
    const alpha = 0.25 + rand() * 0.7;
    ctx.fillStyle = `rgba(215, 228, 255, ${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft moon glow & crescent
  const moonX = 760;
  const moonY = 128;
  const halo = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 130);
  halo.addColorStop(0, 'rgba(185, 210, 255, 0.36)');
  halo.addColorStop(0.35, 'rgba(110, 145, 210, 0.14)');
  halo.addColorStop(1, 'rgba(40, 70, 130, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 1024, 512);

  ctx.fillStyle = '#dce8ff';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 16, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createForestGroundTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#151c14';
  ctx.fillRect(0, 0, size, size);

  let seed = 8821;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Moss, damp soil and fallen pine needle specks
  for (let i = 0; i < 3200; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const w = 1 + rand() * 3.5;
    const h = 1 + rand() * 2;
    const roll = rand();
    if (roll < 0.35) ctx.fillStyle = 'rgba(28, 42, 24, 0.55)';
    else if (roll < 0.7) ctx.fillStyle = 'rgba(38, 29, 20, 0.55)';
    else ctx.fillStyle = 'rgba(16, 22, 15, 0.6)';
    ctx.fillRect(x, y, w, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 22);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createDeployBoardTexture(
  headerText: string,
  footerHint: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1408;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  // Weathered dark pine planks background
  ctx.fillStyle = '#382416';
  ctx.fillRect(0, 0, 1408, 768);

  for (let p = 0; p < 10; p++) {
    const y = p * 77;
    ctx.fillStyle = p % 2 === 0 ? 'rgba(72, 46, 28, 0.45)' : 'rgba(26, 17, 10, 0.35)';
    ctx.fillRect(0, y, 1408, 75);
    ctx.fillStyle = 'rgba(12, 8, 5, 0.78)';
    ctx.fillRect(0, y + 74, 1408, 3);
  }

  // Dark slate tactical board field inset (wide 8-slot layout)
  ctx.fillStyle = '#101620';
  ctx.fillRect(36, 94, 1336, 642);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 5;
  ctx.strokeRect(36, 94, 1336, 642);

  // Brass corner rivets
  const rivets: Array<[number, number]> = [
    [54, 112],
    [1354, 112],
    [54, 718],
    [1354, 718],
  ];
  for (const [rx, ry] of rivets) {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(rx, ry, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Top carved stencil banner
  ctx.fillStyle = accentHex;
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(headerText, 704, 62);

  // Subtle tactical grid lines on slate
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
  ctx.lineWidth = 1.5;
  for (let gx = 84; gx < 1356; gx += 68) {
    ctx.beginPath();
    ctx.moveTo(gx, 106);
    ctx.lineTo(gx, 724);
    ctx.stroke();
  }
  for (let gy = 132; gy < 724; gy += 68) {
    ctx.beginPath();
    ctx.moveTo(48, gy);
    ctx.lineTo(1360, gy);
    ctx.stroke();
  }

  // Subtle bottom-right tactical stamp
  ctx.fillStyle = 'rgba(241, 245, 249, 0.58)';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(footerHint, 1344, 692);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createPlaqueTexture(
  title: string,
  subtitle: string,
  accentColor: string,
  bgHex: string,
  mode: 'map' | 'back' | 'locked',
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = mode === 'back' ? 560 : 896;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle wood/slate bevel border
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  // Left color stripe
  ctx.fillStyle = accentColor;
  ctx.fillRect(8, 8, 18, canvas.height - 16);

  // Brass mounting rivets on corners
  ctx.fillStyle = mode === 'locked' ? '#64748b' : '#fbbf24';
  for (const [rx, ry] of [
    [40, 22],
    [canvas.width - 22, 22],
    [40, canvas.height - 22],
    [canvas.width - 22, canvas.height - 22],
  ]) {
    ctx.beginPath();
    ctx.arc(rx, ry, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (mode === 'back') {
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, canvas.width / 2 + 8, canvas.height / 2);
  } else if (mode === 'locked') {
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, 44, 66);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 21px sans-serif';
    ctx.fillText(subtitle, 44, 114);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.strokeRect(canvas.width - 178, 48, 146, 62);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 21px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PRONTO', canvas.width - 105, 80);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 33px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, 44, 64);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(subtitle, 44, 114);

    // Right deploy badge
    ctx.fillStyle = accentColor;
    ctx.fillRect(canvas.width - 196, 46, 162, 64);
    ctx.fillStyle = '#0b0f17';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('JUGAR ›', canvas.width - 115, 79);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createArrowSignTexture(
  label: string,
  subLabel: string,
  dir: 'right' | 'left',
  accentColor: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1f160f';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 240);

  // Prominent directional arrow glyph
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  if (dir === 'right') {
    ctx.moveTo(356, 42);
    ctx.lineTo(466, 128);
    ctx.lineTo(356, 214);
    ctx.lineTo(356, 166);
    ctx.lineTo(298, 166);
    ctx.lineTo(298, 90);
    ctx.lineTo(356, 90);
  } else {
    ctx.moveTo(156, 42);
    ctx.lineTo(46, 128);
    ctx.lineTo(156, 214);
    ctx.lineTo(156, 166);
    ctx.lineTo(214, 166);
    ctx.lineTo(214, 90);
    ctx.lineTo(156, 90);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 46px sans-serif';
  ctx.textAlign = dir === 'right' ? 'left' : 'right';
  ctx.textBaseline = 'alphabetic';
  const tx = dir === 'right' ? 32 : 480;
  ctx.fillText(label, tx, 114);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(subLabel, tx, 168);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createSleepZTexture(char: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 96, 96);

  ctx.font = 'bold 62px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(12, 18, 30, 0.85)';
  ctx.strokeText(char, 48, 50);
  ctx.fillStyle = '#fde68a';
  ctx.fillText(char, 48, 50);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createNightForestMenuScene(
  scene: THREE.Scene,
  maxAnisotropy: number
): NightForestMenuBundle {
  const disposables: Array<{ dispose: () => void }> = [];
  const fireLights: THREE.PointLight[] = [];
  const fireMeshes: THREE.Mesh[] = [];

  // 1. Night Sky Dome
  const skyTex = createNightSkyDomeTexture();
  const skyGeo = new THREE.SphereGeometry(180, 32, 20);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    fog: false,
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);
  disposables.push(skyTex, skyGeo, skyMat);

  // 2. Dark Mossy Forest Floor
  const groundTex = createForestGroundTexture(maxAnisotropy);
  const groundGeo = new THREE.PlaneGeometry(160, 160);
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.96,
    metalness: 0.02,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  disposables.push(groundTex, groundGeo, groundMat);

  // Campfire clearing dirt & ash patch
  const fireCenter = new THREE.Vector3(1.25, 0, -0.55);

  const clearingGeo = new THREE.CircleGeometry(4.4, 32);
  const clearingMat = new THREE.MeshStandardMaterial({
    color: 0x241d17,
    roughness: 0.98,
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const clearingMesh = new THREE.Mesh(clearingGeo, clearingMat);
  clearingMesh.rotation.x = -Math.PI / 2;
  clearingMesh.position.set(fireCenter.x, 0.012, fireCenter.z);
  clearingMesh.receiveShadow = true;
  scene.add(clearingMesh);
  disposables.push(clearingGeo, clearingMat);

  // 3. Detailed Campfire (La Fogata)
  const fireGroup = new THREE.Group();
  fireGroup.position.copy(fireCenter);
  scene.add(fireGroup);

  const stoneGeo = new THREE.DodecahedronGeometry(0.18, 0);
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x3b4048,
    roughness: 0.92,
    metalness: 0.06,
  });
  disposables.push(stoneGeo, stoneMat);

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const r = 0.72 + (i % 2) * 0.05;
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.position.set(Math.cos(angle) * r, 0.09, Math.sin(angle) * r);
    stone.scale.set(1.1 + (i % 3) * 0.16, 0.75 + (i % 2) * 0.2, 1.0);
    stone.rotation.set(i * 0.7, angle, i * 0.4);
    stone.castShadow = true;
    stone.receiveShadow = true;
    fireGroup.add(stone);
  }

  // Ash & glowing ember bed
  const emberBedGeo = new THREE.CircleGeometry(0.62, 20);
  const emberBedMat = new THREE.MeshStandardMaterial({
    color: 0x2a140c,
    emissive: 0xd9480f,
    emissiveIntensity: 1.35,
    roughness: 0.95,
  });
  const emberBed = new THREE.Mesh(emberBedGeo, emberBedMat);
  emberBed.rotation.x = -Math.PI / 2;
  emberBed.position.y = 0.028;
  fireGroup.add(emberBed);
  disposables.push(emberBedGeo, emberBedMat);

  // Charred firewood logs crossed over embers
  const logGeo = new THREE.CylinderGeometry(0.075, 0.09, 1.05, 9);
  const charredLogMat = new THREE.MeshStandardMaterial({
    color: 0x2f2015,
    emissive: 0x451204,
    emissiveIntensity: 0.45,
    roughness: 0.94,
  });
  disposables.push(logGeo, charredLogMat);

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + 0.3;
    const log = new THREE.Mesh(logGeo, charredLogMat);
    log.position.set(Math.cos(angle) * 0.16, 0.15, Math.sin(angle) * 0.16);
    log.rotation.z = Math.PI / 2 - 0.34;
    log.rotation.y = angle;
    log.castShadow = true;
    fireGroup.add(log);
  }

  // Multi-layered animated 3D flames
  const outerFlameGeo = new THREE.ConeGeometry(0.24, 0.85, 7);
  const innerFlameGeo = new THREE.ConeGeometry(0.14, 0.56, 7);
  const outerFlameMat = new THREE.MeshBasicMaterial({
    color: 0xff6b1a,
    transparent: true,
    opacity: 0.88,
  });
  const midFlameMat = new THREE.MeshBasicMaterial({
    color: 0xff9f1c,
    transparent: true,
    opacity: 0.92,
  });
  const innerFlameMat = new THREE.MeshBasicMaterial({
    color: 0xffe066,
    transparent: true,
    opacity: 0.95,
  });
  disposables.push(outerFlameGeo, innerFlameGeo, outerFlameMat, midFlameMat, innerFlameMat);

  const flameConfigs = [
    { x: 0, z: 0, geo: outerFlameGeo, mat: outerFlameMat, h: 0.42, s: 1.05 },
    { x: 0.11, z: 0.07, geo: outerFlameGeo, mat: midFlameMat, h: 0.36, s: 0.82 },
    { x: -0.1, z: 0.09, geo: outerFlameGeo, mat: outerFlameMat, h: 0.35, s: 0.78 },
    { x: 0.04, z: -0.1, geo: outerFlameGeo, mat: midFlameMat, h: 0.34, s: 0.76 },
    { x: 0, z: 0.02, geo: innerFlameGeo, mat: innerFlameMat, h: 0.3, s: 0.95 },
    { x: -0.05, z: -0.03, geo: innerFlameGeo, mat: innerFlameMat, h: 0.27, s: 0.78 },
  ];

  flameConfigs.forEach((cfg) => {
    const fMesh = new THREE.Mesh(cfg.geo, cfg.mat);
    fMesh.position.set(cfg.x, cfg.h, cfg.z);
    fMesh.scale.setScalar(cfg.s);
    fireGroup.add(fMesh);
    fireMeshes.push(fMesh);
  });

  // Warm Campfire PointLight + gentle low ground bounce light
  const campLight = new THREE.PointLight(0xff7722, 6.2, 24, 1.45);
  campLight.position.set(0, 0.85, 0);
  campLight.castShadow = true;
  campLight.shadow.mapSize.set(1024, 1024);
  campLight.shadow.bias = -0.001;
  fireGroup.add(campLight);
  fireLights.push(campLight);

  // Rising campfire embers
  const emberCount = 48;
  const emberPositions = new Float32Array(emberCount * 3);
  const emberSeeds = new Float32Array(emberCount * 3);
  for (let i = 0; i < emberCount; i++) {
    emberSeeds[i * 3] = Math.random() * Math.PI * 2;
    emberSeeds[i * 3 + 1] = 0.6 + Math.random() * 1.1; // rise speed
    emberSeeds[i * 3 + 2] = Math.random() * 4.5; // height phase
    emberPositions[i * 3] = fireCenter.x + (Math.random() - 0.5) * 0.4;
    emberPositions[i * 3 + 1] = 0.25 + Math.random() * 3.8;
    emberPositions[i * 3 + 2] = fireCenter.z + (Math.random() - 0.5) * 0.4;
  }
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
  const emberMat = new THREE.PointsMaterial({
    color: 0xffa94d,
    size: 0.065,
    transparent: true,
    opacity: 0.85,
  });
  const emberPoints = new THREE.Points(emberGeo, emberMat);
  scene.add(emberPoints);
  disposables.push(emberGeo, emberMat);

  // 4. Camp Props: Sitting Logs, Tactical Supply Crate with Lantern, Coronel Plumaje
  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x3b281a,
    roughness: 0.92,
    metalness: 0.04,
  });
  const cutWoodMat = new THREE.MeshStandardMaterial({
    color: 0x6e4e30,
    roughness: 0.88,
    metalness: 0.02,
  });
  const benchGeo = new THREE.CylinderGeometry(0.22, 0.24, 1.85, 10);
  disposables.push(barkMat, cutWoodMat, benchGeo);

  const bench1 = new THREE.Mesh(benchGeo, barkMat);
  bench1.position.set(fireCenter.x + 1.85, 0.21, fireCenter.z + 0.45);
  bench1.rotation.z = Math.PI / 2;
  bench1.rotation.y = 0.42;
  bench1.castShadow = true;
  bench1.receiveShadow = true;

  const bench2 = new THREE.Mesh(benchGeo, barkMat);
  bench2.position.set(fireCenter.x - 0.25, 0.21, fireCenter.z - 2.05);
  bench2.rotation.z = Math.PI / 2;
  bench2.rotation.y = -0.18;
  bench2.castShadow = true;
  bench2.receiveShadow = true;
  scene.add(bench1, bench2);

  // Supply crate + warm lantern near campfire
  const crateGroup = new THREE.Group();
  crateGroup.position.set(fireCenter.x + 2.35, 0, fireCenter.z - 1.35);
  crateGroup.rotation.y = -0.45;
  const crateGeo = new THREE.BoxGeometry(0.92, 0.56, 0.62);
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x2f3b28,
    roughness: 0.82,
    metalness: 0.14,
  });
  const crateMesh = new THREE.Mesh(crateGeo, crateMat);
  crateMesh.position.y = 0.28;
  crateMesh.castShadow = true;
  crateMesh.receiveShadow = true;

  const lanternBodyGeo = new THREE.CylinderGeometry(0.08, 0.095, 0.22, 8);
  const lanternBodyMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.6,
    roughness: 0.3,
  });
  const lanternCapGeo = new THREE.ConeGeometry(0.11, 0.08, 8);
  const lanternCapMat = new THREE.MeshStandardMaterial({
    color: 0x1e242c,
    roughness: 0.5,
    metalness: 0.7,
  });
  const lanternBody = new THREE.Mesh(lanternBodyGeo, lanternBodyMat);
  lanternBody.position.set(0.18, 0.67, 0.08);
  const lanternCap = new THREE.Mesh(lanternCapGeo, lanternCapMat);
  lanternCap.position.set(0.18, 0.8, 0.08);
  const lanternLight = new THREE.PointLight(0xffb84d, 1.8, 6.5, 1.8);
  lanternLight.position.set(0.18, 0.72, 0.08);

  crateGroup.add(crateMesh, lanternBody, lanternCap, lanternLight);
  scene.add(crateGroup);
  disposables.push(crateGeo, crateMat, lanternBodyGeo, lanternBodyMat, lanternCapGeo, lanternCapMat);

  // Stacked firewood pile ("leña") right beside the campfire
  const firewoodGroup = new THREE.Group();
  firewoodGroup.position.set(fireCenter.x + 1.08, 0, fireCenter.z + 0.85);
  firewoodGroup.rotation.y = -0.35;
  const splitLogGeo = new THREE.CylinderGeometry(0.068, 0.075, 0.72, 7);
  splitLogGeo.rotateZ(Math.PI / 2);
  const splitLogEndGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.73, 7);
  splitLogEndGeo.rotateZ(Math.PI / 2);
  disposables.push(splitLogGeo, splitLogEndGeo);

  const stackOffsets: Array<[number, number, number, number]> = [
    [0, 0.07, -0.14, 0.04],
    [0.02, 0.07, 0.0, -0.02],
    [-0.01, 0.07, 0.14, 0.03],
    [0.01, 0.18, -0.07, -0.05],
    [-0.02, 0.18, 0.07, 0.04],
    [0.0, 0.29, 0.0, 0.01],
  ];
  stackOffsets.forEach(([lx, ly, lz, ry]) => {
    const log = new THREE.Mesh(splitLogGeo, barkMat);
    log.position.set(lx, ly, lz);
    log.rotation.y = ry;
    log.castShadow = true;
    log.receiveShadow = true;
    const core = new THREE.Mesh(splitLogEndGeo, cutWoodMat);
    core.position.copy(log.position);
    core.rotation.copy(log.rotation);
    core.scale.set(1.01, 0.76, 0.76);
    firewoodGroup.add(log, core);
  });
  scene.add(firewoodGroup);

  // Capitán Pollo standing right next to the campfire & firewood ("el capitán pollo y la leña")
  const captainPollo = createCaptainPolloMesh();
  captainPollo.root.position.set(fireCenter.x + 0.96, 0, fireCenter.z + 0.22);
  captainPollo.root.rotation.y = -0.85;
  scene.add(captainPollo.root);
  const polloAnchor = new THREE.Vector3(fireCenter.x + 0.96, 0, fireCenter.z + 0.22);

  const captainPolloMeshes: THREE.Object3D[] = [];
  captainPollo.root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      captainPolloMeshes.push(obj);
    }
  });
  const polloHitGeo = new THREE.SphereGeometry(0.45, 8, 8);
  const polloHitMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const polloHitSphere = new THREE.Mesh(polloHitGeo, polloHitMat);
  polloHitSphere.position.set(0, 0.42, 0);
  captainPollo.root.add(polloHitSphere);
  captainPolloMeshes.push(polloHitSphere);
  disposables.push(polloHitGeo, polloHitMat);

  // Coronel Plumaje standing calmly near the lantern & crate
  const chickenNpc: ChickenNpcHandle = createChickenInstructor(
    scene,
    new THREE.Vector3(fireCenter.x + 1.95, 0, fireCenter.z - 0.95)
  );

  // 4B. Tactical Deployment Notice Board ("Cartel de Despliegue") + Interactive 3D Buttons + Sleeping Duck
  const boardCenter = new THREE.Vector3(-3.75, 0, -1.25);
  const boardGroup = new THREE.Group();
  boardGroup.position.copy(boardCenter);
  boardGroup.rotation.y = 0.44;
  scene.add(boardGroup);

  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x4b3320,
    roughness: 0.88,
    metalness: 0.04,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x20262e,
    roughness: 0.4,
    metalness: 0.8,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd99b26,
    roughness: 0.3,
    metalness: 0.85,
  });
  const shingleMat = new THREE.MeshStandardMaterial({
    color: 0x263228,
    roughness: 0.9,
    metalness: 0.05,
  });
  const parchmentMat = new THREE.MeshStandardMaterial({
    color: 0xe6d4af,
    roughness: 0.92,
    metalness: 0.01,
  });
  const boardTexMain = createDeployBoardTexture(
    'CARTEL DE DESPLIEGUE · ZONAS',
    'FLECHA DERECHA → MODOS EXTRAS',
    '#c28b3b',
    maxAnisotropy
  );
  const boardTexExtras = createDeployBoardTexture(
    'CARTEL DE DESPLIEGUE · EXTRAS',
    'FLECHA DERECHA ← VOLVER A ZONAS',
    '#eab308',
    maxAnisotropy
  );
  const boardFaceMat = new THREE.MeshStandardMaterial({
    map: boardTexMain,
    roughness: 0.72,
    metalness: 0.05,
  });
  disposables.push(
    timberMat,
    ironMat,
    brassMat,
    shingleMat,
    parchmentMat,
    boardTexMain,
    boardTexExtras,
    boardFaceMat
  );

  // Expanded wide wooden board frame (8 map slots per page + Back + Side Arrow Signpost)
  const postGeo = new THREE.BoxGeometry(0.2, 3.04, 0.2);
  const strutGeo = new THREE.BoxGeometry(0.11, 0.68, 0.11);
  const backPanelGeo = new THREE.BoxGeometry(4.24, 2.22, 0.12);
  const frontFaceGeo = new THREE.PlaneGeometry(4.06, 2.08);
  const roofPlankGeo = new THREE.BoxGeometry(4.74, 0.1, 0.98);
  const roofRidgeGeo = new THREE.BoxGeometry(4.78, 0.09, 0.16);
  const frameBeamHGeo = new THREE.BoxGeometry(4.38, 0.13, 0.19);
  const bracketGeo = new THREE.BoxGeometry(0.24, 0.24, 0.16);
  disposables.push(
    postGeo,
    strutGeo,
    backPanelGeo,
    frontFaceGeo,
    roofPlankGeo,
    roofRidgeGeo,
    frameBeamHGeo,
    bracketGeo
  );

  const leftPost = new THREE.Mesh(postGeo, timberMat);
  leftPost.position.set(-2.08, 1.52, 0);
  leftPost.castShadow = true;
  leftPost.receiveShadow = true;

  const rightPost = new THREE.Mesh(postGeo, timberMat);
  rightPost.position.set(2.08, 1.52, 0);
  rightPost.castShadow = true;
  rightPost.receiveShadow = true;

  for (const sx of [-2.08, 2.08]) {
    const frontStrut = new THREE.Mesh(strutGeo, timberMat);
    frontStrut.position.set(sx, 0.25, 0.24);
    frontStrut.rotation.x = 0.68;
    const backStrut = new THREE.Mesh(strutGeo, timberMat);
    backStrut.position.set(sx, 0.25, -0.24);
    backStrut.rotation.x = -0.68;
    boardGroup.add(frontStrut, backStrut);
  }

  const backPanel = new THREE.Mesh(backPanelGeo, timberMat);
  backPanel.position.set(0, 1.62, 0);
  backPanel.castShadow = true;
  backPanel.receiveShadow = true;

  const frontFace = new THREE.Mesh(frontFaceGeo, boardFaceMat);
  frontFace.position.set(0, 1.62, 0.066);
  frontFace.receiveShadow = true;

  const topBeam = new THREE.Mesh(frameBeamHGeo, timberMat);
  topBeam.position.set(0, 2.69, 0.02);
  const bottomBeam = new THREE.Mesh(frameBeamHGeo, timberMat);
  bottomBeam.position.set(0, 0.55, 0.02);

  // Corner iron brackets on the wooden frame
  for (const [bx, by] of [
    [-2.04, 2.64],
    [2.04, 2.64],
    [-2.04, 0.59],
    [2.04, 0.59],
  ]) {
    const bracket = new THREE.Mesh(bracketGeo, ironMat);
    bracket.position.set(bx, by, 0.04);
    boardGroup.add(bracket);
  }

  // Shingled overhanging roof
  const roof = new THREE.Mesh(roofPlankGeo, shingleMat);
  roof.position.set(0, 2.91, 0.14);
  roof.rotation.x = 0.24;
  roof.castShadow = true;

  const roofRidge = new THREE.Mesh(roofRidgeGeo, timberMat);
  roofRidge.position.set(0, 3.03, -0.05);
  roofRidge.castShadow = true;

  // Rolled tactical blueprint tubes resting on pegs under the bottom beam
  const scrollGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.78, 10);
  scrollGeo.rotateZ(Math.PI / 2);
  const scrollTieGeo = new THREE.TorusGeometry(0.068, 0.012, 6, 12);
  scrollTieGeo.rotateY(Math.PI / 2);
  disposables.push(scrollGeo, scrollTieGeo);

  const scroll1 = new THREE.Mesh(scrollGeo, parchmentMat);
  scroll1.position.set(1.22, 0.47, 0.14);
  scroll1.rotation.y = 0.08;
  const scroll2 = new THREE.Mesh(scrollGeo, parchmentMat);
  scroll2.position.set(1.28, 0.38, 0.18);
  scroll2.rotation.y = -0.05;
  const tie1 = new THREE.Mesh(scrollTieGeo, brassMat);
  tie1.position.set(1.22, 0.47, 0.14);
  boardGroup.add(scroll1, scroll2, tie1);

  // Hanging brass compass on right post peg (above the Extras arrow arm)
  const compassCaseGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.03, 14);
  compassCaseGeo.rotateX(Math.PI / 2);
  const compassPegGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6);
  compassPegGeo.rotateX(Math.PI / 2);
  disposables.push(compassCaseGeo, compassPegGeo);
  const pegMesh = new THREE.Mesh(compassPegGeo, ironMat);
  pegMesh.position.set(2.08, 2.26, 0.12);
  const compassMesh = new THREE.Mesh(compassCaseGeo, brassMat);
  compassMesh.position.set(2.08, 2.14, 0.16);
  boardGroup.add(pegMesh, compassMesh);

  // Wooden support bracket attaching the Extras Arrow Signpost beside the right post
  const sideArmGeo = new THREE.BoxGeometry(0.44, 0.09, 0.09);
  const arrowBackTipGeo = new THREE.ConeGeometry(0.26, 0.24, 4);
  arrowBackTipGeo.rotateY(Math.PI / 4);
  disposables.push(sideArmGeo, arrowBackTipGeo);

  const sideArmTop = new THREE.Mesh(sideArmGeo, timberMat);
  sideArmTop.position.set(2.26, 1.72, 0.03);
  const sideArmBot = new THREE.Mesh(sideArmGeo, timberMat);
  sideArmBot.position.set(2.26, 1.52, 0.03);
  boardGroup.add(sideArmTop, sideArmBot);

  // Iron bracket hook + swaying warm lantern on the left post illuminating board & sleeping duck
  const bracketArmGeo = new THREE.BoxGeometry(0.46, 0.06, 0.06);
  const boardLanternPivot = new THREE.Group();
  boardLanternPivot.position.set(-2.26, 2.52, 0.28);
  const chainGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.24, 6);
  const chainMesh = new THREE.Mesh(chainGeo, ironMat);
  chainMesh.position.y = -0.12;
  const bLanternGlass = new THREE.Mesh(lanternBodyGeo, lanternBodyMat);
  bLanternGlass.position.y = -0.3;
  const bLanternCap = new THREE.Mesh(lanternCapGeo, lanternCapMat);
  bLanternCap.position.y = -0.17;
  const boardLanternLight = new THREE.PointLight(0xffb44c, 4.8, 11.5, 1.35);
  boardLanternLight.position.set(0.32, -0.34, 0.52);
  boardLanternPivot.add(chainMesh, bLanternGlass, bLanternCap, boardLanternLight);

  const hookArm = new THREE.Mesh(bracketArmGeo, ironMat);
  hookArm.position.set(-2.16, 2.54, 0.16);
  hookArm.rotation.y = -0.45;
  disposables.push(bracketArmGeo, chainGeo);

  // Overhead warm brass lamp fixture under the roof eave lighting all 8 slots + side arrow cleanly
  const eaveLampGeo = new THREE.BoxGeometry(2.5, 0.06, 0.12);
  const eaveBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffdf9a,
    emissive: 0xffb347,
    emissiveIntensity: 1.5,
    roughness: 0.3,
  });
  disposables.push(eaveLampGeo, eaveBulbMat);
  const eaveLamp = new THREE.Mesh(eaveLampGeo, eaveBulbMat);
  eaveLamp.position.set(0, 2.71, 0.34);
  const boardFaceFill = new THREE.PointLight(0xffe0a3, 3.4, 8.6, 1.35);
  boardFaceFill.position.set(0.25, 2.15, 1.95);

  boardGroup.add(
    leftPost,
    rightPost,
    backPanel,
    frontFace,
    topBeam,
    bottomBeam,
    roof,
    roofRidge,
    hookArm,
    boardLanternPivot,
    eaveLamp,
    boardFaceFill
  );

  // 8-Slot Interactive 3D Deployment Plaques (2 cols x 4 rows per page) + Back + Side 3D Arrow
  let currentBoardPage: DeployBoardPage = 'main';
  const deployButtons: DeployBoardButton[] = [];
  const plaqueGeo = new THREE.BoxGeometry(1.82, 0.295, 0.036);
  const backPlaqueGeo = new THREE.BoxGeometry(1.18, 0.225, 0.036);
  const arrowSignGeo = new THREE.BoxGeometry(0.98, 0.44, 0.06);
  disposables.push(plaqueGeo, backPlaqueGeo, arrowSignGeo);

  const plaqueSpecs: Array<{
    action: DeployBoardAction;
    page: DeployBoardPage | 'both';
    title: string;
    subtitle: string;
    description: string;
    accent: string;
    bgHex: string;
    x: number;
    y: number;
    mode: 'map' | 'back' | 'locked';
  }> = [
    // --- PAGE 1: MAIN ZONES (8 SPACES) ---
    {
      action: 'tutorial',
      page: 'main',
      title: '1. Entrenamiento',
      subtitle: 'Tutorial · Coronel Plumaje',
      description: 'Aprende movimiento, puntería, armas y granadas con dianas móviles.',
      accent: '#f59e0b',
      bgHex: '#1f1a14',
      x: -0.96,
      y: 2.22,
      mode: 'map',
    },
    {
      action: 'city',
      page: 'main',
      title: '2. Ciudad Abandonada',
      subtitle: '5 Hordas + Mini-Jefes + Tanque',
      description: 'Sobrevive a 5 oleadas con Mini-Jefes para desbloquear el Lanzacohetes RL-3.',
      accent: '#ef4444',
      bgHex: '#1a1c24',
      x: 0.96,
      y: 2.22,
      mode: 'map',
    },
    {
      action: 'desert',
      page: 'main',
      title: '3. Desierto Arsanal',
      subtitle: '5 Hordas + Coloso Carmesí',
      description: 'Combate entre ruinas contra autómatas sin brazos y Centinelas Dorados.',
      accent: '#fb923c',
      bgHex: '#231c15',
      x: -0.96,
      y: 1.88,
      mode: 'map',
    },
    {
      action: 'cubes',
      page: 'main',
      title: '4. Mundo de Cubos',
      subtitle: '5 Hordas + Camiones Titán',
      description: 'Defiende la aldea voxel para desbloquear al Capitán Pollo y el Francotirador.',
      accent: '#34d399',
      bgHex: '#142119',
      x: 0.96,
      y: 1.88,
      mode: 'map',
    },
    {
      action: 'pixel',
      page: 'main',
      title: '5. Mundo Pixel',
      subtitle: '5 Hordas + Rey Koopa Alado',
      description: 'Escenario retro difícil con Koopas voladores, Mini-Jefes y bumeranes.',
      accent: '#38bdf8',
      bgHex: '#122036',
      x: -0.96,
      y: 1.54,
      mode: 'map',
    },
    {
      action: 'pueblo',
      page: 'main',
      title: '6. Pueblo Desconocido',
      subtitle: 'Difícil · 5 Hordas + Alcalde',
      description: 'Calles Roblox hostiles: mafia "En este pueblo" agresiva, ráfagas y Mini-Jefes.',
      accent: '#f43f5e',
      bgHex: '#281318',
      x: 0.96,
      y: 1.54,
      mode: 'map',
    },
    {
      action: 'locked_slot',
      page: 'main',
      title: '7. Área Clasificada',
      subtitle: 'Espacio para próxima zona',
      description: 'Este espacio del cartel queda reservado para futuras áreas de despliegue.',
      accent: '#64748b',
      bgHex: '#141922',
      x: -0.96,
      y: 1.2,
      mode: 'locked',
    },
    {
      action: 'locked_slot',
      page: 'main',
      title: '8. Área Clasificada',
      subtitle: 'Espacio para próxima zona',
      description: 'Este espacio del cartel queda reservado para futuras áreas de despliegue.',
      accent: '#64748b',
      bgHex: '#141922',
      x: 0.96,
      y: 1.2,
      mode: 'locked',
    },

    // --- PAGE 2: EXTRAS (8 SPACES) ---
    {
      action: 'backrooms',
      page: 'extras',
      title: 'E1. Nextbox Sandbox',
      subtitle: 'Backrooms 136×136 + Memes 2D',
      description: 'Escapa o dispara contra Bob Esponja, En Este Pueblo y Among Us en Nivel 0.',
      accent: '#eab308',
      bgHex: '#232010',
      x: -0.96,
      y: 2.22,
      mode: 'map',
    },
    {
      action: 'locked_slot',
      page: 'extras',
      title: 'E2. Extra Disponible',
      subtitle: 'Próximo modo extra libre',
      description: 'Espacio del tablón Extras listo para futuros minijuegos o modos sandbox.',
      accent: '#64748b',
      bgHex: '#151820',
      x: 0.96,
      y: 2.22,
      mode: 'locked',
    },
    {
      action: 'locked_slot',
      page: 'extras',
      title: 'E3. Extra Disponible',
      subtitle: 'Próximo modo extra libre',
      description: 'Espacio del tablón Extras listo para futuros minijuegos o modos sandbox.',
      accent: '#64748b',
      bgHex: '#151820',
      x: -0.96,
      y: 1.88,
      mode: 'locked',
    },
    {
      action: 'locked_slot',
      page: 'extras',
      title: 'E4. Extra Disponible',
      subtitle: 'Próximo modo extra libre',
      description: 'Espacio del tablón Extras listo para futuros minijuegos o modos sandbox.',
      accent: '#64748b',
      bgHex: '#151820',
      x: 0.96,
      y: 1.88,
      mode: 'locked',
    },
    {
      action: 'locked_slot',
      page: 'extras',
      title: 'E5. Extra Disponible',
      subtitle: 'Próximo modo extra libre',
      description: 'Espacio del tablón Extras listo para futuros minijuegos o modos sandbox.',
      accent: '#64748b',
      bgHex: '#151820',
      x: -0.96,
      y: 1.54,
      mode: 'locked',
    },
    {
      action: 'locked_slot',
      page: 'extras',
      title: 'E6. Extra Disponible',
      subtitle: 'Próximo modo extra libre',
      description: 'Espacio del tablón Extras listo para futuros minijuegos o modos sandbox.',
      accent: '#64748b',
      bgHex: '#151820',
      x: 0.96,
      y: 1.54,
      mode: 'locked',
    },
    {
      action: 'locked_slot',
      page: 'extras',
      title: 'E7. Extra Disponible',
      subtitle: 'Próximo modo extra libre',
      description: 'Espacio del tablón Extras listo para futuros minijuegos o modos sandbox.',
      accent: '#64748b',
      bgHex: '#151820',
      x: -0.96,
      y: 1.2,
      mode: 'locked',
    },
    {
      action: 'locked_slot',
      page: 'extras',
      title: 'E8. Extra Disponible',
      subtitle: 'Próximo modo extra libre',
      description: 'Espacio del tablón Extras listo para futuros minijuegos o modos sandbox.',
      accent: '#64748b',
      bgHex: '#151820',
      x: 0.96,
      y: 1.2,
      mode: 'locked',
    },

    // --- COMMON BACK BUTTON ---
    {
      action: 'back',
      page: 'both',
      title: '‹ VOLVER AL MENÚ',
      subtitle: 'Regresar a la fogata nocturna',
      description: 'Regresar a la vista principal de la fogata y Capitán Pollo.',
      accent: '#e2e8f0',
      bgHex: '#261a12',
      x: -1.28,
      y: 0.81,
      mode: 'back',
    },
  ];

  for (const cfg of plaqueSpecs) {
    const tex = createPlaqueTexture(
      cfg.title,
      cfg.subtitle,
      cfg.accent,
      cfg.bgHex,
      cfg.mode,
      maxAnisotropy
    );
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x2a1d14,
      roughness: 0.8,
      metalness: 0.1,
    });
    const frontMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: new THREE.Color(cfg.accent),
      emissiveMap: tex,
      emissiveIntensity: cfg.mode === 'locked' ? 0.08 : 0.22,
      roughness: 0.48,
      metalness: 0.08,
    });
    disposables.push(tex, sideMat, frontMat);

    const mesh = new THREE.Mesh(
      cfg.mode === 'back' ? backPlaqueGeo : plaqueGeo,
      [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat]
    );
    const baseZ = 0.095;
    mesh.position.set(cfg.x, cfg.y, baseZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.visible = cfg.page === 'both' || cfg.page === currentBoardPage;
    boardGroup.add(mesh);

    deployButtons.push({
      action: cfg.action,
      page: cfg.page,
      title: cfg.title,
      description: cfg.description,
      mesh,
      mat: frontMat,
      baseZ,
      hovered: false,
    });
  }

  // Interactive 3D Side Arrow Sign mounted next to the right post (EXTRAS <-> ZONAS)
  const arrowSpecs: Array<{
    action: 'to_extras' | 'to_main';
    page: DeployBoardPage;
    label: string;
    subLabel: string;
    dir: 'right' | 'left';
    title: string;
    description: string;
    accent: string;
  }> = [
    {
      action: 'to_extras',
      page: 'main',
      label: 'EXTRAS',
      subLabel: 'Backrooms y más',
      dir: 'right',
      title: 'Ir a Modos Extras →',
      description: 'Pulsa esta flecha para ver los modos extras (Nextbox Sandbox / Backrooms).',
      accent: '#eab308',
    },
    {
      action: 'to_main',
      page: 'extras',
      label: 'ZONAS',
      subLabel: 'Volver a áreas',
      dir: 'left',
      title: '← Volver a Zonas de Despliegue',
      description: 'Regresa al tablón principal con los 8 espacios de áreas de combate.',
      accent: '#38bdf8',
    },
  ];

  for (const aCfg of arrowSpecs) {
    const tex = createArrowSignTexture(
      aCfg.label,
      aCfg.subLabel,
      aCfg.dir,
      aCfg.accent,
      maxAnisotropy
    );
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x3b2617,
      roughness: 0.85,
      metalness: 0.1,
    });
    const frontMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: new THREE.Color(aCfg.accent),
      emissiveMap: tex,
      emissiveIntensity: 0.28,
      roughness: 0.44,
      metalness: 0.08,
    });
    const tipMat = new THREE.MeshStandardMaterial({
      color: aCfg.accent,
      emissive: aCfg.accent,
      emissiveIntensity: 0.22,
      roughness: 0.45,
      metalness: 0.15,
    });
    disposables.push(tex, sideMat, frontMat, tipMat);

    const arrowMesh = new THREE.Mesh(arrowSignGeo, [
      sideMat,
      sideMat,
      sideMat,
      sideMat,
      frontMat,
      sideMat,
    ]);
    const arrowTip = new THREE.Mesh(arrowBackTipGeo, tipMat);
    arrowTip.rotation.z = aCfg.dir === 'right' ? -Math.PI / 2 : Math.PI / 2;
    arrowTip.position.set(aCfg.dir === 'right' ? 0.58 : -0.58, 0, 0);
    arrowMesh.add(arrowTip);

    const baseX = 2.74;
    const baseZ = 0.09;
    arrowMesh.position.set(baseX, 1.62, baseZ);
    arrowMesh.rotation.y = -0.16;
    arrowMesh.castShadow = true;
    arrowMesh.receiveShadow = true;
    arrowMesh.visible = aCfg.page === currentBoardPage;
    boardGroup.add(arrowMesh);

    deployButtons.push({
      action: aCfg.action,
      page: aCfg.page,
      title: aCfg.title,
      description: aCfg.description,
      mesh: arrowMesh,
      mat: frontMat,
      baseZ,
      baseX,
      hovered: false,
      isArrow: true,
    });
  }

  // Cozy wooden stump + golden straw nest on the left side of the cartel for the Sleeping Duck
  const stumpGeo = new THREE.CylinderGeometry(0.44, 0.5, 0.46, 12);
  const nestRingGeo = new THREE.TorusGeometry(0.33, 0.088, 8, 18);
  const nestPadGeo = new THREE.CylinderGeometry(0.31, 0.35, 0.08, 14);
  const strawMat = new THREE.MeshStandardMaterial({
    color: 0xc9a34e,
    roughness: 0.94,
    metalness: 0.01,
  });
  disposables.push(stumpGeo, nestRingGeo, nestPadGeo, strawMat);

  const duckSpot = new THREE.Group();
  duckSpot.position.set(-2.54, 0, 0.62);
  duckSpot.rotation.y = 0.34;
  boardGroup.add(duckSpot);

  const stump = new THREE.Mesh(stumpGeo, barkMat);
  stump.position.y = 0.22;
  stump.castShadow = true;
  stump.receiveShadow = true;

  const nestPad = new THREE.Mesh(nestPadGeo, strawMat);
  nestPad.position.y = 0.46;
  nestPad.receiveShadow = true;

  const nestRing = new THREE.Mesh(nestRingGeo, strawMat);
  nestRing.rotation.x = Math.PI / 2;
  nestRing.position.y = 0.48;
  nestRing.castShadow = true;
  duckSpot.add(stump, nestPad, nestRing);

  // Composite Multi-Part 3D Sleeping Duck ("Pato Durmiendo")
  const duckGroup = new THREE.Group();
  duckGroup.position.set(0, 0.5, 0);
  duckSpot.add(duckGroup);

  const duckCreamMat = new THREE.MeshStandardMaterial({
    color: 0xf4ebd9,
    roughness: 0.78,
    metalness: 0.02,
  });
  const duckChestMat = new THREE.MeshStandardMaterial({
    color: 0xa47148,
    roughness: 0.8,
    metalness: 0.02,
  });
  const duckHeadMat = new THREE.MeshStandardMaterial({
    color: 0x2d6a4f,
    roughness: 0.62,
    metalness: 0.08,
  });
  const duckWingMat = new THREE.MeshStandardMaterial({
    color: 0xdccbb0,
    roughness: 0.82,
    metalness: 0.02,
  });
  const duckWingTipMat = new THREE.MeshStandardMaterial({
    color: 0x3b4d63,
    roughness: 0.72,
    metalness: 0.05,
  });
  const duckBillMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.42,
    metalness: 0.06,
  });
  const duckDarkMat = new THREE.MeshStandardMaterial({
    color: 0x16191e,
    roughness: 0.55,
  });
  const duckBlushMat = new THREE.MeshStandardMaterial({
    color: 0xf48c8c,
    roughness: 0.75,
  });
  disposables.push(
    duckCreamMat,
    duckChestMat,
    duckHeadMat,
    duckWingMat,
    duckWingTipMat,
    duckBillMat,
    duckDarkMat,
    duckBlushMat
  );

  const duckBodyGeo = new THREE.SphereGeometry(0.22, 16, 12);
  const duckChestGeo = new THREE.SphereGeometry(0.18, 12, 10);
  const duckTailGeo = new THREE.ConeGeometry(0.08, 0.2, 8);
  const duckWingGeo = new THREE.SphereGeometry(0.15, 12, 10);
  const duckHeadGeo = new THREE.SphereGeometry(0.135, 14, 12);
  const duckNeckRingGeo = new THREE.TorusGeometry(0.095, 0.018, 6, 16);
  const duckBillBaseGeo = new THREE.BoxGeometry(0.11, 0.042, 0.14);
  const duckBillTipGeo = new THREE.CylinderGeometry(0.056, 0.056, 0.038, 12);
  const duckEyeLidGeo = new THREE.BoxGeometry(0.02, 0.012, 0.048);
  const duckBlushGeo = new THREE.SphereGeometry(0.024, 8, 6);
  const duckFootGeo = new THREE.BoxGeometry(0.08, 0.022, 0.1);
  disposables.push(
    duckBodyGeo,
    duckChestGeo,
    duckTailGeo,
    duckWingGeo,
    duckHeadGeo,
    duckNeckRingGeo,
    duckBillBaseGeo,
    duckBillTipGeo,
    duckEyeLidGeo,
    duckBlushGeo,
    duckFootGeo
  );

  // Body pivot for smooth breathing expansion
  const duckBodyPivot = new THREE.Group();
  duckBodyPivot.position.set(0, 0.12, 0);
  duckGroup.add(duckBodyPivot);

  const duckBody = new THREE.Mesh(duckBodyGeo, duckCreamMat);
  duckBody.scale.set(1.06, 0.78, 1.36);
  duckBody.castShadow = true;

  const duckChest = new THREE.Mesh(duckChestGeo, duckChestMat);
  duckChest.position.set(0, 0.02, 0.16);
  duckChest.scale.set(0.95, 0.82, 0.92);

  const duckTail = new THREE.Mesh(duckTailGeo, duckWingTipMat);
  duckTail.position.set(0, 0.09, -0.3);
  duckTail.rotation.x = -0.95;

  const duckLeftWing = new THREE.Mesh(duckWingGeo, duckWingMat);
  duckLeftWing.position.set(-0.2, 0.02, -0.02);
  duckLeftWing.scale.set(0.5, 0.72, 1.25);
  duckLeftWing.rotation.z = 0.22;

  const duckRightWing = new THREE.Mesh(duckWingGeo, duckWingMat);
  duckRightWing.position.set(0.2, 0.02, -0.02);
  duckRightWing.scale.set(0.5, 0.72, 1.25);
  duckRightWing.rotation.z = -0.22;

  const duckLeftTip = new THREE.Mesh(duckWingGeo, duckWingTipMat);
  duckLeftTip.position.set(-0.18, 0.02, -0.14);
  duckLeftTip.scale.set(0.32, 0.4, 0.65);

  const duckRightTip = new THREE.Mesh(duckWingGeo, duckWingTipMat);
  duckRightTip.position.set(0.18, 0.02, -0.14);
  duckRightTip.scale.set(0.32, 0.4, 0.65);

  duckBodyPivot.add(
    duckBody,
    duckChest,
    duckTail,
    duckLeftWing,
    duckRightWing,
    duckLeftTip,
    duckRightTip
  );

  // Tucked webbed feet peeking slightly from under the chest
  const leftFoot = new THREE.Mesh(duckFootGeo, duckBillMat);
  leftFoot.position.set(-0.1, 0.015, 0.2);
  leftFoot.rotation.y = 0.2;
  const rightFoot = new THREE.Mesh(duckFootGeo, duckBillMat);
  rightFoot.position.set(0.1, 0.015, 0.2);
  rightFoot.rotation.y = -0.2;
  duckGroup.add(leftFoot, rightFoot);

  // Sleepy head curled softly down onto its folded wing
  const duckHeadPivot = new THREE.Group();
  duckHeadPivot.position.set(0.05, 0.22, 0.16);
  duckHeadPivot.rotation.set(0.28, -0.45, 0.22);
  duckGroup.add(duckHeadPivot);

  const neckRing = new THREE.Mesh(duckNeckRingGeo, duckCreamMat);
  neckRing.rotation.x = Math.PI / 2;
  neckRing.position.set(0, -0.075, 0);

  const duckHead = new THREE.Mesh(duckHeadGeo, duckHeadMat);
  duckHead.scale.set(1.0, 0.96, 1.06);
  duckHead.castShadow = true;

  const billBase = new THREE.Mesh(duckBillBaseGeo, duckBillMat);
  billBase.position.set(0, -0.025, 0.145);
  const billTip = new THREE.Mesh(duckBillTipGeo, duckBillMat);
  billTip.position.set(0, -0.026, 0.205);

  // Peaceful closed sleeping eyelids & rosy cheeks
  const leftLid = new THREE.Mesh(duckEyeLidGeo, duckDarkMat);
  leftLid.position.set(-0.118, 0.025, 0.055);
  leftLid.rotation.set(0.18, 0, -0.12);
  const rightLid = new THREE.Mesh(duckEyeLidGeo, duckDarkMat);
  rightLid.position.set(0.118, 0.025, 0.055);
  rightLid.rotation.set(0.18, 0, 0.12);

  const leftBlush = new THREE.Mesh(duckBlushGeo, duckBlushMat);
  leftBlush.position.set(-0.115, -0.015, 0.065);
  const rightBlush = new THREE.Mesh(duckBlushGeo, duckBlushMat);
  rightBlush.position.set(0.115, -0.015, 0.065);

  duckHeadPivot.add(
    neckRing,
    duckHead,
    billBase,
    billTip,
    leftLid,
    rightLid,
    leftBlush,
    rightBlush
  );

  // Floating "Z z z" sleeping sprites drifting upward from the duck's beak
  const zTexBig = createSleepZTexture('Z');
  const zTexSmall = createSleepZTexture('z');
  disposables.push(zTexBig, zTexSmall);

  interface SleepBubble {
    sprite: THREE.Sprite;
    mat: THREE.SpriteMaterial;
    phase: number;
    baseScale: number;
  }
  const sleepBubbles: SleepBubble[] = [
    { tex: zTexBig, phase: 0.0, scale: 0.22 },
    { tex: zTexSmall, phase: 0.34, scale: 0.17 },
    { tex: zTexSmall, phase: 0.68, scale: 0.14 },
  ].map((cfg) => {
    const mat = new THREE.SpriteMaterial({
      map: cfg.tex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    disposables.push(mat);
    const sprite = new THREE.Sprite(mat);
    sprite.scale.setScalar(cfg.scale);
    duckSpot.add(sprite);
    return { sprite, mat, phase: cfg.phase, baseScale: cfg.scale };
  });

  // 5. Dense Night Pine Forest Perimeter (composite multi-tier conifers + boulders)
  const pinePalette = [0x112416, 0x152d1c, 0x0e1e13, 0x183220];
  const pineMats = pinePalette.map(
    (col) =>
      new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.9,
        metalness: 0.02,
      })
  );
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.32, 3.2, 8);
  const tier1Geo = new THREE.ConeGeometry(1.75, 2.7, 8);
  const tier2Geo = new THREE.ConeGeometry(1.42, 2.4, 8);
  const tier3Geo = new THREE.ConeGeometry(1.06, 2.1, 8);
  const tier4Geo = new THREE.ConeGeometry(0.68, 1.7, 8);
  disposables.push(trunkGeo, tier1Geo, tier2Geo, tier3Geo, tier4Geo, ...pineMats);

  let treeSeed = 1337;
  const tRand = () => {
    treeSeed = (treeSeed * 16807) % 2147483647;
    return (treeSeed - 1) / 2147483646;
  };

  for (let i = 0; i < 64; i++) {
    const angle = (i / 64) * Math.PI * 2 + (tRand() - 0.5) * 0.22;
    const ring = i < 20 ? 7.2 + tRand() * 4.5 : i < 44 ? 12.5 + tRand() * 8.5 : 22 + tRand() * 14;
    const tx = fireCenter.x + Math.cos(angle) * ring;
    const tz = fireCenter.z + Math.sin(angle) * ring;

    // Keep camera sightline on campfire AND deployment notice board clear
    if (tx > -3.5 && tx < 3.2 && tz > 1.8 && tz < 9.5) continue;
    if (Math.hypot(tx - boardCenter.x, tz - boardCenter.z) < 3.6) continue;
    if (tx > -6.0 && tx < -1.0 && tz > -2.5 && tz < 4.5) continue;

    const tree = new THREE.Group();
    const scale = 0.85 + tRand() * 0.72;
    tree.position.set(tx, 0, tz);
    tree.rotation.y = tRand() * Math.PI * 2;
    tree.scale.setScalar(scale);

    const pMat = pineMats[i % pineMats.length];
    const trunk = new THREE.Mesh(trunkGeo, barkMat);
    trunk.position.y = 1.6;
    trunk.castShadow = i < 22;
    trunk.receiveShadow = true;

    const c1 = new THREE.Mesh(tier1Geo, pMat);
    c1.position.y = 2.85;
    c1.castShadow = i < 22;
    const c2 = new THREE.Mesh(tier2Geo, pMat);
    c2.position.y = 4.25;
    const c3 = new THREE.Mesh(tier3Geo, pMat);
    c3.position.y = 5.45;
    const c4 = new THREE.Mesh(tier4Geo, pMat);
    c4.position.y = 6.5;

    tree.add(trunk, c1, c2, c3, c4);
    scene.add(tree);
  }

  // Scattered mossy forest boulders
  const boulderGeo = new THREE.DodecahedronGeometry(0.65, 1);
  disposables.push(boulderGeo);
  for (let b = 0; b < 18; b++) {
    const a = (b / 18) * Math.PI * 2 + 0.4;
    const d = 5.2 + tRand() * 10;
    const bx = fireCenter.x + Math.cos(a) * d;
    const bz = fireCenter.z + Math.sin(a) * d;
    if (bx > -3.0 && bx < 3.0 && bz > 2.2 && bz < 8.5) continue;
    if (Math.hypot(bx - boardCenter.x, bz - boardCenter.z) < 3.2) continue;
    const rock = new THREE.Mesh(boulderGeo, stoneMat);
    rock.position.set(bx, 0.22, bz);
    rock.scale.set(0.8 + tRand() * 0.9, 0.55 + tRand() * 0.5, 0.8 + tRand() * 0.8);
    rock.rotation.set(tRand() * 2, tRand() * 3, tRand() * 2);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }

  // 6. Subtle Night Fireflies among the trees
  const fireflyCount = 36;
  const fireflyPos = new Float32Array(fireflyCount * 3);
  const fireflyBase = new Float32Array(fireflyCount * 3);
  for (let i = 0; i < fireflyCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 4.0 + Math.random() * 14.0;
    const fx = fireCenter.x + Math.cos(a) * d;
    const fy = 0.65 + Math.random() * 2.4;
    const fz = fireCenter.z + Math.sin(a) * d;
    fireflyBase[i * 3] = fx;
    fireflyBase[i * 3 + 1] = fy;
    fireflyBase[i * 3 + 2] = fz;
    fireflyPos[i * 3] = fx;
    fireflyPos[i * 3 + 1] = fy;
    fireflyPos[i * 3 + 2] = fz;
  }
  const fireflyGeo = new THREE.BufferGeometry();
  fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPos, 3));
  const fireflyMat = new THREE.PointsMaterial({
    color: 0xa3e635,
    size: 0.08,
    transparent: true,
    opacity: 0.65,
  });
  const fireflies = new THREE.Points(fireflyGeo, fireflyMat);
  scene.add(fireflies);
  disposables.push(fireflyGeo, fireflyMat);

  // 7. Distant Forest Patrol Enemies that walk past in the background and leave
  const bgEnemyFactory = new EnemyFactory();
  interface BgPatrolActor {
    kind: 'zombie' | 'bot' | 'koopa';
    enemy: ActiveEnemy | null;
    dir: 1 | -1;
    zBase: number;
    xPos: number;
    speed: number;
    cooldown: number;
  }

  const patrolActors: BgPatrolActor[] = [
    { kind: 'zombie', enemy: null, dir: 1, zBase: -9.2, xPos: -15.5, speed: 2.05, cooldown: 0.8 },
    { kind: 'bot', enemy: null, dir: -1, zBase: -12.4, xPos: 16.5, speed: 2.35, cooldown: 3.4 },
    { kind: 'koopa', enemy: null, dir: 1, zBase: -10.8, xPos: -17.0, speed: 2.75, cooldown: 6.2 },
  ];

  const spawnPatrol = (actor: BgPatrolActor) => {
    const startX = actor.dir === 1 ? -16.5 : 16.5;
    actor.xPos = startX;
    let en: ActiveEnemy;
    if (actor.kind === 'bot') {
      en = bgEnemyFactory.spawnArmlessDesertBot(scene, startX, actor.zBase, 1, false);
    } else if (actor.kind === 'koopa') {
      en = bgEnemyFactory.spawnWingedKoopa(scene, startX, actor.zBase, 1, false);
    } else {
      en = bgEnemyFactory.spawnArmedZombie(scene, startX, actor.zBase, 'rifle', 1);
    }
    en.root.rotation.y = actor.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
    actor.enemy = en;
  };

  const lookDummy = new THREE.Vector3(fireCenter.x, 0, fireCenter.z);

  const update = (delta: number, elapsed: number) => {
    // Flicker campfire light warmly & organically
    campLight.intensity =
      5.8 +
      Math.sin(elapsed * 9.5) * 0.9 +
      Math.cos(elapsed * 17.3) * 0.55 +
      Math.sin(elapsed * 26.1) * 0.3;

    emberBedMat.emissiveIntensity = 1.15 + Math.sin(elapsed * 5.2) * 0.25;

    // Animate flame tongues
    for (let i = 0; i < fireMeshes.length; i++) {
      const fm = fireMeshes[i];
      const baseScale = flameConfigs[i].s;
      const sx = baseScale * (0.9 + Math.sin(elapsed * 13 + i * 1.7) * 0.14);
      const sy = baseScale * (0.92 + Math.cos(elapsed * 16 + i * 2.3) * 0.26);
      const sz = baseScale * (0.9 + Math.sin(elapsed * 11 + i * 1.1) * 0.14);
      fm.scale.set(sx, sy, sz);
      fm.rotation.y += delta * (1.8 + i * 0.35);
      fm.rotation.z = Math.sin(elapsed * 8 + i) * 0.11;
    }

    // Animate rising embers
    const eAttr = emberGeo.getAttribute('position') as THREE.BufferAttribute;
    const eArr = eAttr.array as Float32Array;
    for (let i = 0; i < emberCount; i++) {
      const phase = emberSeeds[i * 3];
      const speed = emberSeeds[i * 3 + 1];
      let y = eArr[i * 3 + 1] + speed * delta;
      if (y > 4.2) {
        y = 0.18;
      }
      eArr[i * 3] = fireCenter.x + Math.sin(elapsed * 1.8 + phase + y * 1.4) * (0.2 + y * 0.12);
      eArr[i * 3 + 1] = y;
      eArr[i * 3 + 2] = fireCenter.z + Math.cos(elapsed * 1.5 + phase + y * 1.2) * (0.2 + y * 0.12);
    }
    eAttr.needsUpdate = true;

    // Gentle fireflies drift
    const fAttr = fireflyGeo.getAttribute('position') as THREE.BufferAttribute;
    const fArr = fAttr.array as Float32Array;
    for (let i = 0; i < fireflyCount; i++) {
      fArr[i * 3] = fireflyBase[i * 3] + Math.sin(elapsed * 0.7 + i) * 0.55;
      fArr[i * 3 + 1] = fireflyBase[i * 3 + 1] + Math.sin(elapsed * 1.3 + i * 2) * 0.28;
      fArr[i * 3 + 2] = fireflyBase[i * 3 + 2] + Math.cos(elapsed * 0.65 + i) * 0.55;
    }
    fAttr.needsUpdate = true;
    fireflyMat.opacity = 0.45 + Math.sin(elapsed * 2.2) * 0.25;

    chickenNpc.update(delta, elapsed, lookDummy);

    // Keep Capitán Pollo charmingly animated beside the firewood & campfire
    captainPollo.update(
      delta,
      elapsed,
      polloAnchor,
      -0.85,
      lookDummy
    );
    captainPollo.root.position.set(polloAnchor.x, 0, polloAnchor.z);
    captainPollo.root.rotation.y = -0.9 + Math.sin(elapsed * 0.9) * 0.24;

    // Gentle sway on the deployment board lantern + warm flicker
    boardLanternPivot.rotation.z = Math.sin(elapsed * 1.45) * 0.055;
    boardLanternPivot.rotation.x = Math.cos(elapsed * 1.1) * 0.025;
    boardLanternLight.intensity = 4.6 + Math.sin(elapsed * 7.5) * 0.35;

    // Smooth hover pop on 3D plaques and Side Arrow mounted on the Cartel
    for (let b = 0; b < deployButtons.length; b++) {
      const btn = deployButtons[b];
      if (!btn.mesh.visible) continue;
      if (btn.isArrow && btn.baseX !== undefined) {
        const pulseX = btn.hovered ? btn.baseX + 0.075 : btn.baseX + Math.sin(elapsed * 2.6) * 0.02;
        btn.mesh.position.x = THREE.MathUtils.damp(btn.mesh.position.x, pulseX, 12, delta);
        const targetZ = btn.hovered ? btn.baseZ + 0.065 : btn.baseZ;
        btn.mesh.position.z = THREE.MathUtils.damp(btn.mesh.position.z, targetZ, 12, delta);
        const nextScale = THREE.MathUtils.damp(btn.mesh.scale.x, btn.hovered ? 1.07 : 1.0, 12, delta);
        btn.mesh.scale.set(nextScale, nextScale, 1);
        btn.mat.emissiveIntensity = THREE.MathUtils.damp(
          btn.mat.emissiveIntensity,
          btn.hovered ? 0.72 : 0.3,
          12,
          delta
        );
        continue;
      }
      const isLocked = btn.action === 'locked_slot';
      const targetZ = btn.hovered ? btn.baseZ + (isLocked ? 0.018 : 0.055) : btn.baseZ;
      const targetScale = btn.hovered ? (isLocked ? 1.01 : 1.038) : 1.0;
      const targetEmissive = btn.hovered ? (isLocked ? 0.16 : 0.62) : isLocked ? 0.08 : 0.22;
      btn.mesh.position.z = THREE.MathUtils.damp(btn.mesh.position.z, targetZ, 12, delta);
      const nextScale = THREE.MathUtils.damp(btn.mesh.scale.x, targetScale, 12, delta);
      btn.mesh.scale.set(nextScale, nextScale, 1);
      btn.mat.emissiveIntensity = THREE.MathUtils.damp(
        btn.mat.emissiveIntensity,
        targetEmissive,
        12,
        delta
      );
    }

    // Sleeping Duck breathing, sleepy head bob, tail twitch & rising "Z z z" bubbles
    const breath = Math.sin(elapsed * 1.85);
    duckBodyPivot.scale.set(1 + breath * 0.038, 1 + breath * 0.055, 1 + breath * 0.02);
    duckHeadPivot.position.y = 0.22 + breath * 0.012;
    duckHeadPivot.rotation.x = 0.28 + breath * 0.045;
    duckTail.rotation.x = -0.95 + Math.pow(Math.max(0, Math.sin(elapsed * 0.72)), 14) * 0.22;

    for (let z = 0; z < sleepBubbles.length; z++) {
      const b = sleepBubbles[z];
      const cycle = (elapsed * 0.34 + b.phase) % 1;
      b.sprite.position.set(
        -0.02 + Math.sin(cycle * Math.PI * 2 + z) * 0.09 + cycle * 0.14,
        0.78 + cycle * 0.75,
        0.24 - cycle * 0.06
      );
      const fade =
        cycle < 0.2 ? cycle / 0.2 : cycle > 0.7 ? Math.max(0, (1 - cycle) / 0.3) : 1;
      b.mat.opacity = fade * 0.88;
      b.sprite.scale.setScalar(b.baseScale * (0.75 + cycle * 0.45));
    }

    // Animate background forest patrol enemies walking through & leaving
    for (let i = 0; i < patrolActors.length; i++) {
      const actor = patrolActors[i];
      if (!actor.enemy) {
        actor.cooldown -= delta;
        if (actor.cooldown <= 0) {
          spawnPatrol(actor);
        }
        continue;
      }

      const en = actor.enemy;
      actor.xPos += actor.dir * actor.speed * delta;
      const swayZ = actor.zBase + Math.sin(elapsed * 0.7 + i * 2.1) * 0.75;
      en.root.position.x = actor.xPos;
      en.root.position.z = swayZ;
      en.root.rotation.y =
        (actor.dir === 1 ? Math.PI / 2 : -Math.PI / 2) +
        Math.cos(elapsed * 0.7 + i * 2.1) * 0.14;

      const t = elapsed + en.walkPhase;
      if (en.isKoopa) {
        en.bodyGroup.position.y = Math.sin(t * 4.2) * 0.3;
        if (en.leftWingGroup && en.rightWingGroup) {
          en.leftWingGroup.rotation.z = -0.2 + Math.sin(t * 14) * 0.52;
          en.rightWingGroup.rotation.z = 0.2 - Math.sin(t * 14) * 0.52;
        }
        en.leftLegGroup.rotation.x = Math.sin(t * 5) * 0.26;
        en.rightLegGroup.rotation.x = -Math.sin(t * 5) * 0.26;
      } else {
        en.walkPhase += delta * actor.speed * 3.6;
        const swing = Math.sin(en.walkPhase) * 0.54;
        en.leftLegGroup.rotation.x = swing;
        en.rightLegGroup.rotation.x = -swing;
        en.torsoGroup.position.y = (en.isArmlessBot ? 1.12 : 0.98) + Math.abs(Math.sin(en.walkPhase)) * 0.04;
        en.headGroup.rotation.y = Math.sin(t * 1.4) * 0.22;
      }

      // Once enemy crosses to far side of forest, remove it so it leaves cleanly
      if ((actor.dir === 1 && actor.xPos > 17.5) || (actor.dir === -1 && actor.xPos < -17.5)) {
        scene.remove(en.root);
        en.disposeOwnMaterials();
        actor.enemy = null;
        actor.dir = actor.dir === 1 ? -1 : 1;
        actor.cooldown = 3.2 + i * 1.4;
      }
    }
  };

  const dispose = () => {
    chickenNpc.dispose();
    captainPollo.dispose();
    for (const actor of patrolActors) {
      if (actor.enemy) {
        scene.remove(actor.enemy.root);
        actor.enemy.disposeOwnMaterials();
        actor.enemy = null;
      }
    }
    bgEnemyFactory.dispose();
    disposables.forEach((d) => d.dispose());
  };

  const setHoveredBoardAction = (action: DeployBoardAction | null) => {
    for (const btn of deployButtons) {
      btn.hovered = btn.mesh.visible && btn.action === action;
    }
  };

  const setBoardPage = (page: DeployBoardPage) => {
    currentBoardPage = page;
    boardFaceMat.map = page === 'extras' ? boardTexExtras : boardTexMain;
    boardFaceMat.needsUpdate = true;
    for (const btn of deployButtons) {
      btn.mesh.visible = btn.page === 'both' || btn.page === page;
      btn.hovered = false;
      btn.mesh.position.z = btn.baseZ;
      btn.mesh.scale.set(1, 1, 1);
    }
  };

  const getBoardPage = (): DeployBoardPage => currentBoardPage;

  return {
    fireLights,
    fireMeshes,
    deployButtons,
    captainPolloMeshes,
    triggerCaptainPolloHop: () => captainPollo.triggerThrowPose(),
    setHoveredBoardAction,
    getBoardPage,
    setBoardPage,
    update,
    dispose,
  };
}
