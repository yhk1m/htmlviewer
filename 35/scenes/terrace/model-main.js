// © 2026 김용현
// 해안 단구 형성 모형 화면. 계산은 model.js가 하고, 여기서는 그 결과를 3D 블록과 단면, 해수면 그래프로 그린다.
import * as THREE from 'three';
import { OrbitControls } from '../../shared/vendor/OrbitControls.js';
import { isPhone, portraitZoom } from '../../shared/viewport.js';
import { setupPanel } from '../../shared/panel.js';
import { QUALITY, currentQuality, setupQualityButton } from '../../shared/quality.js';
import { createFpsMeter } from '../../shared/fps.js';
import { drawContourMap } from '../../shared/map-views.js';
import { createLabelLayer } from '../../shared/labels.js';
import { setupPivot } from '../../shared/pivot.js';
import { createModel, sectionProfile, noteText, compareBrief, rateVerdict, phaseAt, N, BOTTOM, UPLIFT, PERIOD, HIGH, YEARS_PER_PERIOD, UNIT_M, SEA_LOW } from './model.js';
import { createBlock, VE } from './block.js';
import { createSchematic } from './schematic.js';

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
scene.background = new THREE.Color(0x20262a);
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 3500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.48;
controls.addEventListener('change', () => { dirty = true; });
controls.minDistance = 40;
controls.maxDistance = 2200;

