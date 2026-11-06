// © 2026 김용현
// 두 번 눌러 회전 중심 바꾸기. 지형 위 눌린 점을 controls.target으로 부드럽게 옮기고 잠깐 고리를 보여 준다.
// 카메라 위치는 그대로 두고 바라보는 방향만 바뀐다. 판정 함수는 화면 없이 검사할 수 있게 three를 쓰지 않는다.
export const DOUBLE_TAP = { ms: 300, px: 24, dragPx: 10 };
const MOVE_SECONDS = 0.35, RING_SECONDS = 1.2;

// 포인터 좌표를 캔버스 전체 기준 -1~1 좌표로 바꾼다. setViewOffset을 쓴 카메라도 이 좌표로 그대로 쏘면 된다.
export const toNdc = (clientX, clientY, rect) => ({
  x: ((clientX - rect.left) / rect.width) * 2 - 1,
  y: -(((clientY - rect.top) / rect.height) * 2 - 1),
});

export const easeInOut = u => { const t = Math.min(1, Math.max(0, u)); return t * t * (3 - 2 * t); };

// 눌렀다 뗀 것이 끌기가 아니고 앞선 탭과 가까우면 두 번 탭이다.
export function createTapTracker({ ms, px, dragPx } = DOUBLE_TAP) {
  let down = null, last = null;
  return {
    press(x, y) { down = { x, y }; },
    // 뗄 때 불러 두 번 탭이면 true를 돌려준다. 세 번째 탭이 다시 두 번 탭이 되지 않게 기록을 비운다.
    release(x, y, time) {
      const from = down;
      down = null;
      if (!from || Math.hypot(x - from.x, y - from.y) > dragPx) { last = null; return false; }
      const hit = !!last && time - last.time <= ms && Math.hypot(x - last.x, y - last.y) <= px;
      last = hit ? null : { x, y, time };
      return hit;
    },
  };
}

// 화면 위 사각형 목록 중 한 곳이라도 점을 덮으면 true. 이름표 위를 누른 것은 무시한다.
export const coveredBy = (rects, x, y) => rects.some(r => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);

// three는 화면에서만 필요하므로 부를 때 받는다.
export function setupPivot(THREE, { dom, camera, controls, targets, invalidate, scene }) {
  const ray = new THREE.Raycaster(), tracker = createTapTracker();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.72, 1, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, depthTest: false, fog: false, side: THREE.DoubleSide }),
  );
  ring.visible = false;
  ring.renderOrder = 20;
  ring.frustumCulled = false;
  scene.add(ring);

  const fresh = () => targets().filter(m => m.visible !== false && (!m.parent || m.parent.visible !== false)).map(m => {
    // 높이가 계속 바뀌는 지형은 경계가 낡으면 광선이 빗나간다.
    m.geometry.computeBoundingSphere();
    m.geometry.computeBoundingBox();
    m.updateWorldMatrix(true, false);
    return m;
  });
  const pick = (clientX, clientY) => {
    camera.updateMatrixWorld();
    ray.setFromCamera(toNdc(clientX, clientY, dom.getBoundingClientRect()), camera);
    return ray.intersectObjects(fresh(), false)[0]?.point ?? null;
  };
  // 그 자리 지형 높이(검사용): 위에서 곧장 아래로 쏜다.
  const surfaceAt = (x, z) => {
    ray.set(new THREE.Vector3(x, 1e5, z), new THREE.Vector3(0, -1, 0));
    return ray.intersectObjects(fresh(), false)[0]?.point.y ?? null;
  };

  let move = null, frameId = 0;
  const step = now => {
    frameId = 0;
    if (move) {
      // 그사이 시점 버튼을 눌렀으면 그 시점을 따른다.
      if (controls.target.distanceToSquared(move.now) > 1e-6) move = null;
      else {
        const u = (now - move.start) / (MOVE_SECONDS * 1000);
        controls.target.lerpVectors(move.from, move.to, easeInOut(u));
        move.now.copy(controls.target);
        controls.update();
        move.now.copy(controls.target);
        if (u >= 1) move = null;
      }
    }
    if (ring.visible) {
      const u = (now - ring.userData.start) / (RING_SECONDS * 1000);
      if (u >= 1) ring.visible = false;
      else {
        ring.material.opacity = 1 - easeInOut(u) * 0.9;
        ring.scale.setScalar(ring.userData.size * (0.8 + 0.4 * easeInOut(u * 2)));
      }
    }
    invalidate();
    if (move || ring.visible) frameId = requestAnimationFrame(step);
  };
  const go = point => {
    const now = performance.now();
    move = { from: controls.target.clone(), to: point.clone(), now: controls.target.clone(), start: now };
    ring.position.copy(point);
    ring.userData = { start: now, size: camera.position.distanceTo(point) * 0.022 };
    ring.visible = true;
    if (!frameId) frameId = requestAnimationFrame(step);
  };

  const blocked = (x, y) => {
    if (document.body.classList.contains('show-map')) return true;
    const rects = [...document.querySelectorAll('#labels .label')].filter(e => e.style.display !== 'none').map(e => e.querySelector('b').getBoundingClientRect());
    return coveredBy(rects, x, y);
  };
  const tryAt = (x, y) => {
    if (blocked(x, y)) return false;
    const point = pick(x, y);
    if (point) go(point);
    return !!point;
  };

  let lastFired = -1e9;
  dom.addEventListener('dblclick', e => {
    // 터치는 아래 두 번 탭이 이미 처리했을 수 있다.
    if (performance.now() - lastFired > 500) tryAt(e.clientX, e.clientY);
  });
  dom.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') tracker.press(e.clientX, e.clientY); });
  dom.addEventListener('pointerup', e => {
    if (e.pointerType === 'mouse') return;
    if (tracker.release(e.clientX, e.clientY, performance.now())) { lastFired = performance.now(); tryAt(e.clientX, e.clientY); }
  });

  return { pick, surfaceAt, get moving() { return !!move; } };
}
