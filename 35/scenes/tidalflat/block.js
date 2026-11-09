// © 2026 김용현
// 갯벌 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다. 계산은 하지 않고 model의 값을 그대로 그린다.
import * as THREE from 'three';
import { N, AXIS_X, DIKE_J, sectionLine as sectionXY } from './model.js';
import { gridIndex } from '../../shared/grid.js';

const CENTER = N / 2;
export const BOTTOM = -16;
export const VE = 1.3; // 그림에서 높이를 키우는 배율. 계산 값은 그대로다.
const SHEET = 128, ARROWS = 7;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
// 밀물과 썰물을 보이는 화살표 자리(만 입구에서 안쪽으로)
const ARROW_AT = [[AXIS_X - 54, 172], [AXIS_X, 176], [AXIS_X + 54, 172], [AXIS_X - 28, 150], [AXIS_X + 28, 150], [AXIS_X, 126], [AXIS_X + 6, 102]];

export function createBlock(model) {
  const group = new THREE.Group();
  group.scale.y = VE;
  const linear = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const C = {
    forest: linear('#46603a'), forest2: linear('#5a7346'), grass: linear('#8ea765'), rock: linear('#8a7f70'),
    sand: linear('#d9c595'), mix: linear('#a38f6b'), mud: linear('#5d5244'), creek: linear('#3c4a50'),
    reed: linear('#a7a35e'), red: linear('#a2414e'), dike: linear('#b9b4aa'), dry: linear('#a99c82'),
    paddy: linear('#86ad55'), paddy2: linear('#76a04a'), levee: linear('#c9c39a'), ditch: linear('#3d7fb0'),
    bed: linear('#b3a581'), deep: linear('#22384a'), river: linear('#3d8fc9'),
  };

  const pos = new Float32Array(N * N * 3), nor = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3), speckle = new Float32Array(N * N), patch = new Float32Array(N * N);
  {
    let seed = 5;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      pos[k * 3] = i - CENTER; pos[k * 3 + 2] = j - CENTER;
      speckle[k] = 0.93 + r() * 0.14;
      patch[k] = Math.sin(i * 0.13 + 1) * Math.sin(j * 0.11) * 0.5 + 0.5;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(gridIndex(N), 1));
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
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
  const waterSide = new THREE.Mesh(waterSideGeo, new THREE.MeshBasicMaterial({ color: 0x2f86c9, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
  waterSide.frustumCulled = false;
  waterSide.renderOrder = 1;
  group.add(waterSide);

  // 물: 바다와 갯벌 위의 물을 한 장으로 그린다. 밀물과 썰물에 맞춰 오르내린다. 방조제 안쪽은 따로 낮은 물 높이를 쓴다.
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
  const SHALLOW = linear('#86c9dc'), CLEAN = linear('#2f86c9'), DEEPW = linear('#1d5c94'), LAKE = linear('#3f8fb0');

  // 밀물(안으로)과 썰물(밖으로) 화살표
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(1, 0); arrowShape.lineTo(-1, 1); arrowShape.lineTo(-0.35, 0); arrowShape.lineTo(-1, -1); arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  arrowGeo.rotateX(-Math.PI / 2);
  const arrows = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }), ARROWS);
  arrows.frustumCulled = false; arrows.renderOrder = 4;
  group.add(arrows);
  const m4 = new THREE.Matrix4(), scl = new THREE.Matrix4();

  // 단면 위치
  const lineGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(120 * 3), 3));
  const sectionLine = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: 0xffd36b, dashSize: 3, gapSize: 2.4 }));
  sectionLine.frustumCulled = false;
  const lineDist = new Float32Array(120), lineDistAttr = new THREE.BufferAttribute(lineDist, 1);
  lineGeo.setAttribute('lineDistance', lineDistAttr);
  group.add(sectionLine);

  function paint(k) {
    const { h, start } = model, i = k % N, j = (k / N) | 0;
    pos[k * 3 + 1] = h[k];
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const dhx = h[ir] - h[il], dhz = h[jr] - h[jl], dx = dhx * 0.5 * VE, dz = dhz * 0.5 * VE, len = Math.hypot(dx, 1, dz);
    nor[k * 3] = -dx / len; nor[k * 3 + 1] = 1 / len; nor[k * 3 + 2] = -dz / len;
    const kind = model.cellKind(k), sp = speckle[k];
    let c;
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    switch (kind) {
      case 'land': {
        const above = h[k] - 4;
        c = mix(C.grass, C.forest, smooth(0.4, 3, above));
        c = mix(c, C.forest2, patch[k] * 0.4);
        c = mix(c, C.rock, smooth(0.9, 1.8, Math.hypot(dhx, dhz) / 2));
        break;
      }
      case 'river': c = C.river; break;
      case 'dike': c = C.dike; break;
      case 'sandflat': case 'mixflat': case 'mudflat': case 'creek': case 'marsh': {
        // 갯벌 빛은 겉흙의 펄 비율에 따라 모래색에서 짙은 갈색으로 부드럽게 바뀐다(종류 경계에 계단이 생기지 않게).
        const f = clamp((model.mud[k] - 0.25) / 0.55);
        c = f < 0.5 ? mix(C.sand, C.mix, f * 2) : mix(C.mix, C.mud, f * 2 - 2 * 0.5);
        // 염생 식물: 밀물 때 해수면 가까이 높아진 곳일수록 빽빽하다.
        if (model.isMarsh(k)) c = mix(c, model.isReed(k) ? mix(C.reed, C.grass, patch[k] * 0.35) : mix(C.red, C.mud, patch[k] * 0.3), 0.55 + 0.45 * smooth(model.amp() - model.marshBand(), model.amp() - 0.6 * model.marshBand(), model.plat[k]));
        // 갯골: 파인 깊이만큼 젖은 짙은 빛을 섞는다. 둑 쪽은 옅게.
        c = mix(c, C.creek, smooth(0.04, 0.5, model.cut[k]) * 0.9);
        break;
      }
      case 'dryflat': c = mix(C.dry, C.mud, 0.3); break;
      case 'ditch': c = C.ditch; break;
      case 'field': {
        // 반듯한 논배미와 논둑
        const levee = i % 10 === 0 || j % 7 === 0;
        c = levee ? C.levee : ((Math.floor(i / 10) + Math.floor(j / 7)) % 2 ? C.paddy : C.paddy2);
        break;
      }
      case 'lake': c = C.mud; break;
      default: {
        // 썰물 때도 잠긴 바다 바닥: 깊을수록 어둡다. 모래가 쌓인 곳은 밝다.
        const depth = -model.amp() - h[k];
        c = mix(mix(C.bed, C.sand, model.mud[k] < 0.4 ? 0.3 : 0), C.deep, smooth(0.5, 7, depth));
      }
    }
    for (let q = 0; q < 3; q++) col[k * 3 + q] = c[q] * sp;
  }

  function syncSheet() {
    const { h } = model;
    for (let j = 0; j < SN; j++) for (let i = 0; i < SN; i++) {
      const k = j * SN + i, c = Math.min(N - 1, Math.round(j * step)) * N + Math.min(N - 1, Math.round(i * step));
      const level = model.levelAt(c), d = level - h[c], inside = model.dikeAt >= 0 && model.inside[c] === 1;
      sPos[k * 3 + 1] = level;
      const a = smooth(0, 1.2, d), b = smooth(1.5, 6, d);
      for (let q = 0; q < 3; q++) { let v = SHALLOW[q] + (CLEAN[q] - SHALLOW[q]) * a; v += (DEEPW[q] - v) * b; if (inside) v = LAKE[q]; sCol[k * 4 + q] = v; }
      // 얕은 물은 갯벌이 비쳐 보이도록 옅게, 깊을수록 진하게
      sCol[k * 4 + 3] = d <= 0 ? 0 : smooth(0, 0.25, d) * (0.3 + 0.22 * a + 0.2 * b);
    }
    sGeo.attributes.position.needsUpdate = true;
    sGeo.attributes.color.needsUpdate = true;
    skirtPts.forEach(([i, j], s) => {
      const x = i - CENTER, z = j - CENTER, k = j * N + i, top = model.h[k], level = model.levelAt(k);
      waterSidePos.set([x, level, z, x, Math.min(top, level), z], s * 6);
    });
    waterSideGeo.attributes.position.needsUpdate = true;
  }

  let lastVersion = -1;
  function syncTerrain(force) {
    if (force || model.version !== lastVersion) {
      lastVersion = model.version;
      for (let k = 0; k < N * N; k++) paint(k);
      skirtPts.forEach(([i, j], s) => {
        const x = i - CENTER, z = j - CENTER, top = model.h[j * N + i];
        skirtPos.set([x, top, z, x, BOTTOM, z], s * 6);
      });
      skirtGeo.attributes.position.needsUpdate = true;
      geo.attributes.position.needsUpdate = true;
      geo.attributes.normal.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      syncSectionLine();
      return true;
    }
    return false;
  }

  function syncSectionLine() {
    const lp = lineGeo.attributes.position, S = sectionXY();
    for (let t = 0; t < 120; t++) {
      const f = t / 119, x = S.ax + (S.bx - S.ax) * f, y = S.ay + (S.by - S.ay) * f;
      lp.setXYZ(t, x - CENTER, model.sample(x, y) + 0.3, y - CENTER);
    }
    lp.needsUpdate = true;
    lineDist[0] = 0;
    for (let t = 1; t < 120; t++) lineDist[t] = lineDist[t - 1] + Math.hypot((lp.getY(t) - lp.getY(t - 1)) * VE, lp.getZ(t) - lp.getZ(t - 1));
    lineDistAttr.needsUpdate = true;
  }

  // 물 높이가 바뀔 때마다 부른다. 화살표는 밀물이면 만 안쪽으로, 썰물이면 바다 쪽으로 향한다.
  function syncWater() {
    syncSheet();
    let n = 0;
    if (model.range() >= 1) {
      const rising = model.rising();
      for (const [x, y] of ARROW_AT) {
        const k = y * N + x;
        if (model.dikeAt >= 0 && (model.inside[k] || Math.abs(y - DIKE_J) < 4)) continue;
        if (model.h[k] > model.sea - 0.3) continue; // 물이 빠진 곳에는 그리지 않는다.
        scl.makeScale(5, 1, 3.2);
        m4.makeRotationY(rising ? Math.PI / 2 : -Math.PI / 2).multiply(scl);
        m4.setPosition(x - CENTER, model.sea + 0.2, y - CENTER);
        arrows.setMatrixAt(n++, m4);
      }
    }
    for (let q = n; q < ARROWS; q++) { m4.makeScale(0, 0, 0); arrows.setMatrixAt(q, m4); }
    arrows.instanceMatrix.needsUpdate = true;
  }

  return { group, terrain, syncTerrain, syncWater };
}
