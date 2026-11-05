// © 2026 김용현
// 선상지 형성 모형 화면. 계산은 model.js가 하고, 여기서는 그 결과를 3D 블록과 단면으로 그린다.
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { createModel, N, MOUTH, GRAINS } from './model.js';

const model = createModel();
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const CENTER = MOUTH.i;
const BOTTOM = -16;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
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
controls.minDistance = 40;
controls.maxDistance = 2000;

// 세로로 긴 화면에서는 블록이 다 들어오도록 카메라를 뒤로 뺀다.
const portraitZoom = () => { const a = innerWidth / innerHeight; return a < 1 ? Math.min(2.2, 0.95 / a) : 1; };

const VIEWS = {
  oblique: { p: [-108, 292, 462], t: [0, 4, 34] },
  above: { p: [0, 700, 150], t: [0, 0, 10] },
  mouth: { p: [-175, 92, 150], t: [12, 16, -18] },
};
function setView(name) {
  const { p, t } = VIEWS[name], z = portraitZoom();
  camera.position.set(t[0] + (p[0] - t[0]) * z, t[1] + (p[1] - t[1]) * z, t[2] + (p[2] - t[2]) * z);
  controls.target.set(...t);
  controls.update();
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === name));
}

scene.add(new THREE.HemisphereLight(0xdfe9f5, 0x54493c, 1.25));
const sun = new THREE.DirectionalLight(0xfff1dd, 2.6);
sun.position.set(-230, 170, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -200, right: 200, top: 200, bottom: -200, near: 10, far: 800 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.8;
scene.add(sun);

const linear = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const GRAIN_RGB = GRAINS.map(g => linear(g.color));
const WATER_RGB = linear('#2c8fd6');
const FOREST = linear('#47674a'), ROCK = linear('#7c7568'), PLAIN = linear('#a3b57f');

// 지형 격자
const pos = new Float32Array(N * N * 3), nor = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3);
const baseRgb = new Float32Array(N * N * 3), speckle = new Float32Array(N * N);
{
  let seed = 5;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    pos[k * 3] = i - CENTER; pos[k * 3 + 2] = j - CENTER;
    speckle[k] = 0.9 + r() * 0.2;
    const m = model.mountain[k];
    const hh = model.base[k];
    const rocky = smooth(46, 66, hh + r() * 8);
    for (let c = 0; c < 3; c++) {
      const mtn = FOREST[c] + (ROCK[c] - FOREST[c]) * rocky;
      baseRgb[k * 3 + c] = PLAIN[c] + (mtn - PLAIN[c]) * m;
    }
  }
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
{
  const index = new Uint32Array((N - 1) * (N - 1) * 6);
  let n = 0;
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
    const a = j * N + i, b = a + 1, c = a + N, d = c + 1;
    index[n++] = a; index[n++] = c; index[n++] = b; index[n++] = b; index[n++] = c; index[n++] = d;
  }
  geo.setIndex(new THREE.BufferAttribute(index, 1));
}
const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }));
terrain.castShadow = terrain.receiveShadow = true;
terrain.frustumCulled = false;
scene.add(terrain);

// 블록 옆면과 바닥
const skirtPts = [];
for (let i = 0; i < N; i++) skirtPts.push([i, 0]);
for (let j = 1; j < N; j++) skirtPts.push([N - 1, j]);
for (let i = N - 2; i >= 0; i--) skirtPts.push([i, N - 1]);
for (let j = N - 2; j >= 1; j--) skirtPts.push([0, j]);
const skirtPos = new Float32Array(skirtPts.length * 2 * 3);
const skirtGeo = new THREE.BufferGeometry();
skirtGeo.setAttribute('position', new THREE.BufferAttribute(skirtPos, 3));
{
  const idx = [];
  const n = skirtPts.length;
  for (let s = 0; s < n; s++) {
    const a = s * 2, b = s * 2 + 1, c = ((s + 1) % n) * 2, d = ((s + 1) % n) * 2 + 1;
    idx.push(a, c, b, b, c, d);
  }
  skirtGeo.setIndex(idx);
}
const skirt = new THREE.Mesh(skirtGeo, new THREE.MeshBasicMaterial({ color: 0x4d463d, side: THREE.DoubleSide }));
skirt.frustumCulled = false;
scene.add(skirt);

// 입자와 물
const grainMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), 2400);
grainMesh.frustumCulled = false; grainMesh.castShadow = true;
// 첫 화면 전에 색 버퍼를 만들어 두어야 입자 색이 적용된다.
{ const c = new THREE.Color(); for (let s = 0; s < 2400; s++) grainMesh.setColorAt(s, c.set(GRAINS[0].color)); }
scene.add(grainMesh);
const dropMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x7fd0ff, emissive: 0x1e6fa8, roughness: 0.3 }), 1600);
dropMesh.frustumCulled = false;
scene.add(dropMesh);
const m4 = new THREE.Matrix4(), tmpC = new THREE.Color();

