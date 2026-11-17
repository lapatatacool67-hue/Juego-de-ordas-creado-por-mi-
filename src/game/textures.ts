import * as THREE from 'three';

export interface PbrTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

function hash2d(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2d(ix, iy);
  const b = hash2d(ix + 1, iy);
  const c = hash2d(ix, iy + 1);
  const d = hash2d(ix + 1, iy + 1);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, octaves = 4): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * valueNoise(x * freq, y * freq);
    freq *= 2.02;
    amp *= 0.5;
  }
  return value;
}

function heightToNormalCanvas(height: Float32Array, size: number, strength: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const ym = (y - 1 + size) % size;
      const yp = (y + 1) % size;

      const dx = (height[y * size + xp] - height[y * size + xm]) * strength;
      const dy = (height[yp * size + x] - height[ym * size + x]) * strength;

      const nx = -dx;
      const ny = -dy;
      const nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      const idx = (y * size + x) * 4;
      data[idx] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createAsphaltPbr(
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number
): PbrTextureSet {
  const size = 256;
  const height = new Float32Array(size * size);

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;
  const cImg = cCtx.createImageData(size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const coarse = fbm(x * 0.04, y * 0.04, 4);
      const grit = hash2d(x * 1.3, y * 1.7);
      // Cracks
      const crackSignal = Math.abs(fbm(x * 0.028 + 11.4, y * 0.028 + 4.2, 3) - 0.5);
      const isCrack = crackSignal < 0.015 ? (0.015 - crackSignal) / 0.015 : 0;

      // Subtle damp/oil patches
      const damp = coarse < 0.36 ? (0.36 - coarse) * 1.8 : 0;

      const h = 0.5 + grit * 0.28 + coarse * 0.22 - isCrack * 0.65;
      height[idx] = h;

      const base = 54 + coarse * 26 + grit * 14 - isCrack * 28 - damp * 14;
      const pIdx = idx * 4;
      cImg.data[pIdx] = Math.max(15, Math.min(255, base));
      cImg.data[pIdx + 1] = Math.max(15, Math.min(255, base + 1));
      cImg.data[pIdx + 2] = Math.max(15, Math.min(255, base + 4));
      cImg.data[pIdx + 3] = 255;

      // Damp patches are glossy (low roughness), dry asphalt is rough
      const roughVal = Math.max(65, Math.min(248, 228 - damp * 135 - grit * 24 + isCrack * 20));
      rImg.data[pIdx] = roughVal;
      rImg.data[pIdx + 1] = roughVal;
      rImg.data[pIdx + 2] = roughVal;
      rImg.data[pIdx + 3] = 255;
    }
  }

  cCtx.putImageData(cImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  const normalCanvas = heightToNormalCanvas(height, size, 3.2);

  return {
    map: finalizeTexture(colorCanvas, true, repeatX, repeatY, maxAnisotropy),
    normalMap: finalizeTexture(normalCanvas, false, repeatX, repeatY, maxAnisotropy),
    roughnessMap: finalizeTexture(roughCanvas, false, repeatX, repeatY, maxAnisotropy),
  };
}

export function createWeatheredConcretePbr(
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
  tintHex = 0x868a90
): PbrTextureSet {
  const size = 256;
  const height = new Float32Array(size * size);
  const tint = new THREE.Color(tintHex);

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;
  const cImg = cCtx.createImageData(size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const stain = fbm(x * 0.025 + 3.1, y * 0.025 + 7.4, 4);
      const fine = hash2d(x, y);
      // Vertical rain streak weathering
      const streak = fbm(x * 0.09, y * 0.012, 3);
      const seam = x < 3 || y < 3 || (Math.abs(x - 128) < 2) || (Math.abs(y - 128) < 2) ? 1 : 0;

      const h = 0.55 + stain * 0.25 + fine * 0.1 - seam * 0.45;
      height[idx] = h;

      const lum = (0.68 + stain * 0.28 + fine * 0.06 - streak * 0.16 - seam * 0.22);
      const pIdx = idx * 4;
      cImg.data[pIdx] = Math.max(18, Math.min(255, tint.r * 255 * lum));
      cImg.data[pIdx + 1] = Math.max(18, Math.min(255, tint.g * 255 * lum));
      cImg.data[pIdx + 2] = Math.max(18, Math.min(255, tint.b * 255 * lum));
      cImg.data[pIdx + 3] = 255;

      const rough = Math.max(140, Math.min(250, 215 + fine * 20 - stain * 25));
      rImg.data[pIdx] = rough;
      rImg.data[pIdx + 1] = rough;
      rImg.data[pIdx + 2] = rough;
      rImg.data[pIdx + 3] = 255;
    }
  }

  cCtx.putImageData(cImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  const normalCanvas = heightToNormalCanvas(height, size, 2.8);

  return {
    map: finalizeTexture(colorCanvas, true, repeatX, repeatY, maxAnisotropy),
    normalMap: finalizeTexture(normalCanvas, false, repeatX, repeatY, maxAnisotropy),
    roughnessMap: finalizeTexture(roughCanvas, false, repeatX, repeatY, maxAnisotropy),
  };
}

export function createUrbanBrickPbr(
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
  baseColorHex = 0x6f4e44
): PbrTextureSet {
  const size = 256;
  const height = new Float32Array(size * size);
  const baseColor = new THREE.Color(baseColorHex);

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;
  const cImg = cCtx.createImageData(size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(size, size);

  const brickW = 32;
  const brickH = 16;

  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / brickH);
    const localY = y % brickH;
    const offsetX = (row % 2) * (brickW / 2);

    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const sx = (x + offsetX) % size;
      const col = Math.floor(sx / brickW);
      const localX = sx % brickW;

      const isMortar = localX < 2 || localY < 2;
      const brickSeed = hash2d(col + row * 17, row * 31);
      const grit = fbm(x * 0.14, y * 0.14, 3);
      const grime = fbm(x * 0.025, y * 0.015, 3);

      height[idx] = isMortar ? 0.18 + grit * 0.08 : 0.65 + grit * 0.25 + brickSeed * 0.08;

      const pIdx = idx * 4;
      if (isMortar) {
        const mShade = 95 + grit * 25 - grime * 22;
        cImg.data[pIdx] = mShade;
        cImg.data[pIdx + 1] = mShade - 2;
        cImg.data[pIdx + 2] = mShade - 4;
      } else {
        const shade = (0.72 + brickSeed * 0.34 + grit * 0.12) * (1 - grime * 0.32);
        cImg.data[pIdx] = Math.min(255, baseColor.r * 255 * shade);
        cImg.data[pIdx + 1] = Math.min(255, baseColor.g * 255 * shade);
        cImg.data[pIdx + 2] = Math.min(255, baseColor.b * 255 * shade);
      }
      cImg.data[pIdx + 3] = 255;

      const rough = isMortar ? 242 : Math.round(205 + grit * 35);
      rImg.data[pIdx] = rough;
      rImg.data[pIdx + 1] = rough;
      rImg.data[pIdx + 2] = rough;
      rImg.data[pIdx + 3] = 255;
    }
  }

  cCtx.putImageData(cImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  const normalCanvas = heightToNormalCanvas(height, size, 3.6);

  return {
    map: finalizeTexture(colorCanvas, true, repeatX, repeatY, maxAnisotropy),
    normalMap: finalizeTexture(normalCanvas, false, repeatX, repeatY, maxAnisotropy),
    roughnessMap: finalizeTexture(roughCanvas, false, repeatX, repeatY, maxAnisotropy),
  };
}

