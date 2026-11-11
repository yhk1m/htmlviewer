// © 2026 김용현
// 화산섬 형성 모형 화면. 계산은 model.js가 하고, 여기서는 그 결과를 3D 블록과 단면으로 그린다.
import { createProgressBar } from '../../shared/progress.js';
import * as THREE from 'three';
import { OrbitControls } from '../../shared/vendor/OrbitControls.js';
import { isPhone, portraitZoom } from '../../shared/viewport.js';
import { setupPanel } from '../../shared/panel.js';
import { QUALITY, currentQuality, setupQualityButton } from '../../shared/quality.js';
import { createFpsMeter } from '../../shared/fps.js';
import { createLabelLayer } from '../../shared/labels.js';
import { setupPivot } from '../../shared/pivot.js';
import { createModel, noteText, volcanoReport, compareBrief, N, NY, CX, CY, BOTTOM_M, VISC, VENT, TOP, TUBE_FLOW, COLUMN_FLOW } from './model.js';
import { createBlock, drawCut, worldY } from './block.js';
import { figPalette, isDark, bg3d } from '../../shared/theme.js';

const QUALITY_NAME = currentQuality(isPhone()), Q = QUALITY[QUALITY_NAME];
const meter = createFpsMeter();
const model = createModel();
const CX0 = (N - 1) / 2, CY0 = (NY - 1) / 2;

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
controls.maxPolarAngle = Math.PI * 0.5;
controls.addEventListener('change', () => { dirty = true; });
controls.minDistance = 25;
controls.maxDistance = 1200;

// 앞면(잘린 면) 쪽 오른편에서 비스듬히 내려다본다. 섬과 앞면의 화산 속 단면이 함께 보인다.
const VIEWS = {
  oblique: { p: [60, 165, 232], t: [0, 0, -4] },
  above: { p: [0, 250, 40], t: [0, 0, 0] },
  front: { p: [0, 6, 230], t: [0, 6, 0] },
  compare: { p: [0, 205, 345], t: [0, 0, 4] },
};
function setView(name) {
  const z = portraitZoom(), { p, t } = VIEWS[name];
  camera.position.set(t[0] + (p[0] - t[0]) * z, t[1] + (p[1] - t[1]) * z, t[2] + (p[2] - t[2]) * z);
  controls.target.set(...t);
  controls.update();
  dirty = true;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === name || (name === 'compare' && b.dataset.view === 'oblique')));
}

