/**
 * ZaloPlan – bot Zalo lập kế hoạch công việc, chạy bằng Google Apps Script.
 *
 * KHÔNG CẦN SỬA GÌ TRONG FILE NÀY. Sau khi dán và lưu, tải lại Google Sheet,
 * rồi dùng menu "🤖 ZaloPlan" trên thanh menu của bảng tính.
 * Hướng dẫn: xem file HUONG-DAN.md.
 */
const TEN_TRANG = 'CongViec';
const COT = ['ID', 'Viec', 'NguoiLam', 'HanChot', 'UuTien', 'DuAn', 'TrangThai', 'TinGoc', 'NguoiGui', 'ChatID', 'TaoLuc', 'XongLuc', 'DaNhac'];
const ZALO_API = 'https://bot-api.zaloplatforms.com/bot';
const THU = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const HUONG_DAN =
  'Chào bạn, mình là ZaloPlan 👋\n\n' +
  'Chuyển tiếp (forward) hoặc dán tin nhắn giao việc cho mình, mình sẽ tự lưu thành công việc.\n\n' +
  'Các lệnh:\n' +
  '• viec: xem việc đang mở\n' +
  '• xong ABCD: đánh dấu việc ABCD đã xong\n' +
  '• xoa ABCD: xóa việc ABCD (khi AI hiểu sai)';

const MO_HINH_MANH = 'claude-opus-5-5';
const MO_HINH_TIET_KIEM = 'claude-haiku-5-5';

/** Cấu hình lưu trong "Thuộc tính tập lệnh" (Script Properties), nhập qua menu. */
function cfg_() {
  const p = PropertiesService.getScriptProperties();
  return {
    BOT_TOKEN: p.getProperty('BOT_TOKEN') || '',
    KHOA_CLAUDE: p.getProperty('KHOA_CLAUDE') || '',
    MA_BI_MAT: p.getProperty('MA_BI_MAT') || '',
    LINK_WEB_APP: p.getProperty('LINK_WEB_APP') || '',
    MO_HINH_AI: p.getProperty('MO_HINH_AI') || MO_HINH_MANH,
  };
}

// ---------------------------------------------------------------------------
// 1. Menu trong Google Sheet và cài đặt
// ---------------------------------------------------------------------------
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🤖 ZaloPlan')
    .addItem('⚙️ Cài đặt và kết nối bot', 'menuCaiDat')
    .addItem('🔍 Kiểm tra kết nối', 'menuKiemTra')
    .addSeparator()
    .addItem('💰 Đổi sang AI tiết kiệm (Haiku)', 'menuAiTietKiem')
    .addItem('🧠 Đổi sang AI mạnh (Opus)', 'menuAiManh')
    .addSeparator()
    .addItem('⚡ Thử chế độ webhook (nâng cao)', 'menuWebhook')
    .addToUi();
}

function hoi_(ui, tieuDe, giaiThich) {
  const r = ui.prompt(tieuDe, giaiThich, ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return null;
  return r.getResponseText().trim();
}

function chayVaBao_(ui, fn) {
  try {
    ui.alert('✅ Cài đặt thành công', fn().join('\n'), ui.ButtonSet.OK);
  } catch (err) {
    ui.alert('⚠️ Chưa xong', String(err.message || err) + '\n\nSửa lại rồi bấm menu lần nữa.', ui.ButtonSet.OK);
  }
}

function menuCaiDat() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  const cu = cfg_();
  const giu = (v) => (v ? ' (đang có, để trống nếu giữ nguyên)' : '');

  const token = hoi_(ui, '1/2. Token bot Zalo', 'Dán token Zalo nhận được khi tạo bot (dạng 1234567890:AbCd...)' + giu(cu.BOT_TOKEN));
  if (token === null) return;
  const khoa = hoi_(ui, '2/2. Khóa Claude', 'Dán khóa API Claude (bắt đầu bằng sk-ant-)' + giu(cu.KHOA_CLAUDE));
  if (khoa === null) return;
  if (token) props.setProperty('BOT_TOKEN', token);
  if (khoa) props.setProperty('KHOA_CLAUDE', khoa);
  chayVaBao_(ui, caiDat);
}

