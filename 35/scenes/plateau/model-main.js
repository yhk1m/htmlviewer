// © 2026 김용현
// 고위 평탄면 형성 모형 화면. 계산은 model.js가 하고, 여기서는 그 결과를 3D 블록과 단면으로 그린다.
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
import { createModel, sectionProfile, noteText, plateauReport, compareBrief, N, H_M, CELL_M, XD, PRESETS, LIFT } from './model.js';
import { createBlock, VE } from './block.js';
import { createSchematic, FLAT, TILT, CUT, LOW } from './schematic.js';
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

// 남쪽 조금 동쪽에서 북쪽을 바라본다. 오른쪽이 동해, 앞쪽 옆면에 동서 단면이 드러난다.
const VIEWS = {
  oblique: { p: [80, 370, 540], t: [0, 4, -4] },
  above: { p: [0, 700, 50], t: [0, 0, 0] },
  low: { p: [70, 120, 500], t: [-6, 14, -16] },
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
const drawMap = () => {
  mapView.hidden = showing === '3d';
  dirty = true;
  if (showing !== 'map') return;
  const hm = new Float32Array(N * N), water = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) { hm[k] = Math.max(0, model.h[k]) * H_M; if (!model.land[k] || model.isWater(k)) water[k] = 1; }
  drawContourMap(mapView, { h: hm, N, sizeM: N * CELL_M, water, north: true, interval: 50 });
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
labels.add('high', '고위 평탄면', '솟은 옛 평탄한 땅이 남은 곳', 'high');
labels.add('low', '저위 평탄면', '넓게 깎인 바닥이 다시 솟음', 'low');
labels.add('scarp', '동쪽 급경사', '동해 쪽으로 급하게 낮아짐', 'hot');
labels.add('gentle', '서쪽 완만한 비탈', '서쪽으로 길게 낮아짐', 'key');
labels.add('valley', '깊은 골짜기', '하천이 바닥을 깊이 팜', 'key');
labels.add('knick', '급경사 지점', '상류로 거슬러 오르는 중', 'hot');
labels.add('westRiver', '서쪽으로 흐르는 하천', '길고 완만함', 'water');
labels.add('eastRiver', '동해로 흐르는 하천', '짧고 급함', 'water');
labels.add('sea', '동해', '', 'water');
labels.add('field', '고랭지 밭', '서늘한 여름에 채소를 기름', 'plant');
labels.add('pasture', '목장', '', 'plant');
labels.add('turbine', '풍력 발전기', '바람이 센 능선', 'key');
labels.add('left', '동쪽이 더 솟음', '', 'cmp');
labels.add('right', '고르게 솟음', '', 'cmp');
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
    const s = toScreen(CENTER, -19, N + 10, blockA), q = toScreen(CENTER, -19, N + 10, blockB);
    if (s) list.push({ key: 'left', ...s, priority: 6, keep: true });
    if (q) list.push({ key: 'right', ...q, priority: 6, keep: true });
    labels.place(list);
    return;
  }
  const p = model.spots(), ph = model.phase();
  // 옆 칸(진행상황) 뒤로 들어간 자리의 이름표는 숨긴다.
  const right = innerWidth - dock() - 8, bottom = innerHeight - sheetH() - 8;
  const put = (key, q, up, priority, keep = true) => { if (!q) return; const s = toScreen(q.x, Math.max(0, model.sample(q.x, q.y)) + up, q.y); if (s && s.x < right && s.y < bottom) list.push({ key, ...s, priority, keep }); };
  const end = ph === 'use' || ph === 'done';
  put('high', p.high, 0.5, 12);
  put('low', p.low, 0.5, 11);
  put('scarp', p.scarp, 0.5, 9);
  if (!end) put('gentle', p.gentle, 0.5, 7); // 끝에는 오늘날 이용 이름표에 자리를 내준다.
  put('valley', p.valley, 0.5, 8, !end);
  put('knick', p.knick, 0.5, 10);
  if (ph === 'flat' || ph === 'uplift') { put('westRiver', p.westRiver, 0.4, 6, false); put('eastRiver', p.eastRiver, 0.4, 5, false); }
  put('sea', p.sea, 0.3, 3);
  if (end) {
    put('field', p.field, 0.4, 10);
    put('pasture', p.pasture, 0.4, 9);
    if (p.turbine) put('turbine', p.turbine, 9, 9, false);
  }
  const S = sectionProfile(model, 2).S;
  put('pinA', { x: S.ax + 2, y: S.ay }, 0.5, 13, false);
  put('pinB', { x: S.bx - 4, y: S.by }, 0.5, 13);
  labels.place(list);
}

