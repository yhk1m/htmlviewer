import * as THREE from 'three';
import { rng32 } from './rng.js';

function roundTreeGeometry() {
  const g = new THREE.IcosahedronGeometry(0.5, 2);
  const p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const u = v.clone().normalize();
    const lump = 1 + 0.16 * Math.sin(u.x * 7 + 1) * Math.sin(u.y * 6 + 2) + 0.12 * Math.sin(u.z * 9 + u.x * 5) + 0.05 * Math.sin(u.y * 19 + u.z * 17);
    n.setXYZ(i, u.x, u.y, u.z);
    p.setXYZ(i, u.x * 0.5 * lump * 2, u.y * 0.5 * lump + 0.45, u.z * 0.5 * lump * 2);
  }
  return g;
}

export function buildNearTrees(ctx, stage, mountainMask) {
  const { N, SIZE, CELL, WATER_LEVEL, ex, sampleH, dense, treeFactor } = ctx;
  const rand = rng32(555), MAX = 3200;
  const mesh = new THREE.InstancedMesh(roundTreeGeometry(), new THREE.MeshStandardMaterial({ roughness: 0.95 }), MAX);
  mesh.castShadow = true;
  const m = new THREE.Matrix4(), c = new THREE.Color();
  let n = 0;
  for (let tries = 0; tries < MAX * 40 && n < MAX; tries++) {
    const i = 2 + Math.floor(rand() * (N - 4)), j = 2 + Math.floor(rand() * (N - 4));
    const k = j * N + i;
    if (mountainMask[k] > 0.3) continue;
    const f = stage.forest[k];
    if (rand() > f * f) continue;
    if (stage.h[k] <= WATER_LEVEL + 1) continue;
    const px = i + rand() - 0.5, py = j + rand() - 0.5;
    const hgt = 8 + rand() * rand() * 22, rad = 3.5 + rand() * rand() * 9;
    m.makeRotationY(rand() * 6.28);
    m.scale(new THREE.Vector3(rad, hgt, rad));
    m.setPosition((px / (N - 1) - 0.5) * SIZE, ex(sampleH(stage.h, px, py)) - 1, (py / (N - 1) - 0.5) * SIZE);
    mesh.setMatrixAt(n, m);
    const t = rand();
    c.setRGB(0.04 + t * 0.05, 0.08 + t * 0.06, 0.035 + t * 0.02);
    mesh.setColorAt(n, c);
    n++;
  }
  mesh.count = n;
  return mesh;
}

export function buildTrees(ctx, stage, mountainMask) {
  const { N, SIZE, CELL, WATER_LEVEL, ex, sampleH, dense, treeFactor } = ctx;
  const rand = rng32(777);
  const MAX = Math.round((dense ? 90000 : 56000) * treeFactor);
  const geo = new THREE.IcosahedronGeometry(0.5, 0).scale(2, 1, 2).translate(0, 0.45, 0);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  const mesh = new THREE.InstancedMesh(geo, mat, MAX);
  mesh.castShadow = true;
  const m = new THREE.Matrix4(), c = new THREE.Color();
  let n = 0;
  for (let tries = 0; tries < MAX * 7 && n < MAX; tries++) {
    const i = 2 + Math.floor(rand() * (N - 4)), j = 2 + Math.floor(rand() * (N - 4));
    if (mountainMask[j * N + i] <= 0.3) continue;
    const f = stage.forest[j * N + i];
    if (rand() > f * f) continue;
    const y = stage.h[j * N + i];
    if (y <= WATER_LEVEL + 1) continue;
    const px = i + rand() - 0.5, py = j + rand() - 0.5;
    const x = (px / (N - 1) - 0.5) * SIZE, z = (py / (N - 1) - 0.5) * SIZE;
    const hgt = 10 + rand() * rand() * 24, rad = (4 + rand() * rand() * 11) * (dense ? 1.3 : 1);
    m.makeScale(rad, hgt, rad);
    m.setPosition(x, ex(sampleH(stage.h, px, py)) - 2, z);
    mesh.setMatrixAt(n, m);
    const t = rand();
    c.setRGB(0.035 + t * 0.05, 0.075 + t * 0.06, 0.032 + t * 0.018);
    mesh.setColorAt(n, c);
    n++;
  }
  mesh.count = n;
  return mesh;
}

