// Runs ZaloPlan.gs in a sandbox with mocked Google Apps Script services, Zalo and Claude.
// Usage: node test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'ZaloPlan.gs'), 'utf8');
const HEAD = ['ID', 'Viec', 'NguoiLam', 'HanChot', 'UuTien', 'DuAn', 'TrangThai', 'TinGoc', 'NguoiGui', 'ChatID', 'TaoLuc', 'XongLuc', 'DaNhac'];

function makeEnv({ now, header = HEAD, model = 'claude-opus-5-5', claudeKey = 'sk-ant-test', configured = true } = {}) {
  const grid = [header.slice()];
  const sent = [], zaloCalls = [], aiCalls = [], triggers = [], alerts = [], answers = [];
  const cache = new Map(), props = new Map();
  const clock = { now };

  const range = (r, c, nr = 1, nc = 1) => ({
    getDisplayValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => ((grid[r - 1 + i] || [])[c - 1 + j] ?? ''))),
    setNumberFormat: () => {},
    setValues: (vals) => vals.forEach((row, i) => row.forEach((v, j) => { grid[r - 1 + i] = grid[r - 1 + i] || []; grid[r - 1 + i][c - 1 + j] = v; })),
    setValue: (v) => { grid[r - 1] = grid[r - 1] || []; grid[r - 1][c - 1] = v; },
  });
  const sheet = { getRange: range, getLastRow: () => grid.length, getMaxRows: () => 1000 };

  const aiAnswer = (text) => (/báo giá/.test(text)
    ? { tasks: [
      { viec: 'Gửi báo giá thép hộp Q7', nguoi_lam: 'Lan', han_chot: '2026-10-16 17:00', uu_tien: 'Cao', du_an: 'Q7' },
      { viec: 'Gọi xác nhận lịch đổ bê tông', nguoi_lam: '', han_chot: 'thứ 6', uu_tien: '??', du_an: '' },
    ] }
    : { tasks: [] });

  const resp = (code, obj) => ({ getContentText: () => JSON.stringify(obj), getResponseCode: () => code });
  const ctx = {
    console: { log: () => {}, error: (e) => { ctx.__errors.push(String(e)); } },
    __errors: [],
    Date: class extends Date { static now() { return clock.now; } },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({ getSheetByName: (n) => (n === 'CongViec' ? sheet : null) }),
      getUi: () => ({
        ButtonSet: { OK: 'OK', OK_CANCEL: 'OK_CANCEL' }, Button: { OK: 'OK', CANCEL: 'CANCEL' },
        prompt: (title) => { const a = answers.shift(); return { getSelectedButton: () => (a === null ? 'CANCEL' : 'OK'), getResponseText: () => a || '', title }; },
        alert: (title, body) => alerts.push({ title, body }),
        createMenu: (name) => { const m = { items: [], addItem: (l, f) => (m.items.push(f), m), addSeparator: () => m, addToUi: () => (ctx.__menu = { name, items: m.items }) }; return m; },
      }),
    },
    ScriptApp: {
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t) => triggers.splice(triggers.indexOf(t), 1),
      newTrigger: (fn) => ({ timeBased: () => ({ everyMinutes: (m) => ({ create: () => triggers.push({ fn, m, getHandlerFunction: () => fn }) }) }) }),
    },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) || null, put: (k, v) => cache.set(k, v), remove: (k) => cache.delete(k) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props.get(k) || null, setProperty: (k, v) => props.set(k, v) }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    HtmlService: { createHtmlOutput: (s) => ({ html: s }) },
    Utilities: { base64Encode: (b) => Buffer.from(b).toString('base64'), computeDigest: (_a, s) => [...require('crypto').createHash('md5').update(s).digest()], DigestAlgorithm: { MD5: 'MD5' } },
    UrlFetchApp: {
      fetch: (url, o) => {
        const body = JSON.parse(o.payload);
        if (url.startsWith('https://bot-api.zaloplatforms.com/bot')) {
          const [token, method] = url.slice('https://bot-api.zaloplatforms.com/bot'.length).split('/');
          zaloCalls.push({ token, method, body });
          if (method === 'sendMessage') { sent.push(body); return resp(200, { ok: true, result: { message_id: 'x' } }); }
          if (method === 'getMe') return resp(200, token === 'TOKEN123' ? { ok: true, result: { id: 'b1', account_name: 'Bot ZaloPlan' } } : { ok: false, error_code: 401 });
          if (method === 'setWebhook') return resp(200, { ok: true, result: { url: body.url } });
          if (method === 'getWebhookInfo') return resp(200, { ok: true, result: { url: 'https://script.google.com/macros/s/AKfy/exec?key=x', updated_at: 1 } });
        }
        if (url === 'https://api.anthropic.com/v1/messages') {
          aiCalls.push({ headers: o.headers, body });
          if (o.headers['x-api-key'] !== 'sk-ant-test') return resp(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } });
          const text = body.messages[0].content;
          return resp(200, { type: 'message', stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(aiAnswer(text)) }] });
        }
        throw new Error('unexpected fetch ' + url);
      },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  if (configured) Object.entries({ BOT_TOKEN: 'TOKEN123', KHOA_CLAUDE: claudeKey, MA_BI_MAT: 'BiMat1234567890ab', LINK_WEB_APP: 'https://script.google.com/macros/s/AKfy/exec', MO_HINH_AI: model }).forEach(([k, v]) => props.set(k, v));

  let msgId = 0;
  const zalo = (text, { key = 'BiMat1234567890ab', chat = 'chat-1', event = 'message.text.received', id } = {}) => {
    const before = sent.length;
    const out = ctx.doPost({ parameter: { key }, postData: { contents: JSON.stringify({ ok: true, result: { event_name: event, message: { message_id: id || 'm' + ++msgId, text, chat: { id: chat }, from: { id: chat, display_name: 'Minh' } } } }) } });
    assert.deepStrictEqual(out, { html: 'ok' });
    return sent.slice(before);
  };
  const rows = () => grid.slice(1).map((v) => Object.fromEntries(HEAD.map((h, i) => [h, v[i] ?? ''])));
  return { ctx, grid, sent, zaloCalls, aiCalls, triggers, props, clock, zalo, rows, alerts, answers };
}