// 실시간 단면: 계산한 땅 높이를 그대로 읽어 그린다. 두 블록을 비교할 때도 축척이 같다.
const KIND_COLOR = { high: '#e3c766', low: '#9fd38a' };
function drawSection(canvas, m) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, samples = 256;
  const p = sectionProfile(m, samples), base = H - 46, lo = -4, hi = 62;
  const yOf = v => base - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (base - 30), x = t => (t / (samples - 1)) * W;
  const P = figPalette(), DK = isDark();
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H); ctx.save(); ctx.strokeStyle = P.frame; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1); ctx.restore();
  // 높이 눈금(m)
  ctx.font = '18px "Malgun Gothic",sans-serif'; ctx.textAlign = 'left';
  for (let mm = 400; mm <= 800; mm += 400) {
    const y = yOf(mm / H_M);
    ctx.strokeStyle = P.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.fillStyle = P.sub; ctx.fillText(`${mm}m`, 8, y - 4);
  }
  // 바다
  const seaY = yOf(0);
  for (let t = 0; t < samples; t++) if (p.kinds[t] === 'sea') { ctx.fillStyle = '#3a7fb5'; ctx.fillRect(x(t) - 1, seaY, W / samples + 2, yOf(p.top[t]) - seaY + 2); }
  // 땅: 지금 높이 아래를 칠한다.
  const area = (line, fill) => { ctx.beginPath(); ctx.moveTo(0, H); for (let t = 0; t < samples; t++) ctx.lineTo(x(t), line(t)); ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
  area(t => yOf(p.top[t]), '#6f7f55');
  // 처음 땅 높이(점선)와 깎이지 않았다면의 높이(솟은 원래 땅, 옅은 선)
  ctx.setLineDash([8, 6]); ctx.lineWidth = 2;
  ctx.beginPath(); for (let t = 0; t < samples; t++) { if (p.kinds[t] === 'sea') break; ctx[t ? 'lineTo' : 'moveTo'](x(t), yOf(p.start[t])); }
  if (!DK) { ctx.strokeStyle = 'rgba(30,30,30,0.6)'; ctx.lineWidth = 4; ctx.stroke(); ctx.lineWidth = 2; }
  ctx.strokeStyle = DK ? 'rgba(216,239,255,0.75)' : '#ffffff'; ctx.stroke();
  ctx.setLineDash([3, 5]); ctx.strokeStyle = (DK ? 'rgba(255,236,190,0.55)' : 'rgba(150,105,30,0.7)');
  ctx.beginPath(); for (let t = 0; t < samples; t++) { if (p.kinds[t] === 'sea') break; ctx[t ? 'lineTo' : 'moveTo'](x(t), yOf(p.surf[t])); } ctx.stroke();
  ctx.setLineDash([]);
  // 고위, 저위 평탄면은 땅 윗면에 색 띠를 덧칠한다.
  for (let t = 0; t < samples - 1; t++) {
    const c = KIND_COLOR[p.kinds[t]];
    if (!c) continue;
    ctx.strokeStyle = c; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x(t), yOf(p.top[t])); ctx.lineTo(x(t + 1), yOf(p.top[t + 1])); ctx.stroke();
  }
  ctx.beginPath(); for (let t = 0; t < samples; t++) ctx[t ? 'lineTo' : 'moveTo'](x(t), yOf(p.top[t])); ctx.strokeStyle = 'rgba(20,24,22,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
  // 하천: 물이 흐르는 칸에 파란 점
  for (let t = 0; t < samples; t++) if (p.kinds[t] === 'water') { ctx.fillStyle = (DK ? '#8fd6ff' : '#1d5f9e'); ctx.fillRect(x(t) - 2, yOf(p.top[t]) - 3, 5, 5); }
  const say = (text, cx, cy, color, size = 22, align = 'center') => {
    ctx.font = `700 ${size}px "Malgun Gothic",sans-serif`; ctx.textAlign = align;
    const w = ctx.measureText(text).width;
    if (align === 'center') cx = Math.min(W - w / 2 - 34, Math.max(w / 2 + 34, cx));
    ctx.lineWidth = 5; ctx.strokeStyle = P.bg; ctx.strokeText(text, cx, cy);
    ctx.fillStyle = color; ctx.fillText(text, cx, cy);
  };
  ctx.strokeStyle = (DK ? '#8fd6ff' : '#1d5f9e'); ctx.lineWidth = 2;
  const firstSea = p.kinds.indexOf('sea');
  if (firstSea >= 0) { ctx.beginPath(); ctx.moveTo(x(firstSea), seaY); ctx.lineTo(W, seaY); ctx.stroke(); }
  // 실제로 생긴 지형에만 이름을 붙인다. 가장 길게 이어진 구간에 이름을 단다.
  const boxes = [];
  const place = (text, cx, cy, color) => {
    ctx.font = '700 20px "Malgun Gothic",sans-serif';
    const w = ctx.measureText(text).width + 10;
    cx = Math.min(W - w / 2 - 34, Math.max(w / 2 + 34, cx));
    for (let n = 0; n < 6 && boxes.some(b => Math.abs(b.x - cx) < (b.w + w) / 2 && Math.abs(b.y - cy) < 24); n++) cy -= 26;
    boxes.push({ x: cx, y: cy, w });
    say(text, cx, cy, color, 20);
  };
  for (const [kd, name, color] of [['high', '고위 평탄면', (DK ? '#ffe08a' : '#a8780a')], ['low', '저위 평탄면', (DK ? '#bfe9a8' : '#4f6b1c')]]) {
    let best = null, a = -1;
    for (let t = 0; t <= samples; t++) { const on = t < samples && p.kinds[t] === kd; if (on && a < 0) a = t; if (!on && a >= 0) { if (!best || t - 1 - a > best[1] - best[0]) best = [a, t - 1]; a = -1; } }
    if (best && best[1] - best[0] >= 2) { let top = -99; for (let t = best[0]; t <= best[1]; t++) top = Math.max(top, p.top[t]); place(name, x((best[0] + best[1]) / 2), yOf(top) - 16, color); }
  }
  // 가장 깊게 파인 곳(원래 땅보다)
  // 서쪽 하천 골짜기만 본다(3D 이름표와 같게). 동쪽 급경사의 골짜기는 뺀다.
  let dk = -1;
  for (let t = 0; t < samples; t++) if (p.kinds[t] !== 'sea' && p.S.ax + ((p.S.bx - p.S.ax) * t) / (samples - 1) < XD && (dk < 0 || p.surf[t] - p.top[t] > p.surf[dk] - p.top[dk])) dk = t;
  if (dk >= 0 && (p.surf[dk] - p.top[dk]) * H_M >= 100) place('골짜기', x(dk), Math.min(base - 4, yOf(p.top[dk]) + 30), (DK ? '#8fd6ff' : '#1d5f9e'));
  if (m.options.mode === 'tilt' && m.liftFrac() > 0.2 && firstSea > 0) place('동쪽 급경사', x(firstSea - 18), yOf(p.surf[firstSea - 18]) - 22, (DK ? '#ffb38a' : '#b4471c'));
  say('A 서쪽', 18, 30, P.hi, 22, 'left'); say('동해 B', W - 18, 30, P.hi, 22, 'right');
  // 라이트 모드에서는 땅 위에 깔린 설명 글이 묻히지 않게 아래에 밝은 띠를 깐다.
  if (!DK) { ctx.fillStyle = P.bg; ctx.fillRect(1, H - 58, W - 2, 57); ctx.fillStyle = P.frame; ctx.fillRect(1, H - 58, W - 2, 1); }
  ctx.textAlign = 'left'; ctx.font = '700 18px "Malgun Gothic",sans-serif'; ctx.fillStyle = P.ink;
  ctx.fillText('흰 점선: 처음 땅, 옅은 점선: 깎이지 않았다면의 높이, 노랑: 고위 평탄면, 연두: 저위 평탄면', 14, H - 14);
  ctx.textAlign = 'right'; ctx.font = '18px "Malgun Gothic",sans-serif';
  ctx.fillText('세로 과장', W - 14, H - 34);
  ctx.textAlign = 'left';
}

