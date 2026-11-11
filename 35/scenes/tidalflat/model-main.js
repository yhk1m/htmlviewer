// © 2026 김용현
// 갯벌 형성 모형 화면. 계산은 model.js가 하고, 여기서는 그 결과를 3D 블록과 단면으로 그린다.
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
import { createModel, sectionProfile, noteText, flatReport, compareBrief, N, PERIOD, TIDE } from './model.js';
import { createBlock, VE } from './block.js';
import { createSchematic, SMALL_RANGE, FLOOD, EBB, DIKE } from './schematic.js';
import { figPalette, isDark, bg3d } from '../../shared/theme.js';

const QUALITY_NAME = currentQuality(isPhone()), Q = QUALITY[QUALITY_NAME];
const meter = createFpsMeter();
const model = createModel();
const CENTER = N / 2;

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
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 3500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.48;
controls.addEventListener('change', () => { dirty = true; });
controls.minDistance = 40;
controls.maxDistance = 2200;

// 바다 쪽에서 만 안쪽을 바라본다.
const VIEWS = {
  oblique: { p: [40, 400, 520], t: [0, 0, -6] },
  above: { p: [0, 700, 50], t: [0, 0, 0] },
  low: { p: [60, 130, 340], t: [0, 2, -10] },
  compare: { p: [0, 560, 780], t: [0, 4, 16] },
};
function setView(name) {
  const z = portraitZoom(), { p, t } = VIEWS[name];
  camera.position.set(t[0] + (p[0] - t[0]) * z, t[1] + (p[1] - t[1]) * z, t[2] + (p[2] - t[2]) * z);
  controls.target.set(...t);
  controls.update();
  dirty = true;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === name));
}