function menuWebhook() {
  const ui = SpreadsheetApp.getUi();
  const link = hoi_(ui, 'Chế độ webhook (nâng cao)', 'Chỉ dùng khi được hướng dẫn. Dán link ứng dụng web (https://script.google.com/macros/s/.../exec)');
  if (!link) return;
  PropertiesService.getScriptProperties().setProperty('LINK_WEB_APP', link);
  chayVaBao_(ui, caiDatWebhook);
}

function menuKiemTra() {
  const ui = SpreadsheetApp.getUi();
  const c = cfg_();
  const props = PropertiesService.getScriptProperties();
  const coLich = (fn) => (ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === fn) ? 'đang bật' : 'CHƯA BẬT');
  const cheDo = props.getProperty('CHE_DO_NHAN_TIN') === 'webhook' ? 'webhook' : 'hỏi Zalo mỗi phút';
  const dong = [
    'Token Zalo: ' + (c.BOT_TOKEN ? 'đã có' : 'CHƯA CÓ'),
    'Khóa Claude: ' + (c.KHOA_CLAUDE ? 'đã có' : 'CHƯA CÓ'),
    'Mô hình AI: ' + c.MO_HINH_AI,
    'Cách nhận tin: ' + cheDo,
    'Lịch hỏi tin mỗi phút: ' + coLich('layTinMoi'),
    'Lịch nhắc việc mỗi 15 phút: ' + coLich('moi15Phut'),
    'Lần hỏi tin gần nhất: ' + (props.getProperty('lanHoiTin') || 'chưa có'),
  ];
  if (c.BOT_TOKEN) {
    const me = goiZalo_('getMe', {});
    dong.push('Bot Zalo: ' + (me.ok ? 'hoạt động (' + ((me.result && me.result.account_name) || '') + ')' : 'LỖI ' + JSON.stringify(me).slice(0, 150)));
  }
  ui.alert('🔍 Trạng thái ZaloPlan', dong.join('\n'), ui.ButtonSet.OK);
}

