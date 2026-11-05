// 높이 과장: 낮은 땅은 지정 배율로 키우고, 산은 덜 키워 형태를 지킨다.
export const LOW_LAND_TOP = 220;

export function createHeightScale(initial = 3, top = LOW_LAND_TOP) {
  let k = initial;
  return {
    apply: h => (h <= top ? h * k : top * k + (h - top) * (1 + (k - 1) * 0.25)),
    get factor() { return k; },
    set(v) { k = v; },
  };
}
