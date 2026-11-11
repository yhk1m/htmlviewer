// © 2026 김용현
// 감입 곡류와 하안 단구 형성 모형 화면. 계산은 model.js가 하고, 여기서는 그 결과를 3D 블록과 단면으로 그린다.
import { createProgressBar } from '../../shared/progress.js';
import * as THREE from 'three';
import { OrbitControls } from '../../shared/vendor/OrbitControls.js';
import { isPhone, portraitZoom } from '../../shared/viewport.js';
import { setupPanel } from '../../shared/panel.js';
import { QUALITY, currentQuality, setupQualityButton } from '../../shared/quality.js';
import { createFpsMeter } from '../../shared/fps.js';
import { drawContourMap } from '../../shared/map-views.js';
import { createLabelLayer } from '../../shared/labels.js';
import { setupPivot } from '../../shared/pivot.js';
import { createModel, sectionProfile, N, OPTIONS } from './model.js';
import { createBlock } from './block.js';
import { createSchematic } from './schematic.js';
import { figPalette, isDark, bg3d } from '../../shared/theme.js';

const QUALITY_NAME = currentQuality(isPhone()), Q = QUALITY[QUALITY_NAME];
const meter = createFpsMeter();
const model = createModel();
const CENTER = N / 2;
const KOR = ['', '한', '두', '세'];
// 조건 종류: 땅이 솟음(uplift), 해수면이 낮아짐(sea), 둘 다(both), 아무 변화 없음(still)
const kindFor = m => {
  const up = OPTIONS.uplift[m.options.uplift] > 0, sea = OPTIONS.sea[m.options.sea] > 0;
  return up && sea ? 'both' : up ? 'uplift' : sea ? 'sea' : 'still';
};
const kindOf = () => kindFor(model);
// 아무 변화가 없으면 아무것도 파이지 않으므로 파고든 횟수는 0이다.
const dugOf = m => (kindFor(m) === 'still' ? 0 : m.risen);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, Q.pixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
document.getElementById('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(bg3d());
addEventListener('themechange', () => { scene.background.set(bg3d()); frameSync(true); });
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 3000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.48;
controls.addEventListener('change', () => { dirty = true; });
controls.minDistance = 40;
controls.maxDistance = 2000;

const VIEWS = {
  oblique: { p: [-102, 643, 544], t: [11, 0, 16] },
  above: { p: [0, 720, 60], t: [0, 0, 0] },
  compare: { p: [0, 600, 800], t: [0, 4, 20] },
};
let viewNow = 'oblique';
function setView(name) {
  viewNow = name;
  const z = portraitZoom();
  let p, t;
  if (name === 'valley') {
    // 골짜기 시점: 단면 자리의 강을 앞에서 바라보아 양쪽 계단이 마주 보이게 한다.
    const s = model.section, c = model.path[s.s];
    t = [c.x - CENTER, model.sample(c.x, c.y) + 8, c.y - CENTER];
    // 강을 따라 물러나되, 항상 블록 앞쪽(+z)에서 바라본다.
    const back = Math.sin(c.th) >= 0 ? 1 : -1;
    p = [t[0] + Math.cos(c.th) * 215 * back, t[1] + 185, t[2] + Math.sin(c.th) * 215 * back];
  } else ({ p, t } = VIEWS[name]);
  camera.position.set(t[0] + (p[0] - t[0]) * z, t[1] + (p[1] - t[1]) * z, t[2] + (p[2] - t[2]) * z);
  controls.target.set(...t);
  controls.update();
  dirty = true;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === name));
}

