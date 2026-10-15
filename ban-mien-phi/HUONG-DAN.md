# Hướng dẫn cài ZaloPlan bản không tốn thêm tiền

Bot chạy hoàn toàn trong **Google Sheet** của bạn (bằng Google Apps Script, miễn phí). AI dùng **Claude**, trừ vào credit API bạn đã có. **Không cần sửa mã**: mọi thông tin được nhập qua menu **🤖 ZaloPlan** trong bảng tính.

**Thời gian:** khoảng 10–15 phút, làm trên **máy tính**.

**Bạn đã có:**
- ✅ Token bot Zalo (Bước 1)
- ✅ Google Sheet có trang `CongViec` với 13 cột (Bước 2)
- ✅ Khóa Claude `sk-ant-...` (Bước 3)

---

## Bước 4. Dán mã vào Google Sheet (chỉ copy và dán, không sửa gì)

1. Mở Google Sheet **ZaloPlan – Công việc**.
2. Menu **Tiện ích mở rộng → Apps Script** (tiếng Anh: *Extensions → Apps Script*). Một tab mới mở ra, có sẵn file **Mã.gs** với vài dòng mẫu.
3. Bấm vào vùng mã, nhấn **Ctrl+A** rồi **Delete** để xóa hết.
4. Mở file **`ZaloPlan.gs`**, chọn hết (**Ctrl+A**), copy (**Ctrl+C**), rồi quay lại tab Apps Script dán vào (**Ctrl+V**).
5. Bấm **💾** (Lưu dự án) hoặc **Ctrl+S**.
6. (Không bắt buộc) Bấm chữ **Dự án không có tiêu đề** ở góc trên bên trái, đổi tên thành `ZaloPlan`.

## Bước 5. Nhập thông tin qua menu (không cần sửa mã)

1. Quay lại **tab Google Sheet** và **tải lại trang** (F5).
2. Đợi vài giây, trên thanh menu xuất hiện thêm mục **🤖 ZaloPlan** (bên phải mục *Trợ giúp*).
3. Bấm **🤖 ZaloPlan → ⚙️ Cài đặt và kết nối bot**.
4. Lần đầu Google sẽ hỏi quyền:
   - Bấm **Tiếp tục**, chọn tài khoản Google của bạn.
   - Nếu thấy **"Google chưa xác minh ứng dụng này"**: bấm **Nâng cao** → **Truy cập ZaloPlan (không an toàn)** → **Cho phép**.
   - Cảnh báo này xuất hiện với mọi đoạn mã tự cài, không phải lỗi. Mã chạy trong tài khoản của chính bạn và chỉ làm 3 việc: đọc và ghi bảng tính này, gửi và nhận tin Zalo, gọi Claude.
   - Sau khi cho phép, **bấm lại menu này một lần nữa**.
5. Lần lượt hiện 2 ô, mỗi ô dán một thứ rồi bấm **OK**:
   - **1/2:** token bot Zalo
   - **2/2:** khóa Claude `sk-ant-...`
6. Đợi khoảng 10–20 giây. Hiện bảng **✅ Cài đặt thành công** là xong.

Nếu hiện **⚠️ Chưa xong**, bảng sẽ ghi rõ lỗi bằng tiếng Việt. Bấm lại menu, dán lại ô bị sai. Ô đã đúng thì **để trống** và bấm OK để giữ nguyên.

> **Cách bot nhận tin:** cứ mỗi phút, Google tự hỏi Zalo "có tin mới không", nên bot trả lời **trong vòng khoảng 1 phút**. Không cần bấm "Triển khai" (Deploy).

## Bước 6. Thử ngay

1. Mở Zalo, tìm bot của bạn, nhắn `hd`. Trong vòng khoảng 1 phút, bot trả lời hướng dẫn.
2. Gửi thử: *Lan ơi chiều thứ 6 gửi anh báo giá thép hộp Q7 nhé, gấp!*
3. Trong vòng khoảng 1 phút, bot báo **📝 Đã lưu 1 việc**, và Google Sheet có dòng mới.
4. Gõ `viec` để xem danh sách, `xong` + mã việc để đánh dấu xong.

---

## Dùng hằng ngày

| Bạn muốn | Làm gì |
|---|---|
| Thêm việc | Chuyển tiếp hoặc dán tin giao việc cho bot |
| Xem việc đang mở | `viec` |
| Báo xong | `xong ABCD` |
| AI hiểu sai | `xoa ABCD`, rồi gửi lại tin rõ hơn |
| Sửa hạn, người làm | Sửa trực tiếp trong Google Sheet. Hạn chót ghi `2026-10-16 17:00` hoặc `16/10/2026 17:00` |
| Nhận tóm tắt | Tự động khoảng 8:00–8:15 mỗi sáng |
| Nhận nhắc | Tự động khoảng 1 tiếng trước hạn |