// 바다가 앞쪽에 오도록 본다. 계단을 보려면 옆에서 낮게 보는 시점이 가장 또렷하다.
const VIEWS = {
  oblique: { p: [-350, 350, 550], t: [0, 8, 6] },
  above: { p: [0, 720, 55], t: [0, 0, 0] },
  low: { p: [-540, 90, 190], t: [0, 10, 22] },
  compare: { p: [0, 560, 800], t: [0, 8, 16] },
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
const sun = new THREE.DirectionalLight(0xfff1dd, 2.7);
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
const drawMap = () => {
  mapView.hidden = showing === '3d';
  dirty = true;
  if (showing !== 'map') return;
  const h = new Float32Array(N * N), water = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) { const v = model.r[k] + model.uplift; h[k] = v * UNIT_M; if (v < model.sea) water[k] = 1; }
  drawContourMap(mapView, { h, N, sizeM: null, water, north: false, interval: 10 });
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
const TERRACE_KEYS = ['t1', 't2', 't3'];
for (const key of TERRACE_KEYS) labels.add(key, '해안 단구', ' ', 'key');
labels.add('cliff', '해식애', '지금 깎이는 절벽', 'hot');
labels.add('platform', '파식대', '지금 깎이는 바위 면', 'hot');
labels.add('scarp', '단구애', '옛 해식애', 'mark');
labels.add('sea', '파랑', '', 'water');
labels.add('lowShore', '빙기의 바닷가', '해수면이 낮아진 자리', 'water');
labels.add('up', '땅이 솟음', '', 'mark');
labels.add('left', '빠른 융기 (동해안)', '', 'cmp');
labels.add('right', '느린 융기 (남해안과 황해안)', '', 'cmp');
const makePin = t => { const el = document.createElement('div'); el.className = 'pin'; el.textContent = t; el.hidden = true; document.getElementById('labels').appendChild(el); return el; };
const pinA = makePin('A'), pinB = makePin('B');

const v3 = new THREE.Vector3();
const toScreen = (x, y, z, block = blockA) => {
  v3.set(x - CENTER + block.group.position.x, y * VE, z - CENTER).project(camera);
  return v3.z > 1 ? null : { x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight };
};
let labelsOn = true;
function syncLabels() {
  pinA.hidden = pinB.hidden = true;
  if (showing !== '3d' || !labelsOn) { labels.place([]); return; }
  camera.updateMatrixWorld();
  const list = [];
  if (compare) {
    const s = toScreen(CENTER, BOTTOM - 6, N + 10, blockA), q = toScreen(CENTER, BOTTOM - 6, N + 10, blockB);
    if (s) list.push({ key: 'left', ...s, priority: 6, keep: true });
    if (q) list.push({ key: 'right', ...q, priority: 6, keep: true });
    labels.place(list);
    return;
  }
  const p = model.spots();
  const surfaceAt = q => Math.max(model.sample(q.x, q.y) + model.uplift, model.sea);
  const put = (key, q, up, priority, keep = true) => { if (!q) return; const s = toScreen(q.x, surfaceAt(q) + up, q.y); if (s) list.push({ key, ...s, priority, keep }); };
  p.terraces.slice(0, TERRACE_KEYS.length).forEach((t, n) => {
    const key = TERRACE_KEYS[n], el = labels.element(key);
    el.querySelector('span').textContent = `약 ${model.elevM(t.elev)}m, 약 ${Math.round(t.age)}만 년 전`;
    put(key, t, 0.5, 12 - n);
  });
  put('cliff', p.cliff, 0.5, 9);
  put('platform', p.platform, 0.3, 9);
  put('scarp', p.scarp, 0.5, 7, false);
  put('sea', p.sea, 0.3, 3);
  put('lowShore', p.lowShore, 0.3, 8);
  if (model.rate > 0) { const s = toScreen(-8, 13, 200); if (s) list.push({ key: 'up', ...s, priority: 5, keep: true }); }
  labels.place(list);
  const S = sectionProfile(model, 2).S;
  const pin = (el, x, y) => { const s = toScreen(x, Math.max(model.sample(x, y) + model.uplift, model.sea) + 0.4, y); if (s) { el.hidden = false; el.style.transform = `translate(${s.x - 13}px,${s.y - 13}px)`; } };
  pin(pinA, S.ax, S.ay); pin(pinB, S.bx, S.by);
}

// 실시간 단면: 계산이 깎은 땅을 그대로 읽어 그린다. 두 블록을 비교할 때도 축척이 같다.
function drawSection(canvas, m) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, samples = 280;
  const p = sectionProfile(m, samples), base = H - 40, lo = -15, hi = 24;
  const yOf = v => base - ((v - lo) / (hi - lo)) * (base - 12), x = t => (t / (samples - 1)) * W, cw = W / samples + 1;
  ctx.fillStyle = '#23302a'; ctx.fillRect(0, 0, W, H);
  // 높이 눈금
  ctx.font = '22px "Malgun Gothic",sans-serif'; ctx.textAlign = 'left'; ctx.lineWidth = 1;
  for (let v = -10; v <= 20; v += 5) {
    if (v === 0) continue;
    ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.moveTo(0, yOf(v)); ctx.lineTo(W, yOf(v)); ctx.stroke();
    ctx.fillStyle = 'rgba(239,233,216,.75)'; ctx.fillText(`${v * UNIT_M}m`, 40, yOf(v) - 4);
  }
  const seaY = yOf(m.sea);
  ctx.fillStyle = '#3a7fb5';
  for (let t = 0; t < samples; t++) if (p.top[t] < m.sea) ctx.fillRect(x(t), seaY, cw, yOf(p.top[t]) - seaY);
  for (let t = 0; t < samples; t++) {
    const y = yOf(p.top[t]), k = p.kinds[t];
    ctx.fillStyle = '#6f665a';
    ctx.fillRect(x(t), y, cw, H - y);
    if (k === 'terrace') { ctx.fillStyle = '#e6cf90'; ctx.fillRect(x(t), y, cw, 7); }
    if (k === 'platform') { ctx.fillStyle = '#c7bda6'; ctx.fillRect(x(t), y, cw, 6); }
  }
  // 깎이지 않았다면 있었을 땅: 처음 땅이 솟은 자리
  ctx.strokeStyle = '#efe9d8'; ctx.lineWidth = 2; ctx.setLineDash([7, 6]);
  ctx.beginPath();
  for (let t = 0; t < samples; t++) { const y = yOf(p.start[t]); if (t) ctx.lineTo(x(t), y); else ctx.moveTo(x(t), y); }
  ctx.stroke(); ctx.setLineDash([]);
  // 해수면과 간빙기 해수면
  let firstSea = samples - 1;
  for (let t = 0; t < samples; t++) if (p.top[t] < m.sea) { firstSea = t; break; }
  ctx.strokeStyle = '#d8efff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x(firstSea), seaY); ctx.lineTo(W, seaY); ctx.stroke();
  if (m.sea < -0.6) { ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(0, yOf(0)); ctx.lineTo(W, yOf(0)); ctx.stroke(); ctx.setLineDash([]); }
  const say = (text, cx, cy, color, size = 25) => {
    ctx.font = `700 ${size}px "Malgun Gothic",sans-serif`; ctx.textAlign = 'center';
    const w = ctx.measureText(text).width;
    cx = Math.min(W - w / 2 - 34, Math.max(w / 2 + 34, cx));
    ctx.lineWidth = 5; ctx.strokeStyle = '#1c211e'; ctx.strokeText(text, cx, cy);
    ctx.fillStyle = color; ctx.fillText(text, cx, cy);
  };
  // 실제로 남은 단구면에만 이름을 붙인다. 안쪽 끝의 작은 세모가 구정선이다.
  const runs = [], kept = new Set(m.terraces().map(q => q.no));
  for (let t = 0; t < samples; t++) {
    if (p.kinds[t] !== 'terrace' || !kept.has(p.stand[t])) continue;
    const last = runs[runs.length - 1];
    if (last && last.no === p.stand[t] && t - last.b <= 2) last.b = t; else runs.push({ no: p.stand[t], a: t, b: t });
  }
  let pa = -1, pb = -1;
  for (let t = 0; t < samples; t++) if (p.kinds[t] === 'platform') { if (pa < 0) pa = t; pb = t; }
  const near = t => pa >= 0 && x(pa) - x(t) < 170; // 해식애 이름과 겹칠 만큼 가까운 단구는 이름을 더 위로 올린다.
  runs.filter(a => a.b - a.a >= 4).forEach((run, n) => {
    const st = m.stands[run.no - 1], mid = (x(run.a) + x(run.b)) / 2, y = yOf(st.level + m.uplift);
    say(`${n === 0 ? '단구면 ' : ''}약 ${m.elevM(st.level + m.uplift)}m`, mid + (near(run.b) ? -40 : 0), y - (near(run.b) ? 56 : 26), '#ffe9b0');
    ctx.fillStyle = '#ffb38a'; const ex = x(run.a);
    ctx.beginPath(); ctx.moveTo(ex, y - 2); ctx.lineTo(ex - 9, y - 16); ctx.lineTo(ex + 9, y - 16); ctx.closePath(); ctx.fill();
    if (n === 0) say('구정선', ex - 96, y - 2, '#ffb38a', 22);
    // 옛 바닷가의 둥근 자갈
    ctx.fillStyle = '#fff4cf';
    for (let q = x(run.a) + 8; q < x(run.b) - 4; q += 15) { ctx.beginPath(); ctx.ellipse(q, y + 3, 3.4, 2.4, 0, 0, 6.3); ctx.fill(); }
  });
  if (pb - pa > 4 && m.phase.name === 'high') { say('파식대', (x(pa) + x(pb)) / 2, seaY + 44, '#efe9d8'); say('해식애', x(pa) + 62, seaY - 30, '#ffb38a'); ctx.strokeStyle = '#ffb38a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x(pa) + 26, seaY - 36); ctx.lineTo(x(pa) + 4, seaY - 14); ctx.stroke(); }
  say('파랑', W - 120, seaY - 18, '#ffffff', 24);
  if (m.sea < -0.6) say('오늘날 해수면 높이', W - 190, yOf(0) - 12, '#d8efff', 22);
  ctx.font = '700 26px "Malgun Gothic",sans-serif'; ctx.fillStyle = '#ffd36b'; ctx.textAlign = 'center';
  ctx.fillText('A', 18, 32); ctx.fillText('B', W - 18, 32);
  ctx.textAlign = 'left'; ctx.font = '700 22px "Malgun Gothic",sans-serif'; ctx.fillStyle = '#efe9d8';
  ctx.fillText('점선: 깎이지 않았다면 있었을 땅', 14, H - 10);
  ctx.textAlign = 'right'; ctx.font = '22px "Malgun Gothic",sans-serif';
  ctx.fillText('세로 과장', W - 14, H - 10);
  ctx.textAlign = 'left';
}

// 해수면 그래프: 파란 선이 해수면이고 주황 선이 옛 파식대가 솟아오르는 높이다. 둘이 어긋나는 것이 단구의 원인이다.
function drawChart(m) {
  const c = document.getElementById('seaChart'), ctx = c.getContext('2d'), W = c.width, H = c.height, pad = 92, right = 24, top = 16, bottom = 44;
  const lo = SEA_LOW - 2, hi = Math.max(4, m.rate * m.tEnd + 2);
  const xOf = t => pad + (t / m.tEnd) * (W - pad - right), yOf = v => top + ((hi - v) / (hi - lo)) * (H - top - bottom);
  ctx.fillStyle = '#23302a'; ctx.fillRect(0, 0, W, H);
  ctx.font = '22px "Malgun Gothic",sans-serif'; ctx.textAlign = 'right'; ctx.lineWidth = 1;
  const stepV = hi > 8 ? 5 : 5;
  for (let v = Math.ceil(lo / stepV) * stepV; v <= hi; v += stepV) {
    ctx.strokeStyle = v === 0 ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.moveTo(pad, yOf(v)); ctx.lineTo(W - right, yOf(v)); ctx.stroke();
    ctx.fillStyle = '#c9c7bb'; ctx.fillText(`${v * UNIT_M}m`, pad - 8, yOf(v) + 8);
  }
  // 시간 눈금: 오늘에서 거꾸로 센다.
  ctx.textAlign = 'center';
  for (let a = 0; a * PERIOD <= m.tEnd; a++) {
    const t = m.tEnd - a * PERIOD;
    ctx.fillStyle = '#c9c7bb'; ctx.fillText(a === 0 ? '오늘날' : `${a * YEARS_PER_PERIOD}만 년 전`, Math.min(W - 54, Math.max(pad + 40, xOf(t))), H - 12);
  }
  const line = (from, to, f, color, width) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); for (let t = from, n = 0; t <= to + 0.001; t += 0.5, n++) { const X = xOf(t), Y = yOf(f(t)); if (n) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); } ctx.stroke(); };
  line(0, m.tEnd, t => phaseAt(t, m.rate).sea, 'rgba(143,214,255,.3)', 3);
  line(0, m.clock, t => phaseAt(t, m.rate).sea, '#8fd6ff', 4);
  // 옛 파식대: 간빙기가 끝난 뒤 땅과 함께 솟는다.
  for (const st of m.stands) {
    const from = (st.no - 1) * PERIOD + HIGH;
    if (from <= m.clock && m.rate > 0) line(from, m.clock, t => st.level + m.rate * t, '#ffb34d', 3.5);
  }
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xOf(m.clock), top); ctx.lineTo(xOf(m.clock), H - bottom); ctx.stroke();
  ctx.textAlign = 'left'; ctx.font = '700 22px "Malgun Gothic",sans-serif';
  ctx.fillStyle = '#8fd6ff'; ctx.fillText('해수면', pad + 8, yOf(SEA_LOW + 1));
  if (m.rate > 0) { ctx.fillStyle = '#ffb34d'; ctx.fillText('옛 파식대의 높이', pad + 8, top + 22); }
}

