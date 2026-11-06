// © 2026 김용현
// 해안 단구 형성 모형 하나를 그리는 3D 블록. 계산은 하지 않고 model의 값을 그대로 그린다.
// 땅은 통째로 올라가고(uplift) 바다는 제 높이에서 오르내린다. 그래서 땅이 솟는 것과 해수면이 움직이는 것이 따로 보인다.
import * as THREE from 'three';
import { N, BOTTOM, REACH, sectionLine as sectionXY } from './model.js';
import { gridIndex } from '../../shared/grid.js';

const CENTER = N / 2;
export const VE = 1.5; // 그림에서 높이를 조금 키우는 배율. 계산 값은 그대로다.
const SHEET = 128, CRESTS = 7, CREST_GAP = 9, ARROWS = 6;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function createBlock(model) {
  const group = new THREE.Group();
  group.scale.y = VE;
  const rockGroup = new THREE.Group(); // 땅이 솟는 만큼 통째로 올린다.
  group.add(rockGroup);
  const linear = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const FOREST = linear('#46603a'), FOREST2 = linear('#5a7346'), GRASS = linear('#8ea765'), CLIFF = linear('#8a7f70'), PLATFORM = linear('#7d7566'), BED = linear('#8c8069'), DEEP = linear('#4a5660'), T_NEW = linear('#d2bb7c'), T_OLD = linear('#a9b06c'), RIVER = linear('#3f8fc4');

  const pos = new Float32Array(N * N * 3), nor = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3), speckle = new Float32Array(N * N), patch = new Float32Array(N * N);
  {
    let seed = 5;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      pos[k * 3] = i - CENTER; pos[k * 3 + 2] = j - CENTER;
      speckle[k] = 0.94 + r() * 0.12;
      patch[k] = Math.sin(i * 0.11 + 1) * Math.sin(j * 0.1) * 0.5 + 0.5;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(gridIndex(N), 1));
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 }));
  terrain.castShadow = terrain.receiveShadow = true;
  terrain.frustumCulled = false;
  rockGroup.add(terrain);

  // 블록 옆면. 윗선은 땅과 물 가운데 높은 쪽이고 아랫선은 제자리다.
  const skirtPts = [];
  for (let i = 0; i < N; i += 2) skirtPts.push([i, 0]);
  for (let j = 0; j < N; j += 2) skirtPts.push([N - 1, j]);
  for (let i = N - 1; i >= 0; i -= 2) skirtPts.push([i, N - 1]);
  for (let j = N - 1; j >= 0; j -= 2) skirtPts.push([0, j]);
  const skirtPos = new Float32Array(skirtPts.length * 6), skirtGeo = new THREE.BufferGeometry();
  skirtGeo.setAttribute('position', new THREE.BufferAttribute(skirtPos, 3));
  {
    const idx = [], n = skirtPts.length;
    for (let s = 0; s < n; s++) { const a = s * 2, b = a + 1, c = ((s + 1) % n) * 2, d = c + 1; idx.push(a, c, b, b, c, d); }
    skirtGeo.setIndex(idx);
  }
  const skirt = new THREE.Mesh(skirtGeo, new THREE.MeshBasicMaterial({ color: 0x4d463d, side: THREE.DoubleSide }));
  skirt.frustumCulled = false;
  group.add(skirt);

  // 바다: 시트를 해수면 높이에 놓는다. 땅이 수면보다 높으면 땅에 가려 바닷가가 저절로 생긴다.
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
  const sheet = new THREE.Mesh(sGeo, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, roughness: 0.3, depthWrite: false }));
  sheet.frustumCulled = false;
  sheet.renderOrder = 1;
  group.add(sheet);
  const SHALLOW = linear('#7cc7dc'), CLEAN = linear('#2f86c9'), DEEPW = linear('#1d5c94');

  // 파봉선: 바닷가를 닮은 흰 선이 해안 쪽으로 다가온다.
  const crestPos = new Float32Array(N * CRESTS * 2 * 3);
  const crestGeo = new THREE.BufferGeometry();
  crestGeo.setAttribute('position', new THREE.BufferAttribute(crestPos, 3));
  const crests = new THREE.LineSegments(crestGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
  crests.frustumCulled = false; crests.renderOrder = 3;
  group.add(crests);

  // 간빙기 해수면 높이를 블록 둘레에 점선으로 남긴다. 빙기에 물이 얼마나 내려갔는지 보인다.
  const ringPts = [[-CENTER, -CENTER], [CENTER, -CENTER], [CENTER, CENTER], [-CENTER, CENTER], [-CENTER, -CENTER]].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), new THREE.LineDashedMaterial({ color: 0xbfe6ff, dashSize: 4, gapSize: 3 }));
  ring.computeLineDistances();
  ring.frustumCulled = false; ring.renderOrder = 4; ring.visible = false;
  group.add(ring);

  // 땅이 솟는 쪽을 가리키는 화살표. 블록 옆에 세우고 빠를수록 크게 그린다.
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 1); arrowShape.lineTo(0.75, 0.2); arrowShape.lineTo(0.28, 0.2); arrowShape.lineTo(0.28, -1); arrowShape.lineTo(-0.28, -1); arrowShape.lineTo(-0.28, 0.2); arrowShape.lineTo(-0.75, 0.2); arrowShape.closePath();
  const arrows = new THREE.InstancedMesh(new THREE.ShapeGeometry(arrowShape), new THREE.MeshBasicMaterial({ color: 0xffb34d, side: THREE.DoubleSide, toneMapped: false }), ARROWS);
  arrows.frustumCulled = false; arrows.renderOrder = 5;
  group.add(arrows);
  const m4 = new THREE.Matrix4();

  // 단면 위치
  const lineGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(120 * 3), 3));
  const lineDist = new Float32Array(120), lineDistAttr = new THREE.BufferAttribute(lineDist, 1);
  lineGeo.setAttribute('lineDistance', lineDistAttr);
  const sectionLine = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: 0xffd36b, dashSize: 3, gapSize: 2.4 }));
  sectionLine.frustumCulled = false;
  group.add(sectionLine);

  function paint(k) {
    const { r, stand, stands, uplift, streamD } = model, i = k % N, j = (k / N) | 0, e = r[k] + uplift;
    pos[k * 3 + 1] = r[k];
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const dhx = r[ir] - r[il], dhz = r[jr] - r[jl], dx = dhx * 0.5 * VE, dz = dhz * 0.5 * VE, len = Math.hypot(dx, 1, dz);
    nor[k * 3] = -dx / len; nor[k * 3 + 1] = 1 / len; nor[k * 3 + 2] = -dz / len;
    const slope = Math.hypot(dhx, dhz) / 2, st = stand[k] > 0 ? stands[stand[k] - 1] : null, flat = st && Math.abs(r[k] - st.level) < 0.55;
    const old = flat && st.level + uplift > REACH;
    const ageMix = old ? clamp((stands.length - st.no) / 3) : 0;
    for (let q = 0; q < 3; q++) {
      let v;
      if (old) {
        // 옛 바닷가의 자갈과 모래 위에 흙이 덮인 평평한 땅. 오래될수록 풀과 나무가 많다.
        v = T_NEW[q] + (T_OLD[q] - T_NEW[q]) * ageMix;
        v += (FOREST2[q] - v) * patch[k] * 0.22;
      } else if (flat) v = PLATFORM[q];
      else if (stand[k] === -1) v = BED[q];
      else if (e > 0.3) {
        v = GRASS[q] + (FOREST[q] - GRASS[q]) * smooth(1, 6, e);
        v += (FOREST2[q] - v) * patch[k] * 0.4;
      } else v = BED[q] + (DEEP[q] - BED[q]) * smooth(1, 14, -e);
      if (!flat && e > 0.3) v += (CLIFF[q] - v) * smooth(0.28, 0.6, slope);
      if (streamD[k] < 1.3 && e > 0.3 && !flat) v = RIVER[q];
      col[k * 3 + q] = v * speckle[k];
    }
  }

  let lastSea = 99, lastUp = -99;
  function syncSheet(force) {
    const { r, sea, uplift } = model;
    sheet.position.y = sea;
    ring.visible = sea < -0.6;
    rockGroup.position.y = uplift;
    if (!force && Math.abs(sea - lastSea) < 0.03 && Math.abs(uplift - lastUp) < 0.03) return;
    lastSea = sea; lastUp = uplift;
    for (let j = 0; j < SN; j++) for (let i = 0; i < SN; i++) {
      const k = j * SN + i, c = Math.min(N - 1, Math.round(j * step)) * N + Math.min(N - 1, Math.round(i * step)), d = sea - r[c] - uplift;
      const a = smooth(0, 1.4, d), b = smooth(1.2, 8, d);
      for (let q = 0; q < 3; q++) { let v = SHALLOW[q] + (CLEAN[q] - SHALLOW[q]) * a; v += (DEEPW[q] - v) * b; sCol[k * 4 + q] = v; }
      sCol[k * 4 + 3] = 0.55 + 0.35 * a + 0.08 * b;
    }
    sGeo.attributes.color.needsUpdate = true;
    // 옆면은 해수면과 땅이 움직일 때만 다시 잡는다. 땅과 물이 만나는 선이 그대로 윗선이 된다.
    skirtPts.forEach(([i, j], s) => { const x = i - CENTER, z = j - CENTER; skirtPos.set([x, Math.max(r[j * N + i] + uplift, sea), z, x, BOTTOM, z], s * 6); });
    skirtGeo.attributes.position.needsUpdate = true;
  }

  let fullDone = false;
  function syncTerrain(full) {
    if (full || model.allDirty || !fullDone) {
      for (let k = 0; k < N * N; k++) paint(k);
      model.allDirty = false; fullDone = true;
      model.consumeDirty();
    } else {
      const list = model.dirtyList, c = model.dirtyCount;
      for (let a = 0; a < c; a++) {
        const k = list[a], i = k % N, j = (k / N) | 0;
        paint(k);
        if (i > 0) paint(k - 1);
        if (i < N - 1) paint(k + 1);
        if (j > 0) paint(k - N);
        if (j < N - 1) paint(k + N);
      }
      model.consumeDirty();
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    syncSheet(full);
    syncSectionLine();
  }

  function syncSectionLine() {
    const lp = lineGeo.attributes.position, S = sectionXY();
    for (let t = 0; t < 120; t++) {
      const f = t / 119, x = S.ax + (S.bx - S.ax) * f, y = S.ay + (S.by - S.ay) * f;
      lp.setXYZ(t, x - CENTER, Math.max(model.sample(x, y) + model.uplift, model.sea) + 0.25, y - CENTER);
    }
    lp.needsUpdate = true;
    lineDist[0] = 0;
    for (let t = 1; t < 120; t++) lineDist[t] = lineDist[t - 1] + Math.hypot((lp.getY(t) - lp.getY(t - 1)) * VE, lp.getZ(t) - lp.getZ(t - 1));
    lineDistAttr.needsUpdate = true;
  }

  // 파봉선을 옮긴다. phase는 0에서 1까지 돈다. 안쪽 줄로 갈수록 해안선을 닮는다.
  function syncWaves(phase) {
    const lp = crestGeo.attributes.position, { shore, sea } = model;
    let n = 0;
    const row = (i, c) => {
      let s = 0;
      for (let a = -18; a <= 18; a += 2) s += shore[clamp(i + a, 0, N - 1)];
      return s / 19 + 6 + (CRESTS - c - 1 + (1 - phase)) * CREST_GAP;
    };
    for (let c = 0; c < CRESTS; c++) {
      let prev = row(0, c);
      for (let i = 4; i < N; i += 4) {
        const now = row(i, c);
        if (prev < N - 2 && now < N - 2) {
          crestPos[n * 3] = i - 4 - CENTER; crestPos[n * 3 + 1] = sea + 0.12; crestPos[n * 3 + 2] = prev - CENTER; n++;
          crestPos[n * 3] = i - CENTER; crestPos[n * 3 + 1] = sea + 0.12; crestPos[n * 3 + 2] = now - CENTER; n++;
        }
        prev = now;
      }
    }
    crestGeo.setDrawRange(0, n);
    lp.needsUpdate = true;
    syncSheet(false);
  }

  // 땅이 솟는 빠르기에 맞춘 화살표 크기
  function syncFlow() {
    const big = model.rate * 27, size = big <= 0 ? 0 : big < 1 ? 5 : 10;
    const places = [[-CENTER - 8, -60], [-CENTER - 8, 20], [-CENTER - 8, 90], [CENTER + 8, -60], [CENTER + 8, 20], [CENTER + 8, 90]];
    places.forEach(([x, z], n) => {
      if (!size) { m4.makeScale(0, 0, 0); arrows.setMatrixAt(n, m4); return; }
      m4.makeScale(size, size / VE, size);
      m4.setPosition(x, 6, z);
      arrows.setMatrixAt(n, m4);
    });
    arrows.instanceMatrix.needsUpdate = true;
  }

  return { group, terrain, syncTerrain, syncFlow, syncWaves, crests, arrowCount: ARROWS };
}
