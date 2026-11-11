// © 2026 김용현
// 해안 단구 모식도. 책 그림을 옮기지 않고 새로 그린 그림이다.
// 단면은 처음 암석 비탈에서 간빙기마다 파식대를 깎고, 땅을 통째로 올려 그린다. 그래서 평면과 단면, 단계가 같은 계산에서 나온다.

export const ZONE_TEXT = {
  terrace: { name: '해안 단구', text: '옛날 바닷가에서 생긴 파식대나 해빈이 지반 융기나 해수면 하강으로 오늘날 바다보다 높은 곳에 남은 계단 모양의 평평한 땅입니다. 평평한 윗면이 단구면입니다. 높은 곳의 단구일수록 오래되었습니다.' },
  scarp: { name: '단구애', text: '단구면 뒤쪽의 가파른 비탈입니다. 옛 해식애가 솟은 것입니다.' },
  shoreline: { name: '구정선', text: '옛날에 해수면이 머물렀던 자리를 이은 선입니다. 단구면과 그 뒤 단구애가 만나 기울기가 갑자기 바뀌는 곳입니다.' },
  cliff: { name: '해식애', text: '오늘날 파랑이 깎고 있는 바닷가 절벽입니다.' },
  platform: { name: '파식대', text: '해식애가 물러난 자리, 해식애 앞 아래쪽에 남은 평평한 바위 면입니다. 지금 해수면 높이에서 깎이고 있습니다.' },
  wave: { name: '파랑', text: '해수면 높이에서 절벽 아래를 깎습니다. 그보다 높이 솟은 옛 파식대에는 닿지 못합니다.' },
  uplift: { name: '지반 융기', text: '땅이 천천히 솟는 것입니다. 오늘날은 해수면이 높은 간빙기이므로 옛 바닷가가 오늘날 바다보다 높이 남으려면 반드시 필요합니다. 땅이 솟지 않으면 간빙기마다 바다가 같은 높이로 돌아와 옛 파식대를 다시 깎습니다.' },
  low: { name: '빙기의 해수면', text: '빙기에는 바닷물이 육지의 빙하로 묶여 해수면이 낮아집니다. 이때 생긴 바닷가 지형은 다음 간빙기에 바다 밑으로 잠깁니다.' },
  gravel: { name: '해성 자갈층과 모래층', text: '파랑에 닳아 둥글어진 자갈과 모래가 단구면 위에 쌓인 층입니다. 높은 곳에서 둥근 자갈이 나오면 그곳이 옛날 바닷가였다는 증거입니다.' },
  rate: { name: '융기 속도', text: '융기 속도는 구정선 높이에서 당시 해수면 높이를 뺀 값을 형성 시기로 나누어 구합니다. 약 12만 년 전 단구의 구정선이 약 36m이고 당시 해수면이 오늘날과 같았다고 가정하면 약 0.3m/천 년입니다.' },
};

export const STAGE_NAMES = ['간빙기: 첫 파식대', '빙기: 해수면 하강', '다음 간빙기: 단구', '되풀이: 여러 단'];
const NOTES = [
  '간빙기: 해수면이 높을 때 파랑이 절벽 아래를 깎습니다. 해식애가 물러난 자리에 평평한 파식대가 생깁니다.',
  '빙기: 바닷물이 빙하로 묶여 해수면이 낮아지고 파식대가 물 밖으로 드러납니다. 그동안에도 땅은 천천히 솟습니다.',
  '다음 간빙기: 해수면이 돌아왔지만 땅이 솟은 만큼 옛 파식대에는 파랑이 닿지 못합니다. 옛 파식대는 해안 단구로 남고, 파랑은 그 아래에 새 파식대를 깎습니다.',
  '되풀이: 간빙기마다 새 파식대가 생기고 옛 파식대는 더 높이 올라갑니다. 그래서 단구가 계단처럼 늘어서고, 높은 곳의 단구일수록 오래되었습니다.',
];

const SEA = '#3f8fc4', LAND = '#5a7346', ROCK = '#6f665a', PLATFORM = '#c7bda6', TERRACE = '#e6cf90', ACCENT = '#e4b15a', AIR = '#23302a', UP = '#ffb34d', HOT = '#ffb38a';
const f1 = v => v.toFixed(1);