scene.add(new THREE.HemisphereLight(0xdfe9f5, 0x54493c, 1.25));
const sun = new THREE.DirectionalLight(0xfff1dd, 2.6);
sun.position.set(-120, 170, 110);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(Math.min(Q.shadow, 2048));
Object.assign(sun.shadow.camera, { left: -100, right: 100, top: 100, bottom: -100, near: 10, far: 700 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.5;
scene.add(sun);

const blockA = createBlock(model);
scene.add(blockA.group);
const COMPARE_GAP = (N + 12) / 2;
const modelB = createModel();
const blockB = createBlock(modelB);
blockB.group.visible = false;
scene.add(blockB.group);
let compare = false, panelBeforeCompare = false, setPanel = () => {};

// 이름표
const labels = createLabelLayer(document.getElementById('labels'));
labels.add('sea', '얕은 바다', '대륙붕', 'water');
labels.add('shield', '순상화산', '묽은 용암이 넓게 흘러 완만함', 'body');
labels.add('body', '좁고 급한 화산체', '끈적한 용암이 가까이 쌓임', 'body');
labels.add('flow', '용암류', '흐르는 용암', 'hot');
labels.add('dome', '용암원정구', '끈끈한 용암이 솟아 굳음', 'body');
labels.add('crater', '분화구', '꼭대기 폭발로 생김', 'body');
labels.add('craterLake', '화구호', '분화구에 물이 고임', 'water');
labels.add('bigEruption', '큰 분출', '마그마가 한꺼번에 빠져나감', 'hot');
labels.add('caldera', '칼데라', '꼭대기가 크게 꺼짐', 'body');
labels.add('somma', '외륜산', '칼데라 둘레 산(성인봉 능선)', 'body');
labels.add('atrioLow', '화구원(낮은 쪽)', '나리 분지처럼 메워진 바닥', 'body');
labels.add('atrioHigh', '화구원(높은 쪽)', '알봉 분지처럼 한 단 높음', 'body');
labels.add('central', '중앙화구구', '칼데라 안에서 다시 분출(알봉)', 'cone');
labels.add('scoria', '분석구', '땅 위에서 터진 오름', 'cone');
labels.add('horseshoe', '말굽형 분석구', '화구 한쪽이 열림', 'cone');
labels.add('tuffcone', '응회구', '얕은 바다에서 터짐, 화구가 큼', 'cone');
labels.add('tuffring', '응회환', '더 낮고 넓게 퍼짐', 'cone');
labels.add('tube', '용암 동굴', '겉이 굳고 속이 빠져나감', 'under');
labels.add('column', '주상절리', '두꺼운 용암이 식으며 생긴 기둥', 'under');
labels.add('left', '화구', '', 'cmp');
labels.add('right', '칼데라', '', 'cmp');

const PHONE_CORE = ['shield', 'dome', 'craterLake', 'caldera', 'central', 'atrioLow', 'scoria', 'tuffcone', 'tube', 'column'];
const v3 = new THREE.Vector3();
const toScreen = (x, wy, z, block = blockA) => {
  v3.set(x - CX0 + block.group.position.x, wy, z - CY0).project(camera);
  return v3.z > 1 ? null : { x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight };
};
let labelsOn = true;
function syncLabels() {
  if (!labelsOn) { labels.place([]); return; }
  camera.updateMatrixWorld();
  const list = [];
  if (compare) {
    const s = toScreen(CX0, worldY(1500), NY + 2, blockA), q = toScreen(CX0, worldY(1500), NY + 2, blockB);
    if (s) list.push({ key: 'left', ...s, priority: 6, keep: true });
    if (q) list.push({ key: 'right', ...q, priority: 6, keep: true });
    labels.place(list);
    return;
  }
  const p = { ...model.spots() };
  const left = panelW() + 90, right = innerWidth - dock() - 90, bottom = innerHeight - sheetH() - 8;
  const put = (key, q, up, priority, keep = true) => {
    if (!q) return;
    const s = toScreen(q.x, worldY(q.z) + up, q.y + (q.y >= NY - 1 ? 0.6 : 0));
    if (isPhone() && PHONE_CORE.includes(key)) priority += 10;
    if (s && s.x > left && s.x < right && s.y > 40 && s.y < bottom) list.push({ key, ...s, priority, keep });
  };
  const thin = model.options.visc === 'thin';
  // 칼데라가 생기는 동안에는 꼭대기 이름표만 남겨 차례가 잘 보이게 한다.
  if (['bigEruption', 'collapse', 'atrio', 'central'].includes(model.phase())) for (const k of ['shield', 'scoria', 'horseshoe', 'tuffcone', 'tuffring', 'tube', 'column']) delete p[k];
  put('sea', p.sea, 0.5, 6, false);
  put(thin ? 'shield' : 'body', p.shield, 0.5, 12);
  put('flow', p.flow, 1, 9, false);
  put('dome', p.dome, 0.5, 12);
  put('crater', p.crater, 0.5, 11);
  put('craterLake', p.craterLake, 0.3, 12);
  put('bigEruption', p.bigEruption, 2, 12);
  put('caldera', p.caldera, 0.5, 12);
  put('somma', p.somma, 0.5, 10);
  put('atrioLow', p.atrioLow, 0.3, 11);
  put('atrioHigh', p.atrioHigh, 0.3, 10, false);
  put('central', p.central, 0.5, 13);
  put('scoria', p.scoria, 0.5, 11);
  put('horseshoe', p.horseshoe, 0.5, 9, false);
  put('tuffcone', p.tuffcone, 0.5, 12);
  put('tuffring', p.tuffring, 0.5, 11);
  put('tube', p.tube, 0, 11);
  put('column', p.column, 0, 11);
  if (isPhone()) {
    const keep = [];
    for (const it of [...list].sort((a, b) => b.priority - a.priority)) {
      const hit = keep.some(k => Math.abs(k.x - it.x) < 70 && Math.abs(k.y - it.y) < 120);
      if (!hit || (PHONE_CORE.includes(it.key) && !keep.some(k => Math.abs(k.x - it.x) < 40 && Math.abs(k.y - it.y) < 60))) keep.push(it);
    }
    list.length = 0; list.push(...keep);
  }
  labels.place(list);
}

// 진행상황 칸의 단면: 블록 앞면(분화구 한가운데)과 같은 자리를 자른다. 같은 그림 함수(drawCut)로 그린다.
const say = (ctx, text, cx, cy, color, size = 20, align = 'center') => {
  const W2 = ctx.canvas.width;
  ctx.font = `700 ${size}px "Malgun Gothic",sans-serif`; ctx.textAlign = align;
  const w = ctx.measureText(text).width;
  if (align === 'center') cx = Math.min(W2 - w / 2 - 10, Math.max(w / 2 + 10, cx));
  ctx.lineWidth = 5; ctx.strokeStyle = figPalette().bg; ctx.strokeText(text, cx, cy);
  ctx.fillStyle = color; ctx.fillText(text, cx, cy);
};
const FRONT = { n: N, at: t => [t, NY - 1], front: true };
function drawSection(canvas, m) {
  const ctx = canvas.getContext('2d'), Wc = canvas.width, H = canvas.height, foot = 76;
  const P = figPalette(), DK = isDark();
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, Wc, H);
  const yTop = worldY(1650), yBot = worldY(BOTTOM_M);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, Wc, H - foot); ctx.clip();
  const g = drawCut(ctx, Wc, H - foot, m, FRONT, { yTop, yBot, bg: P.bg });
  ctx.restore();
  ctx.save(); ctx.strokeStyle = P.frame; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, Wc - 1, H - 1); ctx.restore();
  const r = volcanoReport(m), used = [];
  const put = (text, x, y, color, size = 25) => {
    if (used.some(u => Math.abs(u[0] - x) < 130 && Math.abs(u[1] - y) < 32)) return;
    used.push([x, y]); say(ctx, text, x, y, color, size);
  };
  const ink = P.ink, hot = DK ? '#ffb27a' : '#a33a12', water = DK ? '#8fd6ff' : '#1d5f9e', rock = DK ? '#e8dcc0' : '#4a3a20';
  const ph = m.phase();
  if (ph !== 'sea') put('마그마', g.X(CX) + 150, g.YM(-440), hot, 24);
  if (r.island) {
    put(m.options.visc === 'thin' ? '현무암 용암 층 (순상화산)' : '용암 층 (좁고 급한 화산체)', g.X(CX - 0.72 * m.plan.shoreR), g.YM(g.top[Math.round(CX - 0.6 * m.plan.shoreR)]) - 26, ink, 24);
  }
  if (m.domeGrow > 0.4 && !(m.options.top === 'caldera' && m.craterGrow > 0.5)) put('용암원정구', g.X(CX) + 120, g.YM(g.top[CX + 4]) - 30, rock, 24);
  if (m.lake) put('화구호', g.X(CX), g.YM(m.lake.level) - 40, water, 24);
  if (m.options.top === 'caldera') {
    const R = m.calderaR();
    if (ph === 'bigEruption') put('마그마가 빠져나감', g.X(CX) - 170, g.YM(-440), hot, 24);
    if (m.craterGrow > 0) put('둥근 단층', g.X(CX - R) - 70, g.YM(0) - 20, ink, 22);
    if (m.craterGrow > 0.5) put('칼데라 (꼭대기가 꺼짐)', g.X(CX), g.YM(m.rimZ) - 50, ink, 24);
    if (m.atrio && m.atrio.af > 0.3) put('화구원 (메워진 바닥)', g.X(CX + 0.45 * R), g.YM(m.atrio.high) + 34, rock, 22);
    if (m.craterGrow > 0.5) put('외륜산', g.X(CX + R + 5), g.YM(m.rimZ) - 18, ink, 22);
    const c = (m.cones || []).find(q => q.kind === 'central');
    if (c && c.g > 0.3) put('중앙화구구', g.X(c.x) - 20, g.YM(c.top) - 52, hot, 23);
  }
  if (m.tube) {
    const x = Math.round((m.tube.x0 + m.tube.x1) / 2), ly = g.layers[x];
    put(m.tube.molten ? '굳은 겉 아래로 흐르는 용암' : '용암 동굴', g.X(x), g.YM((ly[TUBE_FLOW] + ly[TUBE_FLOW + 1]) / 2) + 38, m.tube.molten ? hot : ink, 23);
  }
  if (m.column) {
    const x = Math.round((m.column.x0 + m.column.x1) / 2), ly = g.layers[x];
    put('주상절리', g.X(x), g.YM(ly[COLUMN_FLOW]) + 30, ink, 23);
  }
  put('바다', 50, g.YM(0) + 30, water, 23);
  ctx.textAlign = 'left'; ctx.fillStyle = P.ink;
  ctx.font = '700 21px "Malgun Gothic",sans-serif';
  ctx.fillText('검은 띠: 현무암 용암 층, 붉은 줄: 용암 겉의 거친 조각', 12, H - 44);
  ctx.fillText('회갈색: 조면암, 적갈색: 스코리아, 노란색: 응회암', 12, H - 14);
  ctx.textAlign = 'right'; ctx.font = '21px "Malgun Gothic",sans-serif';
  ctx.fillText('높이 3배 과장', Wc - 12, H - 14);
  ctx.textAlign = 'left';
}