const PHASE_NAME = { high: '간빙기', fall: '빙기로 가는 중', low: '빙기', rise: '빙기가 끝나는 중' };
const noteEl = document.getElementById('now'), statsEl = document.getElementById('stats');
function syncInfo() {
  const list = model.terraces(), o = UPLIFT[model.options.uplift];
  statsEl.innerHTML = `땅이 솟은 높이 <b>약 ${model.elevM(model.uplift)}m</b> (${o.perPeriod ? o.text : '융기 없음'}), 해수면 <b>${model.sea < -0.05 ? `오늘날보다 약 ${model.elevM(-model.sea)}m 낮음` : '오늘날 높이'}</b>, 해안 단구 <b>${list.length}단</b>`;
  const old = model.oldPlatform(), reach = model.waveReach() * UNIT_M, oldM = old === null ? 0 : Math.max(0, old * UNIT_M), top = Math.max(reach, oldM, 20);
  document.getElementById('depBar').style.width = `${(oldM / top) * 100}%`;
  document.getElementById('eroBar').style.width = `${(reach / top) * 100}%`;
  document.getElementById('oldVal').textContent = old === null ? '아직 없음' : `약 ${Math.round(oldM)}m`;
  document.getElementById('reachVal').textContent = `약 ${Math.round(reach)}m`;
  document.getElementById('rateNote').textContent = rateVerdict(model);
  drawChart(model);
  document.getElementById('phaseBadge').textContent = model.finished ? '간빙기, 오늘날' : PHASE_NAME[model.phase.name];
  if (compare) {
    const br = compareBrief(model, modelB);
    noteEl.textContent = `왼쪽 블록은 ${br.a}. 오른쪽 블록은 ${br.b}. 같은 해수면 변동을 겪어도 땅이 빨리 솟는 곳에 단구가 높고 넓게 남습니다.`;
    statsEl.innerHTML = '';
    document.getElementById('steps').textContent = '두 조건 비교';
    return;
  }
  noteEl.textContent = noteText(model);
  document.getElementById('steps').textContent = model.finished ? '완성' : `진행 ${Math.floor((model.clock / model.tEnd) * 100)}%`;
  const c = model.phase.cycle, hi = model.phase.name === 'high';
  schematic.setStage(c >= 2 ? 3 : c === 0 ? (hi ? 0 : 1) : hi ? 2 : 1);
}

