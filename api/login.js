// POST /api/login { password } — 관리자 비밀번호 확인 (서버 환경변수 ADMIN_PASSWORD와 비교)
const { readBody, checkPassword, send } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST만 지원해요.' });
  try {
    const body = await readBody(req);
    await checkPassword(req, String(body.password || ''));
    send(res, 200, { ok: true });
  } catch (e) {
    send(res, e.status || 500, { error: e.message || '오류' });
  }
};
