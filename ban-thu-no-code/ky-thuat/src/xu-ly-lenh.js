// Xử lý lệnh "viec", "xong ABCD", "xoa ABCD" dựa trên các việc của người này trong Google Sheet.
const tin = $('Đọc tin Zalo').first().json;
const rows = $input.all().map((i) => i.json).filter((r) => r && r.ID);
const THU = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

// Đọc hạn chót: nhận "2026-10-16 17:00" hoặc "16/10/2026 17:00" (khi sửa tay trong Sheet)
const hanMs = (s) => {
  s = String(s || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 17, m[5] ? +m[5] : 0) - 7 * 3600 * 1000;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1], m[4] ? +m[4] : 17, m[5] ? +m[5] : 0) - 7 * 3600 * 1000;
  return null;
};
const p = (n) => String(n).padStart(2, '0');
const vn = (ms) => {
  const d = new Date(ms + 7 * 3600 * 1000);
  return { ymd: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`, hm: `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`, thu: THU[d.getUTCDay()], dm: `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}` };
};
const now = Date.now();

if (tin.lenh === 'cap_nhat') {
  const viec = rows.find((r) => String(r.ID).toUpperCase() === tin.taskId);
  if (!viec) {
    return [{ json: { canCapNhat: false, chatId: tin.chatId, reply: `Mình không tìm thấy việc ${tin.taskId} của bạn. Gõ "viec" để xem mã các việc đang mở.` } }];
  }
  const t = vn(now);
  const reply = tin.trangThai === 'Xong'
    ? `✅ Tuyệt! Đã đánh dấu xong: [${viec.ID}] ${viec.Viec}`
    : `🗑 Đã xóa việc: [${viec.ID}] ${viec.Viec}`;
  return [{ json: { canCapNhat: true, chatId: tin.chatId, reply, ID: viec.ID, TrangThai: tin.trangThai, XongLuc: `${t.ymd} ${t.hm}` } }];
}

// Lệnh "viec": liệt kê việc đang mở, sắp theo hạn
const mo = rows
  .filter((r) => r.TrangThai === 'Mới')
  .map((r) => ({ ...r, _han: hanMs(r.HanChot) }))
  .sort((a, b) => (a._han ?? Infinity) - (b._han ?? Infinity));

if (!mo.length) {
  return [{ json: { canCapNhat: false, chatId: tin.chatId, reply: '🎉 Bạn không còn việc nào đang mở. Chuyển tiếp tin giao việc cho mình để thêm việc mới nhé.' } }];
}
const homNay = vn(now).ymd;
const dong = mo.slice(0, 30).map((r) => {
  let han = 'chưa có hạn';
  if (r._han != null) {
    const d = vn(r._han);
    han = d.ymd === homNay ? `hôm nay ${d.hm}` : `${d.hm} ${d.thu} ${d.dm}`;
    if (r._han < now) han = `⚠️ trễ hạn (${d.dm})`;
  }
  return `• [${r.ID}] ${r.Viec}${r.NguoiLam ? ` (${r.NguoiLam})` : ''}: ${han}${r.UuTien === 'Cao' ? ' 🔥' : ''}`;
});
const them = mo.length > 30 ? `\n…và ${mo.length - 30} việc khác.` : '';
const reply = `📋 Bạn có ${mo.length} việc đang mở:\n\n${dong.join('\n')}${them}\n\nLàm xong thì trả lời "xong" kèm mã việc.`;
return [{ json: { canCapNhat: false, chatId: tin.chatId, reply: reply.slice(0, 2000) } }];