// 모식도 구역을 누르면 3D 이름표가 강조된다.
const ZONE_LABELS = { terrace: TERRACE_KEYS, scarp: ['scarp'], cliff: ['cliff'], platform: ['platform'], wave: ['sea'], low: ['lowShore'], uplift: ['up'] };
const highlight = zone => {
  for (const [z, keys] of Object.entries(ZONE_LABELS)) for (const k of keys) labels.element(k).classList.toggle('hi', z === zone);
  dirty = true;
};
const schematic = createSchematic(document.getElementById('schem'), { onZone: highlight, stage: 0 });
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
const restart = () => { settle = 0; blockA.syncFlow(); blockB.syncFlow(); frameSync(true); setPlaying(true); };
document.getElementById('resetBtn').onclick = () => { model.reset(); if (compare) modelB.reset(); restart(); };
document.getElementById('fastBtn').onclick = e => { speed = speed === 1 ? 3 : 1; e.currentTarget.classList.toggle('on', speed === 3); e.currentTarget.textContent = speed === 3 ? '3배 빠르게' : '빠르게'; };
document.getElementById('labelsBtn').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('on', labelsOn); dirty = true; };
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(compare && b.dataset.view === 'oblique' ? 'compare' : b.dataset.view));
document.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => {
  const [name, val] = b.dataset.opt.split(':');
  model.setOption(name, name === 'cycles' ? +val : val);
  model.reset();
  document.querySelectorAll(`[data-opt^="${name}:"]`).forEach(o => o.classList.toggle('on', o === b));
  document.querySelectorAll('[data-preset]').forEach(o => o.classList.remove('on'));
  restart();
});
const markOptions = () => document.querySelectorAll('[data-opt]').forEach(o => {
  const [name, val] = o.dataset.opt.split(':');
  o.classList.toggle('on', String(model.options[name]) === val);
});
document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
  model.applyPreset(b.dataset.preset);
  markOptions();
  document.querySelectorAll('[data-preset]').forEach(o => o.classList.toggle('on', o === b));
  restart();
});

