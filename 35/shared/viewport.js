export const isPhone = () => innerWidth <= 820;

// 세로로 긴 화면에서는 지형이 다 들어오도록 카메라를 뒤로 뺀다.
export const portraitZoom = () => {
  const a = innerWidth / innerHeight;
  return a < 1 ? Math.min(2.2, 0.95 / a) : 1;
};
