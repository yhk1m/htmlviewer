// © 2026 김용현
// 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다.
import * as THREE from 'three';
import { N, MOUTH, GRAINS } from './model.js';
import { gridIndex, fillNormals } from '../../shared/grid.js';

const CENTER = MOUTH.i;
const BOTTOM = -16;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

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
  const grainMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), 2400);
  grainMesh.frustumCulled = false; grainMesh.castShadow = true;
  // 첫 화면 전에 색 버퍼를 만들어 두어야 입자 색이 적용된다.
  { const c = new THREE.Color(); for (let s = 0; s < 2400; s++) grainMesh.setColorAt(s, c.set(GRAINS[0].color)); }
  group.add(grainMesh);
  const dropMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x7fd0ff, emissive: 0x1e6fa8, roughness: 0.3 }), 1600);
  dropMesh.frustumCulled = false;
  group.add(dropMesh);
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
      const y = model.sample(p.x, p.y) + g.size * 0.7;
      m4.makeScale(g.size, g.size, g.size);
      m4.setPosition(p.x - CENTER, y, p.y - CENTER);
      grainMesh.setMatrixAt(s, m4);
      grainMesh.setColorAt(s, tmpC.set(g.color));
    }
    grainMesh.instanceMatrix.needsUpdate = true;
    if (grainMesh.instanceColor) grainMesh.instanceColor.needsUpdate = true;
    const ds = model.drops;
    const d = Math.min(ds.length, 1600);
    dropMesh.count = d;
    for (let s = 0; s < d; s++) {
      const p = ds[s];
      m4.makeScale(0.62, 0.3, 0.62);
      m4.setPosition(p.x - CENTER, model.sample(p.x, p.y) + 0.5, p.y - CENTER);
      dropMesh.setMatrixAt(s, m4);
    }
    dropMesh.instanceMatrix.needsUpdate = true;
  }

  return { group, syncTerrain, syncParticles };
}