scene.add(new THREE.HemisphereLight(0xdfe9f5, 0x54493c, 1.2));
const sun = new THREE.DirectionalLight(0xfff1dd, 2.7);
sun.position.set(-210, 150, -120);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(Math.min(Q.shadow, 2048));
Object.assign(sun.shadow.camera, { left: -210, right: 210, top: 210, bottom: -210, near: 10, far: 800 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.8;
scene.add(sun);

const blockA = createBlock(model);
scene.add(blockA.group);
const COMPARE_GAP = (N + 14) / 2;
const modelB = createModel();
const blockB = createBlock(modelB);
blockB.group.visible = false;
scene.add(blockB.group);
let compare = false, panelBeforeCompare = false, setPanel = () => {};

const mapView = document.getElementById('mapView');
let showing = '3d';
const drawMap = () => {
  mapView.hidden = showing === '3d';
  dirty = true;
  if (showing === 'map') drawContourMap(mapView, { h: model.h, N, sizeM: null, water: model.mask, north: false });
};
const setShowing = name => {
  showing = name;
  document.querySelectorAll('[data-show]').forEach(o => o.classList.toggle('on', o.dataset.show === name));
  document.body.classList.toggle('show-map', name !== '3d');
  drawMap();
};
document.querySelectorAll('[data-show]').forEach(b => b.onclick = () => setShowing(b.dataset.show));

// 이름표
const labels = createLabelLayer(document.getElementById('labels'));
labels.add('river', '감입 곡류');
labels.add('lateral', '측방 침식', '', 'water');
labels.add('down', '하방 침식', '', 'water');
labels.add('free', '자유 곡류');
labels.add('plain', '범람원');
labels.add('old', '옛 범람원');
// 두 번 이상 솟으면 맨 위 면은 가장 높은 단구면이기도 하다. 좁은 화면에서는 설명 글(span)이 숨겨지고 이름만 남는다.
labels.add('oldTop', '옛 범람원', '가장 높은 단구면');
labels.add('tread1', '단구면 (오래됨)');
labels.add('tread2', '단구면 (새로움)');
labels.add('tread', '단구면');
labels.add('scarp', '단구애');
labels.add('floor', '지금 범람원');
labels.add('neck', '목');
labels.add('coreHill', '미앤더 핵');
labels.add('oldChannel', '구하도');
labels.add('shortcut', '신하도(지름길)', '', 'water');
labels.add('upstream', '상류', '', 'water');
labels.add('downstream', '하류로 이어짐', '', 'water');
labels.add('a', 'A', '', 'mark');
labels.add('b', 'B', '', 'mark');
labels.add('left', '한 번 솟음', '', 'cmp');
labels.add('right', '세 번 솟음', '', 'cmp');

const v3 = new THREE.Vector3();
const toScreen = (x, y, z, block = blockA) => {
  v3.set(x - CENTER + block.group.position.x, y, z - CENTER).project(camera);
  return v3.z > 1 ? null : { x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight };
};
// 그 자리의 강이 실제로 파였는지: 양쪽 14칸 바깥의 땅보다 3 넘게 낮아졌을 때. 처음 상태의 작은 높낮이는 파인 것이 아니다.
function isDug(x, y) {
  const s = model.near[Math.round(y) * N + Math.round(x)], th = model.path[s].th;
  const nx = -Math.sin(th), ny = Math.cos(th);
  const rim = Math.max(model.sample(x + nx * 14, y + ny * 14), model.sample(x - nx * 14, y - ny * 14));
  return rim - model.sample(x, y) > 3;
}
let labelsOn = true, spotCache = null, spotFrame = -99;
// 측방 침식 이름표 자리. 물이 닿은 지점을 따라가되 다른 굽이로 넘어갈 때 튀지 않게 천천히 옮긴다.
let lateralAt = null;
const DOWN_AT = 0.72; // 하방 침식 이름표를 놓을 강의 위치(강 길이의 비율). 파고듦이 먼저 닿는 아래쪽이다.
function syncLabels() {
  if (showing !== '3d' || !labelsOn) { labels.place([]); return; }
  // 멈춘 동안 시점을 바꾸면 그리기 전에 여기로 오므로 카메라 행렬을 먼저 맞춘다. 안 그러면 이름표가 화면 밖으로 사라진다.
  camera.updateMatrixWorld();
  if (!spotCache || frame - spotFrame >= 20) { spotCache = model.spots(); spotFrame = frame; }
  const p = spotCache, list = [];
  const put = (key, x, y, z, priority, keep = true) => { const s = toScreen(x, y, z); if (s) list.push({ key, ...s, priority, keep }); };
  if (compare) {
    const s = toScreen(CENTER, -12, N + 10, blockA), q = toScreen(CENTER, -12, N + 10, blockB);
    if (s) list.push({ key: 'left', ...s, priority: 6, keep: true });
    if (q) list.push({ key: 'right', ...q, priority: 6, keep: true });
    labels.place(list);
    return;
  }
  const still = kindOf() === 'still';
  // 그 자리가 실제로 파인 뒤에만 파인 땅의 이름을 붙인다. 해수면 조건에서는 하류부터 파이므로 위쪽은 한동안 자유 곡류다.
  const dug = !still && isDug(p.river.x, p.river.y);
  put(dug ? 'river' : 'free', p.river.x, model.sample(p.river.x, p.river.y) + 3, p.river.y, 10);
  if (still) { if (p.old) put('plain', p.old.x, model.sample(p.old.x, p.old.y) + 3, p.old.y, 8); }
  else {
    if (dug && p.old) put(p.treads.length >= 1 ? 'oldTop' : 'old', p.old.x, model.sample(p.old.x, p.old.y) + 3, p.old.y, 8, !model.streams);
    if (p.treads.length === 1) put('tread', p.treads[0].x, model.sample(p.treads[0].x, p.treads[0].y) + 3, p.treads[0].y, 9);
    if (p.treads.length >= 2) {
      put('tread1', p.treads[0].x, model.sample(p.treads[0].x, p.treads[0].y) + 3, p.treads[0].y, 9);
      put('tread2', p.treads[1].x, model.sample(p.treads[1].x, p.treads[1].y) + 3, p.treads[1].y, 9);
    }
    if (p.scarp && p.treads.length) put('scarp', p.scarp.x, model.sample(p.scarp.x, p.scarp.y) + 3, p.scarp.y, 9);
    if (p.floor && model.finished) put('floor', p.floor.x, model.sample(p.floor.x, p.floor.y) + 2, p.floor.y, 7, false);
    // 지금 일어나는 침식의 이름은 실제로 일어나는 자리에 붙인다.
    const touch = model.phase === 'widen' ? model.contact() : null;
    if (touch) {
      lateralAt = lateralAt ?? { x: touch.x, y: touch.y };
      lateralAt.x += (touch.x - lateralAt.x) * 0.25; lateralAt.y += (touch.y - lateralAt.y) * 0.25;
    } else if (model.phase !== 'widen') lateralAt = null;
    if (lateralAt) put('lateral', lateralAt.x, model.sample(lateralAt.x, lateralAt.y) + 4, lateralAt.y, 11);
    if (model.phase === 'cut') {
      const s = Math.floor(model.path.length * DOWN_AT), a = model.path[s];
      if (model.bed[s] > model.z0[s] + model.seaLevel + 0.3) put('down', a.x, model.bed[s] + 3, a.y, 11);
    }
    // 미앤더 핵 조건: 그 일이 일어난 뒤에만 이름을 붙인다.
    if (model.streams) {
      const at = (key, q, up, priority) => put(key, q.x, model.sample(q.x, q.y) + up, q.y, priority);
      if (!model.severed && dug) at('neck', p.neck, 4, 12);
      if (model.severed) at('shortcut', p.shortcut, 3, 12);
      if (model.severed && model.phase !== 'cutoff') { at('coreHill', p.core, 3, 13); at('oldChannel', p.oldChannel, 3, 12); }
    }
  }
  // 강은 블록 밖으로 이어진다. 바다는 훨씬 하류에 있어 이 블록에 없다.
  const up = model.path.find(a => a.x >= 2), downAt = model.path.findLast(a => a.x <= N - 3);
  put('upstream', up.x, model.sample(up.x, up.y) + 2, up.y, 3);
  put('downstream', downAt.x, model.sample(downAt.x, downAt.y) + 2, downAt.y, 3);
  const S = model.section;
  put('a', S.ax, model.sample(S.ax, S.ay) + 1, S.ay, 5, false);
  put('b', S.bx, model.sample(S.bx, S.by) + 1, S.by, 5, false);
  labels.place(list);
}

// 실시간 단면: 계산이 깎은 격자를 그대로 읽어 그린다.
function drawSection(canvas, m) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, samples = 280;
  const { top, rock, age } = sectionProfile(m, samples);
  if (m.core) { drawCoreSection(ctx, m, W, H, samples, top, rock); return; }
  // 세로 배율: 끝까지 솟았을 때의 가장 높은 땅이 위쪽 이름 자리를 남기고 들어오도록 조건마다 정한다.
  const floorY = H - 34, lower = (OPTIONS.uplift[m.options.uplift] + OPTIONS.sea[m.options.sea]) * m.count;
  const VE = Math.min(6.2, (floorY - 120) / (18 + lower));
  const yOf = v => floorY - (v + 12 - m.seaLevel) * VE;
  const x = t => (t / (samples - 1)) * W;
  const P = figPalette(), DK = isDark();
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H); ctx.save(); ctx.strokeStyle = P.frame; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1); ctx.restore();
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let t = 0; t < samples; t++) ctx.lineTo(x(t), yOf(rock[t]));
  ctx.lineTo(W, H); ctx.closePath();
  ctx.fillStyle = '#5a5249'; ctx.fill();
  // 자갈층: 땅 높이와 기반암 높이의 차이
  ctx.fillStyle = '#c9b178';
  for (let t = 0; t < samples - 1; t++) {
    if (top[t] - rock[t] < 0.15) continue;
    ctx.fillRect(x(t), yOf(top[t]), W / samples + 1, Math.max(1, (top[t] - rock[t]) * VE));
  }
  // 강물
  const riverY = yOf(m.bed[m.section.s] + 0.62);
  let lowT = 0;
  top.forEach((v, t) => { if (v < top[lowT]) lowT = t; });
  let a = lowT, b = lowT;
  while (a > 0 && top[a - 1] < m.bed[m.section.s] + 0.62) a--;
  while (b < samples - 1 && top[b + 1] < m.bed[m.section.s] + 0.62) b++;
  ctx.fillStyle = '#59b7f0';
  ctx.fillRect(x(a), riverY, Math.max(4, x(b) - x(a)), Math.max(3, yOf(top[lowT]) - riverY + 1));
  // 계산이 기록한 면의 나이로 이름을 붙인다.
  ctx.font = '700 23px "Malgun Gothic",sans-serif'; ctx.textAlign = 'center';
  const runs = [];
  for (let t = 1; t < samples;) {
    const q = age[t];
    let e = t;
    while (e + 1 < samples && age[e + 1] === q) e++;
    if (q >= 0 && e - t >= 8) runs.push({ q, from: t, to: e });
    t = e + 1;
  }
  // 이 단면에 실제로 파인 면이 있어야 이름을 바꾼다. 가장 새 면이 지금 범람원이다.
  const carved = Math.max(top[0], top[samples - 1]) - top[lowT] > 3;
  const presentMax = carved ? runs.reduce((a, r) => Math.max(a, r.q), 0) : 0;
  const names = q => (presentMax === 0 ? '범람원' : q === 0 ? (presentMax >= 2 ? '옛 범람원 (가장 높은 단구면)' : '옛 범람원') : q >= presentMax ? '지금 범람원' : '단구면');
  // A와 B 글자 자리는 비워 둔다.
  const used = [{ x: 18, y: 32, w: 34 }, { x: W - 18, y: 32, w: 34 }];
  const say = (text, cx, cy, color) => {
    const w = ctx.measureText(text).width;
    cx = Math.min(W - w / 2 - 4, Math.max(w / 2 + 4, cx));
    while (used.some(u => Math.abs(u.x - cx) < (u.w + w) / 2 + 6 && Math.abs(u.y - cy) < 26)) cy -= 28;
    used.push({ x: cx, y: cy, w });
    ctx.fillStyle = color; ctx.fillText(text, cx, cy);
  };
  for (const r of runs) {
    let a = r.from, b = r.to;
    // 강이 지나는 면은 강을 피해 더 긴 쪽 가운데에 이름을 붙인다.
    if (a <= lowT && lowT <= b) { if (lowT - a >= b - lowT) b = lowT - 3; else a = lowT + 3; if (b - a < 8) continue; }
    const mid = (a + b) >> 1;
    say(names(r.q), x(mid), yOf(top[mid]) - 10, r.q > 0 && r.q < presentMax ? P.hi : P.ink);
  }
  // 가장 가파른 벽 하나에 단구애 이름을 붙인다. 단구면이 있을 때만.
  if (runs.some(r => r.q > 0 && r.q < presentMax)) {
    let bestT = -1, bestV = 1.2;
    for (let t = 4; t < samples - 4; t++) {
      const s = Math.abs(top[t + 3] - top[t - 3]);
      if (age[t] === -1 && top[t] > top[lowT] + 12 && s > bestV) { bestV = s; bestT = t; }
    }
    if (bestT > 0) {
      const off = bestT < samples * m.section.riverAt ? -44 : 44;
      say('단구애', x(bestT) + off, yOf(top[bestT]) + 8, (DK ? '#f3a58a' : '#b4471c'));
    }
  }
  ctx.fillStyle = P.hi; ctx.font = '700 26px "Malgun Gothic",sans-serif';
  ctx.textAlign = 'center'; ctx.fillText('A', 18, 32); ctx.fillText('B', W - 18, 32);
  // 라이트 모드에서는 땅 위에 깔린 설명 글이 묻히지 않게 아래에 밝은 띠를 깐다.
  if (!DK) { ctx.fillStyle = P.bg; ctx.fillRect(1, H - 38, W - 2, 37); ctx.fillStyle = P.frame; ctx.fillRect(1, H - 38, W - 2, 1); }
  ctx.fillStyle = P.ink; ctx.font = '700 19px "Malgun Gothic",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('기반암', 14, H - 12);
  ctx.fillStyle = '#c9b178'; ctx.fillRect(96, H - 26, 16, 12);
  ctx.fillStyle = P.ink; ctx.fillText('자갈층', 118, H - 12);
  ctx.textAlign = 'left';
}

