// © 2026 김용현
// POST { n, key, html, code? } → { n, key }  방금 만든 내 페이지 덮어쓰기 (키가 있어야 함)
import { cors, readBody, currentSha, putFile, editKey, keyMatches, send, fail } from '../lib/github.js';

export default async function handler(req, res) {
  if (!cors(req, res)) return;
  const body = readBody(req, res);
  if (!body) return;
  const n = Number(body.n);
  if (!Number.isInteger(n) || n < 1) return send(res, 400, { error: '페이지 번호가 올바르지 않아요.' });
  try {
    const sha = await currentSha(n);
    if (!sha) return send(res, 410, { error: 'gone', message: `${n}번 페이지가 지워졌어요. 새 페이지로 배포해 주세요.` });
    if (!keyMatches(n, sha, body.key)) {
      return send(res, 403, { error: 'key', message: `${n}번은 이 화면에서 더 이상 덮어쓸 수 없어요. (다른 곳에서 바뀌었어요) 새 페이지로 배포해 주세요.` });
    }
    const next = await putFile(n, body.html, sha);
    send(res, 200, { n, key: editKey(n, next) });
  } catch (e) {
    if (e.status === 409) return send(res, 409, { error: '잠시 뒤 다시 눌러 주세요.' });
    fail(res, e);
  }
}
