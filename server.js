// 달콤상점 마케팅 게임 · Railway 서버 (외부 패키지 없이 Node 기본 기능만 사용)
const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const FILE = path.join(DATA_DIR, 'state.json');
const INDEX = path.join(__dirname, 'public', 'index.html');

const empty = () => ({ v: 1, sheets: {}, scores: { s: [0, 0, 0, 0, 0, 0], teams: 4 }, names: {}, prog: {}, open: [], cur: '', insight: [] });
let state = empty();
try { state = Object.assign(empty(), JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch (e) { /* first run */ }
const TEAM = /^team[1-6]$/;
const UNIT = /^(w[0-9]{1,2}|g[1-5]|rfm)$/;
const STATIC = {
  '/shop.jpg': ['shop.jpg', 'image/jpeg'],
  '/qrcode.js': ['qrcode.js', 'application/javascript; charset=utf-8'],
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
  if (req.method === 'GET' && STATIC[p]) {
    res.writeHead(200, { 'Content-Type': STATIC[p][1], 'Cache-Control': 'public, max-age=86400' });
    return fs.createReadStream(path.join(__dirname, 'public', STATIC[p][0])).pipe(res);
  }
  if (req.method === 'GET' && p === '/health') return send(res, 200, { ok: true });
  send(res, 404, { error: 'not found' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log('dalkom game on port ' + PORT));
