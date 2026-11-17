import * as THREE from 'three';
import type { BuildPieceNetState, BuildPieceType } from './types';

export const BUILD_CELL = 4.0;
export const BUILD_HEIGHT = 3.0;
export const BUILD_MAX_HP = 180;

export function getDefaultEditMask(type: BuildPieceType): boolean[] {
  if (type === 'wall') {
    return new Array(9).fill(true);
  }
  return new Array(4).fill(true);
}

export function getEditGridSize(type: BuildPieceType): { cols: number; rows: number } {
  return type === 'wall' ? { cols: 3, rows: 3 } : { cols: 2, rows: 2 };
}

export function getBuildTypeLabel(type: BuildPieceType): string {
  switch (type) {
    case 'stairs':
      return 'Escaleras';
    case 'floor':
      return 'Suelo';
    case 'ramp':
      return 'Rampa';
    case 'wall':
      return 'Pared';
  }
}

function snapDirection(yaw: number): 0 | 1 | 2 | 3 {
  // Camera look horizontal vector is (-sin(yaw), -cos(yaw))
  const lx = -Math.sin(yaw);
  const lz = -Math.cos(yaw);
  if (Math.abs(lz) >= Math.abs(lx)) {
    return lz < 0 ? 0 : 2;
  }
  return lx > 0 ? 1 : 3;
}

function dirForwardVector(dir: 0 | 1 | 2 | 3): { x: number; z: number } {
  switch (dir) {
    case 0:
      return { x: 0, z: -1 };
    case 1:
      return { x: 1, z: 0 };
    case 2:
      return { x: 0, z: 1 };
    case 3:
      return { x: -1, z: 0 };
  }
}

function dirRotY(dir: number): number {
  const norm = ((Math.round(dir) % 4) + 4) % 4;
  return -norm * (Math.PI / 2);
}

function worldToLocalPiece(
  wx: number,
  wz: number,
  gx: number,
  gz: number,
  dir: number
): { lx: number; lz: number } {
  const cx = gx * BUILD_CELL;
  const cz = gz * BUILD_CELL;
  const dx = wx - cx;
  const dz = wz - cz;
  const norm = ((Math.round(dir) % 4) + 4) % 4;
  // Inverse rotation of rotY = -dir * PI/2
  switch (norm) {
    case 0:
      return { lx: dx, lz: dz };
    case 1:
      return { lx: dz, lz: -dx };
    case 2:
      return { lx: -dx, lz: -dz };
    default:
      return { lx: -dz, lz: dx };
  }
}

interface InternalBuildPiece {
  data: BuildPieceNetState;
  group: THREE.Group;
  visualGroup: THREE.Group;
  hitMeshes: THREE.Mesh[];
  editProxyMesh: THREE.Mesh;
  disposables: THREE.BufferGeometry[];
}

export class BuildingManager {
  private readonly scene: THREE.Scene;
  private readonly pieces = new Map<string, InternalBuildPiece>();
  private readonly woodMat: THREE.MeshStandardMaterial;
  private readonly woodTrimMat: THREE.MeshStandardMaterial;
  private readonly stepGripMat: THREE.MeshStandardMaterial;
  private readonly previewMat: THREE.MeshBasicMaterial;
  private readonly previewWireMat: THREE.LineBasicMaterial;
  private readonly editProxyMat: THREE.MeshBasicMaterial;

  private readonly previewGroup: THREE.Group;
  private previewVisual: THREE.Group | null = null;
  private previewDisposables: THREE.BufferGeometry[] = [];
  private lastPreviewKey = '';

