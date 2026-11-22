import * as THREE from 'three';
import { RoomObject } from '../types/fengshui';

// ============================================================================
// 1. HIGH RESOLUTION PROCEDURAL PBR TEXTURES
// ============================================================================

let woodTextureCache: THREE.CanvasTexture | null = null;
let floorParquetCache: THREE.CanvasTexture | null = null;
let fabricTextureCache: THREE.CanvasTexture | null = null;
let marbleTextureCache: THREE.CanvasTexture | null = null;
let plasterTextureCache: THREE.CanvasTexture | null = null;

/**
 * Creates photorealistic warm American walnut wood texture with fine organic fibers and growth rings.
 */
export function getProceduralWoodTexture(): THREE.CanvasTexture {
  if (woodTextureCache) return woodTextureCache;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Warm American Walnut base (#6d472d)
  ctx.fillStyle = '#6d472d';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle wood fiber variations
  for (let i = 0; i < 700; i++) {
    const y = Math.random() * 1024;
    const h = 2 + Math.random() * 4;
    const alpha = 0.05 + Math.random() * 0.09;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(45, 25, 12, ${alpha})` : `rgba(165, 120, 85, ${alpha})`;
    ctx.fillRect(0, y, 1024, h);
  }

  // Elegant wavy grain flow
  ctx.lineWidth = 1.2;
  for (let y = 0; y < 1024; y += 6) {
    ctx.strokeStyle = `rgba(50, 28, 14, ${0.1 + Math.sin(y * 0.02) * 0.06})`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < 1024; x += 32) {
      const wave = Math.sin((x + y * 2) * 0.015) * 5 + Math.cos(x * 0.03) * 3;
      ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }

  woodTextureCache = new THREE.CanvasTexture(canvas);
  woodTextureCache.wrapS = THREE.RepeatWrapping;
  woodTextureCache.wrapT = THREE.RepeatWrapping;
  woodTextureCache.colorSpace = THREE.SRGBColorSpace;
  return woodTextureCache;
}

/**
 * Creates luxury architectural French oak / warm walnut hardwood floor texture.
 */
export function getProceduralFloorTexture(): THREE.CanvasTexture {
  if (floorParquetCache) return floorParquetCache;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#9c6f49';
  ctx.fillRect(0, 0, 1024, 1024);

  const plankH = 56;
  const plankW = 256;
  const cols = 1024 / plankW + 1;
  const rows = 1024 / plankH;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (plankW / 2);
    for (let c = -1; c < cols; c++) {
      const x = c * plankW + offset;
      const y = r * plankH;

      // Realistic plank tone variations (Warm walnut & French oak tones)
      const toneVariance = 0.88 + Math.random() * 0.24;
      const rCol = Math.min(255, Math.round(155 * toneVariance));
      const gCol = Math.min(255, Math.round(110 * toneVariance));
      const bCol = Math.min(255, Math.round(72 * toneVariance));

      ctx.fillStyle = `rgb(${rCol}, ${gCol}, ${bCol})`;
      ctx.fillRect(x + 1, y + 1, plankW - 2, plankH - 2);

      // Plank bevel gap
      ctx.strokeStyle = '#3e2412';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(x, y, plankW, plankH);

      // Fine micro fibers inside plank
      ctx.fillStyle = 'rgba(40, 22, 10, 0.08)';
      for (let f = 0; f < 5; f++) {
        ctx.fillRect(x + 2, y + 5 + f * 9, plankW - 4, 1.2);
      }
    }
  }

  floorParquetCache = new THREE.CanvasTexture(canvas);
  floorParquetCache.wrapS = THREE.RepeatWrapping;
  floorParquetCache.wrapT = THREE.RepeatWrapping;
  floorParquetCache.repeat.set(3.5, 3.5);
  floorParquetCache.colorSpace = THREE.SRGBColorSpace;
  return floorParquetCache;
}

/**
 * Creates luxury woven boucle/linen fabric texture for upholstered beds, duvets, and pillows.
 */
export function getProceduralFabricTexture(): THREE.CanvasTexture {
  if (fabricTextureCache) return fabricTextureCache;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f5f0e6';
  ctx.fillRect(0, 0, 512, 512);

  // Weave grid micro-texture
  for (let i = 0; i < 512; i += 4) {
    ctx.fillStyle = i % 8 === 0 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(i, 0, 2, 512);
    ctx.fillRect(0, i, 512, 2);
  }

  fabricTextureCache = new THREE.CanvasTexture(canvas);
  fabricTextureCache.wrapS = THREE.RepeatWrapping;
  fabricTextureCache.wrapT = THREE.RepeatWrapping;
  fabricTextureCache.repeat.set(6, 6);
  fabricTextureCache.colorSpace = THREE.SRGBColorSpace;
  return fabricTextureCache;
}

/**
 * Creates Calacatta / Carrara Italian white marble texture with subtle grey and gold veins.
 */
export function getProceduralMarbleTexture(): THREE.CanvasTexture {
  if (marbleTextureCache) return marbleTextureCache;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8f8f6';
  ctx.fillRect(0, 0, 512, 512);

  // Delicate diagonal marble veins
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = 'rgba(160, 165, 170, 0.22)';
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.bezierCurveTo(140, 120, 210, 240, 320, 512);
  ctx.stroke();

  ctx.lineWidth = 1.4;
  ctx.strokeStyle = 'rgba(180, 150, 110, 0.18)';
  ctx.beginPath();
  ctx.moveTo(180, 0);
  ctx.bezierCurveTo(280, 160, 360, 290, 500, 480);
  ctx.stroke();

  marbleTextureCache = new THREE.CanvasTexture(canvas);
  marbleTextureCache.wrapS = THREE.RepeatWrapping;
  marbleTextureCache.wrapT = THREE.RepeatWrapping;
  marbleTextureCache.colorSpace = THREE.SRGBColorSpace;
  return marbleTextureCache;
}

/**
 * Creates subtle architectural Venetian plaster / limestone wall texture.
 */
export function getProceduralPlasterTexture(): THREE.CanvasTexture {
  if (plasterTextureCache) return plasterTextureCache;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f3eee6'; // Warm modern alabaster / off-white
  ctx.fillRect(0, 0, 512, 512);

  // Subtle plaster stippling
  for (let i = 0; i < 7000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const alpha = 0.02 + Math.random() * 0.035;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(180, 170, 155, ${alpha})` : `rgba(255, 255, 255, ${alpha * 1.5})`;
    ctx.fillRect(x, y, 1.5 + Math.random() * 2, 1.5 + Math.random() * 2);
  }

  plasterTextureCache = new THREE.CanvasTexture(canvas);
  plasterTextureCache.wrapS = THREE.RepeatWrapping;
  plasterTextureCache.wrapT = THREE.RepeatWrapping;
  plasterTextureCache.repeat.set(4, 4);
  plasterTextureCache.colorSpace = THREE.SRGBColorSpace;
  return plasterTextureCache;
}

// ============================================================================
// 2. SHARED LUXURY PBR MATERIALS
// ============================================================================

const woodTexture = typeof document !== 'undefined' ? getProceduralWoodTexture() : null;
const fabricTexture = typeof document !== 'undefined' ? getProceduralFabricTexture() : null;
const marbleTexture = typeof document !== 'undefined' ? getProceduralMarbleTexture() : null;
const plasterTexture = typeof document !== 'undefined' ? getProceduralPlasterTexture() : null;

export const walnutWoodMat = new THREE.MeshStandardMaterial({
  map: woodTexture,
  color: 0x825838, // Warm American walnut
  roughness: 0.38,
  metalness: 0.04,
});

export const darkWalnutWoodMat = new THREE.MeshStandardMaterial({
  map: woodTexture,
  color: 0x4e331e, // Deep smoked walnut
  roughness: 0.42,
  metalness: 0.06,
});

export const creamCabinetMat = new THREE.MeshStandardMaterial({
  color: 0xf3eee5, // Off-white cream lacquer
  roughness: 0.35,
  metalness: 0.02,
});

export const wallMat = new THREE.MeshStandardMaterial({
  map: plasterTexture,
  color: 0xf2ede4, // Warm architectural cream plaster
  roughness: 0.88,
  metalness: 0.02,
  side: THREE.DoubleSide,
});

export const creamFabricMat = new THREE.MeshStandardMaterial({
  map: fabricTexture,
  color: 0xf6f1e8, // Warm off-white boucle / linen
  roughness: 0.92,
  metalness: 0.01,
});

export const oliveFabricMat = new THREE.MeshStandardMaterial({
  map: fabricTexture,
  color: 0x5a6d51, // Olive green linen throw / runner
  roughness: 0.88,
  metalness: 0.02,
});

export const caramelFabricMat = new THREE.MeshStandardMaterial({
  map: fabricTexture,
  color: 0xa87747, // Caramel / cognac accent pillow
  roughness: 0.88,
  metalness: 0.02,
});

export const calacattaMarbleMat = new THREE.MeshStandardMaterial({
  map: marbleTexture,
  color: 0xfaf9f5,
  roughness: 0.16,
  metalness: 0.06,
});

export const metalGoldMat = new THREE.MeshStandardMaterial({
  color: 0xd4b26f, // Champagne brushed brass
  roughness: 0.25,
  metalness: 0.88,
});

export const metalBlackMat = new THREE.MeshStandardMaterial({
  color: 0x222426, // Matte architectural black
  roughness: 0.4,
  metalness: 0.75,
});

export const mirrorGlassMat = new THREE.MeshStandardMaterial({
  color: 0xedf4fa,
  roughness: 0.02,
  metalness: 0.96,
});

export const plantLeafMat = new THREE.MeshStandardMaterial({
  color: 0x326b42,
  roughness: 0.4,
  metalness: 0.08,
  side: THREE.DoubleSide,
});

export const potMat = new THREE.MeshStandardMaterial({
  color: 0xf2ede2,
  roughness: 0.75,
  metalness: 0.04,
});

export const warmLedMat = new THREE.MeshStandardMaterial({
  color: 0xffe4b5,
  emissive: 0xffba66,
  emissiveIntensity: 2.2,
  roughness: 0.2,
});

export const whitePorcelainMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.12,
  metalness: 0.05,
});

export const frostedGlassMat = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0,
  roughness: 0.35,
  metalness: 0.1,
  transparent: true,
  opacity: 0.45,
  side: THREE.DoubleSide,
});

export const chromeMat = new THREE.MeshStandardMaterial({
  color: 0xf1f5f9,
  roughness: 0.15,
  metalness: 0.95,
});

