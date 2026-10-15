# Tổng hợp dự án ZaloPlan (để chuyển sang session khác)

> Cập nhật: 15/10/2026. File này tóm tắt toàn bộ những gì đã làm, trạng thái hiện tại và việc còn dở. **Không chứa token hay khóa bí mật nào.**

---

## 1. Mục tiêu

Làm một **bot Zalo lập kế hoạch công việc từ tin nhắn**:
- Người dùng chuyển tiếp (forward) hoặc dán tin giao việc cho bot.
- AI (Claude) tách ra: việc gì, ai làm, hạn chót, mức gấp, dự án.
- Việc được lưu vào Google Sheet.
- Bot tóm tắt việc lúc 8h sáng và nhắc khoảng 1 tiếng trước hạn.
- Có trang web (dashboard) xem tình trạng công việc.

**Người dùng không biết code** (chủ tài khoản: wentmorth@gmail.com). Yêu cầu: **không tốn thêm tiền**. Người dùng có gói Claude Max và credit API Claude.

## 2. Các quyết định chính (theo thứ tự)

1. Lập kế hoạch sản phẩm đầy đủ (`PLAN.md`) và bộ slide 16 trang (`ZaloPlan.pptx`).
2. Làm bản thử no-code bằng **n8n + Claude** (`ban-thu-no-code/`), đã kiểm tra với dịch vụ giả lập. **Bỏ** vì n8n Cloud tốn khoảng 25 USD/tháng sau 14 ngày dùng thử.
3. Chuyển sang **bản không tốn thêm tiền**: **Google Apps Script** (chạy trong Google Sheet) + **Claude API** trả bằng credit sẵn có. Đã cân nhắc Gemini gói miễn phí nhưng không chọn: AI kém hơn, giới hạn lượt, và dữ liệu có thể bị Google dùng.
4. **Cài đặt bằng menu**: người dùng không phải sửa mã. Token và khóa được nhập qua hộp thoại và lưu trong Script Properties.
5. **Webhook Zalo không tới được Google Apps Script** (lần chạy thật: không có lần thực thi `doPost` nào). Chuyển sang **hỏi tin mỗi phút (polling `getUpdates`)**: **đã chạy thật, bot đã trả lời**.
6. Thêm **dashboard web** do chính Apps Script phục vụ (`doGet`), bảo vệ bằng link bí mật.

## 3. Trạng thái hiện tại

| Hạng mục | Trạng thái |
|---|---|
| Bot Zalo | ✅ Đã tạo, tên **"Bot Trợ ní"** (tạo qua OA "Zalo Bot Manager" → Bot Creator) |
| Google Sheet | ✅ **"ZaloPlan - Công Việc"**, trang `CongViec`, đủ 13 cột. ID: `1eMHqA7HhrcJ27ChL6xIIcCr3KyiQ9mFjrxqfx4vHwDQ` |
| Apps Script | ✅ Dự án **"Zaloplan"** gắn vào Sheet. Đã dán mã và cài qua menu |
| Nhận tin (polling mỗi phút) | ✅ **Chạy thật, bot đã trả lời `hd`** |
| AI tách việc | ⏳ Chưa thử tin giao việc thật (Sheet chưa có dòng việc nào lúc kiểm tra) |
| Dashboard web | ⏳ **Đang dở**: link mở ra "ZaloPlan đang chạy." vì bản triển khai còn là **phiên bản cũ** |
| Mã mới nhất (có tự kiểm tra link dashboard) | ⏳ Đã gửi, **người dùng chưa xác nhận đã dán** |

### Việc còn dở (làm tiếp theo thứ tự)
1. Dán đè **mã `ZaloPlan.gs` mới nhất** vào Apps Script, bấm 💾 Lưu.
2. **Triển khai → Quản lý các bản triển khai → ✏️ → Phiên bản: "Phiên bản mới"**, quyền **"Bất kỳ ai"** → Triển khai → copy link `/exec`.
3. Google Sheet **F5** → **🤖 ZaloPlan → 📊 Mở bảng theo dõi (web)**. Nếu được hỏi thì dán link `/exec`, rồi mở link dashboard.
4. Thử AI tách việc: nhắn bot *"Lan ơi chiều thứ 6 gửi anh báo giá thép hộp Q7 nhé, gấp!"*. Thử chuyển tiếp một tin thật từ nhóm (chưa biết Zalo gửi tin chuyển tiếp cho bot ở dạng nào).
5. Xem tab **Lần thực thi** trong Apps Script: thời gian mỗi lần chạy `layTinMoi` nên khoảng 1–3 giây, để không vượt hạn mức miễn phí của Google (khoảng 90 phút chạy tự động mỗi ngày).
6. 🔑 **Đổi token Zalo**: token cũ đã lộ trong một ảnh chụp màn hình. Vào `zalo.me/s/botcreator` để tạo token mới, rồi vào menu Cài đặt, dán ở ô 1/2.
7. 📅 **Trước 17/11/2026**: bấm **💰 Đổi sang AI tiết kiệm (Haiku)**.

