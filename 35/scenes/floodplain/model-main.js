// © 2026 김용현
// 범람원 형성 모형 화면. 계산은 model.js가 하고, 여기서는 그 결과를 3D 블록과 단면으로 그린다.
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
import { createModel, sectionProfile, noteText, compareBrief, FLOWING, N } from './model.js';
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
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 3000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.48;
controls.addEventListener('change', () => { dirty = true; });
controls.minDistance = 40;
controls.maxDistance = 2000;

const VIEWS = {
  oblique: { p: [-78, 530, 565], t: [0, 0, 12] },
  above: { p: [0, 720, 60], t: [0, 0, 0] },
  low: { p: [-72, 250, 640], t: [0, 2, 10] },
  compare: { p: [0, 560, 800], t: [0, 4, 20] },
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
  // 둑이 낮아 등고선 간격을 1로 고정한다.
  if (showing === 'map') drawContourMap(mapView, { h: model.h, N, sizeM: null, water: model.waterMask(), north: false, interval: 1 });
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
labels.add('river', '하도', '', 'water');
labels.add('levee', '자연 제방');
labels.add('swamp', '배후 습지');
labels.add('flood', '넘친 물', '', 'flood');
labels.add('plain', '평평한 골짜기 바닥');
labels.add('upstream', '상류', '', 'water');
labels.add('downstream', '하류', '', 'water');
labels.add('a', 'A', '', 'mark');
labels.add('b', 'B', '', 'mark');
labels.add('left', '댐 없음', '', 'cmp');
labels.add('right', '댐 있음', '', 'cmp');

const v3 = new THREE.Vector3();
const toScreen = (x, y, z, block = blockA) => {
  v3.set(x - CENTER + block.group.position.x, y * VE, z - CENTER).project(camera);
  return v3.z > 1 ? null : { x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight };
};
let labelsOn = true;
const LEVEE_SHOWN = 1.5; // 제방이 이만큼 높아져야 이름을 붙인다.
function syncLabels() {
  if (showing !== '3d' || !labelsOn) { labels.place([]); return; }
  camera.updateMatrixWorld();
  const list = [];
  if (compare) {
    const s = toScreen(CENTER, -6, N + 10, blockA), q = toScreen(CENTER, -6, N + 10, blockB);
    if (s) list.push({ key: 'left', ...s, priority: 6, keep: true });
    if (q) list.push({ key: 'right', ...q, priority: 6, keep: true });
    labels.place(list);
    return;
  }
  const p = model.spots();
  const put = (key, q, up, priority, keep = true) => { const s = toScreen(q.x, model.sample(q.x, q.y) + up, q.y); if (s) list.push({ key, ...s, priority, keep }); };
  // 그 지형이 실제로 생긴 뒤에만 이름을 붙인다.
  put('river', p.river, 2, 10);
  if (p.leveeRise > LEVEE_SHOWN) { put('levee', p.levee, 0.4, 10); put('swamp', p.swamp, 0.4, 9); }
  else if (model.floodNo < 0) put('plain', p.plain, 0.4, 5);
  if (p.flood && model.overflowNow > FLOWING) put('flood', p.flood, 0.8, 11);
  put('upstream', p.up, 1.5, 3);
  put('downstream', p.down, 1.5, 3);
  const S = model.section;
  put('a', { x: S.ax, y: S.ay }, 0.5, 5, false);
  put('b', { x: S.bx, y: S.by }, 0.5, 5, false);
  labels.place(list);
}

// 실시간 단면: 계산이 쌓은 층을 그대로 읽어 그린다. 두 블록을 비교할 때도 축척이 같다.
const SEC = { px: 28, floor: -5.5 };
function drawSection(canvas, m) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, samples = 280;
  const { base, top, water, sand, mud, turbid, layers } = sectionProfile(m, samples);
  const yOf = v => H - 40 - (v - SEC.floor) * SEC.px, x = t => (t / (samples - 1)) * W, cw = W / samples + 1;
  ctx.fillStyle = '#23302a'; ctx.fillRect(0, 0, W, H);
  // 처음 땅: 하도 칸은 지금 땅까지만 칠한다.
  ctx.fillStyle = '#5a5249';
  for (let t = 0; t < samples; t++) { const b = Math.min(base[t], top[t]); ctx.fillRect(x(t), yOf(b), cw, H - yOf(b)); }
  // 홍수마다의 층: 칸마다 아래에서부터 그 홍수의 모래, 진흙 순으로 쌓는다.
  const SANDS = ['#e6cf8f', '#d6bd78'], MUDS = ['#6d5a48', '#5e4c3c'];
  const stack = new Float32Array(samples), prevS = new Float32Array(samples), prevM = new Float32Array(samples);
  const drawLayer = (ls, lm, n) => {
    for (let t = 0; t < samples; t++) {
      if (m.isChannelAtSection(t, samples)) continue;
      const a = Math.max(0, ls[t] - prevS[t]), b = Math.max(0, lm[t] - prevM[t]);
      const y0 = base[t] + stack[t];
      if (a > 0.004) { ctx.fillStyle = SANDS[n % 2]; ctx.fillRect(x(t), yOf(y0 + a), cw, Math.max(0.6, a * SEC.px)); }
      if (b > 0.004) { ctx.fillStyle = MUDS[n % 2]; ctx.fillRect(x(t), yOf(y0 + a + b), cw, Math.max(0.6, b * SEC.px)); }
      stack[t] += a + b; prevS[t] = Math.max(prevS[t], ls[t]); prevM[t] = Math.max(prevM[t], lm[t]);
    }
  };
  const stride = (arr, want) => { const out = new Float32Array(want); for (let t = 0; t < want; t++) out[t] = arr[Math.round((t * (arr.length - 1)) / (want - 1))]; return out; };
  layers.forEach((L, n) => drawLayer(stride(L.sand, samples), stride(L.mud, samples), n));
  drawLayer(sand, mud, layers.length);
  // 물: 격자의 수심을 그대로 칠한다. 색은 칸마다의 흙탕 정도를 따른다. 반투명 칸이 겹쳐 세로 빗살이 생기지 않게 칸 경계를 픽셀에 맞춘다.
  const riverMuddy = m.muddy > 0.2;
  for (let t = 0; t < samples; t++) {
    if (water[t] < 0.03) continue;
    // 수면은 옆 점과 평균해 그린다. 표본 사이의 작은 떨림이 빗살처럼 보이지 않게 하는 그림 처리다.
    const a = t > 0 ? top[t - 1] + water[t - 1] : top[t] + water[t], b = t < samples - 1 ? top[t + 1] + water[t + 1] : top[t] + water[t];
    const surface = Math.max(top[t], (a + b + top[t] + water[t]) / 3);
    const inChannel = m.isChannelAtSection(t, samples), brown = turbid[t] > 0.5;
    ctx.fillStyle = inChannel ? (riverMuddy ? '#9c7e52' : '#3f93d6') : (brown ? 'rgb(150,122,82)' : 'rgb(74,147,187)');
    const x0 = Math.round(x(t)), x1 = Math.round(x(t + 1));
    ctx.fillRect(x0, yOf(surface), x1 - x0, (surface - top[t]) * SEC.px);
  }
  // 이름: 강에서 양쪽으로 걸어 실제 꼭대기와 가장 낮은 곳을 찾아 적는다.
  ctx.font = '700 23px "Malgun Gothic",sans-serif'; ctx.textAlign = 'center';
  const perCell = (samples - 1) / (m.section.by - m.section.ay), riverT = Math.round(m.section.riverAt * (samples - 1));
  const used = [{ x: 18, y: 32, w: 34 }, { x: W - 18, y: 32, w: 34 }];
  const say = (text, cx, cy, color) => {
    const w = ctx.measureText(text).width;
    cx = Math.min(W - w / 2 - 4, Math.max(w / 2 + 4, cx));
    while (used.some(u => Math.abs(u.x - cx) < (u.w + w) / 2 + 6 && Math.abs(u.y - cy) < 26)) cy -= 28;
    used.push({ x: cx, y: cy, w });
    ctx.lineWidth = 4; ctx.strokeStyle = '#1c211e'; ctx.strokeText(text, cx, cy);
    ctx.fillStyle = color; ctx.fillText(text, cx, cy);
  };
  say('하도', x(riverT), yOf(top[riverT]) + 30, '#8fd6ff');
  for (const dir of [-1, 1]) {
    let crest = -1, cv = -Infinity, low = -1, lv = Infinity;
    for (let t = riverT + dir * 4; t > 0 && t < samples - 1 && Math.abs(t - riverT) < 76 * perCell; t += dir) {
      const off = Math.abs(t - riverT);
      if (off < 26 * perCell && top[t] > cv) { cv = top[t]; crest = t; }
      if (off >= 26 * perCell && top[t] < lv) { lv = top[t]; low = t; }
    }
    if (crest > 0 && low > 0 && cv - lv > LEVEE_SHOWN) {
      say('자연 제방', x(crest) + dir * 44, yOf(cv + water[crest]) - 12, '#ffd36b');
      say(water[low] > 0.1 && turbid[low] < 0.5 ? '배후 습지(물이 고임)' : '배후 습지', x(low), yOf(lv + water[low]) - 12, '#f3f1ea');
    }
  }
  ctx.fillStyle = '#ffd36b'; ctx.font = '700 26px "Malgun Gothic",sans-serif';
  ctx.textAlign = 'center'; ctx.fillText('A', 18, 32); ctx.fillText('B', W - 18, 32);
  ctx.textAlign = 'left'; ctx.font = '700 19px "Malgun Gothic",sans-serif';
  ctx.fillStyle = '#efe9d8'; ctx.fillText('처음 땅', 14, H - 12);
  ctx.fillStyle = '#e6cf8f'; ctx.fillRect(110, H - 26, 16, 12);
  ctx.fillStyle = '#efe9d8'; ctx.fillText('모래', 132, H - 12);
  ctx.fillStyle = '#6d5a48'; ctx.fillRect(196, H - 26, 16, 12);
  ctx.fillStyle = '#efe9d8'; ctx.fillText('진흙', 218, H - 12);
  ctx.textAlign = 'right'; ctx.font = '17px "Malgun Gothic",sans-serif';
  ctx.fillText('세로를 크게 과장했습니다. 층 하나가 홍수 한 번입니다.', W - 14, H - 12);
  ctx.textAlign = 'left';
}