// Shared Contact Shadow Plane
let contactShadowTexCache: THREE.CanvasTexture | null = null;
export function getContactShadowTex(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (contactShadowTexCache) return contactShadowTexCache;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const csCtx = canvas.getContext('2d');
  if (!csCtx) return null;
  const csGrad = csCtx.createRadialGradient(64, 64, 10, 64, 64, 62);
  csGrad.addColorStop(0, 'rgba(0, 0, 0, 0.48)');
  csGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.22)');
  csGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.06)');
  csGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  csCtx.fillStyle = csGrad;
  csCtx.fillRect(0, 0, 128, 128);
  contactShadowTexCache = new THREE.CanvasTexture(canvas);
  return contactShadowTexCache;
}

export function createContactShadowMesh(w: number, l: number, opacity: number = 0.82): THREE.Mesh {
  const tex = getContactShadowTex();
  const mat = tex
    ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false })
    : new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: opacity * 0.3, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, l), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.004;
  return mesh;
}

// ============================================================================
// 3. PHOTOREALISTIC PROCEDURAL FURNITURE MODELS (EXACT MATCH WITH PHOTO)
// ============================================================================

/**
 * 1. MODERN UPHOLSTERED BED (Giường bọc nệm cao cấp)
 * - Cream padded cushioned headboard with dual backrest pillows
 * - Walnut wooden frame with recessed brass legs
 * - Layered linen duvet in off-white
 * - Folded olive-green bed runner throw across foot of the bed
 * - 4 layered pillows: 2 off-white + 1 olive green cushion + 1 caramel cushion
 */
export function createBedModel(width: number, length: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'BedGroup';

  const frameH = 0.26;
  const legH = 0.12;
  const mattressH = 0.25;
  const headboardH = 1.05;
  const headboardThick = 0.14;

  // Contact Shadow
  group.add(createContactShadowMesh(width * 1.15, length * 1.15, 0.88));

  // 1. Bed Frame (Warm Walnut with beveled edge)
  const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(width, frameH, length), walnutWoodMat);
  frameMesh.position.y = legH + frameH / 2;
  frameMesh.castShadow = true;
  frameMesh.receiveShadow = true;
  group.add(frameMesh);

  // 2. Corner Legs (4 tapered walnut legs with brass tips)
  const legGeo = new THREE.CylinderGeometry(0.035, 0.022, legH, 16);
  const legOffsets = [
    [-width / 2 + 0.09, -length / 2 + 0.09],
    [width / 2 - 0.09, -length / 2 + 0.09],
    [-width / 2 + 0.09, length / 2 - 0.09],
    [width / 2 - 0.09, length / 2 - 0.09],
  ];
  legOffsets.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, darkWalnutWoodMat);
    leg.position.set(lx, legH / 2, lz);
    leg.castShadow = true;
    group.add(leg);

    const brassTip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.022, 0.035, 16), metalGoldMat);
    brassTip.position.set(lx, 0.0175, lz);
    group.add(brassTip);
  });

  // 3. Mattress (Soft cream profile)
  const mattressMesh = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.06, mattressH, length - 0.08),
    creamFabricMat
  );
  mattressMesh.position.y = legH + frameH + mattressH / 2;
  mattressMesh.castShadow = true;
  mattressMesh.receiveShadow = true;
  group.add(mattressMesh);

  // 4. Headboard: Main Backrest in warm walnut + cream upholstered structure
  const headboardMesh = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.06, headboardH, headboardThick),
    creamFabricMat
  );
  headboardMesh.position.set(0, headboardH / 2, -length / 2 + headboardThick / 2);
  headboardMesh.castShadow = true;
  group.add(headboardMesh);

  // Walnut perimeter rim on headboard
  const headboardTopRim = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.08, 0.04, headboardThick + 0.02),
    walnutWoodMat
  );
  headboardTopRim.position.set(0, headboardH - 0.02, -length / 2 + headboardThick / 2);
  group.add(headboardTopRim);

  // Dual Plush Upholstered Back Cushion Pads (as seen in photo)
  const padW = (width - 0.12) / 2;
  const padH = headboardH * 0.68;
  const padThick = 0.08;
  [-1, 1].forEach((side) => {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(padW - 0.03, padH, padThick), creamFabricMat);
    pad.position.set(
      side * (padW / 2 + 0.015),
      legH + frameH + padH / 2 + 0.04,
      -length / 2 + headboardThick + padThick / 2
    );
    pad.castShadow = true;
    group.add(pad);
  });

  // 5. Duvet / Quilt (covers lower 70% of bed with folded linen lip)
  const duvetL = length * 0.68;
  const duvetMesh = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.03, 0.08, duvetL),
    creamFabricMat
  );
  duvetMesh.position.set(0, legH + frameH + mattressH + 0.04, length / 2 - duvetL / 2);
  duvetMesh.castShadow = true;
  group.add(duvetMesh);

  // 6. Distinct Olive-Green Bed Runner / Throw Blanket (Exact match with reference image)
  const runnerMesh = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.04, 0.025, 0.48),
    oliveFabricMat
  );
  runnerMesh.position.set(0, legH + frameH + mattressH + 0.09, length / 2 - 0.45);
  runnerMesh.castShadow = true;
  group.add(runnerMesh);

  // 7. 4 Layered Pillows: 2 large sleeping pillows + 2 accent throw cushions
  const pillowW = (width - 0.28) / 2;
  [-1, 1].forEach((side) => {
    // Large sleeping pillow
    const p = new THREE.Mesh(new THREE.BoxGeometry(pillowW, 0.12, 0.38), creamFabricMat);
    p.position.set(side * (pillowW / 2 + 0.03), legH + frameH + mattressH + 0.06, -length / 2 + 0.42);
    p.rotation.x = 0.18;
    p.castShadow = true;
    group.add(p);
  });

  // Accent Cushion Left: Olive Green with caramel leather center strap
  const c1 = new THREE.Mesh(new THREE.BoxGeometry(pillowW * 0.75, 0.14, 0.22), oliveFabricMat);
  c1.position.set(-(pillowW / 2 + 0.03), legH + frameH + mattressH + 0.12, -length / 2 + 0.64);
  c1.rotation.x = 0.32;
  c1.castShadow = true;
  group.add(c1);

  const strap1 = new THREE.Mesh(new THREE.BoxGeometry(pillowW * 0.76, 0.035, 0.04), caramelFabricMat);
  strap1.position.set(-(pillowW / 2 + 0.03), legH + frameH + mattressH + 0.12, -length / 2 + 0.65);
  strap1.rotation.x = 0.32;
  group.add(strap1);

  // Accent Cushion Right: Olive Green with caramel leather center strap (matching reference photo)
  const c2 = new THREE.Mesh(new THREE.BoxGeometry(pillowW * 0.75, 0.14, 0.22), oliveFabricMat);
  c2.position.set(pillowW / 2 + 0.03, legH + frameH + mattressH + 0.12, -length / 2 + 0.64);
  c2.rotation.x = 0.32;
  c2.castShadow = true;
  group.add(c2);

  const strap2 = new THREE.Mesh(new THREE.BoxGeometry(pillowW * 0.76, 0.035, 0.04), caramelFabricMat);
  strap2.position.set(pillowW / 2 + 0.03, legH + frameH + mattressH + 0.12, -length / 2 + 0.65);
  strap2.rotation.x = 0.32;
  group.add(strap2);

  // 8. Attached Luxury Upholstered Bench at the Head/Foot Base (Exact match with reference image)
  const benchW = width * 0.88;
  const benchD = 0.34;
  const benchH = 0.36;
  const benchBase = new THREE.Mesh(new THREE.BoxGeometry(benchW, 0.08, benchD), darkWalnutWoodMat);
  benchBase.position.set(0, 0.04, -length / 2 - benchD / 2 - 0.01);
  benchBase.castShadow = true;
  group.add(benchBase);

  // Bench Dual Cushions in cream boucle fabric
  [-1, 1].forEach((side) => {
    const cushionW = (benchW - 0.04) / 2;
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(cushionW - 0.02, benchH - 0.08, benchD - 0.04), creamFabricMat);
    cushion.position.set(side * (cushionW / 2 + 0.01), (benchH - 0.08) / 2 + 0.08, -length / 2 - benchD / 2 - 0.01);
    cushion.castShadow = true;
    group.add(cushion);
  });

  return group;
}

/**
 * 2. MODERN BUILT-IN WARDROBE (Tủ quần áo hiện đại có kệ hở đèn LED)
 * - 3 flat cream/off-white doors with sleek vertical dark handles
 * - Right open illuminated display shelving in walnut with books, bowl & potted plant
 * - Integrated warm LED backlights
 */
