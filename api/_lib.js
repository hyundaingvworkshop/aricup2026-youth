// 공통 도우미: Upstash Redis(REST) 접근, 요청/응답, 관리자 비밀번호 확인
const crypto = require('crypto');

const P = 'arijr:'; // 유소년부 전용 키 접두사 (여성부 'aricup:'와 섞이지 않게)
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

function err(status, message) { const e = new Error(message); e.status = status; return e; }

async function pipeline(cmds) {
  if (!REDIS_URL || !REDIS_TOKEN) throw err(503, '저장소(Upstash Redis)가 아직 연결되지 않았어요. Vercel 프로젝트의 Storage에서 연결해 주세요.');
  const r = await fetch(REDIS_URL.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw err(502, '저장소 응답 오류 (' + r.status + ')');
  const out = await r.json();
  for (const x of out) if (x && x.error) throw err(502, '저장소 오류: ' + x.error);
  return out.map((x) => x.result);
}

function toObj(a) {
  const o = {};
  if (Array.isArray(a)) for (let i = 0; i < a.length; i += 2) o[a[i]] = a[i + 1];
  else if (a && typeof a === 'object') Object.assign(o, a);
  return o;
}
function parseVals(o) { const r = {}; for (const k of Object.keys(o)) { try { r[k] = JSON.parse(o[k]); } catch (e) { /* 무시 */ } } return r; }

async function readState() {
  const [res, notice, draws, slots, ver] = await pipeline([
    ['HGETALL', P + 'results'], ['GET', P + 'notice'], ['HGETALL', P + 'draws'], ['HGETALL', P + 'slots'], ['GET', P + 'ver'],
  ]);
  const slotFlat = {};
  const perDiv = parseVals(toObj(slots));
  for (const d of Object.keys(perDiv)) Object.assign(slotFlat, perDiv[d] || {});
  return { ver: Number(ver || 0), state: { results: parseVals(toObj(res)), notice: notice || '', draws: parseVals(toObj(draws)), slots: slotFlat } };
}

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return {}; }
}

function clientIp(req) {
  const f = req.headers['x-forwarded-for'];
  return String((f && f.split(',')[0]) || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown').trim().slice(0, 64);
}

function sameSecret(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// 비밀번호 확인 + 연속 실패 제한 (IP당 10분에 8회)
async function checkPassword(req, given) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw err(503, '관리자 비밀번호(ADMIN_PASSWORD)가 설정되지 않았어요.');
  const key = P + 'fail:' + clientIp(req);
  const [fails] = await pipeline([['GET', key]]);
  if (Number(fails || 0) >= 8) throw err(429, '비밀번호를 여러 번 틀려서 10분 동안 잠겼어요.');
  if (!given || !sameSecret(given, expected)) {
    await pipeline([['INCR', key], ['EXPIRE', key, 600]]);
    throw err(401, '비밀번호가 맞지 않아요.');
  }
  await pipeline([['DEL', key]]);
}

function headerPassword(req) {
  const h = req.headers['x-admin-password'];
  if (!h) return '';
  try { return decodeURIComponent(h); } catch (e) { return String(h); }
}

module.exports = { P, err, pipeline, readState, send, readBody, checkPassword, headerPassword };