// 단면 계산. x는 그림 칸, 높이는 위로 갈수록 크다.
export const STEP = 44; // 한 번의 빙기와 간빙기에 솟는 높이
const WIDTH = 100, CUT = 110, X0 = 200, CAP = 118;
const S = STEP / WIDTH;
export const SEC = { W: 720, H: 372, sea: 262, low: 322 };
// 단계별 간빙기 수와 솟은 높이
export const STATES = [{ n: 1, lift: 0, sea: 0 }, { n: 1, lift: STEP / 2, sea: SEC.low - SEC.sea }, { n: 2, lift: STEP, sea: 0 }, { n: 4, lift: STEP * 3, sea: 0 }];
const levelOf = k => -(k - 1) * STEP; // k번째 간빙기의 파식대(처음 암석 기준)
const cutEnd = k => X0 + (k - 1) * WIDTH; // k번째 간빙기의 처음 바닷가
export function rockAt(x, n) {
  let v = Math.min(CAP, (X0 - x) * S);
  if (x > X0 + WIDTH * 3.6) v = (X0 - (X0 + WIDTH * 3.6)) * S - (x - X0 - WIDTH * 3.6) * 0.55;
  for (let k = 1; k <= n; k++) if (x >= cutEnd(k) - CUT && x <= cutEnd(k)) v = Math.min(v, levelOf(k));
  return v;
}
export const heightAt = (x, stage) => rockAt(x, STATES[stage].n) + STATES[stage].lift;
// 그 단계에서 물 밖에 남은 옛 파식대(단구) 구간. 오래된 것부터.
export function terraces(stage) {
  const { n, lift } = STATES[stage], out = [];
  for (let k = 1; k < n; k++) out.push({ k, a: cutEnd(k) - CUT, b: cutEnd(k + 1) - CUT, h: levelOf(k) + lift });
  return out;
}
export const currentPlatform = stage => { const { n, lift } = STATES[stage]; return { a: cutEnd(n) - CUT, b: cutEnd(n), h: levelOf(n) + lift }; };