export function createWardrobeModel(width: number, length: number, height: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'WardrobeGroup';

  group.add(createContactShadowMesh(width * 1.12, length * 1.15, 0.88));

  const shelfSectionW = 0.75;
  const closedSectionW = width - shelfSectionW;

  // 1. Outer Carcass / Frame in Walnut
  const carcass = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), walnutWoodMat);
  carcass.position.y = height / 2;
  carcass.castShadow = true;
  carcass.receiveShadow = true;
  group.add(carcass);

  // 2. Closed Section: 3 Flat Cream Doors
  const doorCount = 3;
  const singleDoorW = closedSectionW / doorCount;
  for (let d = 0; d < doorCount; d++) {
    const doorX = -width / 2 + singleDoorW / 2 + d * singleDoorW;
    const doorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(singleDoorW - 0.015, height - 0.08, 0.02),
      creamCabinetMat
    );
    doorMesh.position.set(doorX, height / 2, length / 2 + 0.01);
    doorMesh.castShadow = true;
    group.add(doorMesh);

    // Slim Vertical Matte Black Handle
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.38, 12),
      metalBlackMat
    );
    handle.position.set(doorX + (d === 1 ? -singleDoorW * 0.35 : singleDoorW * 0.35), height * 0.52, length / 2 + 0.03);
    group.add(handle);
  }

  // 3. Open Display Shelves on Right (4 tiered shelves with warm lighting)
  const shelfX = width / 2 - shelfSectionW / 2;
  const shelfCount = 4;
  const shelfSpacing = height / shelfCount;

  for (let s = 1; s < shelfCount; s++) {
    const sY = s * shelfSpacing;

    // Shelf board
    const board = new THREE.Mesh(new THREE.BoxGeometry(shelfSectionW - 0.04, 0.03, length - 0.04), walnutWoodMat);
    board.position.set(shelfX, sY, 0.02);
    group.add(board);

    // Warm LED strip under each shelf
    const ledStrip = new THREE.Mesh(
      new THREE.BoxGeometry(shelfSectionW - 0.08, 0.01, 0.02),
      warmLedMat
    );
    ledStrip.position.set(shelfX, sY - 0.015, length / 2 - 0.04);
    group.add(ledStrip);

    // Display items on shelves:
    if (s === 1) {
      // Row of Books
      for (let b = 0; b < 6; b++) {
        const bookMat = new THREE.MeshStandardMaterial({
          color: [0xa87747, 0x4e6347, 0x334155, 0xb45309, 0xfaf5ff, 0x1e293b][b % 6],
          roughness: 0.8,
        });
        const book = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.22, 0.16), bookMat);
        book.position.set(shelfX - 0.2 + b * 0.052, sY + 0.11, 0.05);
        book.castShadow = true;
        group.add(book);
      }
    } else if (s === 2) {
      // Ceramic decorative bowl & small vase
      const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.18, 16), potMat);
      vase.position.set(shelfX - 0.12, sY + 0.09, 0.05);
      vase.castShadow = true;
      group.add(vase);

      const tinyPlant = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), plantLeafMat);
      tinyPlant.position.set(shelfX + 0.15, sY + 0.08, 0.05);
      group.add(tinyPlant);
    } else if (s === 3) {
      // Miniature potted plant on top shelf
      const miniPot = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.08, 12), potMat);
      miniPot.position.set(shelfX + 0.1, sY + 0.04, 0.05);
      group.add(miniPot);
      const miniPlant = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06), plantLeafMat);
      miniPlant.position.set(shelfX + 0.1, sY + 0.12, 0.05);
      group.add(miniPlant);
    }
  }

  // 4. Two Lower Walnut Drawers beneath open shelves
  const drawerH = shelfSpacing - 0.05;
  for (let dr = 0; dr < 2; dr++) {
    const drFace = new THREE.Mesh(
      new THREE.BoxGeometry(shelfSectionW - 0.03, drawerH / 2 - 0.02, 0.02),
      walnutWoodMat
    );
    const drY = 0.08 + dr * (drawerH / 2);
    drFace.position.set(shelfX, drY, length / 2 + 0.01);
    group.add(drFace);

    // Black handle pull
    const knob = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.015), metalBlackMat);
    knob.position.set(shelfX, drY, length / 2 + 0.025);
    group.add(knob);
  }

  return group;
}

/**
 * 3. MINIMAL WALNUT STUDY / WORK DESK (Bàn làm việc gỗ)
 * - Walnut top with chamfered edge
 * - Pedestal drawer unit on the right
 * - Slender tapered black metal legs on left
 * - Aluminum laptop open, minimal task lamp, and small potted succulent
 */
export function createDeskModel(width: number, length: number, height: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'DeskGroup';

  group.add(createContactShadowMesh(width * 1.15, length * 1.15, 0.78));

  const topThick = 0.04;

  // 1. Walnut Desktop Surface
  const topMesh = new THREE.Mesh(new THREE.BoxGeometry(width, topThick, length), walnutWoodMat);
  topMesh.position.y = height - topThick / 2;
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // 2. Right Drawer Unit
  const drawerUnitW = Math.min(0.44, width * 0.35);
  const drawerUnitH = height * 0.65;
  const drawerUnitD = length * 0.9;
  const drawerX = width / 2 - drawerUnitW / 2 - 0.04;
  const drawerMesh = new THREE.Mesh(new THREE.BoxGeometry(drawerUnitW, drawerUnitH, drawerUnitD), walnutWoodMat);
  drawerMesh.position.set(drawerX, height - topThick - drawerUnitH / 2, 0);
  drawerMesh.castShadow = true;
  group.add(drawerMesh);

  // 3. Left Modern Tapered Black Steel Legs
  const legH = height - topThick;
  const leftLegOffsets = [
    [-width / 2 + 0.06, -length / 2 + 0.06],
    [-width / 2 + 0.06, length / 2 - 0.06],
  ];
  leftLegOffsets.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, legH, 12), metalBlackMat);
    leg.position.set(lx, legH / 2, lz);
    leg.castShadow = true;
    group.add(leg);

    const brassGlide = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.018, 0.025, 12), metalGoldMat);
    brassGlide.position.set(lx, 0.012, lz);
    group.add(brassGlide);
  });

  // 4. Aluminum Laptop Open on Desk
  const laptopW = 0.32;
  const laptopD = 0.22;
  const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(laptopW, 0.008, laptopD), metalBlackMat);
  laptopBase.position.set(-0.1, height + 0.004, 0.04);
  laptopBase.castShadow = true;
  group.add(laptopBase);

  const screenH = 0.2;
  const screenMesh = new THREE.Mesh(new THREE.BoxGeometry(laptopW, screenH, 0.006), metalBlackMat);
  screenMesh.position.set(-0.1, height + 0.004 + (screenH / 2) * Math.cos(0.24), -laptopD / 2 + 0.02);
  screenMesh.rotation.x = -0.28;
  group.add(screenMesh);

  const screenGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(laptopW - 0.025, screenH - 0.025),
    new THREE.MeshBasicMaterial({ color: 0x93c5fd })
  );
  screenGlow.position.set(-0.1, height + 0.004 + (screenH / 2) * Math.cos(0.24), -laptopD / 2 + 0.025);
  screenGlow.rotation.x = -0.28;
  group.add(screenGlow);

  // 5. Minimalist Curved Desk Task Lamp
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 16), metalBlackMat);
  lampBase.position.set(-width / 2 + 0.16, height + 0.006, -length / 2 + 0.14);
  group.add(lampBase);

  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.38, 12), metalGoldMat);
  lampPole.position.set(-width / 2 + 0.16, height + 0.2, -length / 2 + 0.14);
  group.add(lampPole);

  const lampHead = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.09, 16), metalBlackMat);
  lampHead.rotation.x = Math.PI * 0.75;
  lampHead.position.set(-width / 2 + 0.22, height + 0.38, -length / 2 + 0.18);
  group.add(lampHead);

  // 6. Ceramic Succulent Planter on Desk
  const succulentPot = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.07, 12), potMat);
  succulentPot.position.set(drawerX, height + 0.035, -length / 2 + 0.16);
  succulentPot.castShadow = true;
  group.add(succulentPot);

  const succulentLeaf = new THREE.Mesh(new THREE.DodecahedronGeometry(0.05), plantLeafMat);
  succulentLeaf.position.set(drawerX, height + 0.09, -length / 2 + 0.16);
  group.add(succulentLeaf);

  return group;
}

/**
 * 4. MODERN ERGONOMIC CHAIR (Ghế làm việc bọc nệm bo tròn)
 * - Cream boucle upholstered curved backrest and padded seat
 * - 4 tapered walnut/brass legs
 */
export function createChairModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ChairGroup';

  group.add(createContactShadowMesh(0.65, 0.65, 0.7));

  const seatH = 0.45;

  // 4 Tapered legs splayed outwards
  const legGeo = new THREE.CylinderGeometry(0.018, 0.012, seatH, 12);
  const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
  angles.forEach((ang) => {
    const lx = Math.cos(ang) * 0.2;
    const lz = Math.sin(ang) * 0.2;
    const leg = new THREE.Mesh(legGeo, walnutWoodMat);
    leg.position.set(lx, seatH / 2, lz);
    leg.rotation.z = Math.cos(ang) * 0.08;
    leg.rotation.x = Math.sin(ang) * 0.08;
    leg.castShadow = true;
    group.add(leg);
  });

  // Padded Round Seat Cushion
  const seatGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.08, 24);
  const seat = new THREE.Mesh(seatGeo, creamFabricMat);
  seat.position.y = seatH + 0.04;
  seat.castShadow = true;
  group.add(seat);

  // Curved Wrap-around Upholstered Backrest
  const backGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.32, 24, 1, true, -Math.PI * 0.65, Math.PI * 1.3);
  const backMesh = new THREE.Mesh(backGeo, creamFabricMat);
  backMesh.position.set(0, seatH + 0.22, -0.06);
  backMesh.castShadow = true;
  group.add(backMesh);

  return group;
}

// ============================================================================
// CHAIR VARIANTS — Each with distinct geometry
// ============================================================================

/**
 * Swivel office chair: 5-star wheeled base, gas lift cylinder,
 * lumbar mesh backrest, headrest, L-shaped armrests.
 */
export function createSwivelChairModel(w: number, l: number, h: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SwivelChairGroup';
  group.add(createContactShadowMesh(w * 1.3, l * 1.3, 0.75));

  const seatY = h * 0.42;

  // 5-star base spokes (flat cylinder + 5 arms)
  const hubGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 20);
  const hub = new THREE.Mesh(hubGeo, metalBlackMat);
  hub.position.y = 0.02;
  hub.castShadow = true;
  group.add(hub);

  for (let i = 0; i < 5; i++) {
    const ang = (i * 2 * Math.PI) / 5;
    const armLen = w * 0.52;
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(armLen, 0.025, 0.04),
      metalBlackMat
    );
    arm.position.set(Math.cos(ang) * armLen * 0.5, 0.025, Math.sin(ang) * armLen * 0.5);
    arm.rotation.y = -ang;
    arm.castShadow = true;
    group.add(arm);

    // Caster wheel at tip of each spoke
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.02, 12), metalBlackMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(Math.cos(ang) * armLen * 0.96, 0.02, Math.sin(ang) * armLen * 0.96);
    group.add(wheel);
  }

  // Gas lift pneumatic cylinder
  const liftGeo = new THREE.CylinderGeometry(0.028, 0.038, seatY - 0.04, 16);
  const lift = new THREE.Mesh(liftGeo, chromeMat);
  lift.position.y = 0.04 + (seatY - 0.04) / 2;
  lift.castShadow = true;
  group.add(lift);

  // Seat pad
  const seatGeo = new THREE.BoxGeometry(w * 0.82, 0.07, l * 0.82);
  const seat = new THREE.Mesh(seatGeo, creamFabricMat);
  seat.position.y = seatY + 0.035;
  seat.castShadow = true;
  group.add(seat);

  // Lumbar mesh backrest
  const backH = h * 0.5;
  const backMesh = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.75, backH, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide })
  );
  backMesh.position.set(0, seatY + 0.035 + backH / 2 + 0.02, -l * 0.4);
  backMesh.rotation.x = 0.1;
  backMesh.castShadow = true;
  group.add(backMesh);

  // Lumbar support bump
  const lumbar = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.1, 0.06), creamFabricMat);
  lumbar.position.set(0, seatY + 0.1, -l * 0.4 - 0.02);
  group.add(lumbar);

  // Headrest
  const headrest = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.14, 0.05), creamFabricMat);
  headrest.position.set(0, seatY + backH + 0.1, -l * 0.4);
  group.add(headrest);

  // L-shaped armrests
  [-1, 1].forEach((side) => {
    const armX = side * (w * 0.46);
    // Vertical post
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, seatY * 0.4, 10), metalBlackMat);
    post.position.set(armX, seatY + 0.04 + (seatY * 0.4) / 2, 0);
    group.add(post);
    // Horizontal pad
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, l * 0.3), creamFabricMat);
    pad.position.set(armX, seatY + 0.04 + seatY * 0.4, 0);
    group.add(pad);
  });

  return group;
}

