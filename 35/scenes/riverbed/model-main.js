// © 2026 김용현
// 여울, 소, 모래톱 형성 모형 화면. 계산은 model.js가 하고, 여기서는 그 결과를 3D 블록과 단면으로 그린다.
import { createProgressBar } from '../../shared/progress.js';
import * as THREE from 'three';
import { OrbitControls } from '../../shared/vendor/OrbitControls.js';
import { isPhone, portraitZoom } from '../../shared/viewport.js';
import { setupPanel } from '../../shared/panel.js';
import { QUALITY, currentQuality, setupQualityButton } from '../../shared/quality.js';
import { createFpsMeter } from '../../shared/fps.js';
import { createLabelLayer } from '../../shared/labels.js';
import { setupPivot } from '../../shared/pivot.js';
import { createModel, noteText, bedReport, compareBrief, N, NY, W, L, NR, FLOW, CURVE, SAND, PRESETS } from './model.js';
import { createBlock, worldY } from './block.js';
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
controls.maxPolarAngle = Math.PI * 0.48;
controls.addEventListener('change', () => { dirty = true; });
controls.minDistance = 25;
controls.maxDistance = 1400;

// 하류(오른쪽) 앞에서 비스듬히 내려다본다. 블록 앞면 쪽에서 물길 전체가 보인다.
const VIEWS = {
  oblique: { p: [30, 215, 285], t: [0, -8, 4] },
  above: { p: [0, 380, 30], t: [0, -8, 0] },
  low: { p: [110, 50, 170], t: [-10, -12, 0] },
  compare: { p: [0, 330, 430], t: [0, -10, 6] },
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
Object.assign(sun.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 10, far: 700 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.5;
scene.add(sun);

const blockA = createBlock(model);
scene.add(blockA.group);
const COMPARE_GAP = (N + 16) / 2;
const modelB = createModel();
const blockB = createBlock(modelB);
blockB.group.visible = false;
scene.add(blockB.group);
let compare = false, panelBeforeCompare = false, setPanel = () => {};

// 이름표
const labels = createLabelLayer(document.getElementById('labels'));
labels.add('pool', '소', '깊고 평소에 느림', 'deep');
labels.add('riffle', '여울', '얕고 빠름, 물결이 임', 'fast');
// 홍수 때는 빠르기가 바뀌므로 다른 설명을 단다.
labels.add('poolF', '소', '홍수 때는 빨라져 바닥을 깎음', 'deep');
labels.add('riffleF', '여울', '홍수 때는 물에 깊이 잠김', 'fast');
labels.add('bar', '모래톱', '물이 느려 모래가 쌓임', 'sand');
labels.add('left', '곧은 하천', '', 'cmp');
labels.add('right', '굽은 하천', '', 'cmp');
labels.add('pinA', 'A', '', 'pin');
labels.add('pinB', 'B', '', 'pin');

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
    const s = toScreen(CENTER, worldY(-5), NY + 2, blockA), q = toScreen(CENTER, worldY(-5), NY + 2, blockB);
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
    const s = toScreen(q.x, worldY(q.z) + up, q.y);
    if (s && s.x > left && s.x < right && s.y > 40 && s.y < bottom) list.push({ key, ...s, priority, keep });
  };
  // 곧은 하천은 세 지형이 한 줄로 늘어서므로 이름표 높이를 엇갈리게 하고 설명 글은 숨긴다.
  const flood = model.options.flow === 'flood', straight = model.options.curve === 'straight';
  document.body.classList.toggle('straight-mode', straight);
  put(flood ? 'poolF' : 'pool', p.pool, 1, 12);
  put(flood ? 'riffleF' : 'riffle', p.riffle, straight ? 9 : 1, 12);
  put('bar', p.bar, straight ? 17 : 1, 11);
  const sec = model.sec, ws = model.current().ws;
  put('pinA', { x: sec.cx[sec.qa], y: sec.cy[sec.qa], z: ws[sec.qa] }, 1, 13, false);
  put('pinB', { x: sec.cx[sec.qb], y: sec.cy[sec.qb], z: ws[sec.qb] }, 1, 13);
  labels.place(list);
}