function menuAiTietKiem() { doiMoHinh_(MO_HINH_TIET_KIEM, 'AI tiết kiệm (Haiku): rẻ hơn khoảng 40 lần.'); }
function menuAiManh() { doiMoHinh_(MO_HINH_MANH, 'AI mạnh (Opus): hiểu tin phức tạp tốt hơn, tốn credit hơn.'); }
function doiMoHinh_(model, moTa) {
  PropertiesService.getScriptProperties().setProperty('MO_HINH_AI', model);
  SpreadsheetApp.getUi().alert('Đã đổi mô hình', 'Bot sẽ dùng ' + moTa + '\nCó hiệu lực ngay với tin nhắn tiếp theo.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function taoMaBiMat_() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 32 }, () => abc[Math.floor(Math.random() * abc.length)]).join('');
}

function datLich_(fns) {
  ScriptApp.getProjectTriggers()
    .filter((t) => ['moi15Phut', 'layTinMoi'].indexOf(t.getHandlerFunction()) >= 0)
    .forEach((t) => ScriptApp.deleteTrigger(t));
  fns.forEach(([fn, phut]) => ScriptApp.newTrigger(fn).timeBased().everyMinutes(phut).create());
}

/** Kiểm tra token, khóa, bảng tính; bật chế độ hỏi Zalo mỗi phút. Trả về các dòng kết quả. */
function caiDat() {
  const c = cfg_();
  if (!c.BOT_TOKEN) throw new Error('Chưa có token bot Zalo.');
  if (!/^sk-ant-/.test(c.KHOA_CLAUDE)) throw new Error('Khóa Claude phải bắt đầu bằng sk-ant-');
  const props = PropertiesService.getScriptProperties();
  if (!c.MA_BI_MAT) props.setProperty('MA_BI_MAT', taoMaBiMat_());
  const kq = [];
  const sheet = layTrang_();
  sheet.getRange(1, 1, sheet.getMaxRows(), COT.length).setNumberFormat('@'); // giữ nguyên chữ, không tự đổi thành ngày
  kq.push('✅ Bảng tính CongViec đúng 13 cột.');

  const me = goiZalo_('getMe', {});
  if (!me.ok) throw new Error('Token Zalo không đúng. Zalo trả lời: ' + JSON.stringify(me).slice(0, 200));
  kq.push('✅ Token Zalo đúng. Bot: ' + ((me.result && me.result.account_name) || ''));

  const ai = goiClaude_({ model: c.MO_HINH_AI, max_tokens: 1000, messages: [{ role: 'user', content: 'Trả lời đúng một chữ: OK' }] });
  if (!ai || ai.type === 'error') throw new Error('Khóa Claude có vấn đề: ' + JSON.stringify(ai && ai.error).slice(0, 200));
  kq.push('✅ Khóa Claude dùng được (' + c.MO_HINH_AI + ').');

  goiZalo_('deleteWebhook', {}); // cách hỏi tin chỉ chạy khi không có webhook
  props.setProperty('CHE_DO_NHAN_TIN', 'hoi_tin');
  datLich_([['layTinMoi', 1], ['moi15Phut', 15]]);
  kq.push('✅ Đã bật: hỏi Zalo có tin mới mỗi phút.');
  kq.push('✅ Đã bật: tóm tắt 8h sáng và nhắc trước hạn (kiểm tra mỗi 15 phút).');
  kq.push('');
  kq.push('🎉 Xong! Mở Zalo, nhắn "hd" cho bot. Bot trả lời trong vòng khoảng 1 phút.');
  kq.forEach((d) => console.log(d));
  return kq;
}

/** Chế độ nâng cao: Zalo gửi tin thẳng tới ứng dụng web (nhanh hơn, nếu Zalo chấp nhận link của Google). */
function caiDatWebhook() {
  const c = cfg_();
  if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(c.LINK_WEB_APP)) throw new Error('Link ứng dụng web chưa đúng (phải kết thúc bằng /exec).');
  const props = PropertiesService.getScriptProperties();
  if (!c.MA_BI_MAT) props.setProperty('MA_BI_MAT', taoMaBiMat_());
  const key = props.getProperty('MA_BI_MAT');
  const wh = goiZalo_('setWebhook', { url: c.LINK_WEB_APP + '?key=' + key, secret_token: key });
  if (!wh.ok) throw new Error('Zalo không nhận webhook: ' + JSON.stringify(wh).slice(0, 200));
  props.setProperty('CHE_DO_NHAN_TIN', 'webhook');
  datLich_([['moi15Phut', 15]]);
  return ['✅ Đã chuyển sang chế độ webhook.', 'Nếu nhắn bot không thấy trả lời, bấm "Cài đặt và kết nối bot" để quay lại chế độ hỏi tin mỗi phút.'];
}

// ---------------------------------------------------------------------------
// 2. Nhận tin Zalo: hỏi Zalo mỗi phút (mặc định), hoặc Zalo gửi tới (webhook)
// ---------------------------------------------------------------------------
function layTinMoi() {
  const batDau = Date.now();
  PropertiesService.getScriptProperties().setProperty('lanHoiTin', vn(batDau).ymd + ' ' + vn(batDau).hm);
  for (let i = 0; i < 10 && Date.now() - batDau < 25000; i++) {
    const r = goiZalo_('getUpdates', { timeout: '1' });
    const ds = r && r.ok && r.result ? (Array.isArray(r.result) ? r.result : [r.result]) : [];
    const coTin = ds.filter((u) => u && u.message);
    if (!coTin.length) break;
    coTin.forEach((u) => {
      try { xuLyCapNhat_(u); } catch (err) { console.error(err && err.stack ? err.stack : err); }
    });
  }
}

function doGet() {
  return HtmlService.createHtmlOutput('ZaloPlan đang chạy.');
}

function doPost(e) {
  try {
    if (!e || !e.parameter || !cfg_().MA_BI_MAT || e.parameter.key !== cfg_().MA_BI_MAT) return HtmlService.createHtmlOutput('ok');
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    xuLyCapNhat_(body.result || body);
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
  }
  return HtmlService.createHtmlOutput('ok');
}

