// 달콤상점 마케팅 게임 · Railway 서버 (외부 패키지 없이 Node 기본 기능만 사용)
const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const FILE = path.join(DATA_DIR, 'state.json');
const INDEX = path.join(__dirname, 'public', 'index.html');

const empty = () => ({ v: 1, sheets: {}, scores: { s: [0, 0, 0, 0, 0, 0], teams: 4 }, names: {}, prog: {}, open: [], cur: '', insight: [], content: 2 });
let state = empty();
try { const saved = JSON.parse(fs.readFileSync(FILE, 'utf8')); state = Object.assign(empty(), saved); state.content = saved.content || 1; } catch (e) { /* first run */ }
// 교안이 샌드위치 팝업(PPT 원본) 실습지로 바뀌었으므로, 예전 실습지 답은 한 번 비웁니다.
if ((state.content || 1) < 2) { state.sheets = {}; state.open = []; state.cur = ''; state.insight = []; state.content = 2; state.v++; fs.writeFileSync(FILE, JSON.stringify(state)); console.log('worksheets reset for new course content'); }
const TEAM = /^team[1-6]$/;
const UNIT = /^(w[0-9]{1,2}|g[1-5]|rfm)$/;
const STATIC = {
  '/popup.jpg': ['popup.jpg', 'image/jpeg'],
  '/target-A.jpg': ['target-A.jpg', 'image/jpeg'],
  '/target-B.jpg': ['target-B.jpg', 'image/jpeg'],
  '/target-C.jpg': ['target-C.jpg', 'image/jpeg'],
  '/qrcode.js': ['qrcode.js', 'application/javascript; charset=utf-8'],
};
// 실습지 내려받기 · PPT 원본 슬라이드 그대로 (강사 노트는 뺀 파일)
const SHEETS = {
  'sheets-blank': '3-3 실습지 전체 (빈칸).pptx',
  'sheets-answer': '3-3 실습지 전체 (예시 답안).pptx',
  'sheet-w1': '실습1 고객 세분화 기준 설계.pptx',
  'sheet-w2': '실습2 세분시장 평가와 표적 선정.pptx',
  'sheet-w8': '품평회 선택 결과 기록표.pptx',
  'sheet-w4': '실습4 RFM 점수 계산과 등급 분류.pptx',
  'sheet-w42': '실습4-2 RFM 결과 해석.pptx',
  'sheet-w5': '실습5 세그먼트별 CRM 액션 설계.pptx',
  'sheet-w6': '실습6 고객 생애가치 추정과 투자 판단.pptx',
  'sheet-w7': '실습7 STP+CRM 통합 기획안 (원페이퍼).pptx',
};

let timer = null;
function persist() {
  clearTimeout(timer);
  timer = setTimeout(() => fs.writeFile(FILE, JSON.stringify(state), () => {}), 300);
}
function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(obj === undefined ? '' : JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve(null); } });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  if (req.method === 'GET' && p === '/api/state') {
    if (url.searchParams.get('v') === String(state.v)) { res.writeHead(204); return res.end(); }
    return send(res, 200, state);
  }
  if (req.method === 'POST' && p === '/api/sheet') {
    const b = await readBody(req) || {};
    if (!/^team[1-6]$/.test(b.team) || !/^w[0-9]{1,3}$/.test(b.ws || '') || !/^[a-z0-9_]{1,20}$/i.test(b.k || '')) {
      return send(res, 400, { error: 'bad request' });
    }
    const t = (state.sheets[b.team] = state.sheets[b.team] || {});
    const w = (t[b.ws] = t[b.ws] || {});
    w[b.k] = String(b.v ?? '').slice(0, 4000);
    state.v++; persist();
    return send(res, 200, { ok: true, v: state.v });
  }
  if (req.method === 'POST' && p === '/api/scores') {
    const b = await readBody(req) || {};
    if (!Array.isArray(b.s)) return send(res, 400, { error: 'bad request' });
    state.scores = { s: b.s.slice(0, 6).map((n) => Number(n) || 0), teams: [3, 4].includes(b.teams) ? b.teams : 4 };
    state.v++; persist();
    return send(res, 200, { ok: true });
  }
  if (req.method === 'POST' && p === '/api/team') {
    const b = await readBody(req) || {};
    if (!TEAM.test(b.team)) return send(res, 400, { error: 'bad request' });
    state.names[b.team] = String(b.name ?? '').trim().slice(0, 16);
    state.v++; persist();
    return send(res, 200, { ok: true });
  }
  if (req.method === 'POST' && p === '/api/progress') {
    const b = await readBody(req) || {};
    if (!TEAM.test(b.team) || !/^g[1-5]$/.test(b.act || '')) return send(res, 400, { error: 'bad request' });
    const pts = Math.max(0, Math.min(20, Math.round(Number(b.pts) || 0)));
    const t = (state.prog[b.team] = state.prog[b.team] || {});
    if (pts > (t[b.act] || 0)) { t[b.act] = pts; state.v++; persist(); }
    return send(res, 200, { ok: true, pts: t[b.act] });
  }
  if (req.method === 'POST' && p === '/api/open') {
    const b = await readBody(req) || {};
    if (!Array.isArray(b.open)) return send(res, 400, { error: 'bad request' });
    state.open = [...new Set(b.open.filter((x) => UNIT.test(x)))];
    state.cur = UNIT.test(b.cur || '') ? b.cur : '';
    state.v++; persist();
    return send(res, 200, { ok: true });
  }
  if (req.method === 'POST' && p === '/api/insight') {
    const b = await readBody(req) || {};
    if (!Array.isArray(b.insight)) return send(res, 400, { error: 'bad request' });
    state.insight = [...new Set(b.insight.filter((x) => /^g[1-5]$/.test(x)))];
    state.v++; persist();
    return send(res, 200, { ok: true });
  }
  if (req.method === 'POST' && p === '/api/reset') {
    const v = state.v + 1; state = empty(); state.v = v; persist();
    return send(res, 200, { ok: true });
  }
  if (req.method === 'GET' && (p === '/' || p === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    return fs.createReadStream(INDEX).pipe(res);
  }
  const sm = req.method === 'GET' && p.match(/^\/sheets\/([a-z0-9-]+)\.pptx$/);
  if (sm && SHEETS[sm[1]]) {
    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': "attachment; filename=\"" + sm[1] + ".pptx\"; filename*=UTF-8''" + encodeURIComponent(SHEETS[sm[1]]),
      'Cache-Control': 'no-cache',
    });
    return fs.createReadStream(path.join(__dirname, 'public', 'sheets', sm[1] + '.pptx')).pipe(res);
  }
  if (req.method === 'GET' && STATIC[p]) {
    res.writeHead(200, { 'Content-Type': STATIC[p][1], 'Cache-Control': 'public, max-age=86400' });
    return fs.createReadStream(path.join(__dirname, 'public', STATIC[p][0])).pipe(res);
  }
  if (req.method === 'GET' && p === '/health') return send(res, 200, { ok: true });
  send(res, 404, { error: 'not found' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log('dalkom game on port ' + PORT));
