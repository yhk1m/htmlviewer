// © 2026 김용현
// 용암대지와 협곡 형성 모형 하나를 그리는 3D 블록. group을 옮겨 나란히 놓을 수 있다. 계산은 하지 않고 model의 값을 그대로 그린다.
// 높이는 VE배로 키워 그린다(가로 1칸 = 30m를 1로 그린다).
// 옆면 넷과 협곡 절벽에는 땅속 단면(기반암, 옛 하천 자갈층, 용암층과 주상절리, 호수 퇴적층, 스코리아)을 그림으로 붙인다.
// 협곡 절벽은 땅 격자 한 칸보다 좁은 곳에 서야 하므로, 절벽 양쪽의 격자 점을 절벽 자리로 옮겨 거의 수직으로 세운다(그림에서만).
import * as THREE from 'three';
import { N, CELL_M, NF, CW, SW, TRIBS, FLOW0, FLOW_GAP, FLOW_DUR, CONE } from './model.js';
import { gridIndex } from '../../shared/grid.js';

const C0 = (N - 1) / 2;
export const VE = 4; // 그림에서 높이를 키우는 배율. 계산 값은 그대로다.
export const worldY = z => (z * VE) / CELL_M;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
const lin = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ROCK_X = 64; // 이 x보다 왼쪽 기반암은 화강암, 오른쪽은 편마암

