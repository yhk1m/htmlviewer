// © 2026 김용현
// 자유 곡류 형성 모형 화면. 계산은 model.js가 하고, 여기서는 그 결과를 3D 블록과 단면으로 그린다.
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
import { createModel, sectionProfile, noteText, compareBrief, N, T_END } from './model.js';
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
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 4000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.48;
controls.addEventListener('change', () => { dirty = true; });
controls.minDistance = 40;
controls.maxDistance = 2500;

const VIEWS = {
  oblique: { p: [-85, 600, 600], t: [0, 0, 8] },
  above: { p: [0, 900, 70], t: [0, 0, 0] },
  low: { p: [-90, 300, 780], t: [0, 2, 10] },
  compare: { p: [0, 720, 960], t: [0, 4, 20] },
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
sun.position.set(-230, 280, 180);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(Math.min(Q.shadow, 2048));
Object.assign(sun.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 10, far: 900 });
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
  if (showing === 'map') drawContourMap(mapView, { h: model.mapHeight(), N, sizeM: null, water: model.waterMask(), north: false, interval: 1 });
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
labels.add('river', '물길', '', 'water');
labels.add('outer', '공격 사면', '깎임', 'hot');
labels.add('inner', '퇴적 사면', '쌓임', 'sand');
labels.add('scroll', '곡류 흔적', '옛 강둑 자리', 'sand');
labels.add('neck', '곡류의 목', '', 'key');
labels.add('cut', '끊긴 자리', '새 물길', 'key');
labels.add('lake', '우각호', '물이 고인 구하도', 'water');
labels.add('marsh', '습지', '메워지는 우각호');
labels.add('old', '구하도', '메워진 옛 물길');
labels.add('straight', '곧은 물길', '', 'water');
labels.add('levee', '인공 제방');
labels.add('plain', '넓은 들판');
labels.add('upstream', '상류', '', 'water');
labels.add('downstream', '하류', '', 'water');
const makePin = t => { const el = document.createElement('div'); el.className = 'pin'; el.textContent = t; el.hidden = true; document.getElementById('labels').appendChild(el); return el; };
const pinA = makePin('A'), pinB = makePin('B');
labels.add('left', '그대로 둔 강', '', 'cmp');
labels.add('right', '직강 공사', '', 'cmp');

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
    const s = toScreen(CENTER, -6, N + 10, blockA), q = toScreen(CENTER, -6, N + 10, blockB);
    if (s) list.push({ key: 'left', ...s, priority: 6, keep: true });
    if (q) list.push({ key: 'right', ...q, priority: 6, keep: true });
    labels.place(list);
    return;
  }
  const p = model.spots();
  const put = (key, q, up, priority, keep = true) => { if (!q) return; const s = toScreen(q.x, model.sample(q.x, q.y) + up, q.y); if (s) list.push({ key, ...s, priority, keep }); };
  const working = model.works.state !== 'none';
  // 공사 중과 공사 뒤에는 공사와 옛 물길만, 막 끊긴 때에는 끊긴 자리와 우각호에 눈이 가게 한다.
  put('neck', working ? null : p.neck, 1.2, 12);
  put('cut', working ? null : p.cut, 1.2, 13);
  if (!working && model.hold <= 0) { put('outer', p.outer, 0.6, 10); put('inner', p.inner, 0.6, 10); }
  // A와 B는 단면을 자른 자리 바로 위에 찍는다. 이름표처럼 밀려 올라가면 단면과 맞춰 볼 수 없다.
  const pin = (el, q) => { if (!q) return; const s = toScreen(q.x, model.sample(q.x, q.y) + 0.5, q.y); if (s) { el.hidden = false; el.style.transform = `translate(${s.x - 13}px,${s.y - 13}px)`; } };
  if (!working || p.straight) { pin(pinA, p.a); pin(pinB, p.b); }
  put('lake', p.lake, 0.8, 11);
  put('marsh', p.marsh, 0.6, 8);
  put('old', p.old, 0.6, 8);
  put('scroll', working || model.hold > 0 ? null : p.scroll, 0.5, 6, false);
  put('straight', p.straight, 1, 10);
  put('levee', p.levee, 1, 9);
  put('river', p.outer || p.straight ? null : p.river, 1, 7);
  if (!p.scroll && !p.lake && !p.outer && !p.straight) put('plain', p.plain, 0.4, 4);
  put('upstream', p.up, 1.5, 3);
  put('downstream', p.down, 1.5, 3);
  labels.place(list);
}

