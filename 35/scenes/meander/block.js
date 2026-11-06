// © 2026 김용현
// 자유 곡류 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다. 계산은 하지 않고 model의 값을 그대로 그린다.
import * as THREE from 'three';
import { N, sectionProfile } from './model.js';
import { gridIndex } from '../../shared/grid.js';

const CENTER = N / 2;
export const BOTTOM = -3;
export const VE = 2.2; // 그림에서 높이를 더 키우는 배율. 낮은 둑이 보이게 한다. 계산 값은 그대로다.
const FLOW_DOTS = 110, ARROWS = 9, MAX_RIVER = 1400, MAX_LAKE = 2400;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const edge = v => clamp(v, 0, N - 1);

function makeRibbon(max, material) {
  const pos = new Float32Array(max * 6), nor = new Float32Array(max * 6);
  for (let k = 0; k < max * 2; k++) nor[k * 3 + 1] = 1;
  const index = new Uint32Array((max - 1) * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  return { mesh, geo, pos, index, count: 0, tri: 0, begin() { this.count = 0; this.tri = 0; },
    add(ax, ay, az, bx, by, bz, link) {
      const c = this.count, o = c * 6;
      if (c >= max) return;
      pos[o] = ax; pos[o + 1] = ay; pos[o + 2] = az; pos[o + 3] = bx; pos[o + 4] = by; pos[o + 5] = bz;
      if (link && c > 0) { const a = (c - 1) * 2, t = this.tri; index[t] = a; index[t + 1] = a + 2; index[t + 2] = a + 1; index[t + 3] = a + 1; index[t + 4] = a + 2; index[t + 5] = a + 3; this.tri += 6; }
      this.count++;
    },
    end() { geo.attributes.position.needsUpdate = true; geo.index.needsUpdate = true; geo.setDrawRange(0, this.tri); } };
}

export function createBlock(model) {
  const group = new THREE.Group();
  group.scale.y = VE;
  const linear = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const GRASS = linear('#8ea765'), GRASS2 = linear('#a3b274'), FOREST = linear('#46603a'), FOREST2 = linear('#5a7346'), SAND = linear('#e6cf90'), BED = linear('#6f6757'), BANK = linear('#7c5c3f');
  const MARSH = linear('#5d7a4a'), OLD = linear('#76924f'), LEVEE = linear('#a9a79b'), DUG = linear('#7f7566'), LAKEBED = linear('#5b5a4a');

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

  // 물은 칸 무늬가 드러나지 않게 중심선을 따라 띠로 그린다. 둑보다 조금 넓어 가장자리는 둑에 가려진다.
  const river = makeRibbon(MAX_RIVER, new THREE.MeshStandardMaterial({ color: 0x2f86c9, roughness: 0.35, side: THREE.DoubleSide }));
  const lakes = makeRibbon(MAX_LAKE, new THREE.MeshStandardMaterial({ color: 0x3f8fb0, roughness: 0.3, side: THREE.DoubleSide }));
  const marshes = makeRibbon(MAX_LAKE, new THREE.MeshStandardMaterial({ color: 0x5f7f55, roughness: 0.6, side: THREE.DoubleSide }));
  group.add(river.mesh, lakes.mesh, marshes.mesh);

  // 물 흐름 점과 화살표
  const dotGeo = new THREE.IcosahedronGeometry(1, 0);
  const dots = new THREE.InstancedMesh(dotGeo, new THREE.MeshStandardMaterial({ color: 0xcfeeff, emissive: 0x1e6fa8, roughness: 0.3 }), FLOW_DOTS);
  dots.frustumCulled = false;
  group.add(dots);
  const dotS = new Float32Array(FLOW_DOTS), dotLat = new Float32Array(FLOW_DOTS);
  for (let d = 0; d < FLOW_DOTS; d++) { dotS[d] = d / FLOW_DOTS; dotLat[d] = Math.sin(d * 12.9) * 0.78; }
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(1, 0); arrowShape.lineTo(-1, 1); arrowShape.lineTo(-0.35, 0); arrowShape.lineTo(-1, -1); arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  arrowGeo.rotateX(-Math.PI / 2);
  const arrows = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xf2fbff, side: THREE.DoubleSide }), ARROWS);
  arrows.frustumCulled = false;
  group.add(arrows);
  const m4 = new THREE.Matrix4(), scl = new THREE.Matrix4();

  // 깎인 둑에서 다음 굽이 안쪽으로 옮겨 가는 모래 알갱이. 실제보다 크게 그린다.
  const grains = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xffe08a, roughness: 0.7, emissive: 0x4a3a10 }), model.PARTICLES);
  grains.frustumCulled = false;
  group.add(grains);

  // 단면을 자른 위치
  const SECTION_POINTS = 60;
  const sectionLine = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(SECTION_POINTS * 3), 3)), new THREE.LineDashedMaterial({ color: 0xffd36b, dashSize: 2.4, gapSize: 1.8 }));
  sectionLine.frustumCulled = false;
  const lineDist = new Float32Array(SECTION_POINTS), lineDistAttr = new THREE.BufferAttribute(lineDist, 1);
  sectionLine.geometry.setAttribute('lineDistance', lineDistAttr);
  group.add(sectionLine);

  function paint(k) {
    const { h, hill, inCh, lakeOf, barAt, levee, side, skew, dug } = model, i = k % N, j = (k / N) | 0;
    pos[k * 3 + 1] = h[k];
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const dx = (h[ir] - h[il]) * 0.5 * VE, dz = (h[jr] - h[jl]) * 0.5 * VE, len = Math.hypot(dx, 1, dz);
    nor[k * 3] = -dx / len; nor[k * 3 + 1] = 1 / len; nor[k * 3 + 2] = -dz / len;
    const slope = Math.hypot(h[ir] - h[il], h[jr] - h[jl]) / 2;
    const age = barAt[k] > 0 ? model.clock - barAt[k] : 0;
    const lk = lakeOf[k] ? model.lakes[lakeOf[k] - 1] : null;
    for (let q = 0; q < 3; q++) {
      let v = GRASS[q] + (GRASS2[q] - GRASS[q]) * patch[k];
      if (hill[k] > 0) { const f = FOREST[q] + (FOREST2[q] - FOREST[q]) * patch[k]; v += (f - v) * hill[k]; }
      if (barAt[k] > 0) {
        // 갓 쌓인 모래는 밝고, 시간이 지나면 풀이 덮여 들판 색에 가까워진다. 능선은 풀이 덜 덮여 밝게 남는다.
        const ridge = smooth(-0.2, 0.06, model.ground[k] - model.plain[k]);
        const cover = smooth(4, 34, age) * (0.72 + 0.28 * (1 - ridge));
        v = SAND[q] + (v - SAND[q]) * cover;
      }
      if (lk) {
        // 호수 바닥에서 습지를 지나 옛 물길 색으로 간다.
        // 물이 닿지 않는 얕은 칸(호수 양 끝과 가장자리)은 막아 선 모래다.
        const bed = SAND[q] + (LAKEBED[q] - SAND[q]) * smooth(0.45, 0.8, model.lakeDepth[k]);
        const a = bed + (MARSH[q] - bed) * smooth(0.25, 0.65, lk.fill);
        v = a + (OLD[q] - a) * smooth(0.65, 1, lk.fill);
      }
      if (levee[k] > 0) v = LEVEE[q];
      if (dug[k]) v = DUG[q];
      if (inCh[k]) {
        // 물길 안: 바깥쪽은 어두운 바닥, 굽이 안쪽은 모래다.
        const inner = smooth(-0.25, -0.75, side[k]) * smooth(0.12, 0.5, skew[k]);
        v = BED[q] + (SAND[q] - BED[q]) * inner;
      }
      // 깎여 드러난 가파른 강둑
      if (!inCh[k] && hill[k] < 0.3 && !levee[k]) v += (BANK[q] - v) * smooth(0.38, 0.8, slope);
      col[k * 3 + q] = v * speckle[k];
    }
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
    syncWater();
    syncSectionLine();
  }

  function syncWater() {
    const { x, y, n } = model, w = model.W() * 1.04;
    river.begin();
    let link = false;
    for (let q = 0; q < n; q++) {
      const [tx, ty] = model.tangent(q), st = model.stageAt(q);
      const inside = x[q] > -3 && x[q] < N + 2;
      if (!inside) { link = false; continue; }
      const nx = -ty * w, ny = tx * w;
      river.add(edge(x[q] + nx) - CENTER, st, edge(y[q] + ny) - CENTER, edge(x[q] - nx) - CENTER, st, edge(y[q] - ny) - CENTER, link);
      link = true;
    }
    river.end();
    lakes.begin(); marshes.begin();
    for (const lake of model.lakes) {
      if (lake.fill >= 1) continue;
      const P = lake.nodes, c = P.length, target = lake.fill < 0.6 ? lakes : marshes;
      let on = false;
      for (let q = 0; q < c; q++) {
        const inBlock = P[q][0] > 1 && P[q][0] < N - 2 && P[q][1] > 1 && P[q][1] < N - 2;
        if (!lake.alive[q] || !inBlock) { on = false; continue; }
        const a = P[Math.max(0, q - 1)], b = P[Math.min(c - 1, q + 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1];
        const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        const half = model.lakeWidthAt(lake, q), nx = -ty * half, ny = tx * half, level = lake.level;
        target.add(edge(P[q][0] + nx) - CENTER, level, edge(P[q][1] + ny) - CENTER, edge(P[q][0] - nx) - CENTER, level, edge(P[q][1] - ny) - CENTER, on);
        on = true;
      }
    }
    lakes.end(); marshes.end();
  }

  function syncSectionLine() {
    const b = model.bend, lp = sectionLine.geometry.attributes.position;
    sectionLine.visible = !!b && (b.straight || b.strength > 0.14);
    if (!sectionLine.visible) return;
    const { top } = sectionProfile(model, SECTION_POINTS);
    for (let t = 0; t < SECTION_POINTS; t++) { const f = t / (SECTION_POINTS - 1); lp.setXYZ(t, b.ax + (b.bx - b.ax) * f - CENTER, top[t] + 0.3, b.ay + (b.by - b.ay) * f - CENTER); }
    lp.needsUpdate = true;
    lineDist[0] = 0;
    for (let t = 1; t < SECTION_POINTS; t++) lineDist[t] = lineDist[t - 1] + Math.hypot(lp.getX(t) - lp.getX(t - 1), (lp.getY(t) - lp.getY(t - 1)) * VE, lp.getZ(t) - lp.getZ(t - 1));
    lineDistAttr.needsUpdate = true;
  }

  // dt: 지난 화면 이후의 계산 시간. 멈춰 있으면 0이다. 바깥쪽 물방울이 안쪽보다 빠르다.
  function syncFlow(dt) {
    const { x, y, n, cv, arc } = model, total = arc[n - 1] || 1, W = model.W(), base = (18 * model.flowSpeed()) / total;
    let q = 0;
    const order = Array.from(dotS.keys()).sort((a, b) => dotS[a] - dotS[b]);
    for (const d of order) {
      const target = dotS[d] * total;
      while (q < n - 2 && arc[q + 1] < target) q++;
      const [tx, ty] = model.tangent(q), c = cv[q], outward = c > 0 ? -dotLat[d] : dotLat[d], bend = clamp(Math.abs(c) * W * 3);
      const speed = 1 + 0.7 * outward * bend;
      dotS[d] = (dotS[d] + dt * base * speed) % 1;
      const gx = x[q] - ty * dotLat[d] * W, gy = y[q] + tx * dotLat[d] * W;
      const inside = gx > 0 && gx < N - 1 && gy > 0 && gy < N - 1, len = 0.5 + 0.8 * speed;
      scl.makeScale(inside ? len : 0, inside ? 0.14 : 0, inside ? 0.34 : 0);
      m4.makeRotationY(-Math.atan2(ty, tx)).multiply(scl);
      m4.setPosition(gx - CENTER, model.stageAt(q) + 0.06, gy - CENTER);
      dots.setMatrixAt(d, m4);
    }
    dots.instanceMatrix.needsUpdate = true;
    for (let k = 0; k < ARROWS; k++) {
      const target = total * (0.08 + 0.84 * (k / (ARROWS - 1)));
      let z = 0;
      while (z < n - 2 && arc[z + 1] < target) z++;
      const [tx, ty] = model.tangent(z), inside = x[z] > 6 && x[z] < N - 6;
      scl.makeScale(inside ? 3.2 : 0, 1, inside ? 1.9 : 0);
      m4.makeRotationY(-Math.atan2(ty, tx)).multiply(scl);
      m4.setPosition(x[z] - CENTER, model.stageAt(z) + 0.1, y[z] - CENTER);
      arrows.setMatrixAt(k, m4);
    }
    arrows.instanceMatrix.needsUpdate = true;
    for (let p = 0; p < model.PARTICLES; p++) {
      const s = model.pState[p];
      if (s === 0) { m4.makeScale(0, 0, 0); grains.setMatrixAt(p, m4); continue; }
      const r = 1.05, gx = model.px[p], gy = model.py[p];
      m4.makeScale(r, (s === 2 ? 0.5 : 1) * r / VE, r);
      m4.setPosition(gx - CENTER, model.sample(gx, gy) + (s === 1 ? 0.75 : 0.05), gy - CENTER);
      grains.setMatrixAt(p, m4);
    }
    grains.instanceMatrix.needsUpdate = true;
  }

  return { group, terrain, syncTerrain, syncFlow, arrowCount: ARROWS };
}
