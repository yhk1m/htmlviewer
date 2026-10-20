// © 2026 김용현
// POST { html, code? } → { n, key }  새 번호 페이지 만들기
import { cors, readBody, createPage, editKey, send, fail } from '../lib/github.js';

export default async function handler(req, res) {
  if (!cors(req, res)) return;
  const body = readBody(req, res);
  if (!body) return;
  try {
    const { n, sha } = await createPage(body.html);
    send(res, 200, { n, key: editKey(n, sha) });
  } catch (e) { fail(res, e); }
}