const yOf = v => SEC.sea - v;
function section(stage) {
  const st = STATES[stage], seaY = SEC.sea + st.sea;
  const pts = [`0,${SEC.H}`], plat = currentPlatform(stage), SHALLOW = st.sea === 0 ? 8 : 0;
  // 지금 깎이는 파식대는 해수면 바로 아래에 있어 그 위로 얕은 물이 덮인다.
  for (let x = 0; x <= SEC.W; x += 2) {
    let y = yOf(heightAt(x, stage));
    if (x > plat.a + 2 && x <= plat.b + 24) y = Math.max(y, SEC.sea + SHALLOW);
    pts.push(`${x},${f1(Math.min(SEC.H, y))}`);
  }
  pts.push(`${SEC.W},${SEC.H}`);
  const say = (zone, text, x, y, color = '#f3f1ea', anchor = 'middle', size = 18) => `<text class="zone" data-zone="${zone}" x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}" style="cursor:pointer">${text}</text>`;
  let marks = '';
  // 단구면과 자갈, 구정선
  terraces(stage).forEach((t, n) => {
    const y = yOf(t.h);
    marks += `<line data-terrace="1" x1="${t.a}" x2="${t.b}" y1="${y}" y2="${y}" stroke="${TERRACE}" stroke-width="5"/>`;
    for (let x = t.a + 8; x < t.b - 2; x += 13) marks += `<ellipse cx="${x}" cy="${y + 1}" rx="3" ry="2" fill="#fff4cf"/>`;
    marks += `<path data-shoreline="1" d="M${t.a} ${y - 3}l-7 -12h14z" fill="${HOT}"/>`;
    marks += say('terrace', t.k === 1 ? '단구면' : `단구면`, (t.a + t.b) / 2 + 6, y - 11, '#ffe9b0');
    if (stage === 3) marks += `<text x="${(t.a + t.b) / 2 + 6}" y="${y + 22}" text-anchor="middle" font-size="15" font-weight="700" fill="#efe9d8">${['가장 오래됨', '', '가장 새로움'][n]}</text>`;
    if (n === 0) {
      // 단구애는 단구면 뒤쪽 위의 비탈, 구정선은 단구면과 단구애가 만나는 세모 자리다. 지시선으로 가리킨다.
      marks += `<line x1="${t.a - 26}" y1="${y - 30}" x2="${t.a - 2}" y2="${y - 24}" stroke="#ffd36b" stroke-width="2"/>`;
      marks += say('scarp', '단구애', t.a - 30, y - 26, '#ffd36b', 'end');
      marks += `<line x1="${t.a - 26}" y1="${y + 18}" x2="${t.a - 2}" y2="${y + 1}" stroke="${HOT}" stroke-width="2"/>`;
      marks += say('shoreline', '구정선', t.a - 30, y + 26, HOT, 'end');
    }
  });
  // 파식대와 해식애
  const pl = currentPlatform(stage), py = yOf(pl.h);
  if (st.sea === 0) {
    marks += `<line x1="${pl.a + 3}" x2="${pl.b}" y1="${py + 10}" y2="${py + 10}" stroke="${PLATFORM}" stroke-width="5"/>`;
    marks += say('platform', '파식대', (pl.a + pl.b) / 2 + 10, py + 36, '#efe9d8');
    // 파랑이 파식대 위의 얕은 물을 건너 절벽 밑을 친다.
    marks += say('cliff', '해식애', pl.a + 14, py - 40, HOT, 'start');
    marks += say('wave', '파랑', pl.b + 88, seaY - 14, '#ffffff');
    marks += `<g stroke="#fff" stroke-width="3" fill="#fff"><path d="M${pl.b + 56} ${seaY - 10}H${pl.a + 18}" fill="none"/><path d="M${pl.a + 6} ${seaY - 10}l13 -6v12z"/></g>`;
  } else {
    // 빙기: 파식대가 물 밖으로 드러난다.
    marks += `<line x1="${pl.a}" x2="${pl.b}" y1="${py}" y2="${py}" stroke="${TERRACE}" stroke-width="5"/>`;
    marks += say('platform', '드러난 파식대', (pl.a + pl.b) / 2 + 6, py - 12, '#ffe9b0');
    marks += `<line x1="0" x2="${SEC.W}" y1="${SEC.sea}" y2="${SEC.sea}" stroke="#d8efff" stroke-width="2" stroke-dasharray="5 6"/>`;
    marks += `<text x="${SEC.W - 12}" y="${SEC.sea - 8}" text-anchor="end" font-size="15" font-weight="700" fill="#d8efff">오늘날 해수면 높이</text>`;
    marks += `<g stroke="#8fd6ff" stroke-width="3" fill="#8fd6ff"><path d="M640 ${SEC.sea + 6}v${st.sea - 22}" fill="none"/><path d="M640 ${seaY - 3}l-7 -13h14z"/></g>`;
    marks += say('low', '해수면 하강', 628, SEC.sea + 40, '#8fd6ff', 'end');
  }
  const lift = st.lift > 0 ? `<g data-up="1" stroke="${UP}" stroke-width="4" fill="${UP}"><path d="M44 ${SEC.H - 20}v-44" fill="none"/><path d="M44 ${SEC.H - 74}l-9 15h18z"/></g>${say('uplift', '지반 융기', 62, SEC.H - 42, UP, 'start')}` : '';
  let seaStart = 0;
  while (seaStart < SEC.W && yOf(heightAt(seaStart, stage)) < seaY) seaStart += 2;
  const firstLine = stage >= 2 ? `<text x="${SEC.W - 12}" y="${seaY + 28}" text-anchor="end" font-size="15" font-weight="700" fill="#d8efff">해수면</text>` : '';
  return `<svg class="sec" viewBox="0 0 ${SEC.W} ${SEC.H}" role="img" aria-label="바닷가를 육지에서 바다로 자른 단면. ${STAGE_NAMES[stage]} 단계이다.">
    <style>svg.sec text{paint-order:stroke;stroke:#1c211e;stroke-width:3.5px;stroke-linejoin:round}</style>
    <rect width="${SEC.W}" height="${SEC.H}" fill="${AIR}"/>
    <rect x="0" y="${seaY}" width="${SEC.W}" height="${SEC.H - seaY}" fill="${SEA}"/>
    <polygon data-ground="1" points="${pts.join(' ')}" fill="${ROCK}"/>
    <line x1="${seaStart}" x2="${SEC.W}" y1="${seaY}" y2="${seaY}" stroke="#d8efff" stroke-width="2"/>
    ${marks}${lift}${firstLine}
    <text x="10" y="24" font-size="21" font-weight="800" fill="${ACCENT}">A</text>
    <text x="${SEC.W - 10}" y="24" text-anchor="end" font-size="21" font-weight="800" fill="${ACCENT}">B</text>
    <text x="150" y="${SEC.H - 10}" font-size="14" font-weight="700" fill="#efe9d8">세로를 크게 과장한 예시입니다.</text>
  </svg>`;
}