// 실시간 단면: 굽이를 바깥(A)에서 안쪽(B)으로 자른 계산 값을 그대로 그린다.
function drawSection(canvas, m) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, samples = 280;
  ctx.fillStyle = '#23302a'; ctx.fillRect(0, 0, W, H);
  const prof = sectionProfile(m, samples), b = prof.bend;
  ctx.textAlign = 'center';
  if (!b) { ctx.fillStyle = '#efe9d8'; ctx.font = '700 24px "Malgun Gothic",sans-serif'; ctx.fillText('굽이가 자라면 단면이 나타납니다.', W / 2, H / 2); return; }
  // 세로 축척은 물길 깊이가 잘 보이도록 고정한다.
  const lo = Math.min(...prof.top), hi = Math.max(...prof.top), px = Math.min(52, (H - 150) / Math.max(1, hi - lo)), base = H - 56;
  const yOf = v => base - (v - lo) * px, x = t => (t / (samples - 1)) * W, cw = W / samples + 1;
  for (let t = 0; t < samples; t++) {
    const y = yOf(prof.top[t]);
    ctx.fillStyle = '#6b5a45'; ctx.fillRect(x(t), y, cw, H - y);
    const k = prof.kinds[t];
    if (k === 'bar' || (k === 'channel' && t > samples * 0.5 && !b.straight)) { ctx.fillStyle = '#e6cf90'; ctx.fillRect(x(t), y, cw, Math.min(26, (H - y))); }
    if (k === 'levee') { ctx.fillStyle = '#a9a79b'; ctx.fillRect(x(t), y, cw, 24); }
    if (k === 'lake' || k === 'marsh' || k === 'old') { ctx.fillStyle = '#76924f'; ctx.fillRect(x(t), y, cw, 14); }
  }
  // 수면: 양쪽 둑 사이에서 물길에 닿는 곳만 칠한다.
  ctx.fillStyle = '#3f93d6';
  const wy = yOf(prof.water);
  for (let t = 0; t < samples; t++) if (prof.kinds[t] === 'channel' && prof.top[t] < prof.water) ctx.fillRect(x(t), wy, cw, yOf(prof.top[t]) - wy);
  // 물길 범위와 가장 깊은 곳
  // 단면 가운데의 물길만 본다. 이웃 굽이가 단면에 함께 잡혀도 그쪽은 재지 않는다.
  let c0 = -1, c1 = -1, deep = 0, dv = Infinity;
  const center = Math.floor(samples / 2);
  if (prof.kinds[center] === 'channel') {
    c0 = c1 = center;
    while (c0 > 0 && prof.kinds[c0 - 1] === 'channel') c0--;
    while (c1 < samples - 1 && prof.kinds[c1 + 1] === 'channel') c1++;
    for (let t = c0; t <= c1; t++) if (prof.top[t] < dv) { dv = prof.top[t]; deep = t; }
  }
  const say = (text, cx, cy, color, size = 30) => {
    ctx.font = `700 ${size}px "Malgun Gothic",sans-serif`;
    const w = ctx.measureText(text).width;
    cx = Math.min(W - w / 2 - 4, Math.max(w / 2 + 4, cx));
    ctx.lineWidth = 5; ctx.strokeStyle = '#1c211e'; ctx.strokeText(text, cx, cy);
    ctx.fillStyle = color; ctx.fillText(text, cx, cy);
  };
  if (c0 >= 0 && !b.straight) {
    if (b.strength > 0.14) {
      // 글자는 땅과 겹치지 않게 위쪽 빈 곳에 둔다.
      say('공격 사면', W * 0.2, 44, '#ffb38a');
      say('빠르고 깊다, 깎인다', W * 0.22, 80, '#efe9d8', 25);
      say('퇴적 사면', W * 0.8, 44, '#ffd36b');
      say('느리고 얕다, 쌓인다', W * 0.78, 80, '#efe9d8', 25);
      // 굽이에서 도는 물: 수면 가까이는 바깥으로, 바닥을 따라서는 안쪽으로. 모두 물속만 지난다.
      let wet0 = deep, wet1 = deep;
      while (wet0 > c0 && prof.top[wet0 - 1] < prof.water) wet0--;
      while (wet1 < c1 && prof.top[wet1 + 1] < prof.water) wet1++;
      ctx.strokeStyle = '#f2fbff'; ctx.lineWidth = 3; ctx.fillStyle = '#f2fbff';
      const head = (hx, hy, dir) => { ctx.beginPath(); ctx.moveTo(hx + dir * 12, hy); ctx.lineTo(hx - dir * 4, hy - 7); ctx.lineTo(hx - dir * 4, hy + 7); ctx.closePath(); ctx.fill(); };
      const sy = wy + 10;
      if (yOf(prof.top[deep]) - wy > 24) {
        ctx.beginPath(); ctx.moveTo(x(wet1) - 26, sy); ctx.lineTo(x(wet0) + 22, sy); ctx.stroke();
        head(x(wet0) + 22, sy, -1);
        const pts = [];
        for (let t = deep; t <= wet1; t++) { const y = yOf(prof.top[t]) - 10; if (y < sy + 9) break; pts.push([x(t), y]); }
        if (pts.length > 5) {
          ctx.beginPath(); pts.forEach((p, n) => (n ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
          const e = pts[pts.length - 1];
          head(e[0], e[1], 1);
        }
      }
    } else say('아직 조금만 굽어 양쪽이 비슷합니다', W / 2, 44, '#efe9d8', 28);
  } else if (b.straight) {
    say('곧은 물길: 양쪽 깊이가 비슷합니다', W / 2, 44, '#efe9d8', 28);
  }
  ctx.font = '700 26px "Malgun Gothic",sans-serif'; ctx.fillStyle = '#ffd36b';
  ctx.textAlign = 'center'; ctx.fillText('A', 18, 32); ctx.fillText('B', W - 18, 32);
  ctx.textAlign = 'left'; ctx.font = '700 19px "Malgun Gothic",sans-serif';
  ctx.fillStyle = '#efe9d8'; ctx.fillText('들판의 흙', 14, H - 12);
  ctx.fillStyle = '#e6cf90'; ctx.fillRect(116, H - 26, 16, 12);
  ctx.fillStyle = '#efe9d8'; ctx.fillText('쌓인 모래', 138, H - 12);
  ctx.textAlign = 'right'; ctx.font = '22px "Malgun Gothic",sans-serif';
  ctx.fillText('세로를 크게 과장했습니다.', W - 14, H - 12);
  ctx.textAlign = 'left';
}

const noteEl = document.getElementById('now'), statsEl = document.getElementById('stats');
const STAGE_STRAIGHT = 3, STAGE_CUT = 2, STAGE_GROW = 1;
const liveLakes = m => m.lakes.filter(l => l.fill < 0.6).length;
function syncInfo() {
  statsEl.innerHTML = `물길 길이 <b>곧은 거리의 ${model.sinuosity().toFixed(2)}배</b>${model.peak > model.sinuosity() + 0.05 ? ` (가장 길 때 ${model.peak.toFixed(2)}배)` : ''}, 목 절단 <b>${model.cutoffs}번</b>, 우각호 <b>${liveLakes(model)}개</b>`;
  if (compare) {
    const br = compareBrief(model, modelB);
    noteEl.textContent = `왼쪽 블록은 ${br.a}. 오른쪽 블록은 ${br.b}.${modelB.works.state === 'done' ? ' 곧게 편 강은 짧아서 경사가 급하고 물이 빠르며, 둑에 막혀 더는 옮겨 가지 않습니다.' : ' 공사 전까지는 두 강이 똑같이 자랍니다.'}`;
    document.getElementById('sectionTitle').textContent = '두 블록의 단면 (계산 결과)';
    statsEl.innerHTML = '';
    document.getElementById('steps').textContent = '두 조건 비교';
    return;
  }
  noteEl.textContent = noteText(model);
  document.getElementById('steps').textContent = model.finished ? '완성' : `진행 ${Math.floor((model.clock / T_END) * 100)}%`;
  document.getElementById('worksBadge').textContent = model.options.works === 'yes' ? (model.works.state === 'done' ? '직강 공사: 끝남' : model.works.state === 'dig' ? '직강 공사: 하는 중' : '직강 공사: 예정') : '직강 공사: 안 함';
  document.getElementById('sectionTitle').textContent = model.bend?.straight ? '곧은 물길을 A에서 B로 자른 단면 (계산 결과)' : '굽이를 바깥(A)에서 안쪽(B)으로 자른 단면 (계산 결과)';
  schematic.setStage(model.works.state === 'done' ? STAGE_STRAIGHT : model.cutoffs > 0 ? STAGE_CUT : model.sinuosity() > 1.35 ? STAGE_GROW : 0);
}

// 모식도 구역을 누르면 3D 이름표가 강조된다.
const ZONE_LABELS = { channel: ['river', 'straight'], outer: ['outer'], inner: ['inner'], scroll: ['scroll'], neck: ['neck'], cut: ['cut'], oxbow: ['lake'], old: ['old'], levee: ['levee'] };
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
const restart = () => { settle = 0; frameSync(true, 0); setPlaying(true); };
document.getElementById('resetBtn').onclick = () => { model.reset(); if (compare) modelB.reset(); restart(); };
// 진행 막대: 누르거나 끌면 그 시점까지 처음부터 다시 계산해 옮긴다.
const progress = createProgressBar(document.getElementById('progHost'), {
  clock: () => model.clock, total: () => T_END, finished: () => model.finished,
  reset: () => { model.reset(); if (compare) modelB.reset(); },
  step: dt => { model.tick(dt); if (compare) modelB.tick(dt); },
  pause: () => { const w = playing; setPlaying(false); return w; },
  resume: w => { settle = 0; frameSync(true, 0); setPlaying(w); },
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

// 두 조건 비교: 왼쪽은 그대로 둔 강, 오른쪽은 직강 공사. 공사 전까지는 두 강이 똑같이 자란다. 끝내면 비교 전에 고른 조건으로 돌아간다.
let before = null;
function setCompare(on) {
  if (on === compare) return;
  compare = on;
  blockB.group.visible = on;
  blockA.group.position.x = on ? -COMPARE_GAP : 0;
  blockB.group.position.x = COMPARE_GAP;
  const e = on ? 440 : 260;
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
  if (on) { setShowing('3d'); model.applyPreset('textbook'); modelB.applyPreset('works'); }
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
function frameSync(all, dt) {
  dirty = true;
  blockA.syncFlow(dt);
  if (compare) blockB.syncFlow(dt);
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
  if (computing) {
    model.tick(dt * speed);
    if (compare) modelB.tick(dt * speed);
    frame++;
    frameSync(false, dt * speed);
  } else if (wasComputing) frameSync(true, 0);
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
frameSync(true, 0);
requestAnimationFrame(t => { last = t; loop(t); });

window.__MODEL = {
  progress, model, modelB, setView, setPlaying, setCompare,
  advance(seconds) { setPlaying(false); model.tick(seconds); if (compare) modelB.tick(seconds); frameSync(true, 0.1); renderer.render(scene, camera); return { clock: +model.clock.toFixed(1), cut: model.cutoffs, s: +model.sinuosity().toFixed(2), works: model.works.state, finished: model.finished }; },
  preset: n => document.querySelector(`[data-preset="${n}"]`).click(),
  setOption: (n, v) => document.querySelector(`[data-opt="${n}:${v}"]`).click(),
  draws: () => renderer.info.render.frame,
  arrowCount: () => blockA.arrowCount,
  labelsShown: () => [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').textContent),
};
window.__APP_READY = true;
