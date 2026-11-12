// © 2026 김용현
// 화강암 풍화 지형 형성 모형 화면. 계산은 model.js가 하고, 여기서는 그 결과를 3D 블록과 단면으로 그린다.
import { createProgressBar } from '../../shared/progress.js';
import * as THREE from 'three';
import { OrbitControls } from '../../shared/vendor/OrbitControls.js';
import { isPhone, portraitZoom } from '../../shared/viewport.js';
import { setupPanel } from '../../shared/panel.js';
import { QUALITY, currentQuality, setupQualityButton } from '../../shared/quality.js';
import { createFpsMeter } from '../../shared/fps.js';
import { createLabelLayer } from '../../shared/labels.js';
import { setupPivot } from '../../shared/pivot.js';
import { createModel, noteText, graniteReport, compareBrief, N, DC, SPACING, DURATION, ROCK, DOME_MIN, T_WEATHER, T_EXPOSE, T_TODAY } from './model.js';
import { createBlock, drawCut, worldY } from './block.js';
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
controls.maxPolarAngle = Math.PI * 0.49;
controls.addEventListener('change', () => { dirty = true; });
controls.minDistance = 20;
controls.maxDistance = 1000;

// 앞쪽 조금 오른쪽에서 비스듬히 내려다본다. 앞면과 오른쪽 옆면에 땅속 단면이 드러난다.
const VIEWS = {
  oblique: { p: [150, 150, 250], t: [-6, -2, 0] },
  above: { p: [0, 380, 40], t: [0, 0, 0] },
  low: { p: [70, 26, 170], t: [-14, 10, -6] },
  compare: { p: [0, 270, 430], t: [0, -4, 10] },
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
sun.position.set(-120, 160, 110);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(Math.min(Q.shadow, 2048));
Object.assign(sun.shadow.camera, { left: -100, right: 100, top: 100, bottom: -100, near: 10, far: 600 });
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

// 이름표
const labels = createLabelLayer(document.getElementById('labels'));
labels.add('joint', '절리', '바위의 가로세로 틈', 'rock');
labels.add('foliation', '편마암', '광물이 줄무늬처럼 늘어선 바위', 'rock');
labels.add('front', '풍화 전선', '풍화가 닿은 가장 깊은 곳', 'under');
labels.add('saprolite', '풍화층(그루스)', '썩어 부서진 바위(새프롤라이트)', 'under');
labels.add('saproliteG', '풍화층', '고운 흙이 많음', 'under');
labels.add('corestone', '핵석', '모서리부터 깎여 둥글어진 덩어리', 'rock');
labels.add('bedrock', '기반암', '아직 단단한 바위', 'rock');
labels.add('soliflux', '솔리플럭션', '얼었다 녹으며 풍화층이 흘러내림', 'cold');
labels.add('tor', '토르', '기반암 위에 쌓인 핵석', 'key');
labels.add('dome', '돔(보른하르트)', '큰 덩어리가 통째로 드러남', 'key');
labels.add('knob', '낮은 바위 언덕', '절리가 성긴 덩어리가 드러남', 'key');
labels.add('sheet', '판상 절리와 박리', '겉과 나란한 틈, 벗겨지는 판', 'rock');
labels.add('nama', '나마', '평평한 윗면의 오목한 웅덩이', 'micro');
labels.add('tafoni', '타포니', '벽에 옆으로 파인 구멍', 'micro');
labels.add('groove', '그루브', '벽에 길게 파인 홈', 'micro');
labels.add('soilMountain', '흙산', '흙과 숲이 덮은 산', 'plant');
labels.add('forest', '숲', '풍화층이 남은 땅', 'plant');
// 비교 이름표: 돌산이라는 말은 화강암 판정이 'stone'일 때만, 흙산은 편마암 판정이 'soil'일 때만 쓴다.
labels.add('left', '화강암', '', 'cmp');
labels.add('leftStone', '돌산(화강암)', '', 'cmp');
labels.add('right', '편마암', '', 'cmp');
labels.add('rightSoil', '흙산(편마암)', '', 'cmp');
labels.add('pinA', 'A', '', 'pin');
labels.add('pinB', 'B', '', 'pin');

const PHONE_CORE = ['corestone', 'saprolite', 'saproliteG', 'tor', 'dome', 'knob', 'nama', 'tafoni', 'soilMountain', 'front'];
const v3 = new THREE.Vector3();
const toScreen = (x, wy, z, block = blockA) => {
  v3.set(x - CENTER + block.group.position.x, wy, z - CENTER).project(camera);
  return v3.z > 1 ? null : { x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight };
};
let labelsOn = true;
function syncLabels() {
  if (!labelsOn) { labels.place([]); return; }
  camera.updateMatrixWorld();
  const list = [];
  if (compare) {
    const s = toScreen(CENTER, worldY(model.bottom) - 2, N + 6, blockA), q = toScreen(CENTER, worldY(modelB.bottom) - 2, N + 6, blockB);
    const ka = graniteReport(model).kind, kb = graniteReport(modelB).kind;
    if (s) list.push({ key: ka === 'stone' ? 'leftStone' : 'left', ...s, priority: 6, keep: true });
    if (q) list.push({ key: kb === 'soil' ? 'rightSoil' : 'right', ...q, priority: 6, keep: true });
    labels.place(list);
    return;
  }
  const p = model.spots(), gneiss = model.options.rock === 'gneiss';
  // 이름표 상자가 화면이나 조작 칸에 잘리지 않게, 가운데 자리가 상자 반 너비(약 90px) 넘게 안쪽에 있을 때만 단다.
  const left = panelW() + 90, right = innerWidth - dock() - 90, bottom = innerHeight - sheetH() - 8;
  const put = (key, q, up, priority, keep = true, face = false) => {
    if (!q) return;
    const s = toScreen(q.x, worldY(q.z) + up, face ? q.y + 0.6 : q.y);
    if (isPhone() && PHONE_CORE.includes(key)) priority += 10;
    if (s && s.x > left && s.x < right && s.y > 40 && s.y < bottom) list.push({ key, ...s, priority, keep });
  };
  put(gneiss ? 'foliation' : 'joint', p.joint, 0, 9, true, true);
  put('bedrock', p.bedrock, 0, 7, false, true);
  put('front', p.front, 0, 10, true, true);
  put(gneiss ? 'saproliteG' : 'saprolite', p.saprolite, 0, 10, true, true);
  put('corestone', p.corestone, 0, 11, true, true);
  put('soliflux', p.soliflux, 3, 10);
  put('tor', p.tor, 1.5, 13);
  if (p.dome) put(p.domeKind === 'dome' ? 'dome' : 'knob', p.dome, 2, 14);
  put('sheet', p.sheet, 1, 9, false);
  put('nama', p.nama, 0.6, 12);
  put('tafoni', p.tafoni, 0.6, 12);
  put('groove', p.groove, 0.6, 10, false);
  put('soilMountain', p.soilMountain, 10, 13);
  put('forest', p.forest, 9, 8, false);
  put('pinA', { x: 1, y: DC.y, z: model.sample(1, DC.y) }, 1, 13, false);
  put('pinB', { x: N - 2, y: DC.y, z: model.sample(N - 2, DC.y) }, 1, 13, false);
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

// 진행상황 칸의 단면: 돔 한가운데를 지나 A에서 B까지. 블록 옆면과 같은 그리기 함수(drawCut)를 쓴다.
const LINE = { n: N, at: t => [t, DC.y], proj: (x, y) => [x, y - DC.y], axis: 'x' };
function sectionRange() {
  let hi = -1e9, lo = 1e9;
  for (const m of compare ? [model, modelB] : [model]) for (let t = 0; t < N; t++) {
    const k = DC.y * N + t;
    hi = Math.max(hi, m.g[k]); lo = Math.min(lo, m.g[k] - m.D[k]);
  }
  return { zTop: hi + 4, zBot: lo - 4 };
}
function drawSection(canvas, m, range) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, foot = 84, plotH = H - foot;
  const P = figPalette(), DK = isDark();
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, plotH); ctx.clip();
  const r = drawCut(ctx, W, plotH, m, LINE, { ...range, bg: P.bg });
  ctx.restore();
  ctx.save(); ctx.strokeStyle = P.frame; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1); ctx.restore();
  const used = [];
  const say = (text, cx, cy, color, size = 27, align = 'center') => {
    if (used.some(u => Math.abs(u[0] - cx) < 170 && Math.abs(u[1] - cy) < 34)) return;
    used.push([cx, cy]);
    ctx.font = `700 ${size}px "Malgun Gothic",sans-serif`; ctx.textAlign = align;
    const w = ctx.measureText(text).width;
    if (align === 'center') cx = Math.min(W - w / 2 - 10, Math.max(w / 2 + 10, cx));
    cy = Math.min(plotH - 8, Math.max(size + 4, cy));
    ctx.lineWidth = 5; ctx.strokeStyle = P.bg; ctx.strokeText(text, cx, cy);
    ctx.fillStyle = color; ctx.fillText(text, cx, cy);
  };
  const ph = m.phase(), X = r.X, Y = r.Y, gneiss = m.options.rock === 'gneiss', rep = graniteReport(m);
  const ink = P.ink, warm = DK ? '#ffd9a0' : '#8a5a1c', red = DK ? '#ff9b7a' : '#8a2f12', hi = P.hi;
  const tA = Math.round(N * 0.07);
  say('기반암', X(tA) + 30, Y(r.fA[tA] - 8), ink);
  if (m.jointFrac() > 0.3 && !gneiss) { const t = Math.round(N * 0.93); say('절리', X(t), Y(r.fA[t] - 12), hi, 25); }
  if (m.weatherFrac() > 0.15) {
    // 풍화층이 가장 두꺼운 곳에 이름을 단다.
    let bt = -1, bd = 0;
    for (let t = 78; t < N - 14; t++) { const d = r.hA[t] - r.fA[t]; if (d > bd) { bd = d; bt = t; } }
    if (bt >= 0 && bd > 3) {
      say(gneiss ? '풍화층(고운 흙)' : '풍화층(그루스)', X(bt), Y(r.hA[bt] - bd * 0.25) + 8, warm);
      say('풍화 전선', X(bt), Y(r.fA[bt]) + 30, red, 25);
    }
    if (!gneiss) {
      const B = m.blocks;
      let best = -1;
      for (let b = 0; b < B.n; b++) {
        if (B.gone[b] || B.state[b] || B.rho[b] < 0.4) continue;
        const [t, d] = LINE.proj(B.x[b], B.y[b]);
        if (Math.abs(d) > 1.5 || t < 80 || t > N - 6) continue;
        if (best < 0 || B.rho[b] > B.rho[best]) best = b;
      }
      if (best >= 0) say('핵석', X(B.x[best]), Y(B.zb[best] + B.hz[best] * B.s[best]) + 9, ink, 25);
    }
  }
  if (ph === 'cold') say('솔리플럭션으로 풍화층이 흘러내림', W * 0.7, Y(Math.max(...r.hA.slice(70))) - 30, DK ? '#9fd0f0' : '#1d5f9e', 25);
  const dm = m.dome();
  if (dm.exposed && dm.height >= 3) {
    let tt = DC.x;
    for (let t = DC.x - 6; t <= DC.x + 6; t++) if (r.hA[t] > r.hA[tt]) tt = t;
    say(rep.domeM >= DOME_MIN ? '돔(보른하르트)' : '낮은 바위 언덕', X(tt), Y(r.hA[tt]) - 24, hi, 28);
    if (m.sheetFrac() > 0.3) say('판상 절리', X(DC.x + 0.55 * m.bodyR()), Y(r.hA[Math.round(DC.x + 0.55 * m.bodyR())] - 6) + 4, ink, 24);
  }
  const tors = m.tors().filter(q => Math.abs(q.y - DC.y) < 4);
  if (tors.length) say('토르', X(tors[0].x), Y(tors[0].top) - 20, hi, 27);
  if (gneiss && (ph === 'today' || ph === 'done')) say('흙이 덮은 흙산', W * 0.4, Y(Math.max(...r.hA)) - 24, DK ? '#9fd38a' : '#2f6a1e', 27);
  say('A', 14, 32, hi, 28, 'left'); say('B', W - 14, 32, hi, 28, 'right');
  ctx.fillStyle = P.bg; ctx.fillRect(1, plotH, W - 2, foot - 1); ctx.fillStyle = P.frame; ctx.fillRect(1, plotH, W - 2, 1);
  ctx.textAlign = 'left'; ctx.font = '700 23px "Malgun Gothic",sans-serif'; ctx.fillStyle = P.ink;
  ctx.fillText(gneiss ? '갈색: 풍화층(고운 흙), 회색 줄무늬: 편마암, 짧은 검은 줄: 틈' : '주황: 풍화층(그루스), 밝은 덩어리: 핵석과 바위, 검은 줄: 절리', 12, H - 50);
  ctx.fillText('붉은 점선: 풍화 전선', 12, H - 16);
  ctx.textAlign = 'right'; ctx.font = '23px "Malgun Gothic",sans-serif';
  ctx.fillText('높이 과장 없음', W - 12, H - 16);
  ctx.textAlign = 'left';
}

