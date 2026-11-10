// © 2026 김용현
// 실제 지형 화면의 도로. OpenStreetMap 도로 선을 땅 위에 얇은 띠로 얹는다. 폭은 등급마다 정한 대표 값이고 실제 폭과 다를 수 있다.
// 계산(roadArrays)은 THREE 없이 돌아 node에서 검사한다.

export const ROAD_WIDTH_M = [16, 11, 7]; // 등급 0(고속도로와 국도), 1(큰 도로), 2(작은 도로)
// 모든 도로는 연회색이다. 흰빛이 도는 건물과 구분되도록 색조 없는 회색으로 하고, 큰 길일수록 조금 밝게 한다.
const COLORS = [[0.7, 0.7, 0.7], [0.66, 0.66, 0.66], [0.62, 0.62, 0.62]];

// data: {roads: [{c, p}]}. toWorld(i, j) → [x, z]. groundAt(i, j) → 화면 높이. cellM: 한 칸의 m. lift: 땅 위로 띄우는 높이.
export function roadArrays(data, { toWorld, groundAt, cellM, lift = 1.2 }) {
  const pos = [], col = [];
  // 위쪽 등급을 나중에 그려 교차로에서 큰 길이 위에 보이게 한다.
  const roads = [...data.roads].sort((a, b) => b.c - a.c);
  for (const r of roads) {
    const half = ROAD_WIDTH_M[r.c] / 2 / cellM, color = COLORS[r.c], up = lift + (2 - r.c) * 0.15;
    // 반 칸마다 점을 찍어 띠가 땅의 굴곡을 따라가게 한다.
    const pts = [];
    for (let n = 0; n + 3 < r.p.length; n += 2) {
      const ax = r.p[n], ay = r.p[n + 1], bx = r.p[n + 2], by = r.p[n + 3], len = Math.hypot(bx - ax, by - ay), steps = Math.max(1, Math.ceil(len / 0.5));
      for (let s = n === 0 ? 0 : 1; s <= steps; s++) pts.push([ax + ((bx - ax) * s) / steps, ay + ((by - ay) * s) / steps]);
    }
    if (pts.length < 2) continue;
    let prevL = null, prevR = null;
    for (let s = 0; s < pts.length; s++) {
      const a = pts[Math.max(0, s - 1)], b = pts[Math.min(pts.length - 1, s + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const [x, y] = pts[s], li = x - dy * half, lj = y + dx * half, ri = x + dy * half, rj = y - dx * half;
      const wl = toWorld(li, lj), wr = toWorld(ri, rj);
      const L = [wl[0], groundAt(li, lj) + up, wl[1]], R = [wr[0], groundAt(ri, rj) + up, wr[1]];
      if (prevL) {
        // 위에서 보았을 때 앞면이 위를 향하도록 감는다.
        for (const [p, q, r] of [[prevL, prevR, R], [prevL, R, L]]) {
          const ny = (q[2] - p[2]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[2] - p[2]);
          for (const v of ny >= 0 ? [p, q, r] : [p, r, q]) { pos.push(...v); col.push(...color); }
        }
      }
      prevL = L; prevR = R;
    }
  }
  return { position: new Float32Array(pos), color: new Float32Array(col), count: roads.length };
}

// 켜고 끄는 도로 층. 땅 높이 배율(key)마다 한 번 만들어 둔다.
export function createRoadLayer(THREE, scene, data, opts) {
  const cache = {};
  let mesh = null, on = true, allowed = true;
  const show = () => { if (mesh) mesh.visible = on && allowed; };
  const build = () => {
    const a = roadArrays(data, opts), geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(a.position, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(a.color, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.receiveShadow = true;
    m.userData.count = a.count;
    return m;
  };
  return {
    place(key) {
      if (mesh) scene.remove(mesh);
      mesh = cache[key] ??= build();
      show();
      scene.add(mesh);
    },
    toggle() { on = !on; show(); return on; },
    allow(v) { allowed = v; show(); },
    info: () => ({ count: mesh ? mesh.userData.count : 0, visible: !!mesh && mesh.visible }),
  };
}