const PHASE_NAME = { flat: '오랜 침식으로 평탄해진 땅', uplift: '땅이 솟음', cut: '하천이 깊이 파고듦', pause: '솟기를 멈춤, 골짜기가 넓어짐', uplift2: '다시 솟음', cut2: '다시 파고듦', use: '오늘날의 이용', done: '완성' };
const noteEl = document.getElementById('now'), statsEl = document.getElementById('stats');
let report = null, reportVersion = -1;
function syncInfo() {
  const ph = model.phase();
  if (reportVersion !== model.version) { report = plateauReport(model); reportVersion = model.version; }
  const r = report;
  // 막대와 판정 문구는 같은 집계(plateauReport)에서 나온다.
  document.getElementById('highBar').style.width = `${Math.min(1, r.highPct / 50) * 100}%`;
  document.getElementById('highVal').textContent = `육지의 약 ${r.highPct}% (막대 끝 50%)`;
  document.getElementById('lowBar').style.width = `${Math.min(1, r.lowPct / 25) * 100}%`;
  document.getElementById('lowVal').textContent = `육지의 약 ${r.lowPct}% (막대 끝 25%)`;
  document.getElementById('deepBar').style.width = `${Math.min(1, r.deepM / 1000) * 100}%`;
  document.getElementById('deepVal').textContent = `원래 땅보다 약 ${r.deepM}m (막대 끝 1000m)`;
  document.getElementById('tiltBar').style.width = `${Math.min(1, Math.max(0, r.tiltM) / 1000) * 100}%`;
  document.getElementById('tiltVal').textContent = `분수계 가까이와 서쪽 끝, 약 ${r.tiltM}m (막대 끝 1000m)`;
  document.getElementById('rateNote').textContent = r.text;
  statsEl.innerHTML = `가장 많이 솟은 곳 <b>약 ${r.upM}m</b>, 융기 크기 <b>${LIFT[model.options.lift].name}</b>`;
  document.getElementById('phaseBadge').textContent = PHASE_NAME[ph];
  if (compare) {
    const br = compareBrief(model, modelB);
    noteEl.textContent = `왼쪽 블록(동쪽이 더 솟음)은 ${br.a}. 오른쪽 블록(고르게 솟음)은 ${br.b}. 동쪽이 더 솟으면 땅이 서쪽으로 기울어 동쪽은 동해로 급하게, 서쪽은 길고 완만하게 낮아집니다. 우리나라의 큰 하천이 대부분 서쪽과 남쪽으로 흐르는 까닭입니다. 고르게 솟으면 땅이 기울지 않고 높이가 고르게 올라갑니다. ${br.extra}`;
    statsEl.innerHTML = '';
    document.getElementById('steps').textContent = '두 조건 비교';
    return;
  }
  noteEl.textContent = noteText(model);
  document.getElementById('steps').textContent = model.finished ? '완성' : `진행 ${Math.floor((model.clock / model.endTime()) * 100)}%`;
  const two = model.options.times === 'two';
  schematic.setStage(ph === 'flat' ? FLAT : ph === 'uplift' ? TILT : ph === 'cut2' || ((ph === 'use' || ph === 'done') && two) ? LOW : CUT);
}