## 4. Credit Claude (từ ảnh Billing của người dùng)

| Khoản | Số tiền | Hết hạn |
|---|---|---|
| Khuyến mãi 1 | 100 USD | 17/10/2026 |
| Khuyến mãi 2 | 100 USD | **17/11/2026** |
| Đã nạp | 4,60 USD | |

Auto-reload đang tắt. Credit áp dụng cho API. **Gói Claude Max không dùng được cho bot**; bot chỉ dùng credit API.
Kế hoạch: dùng Opus (`claude-opus-5-5`) đến 17/11, sau đó đổi sang Haiku (`claude-haiku-5-5`, rẻ hơn khoảng 40 lần).

## 5. Kiến trúc bản đang chạy (`ban-mien-phi/ZaloPlan.gs`, một file)

```
Zalo Bot ◀─ getUpdates mỗi 1 phút ─ Apps Script (trong Google Sheet) ─▶ Claude API
                                          │  ▲
                                          ▼  │
                                     Google Sheet "CongViec"
                                          │
                       mỗi 15 phút: tóm tắt 8h sáng + nhắc trước hạn 60 phút
                       doGet?xem=KEY: dashboard web
```

**Menu 🤖 ZaloPlan trong Google Sheet:**
- ⚙️ Cài đặt và kết nối bot: hỏi 2 thứ (token Zalo, khóa Claude). Tự tạo mã bí mật, xóa webhook, đặt lịch `layTinMoi` (1 phút) và `moi15Phut` (15 phút).
- 🔍 Kiểm tra kết nối: xem trạng thái token, khóa, mô hình, cách nhận tin, lịch, lần hỏi tin gần nhất.
- 💰 / 🧠: đổi mô hình AI, có hiệu lực ngay, không cần triển khai lại.
- 📊 Mở bảng theo dõi (web): tự kiểm tra link có trỏ đúng bản mã mới không (tìm dấu hiệu `ZPDASH_OK`); nếu không thì hỏi link mới.
- 🔄 Đổi link bảng theo dõi: tạo `XEM_KEY` mới để thu hồi link cũ.
- ⚡ Thử chế độ webhook (nâng cao): không dùng, vì webhook không tới được Google.

**Script Properties:** `BOT_TOKEN`, `KHOA_CLAUDE`, `MA_BI_MAT`, `LINK_WEB_APP`, `MO_HINH_AI`, `XEM_KEY`, `CHE_DO_NHAN_TIN`, `lanHoiTin`, `tomTatNgay`.

**Cột Google Sheet** (đúng thứ tự, không đổi tên):
`ID, Viec, NguoiLam, HanChot, UuTien, DuAn, TrangThai, TinGoc, NguoiGui, ChatID, TaoLuc, XongLuc, DaNhac`
- TrangThai: `Mới` / `Xong` / `Đã xóa`
- HanChot: `YYYY-MM-DD HH:mm`, giờ Việt Nam. Bot cũng đọc được `dd/mm/yyyy HH:mm` khi người dùng sửa tay.
- Cột được định dạng dạng chữ (`@`) để Google Sheets không tự đổi thành ngày.

**Lệnh trong Zalo:** `hd` (hướng dẫn), `viec` (danh sách), `xong ABCD`, `xoa ABCD`. Nhận cả khi gõ không dấu. Tin khác được gửi cho AI tách việc.

**Gọi Claude:** `POST https://api.anthropic.com/v1/messages`, header `anthropic-version: 2023-06-01`.
- Dùng structured output: `output_config: { effort: 'low', format: { type: 'json_schema', schema } }`.
- Với Opus thêm `fallbacks: 'default'` và header `anthropic-beta: server-side-fallback-2026-07-01`. Với Haiku thì không thêm.
- Lời nhắc gửi AI kèm **lịch 14 ngày** để AI tính đúng "thứ 6", "tuần sau".
- AI lỗi thì **lưu việc thô** và báo người dùng.

**Chống trùng:** nhớ `message_id` trong CacheService 6 giờ. Sheet được khóa bằng LockService khi ghi.

## 6. Kiến thức đã kiểm chứng về Zalo Bot API

