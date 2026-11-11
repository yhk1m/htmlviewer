// © 2026 김용현
// 라이트 모드와 다크 모드. 고른 모드는 이 브라우저에 기억한다(기본은 라이트).
// 페이지 head의 짧은 인라인 스크립트가 그리기 전에 html[data-theme]를 먼저 정하고, 이 모듈은 전환 버튼을 붙인다.
// 모드가 바뀌면 'themechange' 이벤트와 'resize' 이벤트를 보내, 3D 배경과 캔버스 그림이 다시 그려지게 한다.
import './credits.js';

const KEY = 'landform-theme';

export const getTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
export const isDark = () => getTheme() === 'dark';

// 3D 배경색: 라이트는 연회색, 다크는 예전의 어두운 색.
export const bg3d = () => (isDark() ? 0x20262a : 0xf1f1f1);

// 캔버스 그림(단면, 막대 그림 등)의 바탕과 글자 색.
export const figPalette = () => isDark()
  ? { bg: '#23302a', frame: '#3a4540', grid: '#3a4540', ink: '#efe9d8', sub: '#b9b8ae', hi: '#ffd36b' }
  : { bg: '#fafafa', frame: '#e2e2e2', grid: '#d9d9d9', ink: '#111111', sub: '#666666', hi: '#a8780a' };

export function setTheme(t) {
  document.documentElement.dataset.theme = t === 'dark' ? 'dark' : 'light';
  try { localStorage.setItem(KEY, getTheme()); } catch (e) { /* 저장이 막혀 있어도 화면은 바뀐다 */ }
  dispatchEvent(new CustomEvent('themechange', { detail: getTheme() }));
  dispatchEvent(new Event('resize'));
}

// 전환 버튼: 조작 창(#panel)이 있으면 '접기' 버튼 옆에, 없으면 화면 오른쪽 위에 둔다.
function mountButton() {
  if (document.querySelector('.theme-btn')) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'theme-btn';
  const label = () => {
    b.textContent = isDark() ? '라이트 모드' : '다크 모드';
    b.setAttribute('aria-label', isDark() ? '라이트 모드로 바꾸기' : '다크 모드로 바꾸기');
  };
  b.onclick = () => { setTheme(isDark() ? 'light' : 'dark'); label(); };
  label();
  const toggle = document.getElementById('panelToggle');
  if (toggle) { b.classList.add('in-panel'); toggle.parentNode.insertBefore(b, toggle); }
  else { b.classList.add('floating'); document.body.appendChild(b); }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountButton);
else mountButton();