// 미앤더 핵 조건의 단면: 물이 있는 곳을 모두 칠하고, 정해 둔 자리에 이름을 적는다.
function drawCoreSection(ctx, m, W, H, samples, top, rock) {
  const floorY = H - 34, lower = OPTIONS.uplift[m.options.uplift] * m.count;
  const VE = Math.min(6.2, (floorY - 120) / (18 + lower));
  const yOf = v => floorY - (v + 12) * VE, x = t => (t / (samples - 1)) * W;
  const S = m.section;
  const P = figPalette(), DK = isDark();
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H); ctx.save(); ctx.strokeStyle = P.frame; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1); ctx.restore();
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let t = 0; t < samples; t++) ctx.lineTo(x(t), yOf(rock[t]));
  ctx.lineTo(W, H); ctx.closePath();
  ctx.fillStyle = '#5a5249'; ctx.fill();
  ctx.fillStyle = '#c9b178';
  for (let t = 0; t < samples - 1; t++) {
    if (top[t] - rock[t] < 0.15) continue;
    ctx.fillRect(x(t), yOf(top[t]), W / samples + 1, Math.max(1, (top[t] - rock[t]) * VE));
  }
  // 강물: 격자의 물 표시를 그대로 읽는다. 끊긴 옛 고리에는 물이 없다.
  ctx.fillStyle = '#59b7f0';
  for (let t = 0; t < samples; t++) {
    const f = t / (samples - 1), px = S.ax + (S.bx - S.ax) * f, py = S.ay + (S.by - S.ay) * f;
    const k = Math.round(py) * N + Math.round(px);
    if (m.mask[k] > 0.4) {
      // 잘린 뒤 지금 강에서 먼 물은 말라 가는 옛 고리의 물이다. 그 자리 땅 바로 위에 칠한다.
      const level = m.severed && m.dist[k] > 8 ? top[t] + 0.5 : Math.max(m.bed[m.near[k]] + 0.62, top[t] + 0.3);
      ctx.fillRect(x(t), yOf(level), W / samples + 1, Math.max(3, (level - top[t]) * VE));
    }
  }
  ctx.font = '700 23px "Malgun Gothic",sans-serif'; ctx.textAlign = 'center';
  const used = [{ x: 18, y: 32, w: 34 }, { x: W - 18, y: 32, w: 34 }];
  const say = (text, f, color, gap = 12) => {
    const t = Math.round(f * (samples - 1)), wd = ctx.measureText(text).width, cx = Math.min(W - wd / 2 - 4, Math.max(wd / 2 + 4, x(t)));
    let cy = yOf(top[t]) - gap;
    while (used.some(u => Math.abs(u.x - cx) < (u.w + wd) / 2 + 6 && Math.abs(u.y - cy) < 26)) cy -= 28;
    used.push({ x: cx, y: cy, w: wd });
    ctx.fillStyle = color; ctx.fillText(text, cx, cy);
  };
  const { ringA, core, ringB, river } = S.marks, dry = m.severed && m.phase !== 'cutoff';
  if (dry) {
    say('미앤더 핵', core, P.hi);
    say('구하도', ringA, (DK ? '#f3a58a' : '#b4471c')); say('구하도', ringB, (DK ? '#f3a58a' : '#b4471c'));
    say('지금 강', river, (DK ? '#8fd6ff' : '#1d5f9e'), 22);
    say('옛 범람원', 0.03, P.ink);
  } else if (m.phase !== 'free') {
    say('언덕', core, P.ink);
    say('강', ringA, (DK ? '#8fd6ff' : '#1d5f9e'), 22); say('강', ringB, (DK ? '#8fd6ff' : '#1d5f9e'), 22); say('강', river, (DK ? '#8fd6ff' : '#1d5f9e'), 22);
    say('옛 범람원', 0.03, P.ink);
  } else {
    say('범람원', core, P.ink);
  }
  ctx.fillStyle = P.hi; ctx.font = '700 26px "Malgun Gothic",sans-serif';
  ctx.textAlign = 'center'; ctx.fillText('A', 18, 32); ctx.fillText('B', W - 18, 32);
  // 라이트 모드에서는 땅 위에 깔린 설명 글이 묻히지 않게 아래에 밝은 띠를 깐다.
  if (!DK) { ctx.fillStyle = P.bg; ctx.fillRect(1, H - 38, W - 2, 37); ctx.fillStyle = P.frame; ctx.fillRect(1, H - 38, W - 2, 1); }
  ctx.fillStyle = P.ink; ctx.font = '700 19px "Malgun Gothic",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('기반암', 14, H - 12);
  ctx.fillStyle = '#c9b178'; ctx.fillRect(96, H - 26, 16, 12);
  ctx.fillStyle = P.ink; ctx.fillText('자갈층', 118, H - 12);
}