- Tạo bot: Zalo → OA **"Zalo Bot Manager"** → menu **Tạo bot** → mini app **Bot Creator**. Tên bot phải bắt đầu bằng "Bot". Token được gửi qua tin nhắn Zalo, dạng `số:chuỗi`.
- API: `POST https://bot-api.zaloplatforms.com/bot<TOKEN>/<method>` (JSON). Các method: `getMe`, `getUpdates` (tham số `timeout`), `setWebhook` (`url`, `secret_token` 8–256 ký tự), `deleteWebhook`, `getWebhookInfo`, `sendMessage` (`chat_id`, `text` tối đa 2000 ký tự).
- Header webhook: `X-Bot-Api-Secret-Token`. Apps Script **không đọc được header**, nên mã bí mật được đặt trong query `?key=`.
- `getUpdates` **không chạy khi đang có webhook**. Phải `deleteWebhook` trước.
- Sự kiện: `message.text.received`, `message.image.received`, `message.sticker.received`, `message.voice.received`. Tin nhắn có `message.chat.id`, `message.from.display_name`, `message.text`, `message_id`.
- **Thực tế đã thấy:** webhook trỏ tới `script.google.com/.../exec` **không kích hoạt `doPost`**; chỉ thấy một lần `doGet`, có thể do bị chuyển hướng. Polling `getUpdates` mỗi phút **chạy được**.
- **Phát hiện mới:** tin "Khởi tạo Bot thành công" có **link mời bot vào nhóm** (`bot.zaloplatforms.com/groups/invite/...`). Nghĩa là bot **vào được nhóm Zalo**. Đây là hướng phát triển tiếp: bot đọc việc ngay trong nhóm, không cần chuyển tiếp.

## 7. Các file trong repo

Repo GitHub: **`thuanlm-eng/Zalo-plan`**, nhánh **`claude/zalo-message-task-planner-8udysf`**.

| File | Nội dung |
|---|---|
| `README.md` | Mục lục |
| `PLAN.md` | Kế hoạch sản phẩm đầy đủ (bản app thật, khoảng 12 tuần) |
| `ZaloPlan.pptx` | Slide trình bày 16 trang |
| `KE-HOACH-MIEN-PHI.md` | Kế hoạch bản không tốn thêm tiền (Apps Script + credit Claude) |
| `ban-mien-phi/ZaloPlan.gs` | ⭐ **Mã đang dùng** (một file, dán vào Apps Script) |
| `ban-mien-phi/HUONG-DAN.md` | Hướng dẫn cài cho người không biết code |
| `ban-mien-phi/ky-thuat/test.js` | 29 bài kiểm tra tự động (`node test.js`): chạy mã với Google, Zalo, Claude giả lập |
| `ban-mien-phi/ky-thuat/dashboard-mau.png` | Ảnh mẫu dashboard |
| `ban-thu-no-code/` | Bản n8n cũ (không dùng nữa, giữ để tham khảo) |

**Lưu ý khi sửa mã:**
- Sau mỗi lần sửa phải chạy `node ban-mien-phi/ky-thuat/test.js`.
- Người dùng phải dán lại toàn bộ file. Nếu thay đổi liên quan tới `doGet` (dashboard) thì phải **Triển khai → Phiên bản mới**.
- Thay đổi về polling, nhắc việc, menu thì **không cần** triển khai lại: trigger và menu luôn chạy mã mới nhất.

## 8. Ý tưởng làm tiếp

- Nút **"Xong"** ngay trên dashboard (gọi `google.script.run`).
- **Bot trong nhóm Zalo**: thêm bot vào nhóm qua link mời, rồi kiểm tra tin nhóm có tới `getUpdates` không và `chat.id` của nhóm là gì; lọc tin giao việc và trả lời trong nhóm.
- Đọc ảnh chụp màn hình (`message.image.received`) bằng Claude vision.
- Báo cáo tuần theo người làm.

## 9. Lưu ý bảo mật

- Không dán token Zalo hoặc khóa Claude vào chat. Khi chụp màn hình, che token và khóa.
- Token Zalo hiện tại **đã lộ**, cần tạo token mới (việc còn dở số 6).
- Chia sẻ Google Sheet cho người khác thì chỉ cấp quyền **Người xem**, vì người có quyền sửa xem được Script Properties.
- Link dashboard có `?xem=KEY`: ai có link đều xem được danh sách việc. Thu hồi bằng menu 🔄.

---

## Đoạn mở đầu gợi ý cho session mới

> Tôi đang làm dự án ZaloPlan: bot Zalo lập kế hoạch công việc, chạy bằng Google Apps Script và Claude API. Tôi không biết code. Đọc file TONG-HOP-SESSION.md (dán bên dưới) để nắm bối cảnh. Mã đang dùng là `ban-mien-phi/ZaloPlan.gs` trong repo `thuanlm-eng/Zalo-plan`, nhánh `claude/zalo-message-task-planner-8udysf`. Việc tiếp theo: [ghi việc bạn muốn làm, ví dụ "hướng dẫn tôi mở dashboard" hoặc "cho bot đọc việc trong nhóm Zalo"].
