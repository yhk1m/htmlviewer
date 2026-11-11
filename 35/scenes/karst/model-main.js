// © 2026 김용현
// 카르스트 지형 형성 모형 화면. 계산은 model.js가 하고, 여기서는 그 결과를 3D 블록과 단면으로 그린다.
import { createProgressBar } from '../../shared/progress.js';
import * as THREE from 'three';
import { OrbitControls } from '../../shared/vendor/OrbitControls.js';
import { isPhone, portraitZoom } from '../../shared/viewport.js';
import { setupPanel } from '../../shared/panel.js';
import { QUALITY, currentQuality, setupQualityButton } from '../../shared/quality.js';
import { createFpsMeter } from '../../shared/fps.js';
import { createLabelLayer } from '../../shared/labels.js';
import { setupPivot } from '../../shared/pivot.js';
import { createModel, noteText, karstReport, compareBrief, N, NY, BOTTOM_M, RAIN, JOINT, DROPS } from './model.js';
import { createBlock, drawCut, worldY } from './block.js';
import { figPalette, isDark, bg3d } from '../../shared/theme.js';

const QUALITY_NAME = currentQuality(isPhone()), Q = QUALITY[QUALITY_NAME];
const meter = createFpsMeter();
const model = createModel();
const CENTER = N / 2, CY = NY / 2;

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
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 2500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.5;
controls.addEventListener('change', () => { dirty = true; });
controls.minDistance = 25;
controls.maxDistance = 1200;

