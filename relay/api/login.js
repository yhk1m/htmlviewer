// © 2026 김용현
// 관리자 로그인 — GET: 로그인 상태, POST { password }: 로그인, DELETE: 로그아웃
import { passwordMatches, sessionCookie, clearCookie, isAdmin, sleep, send } from '../lib/github.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return send(res, 200, { ok: isAdmin(req) });
  if (req.method === 'DELETE') { res.setHeader('Set-Cookie', clearCookie()); return send(res, 200, { ok: false }); }
  if (req.method !== 'POST') return send(res, 405, { error: '지원하지 않는 요청이에요.' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  if (!passwordMatches(body.password)) {
    await sleep(800); // 무작위 대입을 느리게
    return send(res, 401, { error: '비밀번호가 맞지 않아요.' });
  }
  res.setHeader('Set-Cookie', sessionCookie());
  send(res, 200, { ok: true });
}
