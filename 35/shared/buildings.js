// © 2026 김용현
// 실제 지형 화면의 건물. 브이월드 건물 자료의 바닥 윤곽을 층수만큼 올린 덩어리로 그린다. 지붕과 창문 모양은 자료에 없어 그리지 않는다.
// 땅은 과장하지만 건물 높이는 과장하지 않는다. 건물은 윤곽 아래 땅의 가장 낮은 높이에 얹는다.
// 계산(buildingArrays, footprintMask)은 THREE 없이 돌아 node에서 검사한다.

export const FLOOR_M = 3; // 한 층의 높이(m). 실제 건물마다 다르다.
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// 링의 넓이(부호 있음). 양수면 화면 좌표(아래로 갈수록 세로가 커짐)에서 시계 방향이다.
export function ringArea(r) {
  let s = 0;
  for (let n = 0, m = r.length / 2; n < m; n++) { const a = n * 2, b = ((n + 1) % m) * 2; s += r[a] * r[b + 1] - r[b] * r[a + 1]; }
  return s / 2;
}

// 귀를 자르는 삼각형 나누기. 건물 윤곽은 꼭짓점이 적어 이것으로 충분하다. 반환: 꼭짓점 번호 세 개씩.
export function triangulate(r) {
  const m = r.length / 2, idx = [];
  for (let n = 0; n < m; n++) idx.push(n);
  if (ringArea(r) < 0) idx.reverse();
  const x = n => r[n * 2], y = n => r[n * 2 + 1];
  const cross = (a, b, c) => (x(b) - x(a)) * (y(c) - y(a)) - (y(b) - y(a)) * (x(c) - x(a));
  const inside = (p, a, b, c) => cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0;
  const out = [];
  let guard = 0;
  while (idx.length > 3 && guard++ < 4 * m * m) {
    let cut = false;
    for (let q = 0; q < idx.length; q++) {
      const a = idx[(q + idx.length - 1) % idx.length], b = idx[q], c = idx[(q + 1) % idx.length];
      if (cross(a, b, c) <= 0) continue;
      let ok = true;
      for (const p of idx) if (p !== a && p !== b && p !== c && inside(p, a, b, c)) { ok = false; break; }
      if (!ok) continue;
      out.push(a, b, c); idx.splice(q, 1); cut = true; break;
    }
    if (!cut) break; // 꼬인 윤곽: 남은 것은 부채꼴로 채운다.
  }
  for (let q = 1; q + 1 < idx.length; q++) out.push(idx[0], idx[q], idx[q + 1]);
  return out;
}

// 건물 덩어리의 꼭짓점 배열. data: {floors, rings(격자 칸 좌표)}. toWorld(i, j) → [x, z]. groundAt(i, j) → 그 칸의 화면 높이.
export function buildingArrays(data, { toWorld, groundAt }) {
  const pos = [], nor = [], col = [];
  const WALL = [0.74, 0.72, 0.68], ROOFS = [[0.86, 0.85, 0.82], [0.78, 0.8, 0.82], [0.83, 0.78, 0.72]];
  const push = (p, n, c) => { pos.push(...p); nor.push(...n); col.push(...c); };
  let count = 0;
  data.rings.forEach((r, b) => {
    const m = r.length / 2;
    if (m < 3 || Math.abs(ringArea(r)) < 1e-4) return;
    let base = Infinity;
    for (let n = 0; n < m; n++) base = Math.min(base, groundAt(r[n * 2], r[n * 2 + 1]));
    const top = base + Math.max(1, data.floors[b] || 1) * FLOOR_M, sink = base - 2;
    const w = []; for (let n = 0; n < m; n++) w.push(toWorld(r[n * 2], r[n * 2 + 1]));
    // 화면 좌표(x, z)에서 바깥쪽을 향하도록 둘레 방향을 맞춘다.
    let area = 0; for (let n = 0; n < m; n++) { const a = w[n], c = w[(n + 1) % m]; area += a[0] * c[1] - c[0] * a[1]; }
    const shade = 0.9 + ((b * 7919) % 100) / 1000;
    const wall = WALL.map(v => v * shade);
    for (let n = 0; n < m; n++) {
      // 삼각형 (a 아래, c 아래, c 위)의 앞면 방향은 (-dz, 0, dx)다. 이것이 바깥을 보도록 반시계 둘레면 순서를 뒤집는다.
      let a = w[n], c = w[(n + 1) % m];
      if (area > 0) [a, c] = [c, a];
      let nx = -(c[1] - a[1]), nz = c[0] - a[0]; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
      const N3 = [nx, 0, nz];
      push([a[0], sink, a[1]], N3, wall); push([c[0], sink, c[1]], N3, wall); push([c[0], top, c[1]], N3, wall);
      push([a[0], sink, a[1]], N3, wall); push([c[0], top, c[1]], N3, wall); push([a[0], top, a[1]], N3, wall);
    }
    const roof = ROOFS[b % ROOFS.length].map(v => v * shade), tri = triangulate(r);
    for (let t = 0; t < tri.length; t += 3) {
      // 지붕은 위를 향하도록 감는 방향을 맞춘다.
      const p = [w[tri[t]], w[tri[t + 1]], w[tri[t + 2]]];
      const up = (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[1][1] - p[0][1]) * (p[2][0] - p[0][0]) < 0;
      for (const q of up ? [0, 1, 2] : [0, 2, 1]) push([p[q][0], top, p[q][1]], [0, 1, 0], roof);
    }
    count++;
  });
  return { position: new Float32Array(pos), normal: new Float32Array(nor), color: new Float32Array(col), count };
}

