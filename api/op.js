// POST /api/op — 관리자 저장 (헤더 X-Admin-Password 필요)
// 한 번에 한 가지만 바꿔서, 운영진 여러 명이 동시에 다른 경기를 입력해도 서로 덮어쓰지 않아요.
//   { type:'result', id:'1440-1', rec:{h,a,hy,hr,ay,ar,st?,w?} | null }
//   { type:'notice', text }
//   { type:'draw', dk:'pre:y2:A', order:['A2','A1'] | null }
//   { type:'slots', div:'y2', map:{'y2:A1':'A2', 'y2:B2':'X'} }
const { P, err, pipeline, readState, send, readBody, checkPassword, headerPassword } = require('./_lib');

// 대회 경기 번호(시작시각-구장) — app.js 타임테이블과 같아야 해요
const MATCH_IDS = new Set([
  '1440-1', '1440-2', '1440-3', '1520-1', '1520-2', '1520-3', '1600-1', '1600-2', '1600-3', '1640-1', '1640-2', '1640-3', // 1학년 예선
  '1500-1', '1500-2', '1500-3', '1500-4', '1540-1', '1540-2', '1540-3', '1540-4', '1620-1', '1620-2', '1620-3', '1620-4', // 2학년 예선
  '1700-1', '1700-2', '1725-1', // 2학년 4강·결승
  '1720-3', '1720-4', '1745-3', // 1학년 4강·결승
]);
// 4강 진출 자리 (부별)
const SLOTS = { y1: ['A1', 'A2', 'A3', 'A4'], y2: ['A1', 'A2', 'B1', 'B2'] };

const int = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(99, n)) : 0; };

function commandsFor(op) {
  if (!op || typeof op !== 'object') throw err(400, '잘못된 요청이에요.');
  switch (op.type) {
    case 'result': {
      if (!MATCH_IDS.has(String(op.id))) throw err(400, '경기 번호가 올바르지 않아요.');
      if (op.rec == null) return [['HDEL', P + 'results', op.id]];
      const r = op.rec, rec = { h: int(r.h), a: int(r.a), hy: int(r.hy), hr: int(r.hr), ay: int(r.ay), ar: int(r.ar) };
      if (r.st === 'live') rec.st = 'live';
      if (r.w === 'h' || r.w === 'a') rec.w = r.w;
      return [['HSET', P + 'results', op.id, JSON.stringify(rec)]];
    }
    case 'notice': {
      const t = String(op.text || '').trim().slice(0, 400);
      return t ? [['SET', P + 'notice', t]] : [['DEL', P + 'notice']];
    }
    case 'draw': {
      if (!/^(pre:y1:A|pre:y2:[AB])$/.test(String(op.dk))) throw err(400, '순위표 구분이 올바르지 않아요.');
      if (op.order == null) return [['HDEL', P + 'draws', op.dk]];
      if (!Array.isArray(op.order) || op.order.length > 12 || !op.order.every((k) => /^[AB][1-6]$/.test(k))) throw err(400, '추첨 순서가 올바르지 않아요.');
      return [['HSET', P + 'draws', op.dk, JSON.stringify(op.order)]];
    }
    case 'slots': {
      if (op.div !== 'y1' && op.div !== 'y2') throw err(400, '부 구분이 올바르지 않아요.');
      const map = {};
      for (const [k, v] of Object.entries(op.map || {})) {
        if (!(SLOTS[op.div] || []).includes(k.slice(op.div.length + 1)) || k.indexOf(op.div + ':') !== 0 || !/^([AB][1-6]|X)$/.test(String(v))) throw err(400, '본선 배정 값이 올바르지 않아요.');
        map[k] = v;
      }
      return Object.keys(map).length ? [['HSET', P + 'slots', op.div, JSON.stringify(map)]] : [['HDEL', P + 'slots', op.div]];
    }
    case 'reset': {
      // 경기 결과를 모두 '예정'으로 (scope: all | y1 | y2). extra=true면 추첨 순서·본선 배정도 초기화
      const scope = op.scope;
      if (scope !== 'all' && scope !== 'y1' && scope !== 'y2') throw err(400, '초기화 범위가 올바르지 않아요.');
      const cmds = [];
      if (scope === 'all') {
        cmds.push(['DEL', P + 'results']);
        if (op.extra) cmds.push(['DEL', P + 'draws'], ['DEL', P + 'slots']);
      } else {
        const ids = Array.isArray(op.ids) ? op.ids : [];
        if (ids.length > 200 || !ids.every((id) => MATCH_IDS.has(String(id)))) throw err(400, '경기 번호가 올바르지 않아요.');
        if (ids.length) cmds.push(['HDEL', P + 'results'].concat(ids));
        if (op.extra) {
          const dks = scope === 'y1' ? ['pre:y1:A'] : ['pre:y2:A', 'pre:y2:B'];
          cmds.push(['HDEL', P + 'draws'].concat(dks), ['HDEL', P + 'slots', scope]);
        }
      }
      return cmds;
    }
    default: throw err(400, '알 수 없는 요청이에요.');
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST만 지원해요.' });
  try {
    await checkPassword(req, headerPassword(req));
    const op = await readBody(req);
    const cmds = commandsFor(op);
    await pipeline(cmds.concat([['INCR', P + 'ver']]));
    send(res, 200, await readState());
  } catch (e) {
    send(res, e.status || 500, { error: e.message || '오류' });
  }
};