const PHASE_NAME = {
  sea: '얕은 바다 밑에 마그마가 모임', subsea: '바다 밑에서 용암이 흘러 쌓임', shield: '묽은 용암이 넓게 흘러 섬이 됨', dome: '꼭대기에 용암원정구가 솟음',
  crater: '마지막 분출로 분화구가 생기고 물이 고임', bigEruption: '큰 분출로 마그마가 빠져나감', collapse: '꼭대기가 꺼져 칼데라가 생김',
  atrio: '칼데라 바닥이 메워져 화구원이 됨', central: '칼데라 안에 중앙화구구가 솟음', cones: '측화산(오름)이 생김', today: '오늘날', done: '완성',
};
const PHASE_NAME_THICK = { shield: '끈적한 용암이 가까이 쌓여 섬이 됨' };
const noteEl = document.getElementById('now'), statsEl = document.getElementById('stats');
function syncInfo() {
  const ph = model.phase(), r = volcanoReport(model);
  const bar = (id, v, end) => { document.getElementById(id).style.width = `${Math.min(1, Math.max(0, v) / end) * 100}%`; };
  bar('heightBar', r.summitM, 1600); document.getElementById('heightVal').textContent = r.island ? `약 ${r.summitM}m (막대 끝 1600m)` : '아직 바다 밑';
  bar('slopeBar', r.island ? r.slope : 0, 500); document.getElementById('slopeVal').textContent = r.island ? `1km에 약 ${r.slope}m 오름 (막대 끝 500m)` : '아직 바다 밑';
  bar('widthBar', r.widthKm, 18); document.getElementById('widthVal').textContent = `약 ${r.widthKm}km (막대 끝 18km)`;
  bar('coneBar', r.cones, 6); document.getElementById('coneVal').textContent = `${r.cones}개 (막대 끝 6개)`;
  bar('topBar', r.topKm, 4); document.getElementById('topVal').textContent = r.topKm ? `약 ${r.topKm}km${r.depthM ? `, 깊이 약 ${r.depthM}m` : ''} (막대 끝 4km)` : '아직 없음';
  document.getElementById('rateNote').textContent = r.text;
  statsEl.innerHTML = `용암의 끈끈함 <b>${VISC[model.options.visc].name}</b>, 측화산이 터진 자리 <b>${VENT[model.options.vent].name}</b>, 마지막 분출 <b>${TOP[model.options.top].name}</b>`;
  document.getElementById('phaseBadge').textContent = (model.options.visc === 'thick' && PHASE_NAME_THICK[ph]) || PHASE_NAME[ph];
  if (compare) {
    const br = compareBrief(model, modelB);
    noteEl.textContent = `왼쪽 블록(화구)은 ${br.a}. 오른쪽 블록(칼데라)은 ${br.b}. ${br.extra}`;
    statsEl.innerHTML = '';
    document.getElementById('steps').textContent = '화구와 칼데라 비교';
    return;
  }
  noteEl.textContent = noteText(model);
  document.getElementById('steps').textContent = model.finished ? '완성' : `진행 ${Math.floor((model.clock / model.endTime()) * 100)}%`;
}

