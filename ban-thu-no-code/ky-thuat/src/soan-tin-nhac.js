// Soạn tin tóm tắt buổi sáng, hoặc tin nhắc việc sắp đến hạn, cho từng người.
const cheDo = $('Cấu hình').first().json.CHE_DO; // "sang" hoặc "nhac"
const rows = $input.all().map((i) => i.json).filter((r) => r && r.ID && r.ChatID && r.TrangThai === 'Mới');
const THU = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

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
const out = [];

if (cheDo === 'nhac') {
  // Nhắc từng việc có hạn trong 60 phút tới và chưa được nhắc
  for (const r of rows) {
    const han = hanMs(r.HanChot);
    if (han == null || han <= now || han > now + 60 * 60 * 1000 || String(r.DaNhac || '').trim()) continue;
    const d = vn(han);
    out.push({ json: { chatId: String(r.ChatID), ID: r.ID, DaNhac: 'x', reply: `⏰ Sắp đến hạn lúc ${d.hm}:\n[${r.ID}] ${r.Viec}${r.NguoiLam ? `\n👤 ${r.NguoiLam}` : ''}\n\nLàm xong thì trả lời "xong ${r.ID}".` } });
  }
  return out;
}

// Tóm tắt buổi sáng: gom việc theo người (ChatID)
const homNay = vn(now).ymd;
const theoNguoi = {};
for (const r of rows) (theoNguoi[r.ChatID] = theoNguoi[r.ChatID] || []).push({ ...r, _han: hanMs(r.HanChot) });

for (const [chatId, ds] of Object.entries(theoNguoi)) {
  ds.sort((a, b) => (a._han ?? Infinity) - (b._han ?? Infinity));
  const tre = [], hn = [], sap = [];
  let chuaHan = 0;
  for (const r of ds) {
    const line = (h) => `• [${r.ID}] ${r.Viec}${r.NguoiLam ? ` (${r.NguoiLam})` : ''}${h ? `: ${h}` : ''}${r.UuTien === 'Cao' ? ' 🔥' : ''}`;
    if (r._han == null) { chuaHan++; continue; }
    const d = vn(r._han);
    if (r._han < now) tre.push(line(`hạn ${d.dm}`));
    else if (d.ymd === homNay) hn.push(line(d.hm));
    else if (r._han < now + 7 * 86400000) sap.push(line(`${d.thu} ${d.dm}`));
  }
  const phan = [`☀️ Chào buổi sáng! Bạn có ${ds.length} việc đang mở.`];
  if (tre.length) phan.push(`⚠️ Trễ hạn:\n${tre.join('\n')}`);
  if (hn.length) phan.push(`📅 Hôm nay:\n${hn.join('\n')}`);
  if (sap.length) phan.push(`🗓 7 ngày tới:\n${sap.join('\n')}`);
  if (chuaHan) phan.push(`📌 ${chuaHan} việc chưa có hạn.`);
  phan.push('Gõ "viec" để xem đủ danh sách.');
  out.push({ json: { chatId: String(chatId), reply: phan.join('\n\n').slice(0, 2000) } });
}
return out;