const noteEl = document.getElementById('now');
// 조건에 맞게 부르는 말
const WORDS = {
  uplift: { before: '땅이 솟기 전', stop: '땅이 멈춘 동안', first: '땅이 솟아오릅니다. 강은 높아진 만큼 아래로 파고듭니다(하방 침식). 굽이 모양을 지킨 채 깊은 골짜기 속을 흐르게 되니, 이것이 감입 곡류입니다.', again: '땅이 다시 솟습니다. 강이 또 파고들면 전의 골짜기 바닥이 높은 곳에 남습니다. 이것이 단구면이고, 그 앞의 가파른 경사가 단구애입니다.' },
  sea: { before: '멀리 하류의 해수면이 낮아지기 전', stop: '해수면이 멈춘 동안', first: '멀리 하류의 바다 해수면이 낮아지면 강의 침식 기준면이 낮아져, 하류부터 위쪽으로 차례로 파고듭니다. 강의 굽이는 그대로입니다.', again: '멀리 하류의 해수면이 또 낮아졌습니다. 강이 다시 파고들면 전의 골짜기 바닥이 높은 곳에 남습니다. 이것이 단구면이고, 그 앞의 가파른 경사가 단구애입니다.' },
  both: { before: '땅이 솟거나 해수면이 낮아지기 전', stop: '땅과 해수면이 멈춘 동안', first: '땅이 솟거나 해수면이 낮아져 강이 아래로 파고듭니다(하방 침식). 굽이 모양을 지킨 채 깊은 골짜기 속을 흐르게 되니, 이것이 감입 곡류입니다.', again: '땅이 다시 솟거나 해수면이 또 낮아집니다. 강이 또 파고들면 전의 골짜기 바닥이 높은 곳에 남습니다. 이것이 단구면이고, 그 앞의 가파른 경사가 단구애입니다.' },
};
// 미앤더 핵 조건의 단계별 설명
const CORE_NOTES = {
  free: '땅이 솟기 전입니다. 강이 넓은 범람원 위를 크게 굽이치며 고리를 이룹니다. 고리의 밑동은 목처럼 좁습니다.',
  cut1: '땅이 솟자 강이 고리 모양 그대로 아래로 파고듭니다(하방 침식). 고리 전체가 깊은 골짜기에 갇힌 감입 곡류가 됩니다.',
  widen: '땅이 멈춘 동안 강이 벽을 때려 깎습니다(측방 침식). 목의 양쪽에서 물이 파고드니 목이 점점 얇아집니다. 물이 닿은 곳만 깎입니다.',
  cutoff: '목이 잘렸습니다(목 절단). 양쪽의 물이 만나 잘린 곳으로 흐르기 시작합니다. 이 지름길이 신하도입니다.',
  drain: '물이 짧은 지름길로 몰리자 옛 고리에는 물이 끊깁니다. 옛 물길의 평탄한 바닥과 자갈층만 남으니, 이것이 구하도입니다.',
  cut2: '땅이 다시 솟습니다. 새 물길만 더 깊이 파고들고, 물이 없는 구하도는 그 높이 그대로 지금 강보다 높은 곳에 남습니다.',
  widen2: '땅이 멈추자 지금 강이 좌우로 옮겨 다니며 새 골짜기 바닥을 조금 넓힙니다. 물이 닿지 않는 구하도는 그대로 남습니다.',
  done: '미앤더 핵이 완성되었습니다. 구하도와 신하도 사이에 섬처럼 남은 언덕이 미앤더 핵(곡류핵)입니다. 구하도 바닥은 지금 강보다 높고, 자갈층이 옛날에 강이 흐른 곳임을 알려 줍니다.',
};
const CORE_STEPS = { free: '고리 모양 곡류', cut1: '첫 번째 솟음', widen: '목이 좁아지는 중', cutoff: '목 절단', drain: '물이 빠지는 중', cut2: '두 번째 솟음', widen2: '지금 강의 바닥이 넓어지는 중', done: '미앤더 핵 완성' };
const corePhase = m => (m.phase === 'cut' ? (m.severed ? 'cut2' : 'cut1') : m.phase === 'widen' && m.severed ? 'widen2' : m.phase);
// 모식도 단계: 0은 목 좁아짐, 1은 목 절단, 2는 미앤더 핵
const coreStage = m => (!m.severed ? 0 : m.phase === 'cutoff' ? 1 : 2);
function noteText(m = model) {
  if (m.core) return CORE_NOTES[corePhase(m)];
  const kind = kindFor(m);
  if (kind === 'still') return '땅도 해수면도 그대로라 강이 파고들지 않고 자유 곡류로 남습니다.';
  const w = WORDS[kind];
  if (m.phase === 'free') return `${w.before}입니다. 강은 넓은 범람원 위를 자유롭게 굽이쳐 흐릅니다. 이것이 자유 곡류입니다.`;
  if (m.phase === 'cut') return m.risen === 1 ? w.first : w.again;
  if (m.phase === 'widen') return `${w.stop} 강이 좌우로 옮겨 다니며 사면 아래를 때려 깎습니다(측방 침식). 물이 닿은 곳만 깎이고, 물이 떠난 자리에는 자갈이 쌓여 바닥이 넓어집니다.`;
  // 완성: 두세 문장. n번 파고들면 지금 범람원 위로 n층의 면이 남는다. 맨 위는 옛 범람원(가장 높은 단구면)이다.
  if (m.count === 1) return '감입 곡류가 완성되었습니다. 강이 곡류 모양 그대로 파고들었고, 옛 범람원이 강 양옆의 높은 평탄면으로 남았습니다.';
  return `하안 단구가 완성되었습니다. ${KOR[m.count]} 번 파고들어 계단이 ${KOR[m.count]} 층 남았습니다. 맨 위는 옛 범람원(가장 높은 단구면)이고, 높은 면일수록 오래되었습니다.`;
}
// 비교 중에는 블록마다 지금 상태를 한 문장으로 적는다.
function brief(m) {
  if (kindFor(m) === 'still') return '변화가 없어 강이 파고들지 않습니다';
  if (m.phase === 'free') return '아직 파고들기 전입니다';
  if (m.phase === 'cut') return '강이 파고드는 중입니다';
  if (m.phase === 'widen') return '강이 좌우로 옮겨 다니며 사면을 깎아 바닥을 넓히는 중입니다';
  return m.count === 1 ? '한 번 파고들어 감입 곡류가 되었고 계단은 없습니다' : `${KOR[m.count]} 번 파고들어 계단이 ${KOR[m.count]} 층 남았습니다`;
}
function stepsText() {
  if (model.core) return CORE_STEPS[corePhase(model)];
  const kind = kindOf();
  if (kind === 'still') return '변화 없음';
  const n = model.count;
  if (model.finished) return kind === 'sea' ? `해수면이 ${n}번 낮아져 완성` : kind === 'both' ? `${n}번 파고들어 완성` : `솟음 ${n}번으로 완성`;
  if (model.risen) return kind === 'sea' ? `낮아짐 ${model.risen}번째 (모두 ${n}번)` : kind === 'both' ? `${model.risen}번째 파고듦 (모두 ${n}번)` : `솟음 ${model.risen}번째 (모두 ${n}번)`;
  return WORDS[kind].before;
}
function syncInfo() {
  if (compare) {
    noteEl.textContent = `왼쪽 블록은 ${brief(model)}. 오른쪽 블록은 ${brief(modelB)}.`;
    document.getElementById('steps').textContent = '두 조건 비교';
    return;
  }
  noteEl.textContent = noteText();
  document.getElementById('steps').textContent = stepsText();
  document.getElementById('seaBadge').textContent = OPTIONS.sea[model.options.sea] > 0 ? '해수면 낮아짐' : '해수면: 그대로';
  const kind = kindOf();
  if (model.core) schematic.setStage(coreStage(model), 'core');
  else schematic.setStage(model.finished ? model.count : dugOf(model), kind);
}