// 단면을 자른 위치를 지형 위에 표시
const sectionLine = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)),
  new THREE.LineDashedMaterial({ color: 0xffd36b, dashSize: 3, gapSize: 2.4 }));
sectionLine.frustumCulled = false;
scene.add(sectionLine);

function syncTerrain() {
  const { h, thick, mask, surf } = model;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    pos[k * 3 + 1] = h[k];
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const nx = (h[il] - h[ir]) / ((ir - il) || 1), nz = (h[jl] - h[jr]) / (((jr - jl) / N) || 1);
    const l = Math.hypot(nx, 1, nz);
    nor[k * 3] = nx / l; nor[k * 3 + 1] = 1 / l; nor[k * 3 + 2] = nz / l;
    const t = smooth(0.12, 1.1, thick[k]);
    const a = surf[k * 3], b = surf[k * 3 + 1], c = surf[k * 3 + 2], w = a + b + c || 1;
    const wet = smooth(0.2, 1, mask[k]);
    for (let q = 0; q < 3; q++) {
      const sed = (GRAIN_RGB[0][q] * a + GRAIN_RGB[1][q] * b + GRAIN_RGB[2][q] * c) / w;
      let v = (baseRgb[k * 3 + q] + (sed - baseRgb[k * 3 + q]) * t) * speckle[k];
      v += (WATER_RGB[q] - v) * wet * 0.92;
      col[k * 3 + q] = v;
    }
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.normal.needsUpdate = true;
  geo.attributes.color.needsUpdate = true;
  skirtPts.forEach(([i, j], s) => {
    const x = i - CENTER, z = j - CENTER;
    skirtPos.set([x, h[j * N + i], z, x, BOTTOM, z], s * 6);
  });
  skirtGeo.attributes.position.needsUpdate = true;
  const lp = sectionLine.geometry.attributes.position;
  for (let j = 0; j < N; j++) lp.setXYZ(j, 0, h[j * N + CENTER] + 0.5, j - CENTER);
  lp.needsUpdate = true;
  sectionLine.computeLineDistances();
}

function syncParticles() {
  const ps = model.parcels;
  const n = Math.min(ps.length, grainMesh.count = 2400);
  grainMesh.count = n;
  for (let s = 0; s < n; s++) {
    const p = ps[s], g = GRAINS[p.cls];
    const y = model.sample(p.x, p.y) + g.size * 0.7;
    m4.makeScale(g.size, g.size, g.size);
    m4.setPosition(p.x - CENTER, y, p.y - CENTER);
    grainMesh.setMatrixAt(s, m4);
    grainMesh.setColorAt(s, tmpC.set(g.color));
  }
  grainMesh.instanceMatrix.needsUpdate = true;
  if (grainMesh.instanceColor) grainMesh.instanceColor.needsUpdate = true;
  const ds = model.drops;
  const d = Math.min(ds.length, 1600);
  dropMesh.count = d;
  for (let s = 0; s < d; s++) {
    const p = ds[s];
    m4.makeScale(0.62, 0.3, 0.62);
    m4.setPosition(p.x - CENTER, model.sample(p.x, p.y) + 0.5, p.y - CENTER);
    dropMesh.setMatrixAt(s, m4);
  }
  dropMesh.instanceMatrix.needsUpdate = true;
}

// 선상지 길이: 곡구 아래 중심선에서 눈에 띄게 쌓인 곳까지
function axisLength() {
  let last = 0;
  for (let j = MOUTH.j; j < N - 2; j++) {
    let s = 0;
    for (let p = -5; p <= 5; p++) s += model.thick[j * N + CENTER + p];
    if (s / 11 > 1.2) last = j - MOUTH.j;
  }
  return last;
}