// 위에서 본 모습: 단구면이 해안을 따라 띠처럼 이어지고 물길이 그 띠를 끊는다.
const PLAN = { W: 720, H: 300, stream: 470 };
function plan(stage) {
  const row = offset => 40 + (offset / SEC.W) * 300; // 단면의 가로 위치를 평면의 세로 위치로 옮긴다.
  const band = (a, b, color, extra = '') => `<rect ${extra} x="0" y="${f1(row(a))}" width="${PLAN.W}" height="${f1(row(b) - row(a))}" fill="${color}"/>`;
  const ts = terraces(stage), pl = currentPlatform(stage), seaFrom = STATES[stage].sea ? pl.b + 96 : pl.b;
  let out = `<rect width="${PLAN.W}" height="${PLAN.H}" fill="${SEA}"/>`;
  out += band(-200, pl.a, LAND);
  ts.forEach(t => { out += band(t.a, t.b, TERRACE, 'data-terrace="1"'); });
  // 단구애: 단구면 앞의 어두운 띠
  ts.forEach(t => { out += band(t.b - 6, t.b, ROCK); });
  ts.forEach(t => { out += band(t.a - 6, t.a, ROCK); });
  out += band(pl.a, pl.b, STATES[stage].sea ? TERRACE : PLATFORM);
  if (STATES[stage].sea) out += band(pl.b, seaFrom, '#8c8069');
  const L = (zone, text, x, y, color = '#f3f1ea') => `<text class="zone" data-zone="${zone}" x="${x}" y="${y}" text-anchor="middle" font-size="18" font-weight="700" fill="${color}" paint-order="stroke" stroke="#1c211e" stroke-width="3.5" style="cursor:pointer">${text}</text>`;
  // 물길이 단구를 끊고 바다로 간다.
  const yEnd = row(seaFrom);
  out += `<path data-stream="1" d="M${PLAN.stream - 30} 0C${PLAN.stream + 30} 60 ${PLAN.stream - 40} 120 ${PLAN.stream} ${f1(yEnd)}" fill="none" stroke="#7f7464" stroke-width="16"/>`;
  out += `<path d="M${PLAN.stream - 30} 0C${PLAN.stream + 30} 60 ${PLAN.stream - 40} 120 ${PLAN.stream} ${f1(yEnd)}" fill="none" stroke="#3f8fc4" stroke-width="4"/>`;
  ts.forEach(t => { out += L('terrace', '단구면', 190, f1((row(t.a) + row(t.b)) / 2 + 6), '#3a2f14').replace('stroke="#1c211e"', 'stroke="#f3e8c4"'); });
  out += L('platform', STATES[stage].sea ? '드러난 파식대' : '파식대', 560, f1((row(pl.a) + row(pl.b)) / 2 + 6), '#1c211e').replace('stroke="#1c211e"', 'stroke="#efe9d8"');
  if (STATES[stage].sea) out += L('low', '빙기의 바닷가', 300, f1(row(seaFrom) + 24), '#d8efff');
  else out += L('wave', '바다', 300, f1(Math.min(PLAN.H - 14, row(pl.b) + 34)), '#d8efff');
  out += `<line x1="${CROSS}" y1="4" x2="${CROSS}" y2="${PLAN.H - 4}" stroke="${ACCENT}" stroke-width="2.4" stroke-dasharray="4 5"/><text x="${CROSS + 10}" y="22" font-size="19" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">A</text><text x="${CROSS + 10}" y="${PLAN.H - 10}" font-size="19" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">B</text>`;
  return `<svg viewBox="0 0 ${PLAN.W} ${PLAN.H}" role="img" aria-label="위에서 본 바닷가. 위쪽이 육지, 아래쪽이 바다이고 단구면이 해안을 따라 띠처럼 이어진다. 물길이 단구를 끊는다.">${out}</svg>`;
}
const CROSS = 90;