/** Xử lý một tin, bỏ qua nếu tin này đã xử lý rồi (Zalo có thể gửi lặp). */
function xuLyCapNhat_(update) {
  const msg = update.message || {};
  const cache = CacheService.getScriptCache();
  const maTin = 'tin_' + (msg.message_id || Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(msg))));
  if (cache.get(maTin)) return;
  cache.put(maTin, '1', 21600);
  try {
    xuLyTin_(update);
  } catch (err) {
    cache.remove(maTin); // lỗi thì cho phép xử lý lại lần sau
    throw err;
  }
}

function xuLyTin_(update) {
  const tin = phanTichTin(update);
  if (!tin) return;
  if (tin.route === 'tra_loi') return guiTin_(tin.chatId, tin.reply);

  const now = Date.now();
  // Gọi AI trước, ngoài khóa, để nhiều tin đến cùng lúc không phải chờ nhau
  const res = tin.route === 'ai' ? goiClaude_(taoYeuCauAI(tin, cfg_().MO_HINH_AI, now)) : null;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let reply;
  try {
    const sheet = layTrang_();
    const rows = docViec_(sheet);
    if (tin.route === 'sheet') {
      const kq = xuLyLenh(rows.filter((r) => String(r.ChatID) === tin.chatId), tin, now);
      if (kq.canCapNhat) ghiO_(sheet, rows, kq.ID, { TrangThai: kq.TrangThai, XongLuc: kq.XongLuc });
      reply = kq.reply;
    } else {
      const kq = tachCongViec(res, tin, now, new Set(rows.map((r) => r.ID)));
      themDong_(sheet, kq.rows);
      reply = kq.reply;
    }
  } finally {
    lock.releaseLock();
  }
  guiTin_(tin.chatId, reply);
}

// ---------------------------------------------------------------------------
// 3. Chạy tự động mỗi 15 phút: tóm tắt 8h sáng và nhắc việc sắp đến hạn
// ---------------------------------------------------------------------------
function moi15Phut() {
  const now = Date.now();
  const props = PropertiesService.getScriptProperties();
  const homNay = vn(now).ymd;
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  const canGui = [];
  try {
    const sheet = layTrang_();
    const rows = docViec_(sheet);
    if (vn(now).gio === 8 && props.getProperty('tomTatNgay') !== homNay) {
      props.setProperty('tomTatNgay', homNay);
      canGui.push(...soanTinNhac(rows, 'sang', now));
    }
    soanTinNhac(rows, 'nhac', now).forEach((m) => {
      ghiO_(sheet, rows, m.ID, { DaNhac: 'x' });
      canGui.push(m);
    });
  } finally {
    lock.releaseLock();
  }
  canGui.forEach((m) => guiTin_(m.chatId, m.reply));
}

// ---------------------------------------------------------------------------
// 4. Google Sheet, Zalo, Claude
// ---------------------------------------------------------------------------
function layTrang_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_TRANG);
  if (!sheet) throw new Error('Không thấy trang tính tên "' + TEN_TRANG + '". Đổi tên tab ở góc dưới bảng tính.');
  const head = sheet.getRange(1, 1, 1, COT.length).getDisplayValues()[0];
  const sai = COT.filter((c, i) => head[i] !== c);
  if (sai.length) throw new Error('Dòng tiêu đề thiếu hoặc sai cột: ' + sai.join(', '));
  return sheet;
}

function docViec_(sheet) {
  const n = sheet.getLastRow() - 1;
  if (n < 1) return [];
  return sheet.getRange(2, 1, n, COT.length).getDisplayValues().map((v, i) => {
    const r = { _dong: i + 2 };
    COT.forEach((c, j) => (r[c] = String(v[j]).trim()));
    return r;
  }).filter((r) => r.ID);
}

function themDong_(sheet, rows) {
  if (!rows.length) return;
  const range = sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, COT.length);
  range.setNumberFormat('@');
  range.setValues(rows.map((r) => COT.map((c) => r[c] == null ? '' : String(r[c]))));
}

function ghiO_(sheet, rows, id, giaTri) {
  const r = rows.find((x) => x.ID === id);
  if (!r) return;
  Object.entries(giaTri).forEach(([c, v]) => {
    const o = sheet.getRange(r._dong, COT.indexOf(c) + 1);
    o.setNumberFormat('@');
    o.setValue(v);
    r[c] = v;
  });
}

