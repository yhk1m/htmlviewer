// © 2026 김용현
// 암괴원과 암괴류 형성 모형 화면. 계산은 model.js가 하고, 여기서는 그 결과를 3D 블록과 단면으로 그린다.
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
import { createModel, noteText, blockReport, compareBrief, valleyX, N, CELL_M, WD, PRESETS, SPACING, STREAM_SOME } from './model.js';
import { createBlock, drawCut, worldY } from './block.js';
import { createSchematic, JOINT, WEATHER, COLD, BLOCKS } from './schematic.js';
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
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 2000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.48;
controls.addEventListener('change', () => { dirty = true; });
controls.minDistance = 25;
controls.maxDistance = 1200;

// 산기슭(앞) 조금 오른쪽에서 산꼭대기 쪽을 올려다본다. 앞면과 오른쪽 옆면에 땅속 단면이 드러난다.
const VIEWS = {
  oblique: { p: [172, 182, 298], t: [-4, 6, 0] },
  above: { p: [0, 470, 50], t: [0, 0, 0] },
  low: { p: [80, 50, 230], t: [-6, 14, -10] },
  compare: { p: [0, 330, 520], t: [0, 8, 12] },
};
function setView(name) {
  const z = portraitZoom(), { p, t } = VIEWS[name];
  camera.position.set(t[0] + (p[0] - t[0]) * z, t[1] + (p[1] - t[1]) * z, t[2] + (p[2] - t[2]) * z);
  controls.target.set(...t);
  controls.update();
  dirty = true;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === name));
}

scene.add(new THREE.HemisphereLight(0xdfe9f5, 0x54493c, 1.25));
const sun = new THREE.DirectionalLight(0xfff1dd, 2.6);
sun.position.set(-120, 160, 110);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(Math.min(Q.shadow, 2048));
Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 10, far: 600 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.5;
scene.add(sun);

const blockA = createBlock(model, { trees: Q.trees });
scene.add(blockA.group);
const COMPARE_GAP = (N + 12) / 2;
const modelB = createModel();
const blockB = createBlock(modelB, { trees: Q.trees });
blockB.group.visible = false;
scene.add(blockB.group);
let compare = false, panelBeforeCompare = false, setPanel = () => {};

const mapView = document.getElementById('mapView');
let showing = '3d';
const drawMap = () => {
  mapView.hidden = showing === '3d';
  dirty = true;
  if (showing !== 'map') return;
  const hm = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) hm[k] = model.h[k];
  const B = model.boulders;
  // 드러난 바위는 회색 점으로 겹쳐 그린다.
  const overlay = (ctx, { ox, oy, sc, side }) => {
    // 축척 막대(20m)
    const bar = (20 / CELL_M) * sc;
    ctx.fillStyle = '#222'; ctx.fillRect(ox + 10, oy + side - 18, bar, 3);
    ctx.font = '12px "Malgun Gothic",sans-serif'; ctx.fillText('20m', ox + 10, oy + side - 24);
    ctx.fillStyle = 'rgba(95,90,84,0.85)';
    for (let b = 0; b < B.n; b++) {
      if (!B.state[b]) continue;
      const x = B.state[b] === 2 ? B.x[b] : B.x0[b], y = B.state[b] === 2 ? B.y[b] : B.y0[b], r = Math.max(1, (B.r[b] / CELL_M) * sc * 0.8);
      ctx.beginPath(); ctx.arc(ox + x * sc, oy + y * sc, r, 0, Math.PI * 2); ctx.fill();
    }
  };
  drawContourMap(mapView, { h: hm, N, north: false, interval: 2, overlay });
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
labels.add('joint', '절리', '화강암의 가로세로 틈', 'rock');
labels.add('corestone', '핵석', '모서리부터 깎여 둥글어진 덩어리', 'rock');
labels.add('saprolite', '풍화층(마사토)', '썩어 부서진 바위', 'under');
labels.add('bedrock', '기반암', '아직 단단한 화강암', 'rock');
labels.add('freeze', '얼었다 녹기', '흙이 흘러내림(솔리플럭션)', 'cold');
labels.add('stream', '암괴류', '골짜기를 따라 길게 모인 바위', 'key');
labels.add('field', '암괴원', '완만한 곳에 넓게 깔린 바위', 'key');
labels.add('forest', '숲', '바위 둘레에 다시 자람', 'plant');
labels.add('left', '완만한 비탈', '', 'cmp');
labels.add('right', '급한 비탈', '', 'cmp');
labels.add('pinA', 'A', '', 'pin');
labels.add('pinB', 'B', '', 'pin');

