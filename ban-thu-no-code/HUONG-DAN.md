# Hướng dẫn dựng bản thử ZaloPlan (không cần biết code)

Làm theo hướng dẫn này khoảng **1–2 giờ**, bạn sẽ có một bot Zalo:

- **Nhận tin giao việc** bạn chuyển tiếp (forward) hoặc dán vào, rồi AI tự tách thành công việc (việc gì, ai làm, hạn khi nào, gấp không).
- **Lưu việc vào Google Sheet**, để bạn xem và sửa trên máy tính hoặc điện thoại.
- **8h sáng mỗi ngày** gửi bạn bản tóm tắt: việc trễ hạn, việc hôm nay, việc 7 ngày tới.
- **Nhắc trước hạn khoảng 1 tiếng** cho từng việc.
- Hiểu các lệnh: `viec` (xem danh sách), `xong ABCD` (đánh dấu xong), `xoa ABCD` (xóa khi AI hiểu sai), `hd` (hướng dẫn).

```
Bạn forward tin  ─▶  Zalo Bot  ─▶  n8n (kịch bản tự động)  ─▶  AI đọc tin  ─▶  Google Sheet
                         ▲                                                        │
                         └─────────── 8h sáng & trước hạn 1 tiếng: nhắc việc ◀────┘
```

> **Lưu ý quan trọng:** Bot Zalo hiện **chỉ chat riêng 1-1**, chưa vào được nhóm Zalo. Vì vậy bạn cần **chuyển tiếp** tin giao việc từ nhóm sang bot (hoặc copy rồi dán vào).

---

## Bạn cần chuẩn bị

