// © 2026 김용현
// 곶과 만 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다. 계산은 하지 않고 model의 값을 그대로 그린다.
import * as THREE from 'three';
import { N, SEA, RAYS, RAY_STEPS, HEAD_X, BAY_X, ARCH, currentDir, sectionLine as sectionXY } from './model.js';
import { gridIndex } from '../../shared/grid.js';

const CENTER = N / 2;
export const BOTTOM = -8;
export const VE = 1.5; // 그림에서 높이를 조금 키우는 배율. 계산 값은 그대로다.
const SHEET = 128, CREST_GAP = 13, CRESTS = Math.floor(RAY_STEPS / CREST_GAP) - 1, ARROWS = 12;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function createBlock(model) {
  const group = new THREE.Group();
  group.scale.y = VE;
  const linear = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const FOREST = linear('#46603a'), FOREST2 = linear('#5a7346'), GRASS = linear('#8ea765'), SAND = linear('#e6cf90'), ROCK = linear('#6f665a'), CLIFF = linear('#8a7f70'), PLATFORM = linear('#7d7566'), BED = linear('#c4b48e'), DEEP = linear('#1f3442'), HARD = linear('#4f4a44'), JOINT = linear('#17140f'), DARK = linear('#0e1112');

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

  // 블록 옆면
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
  const skirt = new THREE.Mesh(skirtGeo, new THREE.MeshBasicMaterial({ color: 0x4d463d, side: THREE.DoubleSide }));
  skirt.frustumCulled = false;
  group.add(skirt);
  // 옆면의 물: 바닥에서 수면까지. 블록 옆에서도 곶 앞과 만 앞의 수심 차이가 보인다.
  const waterSidePos = new Float32Array(skirtPts.length * 6), waterSideGeo = new THREE.BufferGeometry();
  waterSideGeo.setAttribute('position', new THREE.BufferAttribute(waterSidePos, 3));
  waterSideGeo.setIndex(skirtGeo.index);
  const waterSide = new THREE.Mesh(waterSideGeo, new THREE.MeshBasicMaterial({ color: 0x2f86c9, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  waterSide.frustumCulled = false;
  waterSide.renderOrder = 1;
  group.add(waterSide);

  // 바다: 땅이 수면보다 높으면 땅에 가려 물가가 저절로 생긴다. 얕은 곳은 밝게 칠한다.
  const SN = SHEET, step = (N - 1) / (SN - 1);
  const sPos = new Float32Array(SN * SN * 3), sCol = new Float32Array(SN * SN * 4), sNor = new Float32Array(SN * SN * 3);
  for (let j = 0; j < SN; j++) for (let i = 0; i < SN; i++) {
    const k = j * SN + i;
    sPos[k * 3] = i * step - CENTER; sPos[k * 3 + 1] = SEA; sPos[k * 3 + 2] = j * step - CENTER; sNor[k * 3 + 1] = 1;
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

  // 파봉선과 진행 방향선. 계산한 방향선의 같은 시각 점을 이으면 파봉선이 된다.
  const crestPos = new Float32Array((RAYS - 1) * CRESTS * 2 * 3);
  const crestGeo = new THREE.BufferGeometry();
  crestGeo.setAttribute('position', new THREE.BufferAttribute(crestPos, 3));
  const crests = new THREE.LineSegments(crestGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }));
  crests.frustumCulled = false; crests.renderOrder = 3;
  group.add(crests);
  const RAY_SHOWN = Math.ceil(RAYS / 5);
  const rayPos = new Float32Array(RAY_SHOWN * RAY_STEPS * 2 * 3);
  const rayGeo = new THREE.BufferGeometry();
  rayGeo.setAttribute('position', new THREE.BufferAttribute(rayPos, 3));
  const rays = new THREE.LineSegments(rayGeo, new THREE.LineBasicMaterial({ color: 0xffc23d, toneMapped: false }));
  rays.frustumCulled = false; rays.renderOrder = 3;
  group.add(rays);

  // 연안류 화살표
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(1, 0); arrowShape.lineTo(-1, 1); arrowShape.lineTo(-0.35, 0); arrowShape.lineTo(-1, -1); arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  arrowGeo.rotateX(-Math.PI / 2);
  const arrows = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xffd36b, side: THREE.DoubleSide }), ARROWS);
  arrows.frustumCulled = false; arrows.renderOrder = 4;
  group.add(arrows);
  const m4 = new THREE.Matrix4(), scl = new THREE.Matrix4();

  const grains = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0x4a3a10, roughness: 0.7 }), model.TRAILS);
  grains.frustumCulled = false;
  group.add(grains);

  // 수심을 비교하는 줄: 먼바다에서 같은 거리에 있는 곶 앞과 만 앞을 잇는다.
  const depthLineGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const depthLine = new THREE.Line(depthLineGeo, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 3, gapSize: 2.4 }));
  depthLine.frustumCulled = false; depthLine.renderOrder = 3;
  group.add(depthLine);

  // 굴 위의 천장. 높이 격자는 천장을 그릴 수 없으므로 따로 만든다. 윗면은 바위 높이, 아랫면은 활 모양이다.
  const roofGeo = new THREE.BufferGeometry();
  const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }));
  roof.castShadow = roof.receiveShadow = true;
  roof.frustumCulled = false;
  group.add(roof);
  const caveArrows = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), 2);
  caveArrows.frustumCulled = false; caveArrows.renderOrder = 4;
  group.add(caveArrows);
  const hideCaveArrows = () => { m4.makeScale(0, 0, 0); caveArrows.setMatrixAt(0, m4); caveArrows.setMatrixAt(1, m4); caveArrows.instanceMatrix.needsUpdate = true; };
  hideCaveArrows();
  let roofKey = '';
  function syncRoof() {
    const a = model.arch, key = `${a.caveL},${a.collapsed}`;
    if (key === roofKey) return;
    roofKey = key;
    const tris = [], norm = [], cols = [];
    const jA = ARCH.j0 - 1, jB = ARCH.j1 + 1, mid = (jA + jB) / 2, span = (jB - jA) / 2, STEPS = 18;
    // 처음에는 해식애에 뚫린 작은 입구이고, 굴이 깊어질수록 입구가 넓고 높아진다.
    const grow = 0.42 + 0.58 * Math.min(1, a.caveL / (ARCH.x1 - ARCH.x0 + 1));
    const under = j => { const t = (j - mid) / (span * grow), q = 1 - t * t; return SEA - 0.3 + (ARCH.crown * grow + 0.3) * Math.sqrt(q < 0 ? 0 : q); };
    const top = j => model.sample(ARCH.cx, jA) + (model.sample(ARCH.cx, jB) - model.sample(ARCH.cx, jA)) * ((j - jA) / (jB - jA));
    const quad = (color, p, q, r, s) => {
      tris.push(...p, ...q, ...r, ...p, ...r, ...s);
      for (let n = 0; n < 6; n++) cols.push(...color);
      const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      for (let n = 0; n < 6; n++) norm.push(nx, ny, nz);
    };
    const P = (x, y, j) => [x - CENTER, y, j - CENTER];
    const pad = 0.15, spans = [];
    if (!a.collapsed) {
      if (a.through) spans.push([ARCH.x0 - pad, ARCH.x1 + pad, true, true]);
      else if (a.caveL) spans.push([ARCH.x0 - pad, ARCH.x0 + a.caveL, true, false]);
    }
    for (const [xa, xb, openA, openB] of spans) for (let n = 0; n < STEPS; n++) {
      const j0 = jA + ((jB - jA) * n) / STEPS, j1 = jA + ((jB - jA) * (n + 1)) / STEPS;
      // 천장 윗면은 둘레 바위와 같은 색이고, 가운데에 절리가 지나간다.
      const onJoint = j0 <= mid && j1 > mid;
      quad(onJoint ? JOINT : HARD, P(xa, top(j0), j0), P(xa, top(j1), j1), P(xb, top(j1), j1), P(xb, top(j0), j0));
      quad(a.through ? HARD : DARK, P(xa, under(j0), j0), P(xb, under(j0), j0), P(xb, under(j1), j1), P(xa, under(j1), j1));
      // 옆면에서 보이는 입구의 윗부분
      if (openA) quad(HARD, P(xa, under(j0), j0), P(xa, under(j1), j1), P(xa, top(j1), j1), P(xa, top(j0), j0));
      if (openB) quad(HARD, P(xb, under(j0), j0), P(xb, top(j0), j0), P(xb, top(j1), j1), P(xb, under(j1), j1));
      // 아직 뚫리지 않은 굴의 안쪽 끝은 빛이 닿지 않아 어둡다.
      if (!openB) quad(DARK, P(xb, SEA - 0.3, j0), P(xb, under(j0), j0), P(xb, under(j1), j1), P(xb, SEA - 0.3, j1));
    }
    roofGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tris), 3));
    roofGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(norm), 3));
    roofGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols), 3));
    roof.visible = tris.length > 0;
    // 굴을 파는 동안 옆면으로 들어가는 파랑을 화살표로 보여 준다.
    if (a.through || a.collapsed) hideCaveArrows();
    else {
      const z = mid - CENTER;
      scl.makeScale(5, 1, 3.2);
      m4.copy(scl); m4.setPosition(ARCH.x0 - 8 - CENTER, SEA + 0.2, z); caveArrows.setMatrixAt(0, m4);
      caveArrows.instanceMatrix.needsUpdate = true;
    }
  }

  // 단면 위치
  const lineGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(120 * 3), 3));
  const sectionLine = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: 0xffd36b, dashSize: 3, gapSize: 2.4 }));
  sectionLine.frustumCulled = false;
  const lineDist = new Float32Array(120), lineDistAttr = new THREE.BufferAttribute(lineDist, 1);
  lineGeo.setAttribute('lineDistance', lineDistAttr);
  group.add(sectionLine);

  function paint(k) {
    const { h, sand, cutAt, isStackRock, stackMark } = model, i = k % N, j = (k / N) | 0;
    pos[k * 3 + 1] = h[k];
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const dhx = h[ir] - h[il], dhz = h[jr] - h[jl], dx = dhx * 0.5 * VE, dz = dhz * 0.5 * VE, len = Math.hypot(dx, 1, dz);
    nor[k * 3] = -dx / len; nor[k * 3 + 1] = 1 / len; nor[k * 3 + 2] = -dz / len;
    const slope = Math.hypot(dhx, dhz) / 2;
    for (let q = 0; q < 3; q++) {
      let v;
      if (h[k] >= SEA) {
        v = GRASS[q] + (FOREST[q] - GRASS[q]) * smooth(0.5, 3, h[k]);
        v += (FOREST2[q] - v) * patch[k] * 0.4;
        // 가파른 비탈은 바위가 드러난다. 곧 깎일 물가의 비탈이 해식애다.
        v += (CLIFF[q] - v) * smooth(0.5, 1.4, slope);
        if (isStackRock[k] || stackMark[k]) v = HARD[q];
        if (sand[k] > 0.02) v = SAND[q];
        // 절리: 둘레 바위에 난 검은 줄. 해식 동굴이 이 줄을 따라 파인다.
        if (model.fin[k] && !model.arch.collapsed && j === ((ARCH.j0 + ARCH.j1) >> 1)) v = JOINT[q];
      } else if (sand[k] > 0.02) v = SAND[q] * 0.85 + BED[q] * 0.15;
      else if (model.caved[k] && !model.arch.through) v = DARK[q];
      // 좁은 곶의 발치: 옆면이 물속 바닥색으로 번지지 않아 시 아치와 둘레 절벽의 색이 같아진다.
      else if (i >= ARCH.x0 - 2 && i <= ARCH.x1 + 2 && j >= ARCH.base && j <= ARCH.tip + 2 && !(i >= ARCH.x0 && i <= ARCH.x1 && j >= ARCH.j0 && j <= ARCH.j1)) v = HARD[q];
      else if (cutAt[k] > 0) v = PLATFORM[q];
      else v = BED[q] + (DEEP[q] - BED[q]) * smooth(0.3, 4, -h[k]);
      col[k * 3 + q] = v * speckle[k];
    }
  }

  function syncSheet() {
    const { h } = model;
    for (let j = 0; j < SN; j++) for (let i = 0; i < SN; i++) {
      const k = j * SN + i, c = Math.min(N - 1, Math.round(j * step)) * N + Math.min(N - 1, Math.round(i * step)), d = SEA - h[c];
      const a = smooth(0, 1.4, d), b = smooth(1.2, 5, d);
      for (let q = 0; q < 3; q++) { let v = SHALLOW[q] + (CLEAN[q] - SHALLOW[q]) * a; v += (DEEPW[q] - v) * b; sCol[k * 4 + q] = v; }
      // 물이 투명해 바닥이 비친다. 깊을수록 물이 두꺼워 바닥이 어두워진다.
      sCol[k * 4 + 3] = 0.12 + 0.2 * a + 0.34 * b;
    }
    sGeo.attributes.color.needsUpdate = true;
    const lp = rayGeo.attributes.position; let n = 0;
    for (let r = 2; r < RAYS; r += 5) {
      const base = r * RAY_STEPS, L = model.rayLen[r];
      for (let s = 0; s < L - 1 && n < rayPos.length / 3 - 1; s += 1) {
        rayPos[n * 3] = model.rayX[base + s] - CENTER; rayPos[n * 3 + 1] = SEA + 0.09; rayPos[n * 3 + 2] = model.rayY[base + s] - CENTER; n++;
        rayPos[n * 3] = model.rayX[base + s + 1] - CENTER; rayPos[n * 3 + 1] = SEA + 0.09; rayPos[n * 3 + 2] = model.rayY[base + s + 1] - CENTER; n++;
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
        waterSidePos.set([x, SEA, z, x, Math.min(top, SEA), z], s * 6);
      });
      skirtGeo.attributes.position.needsUpdate = true;
      waterSideGeo.attributes.position.needsUpdate = true;
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
    syncSheet();
    syncSectionLine();
    syncRoof();
    const dl = depthLineGeo.attributes.position, row = model.depthRow() - CENTER;
    dl.setXYZ(0, HEAD_X[0] - CENTER, SEA + 0.1, row); dl.setXYZ(1, BAY_X - CENTER, SEA + 0.1, row); dl.needsUpdate = true;
    depthLine.computeLineDistances();
  }

  function syncSectionLine() {
    const lp = lineGeo.attributes.position, S = sectionXY();
    for (let t = 0; t < 120; t++) {
      const f = t / 119, x = S.ax + (S.bx - S.ax) * f, y = S.ay + (S.by - S.ay) * f;
      lp.setXYZ(t, x - CENTER, Math.max(model.sample(x, y), SEA) + 0.25, y - CENTER);
    }
    lp.needsUpdate = true;
    lineDist[0] = 0;
    for (let t = 1; t < 120; t++) lineDist[t] = lineDist[t - 1] + Math.hypot((lp.getY(t) - lp.getY(t - 1)) * VE, lp.getZ(t) - lp.getZ(t - 1));
    lineDistAttr.needsUpdate = true;
  }

  // 파봉선을 옮긴다. phase는 0에서 1까지 돈다.
  function syncWaves(phase) {
    const lp = crestGeo.attributes.position, gap = CREST_GAP;
    let n = 0;
    for (let c = 0; c < CRESTS; c++) {
      const at = (c + phase) * gap, a = Math.floor(at), u = at - a;
      for (let r = 0; r < RAYS - 1; r++) {
        const L0 = model.rayLen[r], L1 = model.rayLen[r + 1];
        if (a + 1 >= L0 || a + 1 >= L1) continue;
        const p = r * RAY_STEPS + a, q = (r + 1) * RAY_STEPS + a;
        crestPos[n * 3] = model.rayX[p] + (model.rayX[p + 1] - model.rayX[p]) * u - CENTER; crestPos[n * 3 + 1] = SEA + 0.12; crestPos[n * 3 + 2] = model.rayY[p] + (model.rayY[p + 1] - model.rayY[p]) * u - CENTER; n++;
        crestPos[n * 3] = model.rayX[q] + (model.rayX[q + 1] - model.rayX[q]) * u - CENTER; crestPos[n * 3 + 1] = SEA + 0.12; crestPos[n * 3 + 2] = model.rayY[q] + (model.rayY[q + 1] - model.rayY[q]) * u - CENTER; n++;
      }
    }
    crestGeo.setDrawRange(0, n);
    lp.needsUpdate = true;
  }

  function syncFlow() {
    // 연안류 화살표: 파랑 에너지가 센 쪽에서 약한 쪽으로, 해안선을 따라 그린다.
    let n = 0;
    const { front } = model;
    // 방향은 해안 모양에서 정한다. 곶에서 만 쪽으로 간다. 곶과 만의 에너지 차이가 거의 없어지면 그리지 않는다.
    const strong = model.headEnergy() > model.bayEnergy() * 1.3;
    for (let i = 14; strong && i < N - 14 && n < ARROWS; i += 15) {
      const dir = currentDir(i);
      if (!dir) continue;
      const a = front[i + dir * 6], b = front[i], ax = dir * 6, ay = a - b;
      scl.makeScale(4, 1, 2.4);
      m4.makeRotationY(-Math.atan2(ay, ax)).multiply(scl);
      m4.setPosition(i - CENTER, SEA + 0.15, b + 7 - CENTER);
      arrows.setMatrixAt(n++, m4);
    }
    for (let q = n; q < ARROWS; q++) { m4.makeScale(0, 0, 0); arrows.setMatrixAt(q, m4); }
    arrows.instanceMatrix.needsUpdate = true;
    const FLY = 2.4;
    for (let t = 0; t < model.TRAILS; t++) {
      const L = model.trailLen[t], age = model.trailAge[t];
      if (L < 2 || age > FLY) { m4.makeScale(0, 0, 0); grains.setMatrixAt(t, m4); continue; }
      const f = clamp(age / FLY) * (L - 1), a = Math.floor(f), b = Math.min(L - 1, a + 1), u = f - a, at = t * model.TRAIL_PTS;
      const x = model.trailX[at + a] + (model.trailX[at + b] - model.trailX[at + a]) * u, y = model.trailY[at + a] + (model.trailY[at + b] - model.trailY[at + a]) * u;
      m4.makeScale(1.1, 1.1 / VE, 1.1);
      m4.setPosition(x - CENTER, SEA + 0.2, y - CENTER);
      grains.setMatrixAt(t, m4);
    }
    grains.instanceMatrix.needsUpdate = true;
  }

  return { group, terrain, syncTerrain, syncFlow, syncWaves, arrowCount: ARROWS, crests };
}