// 물길을 따라 자른 단면: 물길에서 가장 깊은 곳을 상류(A)에서 하류(B)까지 잇는다.
function profileRange() {
  let hi = -1e9, lo = 1e9;
  for (const m of compare ? [model, modelB] : [model]) {
    const s = m.sec;
    for (let q = s.qa; q <= s.qb; q++) { hi = Math.max(hi, s.top[q]); lo = Math.min(lo, s.bed0[q] - 3.6); }
  }
  return { yTop: hi + 0.6, yBot: lo };
}
const say = (ctx, text, cx, cy, color, size = 20, align = 'center') => {
  const W2 = ctx.canvas.width;
  ctx.font = `700 ${size}px "Malgun Gothic",sans-serif`; ctx.textAlign = align;
  const w = ctx.measureText(text).width;
  if (align === 'center') cx = Math.min(W2 - w / 2 - 10, Math.max(w / 2 + 10, cx));
  ctx.lineWidth = 5; ctx.strokeStyle = figPalette().bg; ctx.strokeText(text, cx, cy);
  ctx.fillStyle = color; ctx.fillText(text, cx, cy);
};
const COL = { ground: '#6e5a44', ground2: '#5a4936', water: 'rgba(70,140,190,0.85)', bank: '#8fa865', line: 'rgba(30,26,22,0.9)' };
function drawProfile(canvas, m, range) {
  const ctx = canvas.getContext('2d'), Wc = canvas.width, H = canvas.height, plotH = H - 46, top = 40;
  const P = figPalette(), DK = isDark();
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, Wc, H); ctx.save(); ctx.strokeStyle = P.frame; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, Wc - 1, H - 1); ctx.restore();
  const s = m.sec, st = m.current(), r = bedReport(m), n = s.qb - s.qa;
  const X = q => ((q - s.qa) / n) * Wc, Y = zm => top + ((range.yTop - zm) / (range.yTop - range.yBot)) * (plotH - top);
  // 둑 위(들판) 높이
  ctx.strokeStyle = 'rgba(160,190,110,0.8)'; ctx.lineWidth = 3; ctx.setLineDash([]);
  ctx.beginPath(); for (let q = s.qa; q <= s.qb; q++) ctx.lineTo(X(q), Y(s.top[q])); ctx.stroke();
  // 물
  ctx.beginPath();
  for (let q = s.qa; q <= s.qb; q++) ctx.lineTo(X(q), Y(st.ws[q]));
  for (let q = s.qb; q >= s.qa; q--) ctx.lineTo(X(q), Y(s.tz[q]));
  ctx.closePath(); ctx.fillStyle = COL.water; ctx.fill();
  // 강바닥
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let q = s.qa; q <= s.qb; q++) ctx.lineTo(X(q), Y(s.tz[q]));
  ctx.lineTo(Wc, H); ctx.closePath();
  const g = ctx.createLinearGradient(0, Y(range.yTop - 2), 0, H); g.addColorStop(0, COL.ground); g.addColorStop(1, COL.ground2);
  ctx.fillStyle = g; ctx.fill();
  ctx.beginPath(); for (let q = s.qa; q <= s.qb; q++) ctx.lineTo(X(q), Y(s.tz[q])); ctx.strokeStyle = COL.line; ctx.lineWidth = 2.5; ctx.stroke();
  // 처음 바닥
  ctx.setLineDash([10, 8]); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
  ctx.beginPath(); for (let q = s.qa; q <= s.qb; q++) ctx.lineTo(X(q), Y(s.bed0[q])); ctx.stroke();
  ctx.setLineDash([]);
  for (const q of r.poolQ) say(ctx, '소', X(q), (Y(s.tz[q]) + Y(st.ws[q])) / 2 + 8, (DK ? '#cfe8ff' : '#1d5f9e'), 22);
  for (const q of r.riffleQ) say(ctx, '여울', X(q), Y(st.ws[q]) - 12, (DK ? '#ffd1b8' : '#b4471c'), 22);
  say(ctx, 'A 상류', 12, 28, P.hi, 20, 'left'); say(ctx, '하류 B', Wc - 12, 28, P.hi, 20, 'right');
  // 라이트 모드에서는 땅 위에 깔린 설명 글이 묻히지 않게 아래에 밝은 띠를 깐다.
  if (!DK) { ctx.fillStyle = P.bg; ctx.fillRect(1, H - 38, Wc - 2, 37); ctx.fillStyle = P.frame; ctx.fillRect(1, H - 38, Wc - 2, 1); }
  ctx.textAlign = 'left'; ctx.font = '700 17px "Malgun Gothic",sans-serif'; ctx.fillStyle = P.ink;
  ctx.fillText('파랑: 물, 갈색: 강바닥, 흰 점선: 처음 바닥, 연두: 둑 위', 12, H - 14);
  ctx.textAlign = 'right'; ctx.font = '17px "Malgun Gothic",sans-serif';
  ctx.fillText('높이 과장', Wc - 12, H - 14);
  ctx.textAlign = 'left';
}