const noteEl = document.getElementById('now');
function stepsText() {
  const n = model.schedule.length;
  if (model.finished) return `홍수 ${n}번으로 완성`;
  if (model.floodNo < 0) return '홍수 전';
  return `홍수 ${model.floodNo + 1}번째 (모두 ${n}번)`;
}
function syncInfo() {
  if (compare) {
    const br = compareBrief(model, modelB);
    noteEl.textContent = `왼쪽 블록은 ${br.a}. 오른쪽 블록은 ${br.b}.`;
    document.getElementById('steps').textContent = '두 조건 비교';
    return;
  }
  noteEl.textContent = noteText(model);
  document.getElementById('steps').textContent = stepsText();
  document.getElementById('damBadge').textContent = model.options.dam === 'yes' ? '상류 댐: 있음' : '상류 댐: 없음';
  schematic.setStage(model.finished ? 2 : model.floodNo >= 1 ? 1 : 0);
}

// 모식도 구역을 누르면 3D 이름표가 강조된다.
const ZONE_LABELS = { channel: ['river'], levee: ['levee'], swamp: ['swamp'], flood: ['flood'] };
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
const restart = () => { settle = 0; frameSync(true); setPlaying(true); };
document.getElementById('resetBtn').onclick = () => { model.reset(); if (compare) modelB.reset(); restart(); };
// 진행 막대: 누르거나 끌면 그 시점까지 처음부터 다시 계산해 옮긴다.
const progress = createProgressBar(document.getElementById('progHost'), {
  clock: () => model.clock, total: () => model.totalSeconds, finished: () => model.finished,
  reset: () => { model.reset(); if (compare) modelB.reset(); },
  step: dt => { model.tick(dt); if (compare) modelB.tick(dt); },
  pause: () => { const w = playing; setPlaying(false); return w; },
  resume: w => { settle = 0; frameSync(true); setPlaying(w); },
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

// 두 조건 비교: 왼쪽은 댐 없음, 오른쪽은 댐 있음. 같은 강에서 시작한다. 끝내면 비교 전에 고른 조건으로 돌아간다.
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
  if (on) { setShowing('3d'); model.applyPreset('textbook'); modelB.applyPreset('dam'); }
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
    model.tick(dt * speed);
    if (compare) modelB.tick(dt * speed);
    frame++;
    frameSync(false);
  } else if (wasComputing) frameSync(true);
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
  advance(seconds) { setPlaying(false); model.tick(seconds); if (compare) modelB.tick(seconds); frameSync(true); renderer.render(scene, camera); return { clock: +model.clock.toFixed(1), phase: model.phase, flood: model.floodNo, finished: model.finished, over: Math.round(model.overflowNow) }; },
  preset: n => document.querySelector(`[data-preset="${n}"]`).click(),
  setOption: (n, v) => document.querySelector(`[data-opt="${n}:${v}"]`).click(),
  draws: () => renderer.info.render.frame,
  arrowCount: () => blockA.arrowCount,
  labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
  grains: () => { let moving = 0; for (const s of model.pState) if (s === 1) moving++; return moving; },
};
window.__APP_READY = true;
