// © 2026 김용현
// 용암대지와 한탄강 협곡 형성 모형 화면. 계산은 model.js가 하고, 여기서는 그 결과를 3D 블록과 단면으로 그린다.
import { createProgressBar } from '../../shared/progress.js';
import * as THREE from 'three';
import { OrbitControls } from '../../shared/vendor/OrbitControls.js';
import { isPhone, portraitZoom } from '../../shared/viewport.js';
import { setupPanel } from '../../shared/panel.js';
import { QUALITY, currentQuality, setupQualityButton } from '../../shared/quality.js';
import { createFpsMeter } from '../../shared/fps.js';
import { createLabelLayer } from '../../shared/labels.js';
import { setupPivot } from '../../shared/pivot.js';
import { createModel, noteText, plateauReport, compareBrief, N, CW, NF, CELL_M, PRESETS, VISC, VOLUME, ERODE, T_ERUPT, T_FILL, T_CANYON, T_TODAY } from './model.js';
import { createBlock, drawCut, worldY, rowOutline, VE } from './block.js';
import { figPalette, isDark, bg3d } from '../../shared/theme.js';

const QUALITY_NAME = currentQuality(isPhone()), Q = QUALITY[QUALITY_NAME];
const meter = createFpsMeter();
const model = createModel();
const C0 = (N - 1) / 2, F = N - 1;

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
controls.minDistance = 12;
controls.maxDistance = 1000;

// 앞쪽 조금 오른쪽에서 비스듬히 내려다본다. 앞면(골짜기를 가로지른 단면)과 협곡이 보인다.
const VIEWS = {
  oblique: { p: [168, 150, 200], t: [-2, 2, 6] },
  above: { p: [0, 360, 40], t: [0, 0, 0] },
  low: { p: [27, 11, 84], t: [24, 5, 10] },
  compare: { p: [0, 270, 430], t: [0, -4, 10] },
};
function setView(name) {
  // 세로 휴대폰 화면에서는 블록 앞면이 A에서 B까지 다 들어오도록 조금 더 뒤로 뺀다.
  const z = portraitZoom() * (isPhone() && innerWidth < innerHeight && name === 'oblique' ? 1.2 : 1), { p, t } = VIEWS[name];
  camera.position.set(t[0] + (p[0] - t[0]) * z, t[1] + (p[1] - t[1]) * z, t[2] + (p[2] - t[2]) * z);
  controls.target.set(...t);
  controls.update();
  dirty = true;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === name || (name === 'compare' && b.dataset.view === 'oblique')));
}