const v3 = new THREE.Vector3();
const toScreen = (x, wy, z, block = blockA) => {
  v3.set(x - CENTER + block.group.position.x, wy, z - CENTER).project(camera);
  return v3.z > 1 ? null : { x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight };
};
let labelsOn = true;
function syncLabels() {
  if (showing !== '3d' || !labelsOn) { labels.place([]); return; }
  camera.updateMatrixWorld();
  const list = [];
  if (compare) {
    const s = toScreen(CENTER, worldY(modelB.bottom, 0) - 2, N + 8, blockA), q = toScreen(CENTER, worldY(modelB.bottom, 0) - 2, N + 8, blockB);
    if (s) list.push({ key: 'left', ...s, priority: 6, keep: true });
    if (q) list.push({ key: 'right', ...q, priority: 6, keep: true });
    labels.place(list);
    return;
  }
  const p = model.spots();
  // 옆 칸(진행상황) 뒤로 들어간 자리의 이름표는 숨긴다.
  // 이름표 상자가 화면이나 조작 칸에 잘리지 않게, 가운데 자리가 상자 반 너비(약 90px) 넘게 안쪽에 있을 때만 단다.
  const left = panelW() + 90, right = innerWidth - dock() - 90, bottom = innerHeight - sheetH() - 8;
  const put = (key, q, up, priority, keep = true, face = false) => {
    if (!q) return;
    const s = toScreen(q.x, blockA.worldOf(q.x, q.y, q.z) + up, face ? q.y + 0.6 : q.y);
    if (s && s.x > left && s.x < right && s.y > 40 && s.y < bottom) list.push({ key, ...s, priority, keep });
  };
  put('joint', p.joint, 0, 9, true, true);
  put('bedrock', p.bedrock, 0, 7, true, true);
  put('saprolite', p.saprolite, 0, 10, true, true);
  put('corestone', p.corestone, 0, 11, true, true);
  put('freeze', p.freeze, 3, 10);
  put('stream', p.stream, 2.5, 13);
  put('field', p.field, 2.5, 12);
  put('forest', p.forest, 8, 8, false);
  const pts = [[valleyX(1), 1], [valleyX(N - 2), N - 2]];
  put('pinA', { x: pts[0][0], y: pts[0][1], z: model.sample(pts[0][0], pts[0][1]) }, 1, 13, false);
  put('pinB', { x: pts[1][0], y: pts[1][1] - 1, z: model.sample(pts[1][0], pts[1][1] - 1) }, 1, 13);
  labels.place(list);
}