// 앞면(잘린 면) 쪽 오른편에서 비스듬히 내려다본다. 땅 위 돌리네와 앞면의 동굴이 함께 보인다.
const VIEWS = {
  oblique: { p: [70, 120, 215], t: [0, -16, 6] },
  above: { p: [0, 270, 30], t: [0, -4, 0] },
  front: { p: [0, -6, 265], t: [0, -21, 0] },
  compare: { p: [0, 190, 360], t: [0, -18, 8] },
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
sun.position.set(-110, 170, 120);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(Math.min(Q.shadow, 2048));
Object.assign(sun.shadow.camera, { left: -100, right: 100, top: 100, bottom: -100, near: 10, far: 700 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.5;
scene.add(sun);

const blockA = createBlock(model);
scene.add(blockA.group);
const COMPARE_GAP = (N + 14) / 2;
const modelB = createModel();
const blockB = createBlock(modelB);
blockB.group.visible = false;
scene.add(blockB.group);
let compare = false, panelBeforeCompare = false, setPanel = () => {};

// 이름표
const labels = createLabelLayer(document.getElementById('labels'));
labels.add('doline', '돌리네', '절리가 만나는 곳이 녹아 우묵함', 'hollow');
labels.add('uvala', '우발라', '돌리네가 이어짐', 'hollow');
labels.add('sink', '하천이 스며듦', '돌리네 바닥으로 빠짐', 'water');
labels.add('stream', '땅 위 하천', '', 'water');
labels.add('wt', '지하수면', '', 'water');
labels.add('cave', '석회 동굴', '지하수면 근처에서 녹아 생김', 'under');
labels.add('cave2', '아래층 석회 동굴', '두 번째 지하수면 근처', 'under');
labels.add('caveWet', '새 동굴', '지하수에 잠겨 자라는 중', 'under');
labels.add('stalactite', '종유석', '천장에서 아래로', 'speleo');
labels.add('stalagmite', '석순', '바닥에서 위로', 'speleo');
labels.add('column', '석주', '종유석과 석순이 만남', 'speleo');
labels.add('field', '돌리네 밭', '흙이 두꺼운 돌리네 바닥', 'hollow');
labels.add('terra', '테라로사', '녹고 남은 붉은 흙', 'hollow');
labels.add('left', '화강암 땅', '', 'cmp');
labels.add('right', '석회암 땅', '', 'cmp');

const PHONE_CORE = ['doline', 'uvala', 'cave', 'column', 'stalagmite', 'stalactite'];
const v3 = new THREE.Vector3();
const toScreen = (x, wy, z, block = blockA) => {
  v3.set(x - CENTER + block.group.position.x, wy, z - CY).project(camera);
  return v3.z > 1 ? null : { x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight };
};
let labelsOn = true;
function syncLabels() {
  if (!labelsOn) { labels.place([]); return; }
  camera.updateMatrixWorld();
  const list = [];
  if (compare) {
    const s = toScreen(CENTER, worldY(4), NY + 2, blockA), q = toScreen(CENTER, worldY(4), NY + 2, blockB);
    if (s) list.push({ key: 'left', ...s, priority: 6, keep: true });
    if (q) list.push({ key: 'right', ...q, priority: 6, keep: true });
    labels.place(list);
    return;
  }
  const p = model.spots();
  // 이름표 상자가 화면이나 조작 칸에 잘리지 않게, 가운데 자리가 상자 반 너비(약 90px) 넘게 안쪽에 있을 때만 단다.
  const left = panelW() + 90, right = innerWidth - dock() - 90, bottom = innerHeight - sheetH() - 8;
  const put = (key, q, up, priority, keep = true) => {
    if (!q) return;
    const s = toScreen(q.x, worldY(q.z) + up, q.y + (q.y >= NY - 1 ? 0.6 : 0));
    // 휴대폰에서는 핵심 용어(돌리네, 우발레, 석회 동굴, 석주, 석순, 종유석)를 먼저 남긴다.
    if (isPhone() && PHONE_CORE.includes(key)) priority += 10;
    if (s && s.x > left && s.x < right && s.y > 40 && s.y < bottom) list.push({ key, ...s, priority, keep });
  };
  put('doline', p.doline, 1, 12);
  put('uvala', p.uvala, 1, 12);
  put('sink', p.sink, 1, 11);
  put('stream', p.stream, 1, 8, false);
  put('cave', p.cave, 0, 12);
  put('cave2', p.cave2, 0, 11);
  put('caveWet', p.caveWet, 0, 9, false);
  put('wt', p.wt, 0.5, 10);
  put('column', p.column, 0, 10, false);
  put('stalactite', p.stalactite, 0, 9, false);
  put('stalagmite', p.stalagmite, 0, 9, false);
  put('field', p.field, 1, 11);
  put('terra', p.terra, 1, 10);
  // 휴대폰 화면은 좁아 이름표 줄이 다른 이름표를 지나가기 쉽다. 가로로 가까운 이름표는 중요한 것 하나만 남긴다.
  if (isPhone()) {
    // 이름표 상자는 기준점 위에 놓이므로, 가로로 가까운 두 이름표는 위쪽 것의 줄이 아래쪽 상자를 지난다.
    // 핵심 용어끼리는 남기고(겹치면 이름표 층이 위로 밀어 올린다), 나머지는 부딪히면 뺀다.
    const keep = [];
    for (const it of [...list].sort((a, b) => b.priority - a.priority)) {
      const hit = keep.some(k => Math.abs(k.x - it.x) < 70 && Math.abs(k.y - it.y) < 120);
      if (!hit || (PHONE_CORE.includes(it.key) && !keep.some(k => Math.abs(k.x - it.x) < 40 && Math.abs(k.y - it.y) < 60))) keep.push(it);
    }
    list.length = 0; list.push(...keep);
  }
  labels.place(list);
}

// 진행상황 칸의 단면: 블록 앞면과 같은 자리를 자른다. 같은 그림 함수(drawCut)로 그린다.
const say = (ctx, text, cx, cy, color, size = 20, align = 'center') => {
  const W2 = ctx.canvas.width;
  ctx.font = `700 ${size}px "Malgun Gothic",sans-serif`; ctx.textAlign = align;
  const w = ctx.measureText(text).width;
  if (align === 'center') cx = Math.min(W2 - w / 2 - 10, Math.max(w / 2 + 10, cx));
  ctx.lineWidth = 5; ctx.strokeStyle = figPalette().bg; ctx.strokeText(text, cx, cy);
  ctx.fillStyle = color; ctx.fillText(text, cx, cy);
};
const FRONT = { n: N, at: t => [t, NY - 1], caves: true };
function drawSection(canvas, m) {
  const ctx = canvas.getContext('2d'), Wc = canvas.width, H = canvas.height, foot = 76;
  const P = figPalette(), DK = isDark();
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, Wc, H); ctx.save(); ctx.strokeStyle = P.frame; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, Wc - 1, H - 1); ctx.restore();
  const yTop = worldY(9), yBot = worldY(BOTTOM_M);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, Wc, H - foot); ctx.clip();
  const g = drawCut(ctx, Wc, H - foot, m, { ...FRONT, cross: m.plan.jx }, { yTop, yBot, bg: P.bg });
  ctx.restore();
  const r = karstReport(m), used = [];
  const put = (text, x, y, color, size = 27) => {
    if (used.some(u => Math.abs(u[0] - x) < 120 && Math.abs(u[1] - y) < 34)) return;
    used.push([x, y]); say(ctx, text, x, y, color, size);
  };
  // 앞면에 걸린 돌리네
  for (const d of r.list) {
    if (d.y + d.R * 0.6 < NY - 1) continue;
    put(r.inUvala.has(d) ? '우발라' : '돌리네', g.X(d.x), g.YM(m.z[(NY - 1) * N + d.x]) - 30, DK ? '#f3a58a' : '#8a3a1c');
  }
  // 동굴
  m.caves.forEach(c => {
    if (!c || c.half < 3) return;
    const lx = c.xm + c.half * (c.i === 0 ? -0.15 : 0.2), sh = m.caveShape(c, lx);
    if (!sh) return;
    put(c.drained ? '석회 동굴' : '물에 잠긴 동굴', g.X(lx), g.YM(sh.top) - 12, P.ink, 26);
  });
  const seen = {};
  m.drips.forEach(list => list.forEach(d => {
    if (d.col && !seen.c) { seen.c = 1; put('석주', g.X(d.x), g.YM(d.bot) + 30, DK ? '#e8dcc0' : '#5a4a1e', 25); }
    else if (!d.col && d.a >= 0.3 && !seen.a) { seen.a = 1; put('종유석', g.X(d.x), g.YM(d.top - d.a) + 28, DK ? '#e8dcc0' : '#5a4a1e', 25); }
    else if (!d.col && d.b >= 0.3 && !seen.b && d.a < 0.3) { seen.b = 1; put('석순', g.X(d.x), g.YM(d.bot) + 30, DK ? '#e8dcc0' : '#5a4a1e', 25); }
  }));
  say(ctx, '지하수면', Wc - 80, g.YM(m.wt) - 12, DK ? '#8fd6ff' : '#1d5f9e', 26);
  if (m.options.rock === 'lime' && m.soilFrac() > 0.5) say(ctx, '테라로사', 90, g.YM(m.z[(NY - 1) * N + 8]) - 16, DK ? '#f3a58a' : '#8a3a1c', 25);
  ctx.textAlign = 'left'; ctx.font = '700 17px "Malgun Gothic",sans-serif'; ctx.fillStyle = P.ink;
  ctx.font = '700 22px "Malgun Gothic",sans-serif';
  ctx.fillText('파랑 점선: 지하수면, 옅은 파랑: 지하수로 찬 곳', 12, H - 44);
  ctx.fillText(m.options.rock === 'lime' ? '검은 줄: 절리, 붉은 띠: 흙(테라로사)' : '검은 줄: 절리', 12, H - 14);
  ctx.textAlign = 'right'; ctx.font = '22px "Malgun Gothic",sans-serif';
  ctx.fillText('높이 2배 과장', Wc - 12, H - 14);
  ctx.textAlign = 'left';
}