// 가로 단면 두 개: 왼쪽은 가장 깊은 소, 오른쪽은 가운데에 가까운 여울. 소 단면은 굽이 바깥을 왼쪽에 둔다(모식도와 같게).
function pickSections(m, r) {
  const s = m.sec;
  let pq = r.deepQ, rq = -1;
  if (pq < 0) { let b = -1; for (let q = s.qa + 6; q <= s.qb - 6; q++) if (b < 0 || Math.abs(s.f[q]) > Math.abs(s.f[b])) b = q; pq = b; }
  if (r.riffleQ.length) { rq = r.riffleQ[0]; for (const q of r.riffleQ) if (Math.abs(s.cx[q] - N / 2) < Math.abs(s.cx[rq] - N / 2)) rq = q; }
  else { let b = -1; for (let q = s.qa + 6; q <= s.qb - 6; q++) if (b < 0 || Math.abs(s.f[q]) < Math.abs(s.f[b])) b = q; rq = b; }
  return { pq, rq };
}
function drawXsec(canvas, m) {
  const ctx = canvas.getContext('2d'), Wc = canvas.width, H = canvas.height, gap = 30, pw = (Wc - gap) / 2, top = 70, plotB = H - 44;
  const P = figPalette(), DK = isDark();
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, Wc, H); ctx.save(); ctx.strokeStyle = P.frame; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, Wc - 1, H - 1); ctx.restore();
  const s = m.sec, st = m.current(), nS = m.stage('normal'), r = bedReport(m), { pq, rq } = pickSections(m, r);
  const halfM = NR * Math.max(s.hw[pq], s.hw[rq]) * 1.05;
  let hi = -1e9, lo = 1e9;
  for (const q of [pq, rq]) { hi = Math.max(hi, s.top[q]); for (let l = 0; l < L; l++) lo = Math.min(lo, s.bed[q * L + l]); lo = Math.min(lo, s.bed0[q]); }
  hi += 0.5; lo -= 0.6;
  const Y = zm => top + ((hi - zm) / (hi - lo)) * (plotB - top);
  const SAMPLES = 81;
  const panel = (q, ox, flip, title, dep) => {
    const side = flip ? (s.f[q] >= 0 ? -1 : 1) : 1;
    const X = dm => ox + pw / 2 + (dm / halfM) * (pw / 2);
    const bed = [], bed0 = [];
    for (let a = 0; a < SAMPLES; a++) {
      const dm = -halfM + (2 * halfM * a) / (SAMPLES - 1), n = (side * dm) / s.hw[q];
      const x = s.cx[q] - s.ty[q] * n * s.hw[q], y = s.cy[q] + s.tx[q] * n * s.hw[q], k = Math.round(y) * N + Math.round(x);
      bed.push([X(dm), m.sample(x, y)]);
      bed0.push([X(dm), m.z0[k]]);
    }
    ctx.save(); ctx.beginPath(); ctx.rect(ox, 0, pw, H); ctx.clip();
    // 물
    ctx.fillStyle = COL.water; ctx.beginPath(); ctx.moveTo(ox, Y(st.ws[q]));
    ctx.lineTo(ox + pw, Y(st.ws[q])); ctx.lineTo(ox + pw, H); ctx.lineTo(ox, H); ctx.closePath(); ctx.fill();
    // 땅
    ctx.beginPath(); ctx.moveTo(ox, H); for (const [x, z] of bed) ctx.lineTo(x, Y(z)); ctx.lineTo(ox + pw, H); ctx.closePath();
    ctx.fillStyle = COL.ground; ctx.fill();
    // 처음 바닥보다 높게 쌓인 곳(소 자리는 모래, 여울 자리는 자갈)
    ctx.fillStyle = dep;
    for (let a = 0; a < SAMPLES - 1; a++) {
      const zA = bed[a][1], z0A = bed0[a][1];
      if (zA - z0A > 0.2) { const x0 = bed[a][0], x1 = bed[a + 1][0]; ctx.fillRect(x0, Y(zA), x1 - x0 + 1, Math.max(3, Y(z0A) - Y(zA))); }
    }
    ctx.beginPath(); for (const [x, z] of bed) ctx.lineTo(x, Y(z)); ctx.strokeStyle = COL.line; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.setLineDash([9, 7]); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
    ctx.beginPath(); for (const [x, z] of bed0) ctx.lineTo(x, Y(z)); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    say(ctx, title, ox + pw / 2, 30, P.hi, 21);
    return { X, bed, bed0, side };
  };
  const a = panel(pq, 0, true, '소 자리 단면', '#e3cb8c');
  const b = panel(rq, pw + gap, false, '여울 자리 단면', '#aaa396');
  ctx.fillStyle = P.frame; ctx.fillRect(pw + gap / 2 - 1, 16, 2, H - 32);
  if (m.options.curve !== 'straight' || Math.abs(s.f[pq]) > 0.2) {
    say(ctx, m.options.curve === 'straight' ? '물이 쏠리는 쪽' : '굽이 바깥', 80, plotB - 8, (DK ? '#bfe0ff' : '#1d5f9e'), 18);
    say(ctx, m.options.curve === 'straight' ? '반대쪽' : '굽이 안쪽', pw - 80, plotB - 8, (DK ? '#ffe7a8' : '#a8780a'), 18);
  }
  // 가장 깊은 곳과 모래톱
  let dl = 0; for (let q = 0; q < a.bed.length; q++) if (a.bed[q][1] < a.bed[dl][1]) dl = q;
  if (r.deepQ >= 0) say(ctx, '깊음', a.bed[dl][0], Y(a.bed[dl][1]) - 12, (DK ? '#cfe8ff' : '#1d5f9e'), 18);
  let bl = -1;
  for (let q = 0; q < a.bed.length; q++) if (a.bed[q][1] > nS.ws[pq] + 0.05 && a.bed[q][1] - a.bed0[q][1] > 0.2 && a.bed[q][0] > a.bed[dl][0]) { if (bl < 0 || a.bed[q][1] > a.bed[bl][1]) bl = q; }
  if (bl >= 0 && r.barM2 > 0) say(ctx, '모래톱', a.bed[bl][0], Y(a.bed[bl][1]) - 12, (DK ? '#ffe7a8' : '#a8780a'), 18);
  if (r.riffleQ.length) say(ctx, '얕고 평평', pw + gap + pw / 2, Y(st.ws[rq]) - 14, (DK ? '#ffd1b8' : '#b4471c'), 18);
  // 라이트 모드에서는 땅 위에 깔린 설명 글이 묻히지 않게 아래에 밝은 띠를 깐다.
  if (!DK) { ctx.fillStyle = P.bg; ctx.fillRect(1, H - 38, Wc - 2, 37); ctx.fillStyle = P.frame; ctx.fillRect(1, H - 38, Wc - 2, 1); }
  ctx.textAlign = 'left'; ctx.font = '700 17px "Malgun Gothic",sans-serif'; ctx.fillStyle = P.ink;
  ctx.fillText('파랑: 지금 물, 노랑: 쌓인 모래, 회색: 쌓인 자갈, 흰 점선: 처음 바닥', 12, H - 14);
  ctx.textAlign = 'right'; ctx.font = '17px "Malgun Gothic",sans-serif';
  ctx.fillText('높이 과장', Wc - 12, H - 14);
  ctx.textAlign = 'left';
}