| Thứ cần có | Dùng để | Chi phí |
|---|---|---|
| Tài khoản Zalo | Tạo bot và chat với bot | Miễn phí |
| Tài khoản Google | Google Sheet lưu công việc | Miễn phí |
| Tài khoản **n8n Cloud** ([n8n.io](https://n8n.io)) | Chạy kịch bản tự động 24/7 | Dùng thử miễn phí, sau đó trả phí theo tháng (xem bảng giá trên trang n8n) |
| Tài khoản **Claude Console** ([console.anthropic.com](https://console.anthropic.com)) | Khóa AI (API key) để AI đọc tin | Nạp trước khoảng 5 USD; mỗi tin nhắn tốn khoảng 1–2 xu Mỹ |

Trong thư mục này có sẵn 4 file:

| File | Là gì |
|---|---|
| `mau-google-sheet.csv` | Mẫu bảng công việc (chỉ có dòng tiêu đề) |
| `1-zaloplan-nhan-tin.json` | Kịch bản 1: nhận tin, gọi AI, lưu việc, trả lời lệnh |
| `2-zaloplan-nhac-viec.json` | Kịch bản 2: tóm tắt 8h sáng và nhắc trước hạn |
| `3-zaloplan-cai-webhook.json` | Kịch bản 3: chạy **một lần** để nối bot Zalo với n8n |

---

## Bước 1. Tạo bot Zalo và lấy mã bot (Bot Token)

1. Vào trang **Zalo Bot Platform**: [bot.zaloplatforms.com](https://bot.zaloplatforms.com) và đăng nhập bằng tài khoản Zalo.
2. Bấm **Tạo bot**, đặt tên (ví dụ `ZaloPlan của Minh`) và ảnh đại diện.
3. Sau khi tạo xong, tìm **Bot Token** (một chuỗi dạng `12345678:AbCdEf...`). Token có thể nằm trong trang quản lý bot hoặc trong tin nhắn Zalo gửi cho bạn ngay sau khi tạo.
4. Lưu token vào chỗ an toàn. **Ai có token này sẽ điều khiển được bot**, nên đừng gửi cho người khác.

> Giao diện trang của Zalo có thể khác một chút so với mô tả. Nếu không thấy, tìm mục "Token" hoặc "Thông tin bot".

## Bước 2. Tạo Google Sheet

1. Vào [sheets.new](https://sheets.new) để tạo bảng tính mới. Đặt tên, ví dụ **ZaloPlan – Công việc**.
2. Vào **Tệp → Nhập → Tải lên**, chọn file `mau-google-sheet.csv`, chọn **Thay thế trang tính hiện tại**, bấm **Nhập dữ liệu**.
3. Kiểm tra dòng 1 có đủ 13 cột: `ID, Viec, NguoiLam, HanChot, UuTien, DuAn, TrangThai, TinGoc, NguoiGui, ChatID, TaoLuc, XongLuc, DaNhac`. **Không đổi tên các cột này.**
4. Đổi tên trang tính (tab ở góc dưới) thành **CongViec**.
5. Copy **đường link** của bảng tính trên thanh địa chỉ, để dùng ở Bước 5.

## Bước 3. Lấy khóa AI (API key)

1. Vào [console.anthropic.com](https://console.anthropic.com), đăng ký hoặc đăng nhập.
2. Vào **Billing**, nạp tiền (khoảng 5 USD là đủ dùng thử lâu).
3. Vào **API Keys → Create Key**, đặt tên `zaloplan`, bấm tạo.
4. Copy khóa (bắt đầu bằng `sk-ant-...`). **Khóa chỉ hiện một lần**, hãy lưu lại ngay và không chia sẻ.

## Bước 4. Đưa 3 kịch bản vào n8n

1. Đăng ký [n8n Cloud](https://n8n.io) và đăng nhập.
2. Bấm **Create workflow** (tạo kịch bản mới).
3. Bấm nút **⋯** ở góc trên bên phải → **Import from File** → chọn `1-zaloplan-nhan-tin.json`.
4. Bấm **Save**.
5. Lặp lại với `2-zaloplan-nhac-viec.json` và `3-zaloplan-cai-webhook.json` (mỗi file là một kịch bản riêng).

## Bước 5. Điền cấu hình

Mỗi kịch bản có một khối tên **Cấu hình** (biểu tượng cây bút). Bấm đúp để mở, rồi thay các giá trị `DIEN_...`:

| Ô | Điền gì | Có trong kịch bản |
|---|---|---|
| `BOT_TOKEN` | Token bot Zalo ở Bước 1 | 1, 2, 3 |
| `MA_BI_MAT` | Một mật khẩu **tự đặt**, 16–40 ký tự, chỉ gồm chữ không dấu và số, ví dụ `ZaloPlan2026BiMatCuaToi`. Điền **giống nhau** ở kịch bản 1 và 3 | 1, 3 |
| `LINK_GOOGLE_SHEET` | Link bảng tính ở Bước 2 | 1, 2 |
| `MO_HINH_AI` | Giữ nguyên | 1 |
| `WEBHOOK_URL` | Điền ở Bước 7 | 3 |

Bấm **Save** sau khi điền.

## Bước 6. Kết nối Google và khóa AI

**Google Sheets:** các khối có biểu tượng Google Sheets màu xanh lá (kịch bản 1 có 3 khối, kịch bản 2 có 2 khối). Mở từng khối:

1. Ở ô **Credential**, chọn **Create new credential** (lần đầu) và bấm **Sign in with Google**, chọn tài khoản Google chứa bảng tính, cho phép truy cập.
2. Từ khối thứ hai trở đi, chỉ cần chọn lại credential vừa tạo.

**Khóa AI:** trong kịch bản 1, mở khối **Gọi AI**:

1. Ở ô **Credential for Header Auth**, chọn **Create new credential**.
2. **Name** điền: `x-api-key`
3. **Value** điền: khóa AI `sk-ant-...` ở Bước 3.
4. Bấm **Save**.

Bấm **Save** cho cả hai kịch bản.

## Bước 7. Bật kịch bản và nối bot với n8n

1. Mở **kịch bản 1**, bấm nút **Publish** ở góc trên bên phải để bật (bản n8n cũ gọi là công tắc **Active**).
2. Bấm đúp khối đầu tiên **Zalo gửi tin đến**, chọn tab **Production URL**, copy đường link (dạng `https://ten-cua-ban.app.n8n.cloud/webhook/zaloplan`).
3. Mở **kịch bản 2**, bấm **Publish** tương tự.
4. Mở **kịch bản 3**, mở khối **Cấu hình**, dán link vừa copy vào ô `WEBHOOK_URL`, điền `BOT_TOKEN` và `MA_BI_MAT` (giống kịch bản 1).
5. Bấm **Execute workflow** (chạy). Mở khối cuối **Kết quả**: nếu thấy `"ok": true` và `webhook.ok` là thành công. Kịch bản 3 **không cần Publish**.

## Bước 8. Thử ngay

1. Mở Zalo, tìm tên bot (hoặc quét mã QR trong trang quản lý bot), nhắn `hd`. Bot sẽ trả lời hướng dẫn.
2. Chuyển tiếp một tin giao việc thật, hoặc gõ thử:
   > Lan ơi chiều thứ 6 gửi anh báo giá thép hộp Q7 nhé, gấp!
3. Sau vài giây, bot trả lời kiểu:
   > 📝 Đã lưu 1 việc:
   > [K7Q2] Gửi báo giá thép hộp Q7
   > 👤 Lan · ⏰ 17:00 Thứ Sáu 16/10 · 🔥 Gấp · 📁 Q7
4. Mở Google Sheet, bạn sẽ thấy dòng mới.
5. Gõ `viec` để xem danh sách, `xong K7Q2` để đánh dấu xong.

---

## Dùng hằng ngày

| Bạn muốn | Làm gì |
|---|---|
| Thêm việc | Chuyển tiếp tin giao việc cho bot, hoặc dán nội dung tin |
| Xem việc đang mở | Gõ `viec` |
| Báo xong | Gõ `xong` + mã việc, ví dụ `xong K7Q2` |
| AI hiểu sai | Gõ `xoa` + mã việc, rồi gửi lại tin rõ hơn |
| Sửa hạn, người làm… | Sửa trực tiếp trong Google Sheet. Hạn chót ghi dạng `2026-10-16 17:00` hoặc `16/10/2026 17:00` |
| Cho đồng nghiệp dùng | Đồng nghiệp chat với cùng bot. Mỗi người chỉ thấy và nhận nhắc việc **mình đã gửi cho bot** |

## Gặp sự cố?

| Hiện tượng | Cách xử lý |
|---|---|
| Nhắn bot không thấy trả lời | Kiểm tra kịch bản 1 đã **Publish** chưa. Chạy lại kịch bản 3 và xem `webhook.ok`. Kiểm tra `MA_BI_MAT` ở kịch bản 1 và 3 giống hệt nhau |
| Bot báo "AI đang gặp lỗi" | Kiểm tra khóa AI ở khối **Gọi AI** (Name phải đúng `x-api-key`), và tài khoản Claude Console còn tiền |
| Bot báo lưu việc nhưng Sheet trống | Kiểm tra tên trang tính là `CongViec` và dòng tiêu đề đúng 13 cột |
| Không nhận tóm tắt 8h sáng | Kiểm tra kịch bản 2 đã **Publish**. Bot chỉ gửi khi bạn còn việc ở trạng thái `Mới` |
| Muốn xem lỗi chi tiết | Trong n8n, vào tab **Executions** của kịch bản để xem từng lần chạy, khối nào bị đỏ |

## Giới hạn của bản thử

- Bot chưa đọc được tin trong nhóm Zalo, phải chuyển tiếp hoặc dán tin.
- Bot chỉ đọc tin nhắn chữ, chưa đọc ảnh hay tin thoại.
- AI lưu việc ngay, không hỏi xác nhận trước. Nếu sai thì gõ `xoa` + mã việc.
- Phù hợp một nhóm nhỏ (dưới khoảng 20 người, vài trăm việc). Khi đông hơn, nên chuyển sang app thật như trong kế hoạch ở [PLAN.md](../PLAN.md).

## Bảo mật

- Không chia sẻ **Bot Token**, **khóa AI** và **mã bí mật** cho người khác.
- Tin nhắn bạn gửi cho bot sẽ được gửi tới AI để đọc và lưu vào Google Sheet của bạn. Chỉ gửi những tin bạn được phép xử lý.
- Nếu lỡ lộ khóa AI: vào Claude Console, xóa khóa cũ và tạo khóa mới. Nếu lộ Bot Token: tạo lại token trong trang quản lý bot.