const PHASE_NAME = {
  start: '빗물이 절리를 따라 스밈', solution: '용식: 빗물이 석회암을 녹임', doline: '돌리네가 생김', uvala: '돌리네가 이어져 우발라',
  cave: '지하수면 근처에 석회 동굴', dry: '동굴에 물이 빠지고 종유석, 석순이 자람', today: '오늘날', done: '완성',
};
const noteEl = document.getElementById('now'), statsEl = document.getElementById('stats');
function syncInfo() {
  const ph = model.phase(), r = karstReport(model);
  // 막대와 판정 문구는 같은 집계(karstReport)에서 나온다.
  const bar = (id, v, end) => { document.getElementById(id).style.width = `${Math.min(1, Math.max(0, v) / end) * 100}%`; };
  bar('dolBar', r.dolines, 50); document.getElementById('dolVal').textContent = `${r.dolines}곳 (막대 끝 50곳)`;
  bar('diaBar', r.maxDiaM, 60); document.getElementById('diaVal').textContent = r.dolines ? `약 ${r.maxDiaM}m (막대 끝 60m)` : '아직 돌리네 없음';
  bar('caveBar', r.caveM, 400); document.getElementById('caveVal').textContent = `약 ${r.caveM}m (막대 끝 400m)`;
  bar('streamBar', r.streamM, 260); document.getElementById('streamVal').textContent = `약 ${r.streamM}m (막대 끝 260m)`;
  document.getElementById('rateNote').textContent = r.text;
  statsEl.innerHTML = `비의 양 <b>${RAIN[model.options.rain].name}</b>, 절리 간격 <b>${JOINT[model.options.joint].name}</b>, 지하수면 낮아짐 <b>${DROPS[model.options.drops].name}</b>, 지금 지하수면 <b>땅 아래 약 ${Math.round(-model.wt)}m</b>`;
  document.getElementById('phaseBadge').textContent = PHASE_NAME[ph];
  if (compare) {
    const br = compareBrief(model, modelB);
    noteEl.textContent = `왼쪽 블록(화강암 땅)은 ${br.a}. 오른쪽 블록(석회암 땅)은 ${br.b}. ${br.extra}`;
    statsEl.innerHTML = '';
    document.getElementById('steps').textContent = '두 땅 비교';
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
document.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => {
  const [name, val] = b.dataset.opt.split(':');
  model.setOption(name, val);
  model.reset();
  markOptions();
  restart();
});

// 두 땅 비교: 왼쪽은 화강암 땅, 오른쪽은 석회암 땅. 비의 양, 절리 간격, 지하수면은 같다. 끝내면 비교 전 조건으로 돌아간다.
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
  if (on) { Object.assign(model.options, { ...before, rock: 'granite' }); model.reset(); Object.assign(modelB.options, { ...before, rock: 'lime' }); modelB.reset(); }
  else { Object.assign(model.options, { ...before, rock: 'lime' }); model.reset(); }
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
  if (all) { blockA.syncRain(0); if (compare) blockB.syncRain(0); }
  if (all || frame % 3 === 0) syncLabels();
}
// 재생 중에는 늘 그린다(비가 내린다). 멈추면 시점을 돌릴 때만 다시 그린다.
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
    blockA.syncRain(dt); if (compare) blockB.syncRain(dt);
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
  advance(seconds) { setPlaying(false); model.tick(seconds); if (compare) modelB.tick(seconds); frameSync(true); renderer.render(scene, camera); const r = karstReport(model); return { clock: +model.clock.toFixed(1), phase: model.phase(), finished: model.finished, dolines: r.dolines, dia: r.maxDiaM, uvalas: r.uvalas, cave: r.caveM, stream: r.streamM, dry: r.dryLevels }; },
  setOption: (n, v) => document.querySelector(`[data-opt="${n}:${v}"]`).click(),
  draws: () => renderer.info.render.frame,
  labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
};
window.__APP_READY = true;
