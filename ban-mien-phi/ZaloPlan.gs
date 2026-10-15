/**
 * ZaloPlan – bot Zalo lập kế hoạch công việc, chạy bằng Google Apps Script.
 * Hướng dẫn cài đặt: xem file HUONG-DAN.md.
 *
 * ============ PHẦN BẠN CẦN ĐIỀN (chỉ sửa chữ trong dấu nháy) ============
 */
const CAU_HINH = {
  BOT_TOKEN: 'DIEN_BOT_TOKEN_ZALO',        // Token bot Zalo (Bước 1)
  KHOA_CLAUDE: 'DIEN_KHOA_CLAUDE',         // Khóa API Claude, bắt đầu bằng sk-ant- (Bước 3)
  MA_BI_MAT: 'DIEN_MA_BI_MAT_TU_DAT',      // Tự đặt: 16–40 ký tự, chỉ chữ không dấu và số
  LINK_WEB_APP: 'DIEN_LINK_WEB_APP',       // Link ứng dụng web sau khi Triển khai (Bước 5)
  // Mô hình AI. Từ 17/11/2026 (hết credit khuyến mãi) đổi thành: 'claude-haiku-5-5'
  MO_HINH_AI: 'claude-opus-5-5',
};
/* ======================= HẾT PHẦN CẦN ĐIỀN ============================= */

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

// ---------------------------------------------------------------------------
// 1. Cài đặt: chạy hàm này MỘT LẦN sau khi Triển khai (Deploy)
// ---------------------------------------------------------------------------
function caiDat() {
  const thieu = Object.entries(CAU_HINH).filter(([, v]) => String(v).startsWith('DIEN_')).map(([k]) => k);
  if (thieu.length) throw new Error('Bạn chưa điền: ' + thieu.join(', ') + '. Sửa ở đầu file rồi chạy lại.');
  if (!/^[A-Za-z0-9]{16,40}$/.test(CAU_HINH.MA_BI_MAT)) throw new Error('MA_BI_MAT phải gồm 16–40 ký tự, chỉ chữ không dấu và số.');
  if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(CAU_HINH.LINK_WEB_APP)) {
    throw new Error('LINK_WEB_APP chưa đúng. Đó là link "Ứng dụng web" dạng https://script.google.com/macros/s/.../exec khi bạn bấm Triển khai.');
  }

  const sheet = layTrang_();
  sheet.getRange(1, 1, sheet.getMaxRows(), COT.length).setNumberFormat('@'); // giữ nguyên chữ, không tự đổi thành ngày

  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('moi15Phut').timeBased().everyMinutes(15).create();
  console.log('✅ Đã tạo lịch chạy mỗi 15 phút (tóm tắt 8h sáng + nhắc trước hạn).');

  const me = goiZalo_('getMe', {});
  if (!me.ok) throw new Error('Token Zalo không đúng. Zalo trả lời: ' + JSON.stringify(me));
  console.log('✅ Token Zalo đúng. Bot: ' + JSON.stringify(me.result));

  const wh = goiZalo_('setWebhook', { url: CAU_HINH.LINK_WEB_APP + '?key=' + CAU_HINH.MA_BI_MAT, secret_token: CAU_HINH.MA_BI_MAT });
  console.log((wh.ok ? '✅' : '⚠️') + ' Kết quả nối webhook: ' + JSON.stringify(wh));

  const ai = goiClaude_({ model: CAU_HINH.MO_HINH_AI, max_tokens: 1000, messages: [{ role: 'user', content: 'Trả lời đúng một chữ: OK' }] });
  if (ai.type === 'error') throw new Error('Khóa Claude có vấn đề: ' + JSON.stringify(ai.error));
  console.log('✅ Khóa Claude dùng được.');
  console.log('🎉 Cài đặt xong! Mở Zalo, nhắn "hd" cho bot để thử.');
}

// ---------------------------------------------------------------------------
// 2. Zalo gửi tin tới đây
// ---------------------------------------------------------------------------
function doGet() {
  return HtmlService.createHtmlOutput('ZaloPlan đang chạy.');
}

function doPost(e) {
  try {
    if (!e || !e.parameter || e.parameter.key !== CAU_HINH.MA_BI_MAT) return HtmlService.createHtmlOutput('ok');
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    const update = body.result || body;
    const msg = update.message || {};

    // Zalo có thể gửi lại cùng một tin: nhớ mã tin đã xử lý trong 6 giờ
    const cache = CacheService.getScriptCache();
    const maTin = 'tin_' + (msg.message_id || Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(msg))));
    if (cache.get(maTin)) return HtmlService.createHtmlOutput('ok');
    cache.put(maTin, '1', 21600);
    try {
      xuLyTin_(update);
    } catch (err) {
      cache.remove(maTin); // lỗi thì cho phép Zalo gửi lại để xử lý lần nữa
      throw err;
    }
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
  }
  return HtmlService.createHtmlOutput('ok');
}

function xuLyTin_(update) {
  const tin = phanTichTin(update);
  if (!tin) return;
  if (tin.route === 'tra_loi') return guiTin_(tin.chatId, tin.reply);

  const now = Date.now();
  // Gọi AI trước, ngoài khóa, để nhiều tin đến cùng lúc không phải chờ nhau
  const res = tin.route === 'ai' ? goiClaude_(taoYeuCauAI(tin, CAU_HINH.MO_HINH_AI, now)) : null;

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
  const res = UrlFetchApp.fetch(ZALO_API + CAU_HINH.BOT_TOKEN + '/' + method, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true,
  });
  try { return JSON.parse(res.getContentText()); } catch (e) { return { ok: false, http: res.getResponseCode(), text: res.getContentText().slice(0, 300) }; }
}

function guiTin_(chatId, text) {
  return goiZalo_('sendMessage', { chat_id: chatId, text: String(text).slice(0, 2000) });
}

function goiClaude_(yeuCau) {
  const coFallback = Boolean(yeuCau.fallbacks);
  const headers = { 'x-api-key': CAU_HINH.KHOA_CLAUDE, 'anthropic-version': '2023-06-01' };
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
