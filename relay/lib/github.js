// © 2026 김용현
// 중계 서버 공통 로직 — 토큰은 서버 환경변수에만 있고, 수강생 브라우저에는 가지 않는다
import { createHmac, timingSafeEqual } from 'node:crypto';

const env = (k, d = '') => (process.env[k] || d).trim();
const OWNER = () => env('GITHUB_OWNER', 'yhk1m');
const REPO = () => env('GITHUB_REPO', 'htmlviewer');
const BRANCH = () => env('GITHUB_BRANCH', 'main');
export const MAX_BYTES = Number(env('MAX_BYTES', '2000000'));

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (base) => base + Math.floor(Math.random() * base);

// ---------- CORS ----------
/** 허용된 출처면 CORS 헤더를 붙이고 true. OPTIONS 요청은 여기서 끝낸다 */
export function cors(req, res) {
  const allowed = env('ALLOWED_ORIGINS', 'https://html.bgnl.kr,https://yhk1m.github.io').split(',').map((s) => s.trim());
  const origin = req.headers.origin || '';
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') { res.status(204).end(); return false; }
  if (!allowed.includes(origin)) { send(res, 403, { error: '허용되지 않은 곳에서 온 요청이에요.' }); return false; }
  if (req.method !== 'POST') { send(res, 405, { error: 'POST만 받아요.' }); return false; }
  return true;
}

export const send = (res, status, body) => res.status(status).json(body);

/** 요청 본문 검사. 문제가 있으면 응답하고 null */
export function readBody(req, res) {
  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};
  const code = env('DEPLOY_CODE');
  if (code && body.code !== code) { send(res, 401, { error: 'code', message: '강의 코드가 필요해요.' }); return null; }
  if (typeof body.html !== 'string' || !body.html.trim()) { send(res, 400, { error: 'HTML이 비어 있어요.' }); return null; }
  if (Buffer.byteLength(body.html, 'utf8') > MAX_BYTES) {
    send(res, 413, { error: `HTML이 너무 커요. (최대 ${Math.round(MAX_BYTES / 1e6)}MB)` });
    return null;
  }
  return body;
}
function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }

// ---------- 덮어쓰기 키 ----------
// 키 = HMAC(번호:현재 파일 sha). 서버에 저장할 것이 없고, 다른 사람이 고치거나
// 지운 뒤 같은 번호가 재사용되면 sha가 달라져 예전 키는 저절로 무효가 된다.
export function editKey(n, sha) {
  const secret = env('EDIT_SECRET');
  if (!secret) throw new Error('EDIT_SECRET 환경변수가 없어요.');
  return createHmac('sha256', secret).update(`${n}:${sha}`).digest('base64url');
}
export function keyMatches(n, sha, key) {
  const want = Buffer.from(editKey(n, sha));
  const got = Buffer.from(String(key || ''));
  return want.length === got.length && timingSafeEqual(want, got);
}