const PHASE_NAME = {
  joint: '바위와 절리', weather: '덥고 습한 시기, 땅속 깊은 풍화', cold: '추운 시기, 풍화층이 흘러내림', expose: '토르와 돔이 드러남',
  today: '오늘날, 바위 겉의 작은 지형', done: '완성',
};
const noteEl = document.getElementById('now'), statsEl = document.getElementById('stats');
let report = null, reportVersion = -1;
function syncInfo() {
  const ph = model.phase();
  if (reportVersion !== model.version) { report = graniteReport(model); reportVersion = model.version; }
  const r = report;
  // 막대와 판정 문구는 같은 집계(graniteReport)에서 나온다.
  const bar = (id, v, end) => { document.getElementById(id).style.width = `${Math.min(1, Math.max(0, v) / end) * 100}%`; };
  bar('sapBar', r.sapM, 40); document.getElementById('sapVal').textContent = `평균 약 ${r.sapM}m (막대 끝 40m)`;
  bar('rockBar', r.rockPct, 30); document.getElementById('rockVal').textContent = `블록 윗면의 약 ${r.rockPct}% (막대 끝 30%)`;
  bar('torBar', r.tors, 8); document.getElementById('torVal').textContent = `${r.tors}개 (막대 끝 8개)`;
  bar('domeBar', r.domeM, 30); document.getElementById('domeVal').textContent = r.domeM ? `주변보다 약 ${r.domeM}m (막대 끝 30m)` : '드러난 돔 없음';
  document.getElementById('rateNote').textContent = r.text;
  statsEl.innerHTML = `암석 <b>${ROCK[model.options.rock].name}</b>, 절리 간격 <b>약 ${SPACING[model.options.spacing].sp}m</b>, 땅속 풍화 기간 <b>${DURATION[model.options.duration].name}</b>`;
  const gn = model.options.rock === 'gneiss' && !compare;
  document.getElementById('legRock').textContent = gn ? '편마암' : '화강암';
  document.getElementById('legReg').textContent = gn ? '풍화층(고운 흙)' : '풍화층(그루스)';
  document.getElementById('legRockC').style.background = gn ? '#8d877f' : '#cfc5bb';
  document.getElementById('legRegC').style.background = gn ? '#b9824e' : '#d9b47c';
  document.getElementById('legCore').hidden = gn;
  document.getElementById('phaseBadge').textContent = model.options.rock === 'gneiss' && ph === 'expose' ? '풍화층이 얇아짐' : PHASE_NAME[ph];
  if (compare) {
    const br = compareBrief(model, modelB);
    noteEl.textContent = `왼쪽 블록(화강암): ${br.a}. 오른쪽 블록(편마암): ${br.b}. ${br.extra}`;
    statsEl.innerHTML = `절리 간격 <b>약 ${SPACING[model.options.spacing].sp}m</b>, 땅속 풍화 기간 <b>${DURATION[model.options.duration].name}</b>`;
    document.getElementById('steps').textContent = '화강암과 편마암 비교';
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

// 화강암과 편마암 비교: 왼쪽은 화강암, 오른쪽은 편마암. 절리 간격과 땅속 풍화 기간은 같다. 끝내면 비교 전 조건으로 돌아간다.
let before = null;
function setCompare(on) {
  if (on === compare) return;
  compare = on;
  blockB.group.visible = on;
  blockA.group.position.x = on ? -COMPARE_GAP : 0;
  blockB.group.position.x = COMPARE_GAP;
  const e = on ? 180 : 100;
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
  if (on) { Object.assign(model.options, { ...before, rock: 'granite' }); model.reset(); Object.assign(modelB.options, { ...before, rock: 'gneiss' }); modelB.reset(); }
  else { Object.assign(model.options, before); model.reset(); }
  markOptions();
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

// 북한산 화면의 링크(#stage-1, #stage-2, #stage-3)로 들어오면 땅속 풍화, 토르와 돔이 드러남, 오늘날이 시작하는 때로 옮긴다.
const STAGE_AT = { 'stage-1': T_WEATHER[0], 'stage-2': T_EXPOSE, 'stage-3': T_TODAY };
function seekHash() {
  const at = STAGE_AT[location.hash.slice(1)];
  // 계산은 0.2초씩 나아가므로 조금 지나서 멈춰야 그 단계에 들어간다.
  if (at != null) progress.seek((at + 0.3) / model.endTime());
}
seekHash();
addEventListener('hashchange', seekHash);

window.__MODEL = {
  progress, model, modelB, setView, setPlaying, setCompare,
  advance(seconds) { setPlaying(false); model.tick(seconds); if (compare) modelB.tick(seconds); frameSync(true); renderer.render(scene, camera); const r = graniteReport(model); return { clock: +model.clock.toFixed(1), phase: model.phase(), finished: model.finished, sap: r.sapM, rock: r.rockPct, tors: r.tors, dome: r.domeM }; },
  setOption: (n, v) => document.querySelector(`[data-opt="${n}:${v}"]`).click(),
  draws: () => renderer.info.render.frame,
  camTo(p, t) { camera.position.set(...p); controls.target.set(...t); controls.update(); dirty = true; renderer.render(scene, camera); },
  labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
};
window.__APP_READY = true;