// 모식도 구역을 누르면 3D 이름표가 강조된다.
const ZONE_LABELS = { high: ['high'], low: ['low'], scarp: ['scarp'], gentle: ['gentle'], valley: ['valley'], knick: ['knick'], eastRiver: ['eastRiver'], westRiver: ['westRiver'], use: ['field', 'pasture', 'turbine'], sea: ['sea'], flat: [], uplift: [], divide: [] };
const highlight = zone => {
  for (const [z, keys] of Object.entries(ZONE_LABELS)) for (const k of keys) labels.element(k).classList.toggle('hi', z === zone);
  dirty = true;
};
const schematic = createSchematic(document.getElementById('schem'), { onZone: highlight, stage: FLAT });
let playing = true, speed = 1, dirty = true;
const dock = () => (isPhone() ? 0 : document.getElementById('side').offsetWidth);
const panelW = () => (isPhone() || document.body.matches('.panel-closed, .merged') ? 0 : document.getElementById('panel').offsetWidth + 20);
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
const restart = () => { frameSync(true); setPlaying(true); };
document.getElementById('resetBtn').onclick = () => { model.reset(); if (compare) modelB.reset(); restart(); };
// 진행 막대: 누르거나 끌면 그 시점까지 처음부터 다시 계산해 옮긴다.
const progress = createProgressBar(document.getElementById('progHost'), {
  clock: () => model.clock, total: () => model.endTime(), finished: () => model.finished,
  reset: () => { model.reset(); if (compare) modelB.reset(); },
  step: dt => { model.tick(dt); if (compare) modelB.tick(dt); },
  pause: () => { const w = playing; setPlaying(false); return w; },
  resume: w => { frameSync(true); setPlaying(w); },
});
document.getElementById('fastBtn').onclick = e => { speed = speed === 1 ? 3 : 1; e.currentTarget.classList.toggle('on', speed === 3); e.currentTarget.textContent = speed === 3 ? '3배 빠르게' : '빠르게'; };
document.getElementById('labelsBtn').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('on', labelsOn); dirty = true; };
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(compare && b.dataset.view === 'oblique' ? 'compare' : b.dataset.view));
const markOptions = () => document.querySelectorAll('[data-opt]').forEach(o => {
  const [name, val] = o.dataset.opt.split(':');
  o.classList.toggle('on', model.options[name] === val);
});
const markPreset = () => document.querySelectorAll('[data-preset]').forEach(o => {
  const p = PRESETS[o.dataset.preset], op = model.options;
  o.classList.toggle('on', op.lift === p.lift && op.mode === p.mode && op.times === p.times);
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

// 두 조건 비교: 왼쪽은 동쪽이 더 솟음, 오른쪽은 고르게 솟음. 융기 크기와 솟은 횟수는 같다. 끝내면 비교 전에 고른 조건으로 돌아간다.
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
  if (on) { setShowing('3d'); Object.assign(model.options, { ...before, mode: 'tilt' }); model.reset(); Object.assign(modelB.options, { ...before, mode: 'even' }); modelB.reset(); }
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
  if (all || changed) renderer.shadowMap.needsUpdate = true;
  if (all || frame % 6 === 0) { drawSection(document.getElementById('section'), model); if (compare) drawSection(document.getElementById('sectionB'), modelB); syncInfo(); }
  if (all || (changed && frame % 30 === 0)) drawMap();
  if (all) syncLabels();
}
// 재생 중에는 늘 그린다(땅이 바뀌고 풍력 발전기 날개가 돈다). 멈추면 시점을 돌릴 때만 다시 그린다.
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
    blockA.spinRotors(dt);
    if (compare) blockB.spinRotors(dt);
  }
  progress.update();
  if (!dirty) return;
  dirty = false;
  // 이름표는 그릴 때마다 맞춘다(재생 중이거나 끝난 뒤 시점을 돌려도 따라가게).
  syncLabels();
  renderer.render(scene, camera);
  meter();
}

const pivot = setupPivot(THREE, { dom: renderer.domElement, camera, controls, targets: () => [blockA.terrain, blockB.terrain], invalidate: () => { dirty = true; }, scene });
window.__PIVOT = { pivot, camera, controls, dom: renderer.domElement };

setView('oblique');
setPanel = setupPanel(document.getElementById('panelToggle'), fit, isPhone());
setupQualityButton(document.getElementById('qualityBtn'), QUALITY_NAME);
frameSync(true);
requestAnimationFrame(t => { last = t; loop(t); });

window.__MODEL = {
  progress, model, modelB, setView, setPlaying, setCompare,
  advance(seconds) { setPlaying(false); model.tick(seconds); if (compare) modelB.tick(seconds); frameSync(true); renderer.render(scene, camera); const r = plateauReport(model); return { clock: +model.clock.toFixed(1), phase: model.phase(), finished: model.finished, high: r.highPct, low: r.lowPct, deep: r.deepM, tilt: r.tiltM }; },
  preset: n => document.querySelector(`[data-preset="${n}"]`).click(),
  setOption: (n, v) => document.querySelector(`[data-opt="${n}:${v}"]`).click(),
  draws: () => renderer.info.render.frame,
  labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
};
window.__APP_READY = true;
