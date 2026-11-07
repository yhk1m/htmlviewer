// © 2026 김용현
// 정동진 평평한 땅 위의 배 모양 건물. 자리와 길이, 방향은 OpenStreetMap 건물 윤곽에서 옮겼고 생김새는 단순화한 그림이다.
import * as THREE from 'three';

const BASE = 0x6f665a, WHITE = 0xf2f0ea, NAVY = 0x27415f, GLASS = 0x33495a, RED = 0xb8392e, DECK = 0xc9b48c;

// 뱃머리가 +x 쪽을 보는 배 윤곽. length는 앞뒤 길이, width는 폭이다.
function hullShape(length, width) {
  const L = length / 2, W = width / 2, s = new THREE.Shape();
  s.moveTo(-L, -W * 0.72);
  s.quadraticCurveTo(-L * 0.98, -W, -L * 0.8, -W);
  s.lineTo(L * 0.28, -W);
  s.quadraticCurveTo(L * 0.72, -W * 0.9, L, 0);
  s.quadraticCurveTo(L * 0.72, W * 0.9, L * 0.28, W);
  s.lineTo(-L * 0.8, W);
  s.quadraticCurveTo(-L * 0.98, W, -L, W * 0.72);
  s.closePath();
  return s;
}

function layer(length, width, y0, y1, color, x = 0) {
  const geo = new THREE.ExtrudeGeometry(hullShape(length, width), { depth: y1 - y0, bevelEnabled: false, curveSegments: 10 });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.55 }));
  mesh.position.set(x, y0, 0);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

// 길이, 폭, 높이는 m 단위다. 높이는 지형과 달리 과장하지 않는다.
export function createShip({ length, width, height }) {
  const group = new THREE.Group(), H = height;
  // 땅이 울퉁불퉁해도 떠 보이지 않게 아래를 받친다.
  group.add(layer(length * 0.98, width * 0.98, -70, 0, BASE));
  group.add(layer(length, width, 0, H * 0.3, WHITE));
  group.add(layer(length * 0.995, width * 0.995, H * 0.3, H * 0.33, NAVY));
  const decks = [[0.84, 0.92, 0.33, 0.47], [0.7, 0.84, 0.47, 0.61], [0.55, 0.76, 0.61, 0.75], [0.36, 0.66, 0.75, 0.87]];
  for (const [l, w, a, b] of decks) {
    const x = -length * (1 - l) * 0.16;
    group.add(layer(length * l, width * w, H * a, H * b, WHITE, x));
    // 층마다 어두운 창 띠를 두른다.
    group.add(layer(length * l * 1.004, width * w * 1.012, H * (a + (b - a) * 0.35), H * (a + (b - a) * 0.72), GLASS, x));
  }
  group.add(layer(length * 0.86, width * 0.94, H * 0.47, H * 0.476, DECK, -length * 0.02));
  // 굴뚝
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.15, width * 0.19, H * 0.2, 14), new THREE.MeshStandardMaterial({ color: RED, roughness: 0.5 }));
  funnel.position.set(-length * 0.2, H * 0.97, 0);
  funnel.castShadow = true;
  group.add(funnel);
  return group;
}
