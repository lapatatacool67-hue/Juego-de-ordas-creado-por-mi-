import * as THREE from 'three';
import { createSkyDomeTexture, createWeatheredConcretePbr } from './textures';
import type { BoxCollider } from './types';

export interface RangeTarget {
  id: string;
  label: string;
  isMoving: boolean;
  root: THREE.Group;
  pivotGroup: THREE.Group;
  basePos: THREE.Vector3;
  moveType: 'static' | 'slide_x' | 'pendulum';
  moveAmp: number;
  moveSpeed: number;
  phase: number;
  hitTilt: number;
  hitFlashTimer: number;
  faceMat: THREE.MeshStandardMaterial;
  hitboxMesh: THREE.Mesh;
}

export interface TutorialRangeBundle {
  colliders: BoxCollider[];
  obstacles: THREE.Mesh[];
  targets: RangeTarget[];
  targetHitboxes: THREE.Mesh[];
  updateTargets: (delta: number, elapsed: number) => void;
  dispose: () => void;
}

function createBullseyeTexture(isMoving: boolean): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(0, 0, size, size);

  // Subtle steel backing border
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, size - 10, size - 10);

  const cx = size / 2;
  const cy = size / 2;
  const ringColors = isMoving
    ? ['#1e293b', '#f8fafc', '#d97706', '#f8fafc', '#dc2626']
    : ['#1e293b', '#f8fafc', '#2563eb', '#f8fafc', '#dc2626'];
  const radii = [104, 80, 56, 34, 16];

  radii.forEach((r, idx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = ringColors[idx];
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createTutorialRangeMap(
  scene: THREE.Scene,
  maxAnisotropy: number
): TutorialRangeBundle {
  const colliders: BoxCollider[] = [];
  const obstacles: THREE.Mesh[] = [];
  const targets: RangeTarget[] = [];
  const targetHitboxes: THREE.Mesh[] = [];
  const disposables: Array<{ dispose: () => void }> = [];

  // Sky dome
  const skyTex = createSkyDomeTexture();
  const skyGeo = new THREE.SphereGeometry(200, 32, 20);
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
  disposables.push(skyTex, skyGeo, skyMat);

  // Concrete firing range floor
  const concretePbr = createWeatheredConcretePbr(18, 22, maxAnisotropy, 0x7e838b);
  disposables.push(concretePbr.map, concretePbr.normalMap, concretePbr.roughnessMap);

  const floorGeo = new THREE.PlaneGeometry(160, 180);
  const floorMat = new THREE.MeshStandardMaterial({
    map: concretePbr.map,
    normalMap: concretePbr.normalMap,
    roughnessMap: concretePbr.roughnessMap,
    roughness: 0.9,
    metalness: 0.05,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData = { surface: 'concrete' };
  obstacles.push(floor);
  scene.add(floor);
  disposables.push(floorGeo, floorMat);

  // Red & white firing line stripe at z = 0
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.75,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const lineGeo = new THREE.PlaneGeometry(24, 0.35);
  const firingLine = new THREE.Mesh(lineGeo, lineMat);
  firingLine.rotation.x = -Math.PI / 2;
  firingLine.position.set(0, 0.015, 0);
  scene.add(firingLine);
  disposables.push(lineMat, lineGeo);

  // Steel shelter pillars & canopy over firing line
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x2b313a,
    roughness: 0.42,
    metalness: 0.8,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x694d34,
    roughness: 0.88,
    metalness: 0.04,
  });
  disposables.push(steelMat, woodMat);

  const pillarGeo = new THREE.BoxGeometry(0.28, 4.2, 0.28);
  [-10, 0, 10].forEach((px) => {
    const pillar = new THREE.Mesh(pillarGeo, steelMat);
    pillar.position.set(px, 2.1, 6.2);
    pillar.castShadow = true;
    pillar.userData = { surface: 'metal' };
    obstacles.push(pillar);
    scene.add(pillar);
  });
  const roofGeo = new THREE.BoxGeometry(22, 0.25, 7);
  const roof = new THREE.Mesh(roofGeo, steelMat);
  roof.position.set(0, 4.2, 3.2);
  roof.castShadow = true;
  roof.receiveShadow = true;
  scene.add(roof);
  disposables.push(pillarGeo, roofGeo);

  // Side concrete range walls & backstop berm
  const wallGeo = new THREE.BoxGeometry(1.2, 4.5, 52);
  [-13.5, 13.5].forEach((wx) => {
    const wall = new THREE.Mesh(wallGeo, floorMat);
    wall.position.set(wx, 2.25, -16);
    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.userData = { surface: 'concrete' };
    obstacles.push(wall);
    scene.add(wall);
    colliders.push({ minX: wx - 0.6, maxX: wx + 0.6, minZ: -42, maxZ: 10, maxY: 4.5 });
  });
  const backWallGeo = new THREE.BoxGeometry(28, 5.5, 2.0);
  const backWall = new THREE.Mesh(backWallGeo, floorMat);
  backWall.position.set(0, 2.75, -42);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  backWall.userData = { surface: 'concrete' };
  obstacles.push(backWall);
  scene.add(backWall);
  colliders.push({ minX: -14, maxX: 14, minZ: -43, maxZ: -41, maxY: 5.5 });
  disposables.push(wallGeo, backWallGeo);

  // Shooting bay crates & sandbag benches near firing line (leave plenty of walking space)
  const crateGeo = new THREE.BoxGeometry(1.1, 0.95, 0.9);
  [
    [-7.5, -1.5],
    [7.5, -1.5],
  ].forEach(([cx, cz]) => {
    const crate = new THREE.Mesh(crateGeo, woodMat);
    crate.position.set(cx, 0.475, cz);
    crate.castShadow = true;
    crate.receiveShadow = true;
    crate.userData = { surface: 'concrete' };
    obstacles.push(crate);
    scene.add(crate);
    colliders.push({ minX: cx - 0.55, maxX: cx + 0.55, minZ: cz - 0.45, maxZ: cz + 0.45, maxY: 0.95 });
  });
  disposables.push(crateGeo);

  // Build Horizontal Rail Tracks for Moving Targets
  const railGeo = new THREE.BoxGeometry(16, 0.14, 0.14);
  [-15, -24].forEach((rz) => {
    const rail = new THREE.Mesh(railGeo, steelMat);
    rail.position.set(0, 0.1, rz);
    rail.castShadow = true;
    scene.add(rail);
  });
  disposables.push(railGeo);

  // Overhead Pendulum Gantry at z = -31
  const gantryTopGeo = new THREE.BoxGeometry(18, 0.22, 0.22);
  const gantryTop = new THREE.Mesh(gantryTopGeo, steelMat);
  gantryTop.position.set(0, 4.4, -31);
  scene.add(gantryTop);
  disposables.push(gantryTopGeo);

  // Spawn Targets (Static + Moving Rail + Swinging Pendulum)
  const staticTex = createBullseyeTexture(false);
  const movingTex = createBullseyeTexture(true);
  staticTex.anisotropy = maxAnisotropy;
  movingTex.anisotropy = maxAnisotropy;
  disposables.push(staticTex, movingTex);

  const plateGeo = new THREE.BoxGeometry(1.05, 1.05, 0.08);
  const postGeo = new THREE.CylinderGeometry(0.055, 0.065, 1.2, 8);
  const armGeo = new THREE.CylinderGeometry(0.035, 0.035, 2.2, 8);
  disposables.push(plateGeo, postGeo, armGeo);

  const targetDefs: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    z: number;
    moveType: 'static' | 'slide_x' | 'pendulum';
    moveAmp: number;
    moveSpeed: number;
    phase: number;
  }> = [
    // Static targets
    { id: 't-static-1', label: 'Diana Fija 10m', x: -4.2, y: 0, z: -10, moveType: 'static', moveAmp: 0, moveSpeed: 0, phase: 0 },
    { id: 't-static-2', label: 'Diana Fija 10m', x: 0.0, y: 0, z: -10.5, moveType: 'static', moveAmp: 0, moveSpeed: 0, phase: 0 },
    { id: 't-static-3', label: 'Diana Fija 12m', x: 4.2, y: 0, z: -12, moveType: 'static', moveAmp: 0, moveSpeed: 0, phase: 0 },
    { id: 't-static-4', label: 'Diana Fija 19m', x: -7.2, y: 0, z: -19, moveType: 'static', moveAmp: 0, moveSpeed: 0, phase: 0 },
    // Sliding moving rail targets
    { id: 't-move-1', label: 'Diana Móvil Raíl 15m', x: -2.0, y: 0, z: -15, moveType: 'slide_x', moveAmp: 4.5, moveSpeed: 1.5, phase: 0 },
    { id: 't-move-2', label: 'Diana Móvil Raíl 24m', x: 1.5, y: 0, z: -24, moveType: 'slide_x', moveAmp: 5.5, moveSpeed: 1.9, phase: 2.1 },
    // Swinging pendulum targets hanging from gantry at z = -31
    { id: 't-pend-1', label: 'Diana Péndulo Izq.', x: -4.8, y: 4.4, z: -31, moveType: 'pendulum', moveAmp: 0.55, moveSpeed: 1.75, phase: 0.4 },
    { id: 't-pend-2', label: 'Diana Péndulo Der.', x: 4.8, y: 4.4, z: -31, moveType: 'pendulum', moveAmp: 0.55, moveSpeed: 2.05, phase: 2.6 },
  ];

  targetDefs.forEach((def) => {
    const isMoving = def.moveType !== 'static';
    const root = new THREE.Group();
    root.position.set(def.x, def.y, def.z);

    const pivotGroup = new THREE.Group();
    root.add(pivotGroup);

    const faceMat = new THREE.MeshStandardMaterial({
      map: isMoving ? movingTex : staticTex,
      roughness: 0.42,
      metalness: 0.25,
    });
    disposables.push(faceMat);

    const plate = new THREE.Mesh(plateGeo, faceMat);
    plate.castShadow = true;
    plate.receiveShadow = true;

    if (def.moveType === 'pendulum') {
      const arm = new THREE.Mesh(armGeo, steelMat);
      arm.position.y = -1.1;
      plate.position.y = -2.2;
      pivotGroup.add(arm, plate);
    } else {
      const post = new THREE.Mesh(postGeo, steelMat);
      post.position.y = 0.6;
      plate.position.y = 1.45;
      pivotGroup.add(post, plate);
    }

    plate.userData = { targetId: def.id, surface: 'metal' };
    targetHitboxes.push(plate);
    scene.add(root);

    targets.push({
      id: def.id,
      label: def.label,
      isMoving,
      root,
      pivotGroup,
      basePos: new THREE.Vector3(def.x, def.y, def.z),
      moveType: def.moveType,
      moveAmp: def.moveAmp,
      moveSpeed: def.moveSpeed,
      phase: def.phase,
      hitTilt: 0,
      hitFlashTimer: 0,
      faceMat,
      hitboxMesh: plate,
    });
  });

  // Collider for chicken podium at (-2.6, 5.5)
  colliders.push({ minX: -3.2, maxX: -2.0, minZ: 4.9, maxZ: 6.1, maxY: 1.2 });

  const updateTargets = (delta: number, elapsed: number) => {
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (t.moveType === 'slide_x') {
        t.root.position.x = t.basePos.x + Math.sin(elapsed * t.moveSpeed + t.phase) * t.moveAmp;
      } else if (t.moveType === 'pendulum') {
        t.root.rotation.z = Math.sin(elapsed * t.moveSpeed + t.phase) * t.moveAmp;
      }

      if (t.hitFlashTimer > 0) {
        t.hitFlashTimer -= delta;
        if (t.hitFlashTimer <= 0) {
          t.faceMat.emissive.setHex(0x000000);
        }
      }

      t.hitTilt = THREE.MathUtils.damp(t.hitTilt, 0, 10, delta);
      t.pivotGroup.rotation.x = t.hitTilt;
    }
  };

  return {
    colliders,
    obstacles,
    targets,
    targetHitboxes,
    updateTargets,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
