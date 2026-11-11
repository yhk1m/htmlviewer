// © 2026 김용현
// 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다.
import * as THREE from 'three';
import { N, MOUTH, GRAINS } from './model.js';
import { gridIndex, fillNormals } from '../../shared/grid.js';

const CENTER = MOUTH.i;
const BOTTOM = -16;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// 울퉁불퉁한 돌 모양. 같은 자리의 꼭짓점은 같은 만큼 움직여 면이 찢어지지 않는다.
function roughStone() {
  const g = new THREE.IcosahedronGeometry(1, 1), pos = g.attributes.position;
  const bump = (x, y, z) => { const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return v - Math.floor(v); };
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const k = 0.72 + 0.5 * bump(Math.round(x * 1000), Math.round(y * 1000), Math.round(z * 1000));
    pos.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
}

export function createBlock(model) {
  const group = new THREE.Group();
  const linear = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const GRAIN_RGB = GRAINS.map(g => linear(g.color));
  const WATER_RGB = linear('#2c8fd6');
  const FOREST = linear('#47674a'), ROCK = linear('#7c7568'), PLAIN = linear('#a3b57f');

  // 지형 격자
  const pos = new Float32Array(N * N * 3), nor = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3);
  const baseRgb = new Float32Array(N * N * 3), speckle = new Float32Array(N * N);
  {
    let seed = 5;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      pos[k * 3] = i - CENTER; pos[k * 3 + 2] = j - CENTER;
      speckle[k] = 0.9 + r() * 0.2;
      const m = model.mountain[k];
      const hh = model.base[k];
      const rocky = smooth(46, 66, hh + r() * 8);
      for (let c = 0; c < 3; c++) {
        const mtn = FOREST[c] + (ROCK[c] - FOREST[c]) * rocky;
        baseRgb[k * 3 + c] = PLAIN[c] + (mtn - PLAIN[c]) * m;
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(gridIndex(N), 1));
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }));
  terrain.castShadow = terrain.receiveShadow = true;
  terrain.frustumCulled = false;
  group.add(terrain);

  // 블록 옆면과 바닥
  const skirtPts = [];
  for (let i = 0; i < N; i++) skirtPts.push([i, 0]);
  for (let j = 1; j < N; j++) skirtPts.push([N - 1, j]);
  for (let i = N - 2; i >= 0; i--) skirtPts.push([i, N - 1]);
  for (let j = N - 2; j >= 1; j--) skirtPts.push([0, j]);
  const skirtPos = new Float32Array(skirtPts.length * 2 * 3);
  const skirtGeo = new THREE.BufferGeometry();
  skirtGeo.setAttribute('position', new THREE.BufferAttribute(skirtPos, 3));
  {
    const idx = [];
    const n = skirtPts.length;
    for (let s = 0; s < n; s++) {
      const a = s * 2, b = s * 2 + 1, c = ((s + 1) % n) * 2, d = ((s + 1) % n) * 2 + 1;
      idx.push(a, c, b, b, c, d);
    }
    skirtGeo.setIndex(idx);
  }
  const skirt = new THREE.Mesh(skirtGeo, new THREE.MeshBasicMaterial({ color: 0x4d463d, side: THREE.DoubleSide }));
  skirt.frustumCulled = false;
  group.add(skirt);

  // 입자와 물
  // 자갈: 꼭짓점을 자리마다 정해진 만큼 밀고 당긴 울퉁불퉁한 돌. 면을 각지게 칠해 깨진 돌처럼 보인다.
  const grainMesh = new THREE.InstancedMesh(roughStone(), new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), 2400);
  grainMesh.frustumCulled = false; grainMesh.castShadow = true;
  // 첫 화면 전에 색 버퍼를 만들어 두어야 입자 색이 적용된다.
  { const c = new THREE.Color(); for (let s = 0; s < 2400; s++) grainMesh.setColorAt(s, c.set(GRAINS[0].color)); }
  group.add(grainMesh);
  // 물: 물 덩어리가 지나온 길을 따라 휘어지는 가늘고 긴 띠. 머리는 굵고 진하며 꼬리로 갈수록 가늘고 옅어진다.
  const TRAIL = 10, MAXD = 1600;
  const wPos = new Float32Array(MAXD * TRAIL * 2 * 3), wCol = new Float32Array(MAXD * TRAIL * 2 * 4);
  const wIdx = new Uint32Array(MAXD * (TRAIL - 1) * 6);
  for (let d = 0, t = 0; d < MAXD; d++) for (let k = 0; k < TRAIL - 1; k++) {
    const a0 = (d * TRAIL + k) * 2;
    wIdx[t++] = a0; wIdx[t++] = a0 + 1; wIdx[t++] = a0 + 2; wIdx[t++] = a0 + 1; wIdx[t++] = a0 + 3; wIdx[t++] = a0 + 2;
  }
  const waterGeo = new THREE.BufferGeometry();
  waterGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3).setUsage(THREE.DynamicDrawUsage));
  waterGeo.setAttribute('color', new THREE.BufferAttribute(wCol, 4).setUsage(THREE.DynamicDrawUsage));
  waterGeo.setIndex(new THREE.BufferAttribute(wIdx, 1));
  waterGeo.setDrawRange(0, 0);
  const waterMesh = new THREE.Mesh(waterGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  waterMesh.frustumCulled = false; waterMesh.renderOrder = 2;
  group.add(waterMesh);
  const q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3();
  const m4 = new THREE.Matrix4(), tmpC = new THREE.Color();

  // 단면을 자른 위치를 지형 위에 표시
  const sectionLine = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)),
    new THREE.LineDashedMaterial({ color: 0xffd36b, dashSize: 3, gapSize: 2.4 }));
  sectionLine.frustumCulled = false;
  // 점선 간격 속성은 한 번만 만들고 값만 다시 채운다.
  const lineDist = new Float32Array(N);
  const lineDistAttr = new THREE.BufferAttribute(lineDist, 1);
  sectionLine.geometry.setAttribute('lineDistance', lineDistAttr);
  group.add(sectionLine);

  function syncTerrain() {
    const { h, thick, mask, surf } = model;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      pos[k * 3 + 1] = h[k];
      const t = smooth(0.12, 1.1, thick[k]);
      const a = surf[k * 3], b = surf[k * 3 + 1], c = surf[k * 3 + 2], w = a + b + c || 1;
      const wet = smooth(0.2, 1, mask[k]);
      for (let q = 0; q < 3; q++) {
        const sed = (GRAIN_RGB[0][q] * a + GRAIN_RGB[1][q] * b + GRAIN_RGB[2][q] * c) / w;
        let v = (baseRgb[k * 3 + q] + (sed - baseRgb[k * 3 + q]) * t) * speckle[k];
        v += (WATER_RGB[q] - v) * wet * 0.92;
        col[k * 3 + q] = v;
      }
    }
    fillNormals(N, 1, k => h[k], nor);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    skirtPts.forEach(([i, j], s) => {
      const x = i - CENTER, z = j - CENTER;
      skirtPos.set([x, h[j * N + i], z, x, BOTTOM, z], s * 6);
    });
    skirtGeo.attributes.position.needsUpdate = true;
    const lp = sectionLine.geometry.attributes.position;
    for (let j = 0; j < N; j++) lp.setXYZ(j, 0, h[j * N + CENTER] + 0.5, j - CENTER);
    lp.needsUpdate = true;
    lineDist[0] = 0;
    for (let j = 1; j < N; j++) lineDist[j] = lineDist[j - 1] + Math.hypot(lp.getX(j) - lp.getX(j - 1), lp.getY(j) - lp.getY(j - 1), lp.getZ(j) - lp.getZ(j - 1));
    lineDistAttr.needsUpdate = true;
  }

  function syncParticles() {
    const ps = model.parcels;
    const n = Math.min(ps.length, 2400);
    grainMesh.count = n;
    for (let s = 0; s < n; s++) {
      const p = ps[s], g = GRAINS[p.cls];
      // 돌마다 처음 한 번 정한 방향과 납작한 정도를 계속 쓴다(그리기에만 쓰는 값).
      if (p.look === undefined) p.look = { x: Math.random() * 6.3, y: Math.random() * 6.3, z: Math.random() * 6.3, a: 0.75 + Math.random() * 0.5, b: 0.55 + Math.random() * 0.35 };
      const L = p.look, y = model.sample(p.x, p.y) + g.size * 0.6;
      q4.setFromEuler(e4.set(L.x, L.y, L.z));
      m4.compose(v4.set(p.x - CENTER, y, p.y - CENTER), q4, s4.set(g.size * L.a, g.size * L.b, g.size));
      grainMesh.setMatrixAt(s, m4);
      grainMesh.setColorAt(s, tmpC.set(g.color));
    }
    grainMesh.instanceMatrix.needsUpdate = true;
    if (grainMesh.instanceColor) grainMesh.instanceColor.needsUpdate = true;
    const ds = model.drops;
    const d = Math.min(ds.length, MAXD);
    for (let s = 0; s < d; s++) {
      const p = ds[s], path = p.path || [p.x, p.y], n = path.length >> 1;
      // 모형이 기억한 최근 자리(1칸 간격)를 이어 띠를 만든다. 화면 갱신 빠르기와 상관없이 같은 모양이다.
      const tr = [];
      for (let k = 0; k < Math.min(n, TRAIL); k++) tr.push([path[k * 2] - CENTER, model.sample(path[k * 2], path[k * 2 + 1]) + 0.4, path[k * 2 + 1] - CENTER]);
      for (let k = 0; k < TRAIL; k++) {
        const P = tr[Math.min(k, tr.length - 1)];
        // 띠 방향에 수직인 옆 방향(수평면)
        const A = tr[Math.max(0, Math.min(k, tr.length - 1) - 1)], B = tr[Math.min(tr.length - 1, k + 1)];
        let dx = A[0] - B[0], dz = A[2] - B[2];
        const l = Math.hypot(dx, dz);
        if (l > 1e-6) { dx /= l; dz /= l; } else { dx = p.dx; dz = p.dy; }
        const f = k / (TRAIL - 1), w = 0.55 * (1 - f * 0.8) * (k < tr.length ? 1 : 0);
        const o = ((s * TRAIL + k) * 2) * 3;
        wPos[o] = P[0] - dz * w; wPos[o + 1] = P[1]; wPos[o + 2] = P[2] + dx * w;
        wPos[o + 3] = P[0] + dz * w; wPos[o + 4] = P[1]; wPos[o + 5] = P[2] - dx * w;
        const c = ((s * TRAIL + k) * 2) * 4, al = 0.9 * (1 - f);
        for (const q of [c, c + 4]) { wCol[q] = 0.58 - 0.34 * f; wCol[q + 1] = 0.84 - 0.24 * f; wCol[q + 2] = 1; wCol[q + 3] = al; }
      }
    }
    waterGeo.setDrawRange(0, d * (TRAIL - 1) * 6);
    waterGeo.attributes.position.needsUpdate = true;
    waterGeo.attributes.color.needsUpdate = true;
  }

  return { group, terrain, syncTerrain, syncParticles };
}