  // Blue Edit Grid Overlay (Fortnite-style held [G] tile grid)
  private readonly editGridGroup: THREE.Group;
  private editTileMeshes: THREE.Mesh[] = [];
  private editTileMaterials: THREE.MeshBasicMaterial[] = [];
  private editTileBorders: THREE.LineSegments[] = [];
  private editTileGeos: THREE.BufferGeometry[] = [];
  private activeEditPieceId: string | null = null;
  private activeEditType: BuildPieceType | null = null;
  private draftMask: boolean[] = [];
  private hoveredTileIndex = -1;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.woodMat = new THREE.MeshStandardMaterial({
      color: 0xb97c46,
      roughness: 0.78,
      metalness: 0.05,
    });
    this.woodTrimMat = new THREE.MeshStandardMaterial({
      color: 0x7c4a21,
      roughness: 0.84,
      metalness: 0.08,
    });
    this.stepGripMat = new THREE.MeshStandardMaterial({
      color: 0xd8a169,
      roughness: 0.72,
      metalness: 0.06,
    });
    this.previewMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.previewWireMat = new THREE.LineBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.82,
    });
    this.editProxyMat = new THREE.MeshBasicMaterial({
      visible: false,
    });

    this.previewGroup = new THREE.Group();
    this.previewGroup.visible = false;
    this.scene.add(this.previewGroup);

    this.editGridGroup = new THREE.Group();
    this.editGridGroup.visible = false;
    this.scene.add(this.editGridGroup);
  }

  public computePlacement(
    type: BuildPieceType,
    playerPos: THREE.Vector3,
    yaw: number,
    pitch: number
  ): { gx: number; gy: number; gz: number; dir: 0 | 1 | 2 | 3 } {
    const dir = snapDirection(yaw);
    const fwd = dirForwardVector(dir);
    const lookDist = type === 'floor' ? 3.2 : 3.6;
    const rawX = playerPos.x + fwd.x * lookDist;
    const rawZ = playerPos.z + fwd.z * lookDist;

    let gx = Math.round(rawX / BUILD_CELL);
    let gz = Math.round(rawZ / BUILD_CELL);
    gx = Math.max(-7, Math.min(7, gx));
    gz = Math.max(-7, Math.min(7, gz));

    const pitchOffset = pitch > 0.38 ? 1 : pitch < -0.58 ? -1 : 0;
    let gy = Math.max(0, Math.min(4, Math.floor((playerPos.y + 0.35) / BUILD_HEIGHT) + pitchOffset));
    if (type === 'floor' && pitch < -0.28 && playerPos.y > 0.6) {
      gy = Math.max(0, Math.min(4, Math.round(playerPos.y / BUILD_HEIGHT)));
    }

    return { gx, gy, gz, dir };
  }

  public hasPieceAt(type: BuildPieceType, gx: number, gy: number, gz: number, dir: 0 | 1 | 2 | 3): boolean {
    for (const p of this.pieces.values()) {
      const d = p.data;
      if (d.type === type && d.gx === gx && d.gy === gy && d.gz === gz) {
        if (type === 'floor' || d.dir === dir) return true;
      }
    }
    return false;
  }

  public addOrReplacePiece(data: BuildPieceNetState): void {
    const existing = this.pieces.get(data.id);
    if (existing) {
      this.removePiece(data.id);
    }

    const group = new THREE.Group();
    group.position.set(data.gx * BUILD_CELL, data.gy * BUILD_HEIGHT, data.gz * BUILD_CELL);
    group.rotation.y = dirRotY(data.dir);

    const visualGroup = new THREE.Group();
    group.add(visualGroup);

    const proxyGeo = this.createEditProxyGeometry(data.type);
    const editProxyMesh = new THREE.Mesh(proxyGeo, this.editProxyMat);
    editProxyMesh.userData = { editBuildId: data.id };
    this.positionEditProxy(data.type, editProxyMesh);
    group.add(editProxyMesh);

    const internal: InternalBuildPiece = {
      data: { ...data, editMask: [...data.editMask] },
      group,
      visualGroup,
      hitMeshes: [],
      editProxyMesh,
      disposables: [proxyGeo],
    };

    this.rebuildPieceMeshes(internal);
    this.scene.add(group);
    this.pieces.set(data.id, internal);
  }

  private createEditProxyGeometry(type: BuildPieceType): THREE.BufferGeometry {
    if (type === 'wall') return new THREE.BoxGeometry(BUILD_CELL, BUILD_HEIGHT, 0.32);
    if (type === 'floor') return new THREE.BoxGeometry(BUILD_CELL, 0.24, BUILD_CELL);
    if (type === 'ramp') {
      const slopeLen = Math.hypot(BUILD_CELL, BUILD_HEIGHT);
      return new THREE.BoxGeometry(BUILD_CELL, 0.28, slopeLen);
    }
    return new THREE.BoxGeometry(BUILD_CELL, BUILD_HEIGHT, BUILD_CELL);
  }

  private positionEditProxy(type: BuildPieceType, mesh: THREE.Mesh) {
    if (type === 'wall') {
      mesh.position.set(0, BUILD_HEIGHT * 0.5, -BUILD_CELL * 0.5);
    } else if (type === 'floor') {
      mesh.position.set(0, 0.08, 0);
    } else if (type === 'ramp') {
      mesh.position.set(0, BUILD_HEIGHT * 0.5, 0);
      mesh.rotation.x = Math.atan2(BUILD_HEIGHT, BUILD_CELL);
    } else {
      mesh.position.set(0, BUILD_HEIGHT * 0.5, 0);
    }
  }

  private rebuildPieceMeshes(piece: InternalBuildPiece) {
    while (piece.visualGroup.children.length > 0) {
      piece.visualGroup.remove(piece.visualGroup.children[0]);
    }
    // Dispose old visual geos (keep editProxyGeo at index 0)
    while (piece.disposables.length > 1) {
      piece.disposables.pop()?.dispose();
    }
    piece.hitMeshes = [];

    const { data } = piece;
    const mat = this.woodMat;
    const trim = this.woodTrimMat;
    const grip = this.stepGripMat;

    const addBox = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      material: THREE.Material,
      rx = 0,
      isHit = true
    ) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      piece.disposables.push(geo);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(x, y, z);
      mesh.rotation.x = rx;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (isHit) {
        mesh.userData = { buildId: data.id, surface: 'concrete' };
        piece.hitMeshes.push(mesh);
      }
      piece.visualGroup.add(mesh);
    };

    if (data.type === 'wall') {
      const tileW = BUILD_CELL / 3;
      const tileH = BUILD_HEIGHT / 3;
      const mask = data.editMask;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (!mask[r * 3 + c]) continue;
          const cx = (c - 1) * tileW;
          const cy = (r + 0.5) * tileH;
          addBox(tileW - 0.04, tileH - 0.04, 0.2, cx, cy, -BUILD_CELL * 0.5, mat);
          addBox(tileW - 0.02, 0.08, 0.24, cx, cy - tileH * 0.44, -BUILD_CELL * 0.5, trim, 0, false);
        }
      }
      // Corner support posts so doorway edits look framed cleanly
      addBox(0.16, BUILD_HEIGHT, 0.25, -BUILD_CELL * 0.5 + 0.08, BUILD_HEIGHT * 0.5, -BUILD_CELL * 0.5, trim, 0, false);
      addBox(0.16, BUILD_HEIGHT, 0.25, BUILD_CELL * 0.5 - 0.08, BUILD_HEIGHT * 0.5, -BUILD_CELL * 0.5, trim, 0, false);
    } else if (data.type === 'floor') {
      const half = BUILD_CELL * 0.5;
      const mask = data.editMask;
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          if (!mask[r * 2 + c]) continue;
          const cx = (c === 0 ? -0.5 : 0.5) * half;
          const cz = (r === 0 ? -0.5 : 0.5) * half;
          addBox(half - 0.04, 0.16, half - 0.04, cx, 0.06, cz, mat);
          addBox(half - 0.08, 0.04, 0.12, cx, 0.145, cz, trim, 0, false);
        }
      }
    } else if (data.type === 'ramp') {
      const slopeAngle = Math.atan2(BUILD_HEIGHT, BUILD_CELL);
      const halfSpan = Math.hypot(BUILD_CELL * 0.5, BUILD_HEIGHT * 0.5);
      const halfW = BUILD_CELL * 0.5;
      const mask = data.editMask;
      // r = 0 is upper half (-Z side, y 1.5..3), r = 1 is lower half (+Z side, y 0..1.5)
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          if (!mask[r * 2 + c]) continue;
          const cx = (c === 0 ? -0.5 : 0.5) * halfW;
          const cz = r === 0 ? -BUILD_CELL * 0.25 : BUILD_CELL * 0.25;
          const cy = r === 0 ? BUILD_HEIGHT * 0.75 : BUILD_HEIGHT * 0.25;
          addBox(halfW - 0.04, 0.16, halfSpan, cx, cy, cz, mat, slopeAngle);
          addBox(halfW - 0.12, 0.04, 0.18, cx, cy + 0.09, cz, grip, slopeAngle, false);
        }
      }
    } else if (data.type === 'stairs') {
      // Stepped staircase: 6 steps rising from +Z (y=0) to -Z (y=3)
      const mask = data.editMask;
      const halfW = BUILD_CELL * 0.5;
      const numSteps = 6;
      const stepD = BUILD_CELL / numSteps;
      const stepH = BUILD_HEIGHT / numSteps;
      for (let s = 0; s < numSteps; s++) {
        const r = s >= 3 ? 0 : 1; // top 3 steps = r=0 (upper), bottom 3 steps = r=1 (lower)
        const cz = BUILD_CELL * 0.5 - (s + 0.5) * stepD;
        const topY = (s + 1) * stepH;
        for (let c = 0; c < 2; c++) {
          if (!mask[r * 2 + c]) continue;
          const cx = (c === 0 ? -0.5 : 0.5) * halfW;
          addBox(halfW - 0.04, 0.14, stepD + 0.06, cx, topY - 0.07, cz, stepGripMatHelper(s, grip, mat));
          // Vertical riser under step
          addBox(halfW - 0.08, stepH, 0.1, cx, topY - stepH * 0.5 - 0.04, cz + stepD * 0.42, trim, 0, false);
        }
      }
    }
  }

  public updatePieceMask(id: string, editMask: boolean[]): void {
    const piece = this.pieces.get(id);
    if (!piece) return;
    piece.data.editMask = [...editMask];
    this.rebuildPieceMeshes(piece);
  }

  public updatePieceHp(id: string, hp: number): void {
    const piece = this.pieces.get(id);
    if (!piece) return;
    piece.data.hp = hp;
    if (hp <= 0) {
      this.removePiece(id);
    }
  }

  public damagePiece(id: string, amount: number): { destroyed: boolean; hp: number } | null {
    const piece = this.pieces.get(id);
    if (!piece) return null;
    piece.data.hp = Math.max(0, piece.data.hp - amount);
    const destroyed = piece.data.hp <= 0;
    const hp = piece.data.hp;
    if (destroyed) {
      this.removePiece(id);
    }
    return { destroyed, hp };
  }

  public removePiece(id: string): void {
    const piece = this.pieces.get(id);
    if (!piece) return;
    this.scene.remove(piece.group);
    piece.disposables.forEach((g) => g.dispose());
    this.pieces.delete(id);
    if (this.activeEditPieceId === id) {
      this.cancelEdit();
    }
  }

  public clearAll(): void {
    this.cancelEdit();
    for (const id of Array.from(this.pieces.keys())) {
      this.removePiece(id);
    }
    this.hidePreview();
  }

  public updatePreview(
    type: BuildPieceType | null,
    playerPos: THREE.Vector3,
    yaw: number,
    pitch: number
  ): void {
    if (!type || this.activeEditPieceId) {
      this.hidePreview();
      return;
    }

    const { gx, gy, gz, dir } = this.computePlacement(type, playerPos, yaw, pitch);
    this.previewGroup.position.set(gx * BUILD_CELL, gy * BUILD_HEIGHT, gz * BUILD_CELL);
    this.previewGroup.rotation.y = dirRotY(dir);
    this.previewGroup.visible = true;

    const already = this.hasPieceAt(type, gx, gy, gz, dir);
    this.previewMat.color.setHex(already ? 0xf59e0b : 0x38bdf8);
    this.previewWireMat.color.setHex(already ? 0xfcd34d : 0x7dd3fc);

    if (this.lastPreviewKey !== type) {
      this.lastPreviewKey = type;
      this.rebuildPreviewMesh(type);
    }
  }

  public hidePreview(): void {
    this.previewGroup.visible = false;
  }

  private rebuildPreviewMesh(type: BuildPieceType) {
    if (this.previewVisual) {
      this.previewGroup.remove(this.previewVisual);
      this.previewVisual = null;
    }
    this.previewDisposables.forEach((g) => g.dispose());
    this.previewDisposables = [];

    const grp = new THREE.Group();
    const addPreviewBox = (w: number, h: number, d: number, x: number, y: number, z: number, rx = 0) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const wireGeo = new THREE.EdgesGeometry(geo);
      this.previewDisposables.push(geo, wireGeo);
      const mesh = new THREE.Mesh(geo, this.previewMat);
      mesh.position.set(x, y, z);
      mesh.rotation.x = rx;
      const line = new THREE.LineSegments(wireGeo, this.previewWireMat);
      mesh.add(line);
      grp.add(mesh);
    };

    if (type === 'wall') {
      addPreviewBox(BUILD_CELL, BUILD_HEIGHT, 0.16, 0, BUILD_HEIGHT * 0.5, -BUILD_CELL * 0.5);
    } else if (type === 'floor') {
      addPreviewBox(BUILD_CELL, 0.14, BUILD_CELL, 0, 0.06, 0);
    } else if (type === 'ramp') {
      const slopeLen = Math.hypot(BUILD_CELL, BUILD_HEIGHT);
      addPreviewBox(BUILD_CELL, 0.14, slopeLen, 0, BUILD_HEIGHT * 0.5, 0, Math.atan2(BUILD_HEIGHT, BUILD_CELL));
    } else {
      const numSteps = 6;
      const stepD = BUILD_CELL / numSteps;
      const stepH = BUILD_HEIGHT / numSteps;
      for (let s = 0; s < numSteps; s++) {
        addPreviewBox(
          BUILD_CELL,
          0.14,
          stepD,
          0,
          (s + 1) * stepH - 0.07,
          BUILD_CELL * 0.5 - (s + 0.5) * stepD
        );
      }
    }

    this.previewVisual = grp;
    this.previewGroup.add(grp);
  }

  public getRaycastHitMeshes(): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for (const p of this.pieces.values()) {
      for (const m of p.hitMeshes) out.push(m);
    }
    return out;
  }

  public getEditProxyMeshes(): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for (const p of this.pieces.values()) {
      out.push(p.editProxyMesh);
    }
    return out;
  }

  // Begin Fortnite-style blue-grid editing on the pointed piece
  public beginEditFromRay(raycaster: THREE.Raycaster): boolean {
    const proxies = this.getEditProxyMeshes();
    if (proxies.length === 0) return false;
    const hits = raycaster.intersectObjects(proxies, false);
    if (hits.length === 0 || hits[0].distance > 14) return false;

    const buildId = hits[0].object.userData?.editBuildId as string | undefined;
    if (!buildId) return false;
    const piece = this.pieces.get(buildId);
    if (!piece) return false;

    this.hidePreview();
    this.activeEditPieceId = piece.data.id;
    this.activeEditType = piece.data.type;
    this.draftMask = [...piece.data.editMask];
    this.hoveredTileIndex = -1;
    this.buildBlueEditOverlay(piece);
    return true;
  }

  private clearBlueEditOverlay() {
    while (this.editGridGroup.children.length > 0) {
      this.editGridGroup.remove(this.editGridGroup.children[0]);
    }
    this.editTileGeos.forEach((g) => g.dispose());
    this.editTileMaterials.forEach((m) => m.dispose());
    this.editTileGeos = [];
    this.editTileMaterials = [];
    this.editTileBorders = [];
    this.editTileMeshes = [];
    this.editGridGroup.visible = false;
  }

  private buildBlueEditOverlay(piece: InternalBuildPiece) {
    this.clearBlueEditOverlay();
    const { data } = piece;

    this.editGridGroup.position.set(
      data.gx * BUILD_CELL,
      data.gy * BUILD_HEIGHT,
      data.gz * BUILD_CELL
    );
    this.editGridGroup.rotation.y = dirRotY(data.dir);
    this.editGridGroup.visible = true;

    const { cols, rows } = getEditGridSize(data.type);

    const addTile = (w: number, h: number, d: number, x: number, y: number, z: number, rx: number, idx: number) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const wireGeo = new THREE.EdgesGeometry(geo);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x2563eb,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthTest: false,
      });
      const wireMat = new THREE.LineBasicMaterial({
        color: 0xe0f2fe,
      });
      this.editTileGeos.push(geo, wireGeo);
      this.editTileMaterials.push(mat, wireMat as unknown as THREE.MeshBasicMaterial);

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.x = rx;
      mesh.renderOrder = 10;
      mesh.userData = { editTileIndex: idx };

      const border = new THREE.LineSegments(wireGeo, wireMat);
      border.renderOrder = 11;
      mesh.add(border);

      this.editTileMeshes.push(mesh);
      this.editTileBorders.push(border);
      this.editGridGroup.add(mesh);
    };

    if (data.type === 'wall') {
      const tileW = BUILD_CELL / cols;
      const tileH = BUILD_HEIGHT / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          addTile(
            tileW - 0.12,
            tileH - 0.12,
            0.28,
            (c - 1) * tileW,
            (r + 0.5) * tileH,
            -BUILD_CELL * 0.5,
            0,
            idx
          );
        }
      }
    } else if (data.type === 'floor') {
      const half = BUILD_CELL * 0.5;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          addTile(
            half - 0.14,
            0.24,
            half - 0.14,
            (c === 0 ? -0.5 : 0.5) * half,
            0.14,
            (r === 0 ? -0.5 : 0.5) * half,
            0,
            idx
          );
        }
      }
    } else if (data.type === 'ramp') {
      const slopeAngle = Math.atan2(BUILD_HEIGHT, BUILD_CELL);
      const halfSpan = Math.hypot(BUILD_CELL * 0.5, BUILD_HEIGHT * 0.5);
      const halfW = BUILD_CELL * 0.5;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          addTile(
            halfW - 0.14,
            0.26,
            halfSpan - 0.12,
            (c === 0 ? -0.5 : 0.5) * halfW,
            r === 0 ? BUILD_HEIGHT * 0.75 : BUILD_HEIGHT * 0.25,
            r === 0 ? -BUILD_CELL * 0.25 : BUILD_CELL * 0.25,
            slopeAngle,
            idx
          );
        }
      }
    } else {
      // Stairs 2x2 blue edit tiles projected above the staircase slope
      const slopeAngle = Math.atan2(BUILD_HEIGHT, BUILD_CELL);
      const halfSpan = Math.hypot(BUILD_CELL * 0.5, BUILD_HEIGHT * 0.5);
      const halfW = BUILD_CELL * 0.5;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          addTile(
            halfW - 0.14,
            0.24,
            halfSpan - 0.12,
            (c === 0 ? -0.5 : 0.5) * halfW,
            (r === 0 ? BUILD_HEIGHT * 0.75 : BUILD_HEIGHT * 0.25) + 0.18,
            r === 0 ? -BUILD_CELL * 0.25 : BUILD_CELL * 0.25,
            slopeAngle,
            idx
          );
        }
      }
    }

    this.refreshEditTileColors();
  }

  public updateEditHover(raycaster: THREE.Raycaster): number {
    if (!this.activeEditPieceId || this.editTileMeshes.length === 0) {
      this.hoveredTileIndex = -1;
      return -1;
    }
    const hits = raycaster.intersectObjects(this.editTileMeshes, false);
    const nextIdx =
      hits.length > 0 && hits[0].distance <= 15
        ? ((hits[0].object.userData?.editTileIndex as number | undefined) ?? -1)
        : -1;
    if (nextIdx !== this.hoveredTileIndex) {
      this.hoveredTileIndex = nextIdx;
      this.refreshEditTileColors();
    }
    return nextIdx;
  }

  public toggleEditTile(tileIndex: number, forceValue?: boolean): boolean {
    if (!this.activeEditPieceId || tileIndex < 0 || tileIndex >= this.draftMask.length) {
      return false;
    }
    const prev = this.draftMask[tileIndex];
    const next = forceValue !== undefined ? forceValue : !prev;
    if (next === prev) return false;
    this.draftMask[tileIndex] = next;
    this.refreshEditTileColors();
    return true;
  }

  public getDraftTileValue(tileIndex: number): boolean | null {
    if (tileIndex < 0 || tileIndex >= this.draftMask.length) return null;
    return this.draftMask[tileIndex];
  }

  public resetDraftMask(): void {
    if (!this.activeEditPieceId || !this.activeEditType) return;
    this.draftMask = getDefaultEditMask(this.activeEditType);
    this.refreshEditTileColors();
  }

  private refreshEditTileColors() {
    for (let i = 0; i < this.editTileMeshes.length; i++) {
      const mat = this.editTileMeshes[i].material as THREE.MeshBasicMaterial;
      const isSolid = this.draftMask[i];
      const isHover = i === this.hoveredTileIndex;
      if (isHover) {
        mat.color.setHex(isSolid ? 0x38bdf8 : 0x0ea5e9);
        mat.opacity = 0.88;
      } else if (isSolid) {
        mat.color.setHex(0x2563eb);
        mat.opacity = 0.68;
      } else {
        mat.color.setHex(0x0f172a);
        mat.opacity = 0.28;
      }
    }
  }

  public commitEdit(): { id: string; editMask: boolean[] } | null {
    if (!this.activeEditPieceId) return null;
    const id = this.activeEditPieceId;
    const piece = this.pieces.get(id);
    const hasAnySolid = this.draftMask.some(Boolean);
    const finalMask = hasAnySolid ? [...this.draftMask] : piece ? [...piece.data.editMask] : [...this.draftMask];

    this.activeEditPieceId = null;
    this.activeEditType = null;
    this.hoveredTileIndex = -1;
    this.clearBlueEditOverlay();

    if (!piece) return null;
    this.updatePieceMask(id, finalMask);
    return { id, editMask: finalMask };
  }

  public cancelEdit(): void {
    this.activeEditPieceId = null;
    this.activeEditType = null;
    this.draftMask = [];
    this.hoveredTileIndex = -1;
    this.clearBlueEditOverlay();
  }

  public isEditing(): boolean {
    return this.activeEditPieceId !== null;
  }

  public getEditPieceType(): BuildPieceType | null {
    return this.activeEditType;
  }

  public getEditMask(): boolean[] {
    return [...this.draftMask];
  }

  public getPieceCount(): number {
    return this.pieces.size;
  }

  public collidesHorizontal(x: number, z: number, playerFootY: number, radius: number): boolean {
    const playerHeadY = playerFootY + 1.68;

    for (const p of this.pieces.values()) {
      const d = p.data;
      const baseY = d.gy * BUILD_HEIGHT;

      if (d.type === 'wall') {
        if (playerHeadY <= baseY + 0.05 || playerFootY >= baseY + BUILD_HEIGHT - 0.12) continue;
        const { lx, lz } = worldToLocalPiece(x, z, d.gx, d.gz, d.dir);
        // Wall lies at lz = -2.0, thickness 0.24 => collide if |lz + 2.0| < radius + 0.12
        if (Math.abs(lz + BUILD_CELL * 0.5) < radius + 0.14 && Math.abs(lx) < BUILD_CELL * 0.5 + radius * 0.7) {
          const tileW = BUILD_CELL / 3;
          const tileH = BUILD_HEIGHT / 3;
          // Check overlapping rows & cols in the 3x3 wall mask
          for (let r = 0; r < 3; r++) {
            const tileMinY = baseY + r * tileH;
            const tileMaxY = tileMinY + tileH;
            if (playerHeadY <= tileMinY + 0.06 || playerFootY >= tileMaxY - 0.06) continue;
            for (let c = 0; c < 3; c++) {
              if (!d.editMask[r * 3 + c]) continue;
              const tileCenterX = (c - 1) * tileW;
              if (Math.abs(lx - tileCenterX) < tileW * 0.5 + radius * 0.72) {
                return true;
              }
            }
          }
        }
      } else if (d.type === 'floor') {
        // Only block horizontally if player torso hits the edge slab thickness directly
        if (playerFootY < baseY - 0.1 && playerHeadY > baseY + 0.18) {
          // Player passes underneath, no horizontal block
          continue;
        }
      }
    }
    return false;
  }

  public groundHeightAt(x: number, z: number, currentFootY: number): number {
    let maxSupportY = 0;

    for (const p of this.pieces.values()) {
      const d = p.data;
      const baseY = d.gy * BUILD_HEIGHT;
      const { lx, lz } = worldToLocalPiece(x, z, d.gx, d.gz, d.dir);
      const margin = 0.22;
      if (Math.abs(lx) > BUILD_CELL * 0.5 + margin || Math.abs(lz) > BUILD_CELL * 0.5 + margin) {
        continue;
      }

      if (d.type === 'floor') {
        const c = lx >= 0 ? 1 : 0;
        const r = lz >= 0 ? 1 : 0;
        if (!d.editMask[r * 2 + c]) continue;
        const topY = baseY + 0.14;
        if (currentFootY >= topY - 0.55) {
          maxSupportY = Math.max(maxSupportY, topY);
        }
      } else if (d.type === 'ramp' || d.type === 'stairs') {
        // Normalized progress from back (+2 -> t=0) to front (-2 -> t=1)
        const clampedZ = Math.max(-BUILD_CELL * 0.5, Math.min(BUILD_CELL * 0.5, lz));
        const t = (BUILD_CELL * 0.5 - clampedZ) / BUILD_CELL;
        const c = lx >= 0 ? 1 : 0;
        const r = t >= 0.5 ? 0 : 1;
        if (!d.editMask[r * 2 + c]) continue;

        let surfaceY: number;
        if (d.type === 'stairs') {
          const stepIdx = Math.min(5, Math.max(0, Math.floor(t * 6)));
          surfaceY = baseY + ((stepIdx + 1) / 6) * BUILD_HEIGHT;
        } else {
          surfaceY = baseY + t * BUILD_HEIGHT + 0.08;
        }

        if (currentFootY >= surfaceY - 0.78) {
          maxSupportY = Math.max(maxSupportY, surfaceY);
        }
      }
    }

    return maxSupportY;
  }

  public dispose(): void {
    this.clearAll();
    this.previewDisposables.forEach((g) => g.dispose());
    this.previewDisposables = [];
    this.scene.remove(this.previewGroup);
    this.scene.remove(this.editGridGroup);
    this.woodMat.dispose();
    this.woodTrimMat.dispose();
    this.stepGripMat.dispose();
    this.previewMat.dispose();
    this.previewWireMat.dispose();
    this.editProxyMat.dispose();
  }
}

function stepGripMatHelper(
  stepIdx: number,
  grip: THREE.MeshStandardMaterial,
  wood: THREE.MeshStandardMaterial
): THREE.MeshStandardMaterial {
  return stepIdx % 2 === 0 ? wood : grip;
}