// 이름표
const labelBox = document.getElementById('labels');
const mkLabel = (name, tip, cls = '') => {
  const el = document.createElement('div');
  el.className = `label ${cls}`;
  el.innerHTML = `<b>${name}</b>${tip ? `<span>${tip}</span>` : ''}`;
  labelBox.appendChild(el);
  return el;
};
const L = {
  mouth: mkLabel('곡구', ''),
  apex: mkLabel('선정', '굵은 자갈이 먼저 쌓입니다'),
  mid: mkLabel('선앙', '모래가 많이 쌓입니다'),
  toe: mkLabel('선단', '고운 입자까지 도착합니다'),
  sink: mkLabel('스며듦', '', 'water'),
  spring: mkLabel('다시 솟아남', '', 'water'),
};
const v3 = new THREE.Vector3();
function place(el, x, y, z, show) {
  v3.set(x - CENTER, y, z - CENTER).project(camera);
  if (!show || v3.z > 1) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.style.transform = `translate(-50%,-100%) translate(${(v3.x * 0.5 + 0.5) * innerWidth}px,${(-v3.y * 0.5 + 0.5) * innerHeight}px)`;
}
let labelsOn = true;
function syncLabels() {
  const R = axisLength();
  const ready = labelsOn && R > 45;
  const at = t => { const j = MOUTH.j + R * t; return [CENTER, model.sample(CENTER, j), j]; };
  place(L.mouth, CENTER, model.sample(CENTER, MOUTH.j - 10) + 12, MOUTH.j - 10, labelsOn);
  let p = at(0.2); place(L.apex, p[0], p[1] + 7, p[2], ready);
  p = at(0.5); place(L.mid, p[0], p[1] + 6, p[2], ready);
  p = at(0.95); place(L.toe, p[0], p[1] + 5, p[2], ready);
  const path = model.calmPath;
  const calm = labelsOn && !model.flooding && R > 45 && path.length;
  const find = t => { let b = path[0]; for (const q of path) if (Math.abs(q.t - t) < Math.abs(b.t - t)) b = q; return b; };
  if (calm) {
    const a = find(0.34), b = find(0.88);
    place(L.sink, a.x, model.sample(a.x, a.y) + 5, a.y, true);
    place(L.spring, b.x, model.sample(b.x, b.y) + 5, b.y, true);
  } else { L.sink.style.display = L.spring.style.display = 'none'; }
}

// 실시간 단면: 계산이 실제로 쌓은 층을 그대로 그린다.
const canvas = document.getElementById('section');
const ctx = canvas.getContext('2d');
function drawSection() {
  const W = canvas.width, H = canvas.height;
  const j0 = MOUTH.j - 26, j1 = N - 1, sx = W / (j1 - j0);
  const VE = 8.2, floorY = H - 28;
  const yOf = v => floorY - (v - 6) * VE;
  ctx.fillStyle = '#23302a'; ctx.fillRect(0, 0, W, H);
  // 기반암
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let j = j0; j <= j1; j++) ctx.lineTo((j - j0) * sx, yOf(model.base[j * N + CENTER]));
  ctx.lineTo(W, H); ctx.closePath();
  ctx.fillStyle = '#5a5249'; ctx.fill();
  // 쌓인 층: 층 두께 합이 실제 높이에 맞도록 맞춘다.
  for (let j = j0; j <= j1; j++) {
    const k = j * N + CENTER;
    const stack = model.section[j];
    const total = stack.reduce((s, l) => s + l.t, 0);
    const realT = model.h[k] - model.base[k];
    if (total <= 0 || realT <= 0) continue;
    const f = realT / total;
    let y = yOf(model.base[k]);
    for (const l of stack) {
      const dy = l.t * f * VE;
      ctx.fillStyle = GRAINS[l.c].color;
      ctx.fillRect((j - j0) * sx, y - dy, sx + 1, dy + 0.5);
      y -= dy;
    }
  }
  // 물
  if (model.flooding) {
    ctx.beginPath();
    for (let j = j0; j <= j1; j++) { const y = yOf(model.h[j * N + CENTER]) - 3; j === j0 ? ctx.moveTo(0, y) : ctx.lineTo((j - j0) * sx, y); }
    ctx.strokeStyle = '#59b7f0'; ctx.lineWidth = 4; ctx.stroke();
  }
  ctx.font = '700 26px "Malgun Gothic",sans-serif'; ctx.fillStyle = '#ffd36b';
  ctx.fillText('A', 10, 32); ctx.fillText('B', W - 30, 32);
  ctx.fillStyle = '#f3f1ea'; ctx.font = '700 22px "Malgun Gothic",sans-serif';
  const mx = (MOUTH.j - j0) * sx;
  ctx.fillText('곡구', mx - 22, 32);
  ctx.strokeStyle = '#f3f1ea'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.moveTo(mx, 42); ctx.lineTo(mx, yOf(model.h[MOUTH.j * N + CENTER]) - 6); ctx.stroke(); ctx.setLineDash([]);
}

