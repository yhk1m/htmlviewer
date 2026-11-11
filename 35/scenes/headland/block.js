// © 2026 김용현
// 곶과 만 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다. 계산은 하지 않고 model의 값을 그대로 그린다.
import * as THREE from 'three';
import { N, SEA, RAYS, RAY_STEPS, HEAD_X, BAY_X, ARCH, CLIFF_CAVE, currentDir, sectionLine as sectionXY } from './model.js';
import { gridIndex } from '../../shared/grid.js';

const CENTER = N / 2;
export const BOTTOM = -8;
export const VE = 1.5; // 그림에서 높이를 조금 키우는 배율. 계산 값은 그대로다.
const SHEET = 128, CREST_GAP = 13, CRESTS = Math.floor(RAY_STEPS / CREST_GAP) - 1, ARROWS = 12;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
// 바위 표면을 울퉁불퉁하게 그리는 잡음. 그림에만 쓰고 계산에는 쓰지 않는다.
const hash = (i, j) => { let n = (i * 374761393 + j * 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; };
const vnoise = (x, y) => {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
};
const rough = (x, y) => vnoise(x * 0.45, y * 0.45) * 0.65 + vnoise(x * 1.4 + 7, y * 1.4) * 0.35;
const BOULDERS = 520;

export function createBlock(model) {
  const group = new THREE.Group();
  group.scale.y = VE;
  const linear = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const FOREST = linear('#46603a'), FOREST2 = linear('#5a7346'), GRASS = linear('#8ea765'), SAND = linear('#e6cf90'), ROCK = linear('#6f665a'), CLIFF = linear('#8a7f70'), PLATFORM = linear('#7d7566'), BED = linear('#c4b48e'), DEEP = linear('#1f3442'), HARD = linear('#4f4a44'), JOINT = linear('#17140f'), DARK = linear('#0e1112');

  // 바위 색: 높이에 따라 층이 지고, 곳마다 조금씩 다르다.
  const rockColor = (y, x, z, q) => {
    const r = rough(x, z), band = 0.84 + 0.26 * (0.5 + 0.5 * Math.sin(y * 4.2 + r * 2.6));
    const v = HARD[q] * band;
    return v + (ROCK[q] - v) * r * 0.45;
  };
  // 바위 칸의 그림 높이: 윗면은 울퉁불퉁하고, 물가 쪽 모서리는 둥글게 깎인다.
  const isRocky = k => model.h[k] >= SEA && (model.isStackRock[k] || model.stackMark[k] || model.fin[k]);
  const visH = k => {
    const h = model.h, y = h[k];
    if (!isRocky(k)) return y;
    const i = k % N, j = (k / N) | 0;
    let wet = 0;
    if (i > 0 && h[k - 1] < SEA) wet++;
    if (i < N - 1 && h[k + 1] < SEA) wet++;
    if (j > 0 && h[k - N] < SEA) wet++;
    if (j < N - 1 && h[k + N] < SEA) wet++;
    return y + (rough(i, j) - 0.5) * 0.55 - wet * 0.22 * Math.min(1, y);
  };

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

  // 굴러떨어진 바위: 해식애와 시아치, 시스택 발치의 얕은 물에 흩어 놓는다. 그림 꾸밈이고 계산에는 들어가지 않는다.
  const boulderGeo = new THREE.IcosahedronGeometry(1, 0);
  {
    const p = boulderGeo.attributes.position;
    for (let n = 0; n < p.count; n++) { const s = 0.75 + 0.5 * hash(n * 7 + 1, 3); p.setXYZ(n, p.getX(n) * s, p.getY(n) * s * 0.8, p.getZ(n) * s); }
    boulderGeo.computeVertexNormals();
  }
  const boulders = new THREE.InstancedMesh(boulderGeo, new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), BOULDERS);
  boulders.castShadow = boulders.receiveShadow = true;
  boulders.frustumCulled = false;
  group.add(boulders);
  const near = new Uint8Array(N * N), nearTmp = new Uint8Array(N * N), bq = new THREE.Quaternion(), bAxis = new THREE.Vector3(), bv = new THREE.Vector3(), bs = new THREE.Vector3(), bc = new THREE.Color();
  function syncBoulders() {
    const { h } = model;
    // 바위 벽(단단한 바위나 가파른 해식애) 둘레 4칸까지를 표시한다.
    near.fill(0);
    for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
      const k = j * N + i;
      if (h[k] < SEA + 0.6) continue;
      const steep = Math.max(Math.abs(h[k + 1] - h[k - 1]), Math.abs(h[k + N] - h[k - N])) / 2 > 1.1;
      if (isRocky(k) || steep) near[k] = 1;
    }
    for (let pass = 0; pass < 4; pass++) {
      nearTmp.set(near);
      for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
        const k = j * N + i;
        if (!nearTmp[k] && (nearTmp[k - 1] || nearTmp[k + 1] || nearTmp[k - N] || nearTmp[k + N])) near[k] = 2 + pass;
      }
    }
    let n = 0;
    for (let k = 0; k < N * N && n < BOULDERS; k++) {
      const d = near[k];
      if (d < 2 || h[k] >= SEA + 0.15 || h[k] < SEA - (d === 2 ? 4 : 1.8) || model.sand[k] > 0.05) continue;
      const i = k % N, j = (k / N) | 0;
      // 벽에 가까울수록 많고 크다.
      if (hash(i, j) > (d === 2 ? 0.5 : 0.34 - d * 0.05)) continue;
      // 시아치 아래는 뚫린 구멍이 보이도록 비워 둔다.
      if (j >= ARCH.j0 - 1 && j <= ARCH.j1 + 1 && i >= ARCH.x0 - 2 && i <= ARCH.x1 + 2) continue;
      // 벽 바로 옆에는 큰 돌이 벽에 기대어 쌓인다.
      let size = (0.35 + 0.75 * hash(i + 11, j) ** 2) * (d === 2 ? 1.7 : d === 3 ? 1 : 0.7);
      // 벽 옆 깊은 곳의 돌은 물 위로 머리가 나올 만큼 크다.
      if (d === 2) size = Math.min(3, Math.max(size, ((SEA - h[k] + 0.4) / 1.3) * (0.8 + 0.4 * hash(i + 6, j))));
      bAxis.set(hash(i, j + 5) - 0.5, 1, hash(i + 5, j) - 0.5).normalize();
      bq.setFromAxisAngle(bAxis, hash(i + 3, j + 9) * 6.28);
      bv.set(i + (hash(i, j + 1) - 0.5) * 0.8 - CENTER, h[k] + size * 0.35, j + (hash(i + 1, j) - 0.5) * 0.8 - CENTER);
      bs.set(size, size / VE, size * (0.8 + 0.4 * hash(i + 2, j)));
      m4.compose(bv, bq, bs);
      boulders.setMatrixAt(n, m4);
      const g = 0.85 + 0.3 * hash(i + 4, j + 4);
      bc.setRGB(HARD[0] * g * 1.15, HARD[1] * g * 1.12, HARD[2] * g * 1.08);
      boulders.setColorAt(n, bc);
      n++;
    }
    boulders.count = n;
    boulders.instanceMatrix.needsUpdate = true;
    if (boulders.instanceColor) boulders.instanceColor.needsUpdate = true;
  }
  let boulderTick = 0, boulderKey = '';

  // 수심을 비교하는 줄:먼바다에서 같은 거리에 있는 곶 앞과 만 앞을 잇는다.
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
  const caveArrows = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), 1 + CLIFF_CAVE.xs.length);
  caveArrows.frustumCulled = false; caveArrows.renderOrder = 4;
  group.add(caveArrows);
  const hideCaveArrow = slot => { m4.makeScale(0, 0, 0); caveArrows.setMatrixAt(slot, m4); caveArrows.instanceMatrix.needsUpdate = true; };
  for (let s = 0; s <= CLIFF_CAVE.xs.length; s++) hideCaveArrow(s);
  let roofKey = '';
  function syncRoof() {
    const a = model.arch, key = `${a.caveL},${a.collapsed}`;
    if (key === roofKey) return;
    roofKey = key;
    const tris = [], cols = [];
    const jA = ARCH.j0 - 1, jB = ARCH.j1 + 1, mid = (jA + jB) / 2, span = (jB - jA) / 2, STEPS = 22;
    // 처음에는 해식애에 뚫린 작은 입구이고, 굴이 깊어질수록 입구가 넓고 높아진다. 천장 아랫면은 활 모양이되 바위라 울퉁불퉁하다.
    const grow = 0.42 + 0.58 * Math.min(1, a.caveL / (ARCH.x1 - ARCH.x0 + 1));
    const under = (x, j) => {
      const t = (j - mid) / (span * grow), q = 1 - t * t, s = Math.sqrt(q < 0 ? 0 : q);
      return SEA - 0.3 + (ARCH.crown * grow + 0.3) * s + (rough(x * 1.3 + 40, j * 1.3) - 0.5) * 0.7 * s;
    };
    // 윗면은 양 끝 줄의 땅 그림 높이를 이어 붙여 둘레와 틈이 없고, 가운데는 조금 울퉁불퉁하다.
    const colH = (x, j) => visH(j * N + clamp(Math.round(x), ARCH.x0, ARCH.x1));
    const top = (x, j) => { const t = (j - jA) / (jB - jA); return colH(x, jA) * (1 - t) + colH(x, jB) * t + (rough(x * 1.7, j * 1.7) - 0.5) * 0.6 * Math.sin(Math.PI * t); };
    const P = (x, y, j) => [x - CENTER, y, j - CENTER];
    const tri3 = (ca, cb, cc, pa, pb, pc) => { tris.push(...pa, ...pb, ...pc); cols.push(...ca, ...cb, ...cc); };
    const quad = (c, p, q, r, s) => { tri3(c[0], c[1], c[2], p, q, r); tri3(c[0], c[2], c[3], p, r, s); };
    const rockAt = (p, dim = 1) => [0, 1, 2].map(q => rockColor(p[1], p[0] + CENTER, p[2] + CENTER, q) * dim);
    const darkAt = () => DARK;
    // 입구 가장자리는 곧은 선이 아니라 들쭉날쭉하다.
    const pad = 0.15, edgeA = j => ARCH.x0 - pad - 0.5 * vnoise(3.1, j * 0.7), edgeB = j => ARCH.x1 + pad + 0.5 * vnoise(9.7, j * 0.7);
    const spans = [];
    if (!a.collapsed) {
      if (a.through) spans.push([true, true, null]);
      else if (a.caveL) spans.push([true, false, ARCH.x0 + a.caveL]);
    }
    for (const [openA, openB, endX] of spans) {
      const inner = [];
      for (let x = ARCH.x0 + 1; x < (endX ?? ARCH.x1); x++) inner.push(x);
      const xsAt = j => [edgeA(j), ...inner, endX ?? edgeB(j)];
      for (let n = 0; n < STEPS; n++) {
        const j0 = jA + ((jB - jA) * n) / STEPS, j1 = jA + ((jB - jA) * (n + 1)) / STEPS;
        const xs0 = xsAt(j0), xs1 = xsAt(j1), last = xs0.length - 1;
        // 가운데에 절리가 지나간다.
        const onJoint = !a.collapsed && j0 <= mid && j1 > mid;
        for (let c = 0; c < last; c++) {
          const p = P(xs0[c], top(xs0[c], j0), j0), q = P(xs1[c], top(xs1[c], j1), j1), r = P(xs1[c + 1], top(xs1[c + 1], j1), j1), s = P(xs0[c + 1], top(xs0[c + 1], j0), j0);
          // 윗면: 가장자리는 바위, 안쪽은 풀과 떨기나무
          const capC = pt => { if (onJoint) return JOINT; const e = Math.min(pt[0] + CENTER - xs0[0], xs0[last] - pt[0] - CENTER); const w = smooth(0.8, 2.2, e) * 0.85, rc = rockAt(pt); return rc.map((v, q2) => v + ((hash(Math.round(pt[0]), Math.round(pt[2])) > 0.5 ? FOREST2 : FOREST)[q2] - v) * w); };
          quad([capC(p), capC(q), capC(r), capC(s)], p, q, r, s);
          const u = [P(xs0[c], under(xs0[c], j0), j0), P(xs0[c + 1], under(xs0[c + 1], j0), j0), P(xs1[c + 1], under(xs1[c + 1], j1), j1), P(xs1[c], under(xs1[c], j1), j1)];
          quad(a.through ? u.map(pt => rockAt(pt, 0.72)) : u.map(darkAt), ...u);
        }
        // 옆면에서 보이는 입구 위의 바위
        if (openA) { const f = [P(xs0[0], under(xs0[0], j0), j0), P(xs1[0], under(xs1[0], j1), j1), P(xs1[0], top(xs1[0], j1), j1), P(xs0[0], top(xs0[0], j0), j0)]; quad(f.map(pt => rockAt(pt)), ...f); }
        if (openB) { const f = [P(xs0[last], under(xs0[last], j0), j0), P(xs0[last], top(xs0[last], j0), j0), P(xs1[last], top(xs1[last], j1), j1), P(xs1[last], under(xs1[last], j1), j1)]; quad(f.map(pt => rockAt(pt)), ...f); }
        // 아직 뚫리지 않은 굴의 안쪽 끝은 빛이 닿지 않아 어둡다.
        else { const f = [P(endX, SEA - 0.3, j0), P(endX, under(endX, j0), j0), P(endX, under(endX, j1), j1), P(endX, SEA - 0.3, j1)]; quad(f.map(darkAt), ...f); }
      }
    }
    roofGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tris), 3));
    roofGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols), 3));
    roofGeo.deleteAttribute('normal');
    roofGeo.computeVertexNormals();
    roof.visible = tris.length > 0;
    // 굴을 파는 동안 옆면으로 들어가는 파랑을 화살표로 보여 준다.
    if (a.through || a.collapsed) hideCaveArrow(0);
    else {
      const z = mid - CENTER;
      scl.makeScale(5, 1, 3.2);
      m4.copy(scl); m4.setPosition(ARCH.x0 - 8 - CENTER, SEA + 0.2, z); caveArrows.setMatrixAt(0, m4);
      caveArrows.instanceMatrix.needsUpdate = true;
    }
  }

  // 곶의 해식애에 난 해식동. 높이 격자는 그대로 두고, 절벽 면을 따라 어두운 입구를 그린다. 안쪽은 빛이 닿지 않아 어둡다.
  const cliffCaveGeo = new THREE.BufferGeometry();
  const cliffCaveMesh = new THREE.Mesh(cliffCaveGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  cliffCaveMesh.frustumCulled = false;
  group.add(cliffCaveMesh);
  const RIM = linear('#3a3631');
  let cliffCaveKey = '';
  function syncCliffCaves() {
    const { h, front, cliffCaves } = model;
    let key = '';
    for (const c of cliffCaves) { key += `${c.depth.toFixed(1)},${c.face.toFixed(1)};`; for (let i = c.x - CLIFF_CAVE.half - 2; i <= c.x + CLIFF_CAVE.half + 2; i++) key += `${front[i]},`; }
    if (key === cliffCaveKey) return;
    cliffCaveKey = key;
    // 칸 사이는 이어서, 절벽 면의 그 높이에 있는 줄 위치를 구한다.
    const oneRow = (i, y) => {
      const F = front[i], H = h[(F - 1) * N + i], B = h[F * N + i];
      return y >= H ? F - 1 : F - 1 + (H - y) / (H - B);
    };
    // 절벽 면은 칸마다 조금씩 들쭉날쭉하다. 튀어나온 칸이 입구를 뚫고 나오지 않도록 양옆 칸 중 바다 쪽을 따르되, 멀리 튀어나온 칸은 따라가지 않는다.
    const colRow = (i, y) => { const own = oneRow(i, y); return Math.min(own + 1.5, Math.max(oneRow(i - 2, y), oneRow(i - 1, y), own, oneRow(i + 1, y), oneRow(i + 2, y))); };
    const faceRow = (x, y) => { const a = Math.floor(x), f = x - a; return colRow(a, y) * (1 - f) + colRow(a + 1, y) * f; };
    const P = [], C = [];
    const tri = (color, ...v) => { for (const p of v) { P.push(...p); C.push(...color); } };
    const arch = (c, half, height, off, color) => {
      const STEPS = Math.max(6, Math.round(half * 4)), LOW = SEA - 0.25;
      const roofAt = u => LOW + (height - LOW) * Math.sqrt(Math.max(0, 1 - u * u));
      const pt = (x, y) => [x - CENTER, y, faceRow(x, y) + off - CENTER];
      for (let n = 0; n < STEPS; n++) {
        const u0 = -1 + (2 * n) / STEPS, u1 = -1 + (2 * (n + 1)) / STEPS, x0 = c.x + u0 * half, x1 = c.x + u1 * half;
        // 면을 세로로 나눠 절벽의 기울기를 따라가게 한다.
        for (let q = 0; q < 4; q++) {
          const s0 = q / 4, s1 = (q + 1) / 4, y = (u, s) => LOW + (roofAt(u) - LOW) * s;
          const a = pt(x0, y(u0, s0)), b = pt(x1, y(u1, s0)), d = pt(x0, y(u0, s1)), e = pt(x1, y(u1, s1));
          tri(color, a, b, e, a, e, d);
        }
      }
    };
    cliffCaves.forEach((c, n) => {
      if (c.depth < 0.05) { hideCaveArrow(n + 1); return; }
      const q = model.caveMouth(c);
      arch(c, q.half + 0.7, q.height + 0.35, 0.25, RIM);
      arch(c, q.half, q.height, 0.4, DARK);
      // 굴로 들어가는 파랑
      scl.makeScale(4, 1, 2.6);
      m4.makeRotationY(Math.PI / 2).multiply(scl);
      m4.setPosition(c.x - CENTER, SEA + 0.2, front[c.x] + 7 - CENTER);
      caveArrows.setMatrixAt(n + 1, m4);
      caveArrows.instanceMatrix.needsUpdate = true;
    });
    cliffCaveGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
    cliffCaveGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(C), 3));
    cliffCaveMesh.visible = P.length > 0;
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
    const rocky = isRocky(k);
    pos[k * 3 + 1] = visH(k);
    // 바위 벽의 위 모서리는 옆으로 들쭉날쭉하게 옮기고, 벽 발치의 물속 칸은 무너진 돌이 쌓여 조금 높게 그린다.
    // 시아치 천장과 이어지는 줄은 천장과 틈이 생기지 않게 옮기지 않는다.
    let ox = 0, oz = 0;
    const edge = rocky && ((i > 0 && h[k - 1] < SEA) || (i < N - 1 && h[k + 1] < SEA) || (j > 0 && h[k - N] < SEA) || (j < N - 1 && h[k + N] < SEA));
    const archRows = j >= ARCH.j0 - 1 && j <= ARCH.j1 + 1 && i >= ARCH.x0 - 1 && i <= ARCH.x1 + 1;
    if (rocky && !archRows) {
      if (edge) { ox = (vnoise(i * 0.7, j * 0.7 + 50) - 0.5) * 1.1; oz = (vnoise(i * 0.7 + 80, j * 0.7) - 0.5) * 1.1; }
    } else if (h[k] < SEA && !archRows) {
      const r = (i > 0 && isRocky(k - 1)) || (i < N - 1 && isRocky(k + 1)) || (j > 0 && isRocky(k - N)) || (j < N - 1 && isRocky(k + N));
      if (r) pos[k * 3 + 1] = Math.min(SEA - 0.05, h[k] + Math.min(1.2, SEA - h[k] + 0.3) * (0.45 + 0.3 * hash(i, j)));
    }
    pos[k * 3] = i - CENTER + ox; pos[k * 3 + 2] = j - CENTER + oz;
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const dhx = h[ir] - h[il], dhz = h[jr] - h[jl], slope = Math.hypot(dhx, dhz) / 2;
    // 바위는 그림 높이로 면 방향을 구해 울퉁불퉁함이 빛에 드러나게 한다.
    const gx = rocky ? visH(ir) - visH(il) : dhx, gz = rocky ? visH(jr) - visH(jl) : dhz;
    const dx = gx * 0.5 * VE, dz = gz * 0.5 * VE, len = Math.hypot(dx, 1, dz);
    nor[k * 3] = -dx / len; nor[k * 3 + 1] = 1 / len; nor[k * 3 + 2] = -dz / len;
    for (let q = 0; q < 3; q++) {
      let v;
      if (h[k] >= SEA) {
        v = GRASS[q] + (FOREST[q] - GRASS[q]) * smooth(0.5, 3, h[k]);
        v += (FOREST2[q] - v) * patch[k] * 0.4;
        // 가파른 비탈은 바위가 드러난다. 곧 깎일 물가의 비탈이 해식애다.
        v += (CLIFF[q] - v) * smooth(0.5, 1.4, slope);
        if (rocky) {
          // 단단한 바위는 어둡고 층이 진다. 평평한 꼭대기에는 둘레 땅처럼 풀과 떨기나무가 덮인다.
          v = rockColor(h[k], i, j, q);
          const cap = (edge ? 0 : 1) * smooth(0.7, 0.3, slope) * smooth(SEA + 1.8, SEA + 3, h[k]) * (0.55 + 0.45 * rough(i * 2, j * 2));
          v += ((patch[k] > 0.5 ? FOREST2 : FOREST)[q] - v) * cap * 0.85;
        }
        if (sand[k] > 0.02) v = SAND[q];
        // 절리: 둘레 바위에 난 검은 줄. 해식동이 이 줄을 따라 파인다.
        if (model.fin[k] && !model.arch.collapsed && j === ((ARCH.j0 + ARCH.j1) >> 1)) v = JOINT[q];
      } else if (sand[k] > 0.02) v = SAND[q] * 0.85 + BED[q] * 0.15;
      else if (model.caved[k] && !model.arch.through) v = DARK[q];
      // 좁은 곶의 발치: 옆면이 물속 바닥색으로 번지지 않아 시아치와 둘레 절벽의 색이 같아진다.
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
    syncCliffCaves();
    // 바위 자리는 땅이 바뀌면 다시 고른다. 매번 하면 무거워 몇 번에 한 번만 한다.
    const bk = `${model.arch.caveL},${model.arch.collapsed},${model.stacks ? model.stacks.length : 0}`;
    if (full || bk !== boulderKey || ++boulderTick % 12 === 0) { boulderKey = bk; syncBoulders(); }
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
