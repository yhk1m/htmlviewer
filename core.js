/* 편집기(index.html)와 관리자(admin.html)가 함께 쓰는 공통 로직 — GitHub 직접 연결은 관리자만 쓴다 */
window.HP = (() => {
  'use strict';
  const KEYS = { cfg: 'hp.config', token: 'hp.token' };

  // ---------- storage (예외에 안전하게) ----------
  const safe = (area) => ({
    get(k) { try { return window[area].getItem(k); } catch { return null; } },
    set(k, v) { try { window[area].setItem(k, v); } catch {} },
    del(k) { try { window[area].removeItem(k); } catch {} },
  });
  const local = safe('localStorage');
  const session = safe('sessionStorage');

  // ---------- 설정 ----------
  function guessFromLocation() {
    const out = {};
    const host = location.hostname;
    const segs = location.pathname.split('/').filter(Boolean);
    if (host.endsWith('.github.io')) {
      out.owner = host.slice(0, -'.github.io'.length);
      out.repo = segs.length && !segs[0].includes('.') ? segs[0] : host;
    }
    return out;
  }
  const site = window.HP_CONFIG || {}; // config.js
  let cfg = { branch: 'main', ...guessFromLocation() };
  for (const k of ['owner', 'repo', 'branch', 'baseUrl']) if (site[k]) cfg[k] = site[k];
  try { Object.assign(cfg, JSON.parse(local.get(KEYS.cfg) || '{}')); } catch {}

  // 관리자 페이지가 중계 서버 주소에서 열리면 GitHub 요청을 서버(/api/gh)가 대신 보낸다 — 토큰 대신 로그인
  const viaRelay = Boolean(window.HP_ADMIN_RELAY);
  const getToken = () => session.get(KEYS.token) || local.get(KEYS.token) || '';
  const branch = () => (cfg.branch || 'main').trim();
  const ready = () => viaRelay || Boolean(cfg.owner && cfg.repo && getToken());

  function baseUrl() {
    let b = (cfg.baseUrl || site.baseUrl || '').trim();
    if (!b && location.protocol.startsWith('http') && location.hostname.endsWith('.github.io')) {
      b = location.origin + location.pathname.replace(/[^/]*$/, '');
    }
    if (!b && cfg.owner && cfg.repo) {
      const userSite = cfg.repo.toLowerCase() === `${cfg.owner}.github.io`.toLowerCase();
      b = userSite ? `https://${cfg.owner}.github.io/` : `https://${cfg.owner}.github.io/${cfg.repo}/`;
    }
    if (b && !b.endsWith('/')) b += '/';
    return b;
  }
  const pageUrl = (n) => baseUrl() + n + '/';

  // ---------- 인코딩 (UTF-8 안전) ----------
  function b64encode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64decode(b64) {
    const bin = atob(b64.replace(/\s/g, ''));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }

  // ---------- GitHub API ----------
  async function gh(path, opts = {}) {
    const url = viaRelay
      ? `/api/gh?p=${encodeURIComponent(path)}`
      : `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}${path}`;
    const res = await fetch(url, {
      ...opts,
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/vnd.github+json',
        ...(viaRelay ? {} : { Authorization: `Bearer ${getToken()}`, 'X-GitHub-Api-Version': '2022-11-28' }),
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    if (!res.ok) {
      let msg = '';
      try { msg = (await res.json()).message || ''; } catch {}
      const err = new Error(msg || res.statusText);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }
  const refQ = () => `?ref=${encodeURIComponent(branch())}`;

  /** 루트의 숫자 폴더 번호들 (오름차순) */
  async function listNumbers() {
    let items;
    try { items = await gh(`/contents${refQ()}`); }
    catch (e) { if (e.status === 404 && /empty/i.test(e.message)) return []; throw e; }
    return items.filter((i) => i.type === 'dir' && /^\d+$/.test(i.name)).map((i) => Number(i.name)).sort((a, b) => a - b);
  }

  async function getFile(n) {
    const r = await gh(`/contents/${n}/index.html${refQ()}`);
    let text;
    if (r.content && r.encoding === 'base64') text = b64decode(r.content);
    else text = b64decode((await gh(`/git/blobs/${r.sha}`)).content); // 1MB 넘는 파일
    return { text, sha: r.sha };
  }

  function putFile(n, html, sha) {
    return gh(`/contents/${n}/index.html`, {
      method: 'PUT',
      body: JSON.stringify({
        message: sha ? `Update page ${n}` : `Deploy page ${n}`,
        content: b64encode(html),
        branch: branch(),
        ...(sha ? { sha } : {}),
      }),
    });
  }

  async function deleteFile(n) {
    const meta = await gh(`/contents/${n}/index.html${refQ()}`);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await gh(`/contents/${n}/index.html`, {
          method: 'DELETE',
          body: JSON.stringify({ message: `Delete page ${n}`, sha: meta.sha, branch: branch() }),
        });
      } catch (e) {
        if (e.status === 409 && attempt < 2) { await sleep(1000); continue; }
        throw e;
      }
    }
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Pages에 실제로 반영될 때까지 기다림. 반영되면 true */
  async function waitLive(n, html, timeoutMs = 180000) {
    const url = pageUrl(n);
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await sleep(5000);
      try {
        const r = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
        if (r.ok && (await r.text()) === html) return true;
      } catch {}
    }
    return false;
  }

  /** 배포된 페이지의 <title>. 아직 반영 안 됐으면 null */
  async function fetchTitle(n) {
    try {
      const r = await fetch(pageUrl(n), { cache: 'no-store' });
      if (!r.ok) return null;
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      return doc.title.trim();
    } catch { return null; }
  }

  function errorText(e) {
    const hints = {
      401: '토큰이 올바르지 않거나 만료됐어요.',
      403: '토큰에 이 저장소의 Contents 쓰기 권한이 없어요.',
      404: '저장소·브랜치·파일을 찾을 수 없어요. 이름과 토큰의 저장소 범위를 확인하세요.',
    };
    return `${hints[e.status] || '오류가 났어요.'} (${e.status || ''} ${e.message})`.replace('( ', '(');
  }

  /** 상태 줄 표시. url을 주면 링크와 복사 버튼을 붙임 */
  function setStatus(el, text, kind = '', url = '') {
    el.className = `status ${kind}`.trim();
    el.textContent = '';
    const span = document.createElement('span');
    span.textContent = text;
    el.append(span);
    if (url) {
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = url;
      el.append(a, copyButton(url));
    }
  }

  function copyButton(text, label = '복사') {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'small'; b.textContent = label;
    b.onclick = async () => {
      try { await navigator.clipboard.writeText(text); b.textContent = '복사됨'; }
      catch { b.textContent = '복사 실패'; }
      setTimeout(() => (b.textContent = label), 1500);
    };
    return b;
  }

  // ---------- 설정 대화상자 (처음 열 때 페이지에 붙임) ----------
  const listeners = [];
  const onConfigChange = (fn) => listeners.push(fn);
  let dlg = null;

  function buildSettings() {
    dlg = document.createElement('dialog');
    dlg.innerHTML = `
      <form id="hpSettingsForm">
        <div class="dlg-head"><h2>GitHub 연결 설정</h2></div>
        <div class="dlg-body">
          <div class="grid2">
            <label class="field">계정(owner)<input type="text" name="owner" placeholder="my-id" required></label>
            <label class="field">저장소(repo)<input type="text" name="repo" placeholder="html" required></label>
          </div>
          <div class="grid2">
            <label class="field">브랜치<input type="text" name="branch" placeholder="main"></label>
            <label class="field">배포 주소(비우면 자동)<input type="url" name="baseUrl"></label>
          </div>
          <label class="field">토큰(Fine-grained, Contents: Read and write)
            <input type="password" name="token" placeholder="github_pat_…" autocomplete="off">
          </label>
          <label class="check"><input type="checkbox" name="remember"> 이 브라우저에 토큰 기억하기</label>
          <p class="hint">끄면 탭을 닫을 때 토큰이 지워져요. 공용 컴퓨터에서는 꺼 두세요.</p>
          <p class="hint" data-msg></p>
        </div>
        <div class="dlg-foot">
          <button type="button" data-close>닫기</button>
          <button type="submit" class="primary">저장하고 확인</button>
        </div>
      </form>`;
    document.body.append(dlg);
    const form = dlg.querySelector('form');
    const msg = dlg.querySelector('[data-msg]');
    dlg.querySelector('[data-close]').onclick = () => dlg.close();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = form.elements;
      cfg = {
        owner: f.owner.value.trim(),
        repo: f.repo.value.trim(),
        branch: f.branch.value.trim() || 'main',
        baseUrl: f.baseUrl.value.trim(),
      };
      local.set(KEYS.cfg, JSON.stringify(cfg));
      const token = f.token.value.trim();
      session.del(KEYS.token); local.del(KEYS.token);
      if (token) (f.remember.checked ? local : session).set(KEYS.token, token);

      if (!ready()) { msg.className = 'hint err'; msg.textContent = '계정·저장소·토큰을 모두 입력해 주세요.'; return; }
      msg.className = 'hint'; msg.textContent = '연결 확인 중…';
      try {
        const repo = await gh('');
        if (repo.permissions && !repo.permissions.push) throw Object.assign(new Error('쓰기 권한 없음'), { status: 403 });
        await gh(`/branches/${encodeURIComponent(branch())}`);
        msg.className = 'hint ok';
        msg.textContent = `연결됐어요. 배포 주소: ${baseUrl()}번호/`;
        listeners.forEach((fn) => fn());
        setTimeout(() => dlg.close(), 900);
      } catch (err) {
        msg.className = 'hint err';
        msg.textContent = errorText(err);
      }
    });
  }

  function openSettings() {
    if (!dlg) buildSettings();
    const f = dlg.querySelector('form').elements;
    f.owner.value = cfg.owner || '';
    f.repo.value = cfg.repo || '';
    f.branch.value = cfg.branch || 'main';
    f.baseUrl.value = cfg.baseUrl || '';
    f.baseUrl.placeholder = baseUrl() || 'https://my-id.github.io/html/';
    f.token.value = getToken();
    f.remember.checked = Boolean(local.get(KEYS.token));
    const msg = dlg.querySelector('[data-msg]');
    msg.textContent = ''; msg.className = 'hint';
    dlg.showModal();
  }

  /** 준비 안 됐으면 설정 열고 true */
  function needSetup() {
    if (ready()) return false;
    openSettings();
    return true;
  }

  /** textarea에서 Tab 키로 공백 2칸 */
  function enableTab(textarea) {
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        textarea.setRangeText('  ', textarea.selectionStart, textarea.selectionEnd, 'end');
        textarea.dispatchEvent(new Event('input'));
      }
    });
  }

  return {
    local, session,
    get cfg() { return cfg; }, viaRelay,
    getToken, ready, baseUrl, pageUrl,
    gh, listNumbers, getFile, putFile, deleteFile, waitLive, fetchTitle,
    b64encode, b64decode, sleep,
    errorText, setStatus, copyButton,
    openSettings, needSetup, onConfigChange, enableTab,
  };
})();
