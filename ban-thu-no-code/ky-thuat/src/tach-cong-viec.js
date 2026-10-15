// Đọc kết quả AI, tạo các dòng công việc để lưu vào Google Sheet và soạn tin trả lời.
const tin = $('Đọc tin Zalo').first().json;
const res = $input.first().json || {};
const THU = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const traLoi = (reply) => [{ json: { chatId: tin.chatId, reply, coViec: false, rows: [] } }];

if (res.type === 'error' || res.error) {
  const loi = (res.error && (res.error.message || res.error.type)) || 'không rõ';
  return traLoi(`⚠️ AI đang gặp lỗi nên chưa lưu được việc.\nChi tiết: ${String(loi).slice(0, 300)}\nBạn kiểm tra lại khóa AI (API key) và số dư tài khoản AI nhé.`);
}
if (res.stop_reason === 'refusal') {
  return traLoi('⚠️ AI không xử lý tin nhắn này. Bạn thử viết lại ngắn gọn hơn nhé.');
}

const block = (res.content || []).filter((b) => b.type === 'text').pop();
let tasks = [];
try {
  tasks = JSON.parse(block ? block.text : '{}').tasks || [];
} catch (e) {
  return traLoi('⚠️ Mình đọc kết quả AI bị lỗi. Bạn gửi lại tin nhắn giúp mình nhé.');
}

const isDate = (s) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s) && !isNaN(Date.parse(s.replace(' ', 'T') + ':00+07:00'));
const hienHan = (s) => {
  if (!s) return 'chưa có hạn';
  const d = new Date(Date.parse(s.replace(' ', 'T') + ':00+07:00') + 7 * 3600 * 1000);
  return `${s.slice(11)} ${THU[d.getUTCDay()]} ${s.slice(8, 10)}/${s.slice(5, 7)}`;
};
const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const taoId = () => Array.from({ length: 4 }, () => ABC[Math.floor(Math.random() * ABC.length)]).join('');

const rows = tasks
  .filter((t) => t && String(t.viec || '').trim())
  .slice(0, 10)
  .map((t) => ({
    ID: taoId(),
    Viec: String(t.viec).trim().slice(0, 200),
    NguoiLam: String(t.nguoi_lam || '').trim(),
    HanChot: isDate(String(t.han_chot || '')) ? t.han_chot : '',
    UuTien: ['Cao', 'Bình thường', 'Thấp'].includes(t.uu_tien) ? t.uu_tien : 'Bình thường',
    DuAn: String(t.du_an || '').trim(),
    TrangThai: 'Mới',
    TinGoc: tin.text.slice(0, 1000),
    NguoiGui: tin.sender,
    ChatID: tin.chatId,
    TaoLuc: tin.nowText,
    XongLuc: '',
    DaNhac: '',
  }));

if (!rows.length) {
  return traLoi('Mình không thấy việc nào cần làm trong tin này. Nếu có, bạn viết rõ hơn (ai làm, việc gì, hạn khi nào) nhé.');
}

const dong = rows.map((r) => {
  const chiTiet = [r.NguoiLam && `👤 ${r.NguoiLam}`, `⏰ ${hienHan(r.HanChot)}`, r.UuTien === 'Cao' && '🔥 Gấp', r.DuAn && `📁 ${r.DuAn}`]
    .filter(Boolean).join(' · ');
  return `[${r.ID}] ${r.Viec}\n${chiTiet}`;
});
const reply =
  `📝 Đã lưu ${rows.length} việc:\n\n${dong.join('\n\n')}\n\n` +
  `Làm xong thì trả lời "xong ${rows[0].ID}". AI hiểu sai thì "xoa ${rows[0].ID}".`;

return [{ json: { chatId: tin.chatId, reply: reply.slice(0, 2000), coViec: true, rows } }];
