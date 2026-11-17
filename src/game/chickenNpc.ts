import * as THREE from 'three';

export interface ChickenNpcHandle {
  root: THREE.Group;
  headGroup: THREE.Group;
  beakLower: THREE.Mesh;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  triggerTalk: () => void;
  update: (delta: number, elapsed: number, playerPos: THREE.Vector3) => void;
  dispose: () => void;
}

export function createChickenInstructor(
  scene: THREE.Scene,
  position: THREE.Vector3
): ChickenNpcHandle {
  const root = new THREE.Group();
  root.position.copy(position);

  const disposables: Array<{ dispose: () => void }> = [];

  const featherWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf4efe6,
    roughness: 0.86,
    metalness: 0.02,
  });
  const featherCreamMat = new THREE.MeshStandardMaterial({
    color: 0xe6dcc8,
    roughness: 0.88,
    metalness: 0.02,
  });
  const combRedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.55,
    metalness: 0.05,
  });
  const beakOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.42,
    metalness: 0.08,
  });
  const eyeBlackMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.12,
    metalness: 0.2,
  });
  const hatSilkMat = new THREE.MeshPhysicalMaterial({
    color: 0x111318,
    roughness: 0.24,
    metalness: 0.12,
    clearcoat: 0.65,
    clearcoatRoughness: 0.2,
  });
  const hatRibbonMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.45,
    metalness: 0.15,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.22,
    metalness: 0.92,
  });
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x5c432d,
    roughness: 0.88,
    metalness: 0.05,
  });
  const crateTrimMat = new THREE.MeshStandardMaterial({
    color: 0x2a2f36,
    roughness: 0.48,
    metalness: 0.72,
  });

  disposables.push(
    featherWhiteMat,
    featherCreamMat,
    combRedMat,
    beakOrangeMat,
    eyeBlackMat,
    hatSilkMat,
    hatRibbonMat,
    brassMat,
    crateMat,
    crateTrimMat
  );

  // Wooden & steel briefing podium (grounded at y = 0, top at y = 1.05)
  const podiumGeo = new THREE.BoxGeometry(0.95, 1.0, 0.95);
  const podium = new THREE.Mesh(podiumGeo, crateMat);
  podium.position.y = 0.5;
  podium.castShadow = true;
  podium.receiveShadow = true;

  const podiumTopGeo = new THREE.BoxGeometry(1.04, 0.08, 1.04);
  const podiumTop = new THREE.Mesh(podiumTopGeo, crateTrimMat);
  podiumTop.position.y = 1.04;
  podiumTop.castShadow = true;
  podiumTop.receiveShadow = true;
  root.add(podium, podiumTop);
  disposables.push(podiumGeo, podiumTopGeo);

  // Chicken Body Group standing atop podium at y = 1.08
  const chickenGroup = new THREE.Group();
  chickenGroup.position.y = 1.08;
  root.add(chickenGroup);

  // Feet & Legs
  const legGeo = new THREE.CylinderGeometry(0.024, 0.02, 0.22, 8);
  const footGeo = new THREE.BoxGeometry(0.11, 0.025, 0.14);
  [-0.1, 0.1].forEach((lx) => {
    const leg = new THREE.Mesh(legGeo, beakOrangeMat);
    leg.position.set(lx, 0.11, 0);
    const foot = new THREE.Mesh(footGeo, beakOrangeMat);
    foot.position.set(lx, 0.012, 0.03);
    leg.castShadow = true;
    chickenGroup.add(leg, foot);
  });
  disposables.push(legGeo, footGeo);

  // Plump Body
  const bodyGeo = new THREE.SphereGeometry(0.26, 18, 14);
  bodyGeo.scale(0.92, 0.95, 1.15);
  const body = new THREE.Mesh(bodyGeo, featherWhiteMat);
  body.position.set(0, 0.36, -0.02);
  body.castShadow = true;
  chickenGroup.add(body);
  disposables.push(bodyGeo);

  // Tail Feathers Fan
  const tailGeo = new THREE.BoxGeometry(0.07, 0.22, 0.16);
  for (let i = -1; i <= 1; i++) {
    const tail = new THREE.Mesh(tailGeo, featherCreamMat);
    tail.position.set(i * 0.06, 0.48, -0.29);
    tail.rotation.x = -0.45;
    tail.rotation.y = i * 0.24;
    tail.castShadow = true;
    chickenGroup.add(tail);
  }
  disposables.push(tailGeo);

  // Articulated Wings
  const wingGeo = new THREE.BoxGeometry(0.06, 0.2, 0.26);
  const leftWing = new THREE.Group();
  leftWing.position.set(-0.24, 0.42, -0.02);
  const leftWingMesh = new THREE.Mesh(wingGeo, featherCreamMat);
  leftWingMesh.position.set(-0.02, -0.06, 0);
  leftWingMesh.castShadow = true;
  leftWing.add(leftWingMesh);

  const rightWing = new THREE.Group();
  rightWing.position.set(0.24, 0.42, -0.02);
  const rightWingMesh = new THREE.Mesh(wingGeo, featherCreamMat);
  rightWingMesh.position.set(0.02, -0.06, 0);
  rightWingMesh.castShadow = true;
  rightWing.add(rightWingMesh);

  chickenGroup.add(leftWing, rightWing);
  disposables.push(wingGeo);

  // Gentleman Bow Tie on chest!
  const bowGeo = new THREE.BoxGeometry(0.14, 0.055, 0.035);
  const bowTie = new THREE.Mesh(bowGeo, combRedMat);
  bowTie.position.set(0, 0.44, 0.25);
  chickenGroup.add(bowTie);
  disposables.push(bowGeo);

  // Head Group (tracks player & bobs when talking)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.57, 0.12);
  chickenGroup.add(headGroup);

  const headGeo = new THREE.SphereGeometry(0.165, 16, 14);
  const head = new THREE.Mesh(headGeo, featherWhiteMat);
  head.position.set(0, 0.1, 0);
  head.castShadow = true;
  headGroup.add(head);
  disposables.push(headGeo);

  // Comb (Cresta) & Wattle (Barbilla)
  const combGeo = new THREE.BoxGeometry(0.04, 0.08, 0.14);
  const comb = new THREE.Mesh(combGeo, combRedMat);
  comb.position.set(0, 0.25, 0.02);
  const wattleGeo = new THREE.SphereGeometry(0.04, 8, 8);
  const wattle = new THREE.Mesh(wattleGeo, combRedMat);
  wattle.position.set(0, -0.02, 0.14);
  headGroup.add(comb, wattle);
  disposables.push(combGeo, wattleGeo);

  // Upper & Lower Beak (animated speaking jaw)
  const beakUpperGeo = new THREE.ConeGeometry(0.048, 0.13, 6);
  beakUpperGeo.rotateX(Math.PI / 2);
  const beakUpper = new THREE.Mesh(beakUpperGeo, beakOrangeMat);
  beakUpper.position.set(0, 0.09, 0.19);

  const beakLowerGeo = new THREE.ConeGeometry(0.038, 0.1, 6);
  beakLowerGeo.rotateX(Math.PI / 2);
  const beakLower = new THREE.Mesh(beakLowerGeo, beakOrangeMat);
  beakLower.position.set(0, 0.055, 0.17);
  headGroup.add(beakUpper, beakLower);
  disposables.push(beakUpperGeo, beakLowerGeo);

  // Eyes + Brass Monocle!
  const eyeGeo = new THREE.SphereGeometry(0.025, 10, 10);
  const leftEye = new THREE.Mesh(eyeGeo, eyeBlackMat);
  leftEye.position.set(-0.088, 0.13, 0.125);
  const rightEye = new THREE.Mesh(eyeGeo, eyeBlackMat);
  rightEye.position.set(0.088, 0.13, 0.125);

  const monocleGeo = new THREE.TorusGeometry(0.042, 0.007, 8, 18);
  const monocle = new THREE.Mesh(monocleGeo, brassMat);
  monocle.position.set(0.094, 0.13, 0.148);
  monocle.rotation.y = 0.35;
  headGroup.add(leftEye, rightEye, monocle);
  disposables.push(eyeGeo, monocleGeo);

  // Fine Gentleman's Top Hat ("Sombrero fino")
  const hatGroup = new THREE.Group();
  hatGroup.position.set(0, 0.24, -0.01);
  hatGroup.rotation.z = -0.09; // Jaunty tilt
  hatGroup.rotation.x = -0.06;

  const brimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.022, 22);
  const brim = new THREE.Mesh(brimGeo, hatSilkMat);
  brim.castShadow = true;

  const crownGeo = new THREE.CylinderGeometry(0.14, 0.125, 0.25, 22);
  const crown = new THREE.Mesh(crownGeo, hatSilkMat);
  crown.position.y = 0.13;
  crown.castShadow = true;

  const ribbonGeo = new THREE.CylinderGeometry(0.132, 0.128, 0.045, 22);
  const ribbon = new THREE.Mesh(ribbonGeo, hatRibbonMat);
  ribbon.position.y = 0.038;

  const buckleGeo = new THREE.BoxGeometry(0.045, 0.048, 0.02);
  const buckle = new THREE.Mesh(buckleGeo, brassMat);
  buckle.position.set(0, 0.038, 0.132);

  hatGroup.add(brim, crown, ribbon, buckle);
  headGroup.add(hatGroup);
  disposables.push(brimGeo, crownGeo, ribbonGeo, buckleGeo);

  scene.add(root);

  let talkTimer = 1.2;

  const triggerTalk = () => {
    talkTimer = 2.2;
  };

  const update = (delta: number, elapsed: number, playerPos: THREE.Vector3) => {
    // Turn politely toward player
    const dx = playerPos.x - root.position.x;
    const dz = playerPos.z - root.position.z;
    const targetYaw = Math.atan2(dx, dz);
    let diff = targetYaw - root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    root.rotation.y += diff * Math.min(1, delta * 5.5);

    // Subtle idle bobbing
    chickenGroup.position.y = 1.08 + Math.sin(elapsed * 3.1) * 0.012;

    if (talkTimer > 0) {
      talkTimer -= delta;
      // Animated beak & wing gestures while instructing
      beakLower.rotation.x = 0.12 + Math.abs(Math.sin(elapsed * 22)) * 0.42;
      leftWing.rotation.z = 0.25 + Math.sin(elapsed * 14) * 0.22;
      rightWing.rotation.z = -0.25 - Math.sin(elapsed * 14) * 0.22;
      headGroup.rotation.x = Math.sin(elapsed * 11) * 0.06;
    } else {
      beakLower.rotation.x = THREE.MathUtils.damp(beakLower.rotation.x, 0, 12, delta);
      leftWing.rotation.z = THREE.MathUtils.damp(leftWing.rotation.z, 0.06, 8, delta);
      rightWing.rotation.z = THREE.MathUtils.damp(rightWing.rotation.z, -0.06, 8, delta);
      headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, Math.sin(elapsed * 1.8) * 0.03, 6, delta);
    }
  };

  const dispose = () => {
    disposables.forEach((d) => d.dispose());
  };

  return {
    root,
    headGroup,
    beakLower,
    leftWing,
    rightWing,
    triggerTalk,
    update,
    dispose,
  };
}
