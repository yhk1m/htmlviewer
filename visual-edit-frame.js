// © 2026 김용현
// 미리보기 안에서 도는 직접 수정 스크립트 — 편집기(index.html)가 srcdoc 끝에 끼워 넣는다.
// 원본 코드에서 온 요소에만 data-hpe="번호" 가 붙어 있고, 고친 결과는 postMessage 로 편집기에 보낸다.
(() => {
  'use strict';
  const INLINE = new Set(['a', 'b', 'i', 'u', 's', 'em', 'strong', 'small', 'sub', 'sup', 'mark', 'code', 'abbr', 'time', 'font', 'q', 'cite', 'kbd', 'var', 'span', 'label']);
  const VOID = new Set(['img', 'br', 'hr', 'input', 'video', 'audio', 'canvas', 'iframe', 'embed', 'object', 'select', 'textarea', 'svg', 'math']);
  const post = (msg) => parent.postMessage({ hpve: 1, ...msg }, '*');

  // ---------- 화면 표시 ----------
  const css = document.createElement('style');
  css.textContent = `
    [data-hpe-hover] { outline: 1px dashed rgba(0,0,0,.5) !important; outline-offset: 2px !important; cursor: text !important; }
    [data-hpe-hover="lock"] { outline-color: #c0392b !important; cursor: not-allowed !important; }
    [data-hpe-hover="img"] { cursor: pointer !important; }
    [data-hpe][contenteditable] { outline: 2px solid #111 !important; outline-offset: 2px !important; cursor: text !important; }
    img[data-hpe-pick] { outline: 2px solid #111 !important; outline-offset: 2px !important; }`;
  document.head.append(css);

  const host = document.createElement('hpve-bar');
  host.style.cssText = 'all: initial; position: fixed; left: 50%; bottom: 12px; transform: translateX(-50%); z-index: 2147483647;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    :host { all: initial; }
    .bar { display: flex; align-items: center; gap: 4px; padding: 6px 8px; background: #111; color: #fff; border-radius: 2px;
      font: 13px/1.2 Pretendard, system-ui, sans-serif; box-shadow: 0 4px 16px rgba(0,0,0,.25); white-space: nowrap; max-width: calc(100vw - 24px); overflow-x: auto; }
    button { all: unset; cursor: pointer; padding: 5px 9px; border-radius: 2px; color: #fff; font: inherit; }
    button:hover { background: #333; }
    .sep { width: 1px; align-self: stretch; background: #444; margin: 2px 4px; }
    .msg { padding: 0 6px; color: #ccc; }
    .msg.warn { color: #ffb4a8; }
    input[type=text] { font: inherit; padding: 4px 6px; border: 1px solid #555; background: #222; color: #fff; border-radius: 2px; width: 220px; }
    input[type=color] { width: 26px; height: 22px; padding: 0; border: 0; background: none; cursor: pointer; }
    [hidden] { display: none !important; }
  </style>
  <div class="bar">
    <span class="msg" id="msg">글자나 그림을 누르면 바로 고칠 수 있어요</span>
    <span id="fmt" hidden style="display:contents">
      <button data-cmd="bold" title="굵게"><b>B</b></button>
      <button data-cmd="italic" title="기울임"><i>I</i></button>
      <button data-cmd="underline" title="밑줄"><u>U</u></button>
      <span class="sep"></span>
      <button data-size="2" title="작게">작게</button>
      <button data-size="3" title="보통">보통</button>
      <button data-size="5" title="크게">크게</button>
      <button data-size="6" title="아주 크게">아주 크게</button>
      <span class="sep"></span>
      <input type="color" id="color" title="글자색" value="#c0392b">
      <button id="btnLink" title="링크">링크</button>
      <button data-cmd="removeFormat" title="서식 지우기">서식 지우기</button>
      <span id="linkBox" hidden style="display:contents"><input type="text" id="linkUrl" placeholder="https://"><button id="linkOk">넣기</button></span>
    </span>
    <span id="imgBox" hidden style="display:contents">
      <input type="text" id="imgUrl" placeholder="그림 주소 (https://…)">
      <button id="imgOk">바꾸기</button>
      <button id="imgFile">파일에서…</button>
      <button id="imgClose">닫기</button>
      <input type="file" id="file" accept="image/*" hidden>
    </span>
  </div>`;
  document.documentElement.append(host);
  const $ = (id) => root.getElementById(id);
  const HINT = '글자나 그림을 누르면 바로 고칠 수 있어요';
  function say(text, warn) { const m = $('msg'); m.textContent = text; m.classList.toggle('warn', !!warn); m.hidden = !text; }
  function mode(m) { // 'idle' | 'text' | 'img'
    $('fmt').hidden = m !== 'text';
    $('imgBox').hidden = m !== 'img';
    $('linkBox').hidden = true;
    if (m === 'idle') say(HINT); else say('');
  }

  // ---------- 고칠 요소 찾기 ----------
  function candidate(t) {
    let el = t && (t.nodeType === 1 ? t : t.parentElement);
    if (!el || host.contains(el)) return null;
    if (editing && editing.contains(el)) return editing;
    el = el.closest('[data-hpe]');
    while (el && INLINE.has(el.localName)) {
      const up = el.parentElement && el.parentElement.closest('[data-hpe]');
      if (!up || up === document.body) break;
      el = up;
    }
    if (!el || el === document.body || el === document.documentElement) return null;
    return el;
  }
  // 스크립트가 만든 요소(원본에 없는 것)가 들어 있으면 여기서 못 고침
  const locked = (el) => [...el.querySelectorAll('*')].some((d) =>
    !d.hasAttribute('data-hpe') && !d.hasAttribute('data-hpe-x') && !(d.parentElement && d.parentElement.closest('svg, math')));
  const kind = (el) => (el.localName === 'img' && el.hasAttribute('data-hpe') ? 'img' : VOID.has(el.localName) ? null : locked(el) ? 'lock' : 'text');

  function clean(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('*').forEach((d) => {
      for (const a of [...d.attributes]) if (a.name.startsWith('data-hpe') || a.name === 'contenteditable') d.removeAttribute(a.name);
    });
    return c.innerHTML;
  }

  // ---------- 마우스 올림 표시 ----------
  let hovered = null;
  function setHover(el) {
    if (hovered === el) return;
    if (hovered) hovered.removeAttribute('data-hpe-hover');
    hovered = el;
    if (!el || el === editing) return;
    const k = kind(el);
    if (k) el.setAttribute('data-hpe-hover', k === 'text' ? '' : k);
  }
  document.addEventListener('mouseover', (e) => setHover(candidate(e.target)), true);
  document.addEventListener('mouseleave', () => setHover(null));

  // ---------- 글자 고치기 ----------
  let editing = null, last = '', timer = 0;
  function commit() {
    clearTimeout(timer);
    if (!editing) return;
    const now = clean(editing);
    if (now === last) return;
    last = now;
    post({ type: 'inner', id: editing.getAttribute('data-hpe'), html: now });
    // 안쪽 요소는 이제 이 요소의 일부 — 편집기 쪽 기록에서도 지워졌다
    editing.querySelectorAll('*').forEach((d) => { d.removeAttribute('data-hpe'); d.setAttribute('data-hpe-x', ''); });
  }
  function startEdit(el) {
    stopEdit();
    closeImg();
    setHover(null);
    editing = el;
    last = clean(el);
    el.setAttribute('contenteditable', 'true');
    mode('text');
  }
  function stopEdit() {
    if (!editing) return;
    commit();
    editing.removeAttribute('contenteditable');
    editing = null;
    mode('idle');
  }
  document.addEventListener('input', (e) => {
    if (editing && editing.contains(e.target)) { clearTimeout(timer); timer = setTimeout(commit, 600); }
  }, true);
  document.addEventListener('focusout', (e) => {
    if (editing && e.target === editing && e.relatedTarget !== host) stopEdit();
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editing) { e.preventDefault(); editing.blur(); stopEdit(); }
  }, true);

  document.addEventListener('mousedown', (e) => {
    if (host.contains(e.target) || e.composedPath().includes(host)) return;
    const el = candidate(e.target);
    if (el && el === editing) return;
    if (!el) { stopEdit(); closeImg(); return; }
    const k = kind(el);
    if (k === 'text') startEdit(el);
    else if (k === 'img') { e.preventDefault(); openImg(el); }
    else if (k === 'lock') { stopEdit(); closeImg(); say('스크립트가 만든 부분이라 여기서는 못 고쳐요. 왼쪽 코드에서 고쳐 주세요.', true); }
  }, true);
  // 편집하는 동안 링크 이동·폼 제출·페이지 자체 클릭 동작은 막음
  document.addEventListener('click', (e) => {
    if (e.composedPath().includes(host)) return;
    if (e.target.closest && e.target.closest('a[href], [data-hpe][contenteditable], img[data-hpe]')) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  document.addEventListener('submit', (e) => e.preventDefault(), true);

  // ---------- 서식 막대 ----------
  let saved = null;
  // 굵게·기울임·밑줄은 <b><i><u> 태그로, 색·크기만 style 로
  const exec = (cmd, value, css = false) => { document.execCommand('styleWithCSS', false, css); document.execCommand(cmd, false, value); };
  const keep = () => { const s = getSelection(); if (s.rangeCount && editing && editing.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); };
  const restore = () => { if (!editing) return; editing.focus(); if (saved) { const s = getSelection(); s.removeAllRanges(); s.addRange(saved); } };
  document.addEventListener('selectionchange', keep);
  root.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !editing) return;
    if (b.dataset.cmd) { restore(); exec(b.dataset.cmd); if (b.dataset.cmd === 'removeFormat') exec('unlink'); }
    else if (b.dataset.size) { restore(); exec('fontSize', b.dataset.size, true); }
    else return;
    commit();
  });
  $('color').addEventListener('input', (e) => { restore(); exec('foreColor', e.target.value, true); commit(); });
  $('btnLink').addEventListener('click', () => { $('linkBox').hidden = !$('linkBox').hidden; if (!$('linkBox').hidden) $('linkUrl').focus(); });
  const putLink = () => {
    const url = $('linkUrl').value.trim();
    restore();
    if (url) exec('createLink', url); else exec('unlink');
    $('linkBox').hidden = true; $('linkUrl').value = '';
    commit();
  };
  $('linkOk').addEventListener('click', putLink);
  $('linkUrl').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); putLink(); } });

  // ---------- 그림 바꾸기 ----------
  let picked = null;
  function openImg(img) {
    stopEdit();
    closeImg();
    picked = img;
    img.setAttribute('data-hpe-pick', '');
    mode('img');
    $('imgUrl').value = img.getAttribute('src') && !img.getAttribute('src').startsWith('data:') ? img.getAttribute('src') : '';
  }
  function closeImg() {
    if (!picked) return;
    picked.removeAttribute('data-hpe-pick');
    picked = null;
    if (!editing) mode('idle');
  }
  function setSrc(value) {
    if (!picked) return;
    picked.src = value;
    post({ type: 'attr', id: picked.getAttribute('data-hpe'), name: 'src', value });
  }
  $('imgOk').addEventListener('click', () => { const v = $('imgUrl').value.trim(); if (v) { setSrc(v); closeImg(); } });
  $('imgUrl').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('imgOk').click(); } });
  $('imgClose').addEventListener('click', closeImg);
  $('imgFile').addEventListener('click', () => $('file').click());
  $('file').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const url = await shrink(f);
      setSrc(url);
      closeImg();
      if (url.length > 1.5e6) say('그림이 커서 배포가 안 될 수도 있어요. 더 작은 그림을 권해요.', true);
    } catch { say('그림을 읽지 못했어요.', true); }
  });
  const read = (f) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); });
  // 긴 변 1600px 로 줄여 코드 안에 넣음 (움직이는 GIF·SVG 는 그대로)
  async function shrink(f) {
    const raw = await read(f);
    if (/image\/(gif|svg)/.test(f.type)) return raw;
    const im = new Image();
    await new Promise((ok, no) => { im.onload = ok; im.onerror = no; im.src = raw; });
    const r = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * r); c.height = Math.round(im.naturalHeight * r);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    let out = c.toDataURL('image/webp', 0.85);
    if (!out.startsWith('data:image/webp')) out = c.toDataURL(f.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85);
    return out.length < raw.length ? out : raw;
  }

  mode('idle');
})();
