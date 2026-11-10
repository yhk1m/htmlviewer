// © 2026 김용현
// 고위 평탄면 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다. 계산은 하지 않고 model의 값을 그대로 그린다.
import * as THREE from 'three';
import { N, KIND, sectionLine as sectionXY } from './model.js';
import { gridIndex } from '../../shared/grid.js';

const CENTER = N / 2;
export const BOTTOM = -18;
export const VE = 1; // 그림에서 높이를 키우는 배율. 높이 한 단위(20m)를 칸 하나(100m) 길이로 그려 이미 약 5배 과장되어 있다.
const SHEET = 96, TURBINES = 14;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function createBlock(model) {
  const group = new THREE.Group();
  group.scale.y = VE;
  const linear = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const C = {
    low: linear('#93a865'), low2: linear('#a7ad6e'), forest: linear('#3f5a33'), forest2: linear('#4f6a3c'), dark: linear('#2f4628'),
    rock: linear('#8a7f70'), rock2: linear('#a0907a'), plateau: linear('#86a05a'), plateau2: linear('#9aa964'),
    floor: linear('#b2b874'), floor2: linear('#c3bd7e'), valley: linear('#9db46a'), river: linear('#3d8fc9'), river2: linear('#5aa6d6'),
    cabbage: linear('#5d8f36'), soil: linear('#8c7a5c'), pasture: linear('#c8cf86'), pasture2: linear('#b5c272'),
    bed: linear('#b3a581'), deep: linear('#22384a'), beach: linear('#d6c89c'),
  };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  const pos = new Float32Array(N * N * 3), nor = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3), speckle = new Float32Array(N * N), patch = new Float32Array(N * N), stripe = new Float32Array(N * N);
  {
    let seed = 5;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      pos[k * 3] = i - CENTER; pos[k * 3 + 2] = j - CENTER;
      speckle[k] = 0.93 + r() * 0.14;
      patch[k] = Math.sin(i * 0.13 + 1) * Math.sin(j * 0.11) * 0.5 + 0.5 + (Math.sin(i * 0.41 + j * 0.27) * 0.5) * 0.3;
      // 고랭지 밭 이랑: 구획마다 방향이 다른 줄무늬
      const blk = (Math.floor(i / 16) * 7 + Math.floor(j / 13) * 3) % 3, u = blk === 0 ? i : blk === 1 ? j : (i + j) * 0.7;
      stripe[k] = Math.floor(u / 1.5) % 2;
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

  // 블록 옆면: 남쪽 면에는 동서 단면이 그대로 드러난다.
  const skirtPts = [];
  for (let i = 0; i < N; i++) skirtPts.push([i, 0]);
  for (let j = 1; j < N; j++) skirtPts.push([N - 1, j]);
  for (let i = N - 2; i >= 0; i--) skirtPts.push([i, N - 1]);
  for (let j = N - 2; j >= 1; j--) skirtPts.push([0, j]);
  const skirtPos = new Float32Array(skirtPts.length * 6), skirtGeo = new THREE.BufferGeometry();
  skirtGeo.setAttribute('position', new THREE.BufferAttribute(skirtPos, 3));
  {
    const idx = [], n = skirtPts.length;
    for (let s = 0; s < n; s++) { const a = s * 2, b = a + 1, c = ((s + 1) % n) * 2, d = c + 1; idx.push(a, c, b, b, c, d); }
    skirtGeo.setIndex(idx);
  }
  const skirt = new THREE.Mesh(skirtGeo, new THREE.MeshBasicMaterial({ color: 0x5f5446, side: THREE.DoubleSide }));
  skirt.frustumCulled = false;
  group.add(skirt);
  const waterSidePos = new Float32Array(skirtPts.length * 6), waterSideGeo = new THREE.BufferGeometry();
  waterSideGeo.setAttribute('position', new THREE.BufferAttribute(waterSidePos, 3));
  waterSideGeo.setIndex(skirtGeo.index);
  const waterSide = new THREE.Mesh(waterSideGeo, new THREE.MeshBasicMaterial({ color: 0x2f86c9, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
  waterSide.frustumCulled = false;
  waterSide.renderOrder = 1;
  group.add(waterSide);

  // 바다: 해수면(0) 높이의 한 장. 땅 위는 투명하다.
  const SN = SHEET, step = (N - 1) / (SN - 1);
  const sPos = new Float32Array(SN * SN * 3), sCol = new Float32Array(SN * SN * 4), sNor = new Float32Array(SN * SN * 3);
  for (let j = 0; j < SN; j++) for (let i = 0; i < SN; i++) {
    const k = j * SN + i;
    sPos[k * 3] = i * step - CENTER; sPos[k * 3 + 2] = j * step - CENTER; sNor[k * 3 + 1] = 1;
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute('normal', new THREE.BufferAttribute(sNor, 3));
  sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 4));
  sGeo.setIndex(new THREE.BufferAttribute(gridIndex(SN), 1));
  const sheet = new THREE.Mesh(sGeo, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, roughness: 0.25, depthWrite: false }));
  sheet.frustumCulled = false;
  sheet.renderOrder = 1;
  group.add(sheet);
  const SHALLOW = linear('#7fc4d8'), DEEPW = linear('#1d5c94');
  function syncSea() {
    const { h } = model;
    for (let j = 0; j < SN; j++) for (let i = 0; i < SN; i++) {
      const k = j * SN + i, c = Math.min(N - 1, Math.round(j * step)) * N + Math.min(N - 1, Math.round(i * step));
      const d = -h[c], b = smooth(0.5, 8, d);
      for (let q = 0; q < 3; q++) sCol[k * 4 + q] = SHALLOW[q] + (DEEPW[q] - SHALLOW[q]) * b;
      sCol[k * 4 + 3] = model.land[c] ? 0 : 0.55 + 0.3 * b;
    }
    sGeo.attributes.color.needsUpdate = true;
    skirtPts.forEach(([i, j], s) => {
      const x = i - CENTER, z = j - CENTER, k = j * N + i, top = model.h[k];
      waterSidePos.set(model.land[k] ? [x, top, z, x, top, z] : [x, 0, z, x, top, z], s * 6);
    });
    waterSideGeo.attributes.position.needsUpdate = true;
  }

  // 풍력 발전기: 기둥, 몸체, 날개 셋. 날개는 재생 중에 돈다.
  const towerGeo = new THREE.CylinderGeometry(0.28, 0.45, 8, 8);
  towerGeo.translate(0, 4, 0);
  const headGeo = new THREE.BoxGeometry(0.9, 0.8, 1.8);
  headGeo.translate(0, 8.2, 0);
  const bladeGeo = (() => {
    const g = new THREE.BufferGeometry(), p = [], L = 4.4, W = 0.42;
    for (let b = 0; b < 3; b++) {
      const a = (b * Math.PI * 2) / 3, ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
      const pts = [[0.2 * ca + W * px, 0.2 * sa + W * py], [L * ca, L * sa], [0.2 * ca - W * px * 0.4, 0.2 * sa - W * py * 0.4]];
      for (const [x, y] of pts) p.push(x, y, 0);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.computeVertexNormals();
    return g;
  })();
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.5 });
  const towers = new THREE.InstancedMesh(towerGeo, white, TURBINES), heads = new THREE.InstancedMesh(headGeo, white, TURBINES);
  const rotors = new THREE.InstancedMesh(bladeGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, side: THREE.DoubleSide }), TURBINES);
  for (const im of [towers, heads, rotors]) { im.frustumCulled = false; im.castShadow = true; im.count = 0; group.add(im); }
  const m4 = new THREE.Matrix4(), rot = new THREE.Matrix4(), scl = new THREE.Matrix4(), yaw = new THREE.Matrix4().makeRotationY(-0.5);
  let spin = 0;
  function syncTurbines() {
    const list = model.turbines, show = model.useFrac;
    let n = 0;
    list.forEach((q, idx) => {
      // 하나씩 차례로 세워진다.
      const f = smooth(idx / (list.length + 2), (idx + 3) / (list.length + 2), show);
      if (f <= 0.01) return;
      const y = model.h[q.y * N + q.x] - 0.2, s = f;
      scl.makeScale(s, s / VE, s);
      m4.makeTranslation(q.x - CENTER, y, q.y - CENTER).multiply(yaw).multiply(scl);
      towers.setMatrixAt(n, m4); heads.setMatrixAt(n, m4);
      rot.makeRotationZ(spin + idx * 0.7);
      const hub = new THREE.Matrix4().makeTranslation(0, 8.2, 1.0);
      rotors.setMatrixAt(n, m4.clone().multiply(hub).multiply(rot));
      n++;
    });
    for (const im of [towers, heads, rotors]) { im.count = n; im.instanceMatrix.needsUpdate = true; }
  }

  // 단면 위치
  const lineGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(160 * 3), 3));
  const sectionLine = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: 0xffd36b, dashSize: 3, gapSize: 2.4 }));
  sectionLine.frustumCulled = false;
  const lineDist = new Float32Array(160), lineDistAttr = new THREE.BufferAttribute(lineDist, 1);
  lineGeo.setAttribute('lineDistance', lineDistAttr);
  group.add(sectionLine);
  function syncSectionLine() {
    const lp = lineGeo.attributes.position, S = sectionXY(model);
    for (let t = 0; t < 160; t++) {
      const f = t / 159, x = S.ax + (S.bx - S.ax) * f, y = S.ay + (S.by - S.ay) * f;
      lp.setXYZ(t, x - CENTER, Math.max(0, model.sample(x, y)) + 0.4, y - CENTER);
    }
    lp.needsUpdate = true;
    lineDist[0] = 0;
    for (let t = 1; t < 160; t++) lineDist[t] = lineDist[t - 1] + Math.hypot((lp.getY(t) - lp.getY(t - 1)) * VE, lp.getX(t) - lp.getX(t - 1));
    lineDistAttr.needsUpdate = true;
  }

  function paint(k, kinds) {
    const { h } = model, i = k % N, j = (k / N) | 0;
    pos[k * 3 + 1] = h[k];
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const dhx = h[ir] - h[il], dhz = h[jr] - h[jl], dx = dhx * 0.5 * VE, dz = dhz * 0.5 * VE, len = Math.hypot(dx, 1, dz);
    nor[k * 3] = -dx / len; nor[k * 3 + 1] = 1 / len; nor[k * 3 + 2] = -dz / len;
    const slope = Math.hypot(dhx, dhz) / 2, kd = kinds[k], sp = speckle[k], pt = patch[k];
    let c;
    if (kd === KIND.sea) {
      const depth = -h[k];
      c = mix(C.beach, mix(C.bed, C.deep, smooth(1, 12, depth)), smooth(0.2, 1.5, depth));
    } else if (kd === KIND.water) {
      c = mix(C.river, C.river2, pt * 0.4);
    } else {
      const cut = model.surf[k] - h[k], lifted = model.lifted(k);
      // 낮은 땅(논밭과 마을이 섞인 들)에서 솟은 높은 땅(풀밭과 숲)으로
      c = mix(mix(C.low, C.low2, pt * 0.6), mix(C.plateau, C.plateau2, pt), smooth(3, 14, lifted));
      // 파인 비탈: 숲, 가파른 곳은 바위
      c = mix(c, mix(C.forest, C.forest2, pt * 0.5), smooth(0.4, 2.2, cut) * 0.92);
      c = mix(c, C.dark, smooth(0.9, 1.8, slope) * 0.35);
      c = mix(c, mix(C.rock, C.rock2, pt), smooth(1.5, 2.6, slope) * 0.55);
      // 넓게 깎인 골짜기 바닥(저위 평탄면과 지금의 골짜기 바닥): 밝은 들판
      if (model.floorOf(k) < 1e8 && h[k] >= model.floorOf(k) - 0.3) c = mix(C.floor, C.floor2, pt);
      else if (cut > 1 && slope < 0.35) c = mix(c, C.valley, 0.6);
      if (kd === KIND.low) c = mix(C.floor, C.floor2, pt);
      // 오늘날 이용: 고위 평탄면의 고랭지 밭(이랑 줄무늬)과 목장(옅은 풀밭)
      const u = model.useFrac;
      if (u > 0 && kd === KIND.high) {
        const use = model.useKind(k);
        if (use === 1) c = mix(c, stripe[k] ? C.cabbage : C.soil, u);
        else if (use === 2) c = mix(c, mix(C.pasture, C.pasture2, pt), u);
      }
    }
    for (let q = 0; q < 3; q++) col[k * 3 + q] = c[q] * sp;
  }

  let lastVersion = -1;
  function syncTerrain(force) {
    if (!force && model.version === lastVersion) return false;
    lastVersion = model.version;
    const kinds = model.kinds();
    for (let k = 0; k < N * N; k++) paint(k, kinds);
    skirtPts.forEach(([i, j], s) => {
      const x = i - CENTER, z = j - CENTER, top = model.h[j * N + i];
      skirtPos.set([x, top, z, x, BOTTOM, z], s * 6);
    });
    skirtGeo.attributes.position.needsUpdate = true;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    syncSea();
    syncSectionLine();
    syncTurbines();
    return true;
  }
  // 재생 중에 날개를 돌린다.
  function spinRotors(dt) {
    if (!model.turbines.length || model.useFrac <= 0) return false;
    spin -= dt * 2.2;
    syncTurbines();
    return true;
  }

  return { group, terrain, syncTerrain, spinRotors };
}