export function createCorrugatedRustPbr(
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
  paintHex = 0x38515c
): PbrTextureSet {
  const size = 256;
  const height = new Float32Array(size * size);
  const paint = new THREE.Color(paintHex);

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;
  const cImg = cCtx.createImageData(size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const rib = Math.sin((x / size) * Math.PI * 24) * 0.5 + 0.5;
      const rustNoise = fbm(x * 0.045 + 9.2, y * 0.03 + 2.1, 4);
      const isRust = rustNoise > 0.54;

      height[idx] = rib * 0.72 + rustNoise * 0.25;

      const pIdx = idx * 4;
      if (isRust) {
        const rLum = 0.75 + hash2d(x, y) * 0.25;
        cImg.data[pIdx] = 122 * rLum;
        cImg.data[pIdx + 1] = 58 * rLum;
        cImg.data[pIdx + 2] = 32 * rLum;
        rImg.data[pIdx] = 232;
        rImg.data[pIdx + 1] = 232;
        rImg.data[pIdx + 2] = 232;
      } else {
        const lum = 0.78 + rib * 0.22;
        cImg.data[pIdx] = paint.r * 255 * lum;
        cImg.data[pIdx + 1] = paint.g * 255 * lum;
        cImg.data[pIdx + 2] = paint.b * 255 * lum;
        rImg.data[pIdx] = 138;
        rImg.data[pIdx + 1] = 138;
        rImg.data[pIdx + 2] = 138;
      }
      cImg.data[pIdx + 3] = 255;
      rImg.data[pIdx + 3] = 255;
    }
  }

  cCtx.putImageData(cImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  const normalCanvas = heightToNormalCanvas(height, size, 4.2);

  return {
    map: finalizeTexture(colorCanvas, true, repeatX, repeatY, maxAnisotropy),
    normalMap: finalizeTexture(normalCanvas, false, repeatX, repeatY, maxAnisotropy),
    roughnessMap: finalizeTexture(roughCanvas, false, repeatX, repeatY, maxAnisotropy),
  };
}