## 📊 Bảng theo dõi trên web

Một trang web tổng hợp tình trạng công việc. Xem được trên điện thoại và máy tính, tự làm mới mỗi phút. Trang gồm:
- **4 ô số liệu:** việc đang mở, trễ hạn, hạn hôm nay, đã xong 7 ngày qua.
- **Biểu đồ việc theo người:** ai đang có bao nhiêu việc, bao nhiêu việc trễ.
- **Danh sách việc theo nhóm:** trễ hạn, hôm nay, 7 ngày tới, xa hơn, chưa có hạn, đã xong.
- **Bộ lọc** theo người làm, dự án, và ô tìm kiếm.

**Bật lần đầu:**
1. Trong Apps Script, bấm **Triển khai → Tùy chọn triển khai mới**. Nếu đã có bản triển khai cũ thì dùng **Triển khai → Quản lý các bản triển khai → ✏️ → Phiên bản: Phiên bản mới**.
2. Chọn **Ứng dụng web**, **Thực thi dưới dạng: Tôi**, **Người có quyền truy cập: Bất kỳ ai**, rồi bấm **Triển khai**.
3. Trong Google Sheet bấm **🤖 ZaloPlan → 📊 Mở bảng theo dõi (web)**. Nếu được hỏi link ứng dụng web, dán link `.../exec` vừa có ở bước 2.
4. Bấm **👉 Bấm vào đây để mở bảng theo dõi**. Lưu link này lại, ví dụ gửi cho chính mình qua Zalo, để mở trên điện thoại.

**Bảo mật:** link có kèm mã bí mật, nên chỉ ai có link mới xem được. Muốn thu hồi thì bấm **🔄 Đổi link bảng theo dõi**.

**Mỗi lần dán mã mới:** làm lại bước 1 (chọn **Phiên bản mới**) để trang web dùng mã mới.

## ⚠️ Trước ngày 17/11/2026: đổi sang AI tiết kiệm

Credit khuyến mãi 100 USD hết hạn ngày 17/11/2026. Trước ngày đó, trong Google Sheet bấm:

**🤖 ZaloPlan → 💰 Đổi sang AI tiết kiệm (Haiku)**

Mô hình này rẻ hơn khoảng 40 lần, nên 4,60 USD còn lại dùng được rất lâu. Có hiệu lực ngay, không cần làm gì thêm. Muốn quay lại thì bấm **🧠 Đổi sang AI mạnh (Opus)**.

## Gặp sự cố?

Bấm **🤖 ZaloPlan → 🔍 Kiểm tra kết nối** để xem trạng thái: token, khóa, cách nhận tin, lịch chạy. Chụp bảng đó gửi Claude nếu cần.

| Hiện tượng | Cách xử lý |
|---|---|
| Không thấy menu 🤖 ZaloPlan | Tải lại trang Google Sheet. Kiểm tra đã bấm 💾 Lưu ở Bước 4 |
| Nhắn bot không thấy trả lời sau 2 phút | Bấm **Kiểm tra kết nối**: dòng "Lịch hỏi tin mỗi phút" phải **đang bật** và "Lần hỏi tin gần nhất" phải là vài phút trước. Nếu không, chạy lại **Cài đặt và kết nối bot** (để trống cả 2 ô, bấm OK). Trong Apps Script, tab **Lần thực thi** (*Executions*) xem lần chạy `layTinMoi` có bị lỗi không |
| Bot trả lời "AI đang lỗi" | Kiểm tra khóa và credit trên platform.claude.com. Việc vẫn được lưu tạm vào Sheet |
| Một tin bị lưu 2 lần | Báo Claude, kèm ảnh tab Lần thực thi |
| Không có tóm tắt sáng | Bot chỉ gửi khi bạn còn việc ở trạng thái `Mới`. Kiểm tra mục "Lịch chạy" trong **Kiểm tra kết nối** |
| Muốn tắt bot | Apps Script → tab **Trình kích hoạt** (⏰) → xóa `layTinMoi` và `moi15Phut` |

## Bảo mật

- Token và khóa được lưu trong phần cài đặt của Apps Script, không nằm trong bảng tính. Nhưng **ai có quyền chỉnh sửa Google Sheet vẫn xem được chúng**. Khi chia sẻ Sheet cho đồng nghiệp, chỉ cấp quyền **Người xem**.
- Lỡ lộ khóa Claude: tạo khóa mới trên platform.claude.com, xóa khóa cũ, rồi bấm **Cài đặt và kết nối bot**, chỉ dán khóa mới ở ô 2/2.
