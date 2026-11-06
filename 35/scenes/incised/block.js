// © 2026 김용현
// 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다.
import * as THREE from 'three';
import { N, CHANNEL, sectionProfile } from './model.js';
import { gridIndex, fillNormals } from '../../shared/grid.js';

const CENTER = N / 2;
export const BOTTOM = -30;
export const SEA_WIDTH = 22;
const FLOW_DOTS = 110;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function createBlock(model) {
  const group = new THREE.Group();
  const linear = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const GREEN = linear('#7f9a5c'), FIELD = linear('#a9b36a'), TREAD_OLD = linear('#b59f62'), TREAD_NEW = linear('#cdb97c');
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

  // 강물 띠: 칸 무늬가 드러나지 않도록 중심선을 따라 따로 그린다.
  const inBlock = model.path.map((p, s) => ({ ...p, s })).filter(p => p.x >= 0 && p.x <= N - 1 && p.y >= 0 && p.y <= N - 1);
  const riverPos = new Float32Array(inBlock.length * 2 * 3);
  const riverGeo = new THREE.BufferGeometry();
  riverGeo.setAttribute('position', new THREE.BufferAttribute(riverPos, 3));
  {
    const idx = [];
    for (let s = 0; s < inBlock.length - 1; s++) {
      const a = s * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, b, c, b, d, c);
    }
    riverGeo.setIndex(idx);
    inBlock.forEach((p, s) => {
      const nx = -Math.sin(p.th), ny = Math.cos(p.th), w = CHANNEL * 0.92;
      riverPos[s * 6] = p.x + nx * w - CENTER; riverPos[s * 6 + 2] = p.y + ny * w - CENTER;
      riverPos[s * 6 + 3] = p.x - nx * w - CENTER; riverPos[s * 6 + 5] = p.y - ny * w - CENTER;
    });
    riverGeo.computeVertexNormals();
  }
  // 하구: 강물 띠의 끝 쪽 색을 바다 색에 가깝게 천천히 바꿔, 네모로 끊겨 보이지 않고 바다와 이어지게 한다.
  const riverCol = new Float32Array(inBlock.length * 2 * 3).fill(1);
  inBlock.forEach((p, s) => {
    const f = clamp((p.x - (N - 1 - 34)) / 34), k = 1 - 0.17 * smooth(0, 1, f);
    riverCol.fill(k, s * 6, s * 6 + 6);
  });
  riverGeo.setAttribute('color', new THREE.BufferAttribute(riverCol, 3));
  const river = new THREE.Mesh(riverGeo, new THREE.MeshStandardMaterial({ color: 0x2f86c9, vertexColors: true, roughness: 0.35, side: THREE.DoubleSide }));
  river.frustumCulled = false;
  group.add(river);

  // 강이 흐르는 쪽을 보여 주는 물방울
  const dots = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x1e6fa8, roughness: 0.3 }), FLOW_DOTS);
  dots.frustumCulled = false;
  group.add(dots);
  const m4 = new THREE.Matrix4();

  // 강 위의 정지 화살표: 바다 쪽(물이 흐르는 쪽)을 가리킨다. 계산이 끝나 움직임이 멈춰도 보인다.
  const ARROWS = 9;
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(1, 0); arrowShape.lineTo(-1, 1); arrowShape.lineTo(-0.35, 0); arrowShape.lineTo(-1, -1); arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  arrowGeo.rotateX(-Math.PI / 2);
  const arrows = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xf2fbff, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), ARROWS);
  arrows.frustumCulled = false;
  const arrowAt = Array.from({ length: ARROWS }, (_, k) => Math.floor((inBlock.length - 1) * (0.04 + 0.88 * (k / (ARROWS - 1)))));
  group.add(arrows);
  const rot = new THREE.Matrix4(), scl = new THREE.Matrix4().makeScale(3.6, 1, 2.1);

  // 바다: 강 끝의 높이(침식 기준면)를 보여 준다.
  const sea = new THREE.Mesh(new THREE.BoxGeometry(SEA_WIDTH, 1, N), new THREE.MeshStandardMaterial({ color: 0x276fa8, roughness: 0.3 }));
  sea.position.set(CENTER + SEA_WIDTH / 2 - 1, 0, 0);
  group.add(sea);
  const seaBase = new THREE.Mesh(new THREE.BoxGeometry(SEA_WIDTH, 1, N), new THREE.MeshBasicMaterial({ color: 0x3d372f }));
  seaBase.position.set(CENTER + SEA_WIDTH / 2 - 1, 0, 0);
  group.add(seaBase);

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
    const { h, age, bed, lifted, count, seaLevel } = model;
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
    inBlock.forEach((p, s) => {
      const y = bed[p.s] + 0.62;
      riverPos[s * 6 + 1] = y; riverPos[s * 6 + 4] = y;
    });
    riverGeo.attributes.position.needsUpdate = true;
    riverGeo.computeVertexNormals();
    arrowAt.forEach((i, k) => {
      const p = inBlock[i];
      rot.makeRotationY(-p.th).multiply(scl);
      rot.setPosition(p.x - CENTER, bed[p.s] + 0.62 + 0.12, p.y - CENTER);
      arrows.setMatrixAt(k, rot);
    });
    arrows.instanceMatrix.needsUpdate = true;
    // 바다 높이
    sea.scale.y = 1.2; // 윗면이 강물 띠(바닥 위 0.62)와 같은 높이라 하구에서 이어진다
    sea.position.y = seaLevel;
    seaBase.scale.y = Math.max(0.01, seaLevel - 0.6 - BOTTOM);
    seaBase.position.y = BOTTOM + seaBase.scale.y / 2;
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
    const { bed, clock } = model, L = inBlock.length;
    for (let d = 0; d < FLOW_DOTS; d++) {
      const f = ((d / FLOW_DOTS) + clock * 0.03) % 1;
      const p = inBlock[Math.min(L - 1, Math.floor(f * L))];
      const off = Math.sin(d * 12.9) * CHANNEL * 0.45;
      m4.makeScale(0.55, 0.28, 0.55);
      m4.setPosition(p.x - Math.sin(p.th) * off - CENTER, bed[p.s] + 0.75, p.y + Math.cos(p.th) * off - CENTER);
      dots.setMatrixAt(d, m4);
    }
    dots.instanceMatrix.needsUpdate = true;
  }

  return { group, syncTerrain, syncFlow, arrowCount: ARROWS };
}