function goiZalo_(method, payload) {
  const res = UrlFetchApp.fetch(ZALO_API + cfg_().BOT_TOKEN + '/' + method, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true,
  });
  try { return JSON.parse(res.getContentText()); } catch (e) { return { ok: false, http: res.getResponseCode(), text: res.getContentText().slice(0, 300) }; }
}

function guiTin_(chatId, text) {
  return goiZalo_('sendMessage', { chat_id: chatId, text: String(text).slice(0, 2000) });
}

function goiClaude_(yeuCau) {
  const coFallback = Boolean(yeuCau.fallbacks);
  const headers = { 'x-api-key': cfg_().KHOA_CLAUDE, 'anthropic-version': '2023-06-01' };
  if (coFallback) headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
  try {
    const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post', contentType: 'application/json', headers, payload: JSON.stringify(yeuCau), muteHttpExceptions: true,
    });
    return JSON.parse(res.getContentText());
  } catch (err) {
    return { type: 'error', error: { type: 'network_error', message: String(err) } };
  }
}

// ---------------------------------------------------------------------------
// 5. Xử lý nội dung (không phụ thuộc Google, đã có bài kiểm tra tự động)
// ---------------------------------------------------------------------------
function pad2(n) { return String(n).padStart(2, '0'); }

/** Giờ Việt Nam (UTC+7, không đổi giờ) của một thời điểm. */
function vn(ms) {
  const d = new Date(ms + 7 * 3600 * 1000);
  return {
    ymd: `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`,
    dmy: `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`,
    dm: `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}`,
    hm: `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`,
    gio: d.getUTCHours(),
    thu: THU[d.getUTCDay()],
  };
}

/** Đọc hạn chót "2026-10-16 17:00" hoặc "16/10/2026 17:00" (giờ Việt Nam). Không có giờ thì 17:00. */
function hanMs(s) {
  s = String(s || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 17, m[5] ? +m[5] : 0) - 7 * 3600 * 1000;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1], m[4] ? +m[4] : 17, m[5] ? +m[5] : 0) - 7 * 3600 * 1000;
  return null;
}