scene.add(new THREE.HemisphereLight(0xdfe9f5, 0x54493c, 1.2));
const sun = new THREE.DirectionalLight(0xfff1dd, 2.6);
sun.position.set(-190, 230, 150);
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
const waterMask = () => { const out = new Float32Array(N * N); for (let k = 0; k < N * N; k++) if (model.h[k] < model.levelAt(k)) out[k] = 1; return out; };
const drawMap = () => {
  mapView.hidden = showing === '3d';
  dirty = true;
  if (showing === 'map') drawContourMap(mapView, { h: model.h, N, sizeM: null, water: waterMask(), north: false, interval: 1 });
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
labels.add('sandflat', '모래 갯벌', '물살이 빨라 모래가 남음', 'sand');
labels.add('mixflat', '혼합 갯벌', '모래와 펄이 섞임', 'sand');
labels.add('mudflat', '펄 갯벌', '물살이 느려 고운 흙이 쌓임', 'key');
labels.add('creek', '갯골', '썰물 때 물이 빠지는 길', 'water');
labels.add('marsh', '염생 식물', '갈대, 칠면초 등', 'plant');
labels.add('flood', '밀물', '물이 들어오는 중', 'water');
labels.add('ebb', '썰물', '물이 빠지는 중', 'water');
labels.add('dike', '방조제', '바닷물을 막는 둑', 'hot');
labels.add('reclaimed', '간척지', '갯벌이 논으로 바뀜', 'plant');
labels.add('river', '하천', '고운 흙을 실어 옴', 'water');
labels.add('sea', '바다', '', 'water');
labels.add('left', '조차 큼(서해안 정도)', '', 'cmp');
labels.add('right', '조차 작음(동해안 정도)', '', 'cmp');
labels.add('lake', '방조제 안 호수', '바닷물과 끊겨 갇힌 물', 'water');
labels.add('lowline', '간조 때 물가', '물이 가장 많이 빠진 곳', 'water');
labels.add('highline', '만조 때 물가', '물이 가장 높이 들어온 곳', 'water');
// 단면 A, B 표시도 이름표처럼 겹침을 피해 놓는다.
labels.add('pinA', 'A', '', 'pin');
labels.add('pinB', 'B', '', 'pin');

const v3 = new THREE.Vector3();
const toScreen = (x, y, z, block = blockA) => {
  v3.set(x - CENTER + block.group.position.x, y * VE, z - CENTER).project(camera);
  return v3.z > 1 ? null : { x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight };
};
let labelsOn = true;
function syncLabels() {
  if (showing !== '3d' || !labelsOn) { labels.place([]); return; }
  camera.updateMatrixWorld();
  const list = [];
  if (compare) {
    const s = toScreen(CENTER, -17, N + 10, blockA), q = toScreen(CENTER, -17, N + 10, blockB);
    if (s) list.push({ key: 'left', ...s, priority: 6, keep: true });
    if (q) list.push({ key: 'right', ...q, priority: 6, keep: true });
    labels.place(list);
    return;
  }
  const p = model.spots();
  const surfaceAt = q => Math.max(model.sample(q.x, q.y), model.levelAt(Math.round(q.y) * N + Math.round(q.x)));
  const put = (key, q, up, priority, keep = true) => { if (!q) return; const s = toScreen(q.x, surfaceAt(q) + up, q.y); if (s) list.push({ key, ...s, priority, keep }); };
  // 방조제 뒤에는 바깥에 남은 갯벌의 이름표가 간척지를 가리지 않게, 너무 밀려 올라가면 숨긴다.
  const outside = model.dikeAt < 0;
  put('mudflat', p.mudflat, 0.3, 10, outside);
  put('mixflat', p.mixflat, 0.3, 8, outside);
  put('sandflat', p.sandflat, 0.3, 9);
  put('creek', p.creek, 0.3, 9, outside);
  put('marsh', p.marsh, 0.4, 10);
  if (p.waterline) {
    // 물이 가장 높거나 낮아 잠깐 멈춘 때는 들어오거나 빠지는 중이라고 하지 않는다.
    const a = model.amp(), key = model.sea > 0.96 * a ? 'highline' : model.sea < -0.96 * a ? 'lowline' : p.waterline.rising ? 'flood' : 'ebb';
    put(key, p.waterline, 0.2, 7);
  }
  put('dike', p.dike, 0.5, 12);
  put('reclaimed', p.reclaimed, 0.4, 11);
  if (model.dikeAt >= 0) put('lake', p.lake, 0.3, 9);
  put('river', p.river, 0.4, 7);
  put('sea', p.sea, 0.3, 3);
  const S = sectionProfile(model, 2).S;
  // A는 이름표가 모이는 만 안쪽 끝 가까이에 있다. 이름표와 겹쳐 많이 밀려나면 숨긴다(단면 그림에는 늘 있다).
  put('pinA', { x: S.ax, y: S.ay }, 0.5, 13, false);
  put('pinB', { x: S.bx, y: S.by }, 0.5, 13);
  labels.place(list);
}

// 실시간 단면: 계산이 쌓은 흙과 판 갯골을 그대로 읽어 그린다. 밀물 때와 썰물 때 해수면 사이가 조간대다. 두 블록을 비교할 때도 축척이 같다.
const KIND_COLOR = { sandflat: '#e2cf98', mixflat: '#a38f6b', mudflat: '#5d5244', creek: '#4b5a60', marsh: '#7c8650', field: '#86ad55', ditch: '#86ad55', dryflat: '#a99c82', lake: '#5d5244', dike: '#b9b4aa', sea: '#c9b98c' };
function drawSection(canvas, m) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, samples = 280;
  const p = sectionProfile(m, samples), base = H - 46, lo = -9, hi = 9;
  const yOf = v => base - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (base - 14), x = t => (t / (samples - 1)) * W, cw = W / samples + 1;
  const P = figPalette(), DK = isDark();
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H); ctx.save(); ctx.strokeStyle = P.frame; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1); ctx.restore();
  const HT = m.amp(), LT = -m.amp(), yH = yOf(HT), yL = yOf(LT);
  // 조간대: 밀물 때 해수면과 썰물 때 해수면 사이
  if (m.range() >= 1) { ctx.fillStyle = (DK ? 'rgba(143,214,255,0.10)' : 'rgba(29,95,158,0.08)'); ctx.fillRect(0, yH, W, yL - yH); }
  // 지금의 물
  for (let t = 0; t < samples; t++) if (p.top[t] < p.level[t]) { ctx.fillStyle = m.dikeAt >= 0 && p.kinds[t] === 'lake' ? '#3f8fb0' : '#3a7fb5'; const y = yOf(p.top[t]) + 2, ys = yOf(p.level[t]); ctx.fillRect(x(t) - 1, ys, cw + 1, y - ys); }
  // 땅은 표본점을 이은 매끈한 선으로 그린다. 위 선(지금 땅 높이) 아래를 겉흙 빛으로 칠하고, 그 위에 처음 바닥을 회색으로 덮는다.
  // 쌓인 흙의 빛: 펄이 많을수록 짙은 갈색, 모래가 많을수록 밝은 모래색
  const sedColor = t => { const kd = p.kinds[t]; if (kd === 'land' || kd === 'river') return '#6f8a55'; if (kd === 'marsh' || kd === 'field' || kd === 'ditch' || kd === 'dike') return KIND_COLOR[kd]; const f = Math.max(0, Math.min(1, (p.mud[t] - 0.2) / 0.6)); const c0 = [226, 207, 152], c1 = [93, 82, 68]; return `rgb(${c0.map((v, q) => Math.round(v + (c1[q] - v) * f)).join(',')})`; };
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  for (let t = 0; t < samples; t++) grad.addColorStop(t / (samples - 1), sedColor(t));
  const area = (line, fill) => { ctx.beginPath(); ctx.moveTo(0, H); for (let t = 0; t < samples; t++) ctx.lineTo(x(t), line(t)); ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
  area(t => yOf(p.top[t]), grad);
  // 처음 바닥: 쌓인 흙 아래에 있는 부분만 보인다. 육지는 처음 땅 그대로라 덮지 않는다.
  area(t => { const kd = p.kinds[t]; return kd === 'land' || kd === 'river' ? H : Math.max(yOf(p.start[t]), yOf(p.top[t]) + 0.5); }, '#6f665a');
  ctx.beginPath(); for (let t = 0; t < samples; t++) ctx[t ? 'lineTo' : 'moveTo'](x(t), yOf(p.top[t])); ctx.strokeStyle = 'rgba(20,24,22,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
  const say = (text, cx, cy, color, size = 24, align = 'center') => {
    ctx.font = `700 ${size}px "Malgun Gothic",sans-serif`; ctx.textAlign = align;
    const w = ctx.measureText(text).width;
    if (align === 'center') cx = Math.min(W - w / 2 - 34, Math.max(w / 2 + 34, cx));
    ctx.lineWidth = 5; ctx.strokeStyle = P.bg; ctx.strokeText(text, cx, cy);
    ctx.fillStyle = color; ctx.fillText(text, cx, cy);
  };
  // 밀물 때 해수면(점선), 썰물 때 해수면(점선), 지금의 해수면(실선)
  ctx.strokeStyle = (DK ? '#d8efff' : '#1d5f9e'); ctx.lineWidth = 2; ctx.setLineDash([10, 7]);
  ctx.beginPath(); ctx.moveTo(0, yH); ctx.lineTo(W, yH); ctx.stroke();
  if (m.range() >= 1) { ctx.beginPath(); ctx.moveTo(0, yL); ctx.lineTo(W, yL); ctx.stroke(); }
  ctx.setLineDash([]);
  const seaY = yOf(m.sea);
  ctx.strokeStyle = (DK ? '#8fd6ff' : '#1d5f9e'); ctx.lineWidth = 3;
  const firstSea = Math.max(0, p.kinds.findIndex(k => k !== 'land' && k !== 'river'));
  ctx.beginPath(); ctx.moveTo(x(firstSea), seaY); ctx.lineTo(W, seaY); ctx.stroke();
  // 실제로 생긴 지형에만 이름을 붙인다.
  const span = kinds => { let a = -1, b = -1; for (let t = 0; t < samples; t++) if (kinds.includes(p.kinds[t])) { if (a < 0) a = t; b = t; } return a < 0 ? null : [a, b]; };
  const mid = s => x((s[0] + s[1]) / 2), topOf = s => yOf(Math.max(...p.top.slice(s[0], s[1] + 1)));
  const dk = span(['dike']), fd = span(['field', 'ditch']);
  if (dk) say('방조제', mid(dk), topOf(dk) - 12, (DK ? '#ffb38a' : '#b4471c'), 22);
  if (fd && fd[1] - fd[0] > 6) say('간척지', mid(fd), topOf(fd) - 12, (DK ? '#d6e69a' : '#4f6b1c'), 22);
  // 단면 이름표가 겹치면 아래로 비켜 놓는다.
  const boxes = [];
  const place = (text, cx, cy, color) => {
    ctx.font = '700 20px "Malgun Gothic",sans-serif';
    const w = ctx.measureText(text).width + 10;
    cx = Math.min(W - w / 2 - 34, Math.max(w / 2 + 34, cx));
    for (let n = 0; n < 6 && boxes.some(b => Math.abs(b.x - cx) < (b.w + w) / 2 && Math.abs(b.y - cy) < 24); n++) cy += 26;
    boxes.push({ x: cx, y: cy, w });
    say(text, cx, cy, color, 20);
  };
  const zones = [['mudflat', '펄 갯벌', (DK ? '#e8dcc0' : '#5d4a30')], ['mixflat', '혼합', (DK ? '#f0dfb5' : '#7a5e2a')], ['sandflat', '모래 갯벌', (DK ? '#ffe6a8' : '#a8780a')], ['marsh', '염생 식물', (DK ? '#d6e69a' : '#4f6b1c')]];
  for (const [kd, name, color] of zones) {
    // 가장 길게 이어진 구간에 이름을 붙인다.
    let best = null, a = -1;
    for (let t = 0; t <= samples; t++) { const on = t < samples && p.kinds[t] === kd; if (on && a < 0) a = t; if (!on && a >= 0) { if (!best || t - 1 - a > best[1] - best[0]) best = [a, t - 1]; a = -1; } }
    if (best && best[1] - best[0] >= 5) place(name, mid(best), Math.min(topOf(best) + 34, base - 4), color);
  }
  // 갯골: 가장 깊게 파인 곳 하나에만 이름을 붙인다.
  let ck = -1;
  for (let t = 0; t < samples; t++) if (p.kinds[t] === 'creek' && (ck < 0 || p.start[t] - p.top[t] < p.start[ck] - p.top[ck])) ck = t;
  if (ck >= 0) place('갯골', x(ck), yOf(p.top[ck]) - 14, (DK ? '#8fd6ff' : '#1d5f9e'));
  say('A', 18, 32, P.hi, 26); say('B', W - 18, 32, P.hi, 26);
  say('밀물 때 해수면', W - 14, yH - 8, (DK ? '#d8efff' : '#1d5f9e'), 20, 'right');
  if (m.range() >= 1) {
    say('썰물 때 해수면', W - 14, yL + 24, (DK ? '#d8efff' : '#1d5f9e'), 20, 'right');
    say('조간대', W - 14, (yH + yL) / 2 + 8, (DK ? '#8fd6ff' : '#1d5f9e'), 22, 'right');
  } else say('조차가 작아 두 해수면이 거의 같음', W - 14, yH + 26, (DK ? '#d8efff' : '#1d5f9e'), 20, 'right');
  // 라이트 모드에서는 땅 위에 깔린 설명 글이 묻히지 않게 아래에 밝은 띠를 깐다.
  if (!DK) { ctx.fillStyle = P.bg; ctx.fillRect(1, H - 38, W - 2, 37); ctx.fillStyle = P.frame; ctx.fillRect(1, H - 38, W - 2, 1); }
  ctx.textAlign = 'left'; ctx.font = '700 20px "Malgun Gothic",sans-serif'; ctx.fillStyle = P.ink;
  ctx.fillText('회색: 처음 바닥, 짙은 갈색: 펄, 밝은 모래색: 모래, 파랑: 지금의 물', 14, H - 12);
  ctx.textAlign = 'right'; ctx.font = '20px "Malgun Gothic",sans-serif';
  ctx.fillText('세로 과장', W - 14, H - 12);
  ctx.textAlign = 'left';
}