export function createSkyDomeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Overcast golden-dusty abandoned city sky
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#495a6f');
  grad.addColorStop(0.32, '#738294');
  grad.addColorStop(0.55, '#a6adb4');
  grad.addColorStop(0.68, '#c7bfb2');
  grad.addColorStop(1.0, '#6e737b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Soft low sun glow
  const sunGrad = ctx.createRadialGradient(740, 268, 8, 740, 268, 220);
  sunGrad.addColorStop(0, 'rgba(255, 244, 214, 0.95)');
  sunGrad.addColorStop(0.22, 'rgba(255, 222, 168, 0.45)');
  sunGrad.addColorStop(1, 'rgba(255, 222, 168, 0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Layered cloud streaks
  for (let i = 0; i < 42; i++) {
    const cx = Math.random() * 1024;
    const cy = 40 + Math.random() * 210;
    const w = 140 + Math.random() * 260;
    const h = 14 + Math.random() * 26;
    const cloudGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, w * 0.5);
    cloudGrad.addColorStop(0, 'rgba(218, 223, 230, 0.18)');
    cloudGrad.addColorStop(1, 'rgba(218, 223, 230, 0)');
    ctx.fillStyle = cloudGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createDesertSandPbr(
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number
): PbrTextureSet {
  const size = 256;
  const height = new Float32Array(size * size);

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;
  const cImg = cCtx.createImageData(size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const duneWave = Math.sin((y / size) * Math.PI * 10 + fbm(x * 0.03, y * 0.03, 3) * 4.5) * 0.5 + 0.5;
      const grain = hash2d(x * 1.4, y * 1.9);
      const drift = fbm(x * 0.025 + 6.3, y * 0.025 + 1.8, 3);

      height[idx] = duneWave * 0.62 + drift * 0.25 + grain * 0.13;

      const shade = 0.8 + duneWave * 0.14 + (grain - 0.5) * 0.08 + (drift - 0.5) * 0.1;
      const pIdx = idx * 4;
      cImg.data[pIdx] = Math.min(255, Math.round(214 * shade));
      cImg.data[pIdx + 1] = Math.min(255, Math.round(174 * shade));
      cImg.data[pIdx + 2] = Math.min(255, Math.round(116 * shade));
      cImg.data[pIdx + 3] = 255;

      const rough = Math.max(185, Math.min(248, 224 + grain * 20 - duneWave * 16));
      rImg.data[pIdx] = rough;
      rImg.data[pIdx + 1] = rough;
      rImg.data[pIdx + 2] = rough;
      rImg.data[pIdx + 3] = 255;
    }
  }

  cCtx.putImageData(cImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  const normalCanvas = heightToNormalCanvas(height, size, 2.9);

  return {
    map: finalizeTexture(colorCanvas, true, repeatX, repeatY, maxAnisotropy),
    normalMap: finalizeTexture(normalCanvas, false, repeatX, repeatY, maxAnisotropy),
    roughnessMap: finalizeTexture(roughCanvas, false, repeatX, repeatY, maxAnisotropy),
  };
}

export function createSandstoneBlockPbr(
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
  baseHex = 0xc29b61
): PbrTextureSet {
  const size = 256;
  const height = new Float32Array(size * size);
  const base = new THREE.Color(baseHex);

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;
  const cImg = cCtx.createImageData(size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(size, size);

  const blockW = 64;
  const blockH = 32;

  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / blockH);
    const localY = y % blockH;
    const offsetX = (row % 2) * (blockW / 2);

    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const sx = (x + offsetX) % size;
      const col = Math.floor(sx / blockW);
      const localX = sx % blockW;

      const isSeam = localX < 2 || localY < 2;
      const seed = hash2d(col + row * 19, row * 23);
      const erosion = fbm(x * 0.08, y * 0.05, 4);

      height[idx] = isSeam ? 0.16 : 0.64 + erosion * 0.28 + seed * 0.08;

      const shade = isSeam ? 0.56 : 0.78 + seed * 0.22 + (erosion - 0.5) * 0.18;
      const pIdx = idx * 4;
      cImg.data[pIdx] = Math.min(255, Math.round(base.r * 255 * shade));
      cImg.data[pIdx + 1] = Math.min(255, Math.round(base.g * 255 * shade));
      cImg.data[pIdx + 2] = Math.min(255, Math.round(base.b * 255 * shade));
      cImg.data[pIdx + 3] = 255;

      const rough = isSeam ? 245 : Math.round(208 + erosion * 34);
      rImg.data[pIdx] = rough;
      rImg.data[pIdx + 1] = rough;
      rImg.data[pIdx + 2] = rough;
      rImg.data[pIdx + 3] = 255;
    }
  }

  cCtx.putImageData(cImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  const normalCanvas = heightToNormalCanvas(height, size, 3.4);

  return {
    map: finalizeTexture(colorCanvas, true, repeatX, repeatY, maxAnisotropy),
    normalMap: finalizeTexture(normalCanvas, false, repeatX, repeatY, maxAnisotropy),
    roughnessMap: finalizeTexture(roughCanvas, false, repeatX, repeatY, maxAnisotropy),
  };
}

export function createDesertSkyDomeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#1f5e9c');
  grad.addColorStop(0.32, '#4a88bd');
  grad.addColorStop(0.54, '#c7b89c');
  grad.addColorStop(0.68, '#e3be84');
  grad.addColorStop(1.0, '#c69a63');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  const sunGrad = ctx.createRadialGradient(690, 232, 10, 690, 232, 235);
  sunGrad.addColorStop(0, 'rgba(255, 252, 235, 1)');
  sunGrad.addColorStop(0.18, 'rgba(255, 224, 150, 0.65)');
  sunGrad.addColorStop(1, 'rgba(255, 210, 130, 0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(0, 0, 1024, 512);

  for (let i = 0; i < 24; i++) {
    const cx = Math.random() * 1024;
    const cy = 50 + Math.random() * 160;
    const w = 130 + Math.random() * 220;
    const h = 10 + Math.random() * 18;
    const cloudGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, w * 0.5);
    cloudGrad.addColorStop(0, 'rgba(255, 245, 225, 0.16)');
    cloudGrad.addColorStop(1, 'rgba(255, 245, 225, 0)');
    ctx.fillStyle = cloudGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function finalizeVoxelTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

export function createVoxelGrassTopTex(repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const palette = ['#5a9e38', '#4f8f30', '#67ae41', '#48822b', '#74bc4a'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = hash2d(x * 3.1 + 2, y * 4.7 + 9);
      ctx.fillStyle = palette[Math.floor(n * palette.length) % palette.length];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return finalizeVoxelTexture(canvas, repeatX, repeatY);
}

export function createVoxelGrassSideTex(repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const dirtPal = ['#7c5436', '#6b472d', '#8b6040', '#5d3d26'];
  const grassPal = ['#5a9e38', '#4e8b2f', '#6eb846'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grassDepth = 3 + Math.floor(hash2d(x * 7, 1) * 3);
      if (y < grassDepth) {
        const idx = Math.floor(hash2d(x * 2.3, y * 5.1) * grassPal.length);
        ctx.fillStyle = grassPal[idx];
      } else {
        const idx = Math.floor(hash2d(x * 3.7, y * 2.9) * dirtPal.length);
        ctx.fillStyle = dirtPal[idx];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return finalizeVoxelTexture(canvas, repeatX, repeatY);
}

export function createVoxelDirtPathTex(repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const pal = ['#9b7b4b', '#8d6f41', '#ab8956', '#7e6338'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = Math.floor(hash2d(x * 5.3, y * 3.1) * pal.length);
      ctx.fillStyle = pal[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return finalizeVoxelTexture(canvas, repeatX, repeatY);
}

export function createVoxelCobbleTex(repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#5c6066';
  ctx.fillRect(0, 0, size, size);
  const stones = [
    [0, 0, 7, 5, '#868b92'],
    [8, 0, 8, 6, '#767b82'],
    [0, 6, 5, 5, '#71757c'],
    [6, 7, 6, 4, '#92979e'],
    [13, 7, 3, 5, '#7e838b'],
    [0, 12, 8, 4, '#8b9098'],
    [9, 12, 7, 4, '#6d7178'],
  ] as const;
  for (const [sx, sy, sw, sh, col] of stones) {
    ctx.fillStyle = col;
    ctx.fillRect(sx, sy, Math.max(1, sw - 1), Math.max(1, sh - 1));
    ctx.fillStyle = '#a0a5ad';
    ctx.fillRect(sx, sy, Math.max(1, sw - 1), 1);
  }
  return finalizeVoxelTexture(canvas, repeatX, repeatY);
}

export function createVoxelPlankTex(repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rowColors = ['#b38953', '#a67d49', '#bd925b', '#9d7542'];
  for (let y = 0; y < size; y++) {
    const plank = Math.floor(y / 4);
    const isSeam = y % 4 === 0;
    for (let x = 0; x < size; x++) {
      const vJoint = (plank % 2 === 0 && x === 8) || (plank % 2 === 1 && x === 3);
      if (isSeam || vJoint) {
        ctx.fillStyle = '#6f4e2b';
      } else {
        const grain = hash2d(x * 1.9 + plank * 11, y * 4.2);
        ctx.fillStyle = grain > 0.72 ? '#c79e65' : rowColors[plank % rowColors.length];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return finalizeVoxelTexture(canvas, repeatX, repeatY);
}

export function createVoxelLogTex(repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const pal = ['#5f4329', '#523922', '#6b4d31', '#48311c'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ridge = (x + Math.floor(hash2d(x, y * 0.3) * 2)) % 3 === 0 ? 1 : 0;
      const idx = Math.min(pal.length - 1, Math.floor(hash2d(x * 4, y * 1.5) * 3) + ridge);
      ctx.fillStyle = pal[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return finalizeVoxelTexture(canvas, repeatX, repeatY);
}

export function createVoxelLeafTex(repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const pal = ['#397524', '#468a2d', '#2b5b1a', '#539c36'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = Math.floor(hash2d(x * 3.3, y * 6.1) * pal.length);
      ctx.fillStyle = pal[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return finalizeVoxelTexture(canvas, repeatX, repeatY);
}

export function createVoxelWaterTex(repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const pal = ['#2868b8', '#2f76cc', '#22599e', '#3b86de'];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const wave = Math.floor(hash2d(x * 2.1, y * 3.9) * pal.length);
      ctx.fillStyle = pal[wave];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return finalizeVoxelTexture(canvas, repeatX, repeatY);
}

export function createVoxelSkyDomeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, '#4f8fe6');
  grad.addColorStop(0.45, '#7cb8ff');
  grad.addColorStop(0.68, '#b8dcff');
  grad.addColorStop(1.0, '#a3ccf0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Square blocky sun!
  ctx.fillStyle = '#fff9d6';
  ctx.fillRect(348, 42, 34, 34);
  ctx.fillStyle = 'rgba(255, 249, 214, 0.25)';
  ctx.fillRect(340, 34, 50, 50);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

export function createPixelSkyDomeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Classic bright NES #5c94fc sky
  ctx.fillStyle = '#5c94fc';
  ctx.fillRect(0, 0, 256, 128);

  // Subtle upper sky band & bright horizon strip
  ctx.fillStyle = '#4e86ef';
  ctx.fillRect(0, 0, 256, 28);
  ctx.fillStyle = '#70a4ff';
  ctx.fillRect(0, 82, 256, 46);

  // Crisp pixel sun
  ctx.fillStyle = '#fcf8a8';
  ctx.fillRect(192, 18, 16, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(195, 21, 10, 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

export function createPixelGroundBrickTex(repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // SMB 1-1 orange-brown ground stone blocks
  ctx.fillStyle = '#c84c0c';
  ctx.fillRect(0, 0, size, size);

  // Top highlight lips
  ctx.fillStyle = '#fcbcb0';
  ctx.fillRect(0, 0, 9, 1);
  ctx.fillRect(10, 0, 6, 1);
  ctx.fillRect(0, 8, 5, 1);
  ctx.fillRect(6, 8, 10, 1);
  ctx.fillRect(0, 1, 1, 6);
  ctx.fillRect(10, 1, 1, 6);
  ctx.fillRect(6, 9, 1, 6);

  // Crisp black mortar lines
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 7, 16, 1);
  ctx.fillRect(0, 15, 16, 1);
  ctx.fillRect(9, 0, 1, 8);
  ctx.fillRect(5, 8, 1, 8);
  ctx.fillRect(8, 6, 1, 1);
  ctx.fillRect(4, 14, 1, 1);

  return finalizeVoxelTexture(canvas, repeatX, repeatY);
}

export function createPixelBrickBlockTex(repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b83800';
  ctx.fillRect(0, 0, size, size);

  // Mortar rows
  ctx.fillStyle = '#000000';
  for (let y = 3; y < 16; y += 4) {
    ctx.fillRect(0, y, 16, 1);
  }
  ctx.fillRect(7, 0, 1, 3);
  ctx.fillRect(15, 0, 1, 3);
  ctx.fillRect(3, 4, 1, 3);
  ctx.fillRect(11, 4, 1, 3);
  ctx.fillRect(7, 8, 1, 3);
  ctx.fillRect(15, 8, 1, 3);
  ctx.fillRect(3, 12, 1, 3);
  ctx.fillRect(11, 12, 1, 3);

  // Top highlight strip
  ctx.fillStyle = '#fcbcb0';
  ctx.fillRect(0, 0, 16, 1);

  return finalizeVoxelTexture(canvas, repeatX, repeatY);
}

export function createPixelQuestionBlockTex(): THREE.CanvasTexture {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Golden orange face
  ctx.fillStyle = '#fc9838';
  ctx.fillRect(0, 0, size, size);

  // Outer pixel bevel border
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 15, 16, 1);
  ctx.fillRect(15, 0, 1, 16);
  ctx.fillStyle = '#fcbcb0';
  ctx.fillRect(0, 0, 15, 1);
  ctx.fillRect(0, 0, 1, 15);

  // Corner bolts
  ctx.fillStyle = '#7c2d00';
  ctx.fillRect(2, 2, 1, 1);
  ctx.fillRect(13, 2, 1, 1);
  ctx.fillRect(2, 13, 1, 1);
  ctx.fillRect(13, 13, 1, 1);

  // Classic '?' shadow & foreground
  const drawQ = (ox: number, oy: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(ox + 5, oy + 3, 5, 2);
    ctx.fillRect(ox + 4, oy + 4, 2, 2);
    ctx.fillRect(ox + 9, oy + 4, 2, 3);
    ctx.fillRect(ox + 7, oy + 7, 3, 2);
    ctx.fillRect(ox + 7, oy + 9, 2, 1);
    ctx.fillRect(ox + 7, oy + 11, 2, 2);
  };
  drawQ(1, 1, '#000000');
  drawQ(0, 0, '#9a3412');

  return finalizeVoxelTexture(canvas, 1, 1);
}

export function createPixelPipeTex(repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#00a800';
  ctx.fillRect(0, 0, size, size);
  // Bright retro green highlights
  ctx.fillStyle = '#80d010';
  ctx.fillRect(2, 0, 3, size);
  ctx.fillRect(6, 0, 1, size);
  // Dark shadow edge
  ctx.fillStyle = '#005800';
  ctx.fillRect(12, 0, 3, size);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 16, 1);
  ctx.fillRect(0, 15, 16, 1);

  return finalizeVoxelTexture(canvas, repeatX, repeatY);
}

export function createPixelHillTex(): THREE.CanvasTexture {
  const w = 32;
  const h = 20;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  // Stepped green pixel dome
  for (let y = 2; y < h; y++) {
    const progress = (y - 2) / (h - 2);
    const halfW = Math.floor(3 + progress * 12);
    const left = 16 - halfW;
    ctx.fillStyle = '#00a800';
    ctx.fillRect(left, y, halfW * 2, 1);
    ctx.fillStyle = '#000000';
    ctx.fillRect(left, y, 1, 1);
    ctx.fillRect(16 + halfW - 1, y, 1, 1);
  }
  ctx.fillStyle = '#000000';
  ctx.fillRect(13, 1, 6, 1);

  // Cute pixel hill eyes matching SMB 1-1
  ctx.fillStyle = '#000000';
  ctx.fillRect(15, 7, 1, 3);
  ctx.fillRect(18, 8, 1, 3);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

export function createPixelBushTex(): THREE.CanvasTexture {
  const w = 32;
  const h = 16;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  // Fluffy bright-lime pixel bush mounds
  ctx.fillStyle = '#80d010';
  ctx.fillRect(2, 8, 28, 8);
  ctx.fillRect(5, 5, 22, 6);
  ctx.fillRect(10, 2, 12, 5);
  ctx.fillStyle = '#00a800';
  ctx.fillRect(2, 13, 28, 3);
  ctx.fillStyle = '#000000';
  ctx.fillRect(10, 1, 12, 1);
  ctx.fillRect(5, 4, 5, 1);
  ctx.fillRect(22, 4, 5, 1);
  ctx.fillRect(1, 8, 1, 8);
  ctx.fillRect(30, 8, 1, 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

export function createBackroomsWallpaperTex(repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Classic Level 0 mono-yellow wallpaper base
  ctx.fillStyle = '#bfb056';
  ctx.fillRect(0, 0, w, h);

  // Subtle vertical stripes
  for (let x = 0; x < w; x += 16) {
    ctx.fillStyle = x % 32 === 0 ? 'rgba(155, 138, 52, 0.28)' : 'rgba(218, 204, 114, 0.16)';
    ctx.fillRect(x, 0, 8, h);
  }

  // Retro geometric arrow/diamond wallpaper motif
  ctx.strokeStyle = 'rgba(128, 112, 38, 0.36)';
  ctx.lineWidth = 2;
  for (let y = 16; y < h - 24; y += 32) {
    for (let x = 8; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, y + 10);
      ctx.lineTo(x + 8, y);
      ctx.lineTo(x + 16, y + 10);
      ctx.lineTo(x + 8, y + 20);
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = 'rgba(132, 116, 40, 0.25)';
      ctx.fillRect(x + 6, y + 8, 4, 4);
    }
  }

  // Subtle damp aging / water stains near bottom
  const stainGrad = ctx.createLinearGradient(0, h - 56, 0, h);
  stainGrad.addColorStop(0, 'rgba(68, 58, 22, 0)');
  stainGrad.addColorStop(1, 'rgba(56, 46, 16, 0.42)');
  ctx.fillStyle = stainGrad;
  ctx.fillRect(0, h - 56, w, 56);

  // Dark rubber/wood baseboard molding
  ctx.fillStyle = '#4f4322';
  ctx.fillRect(0, h - 18, w, 18);
  ctx.fillStyle = '#362c14';
  ctx.fillRect(0, h - 18, w, 3);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

export function createBackroomsCarpetTex(repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#928144';
  ctx.fillRect(0, 0, size, size);

  let seed = 9187;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 4200; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const roll = rand();
    ctx.fillStyle =
      roll < 0.35
        ? 'rgba(116, 102, 50, 0.48)'
        : roll < 0.72
          ? 'rgba(164, 146, 78, 0.32)'
          : 'rgba(72, 62, 28, 0.35)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle damp spot patches
  for (let p = 0; p < 4; p++) {
    const px = rand() * size;
    const py = rand() * size;
    const r = 18 + rand() * 26;
    const g = ctx.createRadialGradient(px, py, 2, px, py, r);
    g.addColorStop(0, 'rgba(64, 54, 24, 0.28)');
    g.addColorStop(1, 'rgba(64, 54, 24, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

export function createBackroomsCeilingTex(repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Acoustic drop ceiling tiles
  ctx.fillStyle = '#b9b28a';
  ctx.fillRect(0, 0, size, size);

  let seed = 3119;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(130, 124, 92, 0.3)' : 'rgba(205, 198, 162, 0.25)';
    ctx.fillRect(rand() * size, rand() * size, 2, 2);
  }

  // Metal T-bar acoustic tile grid (2x2 tiles per texture tile)
  ctx.strokeStyle = '#736f58';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}



