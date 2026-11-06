// © 2026 김용현
// 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다.
import * as THREE from 'three';
import { N, CHANNEL, sectionProfile } from './model.js';
import { gridIndex, fillNormals } from '../../shared/grid.js';

const CENTER = N / 2;
export const BOTTOM = -30;
const FLOW_DOTS = 110;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function createBlock(model) {
  const group = new THREE.Group();
  const linear = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const GREEN = linear('#7f9a5c'), FIELD = linear('#a9b36a'), TREAD_OLD = linear('#b59f62'), TREAD_NEW = linear('#cdb97c');
  const FRESH = linear('#efb765'), FRESH_SECONDS = 1.4; // 방금 깎인 자리의 밝은 흙색과 그 색이 사라지는 시간
  const FLOOR = linear('#d8cfae'), ROCK_A = linear('#6f665a'), ROCK_B = linear('#8d8272'), SHRUB = linear('#4c6340');

  const pos = new Float32Array(N * N * 3), nor = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3);
  const drawn = new Float32Array(N * N);
  const speckle = new Float32Array(N * N), stripe = new Float32Array(N * N), patch = new Float32Array(N * N);
  {
    let seed = 5;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      pos[k * 3] = i - CENTER; pos[k * 3 + 2] = j - CENTER;
      speckle[k] = 0.92 + r() * 0.16;
      // 논밭 줄무늬: 평평한 면에만 얇게 입힌다. 위치는 예시다.
      stripe[k] = Math.floor((i * 0.82 + j * 0.57) / 5) % 2 ? 1 : 0.9;
      patch[k] = Math.sin(i * 0.21) * Math.sin(j * 0.17) * 0.5 + 0.5;
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

  // 강물 띠: 칸 무늬가 드러나지 않도록 중심선을 따라 따로 그린다. 측방 침식 동안 강과 함께 옆으로 옮겨 간다.
  // 강은 블록 밖으로 계속 흐르므로, 블록 끝을 조금 넘는 점까지 잡아 물띠가 잘린 면에 딱 맞게 끝나게 한다.
  // 물길은 보통 하나지만, 미앤더 핵 조건에서는 옛 고리 물길과 지름길 물길 둘이고 물띠 폭(wide)이 시간에 따라 바뀐다.
  const inside = v => clamp(v, 0, N - 1);
  const RIVER_W = CHANNEL * 0.92;
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2f86c9, roughness: 0.35, side: THREE.DoubleSide });
  const dotGeo = new THREE.IcosahedronGeometry(1, 0), dotMat = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x1e6fa8, roughness: 0.3 });
  const m4 = new THREE.Matrix4();

  // 강 위의 정지 화살표: 하류 쪽(물이 흐르는 쪽)을 가리킨다. 계산이 끝나 움직임이 멈춰도 보인다.
  const ARROWS = 9;
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(1, 0); arrowShape.lineTo(-1, 1); arrowShape.lineTo(-0.35, 0); arrowShape.lineTo(-1, -1); arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  arrowGeo.rotateX(-Math.PI / 2);
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xf2fbff, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const rot = new THREE.Matrix4(), scl = new THREE.Matrix4().makeScale(3.6, 1, 2.1);

  // 물길 하나의 물띠, 물방울, 화살표
  function createStream(st) {
    const pts = st.path.map((p, s) => ({ ...p, s })).filter(p => p.x >= -3 && p.x <= N + 2);
    const posArr = new Float32Array(pts.length * 2 * 3), geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const idx = [];
    for (let s = 0; s < pts.length - 1; s++) {
      const a = s * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, b, c, b, d, c);
    }
    geom.setIndex(idx);
    const ribbon = new THREE.Mesh(geom, waterMat);
    ribbon.frustumCulled = false;
    const dots = new THREE.InstancedMesh(dotGeo, dotMat, st.dots ?? FLOW_DOTS);
    dots.frustumCulled = false;
    const arrows = new THREE.InstancedMesh(arrowGeo, arrowMat, ARROWS);
    arrows.frustumCulled = false;
    const arrowAt = Array.from({ length: ARROWS }, (_, k) => Math.floor((pts.length - 1) * (0.04 + 0.88 * (k / (ARROWS - 1)))));
    group.add(ribbon, dots, arrows);
    return { st, pts, posArr, geom, ribbon, dots, arrows, arrowAt };
  }
  function dropStream(b) {
    group.remove(b.ribbon, b.dots, b.arrows);
    b.geom.dispose(); b.dots.dispose(); b.arrows.dispose();
  }
  // 조건이 바뀌어 물길이 달라졌을 때만 다시 만든다.
  const sourceStreams = () => model.streams ?? [{ path: model.path, get bed() { return model.bed; }, get off() { return model.offset; }, wide: null }];
  let streams = [];
  function syncStreams() {
    const src = sourceStreams();
    if (streams.length === src.length && streams.every((b, n) => b.st.path === src[n].path)) { streams.forEach((b, n) => { b.st = src[n]; }); return; }
    streams.forEach(dropStream);
    streams = src.map(createStream);
  }
  // 강물 자리: 중심선에서 옆 이동량과 w만큼 떨어진 점. 블록 밖으로 나가지 않게 가장자리에서 자른다.
  const waterX = (st, p, w) => inside(p.x - Math.sin(p.th) * (st.off[p.s] + w));
  const waterY = (st, p, w) => inside(p.y + Math.cos(p.th) * (st.off[p.s] + w));
  syncStreams();

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
    const { h, age, lifted, count, lastCut, clock } = model;
    // 벽 칸만 둘레와 평균해 그린다. 가파른 벽에 칸 무늬(톱니)가 생기지 않게 하는 그림 처리이고, 계산 값은 그대로다.
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      if (age[k] >= 0 || i < 1 || j < 1 || i >= N - 1 || j >= N - 1) { drawn[k] = h[k]; continue; }
      let s = 0;
      for (let q = -N; q <= N; q += N) s += h[k + q - 1] + h[k + q] + h[k + q + 1];
      drawn[k] = s / 9;
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      pos[k * 3 + 1] = drawn[k];
      const a = age[k];
      const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
      const slope = Math.hypot(h[ir] - h[il], h[jr] - h[jl]) / 2;
      for (let q = 0; q < 3; q++) {
        let v;
        if (a < 0) {
          // 단구애와 골짜기 벽: 기반암 띠 위로 키 작은 나무가 드문드문
          // 가파를수록 층 무늬 간격을 넓힌다. 칸마다 번갈아 보이는 세로 줄무늬(커튼)를 막는다.
          const band = 0.5 + 0.5 * Math.sin(((drawn[k] - lifted) * 0.62) / (1 + slope * 2.4));
          v = ROCK_A[q] + (ROCK_B[q] - ROCK_A[q]) * band;
          v += (SHRUB[q] - v) * 0.3 * patch[k];
        } else if (a === 0) {
          v = (GREEN[q] + (FIELD[q] - GREEN[q]) * patch[k]) * stripe[k];
        } else if (a >= model.risen) {
          v = FLOOR[q];
        } else {
          const t = count > 2 ? (a - 1) / (count - 2) : 1;
          v = (TREAD_OLD[q] + (TREAD_NEW[q] - TREAD_OLD[q]) * t) * stripe[k];
          v += (FIELD[q] - v) * 0.3 * patch[k];
        }
        // 얇은 자갈층이 끝나는 가장자리는 어둡게 이어 준다.
        if (a >= 0) v += (ROCK_A[q] - v) * smooth(0.35, 1.3, slope) * 0.8;
        // 방금 물이 깎아 낸 자리는 잠깐 밝은 흙색으로 보여 준다.
        const fresh = lastCut[k] < 0 ? 0 : 1 - (clock - lastCut[k]) / FRESH_SECONDS;
        if (fresh > 0) v += (FRESH[q] - v) * fresh * 0.85;
        col[k * 3 + q] = v * (a < 0 ? 1 + (speckle[k] - 1) * 0.25 : speckle[k]);
      }
    }
    fillNormals(N, 1, k => drawn[k], nor);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    skirtPts.forEach(([i, j], s) => {
      const x = i - CENTER, z = j - CENTER;
      skirtPos.set([x, h[j * N + i], z, x, BOTTOM, z], s * 6);
    });
    skirtGeo.attributes.position.needsUpdate = true;
    syncStreams();
    for (const { st, pts, posArr, geom, arrows, arrowAt } of streams) {
      const bedS = st.bed, wide = st.wide;
      pts.forEach((p, s) => {
        const y = bedS[p.s] + 0.62, w = RIVER_W * (wide ? wide[p.s] : 1);
        posArr[s * 6] = waterX(st, p, w) - CENTER; posArr[s * 6 + 1] = y; posArr[s * 6 + 2] = waterY(st, p, w) - CENTER;
        posArr[s * 6 + 3] = waterX(st, p, -w) - CENTER; posArr[s * 6 + 4] = y; posArr[s * 6 + 5] = waterY(st, p, -w) - CENTER;
      });
      geom.attributes.position.needsUpdate = true;
      geom.computeVertexNormals();
      arrowAt.forEach((i, k) => {
        const p = pts[i], a = pts[Math.max(0, i - 4)], b = pts[Math.min(pts.length - 1, i + 4)];
        // 화살표는 옮겨 간 물길이 지금 향하는 쪽을 가리킨다. 물이 없는 곳에는 그리지 않는다.
        if (wide && wide[p.s] < 0.6) { rot.makeScale(0, 0, 0); arrows.setMatrixAt(k, rot); return; }
        rot.makeRotationY(-Math.atan2(waterY(st, b, 0) - waterY(st, a, 0), waterX(st, b, 0) - waterX(st, a, 0))).multiply(scl);
        rot.setPosition(waterX(st, p, 0) - CENTER, bedS[p.s] + 0.62 + 0.12, waterY(st, p, 0) - CENTER);
        arrows.setMatrixAt(k, rot);
      });
      arrows.instanceMatrix.needsUpdate = true;
    }
    // 단면선
    const { top } = sectionProfile(model, SECTION_POINTS);
    const S = model.section, lp = sectionLine.geometry.attributes.position;
    for (let t = 0; t < SECTION_POINTS; t++) {
      const f = t / (SECTION_POINTS - 1);
      lp.setXYZ(t, S.ax + (S.bx - S.ax) * f - CENTER, top[t] + 0.6, S.ay + (S.by - S.ay) * f - CENTER);
    }
    lp.needsUpdate = true;
    lineDist[0] = 0;
    for (let t = 1; t < SECTION_POINTS; t++) lineDist[t] = lineDist[t - 1] + Math.hypot(lp.getX(t) - lp.getX(t - 1), lp.getY(t) - lp.getY(t - 1), lp.getZ(t) - lp.getZ(t - 1));
    lineDistAttr.needsUpdate = true;
  }

  function syncFlow() {
    const { clock } = model;
    syncStreams();
    for (const { st, pts, dots } of streams) {
      const L = pts.length, n = dots.count, rate = st.rate ?? 0.03, wide = st.wide;
      for (let d = 0; d < n; d++) {
        const f = ((d / n) + clock * rate) % 1;
        const p = pts[Math.min(L - 1, Math.floor(f * L))];
        // 물이 없는 곳의 물방울은 숨긴다.
        const shown = !wide || wide[p.s] >= 0.4;
        const off = Math.sin(d * 12.9) * CHANNEL * 0.45 * (wide ? wide[p.s] : 1);
        if (shown) m4.makeScale(0.55, 0.28, 0.55); else m4.makeScale(0, 0, 0);
        m4.setPosition(waterX(st, p, off) - CENTER, st.bed[p.s] + 0.75, waterY(st, p, off) - CENTER);
        dots.setMatrixAt(d, m4);
      }
      dots.instanceMatrix.needsUpdate = true;
    }
  }

  return { group, terrain, syncTerrain, syncFlow, arrowCount: ARROWS * streams.length };
}