// 조작
// 모식도 구역을 누르면 3D 이름표가 강조된다.
const ZONE_LABELS = { meander: ['river', 'free'], old: ['old', 'oldTop', 'plain'], tread: ['tread', 'tread1', 'tread2'], scarp: ['scarp'], floor: ['floor'], neck: ['neck'], core: ['coreHill'], oldChannel: ['oldChannel'], shortcut: ['shortcut'] };
const highlight = zone => {
  for (const [z, keys] of Object.entries(ZONE_LABELS)) for (const k of keys) labels.element(k).classList.toggle('hi', z === zone);
  dirty = true;
};
const schematic = createSchematic(document.getElementById('schem'), { onZone: highlight });
let playing = true, speed = 1, dirty = true;
const dock = () => (isPhone() ? 0 : document.getElementById('side').offsetWidth);
const panelW = () => (isPhone() || document.body.classList.contains('panel-closed') ? 0 : document.getElementById('panel').offsetWidth + 20);
const sheet = () => (isPhone() ? document.getElementById('side').offsetHeight : 0);
function fit() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  camera.setViewOffset(innerWidth, innerHeight, (dock() - panelW()) / 2, sheet() / 2, innerWidth, innerHeight);
  drawMap();
  dirty = true;
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); fit(); });
const playBtn = document.getElementById('playBtn');
const setPlaying = on => { playing = on; playBtn.textContent = on ? '멈춤' : '재생'; playBtn.classList.toggle('on', on); };
playBtn.onclick = () => setPlaying(!playing);
const restart = () => { document.body.classList.toggle('core-mode', !!model.core); spotCache = null; settle = 0; lateralAt = null; if (viewNow === 'valley') setView('valley'); frameSync(true); setPlaying(true); };
document.getElementById('resetBtn').onclick = () => { model.reset(); if (compare) modelB.reset(); restart(); };
// 진행 막대: 누르거나 끌면 그 시점까지 처음부터 다시 계산해 옮긴다.
const progress = createProgressBar(document.getElementById('progHost'), {
  clock: () => model.clock, total: () => model.totalSeconds, finished: () => model.finished,
  reset: () => { model.reset(); if (compare) modelB.reset(); },
  step: dt => { model.tick(dt); if (compare) modelB.tick(dt); },
  pause: () => { const w = playing; setPlaying(false); return w; },
  resume: w => { spotCache = null; settle = 0; lateralAt = null; if (viewNow === 'valley') setView('valley'); frameSync(true); setPlaying(w); },
});
document.getElementById('fastBtn').onclick = e => { speed = speed === 1 ? 3 : 1; e.currentTarget.classList.toggle('on', speed === 3); e.currentTarget.textContent = speed === 3 ? '3배 빠르게' : '빠르게'; };
document.getElementById('labelsBtn').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('on', labelsOn); dirty = true; };
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(compare && b.dataset.view === 'oblique' ? 'compare' : b.dataset.view));
document.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => {
  const [name, val] = b.dataset.opt.split(':');
  model.setOption(name, val);
  model.reset();
  document.querySelectorAll(`[data-opt^="${name}:"]`).forEach(o => o.classList.toggle('on', o === b));
  document.querySelectorAll('[data-preset]').forEach(o => o.classList.remove('on'));
  restart();
});
const markOptions = () => document.querySelectorAll('[data-opt]').forEach(o => {
  const [name, val] = o.dataset.opt.split(':');
  o.classList.toggle('on', model.options[name] === val);
});
document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
  model.applyPreset(b.dataset.preset);
  markOptions();
  document.querySelectorAll('[data-preset]').forEach(o => o.classList.toggle('on', o === b));
  restart();
});