export function buildTown(ctx, stage, places) {
  const { N, SIZE, CELL, WATER_LEVEL, ex, sampleH, dense, treeFactor } = ctx;
  // 선정과 선단에 마을이 들어선다.
  const rand = rng32(31);
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.75 });
  const MAX = 640;
  const mesh = new THREE.InstancedMesh(geo, mat, MAX);
  mesh.castShadow = true;
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), m = new THREE.Matrix4(), c = new THREE.Color();
  const centers = [
    { ...places.apex, r: 130, w: 0.18, dz: 70 },
    ...places.streamToe.filter((_, i) => i % 18 === 0).map(p => ({ ...p, r: 120, w: 0.5, dz: 0 })),
    { x: places.toe.x + 620, z: places.toe.z + 60, r: 150, w: 0.3, dz: 0 },
    { x: places.toe.x - 700, z: places.toe.z + 90, r: 170, w: 0.3, dz: 0 },
  ];
  const roofs = [[.17,.17,.17],[.13,.15,.18],[.25,.24,.22],[.17,.11,.09],[.3,.29,.27]];
  let n = 0, tries = 0;
  while (n < MAX && tries++ < MAX * 6) {
    const k = centers[Math.floor(rand() * centers.length)];
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * k.r;
    const x = k.x + Math.cos(a) * d, z = k.z + k.dz + Math.sin(a) * d;
    const i = Math.round((x / SIZE + 0.5) * (N - 1)), j = Math.round((z / SIZE + 0.5) * (N - 1));
    if (i < 3 || j < 3 || i > N - 4 || j > N - 4) continue;
    const y = stage.h[j * N + i];
    if (stage.water[j * N + i] > 0.05 || y <= WATER_LEVEL + 1) continue;
    const slope = Math.hypot(stage.h[j * N + i + 1] - stage.h[j * N + i - 1], stage.h[(j + 1) * N + i] - stage.h[(j - 1) * N + i]) / (2 * CELL);
    if (slope > 0.14) continue;
    q.setFromAxisAngle(up, 0.32 + (rand() < 0.2 ? Math.PI / 2 : 0) + (rand() - 0.5) * 0.15);
    const big = rand() < 0.18;
    m.compose(new THREE.Vector3(x, ex(y) - 0.5, z), q, new THREE.Vector3(big ? 24 : 8 + rand() * 8, big ? 7 : 4 + rand() * 4, big ? 12 : 7 + rand() * 6));
    mesh.setMatrixAt(n, m);
    const r = roofs[Math.floor(rand() * roofs.length)]; c.setRGB(r[0], r[1], r[2]);
    mesh.setColorAt(n, c);
    n++;
  }
  // 평지의 비닐하우스: 밝고 길쭉한 건물
  const hr = rng32(53);
  for (let tries = 0; tries < 9000 && n < MAX; tries++) {
    const i = 3 + Math.floor(hr() * (N - 6)), j = 3 + Math.floor(hr() * (N - 6)), k = j * N + i;
    if (stage.splatB[k * 4] < 190 || stage.water[k] > 0.05 || hr() > 0.05) continue;
    q.setFromAxisAngle(up, 0.32 + (hr() < 0.3 ? Math.PI / 2 : 0));
    const x = (i / (N - 1) - 0.5) * SIZE, z = (j / (N - 1) - 0.5) * SIZE;
    m.compose(new THREE.Vector3(x, ex(stage.h[k]) - 0.3, z), q, new THREE.Vector3(55 + hr() * 45, 4, 12 + hr() * 8));
    mesh.setMatrixAt(n, m);
    c.setRGB(0.62, 0.65, 0.66);
    mesh.setColorAt(n, c);
    n++;
  }
  mesh.count = n;
  return mesh;
}
