// © 2026 김용현
// 선상지 모식도. 책 그림을 옮기지 않고 새로 그린 그림으로, 3D 화면의 시간 단계에 맞춰 바뀐다.
// 위에서 본 평면과 A-B를 자른 단면이 같은 구역(선정, 선앙, 선단)을 공유한다.

export const ZONE_TEXT = {
  apex: { name: '선정', text: '곡구 바로 앞입니다. 굵은 자갈이 많고, 계곡물과 비교적 얕은 지하수를 쓰기 쉬워 마을이 들어서기도 합니다.' },
  mid: { name: '선앙', text: '자갈과 모래 틈으로 물이 스며들어(복류) 땅 위에 물이 부족하고 지하수면도 깊습니다. 그래서 예로부터 밭과 과수원으로 많이 썼습니다.' },
  toe: { name: '선단', text: '스며든 물이 다시 솟아나고(용천) 지하수면이 얕습니다. 물을 얻기 쉬워 마을과 논이 들어섭니다.' },
};

const STAGES = [{ t: 0.34 }, { t: 0.68 }, { t: 1 }];
export const STAGE_T = STAGES.map(s => s.t);
// 선정, 선앙, 선단의 경계(곡구에서 부채꼴 끝까지의 비율). 평면과 단면이 같은 값을 쓴다.
export const ZONE_BOUNDS = [0.28, 0.72];
const WATER = '#6fb6d8';
const SED = '#c9a877';
const SED_FINE = '#dcc7a0';
const ROCK = '#55524c';
const MTN = '#3f5a44';
const ACCENT = '#e4b15a';
const WATER_DARK = '#1f6f9c';

export const X0 = 190; // 단면에서 곡구의 위치
const LEN = 400; // 다 자란 선상지의 길이

function rand32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = v => v.toFixed(1);
const bedrock = x => (x < X0 ? 14 + (Math.max(x, 0) / X0) ** 0.7 * 208 : 222 + 46 * (1 - Math.exp(-(x - X0) / 240)));
export const fanLen = t => LEN * (0.4 + 0.6 * t);
const smoothEnd = u => { const v = Math.min(1, Math.max(0, (1 - u) / 0.1)); return v * v * (3 - 2 * v); };
// 퇴적면: 곡구에서 오목하게 낮아지고, 위쪽으로 이으면 산지 사면과 만난다.
// 그래서 선정은 산지에 바로 붙고, 퇴적물은 골짜기 입구를 메운다.
const fanTop = (x, t) => {
  const L = fanLen(t), T = 56 * Math.sqrt(t);
  if (x >= X0) {
    const u = (x - X0) / L;
    // 곡구에서 오목하게 얇아지다가, 끝의 얇은 층이 막대 끝(u=1)에서 자연스럽게 사라진다.
    return u >= 1 ? bedrock(x) : bedrock(x) - T * (1 - u) ** 1.15 - 5 * smoothEnd(u);
  }
  return fanTop(X0, t) + 0.3 * (x - X0);
};
const surface = (x, t) => Math.min(bedrock(x), fanTop(x, t));
export const thickness = (x, t) => Math.max(0, bedrock(x) - surface(x, t));
// 퇴적면이 산지 사면과 만나는 곳이 선정의 맨 위다.
const origin = t => {
  for (let x = X0; x > 0; x -= 1) if (fanTop(x, t) >= bedrock(x)) return x;
  return 0;
};
// 구역은 곡구부터 잰다. 곡구 뒤 골짜기 안의 메워진 면은 산지 사면으로 이어지지만 선정 막대에는 넣지 않는다.
export const zoneX = t => {
  const L = fanLen(t), [a, b] = ZONE_BOUNDS;
  return { apex: [X0, X0 + L * a], mid: [X0 + L * a, X0 + L * b], toe: [X0 + L * b, X0 + L] };
};
// 입자 반지름. 곡구 쪽이 크고 선단으로 갈수록 작아진다. r은 0~1의 난수로, 같은 곳에도 크기가 조금씩 섞인다.
export const grainSize = (x, t, r) => Math.max(0.9, (1 - Math.max(0, x - X0) / fanLen(t)) ** 1.4 * (2.6 + r * 5));