// 두 조건 비교: 왼쪽은 한 번 솟음, 오른쪽은 세 번 솟음. 같은 강에서 시작한다. 끝내면 비교 전에 고른 조건으로 돌아간다.
let before = null;
function setCompare(on) {
  if (on === compare) return;
  compare = on;
  blockB.group.visible = on;
  blockA.group.position.x = on ? -COMPARE_GAP : 0;
  blockB.group.position.x = COMPARE_GAP;
  const e = on ? 350 : 210;
  Object.assign(sun.shadow.camera, { left: -e, right: e, top: e, bottom: -e });
  sun.shadow.camera.updateProjectionMatrix();
  document.body.classList.toggle('comparing', on);
  if (on) {
    before = { options: { ...model.options }, preset: document.querySelector('[data-preset].on')?.dataset.preset ?? null };
    panelBeforeCompare = document.body.classList.contains('panel-closed');
    setPanel(true);
  } else setPanel(panelBeforeCompare);
  document.getElementById('compareBtn').classList.toggle('on', on);
  document.getElementById('sectionB').hidden = !on;
  document.getElementById('compareCap').hidden = !on;
  if (on) { setShowing('3d'); model.applyPreset('once'); modelB.applyPreset('textbook'); }
  else {
    for (const [k, v] of Object.entries(before.options)) model.setOption(k, v);
    model.reset();
  }
  markOptions();
  document.querySelectorAll('[data-preset]').forEach(o => o.classList.toggle('on', !on && o.dataset.preset === before?.preset));
  setView(on ? 'compare' : 'oblique');
  restart();
}
document.getElementById('compareBtn').onclick = () => setCompare(!compare);
document.getElementById('compareEnd').onclick = () => setCompare(false);