/**
 * Ergonomic office chair: 4 splayed walnut legs with brass ferrules,
 * curved wrap-around boucle backrest, padded seat.
 */
export function createErgonomicChairModel(w: number, l: number, h: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ErgonomicChairGroup';
  group.add(createContactShadowMesh(w * 1.1, l * 1.1, 0.72));

  const seatH = h * 0.5;

  // 4 tapered splayed legs
  const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
  angles.forEach((ang) => {
    const lx = Math.cos(ang) * (w * 0.32);
    const lz = Math.sin(ang) * (l * 0.32);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.01, seatH, 12), walnutWoodMat);
    leg.position.set(lx, seatH / 2, lz);
    leg.rotation.z = Math.cos(ang) * 0.08;
    leg.rotation.x = Math.sin(ang) * 0.08;
    leg.castShadow = true;
    group.add(leg);

    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.016, 0.03, 12), metalGoldMat);
    ferrule.position.set(lx, 0.015, lz);
    group.add(ferrule);
  });

  // Padded seat
  const seatGeo = new THREE.CylinderGeometry(w * 0.4, w * 0.38, 0.09, 24);
  const seatMesh = new THREE.Mesh(seatGeo, creamFabricMat);
  seatMesh.position.y = seatH + 0.045;
  seatMesh.castShadow = true;
  group.add(seatMesh);

  // Curved wrap-around upholstered backrest (arc of cylinder)
  const backR = w * 0.42;
  const backH = h * 0.42;
  const backGeo = new THREE.CylinderGeometry(backR, backR, backH, 24, 1, true, -Math.PI * 0.65, Math.PI * 1.3);
  const backMesh = new THREE.Mesh(backGeo, creamFabricMat);
  backMesh.position.set(0, seatH + 0.09 + backH / 2, -w * 0.06);
  backMesh.castShadow = true;
  group.add(backMesh);

  return group;
}

/**
 * Lounge armchair: low deep seat, solid dark walnut sled frame,
 * reclined back, wide upholstered armrests, head cushion.
 */
export function createLoungeChairModel(w: number, l: number, h: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'LoungeChairGroup';
  group.add(createContactShadowMesh(w * 1.1, l * 1.15, 0.7));

  // Sled frame sides (dark walnut curved U-shape)
  [-1, 1].forEach((side) => {
    const sx = side * (w * 0.44);
    // Runner (bottom bar)
    const runner = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.04, l + 0.08), darkWalnutWoodMat);
    runner.position.set(sx, 0.02, 0);
    runner.castShadow = true;
    group.add(runner);
    // Front vertical leg
    const fLeg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.32, 0.045), darkWalnutWoodMat);
    fLeg.position.set(sx, 0.16, l * 0.44);
    group.add(fLeg);
    // Rear vertical leg (taller for reclined back)
    const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.52, 0.045), darkWalnutWoodMat);
    rLeg.position.set(sx, 0.26, -l * 0.44);
    group.add(rLeg);
  });

  // Seat cushion (low, 0.38m)
  const seatY = 0.38;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.12, l * 0.6), caramelFabricMat);
  seat.position.set(0, seatY, l * 0.14);
  seat.castShadow = true;
  group.add(seat);

  // Reclined back cushion
  const backH = h * 0.52;
  const back = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, backH, 0.12), caramelFabricMat);
  back.position.set(0, seatY + backH / 2 + 0.06, -l * 0.3);
  back.rotation.x = -0.22;
  back.castShadow = true;
  group.add(back);

  // Wide armrests
  [-1, 1].forEach((side) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, l * 0.68), caramelFabricMat);
    arm.position.set(side * (w * 0.45 - 0.04), seatY + 0.03, 0.04);
    arm.castShadow = true;
    group.add(arm);
  });

  // Head cushion
  const headCushion = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.12, 0.2), oliveFabricMat);
  headCushion.position.set(0, seatY + backH * 0.72, -l * 0.42);
  headCushion.rotation.x = -0.22;
  group.add(headCushion);

  return group;
}

/**
 * Dining chair: slim compact profile (no armrests), 4 vertical
 * tapered legs, vertical slat backrest, brass cross stretcher.
 */
export function createDiningChairModel(w: number, l: number, h: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'DiningChairGroup';
  group.add(createContactShadowMesh(w * 1.1, l * 1.1, 0.68));

  const seatH = h * 0.47;

  // 4 tapered straight legs
  [
    [-w * 0.36, -l * 0.36],
    [w * 0.36, -l * 0.36],
    [-w * 0.36, l * 0.36],
    [w * 0.36, l * 0.36],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, seatH, 10), walnutWoodMat);
    leg.position.set(lx, seatH / 2, lz);
    leg.castShadow = true;
    group.add(leg);
  });

  // Cross stretcher near floor
  const stretcherH = seatH * 0.28;
  const sFront = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, w * 0.72, 8), metalGoldMat);
  sFront.rotation.z = Math.PI / 2;
  sFront.position.set(0, stretcherH, l * 0.36);
  group.add(sFront);
  const sBack = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, w * 0.72, 8), metalGoldMat);
  sBack.rotation.z = Math.PI / 2;
  sBack.position.set(0, stretcherH, -l * 0.36);
  group.add(sBack);

  // Seat cushion (slim, no armrests)
  const seatMesh = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.07, l * 0.82), creamFabricMat);
  seatMesh.position.y = seatH + 0.035;
  seatMesh.castShadow = true;
  group.add(seatMesh);

  // Top rail of backrest
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.045, 0.04), walnutWoodMat);
  topRail.position.set(0, h - 0.03, -l * 0.36);
  group.add(topRail);

  // 3 vertical slats
  [-1, 0, 1].forEach((si) => {
    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, h - seatH - 0.08, 0.025),
      walnutWoodMat
    );
    slat.position.set(si * w * 0.2, seatH + (h - seatH) / 2, -l * 0.36);
    slat.castShadow = true;
    group.add(slat);
  });

  return group;
}

/**
 * Stool / Ottoman: cylindrical plush cushion, button-tufted top,
 * brass base ring, NO backrest.
 */
export function createStoolModel(w: number, l: number, h: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'StoolGroup';
  group.add(createContactShadowMesh(w * 1.15, l * 1.15, 0.65));

  const r = Math.min(w, l) / 2;

  // Plush cylindrical body (caramel velvet)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.94, h * 0.85, 32), caramelFabricMat);
  body.position.y = h * 0.425;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Tufted top disc
  const topDisc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.045, 32), caramelFabricMat);
  topDisc.position.y = h * 0.85 + 0.0225;
  topDisc.castShadow = true;
  group.add(topDisc);

  // Central button tuft
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 16), metalGoldMat);
  button.position.y = h * 0.85 + 0.055;
  group.add(button);

  // Tufting pattern on top (4 stitch radiants)
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2;
    const tuftLine = new THREE.Mesh(
      new THREE.BoxGeometry(r * 1.1, 0.008, 0.012),
      new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.9 })
    );
    tuftLine.rotation.y = ang;
    tuftLine.position.y = h * 0.85 + 0.048;
    group.add(tuftLine);
  }

  // Brass base ring
  const baseRing = new THREE.Mesh(
    new THREE.TorusGeometry(r * 0.8, 0.02, 10, 32),
    metalGoldMat
  );
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.025;
  baseRing.castShadow = true;
  group.add(baseRing);

  return group;
}

/**
 * Single sofa chair: Scandinavian club armchair with deep boxy cushions,
 * wrap-around block arms, low stubby walnut feet.
 */
export function createSingleSofaChairModel(w: number, l: number, h: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SingleSofaGroup';
  group.add(createContactShadowMesh(w * 1.1, l * 1.1, 0.72));

  const feetH = 0.1;
  const seatFloor = feetH;
  const seatH = h * 0.44;
  const armW = 0.12;
  const backH = h * 0.52;

  // 4 Low stubby walnut feet
  [
    [-w * 0.42 + armW, -l * 0.44],
    [w * 0.42 - armW, -l * 0.44],
    [-w * 0.42 + armW, l * 0.44],
    [w * 0.42 - armW, l * 0.44],
  ].forEach(([fx, fz]) => {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, feetH, 12), walnutWoodMat);
    foot.position.set(fx, feetH / 2, fz);
    foot.castShadow = true;
    group.add(foot);
  });

  // Main seat box cushion (cream boucle)
  const seatCushion = new THREE.Mesh(
    new THREE.BoxGeometry(w - armW * 2 - 0.04, seatH, l * 0.55),
    creamFabricMat
  );
  seatCushion.position.set(0, seatFloor + seatH / 2, l * 0.12);
  seatCushion.castShadow = true;
  group.add(seatCushion);

  // Back box cushion
  const backCushion = new THREE.Mesh(
    new THREE.BoxGeometry(w - armW * 2 - 0.04, backH, 0.14),
    creamFabricMat
  );
  backCushion.position.set(0, seatFloor + backH / 2, -l * 0.42);
  backCushion.castShadow = true;
  group.add(backCushion);

  // Left & Right block armrests
  [-1, 1].forEach((side) => {
    const armX = side * (w / 2 - armW / 2);
    const armMesh = new THREE.Mesh(
      new THREE.BoxGeometry(armW, seatH + 0.08, l * 0.88),
      creamFabricMat
    );
    armMesh.position.set(armX, seatFloor + (seatH + 0.08) / 2, 0);
    armMesh.castShadow = true;
    group.add(armMesh);
  });

  // Olive accent throw cushion on seat
  const throwCushion = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 0.1, 0.22), oliveFabricMat);
  throwCushion.position.set(w * 0.18, seatFloor + seatH + 0.05, -l * 0.1);
  throwCushion.rotation.y = 0.3;
  throwCushion.castShadow = true;
  group.add(throwCushion);

  return group;
}

// ============================================================================
// TABLE VARIANTS — Each with distinct geometry
// ============================================================================

/**
 * Executive work desk: beveled walnut top, right 3-drawer pedestal,
 * left steel loop legs, modesty rear panel, laptop & lamp.
 * (Wraps original createDeskModel for backward compatibility with presets)
 */
