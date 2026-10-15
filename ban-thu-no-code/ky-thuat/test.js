// Runs each Code-node body with mocked n8n globals ($input, $) and checks the outputs.
const fs = require('fs');
const assert = require('assert');
const path = require('path');

function run(file, { input = [], nodes = {}, now }) {
  const src = fs.readFileSync(path.join(__dirname, 'src', file), 'utf8');
  const $input = { first: () => input[0] || { json: {} }, all: () => input };
  const $ = (name) => {
    if (!(name in nodes)) throw new Error('unknown node ' + name);
    return { first: () => ({ json: nodes[name] }) };
  };
  const realNow = Date.now;
  if (now) Date.now = () => now;
  try {
    return new Function('$input', '$', src)($input, $);
  } finally {
    Date.now = realNow;
  }
}

// 2026-10-15 09:30 Vietnam time (Thursday)
const NOW = Date.UTC(2026, 9, 15, 2, 30);
const CFG = { MA_BI_MAT: 'bi-mat-123', MO_HINH_AI: 'model-x' };
const zalo = (text, opts = {}) => ({
  json: {
    headers: { 'x-bot-api-secret-token': opts.secret ?? 'bi-mat-123' },
    body: opts.flat
      ? { event_name: opts.event || 'message.text.received', message: { text, chat: { id: 'c1' }, from: { id: 'u1', display_name: 'Minh' } } }
      : { ok: true, result: { event_name: opts.event || 'message.text.received', message: { text, chat: { id: 'c1' }, from: { id: 'u1', display_name: 'Minh' } } } },
  },
});
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

// ---------- Đọc tin Zalo ----------
t('wrong secret is dropped', () => {
  assert.deepStrictEqual(run('doc-tin-zalo.js', { input: [zalo('hi', { secret: 'sai' })], nodes: { 'Cấu hình': CFG } }), []);
});
t('task message routes to AI with calendar', () => {
  const [o] = run('doc-tin-zalo.js', { input: [zalo('Lan ơi chiều thứ 6 gửi anh báo giá nhé, gấp!')], nodes: { 'Cấu hình': CFG }, now: NOW });
  assert.strictEqual(o.json.route, 'ai');
  assert.strictEqual(o.json.chatId, 'c1');
  assert.strictEqual(o.json.sender, 'Minh');
  assert.strictEqual(o.json.nowText, '2026-10-15 09:30');
  const r = o.json.aiRequest;
  assert.strictEqual(r.model, 'model-x');
  assert.strictEqual(r.output_config.format.type, 'json_schema');
  assert.match(r.messages[0].content, /Thứ Năm, 15\/10\/2026 09:30/);
  assert.match(r.messages[0].content, /Thứ Sáu 16\/10\/2026 = 2026-10-16 \(ngày mai\)/);
});
t('flat payload (no result wrapper) also works', () => {
  const [o] = run('doc-tin-zalo.js', { input: [zalo('Gửi báo cáo tuần trước thứ 2', { flat: true })], nodes: { 'Cấu hình': CFG } });
  assert.strictEqual(o.json.route, 'ai');
});
t('commands are recognised with or without accents', () => {
  const r = (txt) => run('doc-tin-zalo.js', { input: [zalo(txt)], nodes: { 'Cấu hình': CFG } })[0].json;
  assert.deepStrictEqual([r('xong k7q2').lenh, r('xong k7q2').taskId, r('xong k7q2').trangThai], ['cap_nhat', 'K7Q2', 'Xong']);
  assert.strictEqual(r('Xóa ABCD').trangThai, 'Đã xóa');
  assert.strictEqual(r('việc').lenh, 'danh_sach');
  assert.strictEqual(r('/viec').lenh, 'danh_sach');
  assert.strictEqual(r('hd').route, 'tra_loi');
  assert.strictEqual(r('ok').route, 'tra_loi');
});
t('non-text message gets a polite reply', () => {
  const [o] = run('doc-tin-zalo.js', { input: [zalo('', { event: 'message.image.received' })], nodes: { 'Cấu hình': CFG } });
  assert.strictEqual(o.json.route, 'tra_loi');
});