function poly(fn, a, b, step = 5) {
  const pts = [];
  for (let x = a; x < b; x += step) pts.push(`${f1(x)},${f1(fn(x))}`);
  pts.push(`${f1(b)},${f1(fn(b))}`);
  return pts;
}

function grainDots(t) {
  // 곡구에 가까울수록 입자가 크고, 멀어질수록 작아진다. 같은 곳에도 크기가 조금씩 섞여 있다.
  const rand = rand32(11);
  let s = '';
  for (let n = 0; n < 520; n++) {
    const o = origin(t);
    const x = o + rand() * (X0 + fanLen(t) - o);
    const th = thickness(x, t);
    if (th < 3) continue;
    const r = grainSize(x, t, rand());
    const y = bedrock(x) - rand() * (th - r * 2 - 1) - r - 0.5;
    if (y - r < surface(x, t)) continue;
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="#8d8373" stroke="#3d3a33" stroke-width=".6"/>`;
  }
  return s;
}

const house = (x, y) => `<path d="M${x - 11} ${y}v-12l11-10 11 10v12z" fill="#23302a" stroke="currentColor" stroke-width="2"/>`;
const tree = (x, y) => `<path d="M${x} ${y}v-11" stroke="currentColor" stroke-width="2"/><circle cx="${x}" cy="${y - 18}" r="8" fill="#23302a" stroke="currentColor" stroke-width="2"/>`;
const paddy = (x, y) => `<path d="M${x - 13} ${y}h26M${x - 8} ${y}v-12M${x} ${y}v-15M${x + 8} ${y}v-12" fill="none" stroke="currentColor" stroke-width="2"/>`;

export function section(stage) {
  const { t } = STAGES[stage];
  const L = fanLen(t);
  const z = zoneX(t);
  const end = 720;
    const fanEnd = Math.min(X0 + L, end);
  const o = origin(t);
  const sed = [...poly(x => surface(x, t), o, fanEnd), ...poly(bedrock, o, fanEnd).reverse()].join(' ');
  const ground = `0,340 ${poly(bedrock, 0, end).join(' ')} ${end},340`;
  const ly = x => surface(x, t);

  // 물: 오늘날에는 선앙에서 땅속으로 들어갔다가 선단에서 나온다. 그 전에는 홍수 때 땅 위로 흐른다.
  let water = '';
  if (stage === 2) {
    const sink = z.mid[0] + (z.mid[1] - z.mid[0]) * 0.1;
    const spring = z.toe[0] + (z.toe[1] - z.toe[0]) * 0.45;
    const under = x => {
      const p = (x - sink) / (spring - sink);
      // 땅속 물은 퇴적층 안으로 흐른다.
      return ly(x) + Math.min(Math.sin(Math.PI * p) * 30, thickness(x, t) * 0.7) + 1;
    };
    water = `
      <polyline points="${poly(x => ly(x) - 2, Math.max(0, o - 34), sink).join(' ')}" fill="none" stroke="${WATER}" stroke-width="4" marker-end="url(#fanArrow)"/>
      <polyline points="${poly(under, sink, spring).join(' ')}" fill="none" stroke="${WATER}" stroke-width="2.6" stroke-dasharray="7 6"/>
      <polyline points="${poly(x => ly(x) - 2, spring, end - 6).join(' ')}" fill="none" stroke="${WATER}" stroke-width="4" marker-end="url(#fanArrow)"/>
      <text x="${f1((sink + spring) / 2)}" y="${f1(under((sink + spring) / 2) + 22)}" text-anchor="middle" fill="${WATER}" font-size="17" font-weight="700">물이 땅속으로 (복류)</text>
      <path d="M${f1(spring)} ${f1(ly(spring) - 2)}v-32" stroke="${WATER}" stroke-width="2.4"/>
      <text x="${f1(spring - 6)}" y="${f1(ly(spring) - 40)}" text-anchor="middle" fill="${WATER}" font-size="17" font-weight="700">다시 솟아남 (용천)</text>`;
  } else {
    water = `<polyline points="${poly(x => ly(x) - 2, Math.max(0, o - 34), Math.min(X0 + L + 40, end - 6)).join(' ')}" fill="none" stroke="${WATER}" stroke-width="4" marker-end="url(#fanArrow)"/>
      <text x="${f1(X0 + L * 0.55)}" y="${f1(ly(X0 + L * 0.55) - 12)}" text-anchor="middle" fill="${WATER}" font-size="17" font-weight="700">홍수 때 물길</text>`;
  }

  const uses = stage === 2 ? `
    <g color="#efe9d8">
      ${house(Math.round(z.apex[0] + 56), Math.round(ly(z.apex[0] + 56) - 5))}
      ${tree(Math.round(z.mid[0] + 62), Math.round(ly(z.mid[0] + 62) - 4))}${tree(Math.round(z.mid[0] + 86), Math.round(ly(z.mid[0] + 86) - 4))}
      ${paddy(Math.round(z.toe[1] - 18), Math.round(ly(z.toe[1] - 18) - 5))}${house(Math.round(z.toe[1] - 48), Math.round(ly(z.toe[1] - 48) - 5))}
    </g>` : '';

  // 구역 띠: 막대에서 퇴적면까지를 옅게 칠해 어디까지인지 읽히게 한다. 구역마다 명도가 다르다.
  const SHADE = { apex: 0.1, mid: 0.05, toe: 0.1 };
  const band = (key) => {
    const [a, b] = z[key];
    return `<g data-zone="${key}" class="zone" style="cursor:pointer">
      <polygon points="${f1(a)},44 ${f1(b)},44 ${poly(ly, a, b).reverse().join(' ')}" fill="#fff" fill-opacity="${SHADE[key]}"/>
      <rect class="zone-band" x="${f1(a)}" y="44" width="${f1(b - a)}" height="262" fill="${ACCENT}" fill-opacity="0"/>
      <line x1="${f1(a + 3)}" x2="${f1(b - 3)}" y1="42" y2="42" stroke="currentColor" stroke-width="1.5"/>
      <text x="${f1((a + b) / 2)}" y="33" text-anchor="middle" font-size="21" font-weight="700" fill="currentColor">${ZONE_TEXT[key].name}</text>
    </g>`;
  };
  // 구역 경계 점선(막대에서 퇴적면까지)과 곡구 표시. 곡구 선은 선정 막대의 왼쪽 끝과 같은 자리다.
  const edges = [z.mid[0], z.mid[1], z.toe[1]].map(x => `<line data-mark="zone-edge" x1="${f1(x)}" x2="${f1(x)}" y1="43" y2="${f1(ly(x))}" stroke="currentColor" stroke-width="1" stroke-dasharray="3 4" stroke-opacity=".75"/>`).join('');
  const mouth = `<line data-mark="mouth" x1="${f1(X0)}" x2="${f1(X0)}" y1="36" y2="${f1(ly(X0))}" stroke="${ACCENT}" stroke-width="1.6" stroke-dasharray="4 4"/>
    <text x="${f1(X0 - 7)}" y="54" text-anchor="end" font-size="18" font-weight="700" fill="${ACCENT}">곡구</text>`;

  return `<svg class="sec" viewBox="0 0 720 340" role="img" aria-label="선상지를 A에서 B로 자른 단면. 곡구에서 멀어질수록 퇴적물이 얇아지고 입자가 작아지며, 물은 선앙에서 땅속으로 들어갔다가 선단에서 다시 솟아난다.">
    <defs>
      <marker id="fanArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="${WATER}"/></marker>
      <pattern id="fanRock" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="16" height="16" fill="${ROCK}"/><path d="M0 8h16" stroke="#6b675f" stroke-width="1.2"/></pattern>
      <linearGradient id="fanSedFill" x1="0" x2="1"><stop offset="0" stop-color="${SED}"/><stop offset="1" stop-color="${SED_FINE}"/></linearGradient>
    </defs>
    <polygon points="${ground}" fill="url(#fanRock)"/>
    <polygon points="${sed}" fill="url(#fanSedFill)"/>
    <style>svg.sec text{paint-order:stroke;stroke:#1c211e;stroke-width:3.5px;stroke-linejoin:round}</style>
    ${grainDots(t)}
    ${band('apex')}${band('mid')}${band('toe')}
    ${edges}${mouth}
    ${water}
    ${uses}
    <text x="20" y="312" font-size="17" font-weight="700" fill="#efe9d8">기반암</text>
    <text x="62" y="62" font-size="19" font-weight="700" fill="currentColor">산지</text>
    <text x="10" y="24" font-size="21" font-weight="800" fill="${ACCENT}">A</text>
    <text x="704" y="228" font-size="21" font-weight="800" fill="${ACCENT}">B</text>
    <g font-size="17" fill="#efe9d8" font-weight="700">
      <text x="${f1(X0 + 12)}" y="328">입자 큼</text>
      <text x="${f1(Math.min(X0 + L, 640))}" y="328" text-anchor="end">입자 작음</text>
      <path d="M${f1(X0 + 76)} 322H${f1(Math.min(X0 + L, 640) - 88)}" stroke="#efe9d8" stroke-width="1.6"/>
      <path d="M${f1(Math.min(X0 + L, 640) - 88)} 322l-8-4v8z" fill="#efe9d8"/>
    </g>
  </svg>`;
}

// 평면의 구역: 경계 원호의 반지름과 이름을 놓을 자리(부채꼴 반지름에 대한 비).
export function planZones(stage) {
  const R = 228 * (0.4 + 0.6 * STAGES[stage].t), [a, b] = ZONE_BOUNDS;
  return { R, bounds: ZONE_BOUNDS.map(u => R * u), names: { apex: a / 2, mid: (a + b) / 2, toe: (b + 1) / 2 } };
}

export function plan(stage) {
  const { t } = STAGES[stage];
  const cx = 360, cy = 58;
  const { R, bounds, names } = planZones(stage);
  const SPREAD = 72 * (Math.PI / 180);
  const pt = (r, a) => [cx + Math.sin(a) * r, cy + Math.cos(a) * r];
  const arc = (r) => {
    const [x0, y0] = pt(r, -SPREAD), [x1, y1] = pt(r, SPREAD);
    return `M${f1(x0)} ${f1(y0)}A${f1(r)} ${f1(r)} 0 0 0 ${f1(x1)} ${f1(y1)}`;
  };
  const fan = `M${cx} ${cy}L${pt(R, -SPREAD).map(f1).join(' ')}A${f1(R)} ${f1(R)} 0 0 0 ${pt(R, SPREAD).map(f1).join(' ')}Z`;
  const contours = bounds.map(r => `<path d="${arc(r)}" fill="none" stroke="#4d3f27" stroke-width="2.2"/>`).join('');
  const ridge = [];
  for (let x = 20; x < 720; x += 44) ridge.push(`<path d="M${x - 16} 44L${x} ${14 + (x % 3) * 4}L${x + 16} 44" fill="none" stroke="#7f9a84" stroke-width="1.6"/>`);
  const channel = (a, b, r0, r1) => {
    const p0 = pt(R * r0, a), p1 = pt(R * (r0 + r1) / 2, (a + b) / 2 + 0.05), p2 = pt(R * r1, b);
    return `M${f1(p0[0])} ${f1(p0[1])}Q${f1(p1[0])} ${f1(p1[1])} ${f1(p2[0])} ${f1(p2[1])}`;
  };
  let water = '';
  if (stage === 0) {
    water = `<path d="${channel(0.05, 0.12, 0.02, 1)}" fill="none" stroke="${WATER_DARK}" stroke-width="3.4" marker-end="url(#fanArrow2)"/>`;
  } else if (stage === 1) {
    water = `<path d="${channel(0, -0.72, 0.02, 0.96)}" fill="none" stroke="#6d6250" stroke-width="2.2" stroke-dasharray="6 6"/>
      <path d="${channel(0, 0.1, 0.02, 0.96)}" fill="none" stroke="#6d6250" stroke-width="2.2" stroke-dasharray="6 6"/>
      <path d="${channel(0, 0.82, 0.02, 1)}" fill="none" stroke="${WATER_DARK}" stroke-width="3.4" marker-end="url(#fanArrow2)"/>
      <text x="${f1(pt(R * 0.68, -0.72)[0])}" y="${f1(pt(R * 0.68, -0.72)[1] + 28)}" text-anchor="middle" font-size="17" fill="#3f3626" font-weight="700">옛 물길</text>
      <text x="${f1(pt(R * 0.74, 0.82)[0] + 12)}" y="${f1(pt(R * 0.74, 0.82)[1] + 30)}" text-anchor="middle" font-size="17" fill="${WATER_DARK}" font-weight="700">새 물길</text>`;
  } else {
    water = `<path d="${channel(0.02, 0.1, 0.02, 0.32)}" fill="none" stroke="${WATER_DARK}" stroke-width="3.4"/>
      <path d="${channel(0.1, 0.16, 0.32, 0.8)}" fill="none" stroke="${WATER_DARK}" stroke-width="2.4" stroke-dasharray="7 6"/>
      <path d="${channel(0.16, 0.2, 0.8, 1.02)}" fill="none" stroke="${WATER_DARK}" stroke-width="3.4" marker-end="url(#fanArrow2)"/>`;
  }
  const lab = (key, u) => {
    const a = -0.42;
    const [x, y] = pt(R * u, a);
    return `<text data-zone="${key}" class="zone" x="${f1(x)}" y="${f1(y + 7)}" text-anchor="middle" font-size="${stage === 0 ? 15 : 20}" font-weight="700" fill="#2c2416" style="cursor:pointer">${ZONE_TEXT[key].name}</text>`;
  };
  const by = Math.min(cy + R + 12, 288);
  return `<svg viewBox="0 0 720 300" role="img" aria-label="위에서 본 선상지. 곡구에서 부채꼴로 퍼지며, 물길이 옮겨 다니면서 넓어진다. 점선은 옛 물길이나 땅속으로 흐르는 물이다.">
    <defs>
      <marker id="fanArrow2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${WATER_DARK}"/></marker>
      <radialGradient id="fanPlanFill" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${f1(R)}"><stop offset="0" stop-color="${SED}"/><stop offset="1" stop-color="${SED_FINE}"/></radialGradient>
    </defs>
    <rect x="0" y="0" width="720" height="50" fill="${MTN}"/>
    ${ridge.join('')}
    <path d="M${cx - 30} 0L${cx} ${cy}L${cx + 30} 0Z" fill="#2a2d29"/>
    <path d="M${cx + 2} 0L${cx} ${cy}" stroke="${WATER}" stroke-width="3.4"/>
    <path d="${fan}" fill="url(#fanPlanFill)" stroke="#6b5a3c" stroke-width="1.4"/>
    ${contours}
    ${water}
    ${lab('apex', names.apex)}${lab('mid', names.mid)}${lab('toe', names.toe)}
    <circle cx="${cx}" cy="${cy}" r="4.5" fill="${ACCENT}"/>
    <text x="${cx + 14}" y="${cy - 16}" font-size="18" font-weight="700" fill="#f3f1ea">곡구</text>
    <line x1="${cx}" y1="8" x2="${cx}" y2="${f1(by - 2)}" stroke="${ACCENT}" stroke-width="1.5" stroke-dasharray="3 5"/>
    <text x="${cx - 22}" y="22" font-size="19" font-weight="800" fill="${ACCENT}">A</text>
    <text x="${cx - 22}" y="${f1(by + 2)}" font-size="19" font-weight="800" fill="${ACCENT}">B</text>
  </svg>`;
}

export function createSchematic(root, onZone = () => {}) {
  let stage = 2, zone = null;
  const paint = () => {
    root.innerHTML = `
      <h2>위에서 본 모습</h2>
      <figure>${plan(stage)}</figure>
      <h2>A에서 B로 자른 단면</h2>
      <figure id="secFig">${section(stage)}</figure>
      <p class="schem-note">${zone ? `<b>${ZONE_TEXT[zone].name}</b> ${ZONE_TEXT[zone].text}` : '선정, 선앙, 선단을 누르면 설명이 나오고 3D 화면에도 표시됩니다.'}</p>
      <p class="schem-cap">이 그림은 높이를 크게 과장했습니다. 실제 경사는 3에서 4%로 완만합니다. 선상지의 퇴적층은 자갈과 모래가 뒤섞인 사력층입니다.</p>`;
    root.querySelectorAll(`.zone[data-zone="${zone}"] .zone-band`).forEach(b => b.setAttribute('fill-opacity', '0.2'));
  };
  root.addEventListener('click', e => {
    const g = e.target.closest('[data-zone]');
    if (!g) return;
    zone = zone === g.dataset.zone ? null : g.dataset.zone;
    paint();
    onZone(zone);
  });
  paint();
  return { setStage(n) { stage = n; paint(); } };
}