export function createExecutiveDeskModel(w: number, l: number, h: number): THREE.Group {
  return createDeskModel(w, l, h);
}

/**
 * Study desk: natural oak top, 4 corner legs, shallow center drawer,
 * hutch organizer with mini books on top.
 */
export function createStudyDeskModel(w: number, l: number, h: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'StudyDeskGroup';
  group.add(createContactShadowMesh(w * 1.12, l * 1.12, 0.78));

  const topThick = 0.035;

  // Oak desktop
  const oakMat = new THREE.MeshStandardMaterial({ color: 0xd4a96a, roughness: 0.5, metalness: 0.0 });
  const topMesh = new THREE.Mesh(new THREE.BoxGeometry(w, topThick, l), oakMat);
  topMesh.position.y = h - topThick / 2;
  topMesh.castShadow = true;
  group.add(topMesh);

  // 4 corner tapered legs
  const legH = h - topThick;
  [
    [-w / 2 + 0.05, -l / 2 + 0.05],
    [w / 2 - 0.05, -l / 2 + 0.05],
    [-w / 2 + 0.05, l / 2 - 0.05],
    [w / 2 - 0.05, l / 2 - 0.05],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.014, legH, 12), oakMat);
    leg.position.set(lx, legH / 2, lz);
    leg.castShadow = true;
    group.add(leg);
  });

  // Shallow center drawer (1 drawer with brass knob)
  const drawerW = w * 0.4;
  const drawer = new THREE.Mesh(new THREE.BoxGeometry(drawerW, 0.07, l * 0.72), oakMat);
  drawer.position.set(0, h - topThick - 0.04, 0);
  group.add(drawer);

  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.025, 10), metalGoldMat);
  knob.rotation.z = Math.PI / 2;
  knob.position.set(0, h - topThick - 0.04, l / 2 + 0.012);
  group.add(knob);

  // Hutch organizer on back-top
  const hutchH = 0.26;
  const hutchMat = oakMat;
  const hutchBack = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, hutchH, 0.025), hutchMat);
  hutchBack.position.set(0, h + hutchH / 2, -l / 2 + 0.012);
  hutchBack.castShadow = true;
  group.add(hutchBack);

  const hutchLeft = new THREE.Mesh(new THREE.BoxGeometry(0.025, hutchH, l * 0.4), hutchMat);
  hutchLeft.position.set(-w * 0.36, h + hutchH / 2, -l / 2 + l * 0.2);
  group.add(hutchLeft);
  const hutchRight = new THREE.Mesh(new THREE.BoxGeometry(0.025, hutchH, l * 0.4), hutchMat);
  hutchRight.position.set(w * 0.36, h + hutchH / 2, -l / 2 + l * 0.2);
  group.add(hutchRight);

  // Shelf inside hutch
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.02, l * 0.4), hutchMat);
  shelf.position.set(0, h + hutchH * 0.55, -l / 2 + l * 0.2);
  group.add(shelf);

  // Mini books on shelf
  const bookColors = [0x1e3a5f, 0x7f1d1d, 0x14532d, 0x44403c];
  for (let i = 0; i < 4; i++) {
    const bookH = 0.1 + Math.random() * 0.06;
    const bookMat = new THREE.MeshStandardMaterial({ color: bookColors[i], roughness: 0.6 });
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.04, bookH, 0.14), bookMat);
    book.position.set(-w * 0.26 + i * 0.12, h + hutchH * 0.55 + 0.01 + bookH / 2, -l / 2 + l * 0.2);
    book.castShadow = true;
    group.add(book);
  }

  return group;
}

/**
 * Dining table: marble/walnut top (1.6×0.85m), perimeter apron,
 * 4 corner legs with brass caps, fully open knee space.
 */
export function createDiningTableModel(w: number, l: number, h: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'DiningTableGroup';
  group.add(createContactShadowMesh(w * 1.1, l * 1.1, 0.8));

  const topThick = 0.04;

  // Marble top (use calacatta marble material)
  const topMesh = new THREE.Mesh(new THREE.BoxGeometry(w, topThick, l), calacattaMarbleMat);
  topMesh.position.y = h - topThick / 2;
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // Perimeter apron (walnut, slightly inset from edges)
  const apronThick = 0.06;
  const apronH = 0.1;
  const apronY = h - topThick - apronH / 2;
  // Front/back aprons
  [l / 2 - apronThick / 2, -l / 2 + apronThick / 2].forEach((az) => {
    const apron = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, apronH, apronThick), walnutWoodMat);
    apron.position.set(0, apronY, az);
    group.add(apron);
  });
  // Side aprons
  [w / 2 - apronThick / 2, -w / 2 + apronThick / 2].forEach((ax) => {
    const apron = new THREE.Mesh(new THREE.BoxGeometry(apronThick, apronH, l - 0.1), walnutWoodMat);
    apron.position.set(ax, apronY, 0);
    group.add(apron);
  });

  // 4 Corner legs with brass caps — open knee space on all sides
  const legH = h - topThick;
  [
    [-w / 2 + 0.07, -l / 2 + 0.07],
    [w / 2 - 0.07, -l / 2 + 0.07],
    [-w / 2 + 0.07, l / 2 - 0.07],
    [w / 2 - 0.07, l / 2 - 0.07],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, legH, 0.07), walnutWoodMat);
    leg.position.set(lx, legH / 2, lz);
    leg.castShadow = true;
    group.add(leg);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.034, 0.03, 12), metalGoldMat);
    cap.position.set(lx, 0.015, lz);
    group.add(cap);
  });

  return group;
}

/**
 * Coffee/sofa table: low height (≤0.45m), lower magazine shelf,
 * rounded rectangular top, black sled legs.
 */
export function createCoffeeTableModel(w: number, l: number, h: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'CoffeeTableGroup';
  const topH = Math.min(h, 0.45);
  group.add(createContactShadowMesh(w * 1.12, l * 1.12, 0.65));

  // Top surface (rounded rect profile via beveled box)
  const topMesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, l), walnutWoodMat);
  topMesh.position.y = topH - 0.02;
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // Lower magazine shelf at ~0.12m height
  const shelfY = 0.12;
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.025, l * 0.76), walnutWoodMat);
  shelf.position.y = shelfY;
  shelf.castShadow = true;
  group.add(shelf);

  // Black sled frame — 2 U-shaped sled runners
  [-1, 1].forEach((side) => {
    const sx = side * (w * 0.38);
    // Bottom horizontal runner
    const runner = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, l * 0.9), metalBlackMat);
    runner.position.set(sx, 0.012, 0);
    group.add(runner);
    // Front vertical bar
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.03, topH, 0.03), metalBlackMat);
    front.position.set(sx, topH / 2, l * 0.44);
    group.add(front);
    // Rear vertical bar
    const rear = new THREE.Mesh(new THREE.BoxGeometry(0.03, topH, 0.03), metalBlackMat);
    rear.position.set(sx, topH / 2, -l * 0.44);
    group.add(rear);
  });

  // Decor: small book + candle on top
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.26), creamCabinetMat);
  book.position.set(-w * 0.18, topH + 0.01, 0.04);
  group.add(book);

  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 10), creamCabinetMat);
  candle.position.set(w * 0.22, topH + 0.05, -l * 0.18);
  group.add(candle);

  return group;
}

/**
 * Round table: true circular CylinderGeometry top,
 * 3 splayed tripod legs, decor items on surface.
 */
export function createRoundTableModel(w: number, l: number, h: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'RoundTableGroup';
  const radius = Math.max(w, l) / 2;
  group.add(createContactShadowMesh(radius * 2.2, radius * 2.2, 0.72));

  // True circular disc top (CylinderGeometry — NOT a box)
  const topMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius - 0.02, 0.04, 36), walnutWoodMat);
  topMesh.position.y = h - 0.02;
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // Rim chamfer ring
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius - 0.01, 0.015, 8, 36),
    darkWalnutWoodMat
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = h - 0.02;
  group.add(rim);

  // 3 tapered tripod legs, splayed outward
  for (let i = 0; i < 3; i++) {
    const ang = (i * 2 * Math.PI) / 3;
    const lx = Math.cos(ang) * radius * 0.62;
    const lz = Math.sin(ang) * radius * 0.62;
    const legH = h - 0.04;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.013, legH, 12), walnutWoodMat);
    leg.position.set(lx, legH / 2, lz);
    leg.rotation.z = Math.cos(ang) * 0.1;
    leg.rotation.x = Math.sin(ang) * 0.1;
    leg.castShadow = true;
    group.add(leg);

    // Brass foot tip
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, 0.025, 10), metalGoldMat);
    tip.position.set(lx, 0.012, lz);
    group.add(tip);
  }

  // Decor: flat book & tiny succulent on top
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.018, 0.22), creamCabinetMat);
  book.position.set(-radius * 0.3, h + 0.009, radius * 0.1);
  group.add(book);

  const tinyPot = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.028, 0.038, 12), potMat);
  tinyPot.position.set(radius * 0.28, h + 0.019, -radius * 0.2);
  group.add(tinyPot);

  const tinyGreen = new THREE.Mesh(new THREE.DodecahedronGeometry(0.032), plantLeafMat);
  tinyGreen.position.set(radius * 0.28, h + 0.048, -radius * 0.2);
  group.add(tinyGreen);

  return group;
}

/**
 * Vanity desk: cream lacquer top with gold trim, dual jewelry drawers,
 * mounted vertical arched dressing mirror with reflective glass.
 */