// 건물이 덮는 칸(나무를 심지 않을 자리). 윤곽 둘레 1칸까지 표시한다.
export function footprintMask(data, N) {
  const mark = new Uint8Array(N * N);
  for (const r of data.rings) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let n = 0; n < r.length; n += 2) { x0 = Math.min(x0, r[n]); x1 = Math.max(x1, r[n]); y0 = Math.min(y0, r[n + 1]); y1 = Math.max(y1, r[n + 1]); }
    for (let j = clamp(Math.floor(y0) - 1, 0, N - 1); j <= clamp(Math.ceil(y1) + 1, 0, N - 1); j++)
      for (let i = clamp(Math.floor(x0) - 1, 0, N - 1); i <= clamp(Math.ceil(x1) + 1, 0, N - 1); i++) mark[j * N + i] = 1;
  }
  return mark;
}

// 건물 자리의 숲 값을 지워 나무가 건물을 뚫고 나오지 않게 한다.
export function clearUnder(data, N, ...fields) {
  const mark = footprintMask(data, N);
  for (let k = 0; k < N * N; k++) if (mark[k]) for (const f of fields) f[k] = 0;
}

// 중심 칸 [i, j]에서 r칸 안에 무게중심이 있는 건물을 뺀다. 따로 만든 건물 모형과 겹치지 않게 할 때 쓴다.
export function dropNear(data, [ci, cj], r) {
  const keep = data.rings.map(ring => {
    let x = 0, y = 0;
    for (let n = 0; n < ring.length; n += 2) { x += ring[n]; y += ring[n + 1]; }
    const m = ring.length / 2;
    return Math.hypot(x / m - ci, y / m - cj) > r;
  });
  return { ...data, floors: data.floors.filter((_, b) => keep[b]), rings: data.rings.filter((_, b) => keep[b]) };
}

// 켜고 끄는 건물 층. 땅 높이 배율(key)마다 한 번 만들어 둔다.
export function createBuildingLayer(THREE, scene, data, opts) {
  const cache = {};
  let mesh = null, on = true, allowed = true;
  const show = () => { if (mesh) mesh.visible = on && allowed; };
  return {
    place(key) {
      if (mesh) scene.remove(mesh);
      mesh = cache[key] ??= createBuildingMesh(THREE, data, opts);
      show();
      scene.add(mesh);
    },
    toggle() { on = !on; show(); return on; },
    allow(v) { allowed = v; show(); },
    info: () => ({ count: mesh ? mesh.userData.count : 0, visible: !!mesh && mesh.visible }),
  };
}

// THREE 덩어리 하나로 합친다.
export function createBuildingMesh(THREE, data, opts) {
  const a = buildingArrays(data, opts), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(a.position, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(a.normal, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(a.color, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData.count = a.count;
  return mesh;
}
