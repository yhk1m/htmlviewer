// © 2026 김용현
// 삼각주 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다. 계산은 하지 않고 model의 값을 그대로 그린다.
import * as THREE from 'three';
import { N, COAST, WET, MID, sectionProfile } from './model.js';
import { gridIndex } from '../../shared/grid.js';

const CENTER = N / 2;
export const BOTTOM = -6;
export const VE = 3; // 그림에서 높이를 더 키우는 배율. 낮은 평원이 보이게 한다. 계산 값은 그대로다.
const ARROWS = 12, SHEET = 128;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function createBlock(model) {
  const group = new THREE.Group();
  group.scale.y = VE;
  const linear = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const GRASS = linear('#8ea765'), GRASS2 = linear('#a3b274'), FOREST = linear('#46603a'), FOREST2 = linear('#5a7346'), SAND = linear('#e6cf90'), MUD = linear('#6d5a48'), FIELD = linear('#a9b56c'), FLAT = linear('#94856a'), BED = linear('#8c8069'), DEEP = linear('#3a4f5c');

  const pos = new Float32Array(N * N * 3), nor = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3), speckle = new Float32Array(N * N), patch = new Float32Array(N * N);
  {
    let seed = 5;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      pos[k * 3] = i - CENTER; pos[k * 3 + 2] = j - CENTER;
      speckle[k] = 0.95 + r() * 0.1;
      patch[k] = Math.sin(i * 0.1 + 1) * Math.sin(j * 0.09) * 0.5 + 0.5;
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

  // 물: 강에서 바다까지 이어진 한 장. 땅이 그보다 높으면 땅에 가려 물가가 저절로 생긴다. 칸마다 깊이와 흙탕 정도로 색을 정한다.
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
  const CLEAN = linear('#2f86c9'), SHALLOW = linear('#59b7d8'), DEEPW = linear('#1d5c94'), BROWN = linear('#9c7e52');

  // 하굿둑
  const dam = new THREE.Group();
  {
    const row = model.damRow, mat = new THREE.MeshStandardMaterial({ color: 0xb8b6aa, roughness: 0.7 }), gate = new THREE.MeshStandardMaterial({ color: 0x57616a, roughness: 0.5 });
    // 강을 가로지르는 둑이다. 양쪽 끝은 강둑 땅에 얹힌다.
    const rx = Math.round(model.riverX(row)), a = rx - 24, b = rx + 24;
    const body = new THREE.Mesh(new THREE.BoxGeometry(b - a, 1.3, 3), mat);
    body.position.set((a + b) / 2 - CENTER, 0.5, row - CENTER);
    dam.add(body);
    for (let g = -3; g <= 3; g++) { const m2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.5, 3.4), gate); m2.position.set(model.riverX(row) + g * 4 - CENTER, 0.55, row - CENTER); dam.add(m2); }
    dam.traverse(o => { o.castShadow = true; });
    dam.visible = false;
    group.add(dam);
  }

  // 물 흐름 화살표
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(1, 0); arrowShape.lineTo(-1, 1); arrowShape.lineTo(-0.35, 0); arrowShape.lineTo(-1, -1); arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  arrowGeo.rotateX(-Math.PI / 2);
  const arrows = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xf2fbff, side: THREE.DoubleSide }), ARROWS);
  arrows.frustumCulled = false;
  group.add(arrows);
  const m4 = new THREE.Matrix4(), scl = new THREE.Matrix4();
  // 조류 방향: 밀물이면 육지 쪽으로, 썰물이면 바다 쪽으로 향한다.
  const TIDE_ARROWS = 5;
  const tideArrows = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xffdca6, side: THREE.DoubleSide }), TIDE_ARROWS);
  tideArrows.frustumCulled = false;
  group.add(tideArrows);

  // 강이 실어 나르는 알갱이. 물길을 따라 내려와 모래는 하구 앞에, 진흙은 멀리 내려앉는다. 실제보다 크게 그린다.
  const grains = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.7 }), model.TRAILS);
  grains.frustumCulled = false;
  const SAND_G = new THREE.Color('#ffe08a'), MUD_G = new THREE.Color('#4a2c17');
  for (let t = 0; t < model.TRAILS; t++) grains.setColorAt(t, SAND_G);
  group.add(grains);

  // 단면 위치
  const lineGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(120 * 3), 3));
  const sectionLine = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: 0xffd36b, dashSize: 3, gapSize: 2.4 }));
  sectionLine.frustumCulled = false;
  const lineDist = new Float32Array(120), lineDistAttr = new THREE.BufferAttribute(lineDist, 1);
  lineGeo.setAttribute('lineDistance', lineDistAttr);
  group.add(sectionLine);

  function paint(k) {
    const { h, hill, sand, mud, landAt, chan, base } = model, i = k % N, j = (k / N) | 0;
    pos[k * 3 + 1] = h[k];
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const dx = (h[ir] - h[il]) * 0.5 * VE, dz = (h[jr] - h[jl]) * 0.5 * VE, len = Math.hypot(dx, 1, dz);
    nor[k * 3] = -dx / len; nor[k * 3 + 1] = 1 / len; nor[k * 3 + 2] = -dz / len;
    const laid = sand[k] + mud[k], fine = laid > 0 ? mud[k] / laid : 0, under = h[k] < WET;
    const age = landAt[k] > 0 ? model.clock - landAt[k] : 0;
    for (let q = 0; q < 3; q++) {
      let v = GRASS[q] + (GRASS2[q] - GRASS[q]) * patch[k];
      if (hill[k] > 0) { const f = FOREST[q] + (FOREST2[q] - FOREST[q]) * patch[k]; v += (f - v) * hill[k]; }
      if (under) {
        // 바닥: 처음 바닥에서 쌓인 흙의 색으로 간다. 깊은 곳은 어둡다.
        const bed = BED[q] + (DEEP[q] - BED[q]) * smooth(0.3, 3, -h[k]), dep = SAND[q] + (MUD[q] - SAND[q]) * smooth(0.2, 0.7, fine);
        v = bed + (dep - bed) * smooth(0.02, 0.2, laid);
        // 썰물 때 드러나는 얕은 곳의 고운 흙(갯벌)은 젖은 흙색으로 칠한다.
        if (fine > 0.8 && h[k] > -0.5) v += (FLAT[q] - v) * smooth(-0.5, -0.2, h[k]);
      } else if (base[k] <= WET) {
        // 새 땅: 갓 드러나면 모래와 진흙 색이고, 시간이 지나면 풀과 논밭이 덮는다. 물길 옆 모래땅은 오래 밝다.
        const dep = SAND[q] + (MUD[q] - SAND[q]) * smooth(0.25, 0.8, fine), cover = smooth(3, 22, age);
        const crop = FIELD[q] + (GRASS[q] - FIELD[q]) * patch[k];
        v = dep + (crop - dep) * cover * (0.86 - 0.3 * (1 - fine));
      }
      if (chan[k] > 0 && under) v = BED[q];
      col[k * 3 + q] = v * speckle[k];
    }
  }

  function syncSheet() {
    const { h, turb, levelAt, seaNow } = model;
    for (let j = 0; j < SN; j++) {
      const gj = Math.min(N - 1, Math.round(j * step)), y = levelAt(gj) + seaNow * smooth(COAST - 34, COAST - 14, gj);
      for (let i = 0; i < SN; i++) {
        const k = j * SN + i, c = gj * N + Math.min(N - 1, Math.round(i * step));
        sPos[k * 3 + 1] = y;
        const d = y - h[c], t = clamp(turb[c]);
        const shallow = smooth(0, 1.2, d), deep = smooth(1, 3.4, d);
        for (let q = 0; q < 3; q++) {
          let v = SHALLOW[q] + (CLEAN[q] - SHALLOW[q]) * shallow;
          v += (DEEPW[q] - v) * deep;
          v += (BROWN[q] - v) * t * 0.82;
          sCol[k * 4 + q] = v;
        }
        sCol[k * 4 + 3] = 0.6 + 0.3 * shallow + 0.08 * deep;
      }
    }
    sGeo.attributes.position.needsUpdate = true;
    sGeo.attributes.color.needsUpdate = true;
    dam.visible = model.damUp;
  }

  let fullDone = false;
  function syncTerrain(full) {
    if (full || model.allDirty || !fullDone) {
      for (let k = 0; k < N * N; k++) paint(k);
      skirtPts.forEach(([i, j], s) => { const x = i - CENTER, z = j - CENTER; skirtPos.set([x, model.h[j * N + i], z, x, BOTTOM, z], s * 6); });
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
    syncSheet();
    syncSectionLine();
  }

  function syncSectionLine() {
    const lp = lineGeo.attributes.position, sec = sectionProfile(model, 120);
    for (let t = 0; t < 120; t++) {
      const j = sec.ys[t], x = sec.xs[t];
      lp.setXYZ(t, x - CENTER, Math.max(model.sample(x, j), model.levelAt(Math.round(j))) + 0.2, j - CENTER);
    }
    lp.needsUpdate = true;
    lineDist[0] = 0;
    for (let t = 1; t < 120; t++) lineDist[t] = lineDist[t - 1] + Math.hypot((lp.getY(t) - lp.getY(t - 1)) * VE, lp.getZ(t) - lp.getZ(t - 1));
    lineDistAttr.needsUpdate = true;
  }

  function syncFlow() {
    const { tips, levelAt } = model, live = tips.filter(t => t.alive), trunk = live.length ? live.reduce((a, t) => (t.flow > a.flow ? t : a)) : null;
    let n = 0;
    const put = (x, y, ax, ay, size) => {
      if (n >= ARROWS) return;
      scl.makeScale(size, 1, size * 0.6);
      m4.makeRotationY(-Math.atan2(ay, ax)).multiply(scl);
      m4.setPosition(x - CENTER, levelAt(Math.round(y)) + 0.08, y - CENTER);
      arrows.setMatrixAt(n++, m4);
    };
    if (trunk) {
      const P = trunk.path;
      for (const f of [0.1, 0.32, 0.5]) { const a = Math.floor(P.length * f), b = Math.min(P.length - 1, a + 1); put(P[a][0], P[a][1], P[b][0] - P[a][0], P[b][1] - P[a][1], 3.2); }
    }
    for (const t of live) {
      const P = t.path;
      if (P.length < 3) continue;
      const a = P[P.length - 2], b = P[P.length - 1];
      put(b[0], b[1], b[0] - a[0], b[1] - a[1], 2.4);
    }
    for (let q = n; q < ARROWS; q++) { m4.makeScale(0, 0, 0); arrows.setMatrixAt(q, m4); }
    arrows.instanceMatrix.needsUpdate = true;
    const showTide = model.options.tide !== 'low' && !model.finished, up = model.tideRising();
    for (let q = 0; q < TIDE_ARROWS; q++) {
      scl.makeScale(showTide ? 7 : 0, 1, showTide ? 4.4 : 0);
      m4.makeRotationY(up ? Math.PI / 2 : -Math.PI / 2).multiply(scl);
      m4.setPosition(N * (0.14 + q * 0.18) - CENTER, model.seaNow + 0.1, N - 30 - CENTER);
      tideArrows.setMatrixAt(q, m4);
    }
    tideArrows.instanceMatrix.needsUpdate = true;
    const FLY = 2.2, REST = 1.2;
    for (let t = 0; t < model.TRAILS; t++) {
      const L = model.trailLen[t], age = model.trailAge[t];
      if (L < 2 || age > FLY + REST) { m4.makeScale(0, 0, 0); grains.setMatrixAt(t, m4); continue; }
      const f = clamp(age / FLY) * (L - 1), a = Math.floor(f), b = Math.min(L - 1, a + 1), u = f - a, at = t * model.TRAIL_PTS;
      const x = model.trailX[at + a] + (model.trailX[at + b] - model.trailX[at + a]) * u, y = model.trailY[at + a] + (model.trailY[at + b] - model.trailY[at + a]) * u;
      const kind = model.trailKind[t], r = kind === 1 ? 1.1 : 0.8, settled = age >= FLY;
      m4.makeScale(r, r / VE, r);
      m4.setPosition(x - CENTER, (settled ? model.sample(x, y) + 0.04 : Math.max(model.sample(x, y), model.levelAt(Math.round(y))) + 0.12), y - CENTER);
      grains.setMatrixAt(t, m4);
      grains.setColorAt(t, kind === 1 ? SAND_G : MUD_G);
    }
    grains.instanceMatrix.needsUpdate = true;
    if (grains.instanceColor) grains.instanceColor.needsUpdate = true;
  }

  return { group, terrain, syncTerrain, syncFlow, syncSheet, arrowCount: ARROWS };
}