const PHASE_NAME = { early: '밀물과 썰물이 드나듦', growing: '갯벌이 자람', formed: '완성', dike: '방조제를 쌓음', reclaimed: '간척지' };
const noteEl = document.getElementById('now'), statsEl = document.getElementById('stats');
let report = null, reportVersion = -1;
function syncInfo() {
  const ph = model.phase();
  if (reportVersion !== model.version) { report = flatReport(model); reportVersion = model.version; }
  const r = report, tide = TIDE[model.options.tide];
  // 막대와 판정 문구는 같은 집계(flatReport)에서 나온다.
  document.getElementById('rangeBar').style.width = `${(r.range / 8) * 100}%`;
  document.getElementById('rangeVal').textContent = `약 ${r.range}m (${tide.place} 정도), 막대 끝은 8m(인천 정도)`;
  document.getElementById('areaBar').style.width = `${Math.min(1, r.flatPct / 40) * 100}%`;
  document.getElementById('areaVal').textContent = `블록 넓이의 약 ${r.flatPct}% (막대 끝 40%)`;
  const kinds = r.sand + r.mix + r.mud + r.marsh;
  document.getElementById('mudBar').style.width = `${kinds ? r.mudPct : 0}%`;
  document.getElementById('mixBar').style.width = `${kinds ? r.mixPct : 0}%`;
  document.getElementById('sandBar').style.width = `${kinds ? r.sandPct : 0}%`;
  document.getElementById('mudVal').textContent = kinds ? `펄(염생 식물이 자라는 곳 포함) ${r.mudPct}%, 혼합 ${r.mixPct}%, 모래 ${r.sandPct}%` : '드러나는 갯벌이 없음';
  document.getElementById('rateNote').textContent = r.text;
  const lvl = model.sea;
  let stats = `지금 바닷물 높이 <b>${Math.abs(lvl) < 0.05 ? '평균 높이' : lvl > 0 ? `평균보다 약 ${lvl.toFixed(1)}m 높음` : `평균보다 약 ${(-lvl).toFixed(1)}m 낮음`}</b>`;
  if (model.dikeAt >= 0) stats += ', 방조제 안쪽 물 <b>바닷물과 끊김</b>';
  statsEl.innerHTML = stats;
  const badge = document.getElementById('phaseBadge'), tb = document.getElementById('tideBadge');
  badge.textContent = model.finished && ph === 'formed' ? '완성' : PHASE_NAME[ph];
  tb.hidden = model.range() < 1;
  const a = model.amp();
  tb.textContent = model.sea > 0.96 * a ? '만조: 물이 가장 높음' : model.sea < -0.96 * a ? '간조: 물이 가장 낮음' : model.rising() ? '밀물: 물이 들어옴' : '썰물: 물이 빠짐';
  if (compare) {
    const br = compareBrief(model, modelB);
    noteEl.textContent = `왼쪽 블록은 ${br.a}. 오른쪽 블록은 ${br.b}. 조차가 작으면 밀물과 썰물로 드나드는 바닷물이 적어 고운 흙이 덜 들어오고, 썰물 때 드러나는 땅도 좁습니다. 그래서 조차가 큰 서해안에는 넓은 갯벌이 있고, 조차가 작은 동해안에는 갯벌이 거의 없습니다.`;
    statsEl.innerHTML = '';
    document.getElementById('steps').textContent = '두 조건 비교';
    return;
  }
  noteEl.textContent = noteText(model);
  document.getElementById('steps').textContent = model.finished ? '완성' : `진행 ${Math.floor((model.clock / model.endTime()) * 100)}%`;
  schematic.setStage(model.dikeAt >= 0 ? DIKE : model.range() < 1 ? SMALL_RANGE : model.rising() ? FLOOD : EBB);
}

