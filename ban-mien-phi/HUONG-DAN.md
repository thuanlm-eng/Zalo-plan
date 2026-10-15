# Hướng dẫn cài ZaloPlan bản không tốn thêm tiền

Bản này chạy hoàn toàn trong **Google Sheet** của bạn (bằng Google Apps Script, miễn phí). AI dùng **Claude**, trừ vào credit API bạn đã có. Không cần n8n.

**Thời gian:** khoảng 30 phút, nên làm trên **máy tính**.

**Bạn đã có:**
- ✅ Token bot Zalo (Bước 1)
- ✅ Google Sheet có trang `CongViec` với 13 cột (Bước 2)

**File cần dùng:** `ZaloPlan.gs` (đoạn mã sẽ dán vào Google Sheet).

---

## Bước 3. Tạo khóa Claude (API key)

1. Vào **platform.claude.com**, đăng nhập.
2. **Settings → Limits**: đặt giới hạn chi tiêu mỗi tháng (ví dụ 20 USD) để an toàn. **Không cần nạp thêm tiền**, vì bạn đang có credit khuyến mãi.
3. **API Keys → Create Key**, đặt tên `zaloplan`, bấm tạo.
4. Bấm **Copy**, dán khóa `sk-ant-...` vào ghi chú riêng tư. **Khóa chỉ hiện một lần.** Không gửi khóa cho ai, kể cả Claude trong khung chat này.

## Bước 4. Dán mã vào Google Sheet

1. Mở Google Sheet `ZaloPlan – Công việc` đã tạo ở Bước 2.
2. Menu **Tiện ích mở rộng → Apps Script** (bản tiếng Anh: *Extensions → Apps Script*). Một tab mới mở ra, có sẵn file `Mã.gs` (*Code.gs*) với vài dòng mẫu.
3. Bấm vào vùng soạn mã, **xóa hết** nội dung có sẵn (Ctrl+A rồi Delete).
4. Mở file `ZaloPlan.gs` tôi gửi, **copy toàn bộ** và dán vào.
5. Bấm vào tên **Dự án không có tiêu đề** ở góc trên bên trái, đặt tên `ZaloPlan`.

## Bước 5. Điền 3 thông tin

Ở **đầu đoạn mã** có phần `CAU_HINH`. Thay chữ trong dấu nháy `'...'` (giữ nguyên dấu nháy):

| Dòng | Thay `DIEN_...` bằng |
|---|---|
| `BOT_TOKEN` | Token bot Zalo (Bước 1) |
| `KHOA_CLAUDE` | Khóa Claude `sk-ant-...` (Bước 3) |
| `MA_BI_MAT` | Mật khẩu **tự đặt**, 16–40 ký tự, **chỉ chữ không dấu và số**, ví dụ `ZaloPlan2026BiMatCuaToi` |

Ví dụ sau khi điền:
```
BOT_TOKEN: '1234567890:AbCdEfGh...',
KHOA_CLAUDE: 'sk-ant-api03-....',
MA_BI_MAT: 'ZaloPlan2026BiMatCuaToi',
```

**Chưa điền `LINK_WEB_APP`**, dòng này để ở Bước 6. Bấm biểu tượng **💾 Lưu dự án** (hoặc Ctrl+S).

## Bước 6. Triển khai thành ứng dụng web

1. Bấm nút xanh **Triển khai** (*Deploy*) ở góc trên bên phải → **Tùy chọn triển khai mới** (*New deployment*).
2. Bấm biểu tượng **bánh răng ⚙️** cạnh "Chọn loại", chọn **Ứng dụng web** (*Web app*).
3. Điền:
   - **Mô tả**: `ZaloPlan`
   - **Thực thi dưới dạng** (*Execute as*): **Tôi** (*Me*)
   - **Người có quyền truy cập** (*Who has access*): **Bất kỳ ai** (*Anyone*). Bắt buộc chọn mục này để Zalo gửi tin tới được.
4. Bấm **Triển khai**.
5. Google sẽ hỏi quyền truy cập, xem mục "Cấp quyền" bên dưới.
6. Sau khi xong, màn hình hiện **URL ứng dụng web** dạng `https://script.google.com/macros/s/..../exec`. Bấm **Sao chép**.
7. Quay lại đoạn mã, dán link này vào dòng `LINK_WEB_APP`, rồi bấm **💾 Lưu**.

