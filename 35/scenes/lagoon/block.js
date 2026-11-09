// © 2026 김용현
// 사빈, 사주, 석호 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다. 계산은 하지 않고 model의 값을 그대로 그린다.
import * as THREE from 'three';
import { N, RAYS, RAY_STEPS, MOUTH, RISE, barRow, BAR, sectionLine as sectionXY } from './model.js';
import { gridIndex } from '../../shared/grid.js';

const CENTER = N / 2;
export const BOTTOM = -10;
export const VE = 1.7; // 그림에서 높이를 키우는 배율. 계산 값은 그대로다.
const SHEET = 128, CREST_GAP = 12, CRESTS = Math.floor(RAY_STEPS / CREST_GAP) - 1, ARROWS = 14, WINDS = 7;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const inside = (x, y) => x >= 0 && x <= N - 1 && y >= 0 && y <= N - 1; // 선은 블록 밖에서 출발하므로 블록 안만 그린다.
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function createBlock(model) {
  const group = new THREE.Group();
  group.scale.y = VE;
  const linear = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const FOREST = linear('#46603a'), FOREST2 = linear('#5a7346'), GRASS = linear('#8ea765'), SAND = linear('#e6cf90'), WET = linear('#c9b47a'), DUNE = linear('#efdca6'), DUNEGRASS = linear('#a9b06a'), MARSH = linear('#8f9a5c'), MUD = linear('#7d6f55'), BED = linear('#c4b48e'), DEEP = linear('#1f3442'), RIVERC = linear('#3d8fc9'), ROCK = linear('#8a7f70');

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
  group.add(terrain);

  // 블록 옆면과 옆면의 물
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
  const skirt = new THREE.Mesh(skirtGeo, new THREE.MeshBasicMaterial({ color: 0x5a4f40, side: THREE.DoubleSide }));
  skirt.frustumCulled = false;
  group.add(skirt);
  const waterSidePos = new Float32Array(skirtPts.length * 6), waterSideGeo = new THREE.BufferGeometry();
  waterSideGeo.setAttribute('position', new THREE.BufferAttribute(waterSidePos, 3));
  waterSideGeo.setIndex(skirtGeo.index);
  const waterSide = new THREE.Mesh(waterSideGeo, new THREE.MeshBasicMaterial({ color: 0x2f86c9, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  waterSide.frustumCulled = false;
  waterSide.renderOrder = 1;
  group.add(waterSide);

  // 물: 바다와 만, 석호를 한 장으로 그린다. 해수면과 함께 오르내린다. 석호는 바닷물과 민물이 섞여 푸른 풀빛이다.
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
  const SHALLOW = linear('#7cc7dc'), CLEAN = linear('#2f86c9'), DEEPW = linear('#1d5c94'), LAGOON = linear('#2f9488');

  // 파봉선과 진행 방향선
  const crestPos = new Float32Array((RAYS - 1) * CRESTS * 2 * 3);
  const crestGeo = new THREE.BufferGeometry();
  crestGeo.setAttribute('position', new THREE.BufferAttribute(crestPos, 3));
  const crests = new THREE.LineSegments(crestGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }));
  crests.frustumCulled = false; crests.renderOrder = 3;
  group.add(crests);
  const rayPos = new Float32Array(Math.ceil(RAYS / 6) * RAY_STEPS * 2 * 3);
  const rayGeo = new THREE.BufferGeometry();
  rayGeo.setAttribute('position', new THREE.BufferAttribute(rayPos, 3));
  const rays = new THREE.LineSegments(rayGeo, new THREE.LineBasicMaterial({ color: 0xffc23d, toneMapped: false }));
  rays.frustumCulled = false; rays.renderOrder = 3;
  group.add(rays);

  // 연안류 화살표(노랑)와 바닷바람 화살표(흰색)
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(1, 0); arrowShape.lineTo(-1, 1); arrowShape.lineTo(-0.35, 0); arrowShape.lineTo(-1, -1); arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  arrowGeo.rotateX(-Math.PI / 2);
  const arrows = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xffd36b, side: THREE.DoubleSide }), ARROWS);
  arrows.frustumCulled = false; arrows.renderOrder = 4;
  group.add(arrows);
  const winds = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }), WINDS);
  winds.frustumCulled = false; winds.renderOrder = 4;
  group.add(winds);
  const m4 = new THREE.Matrix4(), scl = new THREE.Matrix4();

  const grains = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0x4a3a10, roughness: 0.7 }), model.TRAILS);
  grains.frustumCulled = false;
  group.add(grains);

  // 단면 위치
  const lineGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(120 * 3), 3));
  const sectionLine = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: 0xffd36b, dashSize: 3, gapSize: 2.4 }));
  sectionLine.frustumCulled = false;
  const lineDist = new Float32Array(120), lineDistAttr = new THREE.BufferAttribute(lineDist, 1);
  lineGeo.setAttribute('lineDistance', lineDistAttr);
  group.add(sectionLine);

  function paint(k) {
    const { h, sand, dune, fill, river, isBar, sea } = model, i = k % N, j = (k / N) | 0;
    pos[k * 3 + 1] = h[k];
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const dhx = h[ir] - h[il], dhz = h[jr] - h[jl], dx = dhx * 0.5 * VE, dz = dhz * 0.5 * VE, len = Math.hypot(dx, 1, dz);
    nor[k * 3] = -dx / len; nor[k * 3 + 1] = 1 / len; nor[k * 3 + 2] = -dz / len;
    const slope = Math.hypot(dhx, dhz) / 2, above = h[k] - sea;
    for (let q = 0; q < 3; q++) {
      let v;
      if (above >= 0) {
        v = GRASS[q] + (FOREST[q] - GRASS[q]) * smooth(0.6, 3, above);
        v += (FOREST2[q] - v) * patch[k] * 0.4;
        v += (ROCK[q] - v) * smooth(0.9, 1.8, slope);
        // 빙기에 드러난 땅(지금은 바다 밑)은 풀이 듬성한 땅이다. 모래 해안과 헷갈리지 않게 풀빛을 섞는다.
        if (model.start[k] < 0 && sand[k] < 0.02 && fill[k] < 0.02) v = GRASS[q] * 0.6 + BED[q] * 0.25 + FOREST[q] * 0.15;
        if (fill[k] > 0.05) v = MARSH[q] + (GRASS[q] - MARSH[q]) * patch[k] * 0.5;
        if (sand[k] > 0.03) v = above < 0.12 ? WET[q] : SAND[q];
        if (dune[k] > 0.12) v = DUNE[q] + (DUNEGRASS[q] - DUNE[q]) * smooth(0.3, 0.9, dune[k]) * 0.75;
        if (isBar[k] && dune[k] <= 0.12 && sand[k] > 0.03) v = SAND[q];
        if (river[k]) v = RIVERC[q];
      } else if (sand[k] > 0.03) v = SAND[q] * 0.8 + BED[q] * 0.2;
      else if (fill[k] > 0.05) v = MUD[q];
      else v = BED[q] + (DEEP[q] - BED[q]) * smooth(0.3, 4, -above);
      col[k * 3 + q] = v * speckle[k];
    }
  }

  let lastSea = 99;
  function syncSheet(force) {
    const { h, sea, lagoon } = model;
    for (let k = 0; k < SN * SN; k++) sPos[k * 3 + 1] = sea;
    sGeo.attributes.position.needsUpdate = true;
    for (let j = 0; j < SN; j++) for (let i = 0; i < SN; i++) {
      const k = j * SN + i, c = Math.min(N - 1, Math.round(j * step)) * N + Math.min(N - 1, Math.round(i * step)), d = sea - h[c];
      const a = smooth(0, 1.4, d), b = smooth(1.2, 5, d);
      // 만과 석호는 얕아도 물로 읽히도록 덜 투명하게 칠한다.
      const kind = d > 0 ? model.cellKind(c) : 'land', closed = kind === 'lagoon' || kind === 'bay';
      for (let q = 0; q < 3; q++) { let v = SHALLOW[q] + (CLEAN[q] - SHALLOW[q]) * a; v += (DEEPW[q] - v) * b; if (kind === 'lagoon') v = LAGOON[q] * (1 - 0.2 * a); else if (closed) v = CLEAN[q] * 0.85 + SHALLOW[q] * 0.15; sCol[k * 4 + q] = v; }
      sCol[k * 4 + 3] = kind === 'lagoon' ? 0.8 : closed ? 0.62 + 0.25 * a : 0.18 + 0.22 * a + 0.3 * b;
    }
    sGeo.attributes.color.needsUpdate = true;
    if (force || Math.abs(sea - lastSea) > 0.01) {
      lastSea = sea;
      skirtPts.forEach(([i, j], s) => {
        const x = i - CENTER, z = j - CENTER, top = h[j * N + i];
        waterSidePos.set([x, sea, z, x, Math.min(top, sea), z], s * 6);
      });
      waterSideGeo.attributes.position.needsUpdate = true;
    }
    const lp = rayGeo.attributes.position; let n = 0;
    for (let r = 3; r < RAYS; r += 6) {
      const base = r * RAY_STEPS, L = model.rayLen[r];
      for (let s = 0; s < L - 1 && n < rayPos.length / 3 - 1; s += 1) {
        if (!inside(model.rayX[base + s], model.rayY[base + s]) || !inside(model.rayX[base + s + 1], model.rayY[base + s + 1])) continue;
        rayPos[n * 3] = model.rayX[base + s] - CENTER; rayPos[n * 3 + 1] = sea + 0.09; rayPos[n * 3 + 2] = model.rayY[base + s] - CENTER; n++;
        rayPos[n * 3] = model.rayX[base + s + 1] - CENTER; rayPos[n * 3 + 1] = sea + 0.09; rayPos[n * 3 + 2] = model.rayY[base + s + 1] - CENTER; n++;
      }
    }
    rayGeo.setDrawRange(0, n);
    lp.needsUpdate = true;
  }

  let fullDone = false;
  function syncTerrain(full) {
    if (full || model.allDirty || !fullDone) {
      for (let k = 0; k < N * N; k++) paint(k);
      skirtPts.forEach(([i, j], s) => {
        const x = i - CENTER, z = j - CENTER, top = model.h[j * N + i];
        skirtPos.set([x, top, z, x, BOTTOM, z], s * 6);
      });
      skirtGeo.attributes.position.needsUpdate = true;
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
      lp.setXYZ(t, x - CENTER, Math.max(model.sample(x, y), model.sea) + 0.25, y - CENTER);
    }
    lp.needsUpdate = true;
    lineDist[0] = 0;
    for (let t = 1; t < 120; t++) lineDist[t] = lineDist[t - 1] + Math.hypot((lp.getY(t) - lp.getY(t - 1)) * VE, lp.getZ(t) - lp.getZ(t - 1));
    lineDistAttr.needsUpdate = true;
  }

  // 파봉선을 옮긴다. phase는 0에서 1까지 돈다.
  function syncWaves(phase) {
    const lp = crestGeo.attributes.position, gap = CREST_GAP, sea = model.sea;
    let n = 0;
    for (let c = 0; c < CRESTS; c++) {
      const at = (c + phase) * gap, a = Math.floor(at), u = at - a;
      for (let r = 0; r < RAYS - 1; r++) {
        // 이웃한 두 선의 같은 시각 점을 잇는다. 해안에 먼저 닿아 끊긴 선은 건너뛴다.
        const L0 = model.rayLen[r], L1 = model.rayLen[r + 1];
        if (a + 1 >= L0 || a + 1 >= L1) continue;
        const p = r * RAY_STEPS + a, q = (r + 1) * RAY_STEPS + a;
        const dx = model.rayX[q] - model.rayX[p], dy = model.rayY[q] - model.rayY[p];
        if (dx * dx + dy * dy > 64 || !inside(model.rayX[p], model.rayY[p]) || !inside(model.rayX[q], model.rayY[q])) continue;
        crestPos[n * 3] = model.rayX[p] + (model.rayX[p + 1] - model.rayX[p]) * u - CENTER; crestPos[n * 3 + 1] = sea + 0.12; crestPos[n * 3 + 2] = model.rayY[p] + (model.rayY[p + 1] - model.rayY[p]) * u - CENTER; n++;
        crestPos[n * 3] = model.rayX[q] + (model.rayX[q + 1] - model.rayX[q]) * u - CENTER; crestPos[n * 3 + 1] = sea + 0.12; crestPos[n * 3 + 2] = model.rayY[q] + (model.rayY[q + 1] - model.rayY[q]) * u - CENTER; n++;
      }
    }
    crestGeo.setDrawRange(0, n);
    lp.needsUpdate = true;
  }

  const hide = (mesh, from, count) => { for (let q = from; q < count; q++) { m4.makeScale(0, 0, 0); mesh.setMatrixAt(q, m4); } mesh.instanceMatrix.needsUpdate = true; };
  function syncFlow() {
    // 연안류 화살표: 해수면이 멈춘 뒤 해안선을 따라 왼쪽으로. 사취가 자라는 동안은 사취 끝까지, 막힌 뒤에는 사주 앞까지 그린다.
    const { front, sea } = model, stable = model.clock >= RISE[1] || model.options.rise === 'no';
    let n = 0;
    if (stable) {
      const left = model.hasBay && !model.spit.closed ? model.spit.tip + 4 : 12;
      for (let i = N - 14; i >= left && n < ARROWS; i -= 16) {
        const inMouth = model.hasBay && i > MOUTH.x0 && i < MOUTH.x1, row = inMouth ? barRow(i) + BAR.half + 3 : front[i] + 3;
        scl.makeScale(4, 1, 2.4);
        m4.makeRotationY(Math.PI).multiply(scl);
        m4.setPosition(i - CENTER, sea + 0.15, row - CENTER);
        arrows.setMatrixAt(n++, m4);
      }
    }
    hide(arrows, n, ARROWS);
    // 바닷바람: 해안사구가 자라기 시작하면 사빈 위에서 육지 쪽으로 분다.
    let w = 0;
    if (stable && model.clock > (model.options.rise === 'no' ? 8 : RISE[1] + 6)) {
      for (let s = 0; s < WINDS; s++) {
        const i = 30 + s * 33, row = (model.hasBay && i > MOUTH.x0 && i < MOUTH.x1 ? barRow(i) : front[i]) + 2;
        scl.makeScale(3, 1, 1.8);
        m4.makeRotationY(Math.PI / 2).multiply(scl);
        m4.setPosition(i - CENTER, Math.max(model.sample(i, row - 2), sea) + 1.4, row - CENTER);
        winds.setMatrixAt(w++, m4);
      }
    }
    hide(winds, w, WINDS);
    const FLY = 2.4;
    for (let t = 0; t < model.TRAILS; t++) {
      const L = model.trailLen[t], age = model.trailAge[t];
      if (L < 2 || age > FLY) { m4.makeScale(0, 0, 0); grains.setMatrixAt(t, m4); continue; }
      const f = clamp(age / FLY) * (L - 1), a = Math.floor(f), b = Math.min(L - 1, a + 1), u = f - a, at = t * model.TRAIL_PTS;
      const x = model.trailX[at + a] + (model.trailX[at + b] - model.trailX[at + a]) * u, y = model.trailY[at + a] + (model.trailY[at + b] - model.trailY[at + a]) * u;
      m4.makeScale(1.1, 1.1 / VE, 1.1);
      m4.setPosition(x - CENTER, sea + 0.2, y - CENTER);
      grains.setMatrixAt(t, m4);
    }
    grains.instanceMatrix.needsUpdate = true;
  }

  return { group, terrain, syncTerrain, syncFlow, syncWaves, arrowCount: ARROWS, crests };
}