// 모식도 구역을 누르면 3D 이름표가 강조된다.
const ZONE_LABELS = { sandflat: ['sandflat'], mixedflat: ['mixflat'], mudflat: ['mudflat'], marsh: ['marsh'], creek: ['creek'], flood: ['flood'], ebb: ['ebb'], dike: ['dike'], reclaimed: ['reclaimed'], river: ['river'], sea: ['sea'], intertidal: [], range: [] };
const highlight = zone => {
  for (const [z, keys] of Object.entries(ZONE_LABELS)) for (const k of keys) labels.element(k).classList.toggle('hi', z === zone);
  dirty = true;
};
const schematic = createSchematic(document.getElementById('schem'), { onZone: highlight, stage: EBB });
let playing = true, speed = 1, dirty = true;
const dock = () => (isPhone() ? 0 : document.getElementById('side').offsetWidth);
const panelW = () => (isPhone() || document.body.classList.contains('panel-closed') ? 0 : document.getElementById('panel').offsetWidth + 20);
const sheetH = () => (isPhone() ? document.getElementById('side').offsetHeight : 0);
function fit() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  camera.setViewOffset(innerWidth, innerHeight, (dock() - panelW()) / 2, sheetH() / 2, innerWidth, innerHeight);
  drawMap();
  dirty = true;
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); fit(); });
const playBtn = document.getElementById('playBtn');
const setPlaying = on => { playing = on; playBtn.textContent = on ? '멈춤' : '재생'; playBtn.classList.toggle('on', on); };
playBtn.onclick = () => setPlaying(!playing);
const dikeBtn = document.getElementById('dikeBtn');
const markDike = () => { const on = model.options.dike === 'yes'; dikeBtn.classList.toggle('on', on); dikeBtn.textContent = on ? (model.dikeAt >= 0 ? '방조제 없애고 처음부터' : '방조제 쌓을 예정 (취소)') : '방조제 쌓기'; };
const restart = () => { frameSync(true); setPlaying(true); markDike(); };
document.getElementById('resetBtn').onclick = () => { model.reset(); if (compare) modelB.reset(); restart(); };
// 진행 막대: 누르거나 끌면 그 시점까지 처음부터 다시 계산해 옮긴다.
const progress = createProgressBar(document.getElementById('progHost'), {
  clock: () => model.clock, total: () => model.endTime(), finished: () => model.finished,
  reset: () => { model.reset(); if (compare) modelB.reset(); },
  step: dt => { model.tick(dt); if (compare) modelB.tick(dt); },
  pause: () => { const w = playing; setPlaying(false); return w; },
  resume: w => { frameSync(true); setPlaying(w); markDike(); },
});
document.getElementById('fastBtn').onclick = e => { speed = speed === 1 ? 3 : 1; e.currentTarget.classList.toggle('on', speed === 3); e.currentTarget.textContent = speed === 3 ? '3배 빠르게' : '빠르게'; };
document.getElementById('labelsBtn').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('on', labelsOn); dirty = true; };
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(compare && b.dataset.view === 'oblique' ? 'compare' : b.dataset.view));
const markOptions = () => document.querySelectorAll('[data-opt]').forEach(o => {
  const [name, val] = o.dataset.opt.split(':');
  o.classList.toggle('on', model.options[name] === val);
});
const markPreset = () => document.querySelectorAll('[data-preset]').forEach(o => {
  const p = { west: ['big', 'mid', 'no'], south: ['mid', 'mid', 'no'], east: ['small', 'mid', 'no'], reclaim: ['big', 'mid', 'yes'] }[o.dataset.preset], op = model.options;
  o.classList.toggle('on', op.tide === p[0] && op.supply === p[1] && op.dike === p[2]);
});
document.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => {
  const [name, val] = b.dataset.opt.split(':');
  model.setOption(name, val);
  model.reset();
  markOptions(); markPreset();
  restart();
});
document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
  model.applyPreset(b.dataset.preset);
  markOptions(); markPreset();
  restart();
});
// 방조제: 갯벌이 다 자란 뒤(정해진 때)에 쌓는다. 이미 쌓았으면 없애고 처음부터 다시 만든다.
dikeBtn.onclick = () => {
  if (model.options.dike === 'yes') { model.setOption('dike', 'no'); if (model.dikeAt >= 0) { model.reset(); restart(); } }
  else { model.requestDike(); setPlaying(true); frameSync(true); }
  markDike(); markPreset();
};