> **Cấp quyền (chỉ làm lần đầu):** Google hiện "Cần được ủy quyền", bấm **Xem xét quyền** rồi chọn tài khoản Google của bạn. Nếu thấy cảnh báo **"Google chưa xác minh ứng dụng này"**: bấm **Nâng cao** (*Advanced*) → **Truy cập ZaloPlan (không an toàn)** → **Cho phép**. Cảnh báo này xuất hiện với mọi đoạn mã tự viết. Mã chạy trong tài khoản của chính bạn và chỉ dùng bảng tính này, gửi tin Zalo và gọi Claude.

## Bước 7. Chạy cài đặt một lần

1. Trên thanh công cụ, ô chọn hàm (cạnh nút **Chạy**), chọn **caiDat**.
2. Bấm **▶ Chạy** (*Run*). Cấp quyền nếu được hỏi.
3. Xem **Nhật ký thực thi** (*Execution log*) ở dưới. Thành công sẽ thấy các dòng:
   - ✅ Đã tạo lịch chạy mỗi 15 phút
   - ✅ Token Zalo đúng
   - ✅ Kết quả nối webhook
   - ✅ Khóa Claude dùng được
   - 🎉 Cài đặt xong!

Nếu thấy dòng đỏ báo lỗi, đọc lỗi (đã viết bằng tiếng Việt) để sửa, rồi bấm Chạy lại. Hoặc chụp màn hình gửi Claude.

## Bước 8. Thử ngay

1. Mở Zalo, tìm bot của bạn, nhắn `hd`. Bot trả lời hướng dẫn.
2. Gửi thử: *Lan ơi chiều thứ 6 gửi anh báo giá thép hộp Q7 nhé, gấp!*
3. Sau vài giây bot báo **📝 Đã lưu 1 việc**, và Google Sheet có dòng mới.
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

## ⚠️ Việc cần làm ngày 17/11/2026: đổi sang mô hình AI rẻ

Credit khuyến mãi 100 USD hết hạn ngày 17/11/2026. Trước ngày đó, đổi sang mô hình **Claude Haiku** (rẻ hơn khoảng 40 lần) để 4,60 USD còn lại dùng được rất lâu:

1. Mở Apps Script (**Tiện ích mở rộng → Apps Script**).
2. Sửa dòng `MO_HINH_AI: 'claude-opus-5-5',` thành `MO_HINH_AI: 'claude-haiku-5-5',` rồi **💾 Lưu**.
3. **Quan trọng:** bấm **Triển khai → Quản lý các bản triển khai** → biểu tượng **✏️ Chỉnh sửa** → ở mục **Phiên bản** chọn **Phiên bản mới** → **Triển khai**. Link giữ nguyên, không cần chạy lại caiDat.

> Mỗi lần sửa mã, phải làm bước 3 này thì phần **nhận tin Zalo** mới dùng mã mới. Phần nhắc việc tự động luôn dùng mã mới nhất.

## Gặp sự cố?

| Hiện tượng | Cách xử lý |
|---|---|
| Nhắn bot không thấy trả lời | Chạy lại `caiDat`, xem dòng "Kết quả nối webhook". Kiểm tra bước Triển khai đã chọn **Bất kỳ ai**. Xem tab **Lần thực thi** (*Executions*, biểu tượng ☰ bên trái) có lần chạy `doPost` nào bị lỗi không |
| Bot trả lời "AI đang lỗi" | Kiểm tra `KHOA_CLAUDE` và credit trên platform.claude.com. Việc vẫn được lưu tạm vào Sheet |
| Một tin bị lưu 2 lần | Báo Claude, kèm ảnh chụp tab Lần thực thi |
| Không có tóm tắt sáng | Bot chỉ gửi khi bạn còn việc ở trạng thái `Mới`. Kiểm tra tab **Trình kích hoạt** (*Triggers*, biểu tượng ⏰) có `moi15Phut` |
| Muốn tắt bot | Tab **Trình kích hoạt**: xóa `moi15Phut`. **Triển khai → Quản lý các bản triển khai → Lưu trữ** |

## Bảo mật

- Khóa Claude và token Zalo nằm trong đoạn mã. **Ai có quyền chỉnh sửa Google Sheet sẽ xem được chúng.** Khi chia sẻ Sheet cho đồng nghiệp, chỉ cấp quyền **Người xem**.
- Không chia sẻ link ứng dụng web cùng mã bí mật.
- Lỡ lộ khóa: tạo khóa mới trên platform.claude.com, xóa khóa cũ, dán khóa mới vào mã rồi làm bước "Phiên bản mới" như mục 17/11.