// 실시간 단면: 골짜기 가운데 줄을 따라 산꼭대기(A)에서 산기슭(B)까지. 블록 옆면과 같은 그리기 함수를 쓴다.
const SN = N - 2;
const sectionLineOf = m => ({
  n: SN,
  at: t => { const y = 1 + t; return [valleyX(y), y]; },
  proj: (x, y) => [y - 1, x - valleyX(y)],
  cross: m.joints.ys.map(v => v / CELL_M - 1),
});
function sectionRange() {
  let hi = -1e9, lo = 1e9;
  for (const m of compare ? [model, modelB] : [model]) for (let t = 0; t < SN; t++) {
    const y = 1 + t, x = valleyX(y), g = m.sampleOrig(x, y);
    hi = Math.max(hi, worldY(g, g)); lo = Math.min(lo, worldY(g - WD * 1.3, g));
  }
  return { yTop: hi + 3, yBot: lo };
}
function drawSection(canvas, m, range) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, plotH = H - 40;
  const P = figPalette(), DK = isDark();
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H); ctx.save(); ctx.strokeStyle = P.frame; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1); ctx.restore();
  const line = sectionLineOf(m);
  ctx.save();
  const r = drawCut(ctx, W, plotH, m, line, { ...range, loose: true });
  ctx.restore();
  const say = (text, cx, cy, color, size = 20, align = 'center') => {
    ctx.font = `700 ${size}px "Malgun Gothic",sans-serif`; ctx.textAlign = align;
    const w = ctx.measureText(text).width;
    if (align === 'center') cx = Math.min(W - w / 2 - 10, Math.max(w / 2 + 10, cx));
    ctx.lineWidth = 5; ctx.strokeStyle = P.bg; ctx.strokeText(text, cx, cy);
    ctx.fillStyle = color; ctx.fillText(text, cx, cy);
  };
  const ph = m.phase(), n = line.n, X = r.X;
  // 실제로 있는 것에만 이름을 단다.
  const tB = Math.round(n * 0.2);
  say('기반암', X(tB), Math.min(plotH - 12, r.yAt(tB, r.fA[tB] - 4)), P.ink);
  if (m.weatherFrac() > 0.25) {
    const t = Math.round(n * 0.45), mid = (r.hA[t] + Math.min(r.hA[t], r.fA[t])) / 2;
    if (r.hA[t] - r.fA[t] > 1.5) say('풍화층(마사토)', X(t), r.yAt(t, mid) + 6, (DK ? '#ffd9a0' : '#8a5a1c'));
    const B = m.boulders;
    let best = -1;
    for (let b = 0; b < B.n; b++) {
      if (B.state[b] !== 0 || B.rho[b] < 0.3) continue;
      const [tt, d] = line.proj(B.x0[b], B.y0[b]);
      if (Math.abs(d) > 1.5 || tt < n * 0.6 || tt > n * 0.9) continue;
      if (best < 0 || B.rho[b] > B.rho[best]) best = b;
    }
    if (best >= 0) { const [tt] = line.proj(B.x0[best], B.y0[best]); say('핵석', X(tt), r.yAt(tt, m.sampleOrig(B.x0[best], B.y0[best]) - B.zc[best]) + 7, (DK ? '#ffffff' : '#111'), 19); }
  }
  if (m.jointFrac() > 0.3 && ph !== 'today' && ph !== 'done') say('절리', X(Math.round(n * 0.08)), r.yAt(Math.round(n * 0.08), r.fA[Math.round(n * 0.08)] - 6), (DK ? '#ffe9b0' : '#a8780a'), 19);
  const rep = blockReport(m);
  if (rep.streamPct >= STREAM_SOME && rep.loose > 0 && (ph === 'gather' || ph === 'warm' || ph === 'today' || ph === 'done')) {
    // 골짜기 바닥에 바위가 가장 두껍게 쌓인 곳
    let bt = -1, bd = 0;
    for (let t = Math.round(n * 0.3); t < n - 4; t++) { const [x, y] = line.at(t), d = m.sample(x, y) - m.sampleGround(x, y); if (d > bd) { bd = d; bt = t; } }
    if (bt >= 0 && bd > 1.5) say('암괴류', X(bt), r.yAt(bt, m.sample(...line.at(bt))) - 14, (DK ? '#ffe08a' : '#a8780a'), 21);
  }
  say('A 산꼭대기', 12, 26, P.hi, 20, 'left'); say('산기슭 B', W - 12, 26, P.hi, 20, 'right');
  // 라이트 모드에서는 땅 위에 깔린 설명 글이 묻히지 않게 아래에 밝은 띠를 깐다.
  if (!DK) { ctx.fillStyle = P.bg; ctx.fillRect(1, H - 38, W - 2, 37); ctx.fillStyle = P.frame; ctx.fillRect(1, H - 38, W - 2, 1); }
  ctx.textAlign = 'left'; ctx.font = '700 17px "Malgun Gothic",sans-serif'; ctx.fillStyle = P.ink;
  ctx.fillText('주황: 풍화층(마사토), 밝은 회색 둥근 덩어리: 핵석과 바위, 검은 줄: 절리', 12, H - 12);
  ctx.textAlign = 'right'; ctx.font = '17px "Malgun Gothic",sans-serif';
  ctx.fillText('땅 높이 과장', W - 12, H - 12);
  ctx.textAlign = 'left';
}