const PHASE_NAME = { start: '물이 흐르기 시작함', scour: '굽이 바깥이 깎여 소가 생김', bar: '모래톱과 여울이 생김', pattern: '여울과 소가 번갈아 늘어섬', done: '완성' };
const noteEl = document.getElementById('now'), statsEl = document.getElementById('stats');
let report = null, reportVersion = -1, reportFlow = '';
function syncInfo() {
  const ph = model.phase();
  if (reportVersion !== model.version || reportFlow !== model.options.flow) { report = bedReport(model); reportVersion = model.version; reportFlow = model.options.flow; }
  const r = report;
  // 막대와 판정 문구는 같은 집계(bedReport)에서 나온다.
  const bar = (id, v, end) => { document.getElementById(id).style.width = `${Math.min(1, Math.max(0, v) / end) * 100}%`; };
  bar('poolBar', r.poolDepthM, 4); document.getElementById('poolVal').textContent = r.pools ? `평소 물 깊이 약 ${r.poolDepthM}m (막대 끝 4m)` : '아직 소 없음';
  bar('riffleBar', r.riffles, 4); document.getElementById('riffleVal').textContent = `${r.riffles}곳 (막대 끝 4곳)`;
  bar('barBar', r.barM2, 400); document.getElementById('barVal').textContent = `약 ${r.barM2}m² (막대 끝 400m²)`;
  bar('speedBar', r.diff, 1.5); document.getElementById('speedVal').textContent = `약 ${r.diff}m/s (막대 끝 1.5m/s)`;
  document.getElementById('rateNote').textContent = r.text;
  statsEl.innerHTML = `유량 <b>${FLOW[model.options.flow].name}</b>, 굽이 <b>${CURVE[model.options.curve].name}</b>, 모래 <b>${SAND[model.options.sand].name}</b>, 물길 너비 <b>약 ${W}m</b>` + (r.pools >= 2 ? `, 소 사이 <b>너비의 약 ${r.spacingW}배</b>` : '');
  document.getElementById('phaseBadge').textContent = PHASE_NAME[ph];
  if (compare) {
    const br = compareBrief(model, modelB);
    noteEl.textContent = `왼쪽 블록(곧은 하천)은 ${br.a}. 오른쪽 블록(굽은 하천)은 ${br.b}. ${br.extra}`;
    statsEl.innerHTML = '';
    document.getElementById('steps').textContent = '두 조건 비교';
    return;
  }
  noteEl.textContent = noteText(model);
  document.getElementById('steps').textContent = model.finished ? '완성' : `진행 ${Math.floor((model.clock / model.endTime()) * 100)}%`;
}