let playing = true, speed = 1, dirty = true;
const dock = () => (isPhone() ? 0 : document.getElementById('side').offsetWidth);
const panelW = () => (isPhone() || document.body.matches('.panel-closed, .merged') ? 0 : document.getElementById('panel').offsetWidth + 20);
const sheetH = () => (isPhone() ? document.getElementById('side').offsetHeight : 0);
function fit() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  camera.setViewOffset(innerWidth, innerHeight, (dock() - panelW()) / 2, sheetH() / 2, innerWidth, innerHeight);
  dirty = true;
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); fit(); });
const playBtn = document.getElementById('playBtn');
const setPlaying = on => { playing = on; playBtn.textContent = on ? '멈춤' : '재생'; playBtn.classList.toggle('on', on); };
playBtn.onclick = () => setPlaying(!playing);
const restart = () => { frameSync(true); setPlaying(true); };
document.getElementById('resetBtn').onclick = () => { model.reset(); if (compare) modelB.reset(); restart(); };
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
document.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => {
  const [name, val] = b.dataset.opt.split(':');
  model.setOption(name, val);
  model.reset();
  markOptions();
  restart();
});

// 화구와 칼데라 비교: 왼쪽은 꼭대기에 분화구, 오른쪽은 칼데라. 다른 조건은 같다. 끝내면 비교 전 조건으로 돌아간다.
let before = null;
function setCompare(on) {
  if (on === compare) return;
  compare = on;
  blockB.group.visible = on;
  blockA.group.position.x = on ? -COMPARE_GAP : 0;
  blockB.group.position.x = COMPARE_GAP;
  const e = on ? 190 : 100;
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
  if (on) { Object.assign(model.options, { ...before, top: 'crater' }); model.reset(); Object.assign(modelB.options, { ...before, top: 'caldera' }); modelB.reset(); }
  else { Object.assign(model.options, before); model.reset(); }
  markOptions();
  setView(on ? 'compare' : 'oblique');
  restart();
}
document.getElementById('compareBtn').onclick = () => setCompare(!compare);
document.getElementById('compareEnd').onclick = () => setCompare(false);