// 두 조건 비교: 왼쪽은 빠른 융기, 오른쪽은 느린 융기. 해수면 변동은 같다. 끝내면 비교 전에 고른 조건으로 돌아간다.
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
  if (on) { setShowing('3d'); Object.assign(model.options, { uplift: 'fast', cycles: 4 }); model.reset(); Object.assign(modelB.options, { uplift: 'slow', cycles: 4 }); modelB.reset(); }
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
let wavePhase = 0;
function frameSync(all) {
  dirty = true;
  blockA.syncWaves(wavePhase);
  if (compare) blockB.syncWaves(wavePhase);
  const fullTerrain = all || frame % 30 === 0;
  if (fullTerrain || frame % 2 === 0) { blockA.syncTerrain(fullTerrain); if (compare) blockB.syncTerrain(fullTerrain); }
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
  if (computing) wavePhase = (wavePhase + dt * 0.35 * speed) % 1;
  if (computing) {
    model.tick(dt * speed);
    if (compare) modelB.tick(dt * speed);
    frame++;
    frameSync(false);
  } else if (wasComputing) frameSync(true);
  wasComputing = computing;
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
blockA.syncFlow(); blockB.syncFlow();
frameSync(true);
requestAnimationFrame(t => { last = t; loop(t); });

window.__MODEL = {
  model, modelB, setView, setPlaying, setCompare,
  advance(seconds) { setPlaying(false); model.tick(seconds); if (compare) modelB.tick(seconds); frameSync(true); renderer.render(scene, camera); return { clock: +model.clock.toFixed(1), phase: model.phase.name, up: model.elevM(model.uplift), sea: model.elevM(model.sea), terraces: model.terraces().map(t => model.elevM(t.elev)), finished: model.finished }; },
  preset: n => document.querySelector(`[data-preset="${n}"]`).click(),
  setOption: (n, v) => document.querySelector(`[data-opt="${n}:${v}"]`).click(),
  draws: () => renderer.info.render.frame,
  labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
};
window.__APP_READY = true;