let frame = 0;
function frameSync(all) {
  dirty = true;
  blockA.syncFlow();
  if (compare) blockB.syncFlow();
  if (all || frame % 2 === 0) { blockA.syncTerrain(); if (compare) blockB.syncTerrain(); }
  if (all || frame % 30 === 0) renderer.shadowMap.needsUpdate = true;
  if (all || frame % 6 === 0) { drawSection(document.getElementById('section'), model); if (compare) drawSection(document.getElementById('sectionB'), modelB); syncInfo(); }
  if (all || frame % 30 === 0) drawMap();
  syncLabels();
}
// 계산이 끝나면 그리기를 멈춘다. 시점을 돌릴 때만 다시 그린다.
const SETTLE_SECONDS = 0.3;
const busy = m => !m.finished;
let last = performance.now(), settle = 0, wasComputing = true;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  let computing = false;
  if (playing) {
    if (busy(model) || (compare && busy(modelB))) settle = 0; else settle += dt * speed;
    computing = settle < SETTLE_SECONDS;
  }
  if (computing) {
    let remain = dt * speed;
    while (remain > 0) { const s = Math.min(remain, 1 / 30); model.tick(s); if (compare) modelB.tick(s); remain -= s; }
    frame++;
    frameSync(false);
  } else if (wasComputing) {
    spotCache = null;
    frameSync(true);
  }
  wasComputing = computing;
  progress.update();
  if (!dirty) return;
  dirty = false;
  if (!computing) syncLabels();
  renderer.render(scene, camera);
  meter();
}