export function createVanityDeskModel(w: number, l: number, h: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'VanityDeskGroup';
  group.add(createContactShadowMesh(w * 1.1, l * 1.1, 0.75));

  const topThick = 0.035;
  const creamLacquerMat = new THREE.MeshStandardMaterial({ color: 0xfef6e9, roughness: 0.18, metalness: 0.06 });

  // Desktop in cream lacquer
  const topMesh = new THREE.Mesh(new THREE.BoxGeometry(w, topThick, l), creamLacquerMat);
  topMesh.position.y = h - topThick / 2;
  topMesh.castShadow = true;
  group.add(topMesh);

  // Gold trim rim around top
  const rimGeo = new THREE.BoxGeometry(w + 0.01, 0.015, 0.012);
  const frontRim = new THREE.Mesh(rimGeo, metalGoldMat);
  frontRim.position.set(0, h - 0.01, l / 2);
  group.add(frontRim);

  // 4 gold-tipped legs
  const legH = h - topThick;
  [
    [-w / 2 + 0.06, -l / 2 + 0.06],
    [w / 2 - 0.06, -l / 2 + 0.06],
    [-w / 2 + 0.06, l / 2 - 0.06],
    [w / 2 - 0.06, l / 2 - 0.06],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, legH, 12), creamLacquerMat);
    leg.position.set(lx, legH / 2, lz);
    leg.castShadow = true;
    group.add(leg);

    const goldCap = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.016, 0.03, 10), metalGoldMat);
    goldCap.position.set(lx, 0.015, lz);
    group.add(goldCap);
  });

  // Dual jewelry drawers (front face, stacked)
  [0, 1].forEach((row) => {
    const dW = w * 0.42;
    const dH = 0.065;
    const dY = h - topThick - 0.04 - row * 0.075;
    const drawer = new THREE.Mesh(new THREE.BoxGeometry(dW, dH, l * 0.86), creamLacquerMat);
    drawer.position.set(0, dY, 0);
    group.add(drawer);

    // Gold drawer knob
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.022, 10), metalGoldMat);
    knob.rotation.z = Math.PI / 2;
    knob.position.set(0, dY, l / 2 + 0.011);
    group.add(knob);
  });

  // Mounted arched dressing mirror
  const mirrorH = h * 0.88;
  const mirrorW = w * 0.52;
  const mirrorThick = 0.025;
  const mirrorZ = -l / 2 + mirrorThick / 2;
  const mirrorY = h + mirrorH * 0.5 - 0.08;

  // Mirror gold arch frame
  const archFrame = new THREE.Mesh(
    new THREE.BoxGeometry(mirrorW + 0.04, mirrorH + 0.04, mirrorThick),
    metalGoldMat
  );
  archFrame.position.set(0, mirrorY, mirrorZ);
  archFrame.castShadow = true;
  group.add(archFrame);

  // Reflective mirror glass (slightly inset)
  const mirrorGlass = new THREE.Mesh(
    new THREE.BoxGeometry(mirrorW, mirrorH, 0.01),
    mirrorGlassMat
  );
  mirrorGlass.position.set(0, mirrorY, mirrorZ + mirrorThick / 2);
  group.add(mirrorGlass);

  // Arch top cap (semi-circle effect using extra box)
  const archCap = new THREE.Mesh(new THREE.CylinderGeometry(mirrorW / 2 + 0.02, mirrorW / 2 + 0.02, mirrorThick, 24, 1, true, 0, Math.PI), metalGoldMat);
  archCap.rotation.z = Math.PI / 2;
  archCap.position.set(0, mirrorY + mirrorH / 2, mirrorZ);
  group.add(archCap);

  // Small perfume bottles on desk
  [[-w * 0.3, l * 0.15], [w * 0.28, l * 0.1]].forEach(([bx, bz]) => {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.1, 12), mirrorGlassMat);
    bottle.position.set(bx, h + 0.05, bz);
    group.add(bottle);
  });

  return group;
}

/**
 * Side/corner table: square marble top (0.45×0.45m), lower open shelf,
 * minimalist 4-corner black steel tube frame.
 */
export function createSideCornerTableModel(w: number, l: number, h: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SideTableGroup';
  group.add(createContactShadowMesh(w * 1.2, l * 1.2, 0.68));

  const topThick = 0.03;

  // Marble square top
  const topMesh = new THREE.Mesh(new THREE.BoxGeometry(w, topThick, l), calacattaMarbleMat);
  topMesh.position.y = h - topThick / 2;
  topMesh.castShadow = true;
  group.add(topMesh);

  // 4 black steel tube corner legs
  const legH = h - topThick;
  const legR = 0.016;
  [
    [-w / 2 + 0.025, -l / 2 + 0.025],
    [w / 2 - 0.025, -l / 2 + 0.025],
    [-w / 2 + 0.025, l / 2 - 0.025],
    [w / 2 - 0.025, l / 2 - 0.025],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(legR, legR, legH, 10), metalBlackMat);
    leg.position.set(lx, legH / 2, lz);
    leg.castShadow = true;
    group.add(leg);
  });

  // Horizontal cross bars (structural) at mid-height
  const barH = legH * 0.5;
  [-1, 1].forEach((side) => {
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(w - 0.05, legR * 2, legR * 2), metalBlackMat);
    hBar.position.set(0, barH, side * (l / 2 - 0.025));
    group.add(hBar);
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(legR * 2, legR * 2, l - 0.05), metalBlackMat);
    vBar.position.set(side * (w / 2 - 0.025), barH, 0);
    group.add(vBar);
  });

  // Open lower shelf (marble or glass)
  const shelfY = legH * 0.32;
  const shelfMesh = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, 0.02, l - 0.04), calacattaMarbleMat);
  shelfMesh.position.y = shelfY;
  shelfMesh.castShadow = true;
  group.add(shelfMesh);

  // Decor: small book on top
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, 0.18), creamCabinetMat);
  book.position.set(0, h + 0.0075, 0);
  group.add(book);

  return group;
}

// ============================================================================
// MODEL RESOLVERS — Route by modelId / subType / name heuristics
// ============================================================================

/**
 * Resolves the correct chair builder based on obj.modelId, obj.subType, or obj.name.
 */
function resolveChairModel(obj: RoomObject): THREE.Group {
  const id = (obj.modelId || obj.subType || '').toLowerCase();
  const name = obj.name.toLowerCase();
  const w = obj.dimensions.width;
  const l = obj.dimensions.length;
  const h = obj.dimensions.height;

  if (id.includes('swivel') || name.includes('xoay')) {
    return createSwivelChairModel(w, l, h);
  }
  if (id.includes('single_sofa') || name.includes('sofa đơn') || name.includes('sofa don')) {
    return createSingleSofaChairModel(w, l, h);
  }
  if (id.includes('stool') || name.includes('đôn') || name.includes('don') || name.includes('ottoman')) {
    return createStoolModel(w, l, h);
  }
  if (id.includes('dining') || name.includes('ghế ăn') || name.includes('ghe an')) {
    return createDiningChairModel(w, l, h);
  }
  if (id.includes('lounge') || id.includes('arm') || name.includes('thư giãn') || name.includes('thu gian') || name.includes('tựa') || name.includes('tua')) {
    return createLoungeChairModel(w, l, h);
  }
  if (id.includes('office') || id.includes('ergonomic') || name.includes('làm việc') || name.includes('lam viec') || name.includes('ergonomic')) {
    return createErgonomicChairModel(w, l, h);
  }
  // Default: original ergonomic chair
  return createChairModel();
}

/**
 * Resolves the correct desk/table builder based on obj.modelId, obj.subType, or obj.name.
 */
function resolveDeskOrTableModel(obj: RoomObject): THREE.Group {
  const id = (obj.modelId || obj.subType || '').toLowerCase();
  const name = obj.name.toLowerCase();
  const w = obj.dimensions.width;
  const l = obj.dimensions.length;
  const h = obj.dimensions.height;

  // Tables
  if (id.includes('table_round') || id.includes('round') || name.includes('tròn') || name.includes('tron')) {
    return createRoundTableModel(w, l, h);
  }
  if (id.includes('table_coffee') || id.includes('coffee') || name.includes('trà') || name.includes('tra') || name.includes('sofa table') || (h < 0.5 && obj.type === 'table')) {
    return createCoffeeTableModel(w, l, h);
  }
  if (id.includes('table_dining') || name.includes('bàn ăn') || name.includes('ban an') || name.includes('ăn tối') || name.includes('an toi')) {
    return createDiningTableModel(w, l, h);
  }
  if (id.includes('table_corner') || id.includes('corner') || name.includes('bàn góc') || name.includes('ban goc') || name.includes('kê sofa') || name.includes('ke sofa')) {
    return createSideCornerTableModel(w, l, h);
  }

  // Desks
  if (id.includes('desk_vanity') || id.includes('vanity') || name.includes('trang điểm') || name.includes('trang diem')) {
    return createVanityDeskModel(w, l, h);
  }
  if (id.includes('desk_study') || name.includes('bàn học') || name.includes('ban hoc') || name.includes('study')) {
    return createStudyDeskModel(w, l, h);
  }
  if (id.includes('desk_work') || id.includes('executive') || name.includes('làm việc') || name.includes('lam viec') || name.includes('walnut')) {
    return createExecutiveDeskModel(w, l, h);
  }

  // Default fallback: original createDeskModel (preserves Master Preset desk_window)
  return createDeskModel(w, l, h);
}

/**
 * 5. NIGHTSTAND (Tủ đầu giường gỗ với đèn ngủ ấm cúng)
 */
export function createNightstandModel(width: number, length: number, height: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'NightstandGroup';

  group.add(createContactShadowMesh(width * 1.2, length * 1.2, 0.75));

  // Walnut box cabinet with open lower niche
  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height - 0.1, length), walnutWoodMat);
  bodyMesh.position.y = (height - 0.1) / 2 + 0.1;
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // Slender dark legs
  const legH = 0.1;
  [
    [-width / 2 + 0.05, -length / 2 + 0.05],
    [width / 2 - 0.05, -length / 2 + 0.05],
    [-width / 2 + 0.05, length / 2 - 0.05],
    [width / 2 - 0.05, length / 2 - 0.05],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, legH, 8), metalBlackMat);
    leg.position.set(lx, legH / 2, lz);
    group.add(leg);
  });

  // Glowing Warm Sphere Table Lamp (3000K)
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16), metalGoldMat);
  lampBase.position.set(0, height + 0.01, 0);
  group.add(lampBase);

  const sphereLamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), warmLedMat);
  sphereLamp.position.set(0, height + 0.11, 0);
  group.add(sphereLamp);

  // Small hardcover book beside lamp
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.18), darkWalnutWoodMat);
  book.position.set(-width * 0.22, height + 0.01, 0.05);
  group.add(book);

  return group;
}

/**
 * 6. ROUND COFFEE TABLE (Bàn trà tròn Bắc Âu)
 */
export function createTableModel(width: number, length: number, height: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'TableGroup';

  const radius = width / 2;
  group.add(createContactShadowMesh(width * 1.15, width * 1.15, 0.72));

  // Beveled Round Walnut Top
  const topMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius - 0.02, 0.035, 32), walnutWoodMat);
  topMesh.position.y = height - 0.0175;
  topMesh.castShadow = true;
  group.add(topMesh);

  // 3 Tapered Tripod Legs
  for (let i = 0; i < 3; i++) {
    const ang = (i * 2 * Math.PI) / 3;
    const lx = Math.cos(ang) * (radius * 0.65);
    const lz = Math.sin(ang) * (radius * 0.65);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, height - 0.035, 12), walnutWoodMat);
    leg.position.set(lx, (height - 0.035) / 2, lz);
    leg.rotation.z = Math.cos(ang) * 0.08;
    leg.rotation.x = Math.sin(ang) * 0.08;
    leg.castShadow = true;
    group.add(leg);
  }

  // Small decor book & tiny succulent bowl
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.018, 0.22), creamCabinetMat);
  book.position.set(-0.06, height + 0.009, 0.04);
  group.add(book);

  const tinyPot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.04, 12), potMat);
  tinyPot.position.set(0.08, height + 0.02, -0.06);
  group.add(tinyPot);

  const tinyGreen = new THREE.Mesh(new THREE.DodecahedronGeometry(0.035), plantLeafMat);
  tinyGreen.position.set(0.08, height + 0.05, -0.06);
  group.add(tinyGreen);

  return group;
}