// ---------- Tách công việc ----------
const TIN = { chatId: 'c1', sender: 'Minh', text: 'Lan ơi chiều thứ 6 gửi anh báo giá nhé, gấp!', nowText: '2026-10-15 09:30' };
const aiRes = (tasks) => ({ json: { type: 'message', stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify({ tasks }) }] } });
t('AI tasks become sheet rows and a reply', () => {
  const [o] = run('tach-cong-viec.js', {
    input: [aiRes([{ viec: 'Gửi báo giá', nguoi_lam: 'Lan', han_chot: '2026-10-16 17:00', uu_tien: 'Cao', du_an: 'Q7' }, { viec: 'Gọi khách', nguoi_lam: '', han_chot: 'thứ 6', uu_tien: 'xx', du_an: '' }])],
    nodes: { 'Đọc tin Zalo': TIN },
  });
  assert.strictEqual(o.json.coViec, true);
  assert.strictEqual(o.json.rows.length, 2);
  const [a, b] = o.json.rows;
  assert.match(a.ID, /^[A-Z2-9]{4}$/);
  assert.strictEqual(a.HanChot, '2026-10-16 17:00');
  assert.strictEqual(a.TrangThai, 'Mới');
  assert.strictEqual(b.HanChot, '', 'invalid date dropped');
  assert.strictEqual(b.UuTien, 'Bình thường', 'invalid priority normalised');
  assert.deepStrictEqual(Object.keys(a), ['ID', 'Viec', 'NguoiLam', 'HanChot', 'UuTien', 'DuAn', 'TrangThai', 'TinGoc', 'NguoiGui', 'ChatID', 'TaoLuc', 'XongLuc', 'DaNhac']);
  assert.match(o.json.reply, /17:00 Thứ Sáu 16\/10/);
  assert.match(o.json.reply, /🔥 Gấp/);
});
t('no tasks gives explanation', () => {
  const [o] = run('tach-cong-viec.js', { input: [aiRes([])], nodes: { 'Đọc tin Zalo': TIN } });
  assert.strictEqual(o.json.coViec, false);
  assert.match(o.json.reply, /không thấy việc/);
});
t('API error is reported to the user', () => {
  const [o] = run('tach-cong-viec.js', { input: [{ json: { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } } }], nodes: { 'Đọc tin Zalo': TIN } });
  assert.match(o.json.reply, /invalid x-api-key/);
});
t('refusal handled', () => {
  const [o] = run('tach-cong-viec.js', { input: [{ json: { stop_reason: 'refusal', content: [] } }], nodes: { 'Đọc tin Zalo': TIN } });
  assert.strictEqual(o.json.coViec, false);
});