let playing = true, speed = 1, dirty = true;
const dock = () => (isPhone() ? 0 : document.getElementById('side').offsetWidth);
const panelW = () => (isPhone() || document.body.classList.contains('panel-closed') ? 0 : document.getElementById('panel').offsetWidth + 20);
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
const markPreset = () => document.querySelectorAll('[data-preset]').forEach(o => {
  const p = PRESETS[o.dataset.preset], op = model.options;
  o.classList.toggle('on', op.flow === p.flow && op.curve === p.curve && op.sand === p.sand);
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

// 두 조건 비교: 왼쪽은 곧은 하천, 오른쪽은 굽은 하천. 유량과 모래 양은 같다. 끝내면 비교 전에 고른 조건으로 돌아간다.
let before = null;
function setCompare(on) {
  if (on === compare) return;
  compare = on;
  blockB.group.visible = on;
  blockA.group.position.x = on ? -COMPARE_GAP : 0;
  blockB.group.position.x = COMPARE_GAP;
  const e = on ? 210 : 120;
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
  if (on) { Object.assign(model.options, { ...before, curve: 'straight' }); model.reset(); Object.assign(modelB.options, { ...before, curve: before.curve === 'straight' ? 'mid' : before.curve }); modelB.reset(); }
  else { Object.assign(model.options, before); model.reset(); }
  markOptions(); markPreset();
  setView(on ? 'compare' : 'oblique');
  restart();
}
document.getElementById('compareBtn').onclick = () => setCompare(!compare);
document.getElementById('compareEnd').onclick = () => setCompare(false);

let frame = 0, flowTime = 0;
function frameSync(all) {
  dirty = true;
  const changed = blockA.syncTerrain(all) | (compare ? blockB.syncTerrain(all) : 0);
  if (all || changed) renderer.shadowMap.needsUpdate = true;
  if (all || frame % 6 === 0) {
    const range = profileRange();
    drawProfile(document.getElementById('section'), model, range);
    if (compare) drawProfile(document.getElementById('sectionB'), modelB, range);
    else drawXsec(document.getElementById('xsec'), model);
    syncInfo();
  }
  if (all) { blockA.syncFlow(0); if (compare) blockB.syncFlow(0); }
  if (all || frame % 3 === 0) syncLabels();
}
// 재생 중에는 늘 그린다(다 만들어진 뒤에도 물은 흐른다). 멈추면 시점을 돌릴 때만 다시 그린다.
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
    flowTime += dt;
    frameSync(false);
    blockA.syncFlow(dt); if (compare) blockB.syncFlow(dt);
    if (frame % 2 === 0) { blockA.syncWater(flowTime); if (compare) blockB.syncWater(flowTime); }
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
  advance(seconds) { setPlaying(false); model.tick(seconds); if (compare) modelB.tick(seconds); frameSync(true); renderer.render(scene, camera); const r = bedReport(model); return { clock: +model.clock.toFixed(1), phase: model.phase(), finished: model.finished, pools: r.pools, riffles: r.riffles, deep: r.poolDepthM, bar: r.barM2, up: r.up, ur: r.ur }; },
  preset: n => document.querySelector(`[data-preset="${n}"]`).click(),
  setOption: (n, v) => document.querySelector(`[data-opt="${n}:${v}"]`).click(),
  draws: () => renderer.info.render.frame,
  labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
};
window.__APP_READY = true;