// 단면 색
export const COL = {
  granite: '#cdbfb2', gneiss: '#8f8a83', gravel: '#c7a873', basaltA: '#46423f', basaltB: '#524d49', crust: '#6a3e2e', sed: '#b9ae93',
  scoria: '#7a3322', soil: '#6b5236', water: 'rgba(58,128,190,0.9)', magma: '#e8642a', magmaHot: '#ffb347',
};
const HOT = ['#fff4b0', '#ffb030', '#f05a12', '#9a240a', '#2e1d16'].map(h => new THREE.Color(h));
function heatCss(u) {
  const f = clamp(u, 0, 0.999) * (HOT.length - 1), i = Math.floor(f), c = HOT[i].clone().lerp(HOT[i + 1], f - i);
  return `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
}

// 단면 하나(블록 옆면, 협곡 절벽, 진행상황의 단면)를 그린다. 그림의 가로는 표본 번호 t(0에서 n-1), 세로는 높이(m)다.
// line: { n, at(t) => [x, y] 칸 } 표본 자리. opt: { zTop, zBot, bg, top: [[t, z]] 위 윤곽, bot: [[t, z]] 아래 윤곽(절벽일 때) }
export function drawCut(ctx, W, H, model, line, opt) {
  const { n } = line, sx = W / (n - 1), sy = H / (opt.zTop - opt.zBot);
  const X = t => t * sx, Y = z => (opt.zTop - z) * sy;
  const zb = new Float32Array(n), zo = new Float32Array(n), sed = new Float32Array(n), cone = new Float32Array(n), heat = new Float32Array(n), xs = new Float32Array(n), wl = new Float32Array(n), cut = new Float32Array(n);
  const tops = [];
  for (let f = 0; f < NF; f++) tops.push(new Float32Array(n));
  const near = (arr, x, y) => arr[clamp(Math.round(y), 0, N - 1) * N + clamp(Math.round(x), 0, N - 1)];
  for (let t = 0; t < n; t++) {
    const [x, y] = line.at(t);
    xs[t] = x; zb[t] = model.bil(model.zb, x, y); zo[t] = model.bil(model.zo, x, y);
    for (let f = 0; f < NF; f++) tops[f][t] = model.bil(model.top[f], x, y);
    const s = near(model.sed, x, y); sed[t] = s > -1e8 ? s : -1e9;
    cone[t] = model.bil(model.cone, x, y); heat[t] = model.bil(model.heat, x, y);
    const w = near(model.wl, x, y); wl[t] = w > -1e8 ? w : -1e9;
    cut[t] = model.bil(model.zp, x, y) - model.bil(model.z, x, y);
  }
  const topLine = opt.top || Array.from({ length: n }, (_, t) => [t, model.sample(...line.at(t))]);
  const at = (arr, t) => { const a = clamp(t, 0, n - 1), i = Math.min(n - 2, Math.floor(a)), f = a - i; return arr[i] * (1 - f) + arr[i + 1] * f; };
  // 표본마다 윤곽 높이
  const topZ = new Float32Array(n);
  for (let t = 0, q = 0; t < n; t++) {
    while (q < topLine.length - 2 && topLine[q + 1][0] < t) q++;
    const [t0, z0] = topLine[q], [t1, z1] = topLine[Math.min(topLine.length - 1, q + 1)];
    topZ[t] = t1 > t0 ? z0 + (z1 - z0) * clamp((t - t0) / (t1 - t0)) : z0;
  }
  ctx.clearRect(0, 0, W, H);
  if (opt.bg) { ctx.fillStyle = opt.bg; ctx.fillRect(0, 0, W, H); }
  const lw = Math.max(1, W / 1400);
  // 물: 호수와 하천(윤곽 위에 그린다)
  ctx.fillStyle = COL.water;
  for (let t = 0; t < n; t++) {
    const tz = topZ[t];
    if (wl[t] > tz + 0.2) ctx.fillRect(X(t - 0.5), Y(wl[t]), sx + 1, Y(tz) - Y(wl[t]) + 1);
  }
  // 윤곽 안만 그린다.
  ctx.save();
  ctx.beginPath();
  if (opt.bot) { for (const [t, z] of opt.bot) ctx.lineTo(X(t), Y(z)); for (let q = topLine.length - 1; q >= 0; q--) ctx.lineTo(X(topLine[q][0]), Y(topLine[q][1])); }
  else { ctx.moveTo(-2, H + 2); for (const [t, z] of topLine) ctx.lineTo(X(t), Y(z)); ctx.lineTo(W + 2, H + 2); }
  ctx.closePath(); ctx.clip();
  // 기반암: 왼쪽은 화강암(알갱이 무늬), 오른쪽은 편마암(굽이진 줄무늬)
  ctx.fillStyle = COL.granite; ctx.fillRect(0, 0, W, H);
  for (let q = 0; q < 1600; q++) { const u = hash(q, 3), v = hash(q, 7), c = hash(q, 11); ctx.fillStyle = c < 0.45 ? 'rgba(60,52,48,0.42)' : c < 0.8 ? 'rgba(250,244,236,0.55)' : 'rgba(205,150,128,0.5)'; ctx.fillRect(u * W, v * H, 1.5 + c * 2 * lw, 1.5 + c * 2 * lw); }
  const gn = []; for (let t = 0; t < n; t++) if (xs[t] >= ROCK_X) gn.push(t);
  if (gn.length) {
    ctx.save(); ctx.beginPath();
    for (const t of gn) ctx.rect(X(t - 0.5), 0, sx + 1, H);
    ctx.clip();
    ctx.fillStyle = COL.gneiss; ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = Math.max(1.5, H / 160);
    for (let q = -10; q < 60; q++) {
      ctx.beginPath();
      for (let px = 0; px <= W; px += 6) { const zz = opt.zBot + q * 5 + px * 0.012 * (opt.zTop - opt.zBot) / 200 + 2.4 * Math.sin(px * 0.011 + q * 1.7); ctx.lineTo(px, Y(zz)); }
      ctx.strokeStyle = q % 3 ? 'rgba(84,79,73,0.55)' : 'rgba(198,192,182,0.55)'; ctx.stroke();
    }
    ctx.restore();
  }
  // 산지 겉의 흙(덮이지 않은 곳)
  ctx.beginPath();
  for (let t = 0; t < n; t++) ctx.lineTo(X(t), Y(zo[t]));
  for (let t = n - 1; t >= 0; t--) ctx.lineTo(X(t), Y(zo[t] - (zo[t] - zb[t] < 0.3 ? 3 : 0)));
  ctx.closePath(); ctx.fillStyle = COL.soil; ctx.fill();
  const band = (lo, hi) => { ctx.beginPath(); for (let t = 0; t < n; t++) ctx.lineTo(X(t), Y(hi(t))); for (let t = n - 1; t >= 0; t--) ctx.lineTo(X(t), Y(lo(t))); ctx.closePath(); };
  // 옛 하천 자갈층: 둥근 자갈과 모래, 비스듬한 층리
  band(t => zb[t], t => zo[t]); ctx.fillStyle = COL.gravel; ctx.fill();
  ctx.save(); band(t => zb[t], t => zo[t]); ctx.clip();
  const pr = Math.max(1.6, W / 900);
  for (let q = 0; q < 2400; q++) {
    const u = hash(q, 31), v = hash(q, 37), t = u * (n - 1), z = zb[Math.round(t)] + v * (zo[Math.round(t)] - zb[Math.round(t)]);
    if (zo[Math.round(t)] - zb[Math.round(t)] < 0.5) continue;
    const c = hash(q, 41), r = pr * (0.7 + 1.4 * hash(q, 43));
    ctx.beginPath(); ctx.ellipse(X(t), Y(z), r * 1.3, r, hash(q, 47) * 3, 0, 7);
    ctx.fillStyle = c < 0.35 ? '#8a8073' : c < 0.7 ? '#a69a86' : '#6c6358'; ctx.fill();
  }
  ctx.strokeStyle = 'rgba(120,90,50,0.45)'; ctx.lineWidth = lw;
  for (let q = 0; q < 50; q++) { const t = hash(q, 51) * (n - 1), z = zb[Math.round(t)] + hash(q, 53) * GRAV(zo, zb, t); ctx.beginPath(); ctx.moveTo(X(t), Y(z)); ctx.lineTo(X(t) + 26 * lw, Y(z) + 6 * lw); ctx.stroke(); }
  ctx.restore();
  // 용암층: 흐른 차례대로 쌓인다. 층 아래쪽은 붉게 구워진 거친 조각(클링커), 위쪽은 기포가 많은 부분이다.
  // 식은 층에는 아래쪽에 곧은 기둥(주상절리), 위쪽에 불규칙한 짧은 틈이 생긴다.
  const colW = opt.colPx || Math.max(5, W / 190);
  for (let f = 0; f < NF; f++) {
    const lo = f ? tops[f - 1] : zo, hi = tops[f];
    let any = false;
    for (let t = 0; t < n; t++) if (hi[t] - lo[t] > 0.2) { any = true; break; }
    if (!any) continue;
    const st = model.flowState(f);
    band(t => lo[t], t => hi[t]); ctx.fillStyle = f % 2 ? COL.basaltB : COL.basaltA; ctx.fill();
    ctx.save(); band(t => lo[t], t => hi[t]); ctx.clip();
    if (st === 'flow' || st === 'cool') {
      // 뜨거운 용암: 속은 밝고, 식어 가는 겉은 어둡다.
      for (let t = 0; t < n; t++) {
        const h = heat[t];
        if (h < 0.03 || hi[t] - lo[t] < 0.2) continue;
        ctx.globalAlpha = clamp(h * 1.8); ctx.fillStyle = heatCss(0.15 + (1 - h) * 0.75);
        ctx.fillRect(X(t - 0.5), Y(hi[t]), sx + 1, Y(lo[t]) - Y(hi[t]) + 1);
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.beginPath();
      const hl = new Path2D();
      // 층마다 따로: 층 바닥에서 위쪽 껍질 아래까지 끊기지 않고 이어진 세로 절리. 간격은 조금씩 다르다.
      let px = colW * (0.3 + 0.6 * hash(f, 77));
      while (px < W) {
        const t = px / sx, a = at(lo, t), b = at(hi, t), th = b - a;
        if (th >= 2.5) {
          const j1 = (hash(px, f + 3) - 0.5) * colW * 0.22, j2 = (hash(px + 1, f + 5) - 0.5) * colW * 0.22, ya = Y(a), yt = Y(b - th * 0.1);
          ctx.moveTo(px + j1, ya); ctx.lineTo(px + j2, yt);
          hl.moveTo(px + j1 + 1.3 * lw, ya); hl.lineTo(px + j2 + 1.3 * lw, yt);
        }
        px += colW * (0.75 + 0.5 * hash(px, f + 11));
      }
      ctx.strokeStyle = 'rgba(12,11,10,0.85)'; ctx.lineWidth = lw * 1.2; ctx.stroke();
      ctx.strokeStyle = 'rgba(118,114,108,0.3)'; ctx.lineWidth = lw; ctx.stroke(hl);
      // 위쪽의 얇고 거친 껍질(기포가 많은 부분)
      ctx.fillStyle = 'rgba(70,48,40,0.55)';
      for (let q = 0; q < 900; q++) {
        const t = hash(q, f + 61) * (n - 1), a = at(lo, t), b = at(hi, t);
        if (b - a < 2) continue;
        const z = b - (b - a) * 0.1 * hash(q, f + 67);
        ctx.fillRect(X(t), Y(z), 2 * lw, 1.6 * lw);
      }
    }
    ctx.restore();
    // 층 아래의 붉은 클링커 줄
    ctx.beginPath();
    let on = false;
    for (let t = 0; t < n; t++) { if (hi[t] - lo[t] > 1.2) { const y = Y(lo[t]); if (on) ctx.lineTo(X(t), y); else ctx.moveTo(X(t), y); on = true; } else on = false; }
    ctx.strokeStyle = st === 'flow' ? COL.magmaHot : COL.crust; ctx.lineWidth = Math.max(1.6, W / 700); ctx.stroke();
  }
  // 호수 바닥에 쌓인 고운 흙과 모래(얇은 줄무늬)
  const sedLo = t => zo[t], sedHi = t => Math.max(zo[t], sed[t]);
  band(sedLo, sedHi); ctx.fillStyle = COL.sed; ctx.fill();
  ctx.save(); band(sedLo, sedHi); ctx.clip();
  ctx.strokeStyle = 'rgba(110,98,78,0.45)'; ctx.lineWidth = lw;
  for (let z = Math.floor(opt.zBot); z < opt.zTop; z += 3) { ctx.beginPath(); ctx.moveTo(0, Y(z)); ctx.lineTo(W, Y(z)); ctx.stroke(); }
  ctx.restore();
  // 분석구(스코리아)
  const cBase = t => Math.max(tops[NF - 1][t], sed[t]);
  band(cBase, t => cBase(t) + Math.max(0, cone[t])); ctx.fillStyle = COL.scoria; ctx.fill();
  ctx.save(); band(cBase, t => cBase(t) + Math.max(0, cone[t])); ctx.clip();
  ctx.fillStyle = 'rgba(40,14,8,0.55)';
  for (let q = 0; q < 900; q++) ctx.fillRect(hash(q, 71) * W, hash(q, 73) * H, 2 * lw, 2 * lw);
  ctx.restore();
  ctx.restore();
  // 하천 물(협곡 바닥과 옛 물길)
  ctx.fillStyle = COL.water;
  for (let t = 0; t < n; t++) {
    const tz = topZ[t];
    if (cut[t] > 4 && !opt.bot) ctx.fillRect(X(t - 0.5), Y(tz + 1.6), sx + 1, Y(tz) - Y(tz + 1.6));
  }
  // 지표선
  ctx.beginPath(); for (const [t, z] of topLine) ctx.lineTo(X(t), Y(z));
  ctx.strokeStyle = 'rgba(25,22,20,0.9)'; ctx.lineWidth = Math.max(1.5, W / 700); ctx.stroke();
  return { X, Y, zb, zo, tops, sed, cone, top: topLine };
}
const GRAV = (zo, zb, t) => zo[Math.round(t)] - zb[Math.round(t)];

// 지표 무늬(숲의 나무갓, 굳은 용암 겉, 논)를 미리 그려 둔 판. 칸 하나에 PX 화소다.
const PX = 16, TEX = N * PX;
function forestPattern() {
  const cv = document.createElement('canvas'); cv.width = cv.height = TEX;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgb(58,86,46)'; ctx.fillRect(0, 0, TEX, TEX);
  for (let q = 0; q < 52000; q++) {
    const x = hash(q, 1) * TEX, y = hash(q, 2) * TEX, r = 2.2 + 3.6 * hash(q, 3), c = hash(q, 4);
    ctx.fillStyle = c < 0.3 ? 'rgba(36,60,30,0.9)' : c < 0.7 ? 'rgba(70,104,52,0.85)' : c < 0.9 ? 'rgba(92,124,64,0.8)' : 'rgba(118,128,70,0.75)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(160,190,110,0.18)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.45, 0, 7); ctx.fill();
  }
  return cv;
}
function lavaPattern() {
  // 굳은 현무암 겉: 거친 덩어리와 흐른 자국(밧줄 무늬), 작은 틈
  const cv = document.createElement('canvas'); cv.width = cv.height = TEX;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgb(44,44,46)'; ctx.fillRect(0, 0, TEX, TEX);
  for (let q = 0; q < 26000; q++) {
    const x = hash(q, 11) * TEX, y = hash(q, 12) * TEX, r = 1 + 3 * hash(q, 13), c = hash(q, 14);
    ctx.fillStyle = c < 0.5 ? 'rgba(30,28,27,0.8)' : c < 0.85 ? 'rgba(78,73,68,0.7)' : 'rgba(104,92,84,0.6)';
    ctx.fillRect(x, y, r * 1.6, r);
  }
  // 흐른 방향(골짜기 방향)으로 늘어난 주름
  ctx.lineWidth = 1;
  for (let q = 0; q < 9000; q++) {
    const x = hash(q, 21) * TEX, y = hash(q, 22) * TEX, l = 4 + 10 * hash(q, 23), b = (hash(q, 24) - 0.5) * 3;
    ctx.strokeStyle = hash(q, 25) < 0.5 ? 'rgba(20,19,18,0.55)' : 'rgba(96,90,84,0.4)';
    ctx.beginPath(); ctx.moveTo(x - 1, y); ctx.quadraticCurveTo(x + b, y + l / 2, x - 1, y + l); ctx.stroke();
  }
  return cv;
}
function paddyPattern() {
  // 논: 골짜기 방향으로 길쭉한 큰 논배미, 그 사이 논둑, 몇 배미마다 농로와 물길
  const cv = document.createElement('canvas'); cv.width = cv.height = TEX;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgb(146,154,104)'; ctx.fillRect(0, 0, TEX, TEX);
  const fw = PX * 4.2, fh = PX * 1.35, road = 3;
  const greens = ['#7b9a4a', '#86a352', '#6f9045', '#90a85a', '#9eab62', '#738f4a', '#a7a565'];
  for (let r = 0; r * fh < TEX; r++) {
    const off = (r % 2) * fw * 0.37;
    for (let c = -1; c * fw < TEX; c++) {
      const x = c * fw + off, y = r * fh, g = greens[Math.floor(hash(r, c) * greens.length)];
      ctx.fillStyle = g; ctx.fillRect(x + 1, y + 1, fw - 2, fh - 2);
      // 벼 줄
      ctx.strokeStyle = 'rgba(40,70,20,0.18)'; ctx.lineWidth = 1;
      for (let q = 4; q < fh - 3; q += 4) { ctx.beginPath(); ctx.moveTo(x + 2, y + q); ctx.lineTo(x + fw - 2, y + q); ctx.stroke(); }
    }
    if (r % 6 === 5) { ctx.fillStyle = 'rgb(176,170,140)'; ctx.fillRect(0, (r + 1) * fh - road / 2, TEX, road); }
  }
  ctx.strokeStyle = 'rgba(70,130,170,0.7)'; ctx.lineWidth = 2;
  for (let x = PX * 9; x < TEX; x += PX * 17) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, TEX); ctx.stroke(); }
  return cv;
}
// 용암 겉의 굳은 껍질 사이로 빛나는 틈(보로노이 무늬). 그림에만 쓰는 무늬다.
function crackTexture() {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(S, S), pts = [];
  for (let q = 0; q < 42; q++) pts.push([hash(q, 81) * S, hash(q, 83) * S]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let d1 = 1e9, d2 = 1e9;
    for (const [px, py] of pts) for (let ox = -S; ox <= S; ox += S) for (let oy = -S; oy <= S; oy += S) {
      const dx = x - px - ox, dy = y - py - oy, d = dx * dx + dy * dy;
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    const e = Math.sqrt(d2) - Math.sqrt(d1), v = 0.08 + 0.92 * Math.exp(-e * e / 5) + 0.06 * hash(x, y);
    const k = (y * S + x) * 4;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = Math.round(clamp(v) * 255); img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(34, 34);
  return tex;
}
// 주상절리 기둥 겉 무늬: 세로 결과 풍화된 얼룩. 위아래와 옆으로 이어 붙는다.
function basaltTexture() {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgb(188,188,186)'; ctx.fillRect(0, 0, S, S);
  for (let q = 0; q < 900; q++) { const x = hash(q, 101) * S, y = hash(q, 102) * S, c = hash(q, 103); ctx.fillStyle = c < 0.5 ? 'rgba(90,86,82,0.35)' : 'rgba(210,206,198,0.3)'; ctx.fillRect(x, y, 1 + 2 * c, 3 + 10 * hash(q, 104)); }
  // 가로 마디: 기둥 하나에 몇 개, 조금 비스듬하고 고르지 않다.
  // 세로 가는 금
  ctx.strokeStyle = 'rgba(40,38,36,0.35)'; ctx.lineWidth = 1;
  for (let q = 0; q < 10; q++) { const x = hash(q, 107) * S; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (hash(q, 108) - 0.5) * 6, S); ctx.stroke(); }
  // 지의류와 물 얼룩
  for (let q = 0; q < 40; q++) { ctx.fillStyle = hash(q, 109) < 0.5 ? 'rgba(150,150,120,0.25)' : 'rgba(60,56,50,0.25)'; ctx.beginPath(); ctx.ellipse(hash(q, 110) * S, hash(q, 111) * S, 4 + 10 * hash(q, 112), 8 + 20 * hash(q, 113), 0, 0, 7); ctx.fill(); }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

// 폭포 물줄기 무늬: 흰 줄이 아래로 흐른다.
function fallTexture() {
  const W = 64, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  for (let q = 0; q < 140; q++) {
    const x = hash(q, 91) * W, y = hash(q, 92) * H, l = 30 + 90 * hash(q, 93), a = 0.35 + 0.5 * hash(q, 94);
    const g = ctx.createLinearGradient(0, y, 0, y + l);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.4, `rgba(248,252,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, 1.5 + 2.5 * hash(q, 95), l);
    ctx.fillStyle = g; ctx.fillRect(x, y - H, 1.5 + 2.5 * hash(q, 95), l);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createBlock(model, { quality = 1 } = {}) {
  const group = new THREE.Group();
  const P = {
    forest: lin('#3f5f33'), forest2: lin('#527342'), meadow: lin('#94a35f'), meadow2: lin('#7f9556'), bar: lin('#b9ad95'),
    fresh: lin('#211f1e'), cool: lin('#3a3734'), talus: lin('#77716b'), grass: lin('#8a9c58'), grass2: lin('#9aa863'), sed: lin('#a99c7b'),
    scoria: lin('#3b2a25'), scoriaRed: lin('#6e3324'), scoriaOld: lin('#5f7a3c'), floor: lin('#8a8478'), rock: lin('#6e6963'),
  };
  const size = N * N;
  const pos = new Float32Array(size * 3), nor = new Float32Array(size * 3), col = new Float32Array(size * 3), glow = new Float32Array(size * 3), uv = new Float32Array(size * 2);
  const speckle = new Float32Array(size), patch = new Float32Array(size);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    pos[k * 3] = i - C0; pos[k * 3 + 2] = j - C0;
    uv[k * 2] = i / (N - 1); uv[k * 2 + 1] = 1 - j / (N - 1);
    speckle[k] = 0.94 + hash(i, j) * 0.12;
    patch[k] = Math.sin(i * 0.21 + 1) * Math.sin(j * 0.17) * 0.5 + 0.5 + Math.sin(i * 0.53 + j * 0.37) * 0.15;
  }
  const index = new THREE.BufferAttribute(gridIndex(N), 1), posAttr = new THREE.BufferAttribute(pos, 3), uvAttr = new THREE.BufferAttribute(uv, 2);
  // 땅의 삼각형 목록. 협곡 절벽에 걸친 칸은 절벽 띠가 대신 덮으므로, 대지 쪽 점끼리나 바닥 쪽 점끼리만 잇는다.
  const tIndex = new THREE.BufferAttribute(gridIndex(N), 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', posAttr); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('uv', uvAttr);
  geo.setIndex(tIndex);
  // 지표 무늬판: 무늬의 알파만큼 땅 색을 무늬 색으로 바꾼다(곱하지 않는다).
  const over = document.createElement('canvas'); over.width = over.height = TEX;
  const octx = over.getContext('2d');
  const overTex = new THREE.CanvasTexture(over);
  overTex.colorSpace = THREE.SRGBColorSpace; overTex.anisotropy = 8;
  const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, map: overTex });
  terrainMat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '').replace('#include <color_fragment>', `
      diffuseColor.rgb *= vColor;
      #ifdef USE_MAP
        vec4 overC = texture2D( map, vMapUv );
        diffuseColor.rgb = mix( diffuseColor.rgb, overC.rgb, overC.a );
      #endif`);
  };
  const terrain = new THREE.Mesh(geo, terrainMat);
  terrain.castShadow = terrain.receiveShadow = true; terrain.frustumCulled = false;
  group.add(terrain);
  // 뜨거운 용암의 불빛: 같은 땅 모양 위에 더해 칠한다. 굳은 껍질 사이의 틈이 더 밝다.
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', posAttr); glowGeo.setAttribute('color', new THREE.BufferAttribute(glow, 3)); glowGeo.setAttribute('uv', uvAttr);
  glowGeo.setIndex(tIndex);
  const glowMesh = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ vertexColors: true, map: crackTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  glowMesh.frustumCulled = false; glowMesh.renderOrder = 2;
  group.add(glowMesh);

  const pats = { forest: forestPattern(), lava: lavaPattern(), paddy: paddyPattern() };
  const maskCv = document.createElement('canvas'); maskCv.width = maskCv.height = N;
  const mctx = maskCv.getContext('2d'), mimg = mctx.createImageData(N, N);
  const layerCv = document.createElement('canvas'); layerCv.width = layerCv.height = TEX;
  const lctx = layerCv.getContext('2d');
  function stamp(pattern, alphaOf, gAlpha) {
    for (let k = 0; k < size; k++) { const a = alphaOf(k); mimg.data[k * 4 + 3] = Math.round(clamp(a) * 255); }
    mctx.putImageData(mimg, 0, 0);
    lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, TEX, TEX);
    lctx.drawImage(pattern, 0, 0);
    lctx.globalCompositeOperation = 'destination-in'; lctx.imageSmoothingEnabled = true;
    // 칸의 가운데가 그림 점에 오도록 반 칸 옮겨 늘린다.
    const s = TEX / (N - 1);
    lctx.drawImage(maskCv, 0, 0, N, N, -s / 2, -s / 2, N * s, N * s);
    octx.globalAlpha = gAlpha; octx.drawImage(layerCv, 0, 0); octx.globalAlpha = 1;
  }
  let overKey = '';
  function syncOverlay(force) {
    const { lava, z, zp, zo, sed, cone } = model, veg = model.vegFrac(), pad = model.paddyFrac();
    let covered = 0;
    for (let k = 0; k < size; k += 7) if (lava[k] > 0.5) covered++;
    const key = `${model.options.visc}:${model.options.volume}:${Math.round(covered / 40)}:${Math.round(veg * 4)}:${Math.round(pad * 6)}:${Math.round(model.lakeFill() * 4)}:${Math.round(model.coneGrow() * 3)}:${Math.round(model.incision() * 10)}`;
    if (!force && key === overKey) return;
    overKey = key;
    octx.clearRect(0, 0, TEX, TEX);
    const isFloor = k => { const i = k % N, j = (k / N) | 0; return i >= model.xa[j] - 0.5 && i <= model.xb[j] + 0.5; };
    const canyonish = k => zp[k] - z[k] > 2;
    // 숲: 덮이지 않은 산지
    const hill = k => !isFloor(k) || zo[k] > model.fl[(k / N) | 0] + 12;
    stamp(pats.forest, k => (lava[k] < 0.5 && sed[k] < -1e8 && cone[k] < 1 && hill(k) ? 0.85 : 0) + (cone[k] > 1 ? 0.7 * smooth(0.6, 1, veg) : 0), 1);
    // 굳은 용암 겉: 풀이 덮기 전까지
    // 가파른 가장자리는 돌무더기(땅 색)가 보이도록 무늬를 옅게 한다.
    const steep = k => { const i = k % N, j = (k / N) | 0; if (i < 1 || j < 1 || i > N - 2 || j > N - 2) return 0; const sx = (z[k + 1] - z[k - 1]) / (2 * CELL_M), sy = (z[k + N] - z[k - N]) / (2 * CELL_M); return smooth(0.25, 0.9, Math.sqrt(sx * sx + sy * sy)); };
    stamp(pats.lava, k => (lava[k] > 0.5 && cone[k] < 1 && !canyonish(k) ? 0.75 * (1 - veg) * (1 - 0.8 * steep(k)) : 0), 1);
    // 논: 평평한 대지와 메워진 호수, 남은 골짜기 바닥
    if (pad > 0.02) {
      stamp(pats.paddy, k => {
        const i = k % N, j = (k / N) | 0;
        if (i < 1 || j < 1 || i > N - 2 || j > N - 2 || canyonish(k) || cone[k] > 0.5) return 0;
        const sx = (z[k + 1] - z[k - 1]) / (2 * CELL_M), sy = (z[k + N] - z[k - N]) / (2 * CELL_M);
        if (sx * sx + sy * sy > 0.03 * 0.03) return 0;
        // 협곡 가장자리 한 칸은 비워 둔다.
        if (canyonish(k - 1) || canyonish(k + 1) || canyonish(k - 2) || canyonish(k + 2)) return 0;
        const flat = lava[k] > 2 || sed[k] > -1e8 || isFloor(k);
        return flat ? 1 : 0;
      }, pad);
    }
    overTex.needsUpdate = true;
  }

  // 옆면 넷. 앞면(y = N - 1)이 골짜기를 가로지르는 단면이다.
  const F = N - 1;
  const faces = [
    { name: 'front', at: t => [t, F], vert: i => F * N + i, tOf: (x) => x, w: 2048 },
    { name: 'right', at: t => [F, F - t], vert: i => (F - i) * N + F, tOf: (x, y) => F - y, w: 1024 },
    { name: 'back', at: t => [F - t, 0], vert: i => F - i, tOf: (x) => F - x, w: 1024 },
    { name: 'left', at: t => [0, t], vert: i => i * N, tOf: (x, y) => y, w: 1024 },
  ];
  const zBot = model.bottom, zTop = model.top0 + 6;
  const ribbonMat = (tex, lit) => lit
    ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.28, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
    : new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  function makeStrip(maxPts, cw, ch, lit) {
    const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const g = new THREE.BufferGeometry(), p = new Float32Array(maxPts * 2 * 3), u = new Float32Array(maxPts * 2 * 2), idx = [];
    for (let t = 0; t < maxPts - 1; t++) { const a = t * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.BufferAttribute(u, 2));
    if (lit) g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(maxPts * 2 * 3), 3));
    const mesh = new THREE.Mesh(g, ribbonMat(tex, lit));
    mesh.frustumCulled = false; mesh.receiveShadow = !!lit;
    group.add(mesh);
    return { canvas, ctx: canvas.getContext('2d'), tex, g, mesh, maxPts };
  }
  for (const f of faces) Object.assign(f, makeStrip(N, f.w, 512, false));
  // 협곡 절벽(왼쪽, 오른쪽)과 폭포가 판 좁은 골짜기의 벽
  const walls = [makeStrip(N, 2048, 256, true), makeStrip(N, 2048, 256, true)];
  const slotWalls = TRIBS.map(() => [makeStrip(24, 512, 256, true), makeStrip(24, 512, 256, true), makeStrip(8, 256, 256, true)]);

  // 협곡 절벽의 주상절리: 용암층마다 따로 선 다각형 기둥을 실제 모양(면)으로 세운다.
  // 기둥 하나는 가운데가 협곡 쪽으로 튀어나온 두 면으로 만들어, 해를 받는 면과 그늘진 면이 세로로 번갈아 보인다.
  // 층마다 기둥 너비와 자리가 다르고, 층 위쪽에는 거칠게 부서진 얇은 껍질(클링커)이 있다.
  // 절벽 꼭대기에는 부러져 나간 기둥이 있고, 절벽 발치에는 떨어진 돌무더기(애추)와 쓰러진 기둥 토막이 쌓인다.
  // 기둥은 잘 보이게 실제(지름 1m 안팎)보다 훨씬 굵게 그린다. 그림에만 쓰는 모양이라 계산 값과 상관없다.
  const basaltTex = basaltTexture();
  const colMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: basaltTex, flatShading: true, roughness: 0.88, side: THREE.DoubleSide, emissive: 0x161514 });
  const fallenMax = 160;
  const fallen = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.17, 0.17, 1, 6, 1), new THREE.MeshStandardMaterial({ color: 0x3f3d3a, roughness: 0.9, flatShading: true }), fallenMax);
  fallen.castShadow = true; fallen.receiveShadow = true; fallen.frustumCulled = false; fallen.count = 0;
  group.add(fallen);
  const COLS = { gneiss: lin('#7a746c'), granite: lin('#a99d90'), col: lin('#5f5d5a'), col2: lin('#54524f'), crust: lin('#6e564b'), crust2: lin('#84675a'), gravel: lin('#b39a6d'), gravel2: lin('#8f8070'), talus: lin('#8b857d'), talus2: lin('#a29b91') };
  function makeColumnWall() {
    const g = new THREE.BufferGeometry();
    const mesh = new THREE.Mesh(g, colMat);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    group.add(mesh);
    let cap = 0;
    return { mesh, g, set(P, C, U, n) {
      if (!n) { mesh.visible = false; return; }
      if (n * 3 > cap) {
        cap = Math.ceil(n * 3 * 1.3);
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cap * 3), 3));
        g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cap * 3), 3));
        g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(cap * 2), 2));
      }
      g.attributes.position.array.set(P.subarray(0, n * 9)); g.attributes.color.array.set(C.subarray(0, n * 9)); g.attributes.uv.array.set(U.subarray(0, n * 6));
      g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.uv.needsUpdate = true;
      g.setDrawRange(0, n * 3); g.computeVertexNormals();
      mesh.visible = n > 0;
    } };
  }
  const colWalls = [makeColumnWall(), makeColumnWall()];
  let bP = new Float32Array(9 * 30000), bC = new Float32Array(9 * 30000), bU = new Float32Array(6 * 30000);
  let colSig = '';
  // pts: 행마다 { x: 절벽 줄, y, top, bot, open(폭포 골짜기 입구라 벽이 없음) }
  function syncColumns(wallPts) {
    let sig = model.options.visc + model.options.volume;
    for (const pts of wallPts) for (let j = 0; j < N; j += 4) sig += `${pts[j].top.toFixed(1)},${pts[j].bot.toFixed(1)};`;
    if (sig === colSig) return;
    colSig = sig;
    const fm = [];
    wallPts.forEach((pts, w) => {
      const side = w ? 1 : -1, out = -side; // 협곡 쪽(바깥) 방향
      let n = 0;
      const ensure = add => {
        if ((n + add) * 9 <= bP.length) return;
        const grow = (a, m) => { const b = new Float32Array(Math.ceil(a.length * 1.6 / m) * m); b.set(a); return b; };
        bP = grow(bP, 9); bC = grow(bC, 9); bU = grow(bU, 6);
      };
      // 벽 줄을 따라 s(행 단위, 소수)에서의 값
      const lerpPt = s => {
        const j = Math.max(0, Math.min(N - 2, Math.floor(s))), f = s - j, a = pts[j], b = pts[j + 1];
        return { x: a.x + (b.x - a.x) * f, top: a.top + (b.top - a.top) * f, bot: a.bot + (b.bot - a.bot) * f, open: a.open || b.open };
      };
      const V = (s, d, zm, c, u, v) => {
        const q = lerpPt(s);
        const k = n * 3 + V.c;
        bP[k * 3] = q.x + out * d - C0; bP[k * 3 + 1] = worldY(zm); bP[k * 3 + 2] = s - C0;
        bC[k * 3] = c[0]; bC[k * 3 + 1] = c[1]; bC[k * 3 + 2] = c[2];
        bU[k * 2] = u; bU[k * 2 + 1] = v;
        V.c++;
      };
      V.c = 0;
      const tri = (a, b, c) => { ensure(1); V.c = 0; V(...a); V(...b); V(...c); n++; };
      // 네 점(왼아래, 오른아래, 오른위, 왼위)으로 된 면
      const quad = (s0, d0, s1, d1, lo0, hi0, lo1, hi1, c, u0, u1) => {
        const vo = (u0 * 0.731) % 1;
        tri([s0, d0, lo0, c, u0, lo0 / 22 + vo], [s1, d1, lo1, c, u1, lo1 / 22 + vo], [s1, d1, hi1, c, u1, hi1 / 22 + vo]);
        tri([s0, d0, lo0, c, u0, lo0 / 22 + vo], [s1, d1, hi1, c, u1, hi1 / 22 + vo], [s0, d0, hi0, c, u0, hi0 / 22 + vo]);
      };
      const shade = (c, t) => [c[0] * t, c[1] * t, c[2] * t];
      // 층 경계 높이(용암층 윗면). 절벽 줄의 대지 쪽에서 잰다.
      const layerTop = (f, s) => { const q = lerpPt(s); return model.bil(model.top[f], q.x + side * 0.6, s); };
      const oldTop = s => { const q = lerpPt(s); return model.bil(model.zo, q.x + side * 0.6, s); };
      const live = s => { const q = lerpPt(s); return !q.open && q.top - q.bot > 3; };
      // 옛 기반암(대지 가장자리에서 협곡이 옛 산지를 파고든 곳)과 옛 하천 자갈층. 기반암은 각진 덩어리, 자갈층은 둥근 자갈이 박힌 띠.
      const rockTop = s => { const q = lerpPt(s); return model.bil(model.zb, q.x + side * 0.6, s); };
      const rockCol = mix(lerpPt(64).x >= 64 ? COLS.gneiss : COLS.granite, COLS.gneiss, 0);
      for (let s = 0; s < N - 1.01; s += 0.5) {
        if (!live(s) || !live(s + 0.5)) continue;
        const a = lerpPt(s), b = lerpPt(s + 0.5);
        const r0 = Math.min(a.top, rockTop(s)), r1 = Math.min(b.top, rockTop(s + 0.5));
        if (r0 > a.bot + 0.3 || r1 > b.bot + 0.3) {
          // 굵은 덩어리로 갈라진 바위: 두 단으로 나누어 들쭉날쭉하게
          const m0 = a.bot + (Math.max(a.bot, r0) - a.bot) * (0.4 + 0.2 * hash(s, 9)), m1 = b.bot + (Math.max(b.bot, r1) - b.bot) * (0.4 + 0.2 * hash(s + 0.5, 9));
          const c = shade(rockCol, 0.85 + 0.3 * hash(s * 3, 8));
          quad(s, 0.04 + 0.1 * hash(s, 11), s + 0.5, 0.04 + 0.1 * hash(s + 0.5, 11), a.bot, m0, b.bot, m1, c, s, s + 0.5);
          quad(s, 0.02 + 0.12 * hash(s, 13), s + 0.5, 0.02 + 0.12 * hash(s + 0.5, 13), m0, Math.max(a.bot, r0), m1, Math.max(b.bot, r1), shade(c, 0.92), s, s + 0.5);
        }
        const g0 = Math.max(a.bot, rockTop(s)), g1 = Math.max(b.bot, rockTop(s + 0.5));
        const h0 = Math.min(a.top, oldTop(s)), h1 = Math.min(b.top, oldTop(s + 0.5));
        if (h0 <= g0 + 0.3 && h1 <= g1 + 0.3) continue;
        const d0 = 0.02 + 0.05 * hash(s * 7, 3), d1 = 0.02 + 0.05 * hash((s + 0.5) * 7, 3);
        quad(s, d0, s + 0.5, d1, g0, Math.max(g0, h0), g1, Math.max(g1, h1), mix(COLS.gravel, COLS.gravel2, hash(s, 5) * 0.6), s, s + 0.5);
      }
      for (let f = 0; f < NF; f++) {
        // 기둥 경계: 층마다 다르게
        let s = hash(f, w + 7) * 0.6, idx = 0;
        while (s < N - 1.2) {
          const wdt = 0.55 + 0.45 * hash(f * 131 + idx, w + 11), s1 = Math.min(N - 1.01, s + wdt), m = s + wdt * (0.38 + 0.24 * hash(idx, f + 3));
          idx++;
          if (!live(s) || !live(s1) || !live(m)) { s = s1; continue; }
          const lo = t => Math.max(lerpPt(t).bot, f ? layerTop(f - 1, t) : oldTop(t)), hi = t => Math.min(lerpPt(t).top, layerTop(f, t));
          const th = hi(m) - lo(m);
          if (th < 2.5) { s = s1; continue; }
          const crust = Math.min(4, 0.16 * th);
          // 절벽 꼭대기에서는 몇몇 기둥이 부러져 나가 짧다.
          const topBand = hi(m) >= lerpPt(m).top - 0.5;
          const brk = topBand && hash(idx, f * 7 + w) < 0.3 ? 2 + 7 * hash(idx + 5, f) : 0;
          const colTop = t => Math.max(lo(t) + 1, hi(t) - crust - brk);
          const p = 0.22 + 0.1 * hash(idx, f + 17), tone = 0.82 + 0.3 * hash(idx * 3, f + w), cc = shade(mix(COLS.col, COLS.col2, (f % 2) * 0.7), tone);
          // 왼쪽 면과 오른쪽 면(가운데가 튀어나온 기둥)
          // 기둥마다 무늬 자리를 달리해 같은 무늬가 되풀이되지 않게 한다.
          const uo = hash(idx, f + 29) * 7;
          quad(s, 0, m, p, lo(s), colTop(s), lo(m), colTop(m), cc, uo, uo + 0.45);
          quad(m, p, s1, 0, lo(m), colTop(m), lo(s1), colTop(s1), shade(cc, 0.97), uo + 0.45, uo + 0.9);
          // 부러진 기둥의 윗면(평평한 자른 면)
          if (brk > 0) {
            tri([s, 0, colTop(s), shade(cc, 1.1), 0, 0], [m, p, colTop(m), shade(cc, 1.1), 0.5, 0], [s1, 0, colTop(s1), shade(cc, 1.1), 1, 0]);
            if (fm.length < fallenMax) fm.push({ w, s: m, d: 0.4 + 0.5 * hash(idx, 41), z: lerpPt(m).bot, a: hash(idx, 43) });
          }
          s = s1;
        }
        // 층 위쪽의 거친 껍질: 잘게 울퉁불퉁한 띠(조금 들어가 있다)
        for (let t = 0; t < N - 1.01; t += 0.35) {
          const t1 = Math.min(N - 1.01, t + 0.35);
          if (!live(t) || !live(t1)) continue;
          const hiA = Math.min(lerpPt(t).top, layerTop(f, t)), hiB = Math.min(lerpPt(t1).top, layerTop(f, t1));
          const loA = Math.max(lerpPt(t).bot, f ? layerTop(f - 1, t) : oldTop(t)), loB = Math.max(lerpPt(t1).bot, f ? layerTop(f - 1, t1) : oldTop(t1));
          if (hiA - loA < 2.5) continue;
          const cA = hiA - Math.min(4, 0.16 * (hiA - loA)), cB = hiB - Math.min(4, 0.16 * (hiB - loB));
          const r = hash(t * 13, f + 23), c = shade(mix(COLS.crust, COLS.crust2, r), 0.85 + 0.3 * hash(t, f));
          quad(t, 0.02 + 0.07 * r, t1, 0.02 + 0.07 * hash(t1 * 13, f + 23), cA, hiA, cB, hiB, c, t, t1);
        }
      }
      // 절벽 발치의 돌무더기(애추): 군데군데 원뿔처럼 쌓여, 그 사이로 자갈층이 보인다.
      for (let s = 1; s < N - 3; s += 2.5) {
        if (hash(s, w + 61) < 0.45) continue;
        const L = 1.6 + 1.6 * hash(s, w + 63), mid = s + L / 2, q = lerpPt(mid);
        if (!live(s) || !live(s + L) || !live(mid) || q.top - q.bot < 12) continue;
        const ht = Math.min(16, 0.2 * (q.top - q.bot)) * (0.7 + 0.5 * hash(s, 65)), reach = 0.55 + 0.35 * hash(s, 67);
        const steps = 6;
        for (let a = 0; a < steps; a++) {
          const u0 = a / steps, u1 = (a + 1) / steps, e0 = Math.sin(u0 * Math.PI), e1 = Math.sin(u1 * Math.PI);
          const sA = s + L * u0, sB = s + L * u1, bA = lerpPt(sA).bot + 0.6, bB = lerpPt(sB).bot + 0.6;
          const c = mix(COLS.talus, COLS.talus2, hash(a, s));
          // 벽 쪽 꼭대기 줄과 바닥 쪽 끝 줄
          tri([sA, 0.05, bA + ht * e0, c, 0, 0], [sB, 0.05, bB + ht * e1, c, 1, 0], [sB, 0.05 + reach * e1 + 0.05, bB, shade(c, 0.9), 1, 1]);
          tri([sA, 0.05, bA + ht * e0, c, 0, 0], [sB, 0.05 + reach * e1 + 0.05, bB, shade(c, 0.9), 1, 1], [sA, 0.05 + reach * e0 + 0.05, bA, shade(c, 0.9), 0, 1]);
        }
        for (let b = 0; b < 2 && fm.length < fallenMax; b++) fm.push({ w, s: s + L * (0.25 + 0.5 * hash(s, b + 70)), d: 0.25 + 0.35 * hash(s, b + 72), z: q.bot + ht * 0.3, a: hash(s, b + 74) });
      }
      colWalls[w].set(bP, bC, bU, n);
    });
    // 쓰러진 기둥 토막
    const m4b = new THREE.Matrix4(), qb = new THREE.Quaternion(), eb = new THREE.Euler(), sb = new THREE.Vector3(), pb = new THREE.Vector3();
    fm.forEach((b, i) => {
      const side = b.w ? 1 : -1, pts = wallPts[b.w], j = Math.max(0, Math.min(N - 2, Math.floor(b.s))), f = b.s - j, x = pts[j].x + (pts[j + 1].x - pts[j].x) * f;
      eb.set(Math.PI / 2 + (b.a - 0.5) * 0.6, b.a * 3, (b.a - 0.5) * 0.8);
      m4b.compose(pb.set(x - side * b.d - C0, worldY(b.z) + 0.15, b.s - C0), qb.setFromEuler(eb), sb.set(1, 0.6 + 0.8 * b.a, 1));
      fallen.setMatrixAt(i, m4b);
    });
    fallen.count = fm.length; fallen.instanceMatrix.needsUpdate = true;
  }

  // 그린 자리(격자 점을 절벽 자리로 옮긴 것)
  const dx = new Float32Array(size);
  const wx = k => (k % N) + dx[k], wz = k => (k / N) | 0;
  function syncShift() {
    dx.fill(0);
    const slots = model.slots();
    for (let j = 0; j < N; j++) {
      const xL = model.xc[j] - CW, xR = model.xc[j] + CW;
      const sL = slots.find(s => TRIBS[s.ti].side < 0 && Math.abs(j - s.y) < SW), sR = slots.find(s => TRIBS[s.ti].side > 0 && Math.abs(j - s.y) < SW);
      if (!sL) { const iL = Math.floor(xL) + 1; dx[j * N + iL] = xL + 0.03 - iL; dx[j * N + iL - 1] = xL - 0.03 - (iL - 1); }
      if (!sR) { const iR = Math.ceil(xR) - 1; dx[j * N + iR] = xR - 0.03 - iR; dx[j * N + iR + 1] = xR + 0.03 - (iR + 1); }
    }
    for (const s of slots) {
      const side = TRIBS[s.ti].side;
      for (let j = Math.ceil(s.y - SW); j <= Math.floor(s.y + SW); j++) {
        if (Math.abs(j - s.y) >= SW) continue;
        if (side < 0) { const ih = Math.floor(s.xh) + 1; dx[j * N + ih] = s.xh + 0.03 - ih; dx[j * N + ih - 1] = s.xh - 0.03 - (ih - 1); }
        else { const ih = Math.ceil(s.xh) - 1; dx[j * N + ih] = s.xh - 0.03 - ih; dx[j * N + ih + 1] = s.xh + 0.03 - (ih + 1); }
      }
    }
  }
  // 띠 하나를 점들({x, y, top, bot})로 세우고 단면 그림을 붙인다.
  function setStrip(S, pts, lit) {
    const p = S.g.attributes.position, u = S.g.attributes.uv, n = pts.length;
    if (n < 2) { S.mesh.visible = false; return; }
    S.mesh.visible = true;
    let hi = -1e9, lo = 1e9;
    for (const q of pts) { hi = Math.max(hi, q.top); lo = Math.min(lo, q.bot); }
    if (hi - lo < 0.5) { S.mesh.visible = false; return; }
    const zt = hi + 1, zbm = lo - 1;
    for (let t = 0; t < S.maxPts; t++) {
      const q = pts[Math.min(t, n - 1)];
      p.setXYZ(t * 2, (q.tx ?? q.x) - C0, worldY(q.top), (q.ty ?? q.y) - C0); p.setXYZ(t * 2 + 1, (q.bx ?? q.x) - C0, worldY(q.bot), (q.by ?? q.y) - C0);
      const uu = Math.min(t, n - 1) / (n - 1);
      u.setXY(t * 2, uu, (q.top - zbm) / (zt - zbm)); u.setXY(t * 2 + 1, uu, (q.bot - zbm) / (zt - zbm));
    }
    p.needsUpdate = true; u.needsUpdate = true;
    if (lit) S.g.computeVertexNormals();
    S.g.setDrawRange(0, (n - 1) * 6);
    // 그림이 바뀔 때만 다시 그린다.
    let sig = n * 7 + model.flowsStarted() * 1000;
    for (const q of pts) sig += q.top * 1.3 + q.bot * 2.1 + q.x * 0.7;
    if (sig === S.sig) return;
    S.sig = sig;
    drawCut(S.ctx, S.canvas.width, S.canvas.height, model, { n, at: t => [pts[t].x, pts[t].y] }, { zTop: zt, zBot: zbm, top: pts.map((q, t) => [t, q.top]), bot: pts.map((q, t) => [t, q.bot]), colPx: Math.max(4, S.canvas.width / ((n - 1) * 2.4)) });
    S.tex.needsUpdate = true;
  }
  function syncFaces() {
    for (const f of faces) {
      const p = f.g.attributes.position, u = f.g.attributes.uv, outline = [];
      for (let i = 0; i < N; i++) {
        const k = f.vert(i), x = wx(k), y = wz(k), h = model.z[k], t = f.tOf(x, y);
        p.setXYZ(i * 2, x - C0, worldY(h), y - C0); p.setXYZ(i * 2 + 1, x - C0, worldY(zBot), y - C0);
        u.setXY(i * 2, t / (N - 1), (h - zBot) / (zTop - zBot)); u.setXY(i * 2 + 1, t / (N - 1), 0);
        outline.push([t, h]);
      }
      outline.sort((a, b) => a[0] - b[0]);
      p.needsUpdate = true; u.needsUpdate = true;
      let sig = model.flowsStarted() * 1000;
      for (let i = 0; i < N; i += 1) { const k = f.vert(i); sig += model.z[k] + model.top[NF - 1][k] * 1.7 + model.heat[k] * 31 + model.cone[k] * 0.7 + (model.sed[k] > -1e8 ? model.sed[k] * 0.3 : 0) + model.wl[k] * 1e-9; }
      if (sig === f.sig) continue;
      f.sig = sig;
      drawCut(f.ctx, f.canvas.width, f.canvas.height, model, { n: N, at: f.at }, { zTop, zBot, top: outline });
      f.tex.needsUpdate = true;
    }
    // 협곡 절벽: 행마다 대지 쪽 점(위)과 바닥 쪽 점(아래)
    const slots = model.slots();
    // 뒤판(단면 그림을 붙인 평평한 벽)은 절벽 줄보다 조금 대지 쪽에 두고, 그 앞에 주상절리 기둥을 세운다.
    const wallPts = [-1, 1].map((side, w) => {
      const pts = [];
      for (let j = 0; j < N; j++) {
        const xw = model.xc[j] + side * CW;
        const inSlot = slots.some(s => TRIBS[s.ti].side === side && Math.abs(j - s.y) < SW + 0.8);
        const iF = side < 0 ? Math.floor(xw) + 1 : Math.ceil(xw) - 1, iP = iF + side, kF = j * N + iF, kP = j * N + iP;
        const top = inSlot ? model.z[kF] : model.z[kP], bot = model.z[kF];
        pts.push({ x: xw, y: j, top, bot, open: inSlot, tx: inSlot ? xw : xw + side * 0.12, bx: inSlot ? xw : xw + side * 0.12 });
      }
      setStrip(walls[w], pts, true);
      return pts;
    });
    syncColumns(wallPts);
    // 폭포가 판 좁은 골짜기: 양옆 벽과 폭포 벽
    TRIBS.forEach((tr, ti) => {
      const s = slots.find(q => q.ti === ti), [A, B, Hd] = slotWalls[ti];
      if (!s) { A.mesh.visible = B.mesh.visible = Hd.mesh.visible = false; return; }
      const side = tr.side, xs = [];
      if (side < 0) for (let i = Math.floor(s.xh) + 1; i <= Math.floor(s.xw) && xs.length < 24; i++) xs.push(i);
      else for (let i = Math.ceil(s.xh) - 1; i >= Math.ceil(s.xw) && xs.length < 24; i--) xs.push(i);
      xs.sort((a, b) => a - b);
      [[-1, A], [1, B]].forEach(([d, S]) => {
        const jF = s.y + d, jP = s.y + 2 * d, pts = xs.map(i => ({ x: i, y: s.y + d * SW, top: model.z[jP * N + i], bot: model.z[jF * N + i], tx: wx(jP * N + i), ty: jP, bx: wx(jF * N + i), by: jF }));
        setStrip(S, pts, true);
      });
      const hp = [];
      for (let j = s.y - 1; j <= s.y + 1; j++) {
        const ih = side < 0 ? Math.floor(s.xh) + 1 : Math.ceil(s.xh) - 1, kF = j * N + ih, kP = kF + side;
        hp.push({ x: s.xh, y: j, top: model.z[kP], bot: model.z[kF], tx: wx(kP), bx: wx(kF) });
      }
      setStrip(Hd, hp, true);
    });
  }

  // 물: 호수 판(물높이에 평평하게)과 하천 띠
  const lPos = new Float32Array(size * 3), lCol = new Float32Array(size * 4), lNor = new Float32Array(size * 3);
  for (let k = 0; k < size; k++) { lPos[k * 3] = pos[k * 3]; lPos[k * 3 + 2] = pos[k * 3 + 2]; lNor[k * 3 + 1] = 1; }
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3)); lGeo.setAttribute('normal', new THREE.BufferAttribute(lNor, 3)); lGeo.setAttribute('color', new THREE.BufferAttribute(lCol, 4));
  // 호수 판은 물이 있는 칸 둘레의 네모만 잇는다(다른 곳에 엉뚱한 판이 생기지 않게).
  const lIndex = new THREE.BufferAttribute(new Uint32Array((N - 1) * (N - 1) * 6), 1), lOn = new Uint8Array(size);
  lGeo.setIndex(lIndex); lGeo.setDrawRange(0, 0);
  const lakeMesh = new THREE.Mesh(lGeo, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, roughness: 0.18, metalness: 0.05, depthWrite: false }));
  lakeMesh.frustumCulled = false; lakeMesh.renderOrder = 1;
  group.add(lakeMesh);
  const LAKE = lin('#3f7fae');
  function syncLakes() {
    const { wl, z, sed } = model;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      let lv = -1e9;
      for (let b = Math.max(0, j - 2); b <= Math.min(N - 1, j + 2); b++) for (let a = Math.max(0, i - 2); a <= Math.min(N - 1, i + 2); a++) lv = Math.max(lv, wl[b * N + a]);
      const ground = Math.max(z[k], sed[k]);
      if (lv > -1e8 && lv > ground - 40) {
        lPos[k * 3] = wx(k) - C0; lPos[k * 3 + 1] = worldY(lv);
        const d = lv - ground;
        for (let q = 0; q < 3; q++) lCol[k * 4 + q] = LAKE[q] * (0.85 + 0.15 * smooth(0, 8, d));
        lCol[k * 4 + 3] = 0.88; lOn[k] = 1;
      } else { lPos[k * 3] = wx(k) - C0; lPos[k * 3 + 1] = worldY(z[k]) - 3; lCol[k * 4 + 3] = 0; lOn[k] = 0; }
    }
    const ix = lIndex.array;
    let n = 0;
    for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
      const a = j * N + i, b = a + 1, c = a + N, d = c + 1;
      if (lOn[a] && lOn[b] && lOn[c] && lOn[d]) { ix[n++] = a; ix[n++] = c; ix[n++] = b; ix[n++] = b; ix[n++] = c; ix[n++] = d; }
    }
    lIndex.needsUpdate = true; lGeo.setDrawRange(0, n);
    lGeo.attributes.position.needsUpdate = true; lGeo.attributes.color.needsUpdate = true;
  }
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x4a86b4, roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide });
  function makeRiver(max) {
    const g = new THREE.BufferGeometry(), p = new Float32Array(max * 2 * 3), idx = [];
    for (let t = 0; t < max - 1; t++) { const a = t * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(max * 2 * 3).map((v, q) => (q % 3 === 1 ? 1 : 0)), 3));
    const mesh = new THREE.Mesh(g, waterMat); mesh.frustumCulled = false; mesh.renderOrder = 1;
    group.add(mesh);
    return {
      mesh, set(pts, width) {
        const n = Math.min(max, pts.length);
        if (n < 2) { mesh.visible = false; return; }
        mesh.visible = true;
        for (let t = 0; t < n; t++) {
          const a = pts[Math.max(0, t - 1)], b = pts[Math.min(n - 1, t + 1)], ux = b.x - a.x, uy = b.y - a.y, l = Math.hypot(ux, uy) || 1, w = (pts[t].w ?? width) / 2;
          const nx = -uy / l * w, ny = ux / l * w, y = worldY(pts[t].z);
          // 블록 밖으로 삐져나가지 않게 가장자리에서 자른다.
          const cl = v => Math.min(N - 1, Math.max(0, v));
          p[t * 6] = cl(pts[t].x + nx) - C0; p[t * 6 + 1] = y; p[t * 6 + 2] = cl(pts[t].y + ny) - C0;
          p[t * 6 + 3] = cl(pts[t].x - nx) - C0; p[t * 6 + 4] = y; p[t * 6 + 5] = cl(pts[t].y - ny) - C0;
        }
        g.attributes.position.needsUpdate = true; g.setDrawRange(0, (n - 1) * 6);
      },
    };
  }
  const oldRiver = makeRiver(N * 2), newRiver = makeRiver(N * 2), tribRivers = TRIBS.map(() => [makeRiver(320), makeRiver(48)]);
  const fallTex = fallTexture();
  const fallMat = new THREE.MeshBasicMaterial({ map: fallTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: 0xffffff });
  const fallMeshes = TRIBS.map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), fallMat); m.visible = false; m.renderOrder = 3; group.add(m); return m; });
  const fallBack = TRIBS.map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x9fc4dc, roughness: 0.3, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })); m.visible = false; group.add(m); return m; });
  function syncWater() {
    const t = model.clock, z = model.z;
    // 옛 하천: 용암에 덮이기 전까지
    const covered = t > FLOW0 + 5 * FLOW_GAP + FLOW_DUR;
    // 옛 하천은 옛 땅 높이에 그려, 용암이 덮으면 용암 아래로 가려진다.
    if (!covered) { const pts = []; for (let j = 0; j < N; j += 0.5) { const x = model.rowAt(model.xo, j); pts.push({ x, y: j, z: model.bil(model.zo, x, j) + 1.2 }); } oldRiver.set(pts, 2.4); }
    else oldRiver.set([], 0);
    // 새 본류: 대지가 생긴 뒤 협곡 자리를 흐른다.
    if (covered) {
      const pts = [];
      // 깊이 깎인 협곡에서는 강이 협곡 바닥을 거의 채우고(벽이 넘친 부분을 가린다), 대지 위나 얕은 곳에서는 좁게 흐른다.
      for (let j = 0; j <= N - 1; j += 0.5) { const x = model.rowAt(model.xc, j), k = Math.round(j) * N + Math.round(x), d = model.zp[k] - model.z[k]; pts.push({ x, y: j, z: model.sample(x, j) + 0.9, w: d > 8 ? 2 * CW + 0.5 : 2.6 }); }
      newRiver.set(pts, 2 * CW + 0.5);
    } else newRiver.set([], 0);
    const slots = model.slots(), falls = model.falls();
    TRIBS.forEach((tr, ti) => {
      const [up, down] = tribRivers[ti], s = slots.find(q => q.ti === ti), fa = falls.find(q => q.ti === ti);
      const pts = [];
      // 산지 쪽(물이 내려오는 곳)부터 입구까지
      const P2 = tr.pts.slice().reverse();
      for (let q = 0; q + 1 < P2.length; q++) {
        const [ax, ay] = P2[q], [bx, by] = P2[q + 1], L = Math.hypot(bx - ax, by - ay);
        for (let d = 0; d < L; d += 0.5) { const x = ax + (bx - ax) * d / L, y = ay + (by - ay) * d / L; if (x < 0 || x > N - 1) continue; pts.push({ x, y, z: (covered ? model.sample(x, y) : model.bil(model.zo, x, y)) + 0.7 }); }
      }
      // 입구에서 본류까지 대지(또는 옛 골짜기 바닥)를 가로지른다. 폭포가 있으면 폭포 꼭대기까지만.
      const [mx, my] = tr.pts[0], endX = covered ? model.xc[tr.yc] - tr.side * CW * 0.5 : model.xo[tr.yc];
      const stopX = fa ? fa.x : endX;
      const dir = Math.sign(stopX - mx) || 1;
      for (let x = mx; dir > 0 ? x <= stopX : x >= stopX; x += 0.5 * dir) {
        if (fa && Math.abs(x - stopX) < 0.3) break;
        pts.push({ x, y: my, z: (covered ? model.sample(x, my) : model.bil(model.zo, x, my)) + 0.7 });
      }
      if (fa) pts.push({ x: fa.x - 0.04 * dir, y: my, z: fa.top + 0.7 });
      up.set(pts, 0.9);
      if (fa && s) {
        const dp = [];
        for (let x = fa.x + 0.05 * dir; dir > 0 ? x <= model.xc[tr.yc] : x >= model.xc[tr.yc]; x += 0.5 * dir) dp.push({ x, y: my, z: s.floor + 0.6 });
        down.set(dp, 1.6);
        const m = fallMeshes[ti], b = fallBack[ti], top = worldY(fa.top + 0.7), bot = worldY(fa.bottom + 0.4);
        for (const q of [m, b]) {
          q.visible = true;
          q.position.set(fa.x + dir * (q === m ? 0.06 : 0.03) - C0, (top + bot) / 2, my - C0);
          q.rotation.set(0, Math.PI / 2, 0);
          q.scale.set(1.1, top - bot, 1);
        }
        m.userData.h = top - bot;
      } else { down.set([], 0); fallMeshes[ti].visible = false; fallBack[ti].visible = false; }
    });
  }

  // 땅 색
  const ages = new Float32Array(size);
  function paint(k) {
    const { z, zo, lava, sed, cone, zp, heat } = model, i = k % N, j = (k / N) | 0, t = model.clock;
    pos[k * 3] = wx(k) - C0; pos[k * 3 + 1] = worldY(z[k]);
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const ddx = (worldY(z[ir]) - worldY(z[il])) / (ir - il || 1), ddz = (worldY(z[jr]) - worldY(z[jl])) / ((jr - jl) / N || 1), len = Math.hypot(ddx, 1, ddz);
    nor[k * 3] = -ddx / len; nor[k * 3 + 1] = 1 / len; nor[k * 3 + 2] = -ddz / len;
    const pt = patch[k], veg = model.vegFrac(), today = model.todayFrac();
    const floor = i >= model.xa[j] - 0.5 && i <= model.xb[j] + 0.5;
    let c;
    if (lava[k] > 0.5) {
      // 굳은 용암: 막 굳은 것은 아주 검고, 식으면 짙은 회색, 오래되면 풀이 덮는다.
      let last = -1;
      for (let f = NF - 1; f >= 0; f--) { const lo = f ? model.top[f - 1][k] : zo[k]; if (model.top[f][k] - lo > 0.3) { last = f; break; } }
      const te = last >= 0 ? FLOW0 + last * FLOW_GAP + FLOW_DUR : 0, age = Math.max(0, t - te);
      ages[k] = age;
      c = mix(P.fresh, P.cool, smooth(0, 4, age));
      // 가파른 가장자리(끈적한 용암의 앞머리)는 부서진 돌무더기라 밝은 회색이다.
      const st = smooth(0.25, 0.9, Math.hypot(ddx, ddz) / VE);
      c = mix(c, mix(P.talus, P.cool, hash(i + 3, j) * 0.5), st * 0.75);
      c = mix(c, mix(P.grass, P.grass2, pt), veg * (1 - 0.6 * st));
    } else if (sed[k] > zo[k] + 0.2) c = mix(P.sed, mix(P.grass, P.meadow, pt), smooth(0.6, 1, model.lakeFill()));
    else if (floor) c = mix(P.meadow, P.meadow2, pt);
    else c = mix(P.forest, P.forest2, pt * 0.8);
    // 분석구: 막 쌓인 스코리아는 검고, 식으며 붉게 녹슨 빛을 띠다가 풀과 나무가 덮는다.
    if (cone[k] > 0.8) c = mix(mix(P.scoria, P.scoriaRed, smooth(0.9, 1, model.coneGrow()) * (0.5 + 0.5 * pt)), P.scoriaOld, smooth(0.5, 1, veg) * 0.9);
    // 협곡 바닥과 폭포가 판 곳: 자갈과 바위
    // 깊은 협곡 바닥은 자갈과 바위, 얕게 깎인 물길 둘레는 자갈밭과 풀이 섞인 자연스러운 강가다.
    const cut = zp[k] - z[k], deepN = q => q >= 0 && q < size && zp[q] - z[q] > 12;
    if (cut > 12) c = mix(P.floor, P.rock, hash(i, j) * 0.6);
    else if (cut > 2) c = mix(mix(P.bar, P.meadow2, 0.35 + 0.4 * hash(i, j)), P.floor, 0.15);
    // 협곡 가장자리 점: 절벽에 걸친 삼각형이 풀색으로 보이지 않게 바위색으로 한다.
    else if ((i > 0 && deepN(k - 1)) || (i < N - 1 && deepN(k + 1)) || deepN(k - N) || deepN(k + N)) c = mix(P.rock, P.cool, 0.4);
    const sp = speckle[k];
    for (let q = 0; q < 3; q++) col[k * 3 + q] = c[q] * sp;
    // 낮은 열은 거의 빛나지 않게 한다(식은 겉에 틈 무늬가 비치지 않게).
    const hh = Math.max(0, (heat[k] - 0.15) / 0.85), g = hh * hh;
    glow[k * 3] = 1.0 * g; glow[k * 3 + 1] = 0.36 * g; glow[k * 3 + 2] = 0.08 * g;
  }
  const deep = new Uint8Array(size);
  function syncIndex() {
    const { z, zp } = model, ix = tIndex.array;
    for (let k = 0; k < size; k++) deep[k] = zp[k] - z[k] > 1 ? 1 : 0;
    let n = 0;
    const tri = (a, b, c) => {
      // 위에서 보아 격자의 (a, c, b) 차례와 같은 방향이 되게 맞춘다.
      const ax = pos[a * 3], az = pos[a * 3 + 2], area = (pos[b * 3] - ax) * (pos[c * 3 + 2] - az) - (pos[b * 3 + 2] - az) * (pos[c * 3] - ax);
      if (area < 0) { ix[n++] = a; ix[n++] = b; ix[n++] = c; } else { ix[n++] = a; ix[n++] = c; ix[n++] = b; }
    };
    // 폭포가 판 좁은 골짜기 둘레는 늘 두 삼각형으로 잇는다(그 벽 띠는 이 삼각형 위에 겹쳐 붙는다).
    const nearSlot = new Uint8Array(N);
    for (const s of model.slots()) for (let j = s.y - 3; j <= s.y + 2; j++) if (j >= 0 && j < N) nearSlot[j] = 1;
    for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
      const a = j * N + i, b = a + 1, c = a + N, d = c + 1, q = [a, b, c, d];
      const nd = deep[a] + deep[b] + deep[c] + deep[d];
      let mixed = nd > 0 && nd < 4 && !nearSlot[j];
      if (mixed) { let lo = 1e9, hi = -1e9; for (const v of q) { lo = Math.min(lo, z[v]); hi = Math.max(hi, z[v]); } mixed = hi - lo > 3; }
      if (!mixed) { ix[n++] = a; ix[n++] = c; ix[n++] = b; ix[n++] = b; ix[n++] = c; ix[n++] = d; continue; }
      // 대지 쪽 점이 셋이면 대지 삼각형, 바닥 쪽 점이 셋이면 바닥 삼각형 하나만 남긴다. 둘씩이면 절벽 띠가 덮는다.
      const top = q.filter(v => !deep[v]), bot = q.filter(v => deep[v]);
      if (top.length === 3) tri(top[0], top[1], top[2]);
      if (bot.length === 3) tri(bot[0], bot[1], bot[2]);
    }
    tIndex.needsUpdate = true;
    geo.setDrawRange(0, n); glowGeo.setDrawRange(0, n);
  }
  let lastVersion = -1;
  function syncTerrain(force) {
    if (!force && model.version === lastVersion) return false;
    lastVersion = model.version;
    syncShift();
    for (let k = 0; k < size; k++) paint(k);
    syncIndex();
    geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    glowGeo.attributes.color.needsUpdate = true;
    syncOverlay(force);
    syncLakes();
    syncWater();
    return true;
  }

  // 분출물: 틈을 따라 솟는 용암 분수(불의 커튼), 화구의 불빛, 화산 가스, 분석구의 분출, 폭포 물보라
  const SMOKE_MAX = 360, LAVA_MAX = Math.round(520 * Math.max(0.5, quality)), GLOW_MAX = 40;
  const smokeTex = makeSmokeAtlas();
  const billboardMat = glowOn => new THREE.ShaderMaterial({
    uniforms: { map: { value: smokeTex } },
    vertexShader: `
      attribute vec3 iPos; attribute vec3 iColor; attribute vec4 iMisc;
      varying vec2 vUv; varying vec3 vC; varying float vA; varying float vY;
      void main() {
        vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
        float c = cos(iMisc.w), s = sin(iMisc.w);
        vec2 p = position.xy;
        mv.xy += vec2(c * p.x - s * p.y, s * p.x + c * p.y) * iMisc.x;
        gl_Position = projectionMatrix * mv;
        vec2 cell = vec2(mod(iMisc.z, 2.0), floor(iMisc.z / 2.0));
        vUv = (uv + cell) * 0.5; vC = iColor; vA = iMisc.y; vY = position.y + 0.5;
      }`,
    fragmentShader: glowOn ? `
      varying vec2 vUv; varying vec3 vC; varying float vA; varying float vY;
      void main() {
        vec2 d = fract(vUv * 2.0) - 0.5; float r = length(d) * 2.0;
        float a = vA * pow(max(0.0, 1.0 - r), 2.2);
        if (a < 0.003) discard;
        gl_FragColor = vec4(vC * a, a);
      }` : `
      uniform sampler2D map;
      varying vec2 vUv; varying vec3 vC; varying float vA; varying float vY;
      void main() {
        vec4 t = texture2D(map, vUv);
        float a = t.a * vA;
        if (a < 0.004) discard;
        gl_FragColor = vec4(vC * t.r * mix(0.68, 1.12, vY), a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false,
    blending: glowOn ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  function makeBillboards(max, glowOn) {
    const base = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
    g.setAttribute('iPos', new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('iColor', new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('iMisc', new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage));
    g.instanceCount = 0;
    const mesh = new THREE.Mesh(g, billboardMat(glowOn));
    mesh.frustumCulled = false; mesh.renderOrder = glowOn ? 5 : 4;
    const parts = [], mv = new THREE.Matrix4();
    mesh.onBeforeRender = (r, s, camera) => {
      const n = Math.min(parts.length, max);
      if (!glowOn && n > 1) {
        mv.multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld);
        const e = mv.elements;
        for (const p of parts) p.d = e[2] * p.x + e[6] * p.y + e[10] * p.z;
        parts.sort((a, b) => a.d - b.d);
      }
      const Pp = g.attributes.iPos.array, Cc = g.attributes.iColor.array, M = g.attributes.iMisc.array;
      for (let i = 0; i < n; i++) {
        const p = parts[i];
        Pp[i * 3] = p.x; Pp[i * 3 + 1] = p.y; Pp[i * 3 + 2] = p.z;
        Cc[i * 3] = p.r; Cc[i * 3 + 1] = p.g; Cc[i * 3 + 2] = p.b;
        M[i * 4] = p.size; M[i * 4 + 1] = p.a; M[i * 4 + 2] = p.cell; M[i * 4 + 3] = p.rot;
      }
      g.instanceCount = n;
      g.attributes.iPos.needsUpdate = true; g.attributes.iColor.needsUpdate = true; g.attributes.iMisc.needsUpdate = true;
    };
    group.add(mesh);
    return { mesh, parts, push(x, y, z, sz, a, color, cell, rot) { if (parts.length < max) parts.push({ x, y, z, size: sz, a, r: color.r, g: color.g, b: color.b, cell, rot, d: 0 }); } };
  }
  const smoke = makeBillboards(SMOKE_MAX, false), glows = makeBillboards(GLOW_MAX, true);
  const lavaBits = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.12, 1, 7, 1).translate(0, -0.35, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), LAVA_MAX);
  lavaBits.frustumCulled = false; lavaBits.count = 0;
  lavaBits.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(LAVA_MAX * 3), 3);
  group.add(lavaBits);
  const light = new THREE.PointLight(0xff7a30, 0, 90, 1.6);
  group.add(light);
  // 불의 커튼: 갈라진 틈을 따라 줄지어 솟는 낮은 용암 분수. 아래는 노랗게 밝고 위로 갈수록 붉어지며 흩어진다.
  const CUR_MAX = 72;
  const curGeo = new THREE.BufferGeometry(), curPos = new Float32Array(CUR_MAX * 2 * 3), curUv = new Float32Array(CUR_MAX * 2 * 2), curIdx = [];
  for (let t = 0; t < CUR_MAX - 1; t++) { const a = t * 2, b = a + 1, c = a + 2, d = a + 3; curIdx.push(a, c, b, b, c, d); }
  curGeo.setIndex(curIdx); curGeo.setAttribute('position', new THREE.BufferAttribute(curPos, 3)); curGeo.setAttribute('uv', new THREE.BufferAttribute(curUv, 2));
  const curMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform float uTime; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
      void main(){
        float y = vUv.y;
        float s = n(vec2(vUv.x * 320.0, y * 2.4 - uTime * 2.2)) * 0.65 + n(vec2(vUv.x * 1100.0, y * 6.0 - uTime * 4.0)) * 0.35;
        float a = smoothstep(1.0, 0.2, y + (s - 0.5) * 0.7) * smoothstep(0.0, 0.05, y + 0.03);
        a *= 0.35 + 0.85 * s;
        vec3 c = mix(vec3(1.0, 0.95, 0.62), vec3(1.0, 0.45, 0.08), smoothstep(0.05, 0.55, y));
        c = mix(c, vec3(0.75, 0.13, 0.03), smoothstep(0.5, 1.0, y));
        gl_FragColor = vec4(c * a * 1.25, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const curtain = new THREE.Mesh(curGeo, curMat);
  curtain.frustumCulled = false; curtain.renderOrder = 5; curtain.visible = false;
  group.add(curtain);
  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), vv = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), cc = new THREE.Color();
  const heatColor = (u, out) => { const f = Math.min(0.999, Math.max(0, u)) * (HOT.length - 1), i = Math.floor(f); return out.copy(HOT[i]).lerp(HOT[i + 1], f - i); };
  const GAS = new THREE.Color(0xd8d5cf), ASH_LOW = new THREE.Color(0x3f3934), ASH_HIGH = new THREE.Color(0x8f8981), MIST = new THREE.Color(0xf2f6f8);
  const ground = (x, y) => worldY(model.sample(x, y));
  let anim = 0;
  // 불똥 하나: 포물선을 그리며 날아 식는다. 뜨거울 때는 꼬리를 끌고, 식은 덩이는 짧고 뭉툭하다.
  function spark(nl, bx, by, bz, a, seed, up, spread) {
    const ph = (anim * (0.8 + 0.6 * hash(a, 13)) + hash(a, seed)) % 1, ang = hash(a, 7) * 6.283;
    const sp = (0.15 + hash(a, 9) * 0.6) * spread, u = up * (0.55 + 0.45 * hash(a, 11));
    const hx = Math.cos(ang) * sp, hz = Math.sin(ang) * sp;
    pv.set(bx + hx * ph, by + u * 4 * ph * (1 - ph) + 0.1, bz + hz * ph);
    vv.set(hx, u * 4 * (1 - 2 * ph), hz);
    const speed = vv.length();
    qq.setFromUnitVectors(UP, vv.multiplyScalar(1 / Math.max(1e-4, speed)));
    const cool = Math.min(1, Math.max(0, (ph - 0.45) / 0.5)), w = (0.11 + 0.1 * hash(a, 15)) * (1 - 0.55 * cool);
    m4.compose(pv, qq, sv.set(w, (0.12 + speed * 0.07) * (1 - 0.8 * cool) + w, w));
    lavaBits.setMatrixAt(nl, m4);
    lavaBits.setColorAt(nl, heatColor(ph * 0.75 + 0.1 * hash(a, 17), cc));
  }
  function syncFx(dt) {
    anim += dt;
    smoke.parts.length = 0; glows.parts.length = 0;
    let nl = 0, lx = 0, ly = 0, lz = 0, ls = 0;
    const vents = model.finished ? [] : model.vents();
    curMat.uniforms.uTime.value = anim;
    const fv = vents.find(v => v.kind === 'fissure');
    curtain.visible = !!fv && fv.s > 0.02;
    if (curtain.visible) {
      for (let t = 0; t < CUR_MAX; t++) {
        const y = fv.y0 + ((fv.y1 - fv.y0) * t) / (CUR_MAX - 1), x = model.rowAt(model.xf, y), base = ground(x, y) - 0.15;
        // 분수 높이는 곳마다 다르고 조금씩 오르내린다(약 10m에서 40m).
        const hgt = (1.3 + 4.2 * fv.s) * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(y * 0.37 + anim * 1.3) * Math.sin(y * 0.11 - anim * 0.7 + fv.f)));
        curPos[t * 6] = x - C0; curPos[t * 6 + 1] = base + hgt; curPos[t * 6 + 2] = y - C0;
        curPos[t * 6 + 3] = x - C0; curPos[t * 6 + 4] = base; curPos[t * 6 + 5] = y - C0;
        curUv[t * 4] = y / N; curUv[t * 4 + 1] = 1; curUv[t * 4 + 2] = y / N; curUv[t * 4 + 3] = 0;
      }
      curGeo.attributes.position.needsUpdate = true; curGeo.attributes.uv.needsUpdate = true;
    }
    for (const v of vents) {
      if (v.kind === 'fissure') {
        // 틈을 따라 낮은 용암 분수가 줄지어 솟는다.
        const sites = [];
        for (let y = v.y0; y <= v.y1; y += 2.2) sites.push(y);
        sites.forEach((y, si) => {
          const x = model.rowAt(model.xf, y), bx = x - C0, bz = y - C0, by = ground(x, y);
          const strength = v.s * (0.55 + 0.45 * Math.sin(si * 1.7 + anim * 2.1 + v.f) ** 2);
          for (let a = 0; a < 5 && nl < LAVA_MAX; a++) spark(nl++, bx, by, bz, a + si * 5, si + 3, 4.5 * strength + 0.8, 1.4);
          if (si % 3 === 0) glows.push(bx, by + 0.6, bz, 7 * Math.max(0.35, v.s), 0.5 * Math.max(0.3, v.s) + 0.1 * Math.sin(anim * 9 + si), cc.set(0xff7a2a), 0, 0);
          if (si % 6 === 1) {
            for (let a = 0; a < 3; a++) {
              const ph = (anim * 0.18 + hash(a, si + 21)) % 1;
              smoke.push(bx + ph * 7 + (hash(a, si) - 0.5) * 2, by + 1.5 + ph * 16, bz + (hash(a, si + 2) - 0.5) * 3, 4 + ph * 12, 0.1 * fadeInOut(ph) * Math.max(0.4, v.s), cc.copy(GAS), (a + si) & 3, hash(a, si + 24) * 6.28 + anim * 0.05);
            }
          }
          lx += bx; ly += by; lz += bz; ls++;
        });
      } else if (v.kind === 'spot') {
        const bx = v.x - C0, bz = v.y - C0, by = ground(v.x, v.y);
        for (let a = 0; a < 14 && nl < LAVA_MAX; a++) spark(nl++, bx, by, bz, a, 41 + Math.round(v.y), 1.6 * v.s + 0.4, 0.8);
        glows.push(bx, by + 0.6, bz, 8 * Math.max(0.35, v.s), 0.5, cc.set(0xff6a20), 0, 0);
        for (let a = 0; a < 6; a++) { const ph = (anim * 0.18 + hash(a, v.y)) % 1; smoke.push(bx + ph * 5, by + 1.5 + ph * 12, bz, 3 + ph * 7, 0.22 * fadeInOut(ph), cc.copy(GAS), a & 3, hash(a, 9) * 6.28); }
        lx += bx; ly += by; lz += bz; ls++;
      } else if (v.kind === 'cone') {
        // 분석구: 한 화구에서 스코리아가 터져 오르고(스트롬볼리식), 어두운 화산재가 조금 솟는다.
        const bx = v.x - C0, bz = v.y - C0, by = worldY(model.zp[v.y * N + v.x] + 2);
        for (let a = 0; a < 70 && nl < LAVA_MAX; a++) spark(nl++, bx, by, bz, a, 77, 4.5 * v.s + 1, 2.2);
        glows.push(bx, by + 0.6, bz, 9 * v.s, 0.55, cc.set(0xff7a2a), 0, 0);
        for (let a = 0; a < 70; a++) {
          const ph = (anim * (0.16 + 0.06 * hash(a, 31)) + hash(a, 3)) % 1, rise = 1 - Math.pow(1 - ph, 1.8);
          const ang = hash(a, 32) * 6.283, rad = (0.4 + rise * 2.6) * hash(a, 33);
          cc.copy(ASH_LOW).lerp(ASH_HIGH, Math.min(1, rise * 1.1));
          smoke.push(bx + Math.cos(ang) * rad + rise * 4, by + 1 + rise * 20 * v.s, bz + Math.sin(ang) * rad, (2.2 + rise * 6) * (0.75 + 0.5 * hash(a, 35)), 0.55 * fadeInOut(ph) * v.s, cc, a & 3, hash(a, 37) * 6.28);
        }
        lx += bx; ly += by + 6; lz += bz; ls += 1;
      }
    }
    if (ls) { light.position.set(lx / ls, ly / ls + 4, lz / ls); light.intensity = (110 + 30 * Math.sin(anim * 13)) * Math.min(1, ls / 6); }
    else light.intensity = 0;
    // 폭포 물보라와 흐르는 물줄기
    fallTex.offset.y = (anim * 0.9) % 1;
    for (const fa of model.falls()) {
      const tr = TRIBS[fa.ti], bx = fa.x + tr.side * 0.6 - C0, bz = fa.y - C0, by = worldY(fa.bottom + 1);
      for (let a = 0; a < 10; a++) {
        const ph = (anim * 0.5 + hash(a, fa.ti + 1)) % 1;
        smoke.push(bx + tr.side * ph * 1.2, by + ph * 1.6, bz + (hash(a, 5) - 0.5) * 1.2, 0.8 + ph * 1.6, 0.35 * fadeInOut(ph), cc.copy(MIST), a & 3, hash(a, 8) * 6.28);
      }
    }
    lavaBits.count = nl;
    lavaBits.instanceMatrix.needsUpdate = true;
    if (lavaBits.instanceColor) lavaBits.instanceColor.needsUpdate = true;
  }

  return { group, terrain, syncTerrain, syncFaces, syncFx, faces, walls };
}

// 한 행(y = j)의 지표 윤곽. 협곡 절벽 자리는 3D 블록처럼 거의 수직으로 세운다. [[x, z]]
export function rowOutline(model, j) {
  const out = [];
  const xL = model.xc[j] - CW, xR = model.xc[j] + CW, iL = Math.floor(xL) + 1, iR = Math.ceil(xR) - 1;
  for (let i = 0; i < N; i++) {
    let x = i;
    if (i === iL) x = xL + 0.03; else if (i === iL - 1) x = xL - 0.03; else if (i === iR) x = xR - 0.03; else if (i === iR + 1) x = xR + 0.03;
    out.push([x, model.z[j * N + i]]);
  }
  return out;
}

// 분출물 판의 나타남과 사라짐: 처음에 빨리 짙어지고 끝에서 천천히 옅어진다.
function fadeInOut(ph) { return Math.min(1, ph / 0.08) * Math.min(1, (1 - ph) / 0.3); }

// 연기 무늬 넷(2x2). 둥근 덩이 여럿을 겹쳐 꽃양배추처럼 울퉁불퉁한 윤곽을 만들고, 잡음으로 속을 고르지 않게 한다(화산 지형 장면과 같은 방법).
function makeSmokeAtlas() {
  const S = 128, W = S * 2, data = new Uint8Array(W * W * 4);
  const vnoise = (x, y, s) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    const h = (a, b) => hash(a + s * 17, b - s * 31);
    return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - w) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * w;
  };
  for (let cell = 0; cell < 4; cell++) {
    const blobs = [];
    for (let b = 0; b < 22; b++) {
      const ang = hash(b, cell * 7 + 1) * 6.283, d = Math.sqrt(hash(b, cell * 7 + 2)) * 0.27;
      blobs.push([0.5 + Math.cos(ang) * d, 0.5 + Math.sin(ang) * d * 0.85, 0.07 + hash(b, cell * 7 + 3) * 0.11]);
    }
    const dens = (x, y) => { let s = 0; for (const [bx, by, br] of blobs) { const ddx = x - bx, ddy = y - by; s += Math.exp(-(ddx * ddx + ddy * ddy) / (br * br)); } return s; };
    const ox = (cell % 2) * S, oy = Math.floor(cell / 2) * S;
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const x = (px + 0.5) / S, y = (py + 0.5) / S;
      const n = 0.5 * vnoise(x * 7, y * 7, cell) + 0.3 * vnoise(x * 15, y * 15, cell + 4) + 0.2 * vnoise(x * 31, y * 31, cell + 8);
      const d = dens(x, y) * (0.45 + 0.9 * n);
      const edge = Math.min(1, Math.max(0, (0.5 - Math.hypot(x - 0.5, y - 0.5)) / 0.12));
      const a = Math.min(1, Math.max(0, (d - 0.25) / 1.1)) ** 1.3 * edge;
      const lit = Math.min(1, Math.max(0, 0.8 + (dens(x, y - 0.04) - dens(x, y + 0.04)) * 0.18 + (n - 0.5) * 0.25));
      const k = ((oy + py) * W + ox + px) * 4;
      data[k] = data[k + 1] = data[k + 2] = Math.round(lit * 255);
      data[k + 3] = Math.round(a * 255);
    }
  }
  const tex = new THREE.DataTexture(data, W, W, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
export { CONE };