const PHASE_NAME = { joint: '화강암에 절리가 생김', weather: '땅속 풍화, 핵석이 생김', cold: '빙기, 얼었다 녹기', gather: '바위가 비탈 아래로 모임', warm: '빙기가 끝남', today: '오늘날', done: '완성' };
const noteEl = document.getElementById('now'), statsEl = document.getElementById('stats');
let report = null, reportVersion = -1;
function syncInfo() {
  const ph = model.phase();
  if (reportVersion !== model.version) { report = blockReport(model); reportVersion = model.version; }
  const r = report;
  // 막대와 판정 문구는 같은 집계(blockReport)에서 나온다.
  const bar = (id, v, end) => { document.getElementById(id).style.width = `${Math.min(1, Math.max(0, v) / end) * 100}%`; };
  bar('countBar', r.exposed, 10000); document.getElementById('countVal').textContent = `${r.exposed}개 (막대 끝 10000개)`;
  bar('sizeBar', r.sizeM, 5); document.getElementById('sizeVal').textContent = r.exposed ? `지름 약 ${r.sizeM}m (막대 끝 5m)` : '드러난 바위 없음';
  bar('movedBar', r.movedM, 80); document.getElementById('movedVal').textContent = `평균 약 ${r.movedM}m (막대 끝 80m)`;
  bar('areaBar', r.areaM2, 20000); document.getElementById('areaVal').textContent = `약 ${r.areaM2}m² (막대 끝 20000m²)`;
  bar('streamBar', r.streamPct, 100); document.getElementById('streamVal').textContent = r.exposed ? `드러난 바위의 약 ${r.streamPct}% (나머지 약 ${r.fieldPct}%)` : '드러난 바위 없음';
  document.getElementById('rateNote').textContent = r.text;
  statsEl.innerHTML = `절리 간격 <b>약 ${SPACING[model.options.spacing].sp}m</b>, 풍화층 평균 두께 <b>약 ${r.sapM}m</b>`;
  document.getElementById('phaseBadge').textContent = PHASE_NAME[ph];
  if (compare) {
    const br = compareBrief(model, modelB);
    noteEl.textContent = `왼쪽 블록(완만한 비탈)은 ${br.a}. 오른쪽 블록(급한 비탈)은 ${br.b}. ${br.extra}`;
    statsEl.innerHTML = '';
    document.getElementById('steps').textContent = '두 조건 비교';
    return;
  }
  noteEl.textContent = noteText(model);
  document.getElementById('steps').textContent = model.finished ? '완성' : `진행 ${Math.floor((model.clock / model.endTime()) * 100)}%`;
  schematic.setStage(ph === 'joint' ? JOINT : ph === 'weather' ? WEATHER : ph === 'cold' ? COLD : BLOCKS);
}

// 모식도 구역을 누르면 3D 이름표가 강조된다.
const ZONE_LABELS = { joint: ['joint'], corestone: ['corestone'], saprolite: ['saprolite'], bedrock: ['bedrock'], freeze: ['freeze'], stream: ['stream'], field: ['field'], forest: ['forest'] };
const highlight = zone => {
  for (const [z, keys] of Object.entries(ZONE_LABELS)) for (const k of keys) labels.element(k).classList.toggle('hi', z === zone);
  dirty = true;
};
const schematic = createSchematic(document.getElementById('schem'), { onZone: highlight, stage: JOINT });
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
  o.classList.toggle('on', op.slope === p.slope && op.spacing === p.spacing && op.cycles === p.cycles);
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

// 두 조건 비교: 왼쪽은 완만한 비탈, 오른쪽은 급한 비탈. 절리 간격과 얼었다 녹는 횟수는 같다. 끝내면 비교 전에 고른 조건으로 돌아간다.
let before = null;
function setCompare(on) {
  if (on === compare) return;
  compare = on;
  blockB.group.visible = on;
  blockA.group.position.x = on ? -COMPARE_GAP : 0;
  blockB.group.position.x = COMPARE_GAP;
  const e = on ? 190 : 110;
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
  if (on) { setShowing('3d'); Object.assign(model.options, { ...before, slope: 'gentle' }); model.reset(); Object.assign(modelB.options, { ...before, slope: 'steep' }); modelB.reset(); }
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
  if (all || frame % 6 === 0) {
    const range = sectionRange();
    drawSection(document.getElementById('section'), model, range);
    if (compare) drawSection(document.getElementById('sectionB'), modelB, range);
    blockA.syncFaces(); if (compare) blockB.syncFaces();
    syncInfo();
  }
  if (all || (changed && frame % 30 === 0)) drawMap();
  if (all || frame % 3 === 0) syncLabels();
}
// 재생 중에는 늘 그린다. 멈추면 시점을 돌릴 때만 다시 그린다.
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (playing && !model.finished) {
    model.tick(dt * speed);
    if (compare) modelB.tick(dt * speed);
    frame++;
    frameSync(false);
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
  progress, model, modelB, setView, setPlaying, setCompare,
  advance(seconds) { setPlaying(false); model.tick(seconds); if (compare) modelB.tick(seconds); frameSync(true); renderer.render(scene, camera); const r = blockReport(model); return { clock: +model.clock.toFixed(1), phase: model.phase(), finished: model.finished, exposed: r.exposed, size: r.sizeM, moved: r.movedM, area: r.areaM2, stream: r.streamPct }; },
  preset: n => document.querySelector(`[data-preset="${n}"]`).click(),
  setOption: (n, v) => document.querySelector(`[data-opt="${n}:${v}"]`).click(),
  draws: () => renderer.info.render.frame,
  labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
};
window.__APP_READY = true;
