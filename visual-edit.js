// © 2026 김용현
// 미리보기에서 직접 수정 — 원본 코드의 요소 위치를 기록하고, 고친 요소의 구간만 바꿔 끼운다.
// 화면(iframe)과는 data-hpe="번호" 로 같은 요소를 가리킨다. 번호는 다시 매기지 않는다.
(() => {
  'use strict';
  const PARSE5 = 'https://cdn.jsdelivr.net/npm/parse5@7.1.2/+esm';
  const NO_DESCEND = new Set(['script', 'style', 'template', 'svg', 'math', 'noscript', 'textarea', 'iframe']);

  let parse = null;
  async function load() {
    if (!parse) parse = (await import(PARSE5)).parse;
    return parse;
  }

  // src → { html: data-hpe 가 붙은 문자열, map: { 번호: 원본 오프셋 } }
  function instrument(src, parseFn = parse) {
    const doc = parseFn(src, { sourceCodeLocationInfo: true });
    const htmlEl = doc.childNodes.find((n) => n.tagName === 'html');
    const body = htmlEl && htmlEl.childNodes.find((n) => n.tagName === 'body');
    const map = {};
    const inserts = []; // [오프셋, 번호]
    let next = 1;
    const walk = (node) => {
      for (const ch of node.childNodes || []) {
        if (!ch.tagName) continue;
        const loc = ch.sourceCodeLocation;
        if (loc && loc.startTag) {
          const id = next++;
          const st = loc.startTag;
          const attrs = {};
          for (const [k, v] of Object.entries(st.attrs || {})) attrs[k] = { s: v.startOffset, e: v.endOffset };
          map[id] = {
            tag: ch.tagName,
            start: loc.startOffset, end: loc.endOffset,
            tagEnd: st.endOffset,
            cStart: st.endOffset,
            cEnd: loc.endTag ? loc.endTag.startOffset : loc.endOffset,
            attrs,
          };
          inserts.push([st.endOffset - 1, id]); // 시작 태그의 마지막 '>' 바로 앞
        }
        if (!NO_DESCEND.has(ch.tagName)) walk(ch);
      }
    };
    if (body) walk(body);
    let html = src;
    for (let i = inserts.length - 1; i >= 0; i--) {
      const [at, id] = inserts[i];
      html = html.slice(0, at) + ` data-hpe="${id}"` + html.slice(at);
    }
    return { html, map };
  }

  // 원본 [a, b) 가 len 글자로 바뀐 뒤 오프셋 맞추기 — 구간 안에 든 요소·속성은 지운다
  function shift(map, a, b, len) {
    const d = len - (b - a);
    const f = (o) => (o >= b ? o + d : o);
    for (const [id, m] of Object.entries(map)) {
      if (m.start >= a && m.end <= b) { delete map[id]; continue; }
      for (const k of ['start', 'end', 'tagEnd', 'cStart', 'cEnd']) m[k] = f(m[k]);
      for (const [name, r] of Object.entries(m.attrs)) {
        if (r.s >= a && r.e <= b) delete m.attrs[name];
        else { r.s = f(r.s); r.e = f(r.e); }
      }
    }
  }

  function splice(src, a, b, text) { return src.slice(0, a) + text + src.slice(b); }

  // 요소 안쪽을 바꿈 → 새 원본 (map 도 맞춰 둠). 없는 번호면 null.
  function applyInner(src, map, id, inner) {
    const m = map[id];
    if (!m || m.cEnd < m.cStart) return null;
    const out = splice(src, m.cStart, m.cEnd, inner);
    shift(map, m.cStart, m.cEnd, inner.length);
    return out;
  }

  const escAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

  // 속성 하나를 바꾸거나 더함 → 새 원본
  function applyAttr(src, map, id, name, value) {
    const m = map[id];
    if (!m) return null;
    const text = `${name}="${escAttr(value)}"`;
    const r = m.attrs[name];
    let a, b, ins;
    if (r) { a = r.s; b = r.e; ins = text; }
    else { a = b = m.tagEnd - 1; ins = ' ' + text; }
    const out = splice(src, a, b, ins);
    shift(map, a, b, ins.length);
    const off = r ? 0 : 1;
    m.attrs[name] = { s: a + off, e: a + ins.length };
    return out;
  }

  const SKIP = new Set(['script', 'style', 'noscript', 'template']); // 이 안에 커서가 있으면 바깥 요소로

  // 글자 위치 pos 를 감싼 가장 안쪽 요소까지의 경로 — 각 단계의 자식 요소 순번 (document.children[0] = html 부터)
  // 브라우저도 같은 규칙으로 읽으므로 미리보기 DOM 에서 같은 요소를 찾는다 (스크립트가 앞쪽을 바꾸지 않았다면)
  let cached = { src: null, doc: null };
  function pathAt(src, pos) {
    if (cached.src !== src) cached = { src, doc: parse(src, { sourceCodeLocationInfo: true }) };
    const has = (n) => {
      const l = n.sourceCodeLocation;
      if (l && l.startTag) return pos >= l.startOffset && pos <= l.endOffset;
      return (n.childNodes || []).some((c) => c.tagName && has(c)); // 시작 태그가 생략된 요소(tbody 등)
    };
    const path = [];
    let node = cached.doc;
    for (;;) {
      const kids = (node.childNodes || []).filter((c) => c.tagName);
      const i = kids.findIndex(has);
      if (i < 0 || SKIP.has(kids[i].tagName)) break;
      path.push(i);
      node = kids[i];
      if (NO_DESCEND.has(node.tagName)) break;
    }
    return path;
  }

  globalThis.HPVE = { load, ready: () => !!parse, instrument, applyInner, applyAttr, shift, pathAt };
})();