function boDau(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Hiểu tin Zalo gửi tới: lệnh, tin cần AI đọc, hay chỉ cần trả lời nhanh. */
function phanTichTin(update) {
  const msg = update.message || {};
  const chatId = String((msg.chat && msg.chat.id) || (msg.from && msg.from.id) || '');
  const sender = (msg.from && (msg.from.display_name || msg.from.name)) || '';
  const text = String(msg.text || '').trim();
  if (!chatId) return null;
  const out = (o) => Object.assign({ chatId, sender, text }, o);

  if (update.event_name && update.event_name !== 'message.text.received') {
    return out({ route: 'tra_loi', reply: 'Hiện mình chỉ đọc được tin nhắn chữ. Bạn dán nội dung tin nhắn giúp mình nhé.' });
  }
  if (!text) return null;
  const plain = boDau(text);
  let m = plain.match(/^\/?(xong|done|ok xong)\s+#?([a-z0-9]{4})$/);
  if (m) return out({ route: 'sheet', lenh: 'cap_nhat', trangThai: 'Xong', taskId: m[2].toUpperCase() });
  m = plain.match(/^\/?(xoa|huy)\s+#?([a-z0-9]{4})$/);
  if (m) return out({ route: 'sheet', lenh: 'cap_nhat', trangThai: 'Đã xóa', taskId: m[2].toUpperCase() });
  if (/^\/?(viec|ds|danh sach|list|cong viec)$/.test(plain)) return out({ route: 'sheet', lenh: 'danh_sach' });
  if (/^\/?(start|help|huong dan|hd|menu)$/.test(plain)) return out({ route: 'tra_loi', reply: HUONG_DAN });
  if (plain.length < 4) return out({ route: 'tra_loi', reply: 'Mình chưa thấy việc nào trong tin này. Gõ "hd" để xem hướng dẫn.' });
  return out({ route: 'ai' });
}

/** Câu hỏi gửi Claude, kèm lịch 14 ngày để AI tính đúng ngày. */
function taoYeuCauAI(tin, model, nowMs) {
  const now = vn(nowMs);
  const lich = [];
  for (let i = 0; i <= 14; i++) {
    const d = vn(nowMs + i * 86400000);
    lich.push(`${d.thu} ${d.dmy} = ${d.ymd}${i === 0 ? ' (hôm nay)' : i === 1 ? ' (ngày mai)' : ''}`);
  }
  const system = [
    'Bạn là trợ lý đọc tin nhắn Zalo tiếng Việt và tách ra các công việc cần làm.',
    'Quy tắc:',
    '- Chỉ tạo việc khi tin nhắn có yêu cầu, nhiệm vụ hoặc lời hẹn cần làm. Chào hỏi, cảm ơn, xác nhận ("ok", "đã nhận"), chuyện phiếm thì trả về danh sách rỗng.',
    '- Một tin có thể có nhiều việc; tách riêng từng việc.',
    '- viec: ngắn gọn, bắt đầu bằng động từ, tối đa 80 ký tự, giữ tên riêng và con số quan trọng.',
    '- nguoi_lam: tên người được giao (ví dụ "Lan ơi..." thì là Lan). Không rõ thì để chuỗi rỗng.',
    '- han_chot: dạng "YYYY-MM-DD HH:mm" theo giờ Việt Nam, tính từ thời điểm hiện tại và lịch được cho. Quy ước giờ: sáng 09:00, trưa 12:00, chiều 17:00, tối 20:00, cuối ngày 17:00; chỉ có ngày mà không có giờ thì 17:00. "Thứ X" là thứ X gần nhất sắp tới; "thứ X tuần sau" là thứ X của tuần kế tiếp; "cuối tuần" là Thứ Bảy; "cuối tháng" là ngày cuối tháng. Không có hạn thì để chuỗi rỗng, không tự đoán.',
    '- uu_tien: "Cao" nếu có gấp, khẩn, ASAP, quan trọng, ngay; "Thấp" nếu khi rảnh, không gấp; còn lại "Bình thường".',
    '- du_an: tên dự án, công trình, khách hàng hoặc đơn hàng nếu có, không thì chuỗi rỗng.',
    '- Hiểu cả tiếng Việt không dấu và viết tắt: ko/k = không, dc/đc = được, a = anh, e = em, c = chị, nhé/nha/nhe.',
  ].join('\n');
  const user = [
    `Thời điểm hiện tại: ${now.thu}, ${now.dmy} ${now.hm} (giờ Việt Nam).`,
    'Lịch tham khảo:', ...lich, '',
    `Người gửi tin cho bot: ${tin.sender || '(không rõ)'}`,
    'Tin nhắn:', '"""', tin.text.slice(0, 4000), '"""',
  ].join('\n');
  const schema = {
    type: 'object', additionalProperties: false, required: ['tasks'],
    properties: {
      tasks: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false,
          required: ['viec', 'nguoi_lam', 'han_chot', 'uu_tien', 'du_an'],
          properties: {
            viec: { type: 'string' }, nguoi_lam: { type: 'string' }, han_chot: { type: 'string' },
            uu_tien: { type: 'string', enum: ['Cao', 'Bình thường', 'Thấp'] }, du_an: { type: 'string' },
          },
        },
      },
    },
  };
  const req = {
    model, max_tokens: 4000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    system, messages: [{ role: 'user', content: user }],
  };
  if (!/haiku/.test(model)) req.fallbacks = 'default'; // Haiku không có chế độ dự phòng phía máy chủ
  return req;
}

function hienHan(s) {
  const ms = hanMs(s);
  if (ms == null) return 'chưa có hạn';
  const d = vn(ms);
  return `${d.hm} ${d.thu} ${d.dm}`;
}

/** Đọc kết quả Claude → các dòng việc mới và tin trả lời. Lỗi AI thì lưu việc thô. */
function tachCongViec(res, tin, nowMs, idDaCo) {
  const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const taoId = () => {
    let id;
    do id = Array.from({ length: 4 }, () => ABC[Math.floor(Math.random() * ABC.length)]).join('');
    while (idDaCo && idDaCo.has(id));
    if (idDaCo) idDaCo.add(id);
    return id;
  };
  const t = vn(nowMs);
  const dong = (v) => ({
    ID: taoId(), Viec: v.viec, NguoiLam: v.nguoi_lam || '', HanChot: v.han_chot || '', UuTien: v.uu_tien || 'Bình thường',
    DuAn: v.du_an || '', TrangThai: 'Mới', TinGoc: tin.text.slice(0, 1000), NguoiGui: tin.sender, ChatID: tin.chatId,
    TaoLuc: `${t.ymd} ${t.hm}`, XongLuc: '', DaNhac: '',
  });

  let tasks = null, loi = '';
  if (!res || res.type === 'error' || res.error) loi = (res && res.error && (res.error.message || res.error.type)) || 'không rõ';
  else if (res.stop_reason === 'refusal') loi = 'AI từ chối xử lý tin này';
  else {
    const block = (res.content || []).filter((b) => b.type === 'text').pop();
    try { tasks = JSON.parse(block ? block.text : '').tasks || []; } catch (e) { loi = 'không đọc được kết quả AI'; }
  }

  if (loi) {
    const r = dong({ viec: tin.text.replace(/\s+/g, ' ').slice(0, 80) });
    return {
      rows: [r],
      reply: `⚠️ AI đang lỗi (${String(loi).slice(0, 200)}), nên mình lưu tạm nguyên tin thành việc [${r.ID}]. ` +
        'Bạn mở Google Sheet để sửa hạn chót và người làm nhé. Nếu lỗi lặp lại, kiểm tra khóa và credit Claude.',
    };
  }

  const rows = tasks.filter((v) => v && String(v.viec || '').trim()).slice(0, 10).map((v) => dong({
    viec: String(v.viec).trim().slice(0, 200),
    nguoi_lam: String(v.nguoi_lam || '').trim(),
    han_chot: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(String(v.han_chot || '')) && hanMs(v.han_chot) != null ? v.han_chot : '',
    uu_tien: ['Cao', 'Bình thường', 'Thấp'].indexOf(v.uu_tien) >= 0 ? v.uu_tien : 'Bình thường',
    du_an: String(v.du_an || '').trim(),
  }));
  if (!rows.length) return { rows, reply: 'Mình không thấy việc nào cần làm trong tin này. Nếu có, bạn viết rõ hơn (ai làm, việc gì, hạn khi nào) nhé.' };

  const chiTiet = rows.map((r) => {
    const ct = [r.NguoiLam && `👤 ${r.NguoiLam}`, `⏰ ${hienHan(r.HanChot)}`, r.UuTien === 'Cao' && '🔥 Gấp', r.DuAn && `📁 ${r.DuAn}`].filter(Boolean).join(' · ');
    return `[${r.ID}] ${r.Viec}\n${ct}`;
  });
  return {
    rows,
    reply: `📝 Đã lưu ${rows.length} việc:\n\n${chiTiet.join('\n\n')}\n\nLàm xong thì trả lời "xong ${rows[0].ID}". AI hiểu sai thì "xoa ${rows[0].ID}".`,
  };
}

/** Lệnh "viec", "xong ABCD", "xoa ABCD" trên các việc của chính người gửi. */
function xuLyLenh(rows, tin, nowMs) {
  if (tin.lenh === 'cap_nhat') {
    const viec = rows.find((r) => String(r.ID).toUpperCase() === tin.taskId);
    if (!viec) return { canCapNhat: false, reply: `Mình không tìm thấy việc ${tin.taskId} của bạn. Gõ "viec" để xem mã các việc đang mở.` };
    const t = vn(nowMs);
    return {
      canCapNhat: true, ID: viec.ID, TrangThai: tin.trangThai, XongLuc: `${t.ymd} ${t.hm}`,
      reply: tin.trangThai === 'Xong' ? `✅ Tuyệt! Đã đánh dấu xong: [${viec.ID}] ${viec.Viec}` : `🗑 Đã xóa việc: [${viec.ID}] ${viec.Viec}`,
    };
  }
  const mo = rows.filter((r) => r.TrangThai === 'Mới').map((r) => Object.assign({}, r, { _han: hanMs(r.HanChot) }))
    .sort((a, b) => (a._han == null ? Infinity : a._han) - (b._han == null ? Infinity : b._han));
  if (!mo.length) return { canCapNhat: false, reply: '🎉 Bạn không còn việc nào đang mở. Chuyển tiếp tin giao việc cho mình để thêm việc mới nhé.' };
  const homNay = vn(nowMs).ymd;
  const dong = mo.slice(0, 30).map((r) => {
    let han = 'chưa có hạn';
    if (r._han != null) {
      const d = vn(r._han);
      han = r._han < nowMs ? `⚠️ trễ hạn (${d.dm})` : d.ymd === homNay ? `hôm nay ${d.hm}` : `${d.hm} ${d.thu} ${d.dm}`;
    }
    return `• [${r.ID}] ${r.Viec}${r.NguoiLam ? ` (${r.NguoiLam})` : ''}: ${han}${r.UuTien === 'Cao' ? ' 🔥' : ''}`;
  });
  const them = mo.length > 30 ? `\n…và ${mo.length - 30} việc khác.` : '';
  return { canCapNhat: false, reply: `📋 Bạn có ${mo.length} việc đang mở:\n\n${dong.join('\n')}${them}\n\nLàm xong thì trả lời "xong" kèm mã việc.` };
}

/** Tin tóm tắt buổi sáng ("sang") hoặc tin nhắc việc sắp đến hạn trong 60 phút ("nhac"). */
function soanTinNhac(rows, cheDo, nowMs) {
  const mo = rows.filter((r) => r.ID && r.ChatID && r.TrangThai === 'Mới');
  const out = [];
  if (cheDo === 'nhac') {
    mo.forEach((r) => {
      const han = hanMs(r.HanChot);
      if (han == null || han <= nowMs || han > nowMs + 60 * 60 * 1000 || r.DaNhac) return;
      out.push({ chatId: r.ChatID, ID: r.ID, reply: `⏰ Sắp đến hạn lúc ${vn(han).hm}:\n[${r.ID}] ${r.Viec}${r.NguoiLam ? `\n👤 ${r.NguoiLam}` : ''}\n\nLàm xong thì trả lời "xong ${r.ID}".` });
    });
    return out;
  }
  const homNay = vn(nowMs).ymd;
  const theoNguoi = {};
  mo.forEach((r) => (theoNguoi[r.ChatID] = theoNguoi[r.ChatID] || []).push(Object.assign({}, r, { _han: hanMs(r.HanChot) })));
  Object.keys(theoNguoi).forEach((chatId) => {
    const ds = theoNguoi[chatId].sort((a, b) => (a._han == null ? Infinity : a._han) - (b._han == null ? Infinity : b._han));
    const tre = [], hn = [], sap = [];
    let chuaHan = 0;
    ds.forEach((r) => {
      const line = (h) => `• [${r.ID}] ${r.Viec}${r.NguoiLam ? ` (${r.NguoiLam})` : ''}${h ? `: ${h}` : ''}${r.UuTien === 'Cao' ? ' 🔥' : ''}`;
      if (r._han == null) { chuaHan++; return; }
      const d = vn(r._han);
      if (r._han < nowMs) tre.push(line(`hạn ${d.dm}`));
      else if (d.ymd === homNay) hn.push(line(d.hm));
      else if (r._han < nowMs + 7 * 86400000) sap.push(line(`${d.thu} ${d.dm}`));
    });
    const phan = [`☀️ Chào buổi sáng! Bạn có ${ds.length} việc đang mở.`];
    if (tre.length) phan.push(`⚠️ Trễ hạn:\n${tre.join('\n')}`);
    if (hn.length) phan.push(`📅 Hôm nay:\n${hn.join('\n')}`);
    if (sap.length) phan.push(`🗓 7 ngày tới:\n${sap.join('\n')}`);
    if (chuaHan) phan.push(`📌 ${chuaHan} việc chưa có hạn.`);
    phan.push('Gõ "viec" để xem đủ danh sách.');
    out.push({ chatId, reply: phan.join('\n\n') });
  });
  return out;
}