// 두 번 누르면 그 자리가 회전 중심이 된다. 그리기를 멈춘 뒤에도 깨워서 움직인다. 숨긴 비교 블록은 대상에서 저절로 빠진다.
const pivot = setupPivot(THREE, { dom: renderer.domElement, camera, controls, targets: () => [blockA.terrain, blockB.terrain], invalidate: () => { dirty = true; }, scene });
window.__PIVOT = { pivot, camera, controls, dom: renderer.domElement };

setView('oblique');
setPanel = setupPanel(document.getElementById('panelToggle'), fit, isPhone());
setupQualityButton(document.getElementById('qualityBtn'), QUALITY_NAME);
frameSync(true);
requestAnimationFrame(t => { last = t; loop(t); });

window.__MODEL = {
  progress, model, modelB, setView, setPlaying, setCompare,
  advance(seconds) { setPlaying(false); for (let t = 0; t < seconds * 30; t++) { model.tick(1 / 30); if (compare) modelB.tick(1 / 30); } spotCache = null; lateralAt = null; frameSync(true); renderer.render(scene, camera); return { clock: +model.clock.toFixed(1), phase: model.phase, risen: model.risen, finished: model.finished, spots: model.spots() }; },
  preset: n => document.querySelector(`[data-preset="${n}"]`).click(),
  setOption: (n, v) => document.querySelector(`[data-opt="${n}:${v}"]`).click(),
  draws: () => renderer.info.render.frame,
  section: () => model.section,
  arrowCount: () => blockA.arrowCount,
  labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
};
window.__APP_READY = true;