// 두 조건 비교: 왼쪽은 조차 큼, 오른쪽은 조차 작음. 나머지는 같다. 끝내면 비교 전에 고른 조건으로 돌아간다.
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
    before = { ...model.options };
    panelBeforeCompare = document.body.classList.contains('panel-closed');
    setPanel(true);
  } else setPanel(panelBeforeCompare);
  document.getElementById('compareBtn').classList.toggle('on', on);
  document.getElementById('sectionB').hidden = !on;
  document.getElementById('compareCap').hidden = !on;
  if (on) { setShowing('3d'); Object.assign(model.options, { tide: 'big', supply: 'mid', dike: 'no' }); model.reset(); Object.assign(modelB.options, { tide: 'small', supply: 'mid', dike: 'no' }); modelB.reset(); }
  else { Object.assign(model.options, before); model.reset(); }
  markOptions(); markPreset();
  setView(on ? 'compare' : 'oblique');
  restart();
}
document.getElementById('compareBtn').onclick = () => setCompare(!compare);
document.getElementById('compareEnd').onclick = () => setCompare(false);

let frame = 0;
function frameSync(all) {
  dirty = true;
  const changed = blockA.syncTerrain(all) | (compare ? blockB.syncTerrain(all) : 0);
  blockA.syncWater();
  if (compare) blockB.syncWater();
  if (all || changed) renderer.shadowMap.needsUpdate = true;
  if (all || frame % 6 === 0) { drawSection(document.getElementById('section'), model); if (compare) drawSection(document.getElementById('sectionB'), modelB); syncInfo(); }
  if (all || (changed && frame % 30 === 0)) drawMap();
  if (all || frame % 3 === 0) syncLabels();
}
// 재생 중에는 밀물과 썰물이 계속 오가므로 늘 그린다. 멈추면 시점을 돌릴 때만 다시 그린다.
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (playing) {
    model.tick(dt * speed);
    if (compare) modelB.tick(dt * speed);
    frame++;
    frameSync(false);
    if (model.finished && model.dikeAt >= 0) markDike();
  }
  progress.update();
  if (!dirty) return;
  dirty = false;
  if (!playing) syncLabels();
  renderer.render(scene, camera);
  meter();
}