let frame = 0, drawnA = -1, drawnB = -1;
function frameSync(all) {
  dirty = true;
  const changed = blockA.syncTerrain(all) | (compare ? blockB.syncTerrain(all) : 0);
  if (all || changed) renderer.shadowMap.needsUpdate = true;
  if (all || frame % 6 === 0) {
    if (all || drawnA !== model.version || (compare && drawnB !== modelB.version)) {
      drawSection(document.getElementById('section'), model);
      if (compare) drawSection(document.getElementById('sectionB'), modelB);
      drawnA = model.version; drawnB = modelB.version;
    }
    syncInfo();
  }
  if (all) { blockA.syncFx(0); if (compare) blockB.syncFx(0); }
  if (all || frame % 3 === 0) syncLabels();
}
// 재생 중에는 늘 그린다(분출물이 움직인다). 멈추면 시점을 돌릴 때만 다시 그린다.
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (playing) {
    if (!model.finished) {
      model.tick(dt * speed);
      if (compare) modelB.tick(dt * speed);
    }
    frame++;
    frameSync(false);
    blockA.syncFx(dt); if (compare) blockB.syncFx(dt);
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
requestAnimationFrame(t => { last = t; loop(t); });

window.__MODEL = {
  progress, model, modelB, blockA, blockB, setView, setPlaying, setCompare,
  advance(seconds) { setPlaying(false); model.tick(seconds); if (compare) modelB.tick(seconds); frameSync(true); blockA.syncFx(0.4); if (compare) blockB.syncFx(0.4); renderer.render(scene, camera); const r = volcanoReport(model); return { clock: +model.clock.toFixed(1), phase: model.phase(), finished: model.finished, summit: r.summitM, slope: r.slope, width: r.widthKm, cones: r.cones, tube: r.tube, column: r.column }; },
  setOption: (n, v) => document.querySelector(`[data-opt="${n}:${v}"]`).click(),
  draws: () => renderer.info.render.frame,
  labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
};
window.__APP_READY = true;