// Thursday 2026-10-15 09:30 Vietnam time
const NOW = Date.UTC(2026, 9, 15, 2, 30);
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('menu is added on open', () => {
  const e = makeEnv({ now: NOW });
  e.ctx.onOpen();
  assert.deepStrictEqual(e.ctx.__menu, { name: '🤖 ZaloPlan', items: ['menuCaiDat', 'menuKiemTra', 'menuAiTietKiem', 'menuAiManh'] });
});
t('menu setup: three answers, secret generated, everything connected', () => {
  const e = makeEnv({ now: NOW, configured: false });
  e.answers.push('TOKEN123', ' sk-ant-test ', 'https://script.google.com/macros/s/AKfy/exec');
  e.ctx.menuCaiDat();
  assert.strictEqual(e.alerts.length, 1);
  assert.strictEqual(e.alerts[0].title, '✅ Cài đặt thành công', e.alerts[0].body);
  assert.match(e.alerts[0].body, /Xong! Mở Zalo/);
  const secret = e.props.get('MA_BI_MAT');
  assert.match(secret, /^[A-Za-z0-9]{32}$/);
  assert.strictEqual(e.props.get('KHOA_CLAUDE'), 'sk-ant-test', 'spaces trimmed');
  const wh = e.zaloCalls.find((c) => c.method === 'setWebhook');
  assert.strictEqual(wh.body.url, 'https://script.google.com/macros/s/AKfy/exec?key=' + secret);
  assert.deepStrictEqual(e.triggers.map((x) => [x.fn, x.m]), [['moi15Phut', 15]]);
  // running again with empty answers keeps values and the same secret, single trigger
  e.answers.push('', '', '');
  e.ctx.menuCaiDat();
  assert.strictEqual(e.props.get('MA_BI_MAT'), secret);
  assert.strictEqual(e.triggers.length, 1);
  assert.strictEqual(e.alerts[1].title, '✅ Cài đặt thành công');
  assert.strictEqual(e.zalo('hd', { key: secret }).length, 1, 'webhook accepts generated secret');
});
t('menu setup: cancel stops without saving', () => {
  const e = makeEnv({ now: NOW, configured: false });
  e.answers.push('TOKEN123', null);
  e.ctx.menuCaiDat();
  assert.strictEqual(e.alerts.length, 0);
  assert.strictEqual(e.props.get('BOT_TOKEN'), undefined);
});
t('menu setup: wrong token / link explained in Vietnamese', () => {
  let e = makeEnv({ now: NOW, configured: false });
  e.answers.push('SAI', 'sk-ant-test', 'https://script.google.com/macros/s/AKfy/exec');
  e.ctx.menuCaiDat();
  assert.strictEqual(e.alerts[0].title, '⚠️ Chưa xong');
  assert.match(e.alerts[0].body, /Token Zalo không đúng/);
  e = makeEnv({ now: NOW, configured: false });
  e.answers.push('TOKEN123', 'sk-ant-test', 'https://script.google.com/macros/s/AKfy/dev');
  e.ctx.menuCaiDat();
  assert.match(e.alerts[0].body, /Link ứng dụng web chưa đúng/);
});
t('model switch from menu takes effect immediately', () => {
  const e = makeEnv({ now: NOW });
  e.ctx.menuAiTietKiem();
  e.zalo('Lan ơi gửi báo giá nhé');
  assert.strictEqual(e.aiCalls[0].body.model, 'claude-haiku-5-5');
  e.ctx.menuAiManh();
  e.zalo('Lan ơi gửi báo giá nhé lần 2');
  assert.strictEqual(e.aiCalls[1].body.model, 'claude-opus-5-5');
});
t('status check from menu', () => {
  const e = makeEnv({ now: NOW });
  e.ctx.menuKiemTra();
  assert.match(e.alerts[0].body, /Token Zalo: đã có/);
  assert.match(e.alerts[0].body, /Bot Zalo: hoạt động \(Bot ZaloPlan\)/);
  assert.match(e.alerts[0].body, /Lịch chạy mỗi 15 phút: CHƯA BẬT/);
});
t('unconfigured bot ignores webhook calls', () => {
  const e = makeEnv({ now: NOW, configured: false });
  assert.strictEqual(e.zalo('hd', { key: '' }).length, 0);
});
t('caiDat creates trigger, checks token, sets webhook with key, tests Claude', () => {
  const e = makeEnv({ now: NOW });
  e.ctx.caiDat();
  assert.deepStrictEqual(e.triggers.map((x) => [x.fn, x.m]), [['moi15Phut', 15]]);
  const wh = e.zaloCalls.find((c) => c.method === 'setWebhook');
  assert.strictEqual(wh.body.url, 'https://script.google.com/macros/s/AKfy/exec?key=BiMat1234567890ab');
  assert.strictEqual(wh.body.secret_token, 'BiMat1234567890ab');
  assert.strictEqual(e.aiCalls.length, 1);
  e.ctx.caiDat(); // running twice keeps a single trigger
  assert.strictEqual(e.triggers.length, 1);
});
t('caiDat reports a bad Claude key', () => {
  const e = makeEnv({ now: NOW, claudeKey: 'sk-ant-wrong' });
  assert.throws(() => e.ctx.caiDat(), /Khóa Claude có vấn đề/);
  e.props.set('KHOA_CLAUDE', 'abc');
  assert.throws(() => e.ctx.caiDat(), /phải bắt đầu bằng sk-ant-/);
});
t('caiDat reports wrong sheet header', () => {
  const e = makeEnv({ now: NOW, header: HEAD.slice(0, 12) });
  assert.throws(() => e.ctx.caiDat(), /thiếu hoặc sai cột: DaNhac/);
});
t('wrong key in webhook URL is ignored', () => {
  const e = makeEnv({ now: NOW });
  assert.strictEqual(e.zalo('hd', { key: 'sai' }).length, 0);
});
t('help command', () => {
  const e = makeEnv({ now: NOW });
  const out = e.zalo('hd');
  assert.strictEqual(out.length, 1);
  assert.match(out[0].text, /mình là ZaloPlan/);
  assert.strictEqual(out[0].chat_id, 'chat-1');
});
t('task message: Claude called correctly, rows saved, one confirmation', () => {
  const e = makeEnv({ now: NOW });
  const out = e.zalo('Lan ơi chiều thứ 6 gửi anh báo giá thép hộp Q7 nhé, gấp! Gọi xác nhận lịch đổ bê tông luôn');
  const call = e.aiCalls[0];
  assert.strictEqual(call.headers['anthropic-version'], '2023-06-01');
  assert.strictEqual(call.headers['anthropic-beta'], 'server-side-fallback-2026-07-01');
  assert.strictEqual(call.body.fallbacks, 'default');
  assert.strictEqual(call.body.model, 'claude-opus-5-5');
  assert.strictEqual(call.body.output_config.format.type, 'json_schema');
  assert.match(call.body.messages[0].content, /Thứ Năm, 15\/10\/2026 09:30/);
  assert.match(call.body.messages[0].content, /Thứ Sáu 16\/10\/2026 = 2026-10-16 \(ngày mai\)/);
  const r = e.rows();
  assert.strictEqual(r.length, 2);
  assert.strictEqual(r[0].HanChot, '2026-10-16 17:00');
  assert.strictEqual(r[1].HanChot, '', 'invalid date dropped');
  assert.strictEqual(r[1].UuTien, 'Bình thường');
  assert.strictEqual(r[0].ChatID, 'chat-1');
  assert.strictEqual(r[0].TaoLuc, '2026-10-15 09:30');
  assert.notStrictEqual(r[0].ID, r[1].ID);
  assert.strictEqual(out.length, 1);
  assert.match(out[0].text, /Đã lưu 2 việc/);
  assert.match(out[0].text, /17:00 Thứ Sáu 16\/10 · 🔥 Gấp · 📁 Q7/);
});
t('Zalo retry of the same message is not processed twice', () => {
  const e = makeEnv({ now: NOW });
  e.zalo('Lan ơi gửi báo giá nhé', { id: 'same' });
  assert.strictEqual(e.zalo('Lan ơi gửi báo giá nhé', { id: 'same' }).length, 0);
  assert.strictEqual(e.rows().length, 2);
  assert.strictEqual(e.aiCalls.length, 1);
});
t('chit-chat: no task', () => {
  const e = makeEnv({ now: NOW });
  assert.match(e.zalo('cảm ơn anh nhiều nha')[0].text, /không thấy việc/);
  assert.strictEqual(e.rows().length, 0);
});
t('AI error: raw task saved and user warned', () => {
  const e = makeEnv({ now: NOW, claudeKey: 'sai' });
  const out = e.zalo('Nhớ nộp hồ sơ nghiệm thu tầng 5');
  assert.match(out[0].text, /AI đang lỗi \(invalid x-api-key\)/);
  assert.strictEqual(e.rows().length, 1);
  assert.strictEqual(e.rows()[0].Viec, 'Nhớ nộp hồ sơ nghiệm thu tầng 5');
});
t('Haiku: no fallbacks parameter or beta header', () => {
  const e = makeEnv({ now: NOW, model: 'claude-haiku-5-5' });
  e.zalo('Lan ơi gửi báo giá nhé');
  assert.strictEqual(e.aiCalls[0].body.fallbacks, undefined);
  assert.strictEqual(e.aiCalls[0].headers['anthropic-beta'], undefined);
  assert.strictEqual(e.aiCalls[0].body.model, 'claude-haiku-5-5');
});
t('list, done, per-user isolation', () => {
  const e = makeEnv({ now: NOW });
  e.zalo('Lan ơi gửi báo giá nhé');
  const [a, b] = e.rows();
  let out = e.zalo('việc');
  assert.match(out[0].text, /2 việc đang mở/);
  assert.ok(out[0].text.indexOf(a.ID) < out[0].text.indexOf(b.ID), 'dated task listed first');
  assert.match(e.zalo('viec', { chat: 'chat-2' })[0].text, /không còn việc/);
  assert.match(e.zalo(`xong ${a.ID}`, { chat: 'chat-2' })[0].text, /không tìm thấy/);
  out = e.zalo(`xong ${a.ID.toLowerCase()}`);
  assert.match(out[0].text, /Đã đánh dấu xong/);
  assert.strictEqual(e.rows()[0].TrangThai, 'Xong');
  assert.strictEqual(e.rows()[0].XongLuc, '2026-10-15 09:30');
  out = e.zalo(`Xóa ${b.ID}`);
  assert.strictEqual(e.rows()[1].TrangThai, 'Đã xóa');
  assert.match(e.zalo('viec')[0].text, /không còn việc/);
});
t('image message gets polite reply', () => {
  const e = makeEnv({ now: NOW });
  assert.match(e.zalo('', { event: 'message.image.received' })[0].text, /chỉ đọc được tin nhắn chữ/);
});
t('dates edited by hand in the sheet (dd/mm/yyyy) are understood', () => {
  const e = makeEnv({ now: NOW });
  e.grid.push(['HAND', 'Việc sửa tay', '', '14/10/2026 10:00:00', 'Bình thường', '', 'Mới', '', '', 'chat-1', '', '', '']);
  assert.match(e.zalo('viec')[0].text, /\[HAND\] Việc sửa tay: ⚠️ trễ hạn \(14\/10\)/);
});
t('every 15 min: morning summary once at 8h, reminders once', () => {
  const e = makeEnv({ now: Date.UTC(2026, 9, 16, 1, 5) }); // 08:05 VN Friday
  e.grid.push(['AAAA', 'Họp chủ đầu tư', '', '2026-10-16 09:00', 'Cao', '', 'Mới', '', '', 'chat-1', '', '', '']);
  e.grid.push(['BBBB', 'Nộp hồ sơ', '', '2026-10-15 10:00', 'Bình thường', '', 'Mới', '', '', 'chat-1', '', '', '']);
  e.grid.push(['CCCC', 'Việc của người khác', '', '', 'Bình thường', '', 'Mới', '', '', 'chat-2', '', '', '']);
  e.grid.push(['DDDD', 'Đã xong', '', '2026-10-16 08:30', 'Bình thường', '', 'Xong', '', '', 'chat-1', '', '', '']);
  e.ctx.moi15Phut();
  const s = e.sent.map((m) => m.chat_id + ': ' + m.text);
  assert.strictEqual(e.sent.filter((m) => /Chào buổi sáng/.test(m.text)).length, 2);
  assert.ok(s.some((x) => /chat-1: ☀️.*2 việc đang mở[\s\S]*Trễ hạn:\n• \[BBBB\][\s\S]*Hôm nay:\n• \[AAAA\] Họp chủ đầu tư: 09:00 🔥/.test(x)));
  assert.ok(s.some((x) => /chat-2: ☀️[\s\S]*1 việc chưa có hạn/.test(x)));
  assert.strictEqual(e.sent.filter((m) => /Sắp đến hạn/.test(m.text)).length, 1, '09:00 is 55 min away, so it is reminded');
});
t('reminder 60 min before deadline, only once; summary not repeated', () => {
  const e = makeEnv({ now: Date.UTC(2026, 9, 16, 1, 5) }); // 08:05 VN
  e.grid.push(['AAAA', 'Họp chủ đầu tư', 'Lan', '2026-10-16 09:00', 'Cao', '', 'Mới', '', '', 'chat-1', '', '', '']);
  e.ctx.moi15Phut();
  const nhac = e.sent.filter((m) => /Sắp đến hạn lúc 09:00/.test(m.text));
  assert.strictEqual(nhac.length, 1);
  assert.strictEqual(e.rows()[0].DaNhac, 'x');
  e.clock.now += 15 * 60 * 1000; // 08:20
  e.ctx.moi15Phut();
  assert.strictEqual(e.sent.length, 2, 'nothing new at 08:20');
  e.clock.now = Date.UTC(2026, 9, 16, 3, 0); // 10:00 VN: no summary outside 8h
  e.ctx.moi15Phut();
  assert.strictEqual(e.sent.length, 2);
});
console.log(`\n${n} tests passed`);