const pivot = setupPivot(THREE, { dom: renderer.domElement, camera, controls, targets: () => [blockA.terrain, blockB.terrain], invalidate: () => { dirty = true; }, scene });
window.__PIVOT = { pivot, camera, controls, dom: renderer.domElement };

setView('oblique');
setPanel = setupPanel(document.getElementById('panelToggle'), fit, isPhone());
setupQualityButton(document.getElementById('qualityBtn'), QUALITY_NAME);
frameSync(true);
markDike();
requestAnimationFrame(t => { last = t; loop(t); });

window.__MODEL = {
  progress, model, modelB, setView, setPlaying, setCompare,
  advance(seconds) { setPlaying(false); model.tick(seconds); if (compare) modelB.tick(seconds); frameSync(true); markDike(); renderer.render(scene, camera); return { clock: +model.clock.toFixed(1), sea: +model.sea.toFixed(2), phase: model.phase(), finished: model.finished, flatPct: flatReport(model).flatPct }; },
  // 밀물과 썰물의 한 때를 골라 보여 준다(0: 가장 높음, 0.5: 가장 낮음).
  tideAt(u) { setPlaying(false); const t0 = (u - 0.75) * PERIOD, t = t0 + Math.ceil((model.tideTime - t0) / PERIOD) * PERIOD; model.setTideTime(t); if (compare) modelB.setTideTime(t); frameSync(true); renderer.render(scene, camera); return { sea: +model.sea.toFixed(2), rising: model.rising() }; },
  dike: () => dikeBtn.click(),
  preset: n => document.querySelector(`[data-preset="${n}"]`).click(),
  setOption: (n, v) => document.querySelector(`[data-opt="${n}:${v}"]`).click(),
  draws: () => renderer.info.render.frame,
  labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
};
window.__APP_READY = true;