const barsEl = document.getElementById('bars');
barsEl.innerHTML = GRAINS.map(g => `<div class="bar"><span class="name" style="color:${g.color}">${g.name}</span><div class="track"><i id="bar-${g.key}" style="background:${g.color}"></i></div></div>`).join('');
const noteEl = document.getElementById('now');
const NOTES = {
  empty: '빈 평지에서 시작합니다. 홍수가 나면 물과 토사가 좁은 골짜기를 따라 내려와 곡구로 나옵니다.',
  flood: '홍수입니다. 곡구를 벗어난 물은 넓게 퍼지며 힘이 약해집니다. 그래서 자갈이 먼저 멈추고, 모래는 더 가고, 진흙은 가장 멀리 갑니다. 쌓인 곳은 높아져 다음 물길은 낮은 쪽으로 옮겨 갑니다.',
  done: '선상지가 완성되었습니다. 곡구에 산지와 붙은 선정부터 선앙, 선단까지 입자가 작아지는 것을 단면에서 확인해 보세요. 평소의 물은 선앙에서 스며들었다가 선단에서 다시 솟아납니다.',
  calm: '홍수가 끝났습니다. 평소의 물은 선앙의 자갈과 모래 틈으로 스며들어 땅 위에서 사라졌다가 선단에서 다시 솟아납니다.',
};
function syncInfo() {
  const means = model.meanDistances();
  GRAINS.forEach((g, i) => { document.getElementById(`bar-${g.key}`).style.width = `${clamp(means[i] / 130) * 100}%`; });
  document.getElementById('floods').textContent = model.finished ? `홍수 ${model.floodCount}번으로 완성` : `홍수 ${model.floodCount}번째`;
  noteEl.textContent = model.finished ? NOTES.done : model.floodCount <= 1 && model.clock < 4 ? NOTES.empty : model.flooding ? NOTES.flood : NOTES.calm;
}

// 조작
let playing = true, speed = 1;
const isPhone = () => innerWidth <= 820;
const dock = () => (isPhone() ? 0 : document.getElementById('side').offsetWidth);
const panelW = () => (isPhone() || document.body.classList.contains('panel-closed') ? 0 : document.getElementById('panel').offsetWidth + 20);
const sheet = () => (isPhone() ? document.getElementById('side').offsetHeight : 0);
function fit() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  camera.setViewOffset(innerWidth, innerHeight, (dock() - panelW()) / 2, sheet() / 2, innerWidth, innerHeight);
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); fit(); });
const panelToggle = document.getElementById('panelToggle');
const setPanelClosed = on => { document.body.classList.toggle('panel-closed', on); panelToggle.textContent = on ? '조작 열기' : '접기'; fit(); };
panelToggle.onclick = () => setPanelClosed(!document.body.classList.contains('panel-closed'));
const playBtn = document.getElementById('playBtn');
const setPlaying = on => { playing = on; playBtn.textContent = on ? '멈춤' : '재생'; playBtn.classList.toggle('on', on); };
playBtn.onclick = () => setPlaying(!playing);
document.getElementById('resetBtn').onclick = () => { model.reset(); frameSync(true); setPlaying(true); };
document.getElementById('fastBtn').onclick = e => { speed = speed === 1 ? 3 : 1; e.currentTarget.classList.toggle('on', speed === 3); e.currentTarget.textContent = speed === 3 ? '3배 빠르게' : '빠르게'; };
document.getElementById('labelsBtn').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('on', labelsOn); };
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));
document.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => {
  const [name, val] = b.dataset.opt.split(':');
  model.setOption(name, val);
  document.querySelectorAll(`[data-opt^="${name}:"]`).forEach(o => o.classList.toggle('on', o === b));
});

let frame = 0;
function frameSync(all) {
  syncParticles();
  if (all || frame % 2 === 0) syncTerrain();
  if (all || frame % 45 === 0) renderer.shadowMap.needsUpdate = true;
  if (all || frame % 8 === 0) { drawSection(); syncInfo(); }
  syncLabels();
}
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (playing) {
    let remain = dt * speed;
    while (remain > 0) { const s = Math.min(remain, 1 / 30); model.tick(s); remain -= s; }
  }
  frame++;
  frameSync(false);
  renderer.render(scene, camera);
}

setView('oblique');
setPanelClosed(isPhone());
frameSync(true);
requestAnimationFrame(t => { last = t; loop(t); });

window.__MODEL = {
  model, setView, setPlaying,
  advance(seconds) { setPlaying(false); for (let t = 0; t < seconds * 30; t++) model.tick(1 / 30); frameSync(true); renderer.render(scene, camera); return { clock: model.clock, flooding: model.flooding, means: model.meanDistances().map(v => +v.toFixed(1)), R: axisLength() }; },
  setOption: (n, v) => document.querySelector(`[data-opt="${n}:${v}"]`).click(),
  info: () => renderer.info.render,
};
