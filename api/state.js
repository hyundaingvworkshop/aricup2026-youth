// GET /api/state — 참가자·관리자 화면이 몇 초마다 불러가는 현재 대회 상태
const { readState, send } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'GET만 지원해요.' });
  try {
    send(res, 200, await readState());
  } catch (e) {
    send(res, e.status || 500, { error: e.message || '오류' });
  }
};