/**
 * 7. LUSH INDOOR POTTED PLANT (Cây xanh nhiệt đới)
 */
export function createPlantModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'PlantGroup';

  group.add(createContactShadowMesh(0.85, 0.85, 0.8));

  // Tall Ceramic Planter Pot
  const potH = 0.45;
  const potMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, potH, 24), potMat);
  potMesh.position.y = potH / 2;
  potMesh.castShadow = true;
  group.add(potMesh);

  // Dark Soil
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.03, 24), darkWalnutWoodMat);
  soil.position.y = potH - 0.015;
  group.add(soil);

  // Multi-tier Organic Leaves (Monstera / Fiddle-Leaf Fig)
  const leafCount = 9;
  for (let l = 0; l < leafCount; l++) {
    const ang = (l * 2.4);
    const radDist = 0.28 + (l % 3) * 0.08;
    const leafY = potH + 0.18 + l * 0.09;

    // Stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 8), plantLeafMat);
    stem.position.set(Math.cos(ang) * 0.08, leafY - 0.12, Math.sin(ang) * 0.08);
    stem.rotation.z = Math.cos(ang) * 0.35;
    stem.rotation.x = Math.sin(ang) * 0.35;
    group.add(stem);

    // Broad Leaf Blade
    const leafGeo = new THREE.BoxGeometry(0.24, 0.006, 0.38);
    const leafMesh = new THREE.Mesh(leafGeo, plantLeafMat);
    leafMesh.position.set(Math.cos(ang) * radDist, leafY, Math.sin(ang) * radDist);
    leafMesh.rotation.y = ang + Math.PI / 2;
    leafMesh.rotation.x = 0.35 + (l % 2) * 0.15;
    leafMesh.castShadow = true;
    group.add(leafMesh);
  }

  return group;
}

/**
 * 8. LUXURY AREA RUG (Thảm dệt sợi tự nhiên)
 */
export function createRugModel(width: number, length: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'RugGroup';

  const isRound = Math.abs(width - length) < 0.15;

  const rugMat = new THREE.MeshStandardMaterial({
    map: fabricTexture,
    color: 0xded8cc, // Warm woven natural sand beige
    roughness: 0.96,
    metalness: 0.01,
  });

  const rugGeo = isRound
    ? new THREE.CylinderGeometry(width / 2, width / 2, 0.015, 36)
    : new THREE.BoxGeometry(width, 0.015, length);

  const rugMesh = new THREE.Mesh(rugGeo, rugMat);
  rugMesh.position.y = 0.008;
  rugMesh.receiveShadow = true;
  group.add(rugMesh);

  return group;
}

/**
 * 9. LUXURY BEDROOM CONSOLE / MARBLE CREDENZA (Tủ console / đảo tủ đá cẩm thạch)
 */
export function createKitchenCounterModel(width: number, length: number, height: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'VanityGroup';

  group.add(createContactShadowMesh(width * 1.15, length * 1.15, 0.85));

  const topThick = 0.045;

  // Calacatta Marble Countertop Slab with subtle beveled edge
  const topMesh = new THREE.Mesh(new THREE.BoxGeometry(width, topThick, length), calacattaMarbleMat);
  topMesh.position.y = height - topThick / 2;
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // Lower Dark Walnut Credenza Body
  const cabinetH = height - topThick;
  const cabinetMesh = new THREE.Mesh(new THREE.BoxGeometry(width - 0.04, cabinetH, length - 0.04), darkWalnutWoodMat);
  cabinetMesh.position.y = cabinetH / 2;
  cabinetMesh.castShadow = true;
  group.add(cabinetMesh);

  // Decorative display items on marble top (matching reference photo):
  // 1. Stacked art books
  const book1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.18), darkWalnutWoodMat);
  book1.position.set(-width * 0.25, height + 0.012, 0);
  book1.castShadow = true;
  group.add(book1);

  const book2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 0.16), creamFabricMat);
  book2.position.set(-width * 0.25, height + 0.037, 0.01);
  book2.castShadow = true;
  group.add(book2);

  // 2. Ceramic sculpture vase
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.18, 16), potMat);
  vase.position.set(0, height + 0.09, 0);
  vase.castShadow = true;
  group.add(vase);

  // 3. Small green succulent plant in white ceramic cup
  const plantPot = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.08, 12), potMat);
  plantPot.position.set(width * 0.25, height + 0.04, 0);
  plantPot.castShadow = true;
  group.add(plantPot);

  const succulent = new THREE.Mesh(new THREE.DodecahedronGeometry(0.05), plantLeafMat);
  succulent.position.set(width * 0.25, height + 0.11, 0);
  succulent.castShadow = true;
  group.add(succulent);

  return group;
}

/**
 * 10. MINIMAL STANDING / WALL MIRROR (Gương phòng ngủ)
 */
export function createMirrorModel(width: number, height: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'MirrorGroup';

  group.add(createContactShadowMesh(width * 1.2, 0.45, 0.8));

  const frameThick = 0.035;

  // Modern champagne brass outer frame
  const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, frameThick), metalGoldMat);
  frameMesh.position.y = height / 2;
  frameMesh.castShadow = true;
  group.add(frameMesh);

  // High-reflection mirror glass panel
  const glassMesh = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.05, height - 0.05, 0.008),
    mirrorGlassMat
  );
  glassMesh.position.set(0, height / 2, frameThick / 2 + 0.002);
  group.add(glassMesh);

  // Walnut backing
  const backMesh = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.02, height - 0.02, 0.01),
    walnutWoodMat
  );
  backMesh.position.set(0, height / 2, -frameThick / 2 - 0.005);
  group.add(backMesh);

  // Easel standing rear kickstand
  const kickstand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, height * 0.85, 8),
    metalGoldMat
  );
  kickstand.position.set(0, height * 0.4, -0.18);
  kickstand.rotation.x = 0.28;
  group.add(kickstand);

  return group;
}

/**
 * 11. ENTRANCE DOOR (Cửa ra vào gỗ óc chó cao cấp)
 */
export function createDoorModel(width: number, height: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'DoorGroup';

  // Walnut Door Leaf with panel grooves
  const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.06), walnutWoodMat);
  doorLeaf.position.y = height / 2;
  doorLeaf.castShadow = true;
  group.add(doorLeaf);

  // Minimalist Black Door Handle
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.06), metalBlackMat);
  handle.position.set(-width / 2 + 0.12, 1.05, 0.045);
  group.add(handle);

  return group;
}

/**
 * 12. ARCHITECTURAL WINDOW (Cửa sổ lấy sáng tự nhiên)
 */
export function createWindowModel(width: number, height: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'WindowGroup';

  // Black Aluminum Perimeter Frame
  const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.08), metalBlackMat);
  frameMesh.position.y = height / 2;
  group.add(frameMesh);

  // Sheer Glass Panes
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.35,
  });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(width - 0.08, height - 0.08, 0.01), glassMat);
  glass.position.y = height / 2;
  group.add(glass);

  return group;
}

/**
 * 13. MODERN SOFA (Sofa văng thư giãn)
 */
export function createSofaModel(width: number, length: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SofaGroup';

  group.add(createContactShadowMesh(width * 1.15, length * 1.15, 0.8));

  const seatH = 0.42;

  // Padded Base Cushion
  const seat = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, length), creamFabricMat);
  seat.position.y = seatH;
  seat.castShadow = true;
  group.add(seat);

  // Backrest
  const back = new THREE.Mesh(new THREE.BoxGeometry(width, 0.38, 0.18), creamFabricMat);
  back.position.set(0, seatH + 0.25, -length / 2 + 0.09);
  back.castShadow = true;
  group.add(back);

  // Armrests (Left & Right)
  [-width / 2 + 0.08, width / 2 - 0.08].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, length), creamFabricMat);
    arm.position.set(ax, seatH + 0.12, 0);
    arm.castShadow = true;
    group.add(arm);
  });

  return group;
}

export function createFloorLampModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'FloorLampGroup';

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 24), metalGoldMat);
  base.position.y = 0.01;
  group.add(base);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.45, 12), metalGoldMat);
  pole.position.y = 0.725;
  group.add(pole);

  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.28, 24), creamFabricMat);
  shade.position.y = 1.35;
  group.add(shade);

  return group;
}

export function createPaintingModel(width: number, height: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'PaintingGroup';

  const frame = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.03), metalGoldMat);
  frame.position.y = height / 2;
  group.add(frame);

  const canvasMat = new THREE.MeshStandardMaterial({
    color: 0xf5f3ee,
    roughness: 0.9,
  });
  const artCanvas = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.06, height - 0.06), canvasMat);
  artCanvas.position.set(0, height / 2, 0.016);
  group.add(artCanvas);

  return group;
}

export function createCurtainModel(width: number, height: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'CurtainGroup';

  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, width + 0.2, 12), metalBlackMat);
  rod.rotation.z = Math.PI / 2;
  rod.position.y = height;
  group.add(rod);

  const drapes = new THREE.Mesh(new THREE.BoxGeometry(width, height - 0.05, 0.04), creamFabricMat);
  drapes.position.y = (height - 0.05) / 2;
  group.add(drapes);

  return group;
}

export function createTvConsoleModel(width: number, length: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'TvConsoleGroup';

  const consoleMesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.42, length), walnutWoodMat);
  consoleMesh.position.y = 0.21;
  consoleMesh.castShadow = true;
  group.add(consoleMesh);

  return group;
}

export function createBookshelfModel(width: number, length: number, height: number): THREE.Group {
  return createWardrobeModel(width, length, height);
}

/**
 * 11. MODERN SMART CERAMIC TOILET (Bồn cầu sứ trắng thông minh nguyên khối)
 */