// 단구면을 파서 본 층: 흙, 둥근 자갈층, 모래층, 그 아래 깎인 암석
function layers() {
  const L = (zone, x, y, t) => `<text class="zone" data-zone="${zone}" x="${x}" y="${y}" font-size="17" font-weight="700" fill="#f3f1ea" paint-order="stroke" stroke="#1c211e" stroke-width="3.5" style="cursor:pointer">${t}</text>`;
  let pebbles = '';
  let seed = 7;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let q = 0; q < 64; q++) pebbles += `<ellipse cx="${f1(40 + r() * 400)}" cy="${f1(100 + r() * 40)}" rx="${f1(7 + r() * 8)}" ry="${f1(5 + r() * 4)}" fill="#cdbf9f" stroke="#544a39"/>`;
  return `<svg viewBox="0 0 720 200" role="img" aria-label="단구면을 파서 본 층. 위에서부터 흙, 모래층, 둥근 자갈층이 있고 그 아래는 깎인 암석이다.">
    <rect width="720" height="200" fill="${AIR}"/>
    <rect x="30" y="30" width="420" height="34" fill="#6d5a3c"/>
    <rect x="30" y="64" width="420" height="30" fill="${TERRACE}"/>
    <rect x="30" y="94" width="420" height="50" fill="#8a7a5c"/>
    ${pebbles}
    <path d="M30 144H450V190H30Z" fill="${ROCK}"/>
    <path d="M30 144H450" stroke="#1c211e" stroke-width="2"/>
    ${L('terrace', 470, 54, '흙')}
    ${L('gravel', 470, 84, '해성 모래층')}
    ${L('gravel', 470, 124, '해성 자갈층 (둥근 자갈)')}
    ${L('platform', 470, 174, '깎인 암석 (옛 파식대 면)')}
  </svg>`;
}

// options.steps: 단계 버튼을 그릴지. options.stage: 처음 단계. options.onZone: 구역을 눌렀을 때.
export function createSchematic(root, options = {}) {
  let stage = options.stage ?? 3, zone = null;
  const onZone = options.onZone ?? (() => {});
  const paint = () => {
    const buttons = options.steps ? `<div class="row" aria-label="모식도 단계">${STAGE_NAMES.map((t, n) => `<button data-schem-stage="${n}" class="${n === stage ? 'on' : ''}">${t}</button>`).join('')}</div>` : '';
    root.innerHTML = `
      <h2>육지(A)에서 바다(B)로 자른 단면 (모식도)</h2>
      ${buttons}
      <figure>${section(stage)}</figure>
      <h2>위에서 본 모습 (모식도)</h2>
      <figure>${plan(stage)}</figure>
      <h2>단구면을 파서 본 층 (모식도)</h2>
      <figure>${layers()}</figure>
      <p class="schem-note">${zone ? `<b>${ZONE_TEXT[zone].name}</b> ${ZONE_TEXT[zone].text}` : NOTES[stage]}</p>
      <p class="schem-cap">이름을 누르면 설명이 나옵니다. 세모는 구정선입니다. 해안선과 규모, 층의 순서와 두께는 설명을 위한 예시입니다. 물길이 단구를 끊어 실제 단구는 곳곳에 조각으로 남습니다. <button class="zone-link" data-zone="rate">융기 속도 구하는 법</button></p>`;
  };
  root.addEventListener('click', e => {
    const s = e.target.closest('[data-schem-stage]');
    if (s) { stage = +s.dataset.schemStage; zone = null; paint(); return; }
    const g = e.target.closest('[data-zone]');
    if (!g) return;
    zone = zone === g.dataset.zone ? null : g.dataset.zone;
    paint();
    onZone(zone);
  });
  paint();
  return { setStage(n) { if (n !== stage) { stage = n; paint(); } }, get stage() { return stage; } };
}
