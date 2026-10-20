// © 2026 김용현
// 관리자 전용 GitHub 중계 — ?p=/contents/3/index.html 처럼 저장소 API 경로를 받아 서버 토큰으로 대신 보낸다
import { isAdmin, gh, send } from '../lib/github.js';

// 관리자 페이지가 쓰는 경로만 허용: 루트 목록, 번호 페이지, 큰 파일 blob, 브랜치 확인
const ALLOWED = /^\/(contents|contents\/\d+\/index\.html|git\/blobs\/[0-9a-f]{40}|branches\/[\w.-]+)?$/;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAdmin(req)) return send(res, 401, { message: '로그인이 필요해요.' });
  if (!['GET', 'PUT', 'DELETE'].includes(req.method)) return send(res, 405, { message: '지원하지 않는 요청이에요.' });

  const raw = String(req.query.p || '');
  const [path, query = ''] = raw.split('?');
  const ref = new URLSearchParams(query).get('ref');
  if (!ALLOWED.test(path)) return send(res, 400, { message: '허용되지 않은 경로예요.' });

  try {
    const body = req.method === 'GET' ? undefined : JSON.stringify(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
    const data = await gh(path + (ref ? `?ref=${encodeURIComponent(ref)}` : ''), { method: req.method, body });
    send(res, 200, data);
  } catch (e) {
    const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    // 서버 토큰 문제(401/403)는 로그인 만료(401)와 헷갈리지 않게 502로
    send(res, status === 401 || status === 403 ? 502 : status, { message: status === 401 || status === 403 ? `서버 토큰 오류: ${e.message}` : e.message });
  }
}
