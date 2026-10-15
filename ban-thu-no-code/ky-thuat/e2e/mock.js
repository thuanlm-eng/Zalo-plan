// Mock of Zalo Bot API, Anthropic Messages API and a tiny "sheet" store, for end-to-end tests.
const http = require('http');
const fs = require('fs');
const LOG = process.argv[2] || 'mock-log.json';
const state = { sent: [], ai: [], webhook: [], rows: [] };
const save = () => fs.writeFileSync(LOG, JSON.stringify(state, null, 2));

const aiAnswer = (text) => {
  if (/báo giá/.test(text)) {
    return { tasks: [
      { viec: 'Gửi báo giá thép hộp Q7', nguoi_lam: 'Lan', han_chot: '2026-10-16 17:00', uu_tien: 'Cao', du_an: 'Q7' },
      { viec: 'Gọi xác nhận lịch đổ bê tông', nguoi_lam: '', han_chot: '', uu_tien: 'Bình thường', du_an: '' },
    ] };
  }
  return { tasks: [] };
};

http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    const json = body ? JSON.parse(body) : {};
    const reply = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); save(); };

    if (url.pathname.startsWith('/bot') && url.pathname.endsWith('/sendMessage')) {
      state.sent.push({ token: url.pathname.split('/')[1].slice(3), ...json });
      return reply(200, { ok: true, result: { message_id: String(state.sent.length), date: Date.now() } });
    }
    if (url.pathname.startsWith('/bot') && url.pathname.endsWith('/setWebhook')) {
      state.webhook.push(json);
      return reply(200, { ok: true, result: { url: json.url, verification: { ok: true, outcome: 'webhook.ok' } } });
    }
    if (url.pathname === '/v1/messages') {
      state.ai.push({ headers: { key: req.headers['x-api-key'], version: req.headers['anthropic-version'], beta: req.headers['anthropic-beta'] }, body: json });
      if (req.headers['x-api-key'] !== 'test-key') return reply(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } });
      const text = json.messages[0].content;
      return reply(200, { type: 'message', role: 'assistant', stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(aiAnswer(text)) }] });
    }
    if (url.pathname === '/sheet/append') { state.rows.push(json); return reply(200, json); }
    if (url.pathname === '/sheet/read') {
      const col = url.searchParams.get('col'), val = url.searchParams.get('val');
      return reply(200, state.rows.filter((r) => !col || String(r[col]) === val).map((r, i) => ({ row_number: i + 2, ...r })));
    }
    if (url.pathname === '/sheet/update') {
      const r = state.rows.find((x) => x.ID === json.ID);
      if (r) Object.assign(r, json);
      return reply(200, r || {});
    }
    if (url.pathname === '/state') return reply(200, state);
    if (url.pathname === '/seed') { state.rows.push(...json.rows); return reply(200, { ok: true }); }
    reply(404, { error: 'not found ' + url.pathname });
  });
}).listen(9999, '127.0.0.1', () => console.log('mock ready'));