export function createToiletModel(width: number = 0.5, length: number = 0.7, height: number = 0.75): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ToiletGroup';

  group.add(createContactShadowMesh(width * 1.3, length * 1.3, 0.78));

  // 1. Ceramic Pedestal Base
  const baseH = 0.42;
  const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, baseH, 0.54), whitePorcelainMat);
  baseMesh.position.set(0, baseH / 2, 0.04);
  baseMesh.castShadow = true;
  group.add(baseMesh);

  // Rounded front apron
  const frontCurve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.19, baseH, 16, 1, false, 0, Math.PI),
    whitePorcelainMat
  );
  frontCurve.position.set(0, baseH / 2, 0.31);
  frontCurve.rotation.y = -Math.PI / 2;
  frontCurve.castShadow = true;
  group.add(frontCurve);

  // 2. Ergonomic Seat & Cover Ring
  const seatH = 0.04;
  const seatMesh = new THREE.Mesh(new THREE.BoxGeometry(0.39, seatH, 0.48), whitePorcelainMat);
  seatMesh.position.set(0, baseH + seatH / 2, 0.08);
  seatMesh.castShadow = true;
  group.add(seatMesh);

  // 3. Upright Water Tank / Cistern
  const tankH = height - baseH;
  const tankMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, tankH, 0.22), whitePorcelainMat);
  tankMesh.position.set(0, baseH + tankH / 2, -length / 2 + 0.11);
  tankMesh.castShadow = true;
  group.add(tankMesh);

  // 4. Chrome Dual Flush Buttons on Top of Cistern
  const flushBase = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.015, 16), chromeMat);
  flushBase.position.set(0, height + 0.008, -length / 2 + 0.11);
  group.add(flushBase);

  // 5. Smart Bidet Side Control Interface
  const bidetPanel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.16), metalBlackMat);
  bidetPanel.position.set(0.38 / 2 + 0.03, baseH + 0.02, 0.06);
  group.add(bidetPanel);

  return group;
}

/**
 * 12. LUXURY MASTER EN-SUITE BATHROOM SUITE (Phòng WC vách kính master khép kín)
 */
export function createWcPartitionModel(width: number, length: number, height: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'WcPartitionGroup';

  group.add(createContactShadowMesh(width * 1.15, length * 1.15, 0.85));

  // 1. Luxury Marble / Terrazzo Floor Slab
  const floorH = 0.03;
  const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(width, floorH, length), calacattaMarbleMat);
  floorMesh.position.y = floorH / 2;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // 2. Black Metal Perimeter Frame
  const frameThick = 0.035;
  const topFrame = new THREE.Mesh(new THREE.BoxGeometry(width, frameThick, length), metalBlackMat);
  topFrame.position.y = height - frameThick / 2;
  topFrame.castShadow = true;
  group.add(topFrame);

  // 3. Architectural Tempered Glass Walls (Frosted privacy glass)
  // Front Glass Partition Wall (facing into bedroom)
  const frontGlassW = width * 0.45;
  const frontGlass = new THREE.Mesh(
    new THREE.BoxGeometry(frontGlassW, height - 0.06, 0.02),
    frostedGlassMat
  );
  frontGlass.position.set(-width / 2 + frontGlassW / 2, height / 2, length / 2);
  group.add(frontGlass);

  // Sliding Glass Door
  const doorW = width * 0.52;
  const slideDoor = new THREE.Mesh(
    new THREE.BoxGeometry(doorW, height - 0.08, 0.02),
    frostedGlassMat
  );
  slideDoor.position.set(width / 2 - doorW / 2, height / 2, length / 2 + 0.03);
  group.add(slideDoor);

  // Black Pull Handle on Glass Door
  const doorHandle = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.45, 0.04),
    metalBlackMat
  );
  doorHandle.position.set(width / 2 - doorW + 0.08, 1.05, length / 2 + 0.05);
  group.add(doorHandle);

  // Side Glass Partition Wall
  const sideGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, height - 0.06, length - 0.04),
    frostedGlassMat
  );
  sideGlass.position.set(-width / 2, height / 2, 0);
  group.add(sideGlass);

  // Black Corner Vertical Post
  const cornerPost = new THREE.Mesh(
    new THREE.BoxGeometry(frameThick, height, frameThick),
    metalBlackMat
  );
  cornerPost.position.set(-width / 2, height / 2, length / 2);
  cornerPost.castShadow = true;
  group.add(cornerPost);

  // 4. Interior Fixtures Inside the Bathroom:
  // (A) Smart Toilet on Back Wall
  const toilet = createToiletModel(0.42, 0.62, 0.7);
  toilet.position.set(-width * 0.22, 0.03, -length / 2 + 0.38);
  group.add(toilet);

  // (B) Floating Vanity Basin with Mirror
  const vanityW = 0.52;
  const vanityD = 0.4;
  const vanityH = 0.48;
  const vanityY = 0.52;
  const vanityCabinet = new THREE.Mesh(
    new THREE.BoxGeometry(vanityW, vanityH, vanityD),
    darkWalnutWoodMat
  );
  vanityCabinet.position.set(width * 0.22, vanityY, -length / 2 + vanityD / 2 + 0.05);
  vanityCabinet.castShadow = true;
  group.add(vanityCabinet);

  // Marble Top on Vanity
  const vanityTop = new THREE.Mesh(
    new THREE.BoxGeometry(vanityW + 0.02, 0.03, vanityD + 0.02),
    calacattaMarbleMat
  );
  vanityTop.position.set(width * 0.22, vanityY + vanityH / 2 + 0.015, -length / 2 + vanityD / 2 + 0.05);
  group.add(vanityTop);

  // Ceramic Vessel Washbasin
  const basinMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.11, 0.09, 16),
    whitePorcelainMat
  );
  basinMesh.position.set(width * 0.22, vanityY + vanityH / 2 + 0.075, -length / 2 + vanityD / 2 + 0.05);
  basinMesh.castShadow = true;
  group.add(basinMesh);

  // Brass Gooseneck Mixer Faucet
  const faucet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.16, 12),
    metalGoldMat
  );
  faucet.position.set(width * 0.22, vanityY + vanityH / 2 + 0.11, -length / 2 + 0.09);
  group.add(faucet);

  // LED Backlit Vanity Mirror
  const mirrorW = 0.36;
  const mirrorH = 0.52;
  const mirrorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(mirrorW, mirrorH, 0.02),
    mirrorGlassMat
  );
  mirrorMesh.position.set(width * 0.22, vanityY + vanityH / 2 + 0.45, -length / 2 + 0.02);
  group.add(mirrorMesh);

  // (C) Towel Rail with Folded White Towel
  const towelBar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.32, 12), metalBlackMat);
  towelBar.rotation.z = Math.PI / 2;
  towelBar.position.set(-width / 2 + 0.05, 1.15, 0.15);
  group.add(towelBar);

  const towel = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.35, 0.26), creamFabricMat);
  towel.position.set(-width / 2 + 0.06, 1.0, 0.15);
  group.add(towel);

  // (D) Warm Interior Recessed Downlight
  const wcCeilingLight = new THREE.PointLight(0xffeedb, 1.2, 2.8, 1.5);
  wcCeilingLight.name = 'WcCeilingLight';
  wcCeilingLight.position.set(0, height - 0.15, 0);
  group.add(wcCeilingLight);

  return group;
}

// ============================================================================
// 4. MASTER FACTORY FUNCTION
// ============================================================================

export function createProceduralFurniture(obj: RoomObject): THREE.Group {
  let model: THREE.Group;

  switch (obj.type) {
    case 'bed':
      model = createBedModel(obj.dimensions.width, obj.dimensions.length);
      break;
    case 'rug':
      model = createRugModel(obj.dimensions.width, obj.dimensions.length);
      break;
    case 'painting':
      model = createPaintingModel(obj.dimensions.width, obj.dimensions.height);
      break;
    case 'curtain':
      model = createCurtainModel(obj.dimensions.width, obj.dimensions.height);
      break;
    case 'kitchen':
      model = createKitchenCounterModel(obj.dimensions.width, obj.dimensions.length, obj.dimensions.height);
      break;
    case 'lamp':
      model = createFloorLampModel();
      break;
    case 'desk':
      model = resolveDeskOrTableModel(obj);
      break;
    case 'sofa':
      model = createSofaModel(obj.dimensions.width, obj.dimensions.length);
      break;
    case 'table':
      model = resolveDeskOrTableModel(obj);
      break;
    case 'wardrobe':
      model = createWardrobeModel(obj.dimensions.width, obj.dimensions.length, obj.dimensions.height);
      break;
    case 'chair':
      model = resolveChairModel(obj);
      break;
    case 'mirror':
      model = createMirrorModel(obj.dimensions.width, obj.dimensions.height);
      break;
    case 'nightstand':
      model = createNightstandModel(obj.dimensions.width, obj.dimensions.length, obj.dimensions.height);
      break;
    case 'plant':
      model = createPlantModel();
      break;
    case 'tv':
      model = createTvConsoleModel(obj.dimensions.width, obj.dimensions.length);
      break;
    case 'bookshelf':
      model = createBookshelfModel(obj.dimensions.width, obj.dimensions.length, obj.dimensions.height);
      break;
    case 'door':
      model = createDoorModel(obj.dimensions.width, obj.dimensions.height);
      break;
    case 'window':
      model = createWindowModel(obj.dimensions.width, obj.dimensions.height);
      break;
    case 'wc':
      if (obj.dimensions.width < 0.9 || obj.name.toLowerCase().includes('bồn cầu')) {
        model = createToiletModel(obj.dimensions.width, obj.dimensions.length, obj.dimensions.height);
      } else {
        model = createWcPartitionModel(obj.dimensions.width, obj.dimensions.length, obj.dimensions.height);
      }
      break;
    default:
      model = new THREE.Group();
      const defaultMesh = new THREE.Mesh(
        new THREE.BoxGeometry(obj.dimensions.width, obj.dimensions.height, obj.dimensions.length),
        walnutWoodMat
      );
      defaultMesh.position.y = obj.dimensions.height / 2;
      model.add(defaultMesh);
  }

  if (obj.position) {
    model.position.set(obj.position.x ?? 0, obj.position.y ?? 0, obj.position.z ?? 0);
  }
  if (obj.rotation) {
    model.rotation.set(obj.rotation.x ?? 0, obj.rotation.y ?? 0, obj.rotation.z ?? 0);
  }
  model.userData = { id: obj.id, type: obj.type, name: obj.name, modelId: obj.modelId, subType: obj.subType };

  console.log(`[3D_MODEL_RENDERED] objectId=${obj.id} name="${obj.name}" type=${obj.type} modelId=${obj.modelId || 'none'} subType=${obj.subType || 'none'} groupName=${model.name} childCount=${model.children.length}`);

  return model;
}
