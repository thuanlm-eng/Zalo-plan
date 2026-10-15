// Đọc tin Zalo gửi tới, kiểm tra mã bí mật, rồi quyết định bước tiếp theo.
const cfg = $('Cấu hình').first().json;
const req = $input.first().json;
const headers = req.headers || {};

// Chỉ nhận tin do chính Zalo gửi (đúng mã bí mật đã đăng ký)
if (String(headers['x-bot-api-secret-token'] || '') !== String(cfg.MA_BI_MAT)) {
  return [];
}

const body = req.body || {};
const update = body.result || body;
const msg = update.message || {};
const chatId = String((msg.chat && msg.chat.id) || (msg.from && msg.from.id) || '');
const sender = (msg.from && (msg.from.display_name || msg.from.name)) || '';
const text = String(msg.text || '').trim();
if (!chatId) return [];

const HELP =
  'Chào bạn, mình là ZaloPlan 👋\n\n' +
  'Chuyển tiếp (forward) hoặc dán tin nhắn giao việc cho mình, mình sẽ tự lưu thành công việc.\n\n' +
  'Các lệnh:\n' +
  '• viec: xem việc đang mở\n' +
  '• xong ABCD: đánh dấu việc ABCD đã xong\n' +
  '• xoa ABCD: xóa việc ABCD (khi AI hiểu sai)';

const out = (o) => [{ json: { chatId, sender, text, ...o } }];

if (update.event_name && update.event_name !== 'message.text.received') {
  return out({ route: 'tra_loi', reply: 'Hiện mình chỉ đọc được tin nhắn chữ. Bạn dán nội dung tin nhắn giúp mình nhé.' });
}
if (!text) return [];

// Bỏ dấu tiếng Việt để nhận lệnh dù gõ có dấu hay không
const plain = text
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase().replace(/\s+/g, ' ').trim();

let m = plain.match(/^\/?(xong|done|ok xong)\s+#?([a-z0-9]{4})$/);
if (m) return out({ route: 'sheet', lenh: 'cap_nhat', trangThai: 'Xong', taskId: m[2].toUpperCase() });
m = plain.match(/^\/?(xoa|huy)\s+#?([a-z0-9]{4})$/);
if (m) return out({ route: 'sheet', lenh: 'cap_nhat', trangThai: 'Đã xóa', taskId: m[2].toUpperCase() });
if (/^\/?(viec|ds|danh sach|list|cong viec)$/.test(plain)) return out({ route: 'sheet', lenh: 'danh_sach' });
if (/^\/?(start|help|huong dan|hd|menu)$/.test(plain)) return out({ route: 'tra_loi', reply: HELP });
if (plain.length < 4) {
  return out({ route: 'tra_loi', reply: 'Mình chưa thấy việc nào trong tin này. Gõ "hd" để xem hướng dẫn.' });
}

// ---- Chuẩn bị câu hỏi cho AI ----
const TZ = 'Asia/Ho_Chi_Minh';
const THU = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const nowMs = Date.now();
const vn = (ms) => {
  const d = new Date(ms + 7 * 3600 * 1000); // giờ Việt Nam (UTC+7, không đổi giờ)
  const p = (n) => String(n).padStart(2, '0');
  return {
    ymd: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`,
    dm: `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`,
    hm: `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`,
    thu: THU[d.getUTCDay()],
  };
};
const now = vn(nowMs);
const lich = [];
for (let i = 0; i <= 14; i++) {
  const d = vn(nowMs + i * 86400000);
  lich.push(`${d.thu} ${d.dm} = ${d.ymd}${i === 0 ? ' (hôm nay)' : i === 1 ? ' (ngày mai)' : ''}`);
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

const userMsg = [
  `Thời điểm hiện tại: ${now.thu}, ${now.dm} ${now.hm} (giờ Việt Nam).`,
  'Lịch tham khảo:',
  ...lich,
  '',
  `Người gửi tin cho bot: ${sender || '(không rõ)'}`,
  'Tin nhắn:',
  '"""',
  text.slice(0, 4000),
  '"""',
].join('\n');

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['tasks'],
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['viec', 'nguoi_lam', 'han_chot', 'uu_tien', 'du_an'],
        properties: {
          viec: { type: 'string' },
          nguoi_lam: { type: 'string' },
          han_chot: { type: 'string' },
          uu_tien: { type: 'string', enum: ['Cao', 'Bình thường', 'Thấp'] },
          du_an: { type: 'string' },
        },
      },
    },
  },
};

const aiRequest = {
  model: cfg.MO_HINH_AI,
  max_tokens: 4000,
  fallbacks: 'default',
  output_config: { effort: 'low', format: { type: 'json_schema', schema } },
  system,
  messages: [{ role: 'user', content: userMsg }],
};

return out({ route: 'ai', aiRequest, nowText: `${now.ymd} ${now.hm}` });