// ---------- Xử lý lệnh ----------
const ROWS = [
  { ID: 'AAAA', Viec: 'Gửi báo giá', NguoiLam: 'Lan', HanChot: '2026-10-16 17:00', UuTien: 'Cao', TrangThai: 'Mới', ChatID: 'c1', row_number: 2 },
  { ID: 'BBBB', Viec: 'Nộp hồ sơ', NguoiLam: '', HanChot: '14/10/2026 10:00', UuTien: 'Bình thường', TrangThai: 'Mới', ChatID: 'c1', row_number: 3 },
  { ID: 'CCCC', Viec: 'Việc cũ', HanChot: '', TrangThai: 'Xong', ChatID: 'c1', row_number: 4 },
  { ID: 'DDDD', Viec: 'Gọi điện', HanChot: '2026-10-15 15:00', TrangThai: 'Mới', ChatID: 'c1', row_number: 5 },
].map((json) => ({ json }));
t('list shows open tasks sorted, overdue flagged', () => {
  const [o] = run('xu-ly-lenh.js', { input: ROWS, nodes: { 'Đọc tin Zalo': { chatId: 'c1', lenh: 'danh_sach' } }, now: NOW });
  assert.strictEqual(o.json.canCapNhat, false);
  assert.match(o.json.reply, /3 việc đang mở/);
  const lines = o.json.reply.split('\n').filter((l) => l.startsWith('•'));
  assert.deepStrictEqual(lines.map((l) => l.slice(3, 7)), ['BBBB', 'DDDD', 'AAAA']);
  assert.match(lines[0], /trễ hạn \(14\/10\)/);
  assert.match(lines[1], /hôm nay 15:00/);
});
t('empty sheet (alwaysOutputData item) handled', () => {
  const [o] = run('xu-ly-lenh.js', { input: [{ json: {} }], nodes: { 'Đọc tin Zalo': { chatId: 'c1', lenh: 'danh_sach' } } });
  assert.match(o.json.reply, /không còn việc/);
});
t('xong marks task for update', () => {
  const [o] = run('xu-ly-lenh.js', { input: ROWS, nodes: { 'Đọc tin Zalo': { chatId: 'c1', lenh: 'cap_nhat', taskId: 'AAAA', trangThai: 'Xong' } }, now: NOW });
  assert.deepStrictEqual([o.json.canCapNhat, o.json.ID, o.json.TrangThai, o.json.XongLuc], [true, 'AAAA', 'Xong', '2026-10-15 09:30']);
});
t('unknown id is not updated', () => {
  const [o] = run('xu-ly-lenh.js', { input: ROWS, nodes: { 'Đọc tin Zalo': { chatId: 'c1', lenh: 'cap_nhat', taskId: 'ZZZZ', trangThai: 'Xong' } } });
  assert.strictEqual(o.json.canCapNhat, false);
});

// ---------- Soạn tin nhắc ----------
const ALL = [
  ...ROWS,
  { json: { ID: 'EEEE', Viec: 'Họp', HanChot: '2026-10-15 10:00', TrangThai: 'Mới', ChatID: 'c2', DaNhac: '' } },
  { json: { ID: 'FFFF', Viec: 'Đã nhắc', HanChot: '2026-10-15 10:00', TrangThai: 'Mới', ChatID: 'c2', DaNhac: 'x' } },
  { json: { ID: 'GGGG', Viec: 'Không hạn', HanChot: '', TrangThai: 'Mới', ChatID: 'c2' } },
];
t('morning summary per chat', () => {
  const out = run('soan-tin-nhac.js', { input: ALL, nodes: { 'Cấu hình': { CHE_DO: 'sang' } }, now: NOW });
  assert.deepStrictEqual(out.map((o) => o.json.chatId).sort(), ['c1', 'c2']);
  const c1 = out.find((o) => o.json.chatId === 'c1').json.reply;
  assert.match(c1, /3 việc đang mở/);
  assert.match(c1, /Trễ hạn:\n• \[BBBB\]/);
  assert.match(c1, /Hôm nay:\n• \[DDDD\] Gọi điện: 15:00/);
  assert.match(c1, /7 ngày tới:\n• \[AAAA\].*Thứ Sáu 16\/10/);
  assert.match(out.find((o) => o.json.chatId === 'c2').json.reply, /1 việc chưa có hạn/);
});
t('hourly reminder only for tasks due within 60 min and not yet reminded', () => {
  const out = run('soan-tin-nhac.js', { input: ALL, nodes: { 'Cấu hình': { CHE_DO: 'nhac' } }, now: NOW });
  assert.deepStrictEqual(out.map((o) => o.json.ID), ['EEEE']);
  assert.strictEqual(out[0].json.DaNhac, 'x');
  assert.match(out[0].json.reply, /10:00/);
});

console.log(`\n${n} tests passed`);