// ---------- GitHub API ----------
export async function gh(path, opts = {}) {
  const token = env('GITHUB_TOKEN');
  if (!token) throw Object.assign(new Error('GITHUB_TOKEN 환경변수가 없어요.'), { status: 500 });
  const res = await fetch(`https://api.github.com/repos/${OWNER()}/${REPO()}${path}`, {
    ...opts,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'htmlviewer-relay',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) {
    let msg = '';
    try { msg = (await res.json()).message || ''; } catch {}
    throw Object.assign(new Error(msg || res.statusText), { status: res.status });
  }
  return res.json();
}
const refQ = () => `?ref=${encodeURIComponent(BRANCH())}`;

export async function listNumbers() {
  let items;
  try { items = await gh(`/contents${refQ()}`); }
  catch (e) { if (e.status === 404) return []; throw e; }
  return items.filter((i) => i.type === 'dir' && /^\d+$/.test(i.name)).map((i) => Number(i.name));
}

export async function currentSha(n) {
  try { return (await gh(`/contents/${n}/index.html${refQ()}`)).sha; }
  catch (e) { if (e.status === 404) return null; throw e; }
}

export async function putFile(n, html, sha) {
  const r = await gh(`/contents/${n}/index.html`, {
    method: 'PUT',
    body: JSON.stringify({
      message: sha ? `Update page ${n}` : `Deploy page ${n}`,
      content: Buffer.from(html, 'utf8').toString('base64'),
      branch: BRANCH(),
      ...(sha ? { sha } : {}),
    }),
  });
  return r.content.sha;
}

// ---------- 번호표 (counter.json) ----------
// 한 번 쓴 번호는 페이지를 지워도 다시 쓰지 않도록, 다음 번호를 저장소의 counter.json 에 적어 둔다.
// 관리자 페이지의 「1번부터 시작」은 이 파일을 { "next": 1 } 로 되돌린다.
const COUNTER = 'counter.json';

async function readCounter() {
  try {
    const r = await gh(`/contents/${COUNTER}${refQ()}`);
    const next = Number(JSON.parse(Buffer.from(r.content, 'base64').toString('utf8')).next);
    return { next: Number.isInteger(next) && next > 0 ? next : null, sha: r.sha };
  } catch (e) {
    if (e.status === 404) return { next: null, sha: null };
    throw e;
  }
}

/** 번호표에서 번호를 하나 받아 새 페이지를 만든다.
 *  번호표 갱신이 sha 잠금이라, 여러 명이 동시에 눌러도 같은 번호를 두 사람이 받지 않는다 */
export async function createPage(html) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const [{ next, sha }, nums] = await Promise.all([readCounter(), listNumbers()]);
    const taken = new Set(nums);
    let n = next || Math.max(0, ...nums) + 1;   // 번호표가 없으면 남은 최대 번호 다음부터
    while (taken.has(n)) n++;                    // 1번부터 다시 시작한 뒤 남아 있는 페이지 번호는 건너뜀
    try {
      await gh(`/contents/${COUNTER}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `Claim page ${n}`,
          content: Buffer.from(`${JSON.stringify({ next: n + 1 })}\n`).toString('base64'),
          branch: BRANCH(),
          ...(sha ? { sha } : {}),
        }),
      });
    } catch (e) {
      if (e.status === 409 || e.status === 422) { await sleep(jitter(300)); continue; } // 다른 사람이 먼저 받음
      throw e;
    }
    try {
      return { n, sha: await putFile(n, html) };
    } catch (e) {
      if (e.status === 422 || e.status === 409) continue; // 받은 번호를 못 쓰면 그 번호는 건너뛰고 다음 번호로
      throw e;
    }
  }
  throw Object.assign(new Error('지금 배포가 몰려 있어요. 잠시 뒤 다시 눌러 주세요.'), { status: 503 });
}

export function fail(res, e) {
  const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
  console.error(e);
  // GitHub 쪽 인증·권한 오류는 수강생 탓이 아니므로 서버 문제로 알린다
  const message = [401, 403, 404].includes(status) ? '배포 서버 설정에 문제가 있어요. 선생님께 알려 주세요.' : e.message;
  send(res, status === 401 || status === 403 || status === 404 ? 502 : status, { error: message });
}

// ---------- 관리자 로그인 ----------
// 비밀번호(ADMIN_PASSWORD)는 서버 환경변수에만 둔다. 로그인하면 서명된 쿠키를 주고,
// 관리자 페이지의 GitHub 요청은 서버 토큰으로 대신 보낸다 (브라우저에는 토큰이 없음).
const COOKIE = 'hv_admin';
const SESSION_SEC = 12 * 3600;
const sign = (v) => createHmac('sha256', `admin:${env('EDIT_SECRET')}`).update(v).digest('base64url');

export function passwordMatches(pw) {
  const want = Buffer.from(env('ADMIN_PASSWORD'));
  const got = Buffer.from(String(pw || ''));
  return want.length > 0 && want.length === got.length && timingSafeEqual(want, got);
}
export function sessionCookie() {
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_SEC);
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SEC}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
export function isAdmin(req) {
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  const want = Buffer.from(sign(exp));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}