scene.add(new THREE.HemisphereLight(0xdfe9f5, 0x54493c, 1.25));
const sun = new THREE.DirectionalLight(0xfff1dd, 2.6);
// 해는 동남쪽 위에 두어, 비스듬히 보는 쪽(동쪽)을 향한 협곡 절벽의 주상절리에 빛이 든다.
sun.position.set(110, 175, 130);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(Math.min(Q.shadow, 2048));
Object.assign(sun.shadow.camera, { left: -100, right: 100, top: 100, bottom: -100, near: 10, far: 700 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.5;
scene.add(sun);

const blockA = createBlock(model, { quality: Q.trees });
scene.add(blockA.group);
const COMPARE_GAP = (N + 12) / 2;
const modelB = createModel();
const blockB = createBlock(modelB, { quality: Q.trees });
blockB.group.visible = false;
scene.add(blockB.group);
let compare = false, panelBeforeCompare = false, setPanel = () => {};

// 이름표
const labels = createLabelLayer(document.getElementById('labels'));
labels.add('granite', '기반암(화강암)', '골짜기 왼쪽 산지', 'rock');
labels.add('gneiss', '기반암(편마암)', '골짜기 오른쪽 산지', 'rock');
labels.add('gravel', '옛 하천 자갈층', '백의리층 같은 층', 'under');
labels.add('gravelCanyon', '옛 하천 자갈층', '협곡 바닥 가까이 드러남', 'under');
labels.add('oldValley', '옛 골짜기', '화강암과 편마암 산지 사이', 'water');
labels.add('oldRiver', '옛 하천', '골짜기 바닥을 흐름', 'water');
labels.add('trib', '지류', '산지에서 흘러듦', 'water');
labels.add('fissure', '열하(갈라진 틈)', '틈을 따라 용암이 솟음', 'hot');
labels.add('lava', '묽은 용암', '낮은 곳을 따라 멀리 흐름', 'hot');
labels.add('lavaSticky', '끈적한 용암', '멀리 못 가고 쌓임', 'hot');
labels.add('layers', '용암층', '여러 번 흘러 겹침', 'rock');
labels.add('lake', '용암댐 호수', '막힌 지류에 물이 고임', 'water');
labels.add('cone', '분석구', '한 곳에서 터진 분출(오리산 같은)', 'key');
labels.add('steptoe', '스텝토', '용암에 묻히지 않은 옛 봉우리', 'rock');
labels.add('plateau', '용암대지', '골짜기를 메운 평평한 땅', 'key');
labels.add('mound', '용암 언덕', '끈적한 용암이 두껍게 쌓임', 'key');
labels.add('divide', '능선을 넘은 용암', '분수계를 넘어 옆까지 덮음', 'hot');
labels.add('river', '본류', '대지 위를 흐르는 강', 'water');
labels.add('canyon', '협곡', '본류가 깎은 좁고 깊은 골짜기', 'key');
labels.add('columns', '주상절리', '용암이 식으며 생긴 기둥', 'rock');
labels.add('fall', '폭포', '상류로 물러남(재인폭포 같은)', 'water');
labels.add('paddy', '논', '평평한 땅 위의 논', 'plant');
// 비교 이름표: 용암대지라는 말은 묽은 용암 판정이 plateau일 때만 쓴다.
labels.add('left', '묽은 용암', '', 'cmp');
labels.add('leftPlateau', '용암대지(묽은 용암)', '', 'cmp');
labels.add('right', '끈적한 용암', '', 'cmp');
labels.add('rightMound', '용암 언덕(끈적한 용암)', '', 'cmp');
labels.add('pinA', 'A', '', 'pin');
labels.add('pinB', 'B', '', 'pin');

const PHONE_CORE = ['layers', 'gravel', 'gravelCanyon', 'plateau', 'canyon', 'fall', 'lake', 'cone', 'lava', 'lavaSticky', 'mound', 'columns', 'fissure'];
const v3 = new THREE.Vector3();
const toScreen = (x, wy, z, block = blockA) => {
  v3.set(x - C0 + block.group.position.x, wy, z - C0).project(camera);
  return v3.z > 1 ? null : { x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight };
};
let labelsOn = true;
function syncLabels() {
  if (!labelsOn) { labels.place([]); return; }
  camera.updateMatrixWorld();
  const list = [];
  if (compare) {
    const s = toScreen(C0, worldY(model.bottom) - 2, N + 6, blockA), q = toScreen(C0, worldY(modelB.bottom) - 2, N + 6, blockB);
    const pa = plateauReport(model).plateau && model.phase() !== 'fissure';
    if (s) list.push({ key: pa ? 'leftPlateau' : 'left', ...s, priority: 6, keep: true });
    if (q) list.push({ key: modelB.flowsStarted() >= 3 ? 'rightMound' : 'right', ...q, priority: 6, keep: true });
    labels.place(list);
    return;
  }
  const p = model.spots(), fluid = model.options.visc === 'fluid';
  // 이름표 상자가 화면이나 조작 칸에 잘리지 않게, 가운데 자리가 상자 반 너비(약 90px) 넘게 안쪽에 있을 때만 단다.
  const left = panelW() + 90, right = innerWidth - dock() - 90, bottom = innerHeight - sheetH() - 8;
  const put = (key, q, up, priority, keep = true, face = false) => {
    if (!q) return;
    const s = toScreen(q.x, worldY(q.z) + up, face ? q.y + 0.6 : q.y);
    if (isPhone() && PHONE_CORE.includes(key)) priority += 10;
    // A, B 점은 작아서 화면 가장자리 가까이에도 단다.
    const pin = key === 'pinA' || key === 'pinB', l = pin ? (isPhone() ? 14 : panelW() + 16) : left, r = pin ? innerWidth - dock() - 16 : right;
    if (s && s.x > l && s.x < r && s.y > 40 && s.y < bottom) list.push({ key, ...s, priority, keep });
  };
  put('granite', p.granite, 0, 7, false, true);
  put('gneiss', p.gneiss, 0, 7, false, true);
  put('gravel', p.gravel, 0, 10, true, true);
  put('oldValley', p.oldValley, 2, 9);
  put('oldRiver', p.oldRiver, 1, 11);
  put('trib', p.trib, 1, 9);
  put('fissure', p.fissure, 1, 13);
  put(fluid ? 'lava' : 'lavaSticky', p.lava, 1, 12);
  put('layers', p.layers, 0, 12, true, true);
  put('lake', p.lake, 1, 12);
  put('cone', p.cone, 2, 11);
  put('steptoe', p.steptoe, 2, 9, false);
  put('plateau', p.plateau, 1, 12);
  put('mound', p.mound, 2, 12);
  put('divide', p.divide, 1, 8, false);
  put('river', p.river, 1, 10);
  put('canyon', p.canyon, 1, 13);
  put('columns', p.columns, 0, 11);
  put('gravelCanyon', p.gravelCanyon, 0, 10, true, true);
  put('fall', p.fall, 1, 13);
  put('paddy', p.paddy, 1, 9);
  const ax = isPhone() ? 6 : 4;
  put('pinA', { x: ax, y: F, z: model.sample(ax, F) }, 1, 13, false, true);
  put('pinB', { x: N - 2, y: F, z: model.sample(N - 2, F) }, 1, 13, false, true);
  if (isPhone()) {
    const keep = [];
    for (const it of [...list].sort((a, b) => b.priority - a.priority)) {
      const hit = keep.some(k => Math.abs(k.x - it.x) < 70 && Math.abs(k.y - it.y) < 120);
      if (it.key === 'pinA' || it.key === 'pinB' || !hit || (PHONE_CORE.includes(it.key) && !keep.some(k => Math.abs(k.x - it.x) < 40 && Math.abs(k.y - it.y) < 60))) keep.push(it);
    }
    list.length = 0; list.push(...keep);
  }
  labels.place(list);
}

// 진행상황 칸의 단면: 블록 앞면을 A에서 B까지. 블록 옆면과 같은 그리기 함수(drawCut)를 쓴다.
const LINE = { n: N, at: t => [t, F] };
function sectionRange() {
  let hi = -1e9;
  for (const m of compare ? [model, modelB] : [model]) for (let t = 0; t < N; t++) { const k = F * N + t; hi = Math.max(hi, m.zo[k], m.zp[k]); }
  return { zTop: hi + 8, zBot: model.bottom };
}
function drawSection(canvas, m, range) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, foot = 84, plotH = H - foot;
  const P = figPalette(), DK = isDark();
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, plotH); ctx.clip();
  const r = drawCut(ctx, W, plotH, m, LINE, { ...range, bg: P.bg, top: rowOutline(m, F) });
  ctx.restore();
  ctx.save(); ctx.strokeStyle = P.frame; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1); ctx.restore();
  const used = [];
  const say = (text, cx, cy, color, size = 26, align = 'center') => {
    if (used.some(u => Math.abs(u[0] - cx) < 160 && Math.abs(u[1] - cy) < 32)) return;
    used.push([cx, cy]);
    ctx.font = `700 ${size}px "Malgun Gothic",sans-serif`; ctx.textAlign = align;
    const w = ctx.measureText(text).width;
    if (align === 'center') cx = Math.min(W - w / 2 - 10, Math.max(w / 2 + 10, cx));
    cy = Math.min(plotH - 8, Math.max(size + 4, cy));
    ctx.lineWidth = 5; ctx.strokeStyle = P.bg; ctx.strokeText(text, cx, cy);
    ctx.fillStyle = color; ctx.fillText(text, cx, cy);
  };
  const X = r.X, Y = r.Y, rep = plateauReport(m), fluid = m.options.visc === 'fluid';
  const ink = P.ink, light = '#f4efe6', warm = DK ? '#ffd9a0' : '#7a5212', blue = DK ? '#8fc8f0' : '#1d5f9e', hi = P.hi;
  const k0 = F * N;
  // 땅속 이름은 그림 위에 흰 글자로
  const inside = (text, cx, cy, size = 24) => {
    ctx.font = `700 ${size}px "Malgun Gothic",sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,18,16,0.85)'; ctx.strokeText(text, cx, cy); ctx.fillStyle = light; ctx.fillText(text, cx, cy);
  };
  inside('화강암', X(12), Y(m.zo[k0 + 12] - 60));
  inside('편마암', X(116), Y(m.zo[k0 + 116] - 60));
  // 자갈층: 앞면 가운데쯤
  let gx = -1;
  for (let x = 40; x < 80; x++) if (m.gt[k0 + x] > 7) { gx = x; break; }
  if (gx >= 0) say('옛 하천 자갈층', X(gx + 8), Y(m.zb[k0 + gx]) + 30, warm, 24);
  if (rep.layers > 0) {
    let bx = -1, bt = 0;
    for (let x = 36; x < 78; x++) if (m.lava[k0 + x] > bt) { bt = m.lava[k0 + x]; bx = x; }
    if (bx >= 0 && bt > 5) {
      let hot = false;
      for (let f = 0; f < NF; f++) if (m.flowState(f) === 'flow') hot = true;
      inside(fluid ? `용암층 ${rep.layers}장` : '두껍게 쌓인 용암', X(bx), Y(m.zo[k0 + bx] + bt * 0.5) + 8, 25);
      if (!hot && !fluid) say('끈적한 용암 언덕', X(bx), Y(m.z[k0 + bx]) - 22, hi, 26);
    }
  }
  if (rep.plateau && m.phase() !== 'fissure') say('용암대지', X(50), Y(m.z[k0 + 50]) - 22, hi, 27);
  const xc = m.xc[F];
  if (rep.canyonM >= 10 && fluid) {
    say('협곡', X(xc), Y(m.zp[k0 + Math.round(xc)]) - 22, hi, 27);
    if (rep.canyonM > 25) say('주상절리', X(xc - CW - 9), Y(m.zp[k0 + Math.round(xc) - 4] - 18), ink, 23);
    say('본류', X(xc + CW + 7), Y(m.z[k0 + Math.round(xc)]) + 4, blue, 23);
  } else if (m.clock > T_CANYON) say('본류', X(xc), Y(m.z[k0 + Math.round(xc)]) - 16, blue, 23);
  if (m.phase() === 'valley') say('옛 하천', X(m.xo[F]), Y(m.zo[k0 + Math.round(m.xo[F])]) - 18, blue, 23);
  say('A', 14, 32, hi, 28, 'left'); say('B', W - 14, 32, hi, 28, 'right');
  ctx.fillStyle = P.bg; ctx.fillRect(1, plotH, W - 2, foot - 1); ctx.fillStyle = P.frame; ctx.fillRect(1, plotH, W - 2, 1);
  ctx.textAlign = 'left'; ctx.font = '700 23px "Malgun Gothic",sans-serif'; ctx.fillStyle = P.ink;
  ctx.fillText('검은 회색: 현무암(용암층), 노란 갈색: 옛 하천 자갈층', 12, H - 50);
  ctx.fillText('밝은 회색: 화강암, 줄무늬: 편마암, 세로 줄: 주상절리', 12, H - 16);
  ctx.textAlign = 'right'; ctx.font = '23px "Malgun Gothic",sans-serif';
  ctx.fillText('높이 4배 과장', W - 12, H - 50);
  ctx.textAlign = 'left';
}

const PHASE_NAME = {
  valley: '옛 골짜기', fissure: '열하 분출', fill: '골짜기가 메워짐', canyon: '협곡', today: '오늘날', done: '완성',
};
const noteEl = document.getElementById('now'), statsEl = document.getElementById('stats');
let report = null, reportVersion = -1;
function syncInfo() {
  if (reportVersion !== model.version) { report = plateauReport(model); reportVersion = model.version; }
  const r = report;
  // 막대와 판정 문구는 같은 집계(plateauReport)에서 나온다.
  const bar = (id, v, end) => { document.getElementById(id).style.width = `${Math.min(1, Math.max(0, v) / end) * 100}%`; };
  bar('lavaBar', r.lavaM, 120); document.getElementById('lavaVal').textContent = r.lavaM ? `가장 두꺼운 곳 약 ${r.lavaM}m, 용암층 ${r.layers}장 (막대 끝 120m)` : '아직 용암 없음';
  bar('flatBar', r.flatKm2, 12); document.getElementById('flatVal').textContent = `용암이 덮은 평평한 땅 약 ${r.flatKm2}km² (막대 끝 12km²)`;
  bar('canyonBar', r.canyonM, 120); document.getElementById('canyonVal').textContent = r.canyonM ? `약 ${r.canyonM}m (막대 끝 120m)` : '아직 깎이지 않음';
  bar('fallBar', r.retreatM, 500); document.getElementById('fallVal').textContent = r.falls ? `합류점에서 약 ${r.retreatM}m (막대 끝 500m)` : '폭포 없음';
  document.getElementById('rateNote').textContent = r.text;
  statsEl.innerHTML = `용암의 끈끈함 <b>${VISC[model.options.visc].name}</b>, 흘러나온 용암의 양 <b>${VOLUME[model.options.volume].name}</b>, 강이 깎은 시간 <b>${ERODE[model.options.erode].name}</b>`;
  document.getElementById('phaseBadge').textContent = PHASE_NAME[model.phase()];
  if (compare) {
    const br = compareBrief(model, modelB);
    noteEl.textContent = `왼쪽 블록(묽은 용암): ${br.a}. 오른쪽 블록(끈적한 용암): ${br.b}. ${br.extra}`;
    statsEl.innerHTML = `흘러나온 용암의 양 <b>${VOLUME[model.options.volume].name}</b>, 강이 깎은 시간 <b>${ERODE[model.options.erode].name}</b>`;
    document.getElementById('steps').textContent = '묽은 용암과 끈적한 용암 비교';
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
const markOptions = () => {
  document.querySelectorAll('[data-opt]').forEach(o => {
    const [name, val] = o.dataset.opt.split(':');
    o.classList.toggle('on', model.options[name] === val);
  });
  document.querySelectorAll('[data-preset]').forEach(o => {
    const p = PRESETS[o.dataset.preset], op = model.options;
    o.classList.toggle('on', op.visc === p.visc && op.volume === p.volume && op.erode === p.erode);
  });
};
document.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => {
  const [name, val] = b.dataset.opt.split(':');
  model.setOption(name, val);
  model.reset();
  markOptions();
  restart();
});
document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
  model.applyPreset(b.dataset.preset);
  markOptions();
  restart();
});

// 묽은 용암과 끈적한 용암 비교: 왼쪽은 묽은 용암, 오른쪽은 끈적한 용암. 용암 양과 강이 깎은 시간은 같다. 끝내면 비교 전 조건으로 돌아간다.
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
  if (on) { Object.assign(model.options, { ...before, visc: 'fluid' }); model.reset(); Object.assign(modelB.options, { ...before, visc: 'sticky' }); modelB.reset(); }
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
      const range = sectionRange();
      // 단면 그림도 3D 블록처럼 높이를 VE배로 그린다.
      const sh = 84 + Math.round(((range.zTop - range.zBot) * VE * (1120 / (N - 1))) / CELL_M);
      for (const id of ['section', 'sectionB']) { const c = document.getElementById(id); if (c.height !== sh) c.height = sh; }
      drawSection(document.getElementById('section'), model, range);
      if (compare) drawSection(document.getElementById('sectionB'), modelB, range);
      blockA.syncFaces(); if (compare) blockB.syncFaces();
      drawnA = model.version; drawnB = modelB.version;
    }
    syncInfo();
  }
  if (all) { blockA.syncFx(0); if (compare) blockB.syncFx(0); }
  if (all) syncLabels();
}
// 재생 중에는 늘 그린다(분출물과 폭포가 움직인다). 멈추면 시점을 돌릴 때만 다시 그린다.
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

// 철원 화면의 링크(#stage-1에서 #stage-4)로 들어오면 열하 분출, 골짜기가 메워짐, 협곡, 오늘날이 시작하는 때로 옮긴다.
const STAGE_AT = { 'stage-1': T_ERUPT, 'stage-2': T_FILL, 'stage-3': T_CANYON, 'stage-4': T_TODAY };
function seekHash() {
  const at = STAGE_AT[location.hash.slice(1)];
  // 계산은 0.2초씩 나아가므로 조금 지나서 멈춰야 그 단계에 들어간다.
  if (at != null) progress.seek((at + 0.3) / model.endTime());
}
seekHash();
addEventListener('hashchange', seekHash);

window.__MODEL = {
  progress, model, modelB, blockA, blockB, setView, setPlaying, setCompare,
  advance(seconds) { setPlaying(false); model.tick(seconds); if (compare) modelB.tick(seconds); frameSync(true); blockA.syncFx(0.4); if (compare) blockB.syncFx(0.4); renderer.render(scene, camera); const r = plateauReport(model); return { clock: +model.clock.toFixed(1), phase: model.phase(), finished: model.finished, lava: r.lavaM, layers: r.layers, flat: r.flatKm2, canyon: r.canyonM, retreat: r.retreatM, lakes: r.lakes }; },
  setOption: (n, v) => document.querySelector(`[data-opt="${n}:${v}"]`).click(),
  preset: n => document.querySelector(`[data-preset="${n}"]`).click(),
  draws: () => renderer.info.render.frame,
  camTo(p, t) { camera.position.set(...p); controls.target.set(...t); controls.update(); dirty = true; renderer.render(scene, camera); },
  labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
};
window.__APP_READY = true;
