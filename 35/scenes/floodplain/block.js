// © 2026 김용현
// 범람원 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다. 계산은 하지 않고 model의 값을 그대로 그린다.
import * as THREE from 'three';
import { N, CHANNEL, sectionProfile } from './model.js';
import { gridIndex, fillNormals } from '../../shared/grid.js';

const CENTER = N / 2;
export const BOTTOM = -5;
export const VE = 1.8; // 그림에서 높이를 더 키우는 배율. 낮은 둑이 보이게 한다. 계산 값은 그대로다.
const FLOW_DOTS = 90;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function createBlock(model) {
  const group = new THREE.Group();
  group.scale.y = VE;
  const linear = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const GRASS = linear('#8ea765'), GRASS2 = linear('#a3b274'), FOREST = linear('#46603a'), FOREST2 = linear('#5a7346'), ROCK = linear('#6f665a');
  const SAND = linear('#e2cb8c'), MUD = linear('#6d5a48'), BED = linear('#7d7362');
  const FLOOD_C = linear('#8f6c45'), POND_C = linear('#4a93bb');

  const drawn = new Float32Array(N * N), soft = new Float32Array(N * N);
  const pos = new Float32Array(N * N * 3), nor = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3);
  const speckle = new Float32Array(N * N), patch = new Float32Array(N * N);
  {
    let seed = 5;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      pos[k * 3] = i - CENTER; pos[k * 3 + 2] = j - CENTER;
      speckle[k] = 0.94 + r() * 0.12;
      patch[k] = Math.sin(i * 0.13 + 1) * Math.sin(j * 0.11) * 0.5 + 0.5;
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

  // 넘친 물: 칸마다 수면 높이와 투명도를 그대로 그린다. 물이 없는 칸은 보이지 않는다.
  const wPos = new Float32Array(N * N * 3), wCol = new Float32Array(N * N * 4), wNor = new Float32Array(N * N * 3);
  for (let k = 0; k < N * N; k++) { wPos[k * 3] = pos[k * 3]; wPos[k * 3 + 2] = pos[k * 3 + 2]; wNor[k * 3 + 1] = 1; }
  const wGeo = new THREE.BufferGeometry();
  wGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3));
  wGeo.setAttribute('normal', new THREE.BufferAttribute(wNor, 3));
  wGeo.setAttribute('color', new THREE.BufferAttribute(wCol, 4));
  wGeo.setIndex(new THREE.BufferAttribute(gridIndex(N), 1));
  const sheet = new THREE.Mesh(wGeo, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, roughness: 0.28, depthWrite: false, side: THREE.DoubleSide }));
  sheet.frustumCulled = false;
  sheet.renderOrder = 1;
  group.add(sheet);

  // 블록 옆면
  const skirtPts = [];
  for (let i = 0; i < N; i++) skirtPts.push([i, 0]);
  for (let j = 1; j < N; j++) skirtPts.push([N - 1, j]);
  for (let i = N - 2; i >= 0; i--) skirtPts.push([i, N - 1]);
  for (let j = N - 2; j >= 1; j--) skirtPts.push([0, j]);
  const skirtPos = new Float32Array(skirtPts.length * 2 * 3);
  const skirtGeo = new THREE.BufferGeometry();
  skirtGeo.setAttribute('position', new THREE.BufferAttribute(skirtPos, 3));
  {
    const idx = [], n = skirtPts.length;
    for (let s = 0; s < n; s++) {
      const a = s * 2, b = s * 2 + 1, c = ((s + 1) % n) * 2, d = ((s + 1) % n) * 2 + 1;
      idx.push(a, c, b, b, c, d);
    }
    skirtGeo.setIndex(idx);
  }
  const skirt = new THREE.Mesh(skirtGeo, new THREE.MeshBasicMaterial({ color: 0x4d463d, side: THREE.DoubleSide }));
  skirt.frustumCulled = false;
  group.add(skirt);

  // 하도의 물 띠: 칸 무늬가 드러나지 않게 중심선을 따라 그린다. 둑보다 조금 넓어 가장자리는 둑에 가려진다.
  const inside = v => clamp(v, 0, N - 1);
  const pts = model.path.map((p, s) => ({ ...p, s })).filter(p => p.x >= -3 && p.x <= N + 2);
  const RIVER_W = CHANNEL * 0.95;
  const rPos = new Float32Array(pts.length * 2 * 3), rGeo = new THREE.BufferGeometry();
  rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
  {
    const idx = [];
    for (let s = 0; s < pts.length - 1; s++) { const a = s * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); }
    rGeo.setIndex(idx);
  }
  const CLEAN = new THREE.Color(0x2f86c9), MUDDY = new THREE.Color(0x9c7e52);
  const riverMat = new THREE.MeshStandardMaterial({ color: 0x2f86c9, roughness: 0.35, side: THREE.DoubleSide });
  const ribbon = new THREE.Mesh(rGeo, riverMat);
  ribbon.frustumCulled = false;
  group.add(ribbon);
  const waterX = (p, off) => inside(p.x - Math.sin(p.th) * off) - CENTER;
  const waterY = (p, off) => inside(p.y + Math.cos(p.th) * off) - CENTER;

  // 강 위의 작은 물방울과 물 흐름 화살표
  const dotGeo = new THREE.IcosahedronGeometry(1, 0), dotMat = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x1e6fa8, roughness: 0.3 });
  const dots = new THREE.InstancedMesh(dotGeo, dotMat, FLOW_DOTS);
  dots.frustumCulled = false;
  group.add(dots);
  const ARROWS = 7;
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(1, 0); arrowShape.lineTo(-1, 1); arrowShape.lineTo(-0.35, 0); arrowShape.lineTo(-1, -1); arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  arrowGeo.rotateX(-Math.PI / 2);
  const arrows = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xf2fbff, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), ARROWS);
  arrows.frustumCulled = false;
  group.add(arrows);
  const arrowAt = Array.from({ length: ARROWS }, (_, k) => Math.floor((pts.length - 1) * (0.05 + 0.9 * (k / (ARROWS - 1)))));
  const rot = new THREE.Matrix4(), scl = new THREE.Matrix4().makeScale(3.6, 1, 2.1), m4 = new THREE.Matrix4();

  // 물과 함께 움직이는 알갱이. 실제보다 크게 그린다. 모래는 밝고 크며 진흙은 어둡고 작다.
  const grainGeo = new THREE.IcosahedronGeometry(1, 0);
  const grains = new THREE.InstancedMesh(grainGeo, new THREE.MeshStandardMaterial({ roughness: 0.75 }), model.PARTICLES);
  grains.frustumCulled = false;
  const SAND_GRAIN = new THREE.Color('#ffe08a'), MUD_GRAIN = new THREE.Color('#4a2c17');
  for (let p = 0; p < model.PARTICLES; p++) grains.setColorAt(p, model.pKind[p] === 0 ? SAND_GRAIN : MUD_GRAIN);
  grains.instanceColor.needsUpdate = true;
  group.add(grains);
  const GRAIN_SIZE = [1.5, 1.05];

  // 단면을 자른 위치를 지형 위에 표시
  const SECTION_POINTS = 120;
  const sectionLine = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(SECTION_POINTS * 3), 3)),
    new THREE.LineDashedMaterial({ color: 0xffd36b, dashSize: 3, gapSize: 2.4 }));
  sectionLine.frustumCulled = false;
  const lineDist = new Float32Array(SECTION_POINTS);
  const lineDistAttr = new THREE.BufferAttribute(lineDist, 1);
  sectionLine.geometry.setAttribute('lineDistance', lineDistAttr);
  group.add(sectionLine);

  function syncTerrain() {
    const { h, w, sand, mud, hill, isCh, dist } = model;
    // 하도 벽 근처 칸만 둘레와 평균해 그린다(두 번). 가파른 벽에 칸 무늬(톱니)가 생기지 않게 하는 그림 처리이고, 계산 값은 그대로다.
    drawn.set(h);
    for (let pass = 0; pass < 2; pass++) {
      soft.set(drawn);
      for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
        const k = j * N + i;
        if (dist[k] > CHANNEL + 3) continue;
        let s = 0;
        for (let q = -N; q <= N; q += N) s += soft[k + q - 1] + soft[k + q] + soft[k + q + 1];
        drawn[k] = s / 9;
      }
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      pos[k * 3 + 1] = drawn[k];
      const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
      const slope = Math.hypot(h[ir] - h[il], h[jr] - h[jl]) / 2;
      const total = sand[k] + mud[k], laid = smooth(0.015, 0.22, total), fine = total > 0 ? mud[k] / total : 0;
      for (let q = 0; q < 3; q++) {
        let v = GRASS[q] + (GRASS2[q] - GRASS[q]) * patch[k];
        // 쌓인 곳은 쌓인 입자의 색이 된다. 모래가 많으면 밝고 진흙이 많으면 어둡다.
        const dep = SAND[q] + (MUD[q] - SAND[q]) * smooth(0.25, 0.75, fine);
        v += (dep - v) * laid;
        if (hill[k] > 0) { const f = FOREST[q] + (FOREST2[q] - FOREST[q]) * patch[k]; v += (f - v) * hill[k]; v += (ROCK[q] - v) * smooth(0.55, 1.1, slope) * 0.5 * hill[k]; }
        // 하도 안은 바닥 색에서 둑 쪽으로 쌓인 흙의 색으로 이어진다.
        if (isCh[k]) { const u = smooth(0.55, 1, dist[k] / CHANNEL); v = BED[q] + (SAND[q] * 0.8 - BED[q]) * u; }
        col[k * 3 + q] = v * speckle[k];
      }
      // 넘친 물
      const dep = w[k];
      const a = isCh[k] ? 0 : smooth(0.03, 0.22, dep) * 0.86;
      wPos[k * 3 + 1] = h[k] + dep + 0.03;
      if (a > 0) {
        // 새로 넘어온 흙탕물은 갈색, 시간이 지나 가라앉은 물은 맑은 푸른색이다. 칸마다 따로 정해진다.
        const mix = model.turbidAt(k);
        for (let q = 0; q < 3; q++) wCol[k * 4 + q] = POND_C[q] + (FLOOD_C[q] - POND_C[q]) * mix;
      }
      wCol[k * 4 + 3] = a;
    }
    fillNormals(N, 1, k => drawn[k] * VE, nor);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    wGeo.attributes.position.needsUpdate = true;
    wGeo.attributes.color.needsUpdate = true;
    skirtPts.forEach(([i, j], s) => {
      const x = i - CENTER, z = j - CENTER;
      skirtPos.set([x, h[j * N + i], z, x, BOTTOM, z], s * 6);
    });
    skirtGeo.attributes.position.needsUpdate = true;
    syncRiver();
    // 단면선
    const { top } = sectionProfile(model, SECTION_POINTS);
    const S = model.section, lp = sectionLine.geometry.attributes.position;
    for (let t = 0; t < SECTION_POINTS; t++) {
      const f = t / (SECTION_POINTS - 1);
      lp.setXYZ(t, S.ax + (S.bx - S.ax) * f - CENTER, top[t] + 0.25, S.ay + (S.by - S.ay) * f - CENTER);
    }
    lp.needsUpdate = true;
    lineDist[0] = 0;
    for (let t = 1; t < SECTION_POINTS; t++) lineDist[t] = lineDist[t - 1] + Math.hypot(lp.getX(t) - lp.getX(t - 1), lp.getY(t) - lp.getY(t - 1) * VE, lp.getZ(t) - lp.getZ(t - 1));
    lineDistAttr.needsUpdate = true;
  }

  function syncRiver() {
    const st = model.stage;
    pts.forEach((p, s) => {
      const y = st[p.s];
      rPos[s * 6] = waterX(p, RIVER_W); rPos[s * 6 + 1] = y; rPos[s * 6 + 2] = waterY(p, RIVER_W);
      rPos[s * 6 + 3] = waterX(p, -RIVER_W); rPos[s * 6 + 4] = y; rPos[s * 6 + 5] = waterY(p, -RIVER_W);
    });
    rGeo.attributes.position.needsUpdate = true;
    rGeo.computeVertexNormals();
    riverMat.color.copy(CLEAN).lerp(MUDDY, model.muddy);
    arrowAt.forEach((i, k) => {
      const p = pts[i], a = pts[Math.max(0, i - 4)], b = pts[Math.min(pts.length - 1, i + 4)];
      rot.makeRotationY(-Math.atan2(b.y - a.y, b.x - a.x)).multiply(scl);
      rot.setPosition(waterX(p, 0), st[p.s] + 0.1, waterY(p, 0));
      arrows.setMatrixAt(k, rot);
    });
    arrows.instanceMatrix.needsUpdate = true;
  }

  function syncFlow() {
    const { stage: st, px, py, pState, pKind, h, w, PARTICLES } = model;
    const L = pts.length;
    for (let d = 0; d < FLOW_DOTS; d++) {
      const f = ((d / FLOW_DOTS) + model.flowPhase) % 1;
      const p = pts[Math.min(L - 1, Math.floor(f * L))], off = Math.sin(d * 12.9) * CHANNEL * 0.6;
      m4.makeScale(0.55, 0.28, 0.55);
      m4.setPosition(waterX(p, off), st[p.s] + 0.12, waterY(p, off));
      dots.setMatrixAt(d, m4);
    }
    dots.instanceMatrix.needsUpdate = true;
    for (let p = 0; p < PARTICLES; p++) {
      const s = pState[p];
      if (s === 0) { m4.makeScale(0, 0, 0); grains.setMatrixAt(p, m4); continue; }
      const r = GRAIN_SIZE[pKind[p]], k = Math.round(py[p]) * N + Math.round(px[p]);
      // 움직이는 알갱이는 수면에 떠 있고, 멈춘 알갱이는 땅 위에 내려앉는다. 세로 배율을 되돌려 공 모양을 지킨다.
      m4.makeScale(r, (s === 2 ? 0.5 : 1) * r / VE, r);
      m4.setPosition(px[p] - CENTER, h[k] + (s === 1 ? w[k] + 0.15 : 0.05), py[p] - CENTER);
      grains.setMatrixAt(p, m4);
    }
    grains.instanceMatrix.needsUpdate = true;
  }

  return { group, terrain, syncTerrain, syncFlow, arrowCount: ARROWS };
}
