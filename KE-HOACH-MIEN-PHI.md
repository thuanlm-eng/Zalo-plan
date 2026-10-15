# Kế hoạch ZaloPlan bản không tốn thêm tiền

> Mục tiêu: bot Zalo đọc tin giao việc, AI tách thành công việc, lưu vào Google Sheet, nhắc việc mỗi sáng và trước hạn, **không phát sinh chi phí mới**: không thuê dịch vụ nào, không trả phí hằng tháng.

---

## 1. Tóm tắt

| Thành phần | Dùng gì | Chi phí |
|---|---|---|
| Nhận và gửi tin Zalo | **Zalo Bot** (đã tạo ở Bước 1) | 0 đ |
| Lưu công việc | **Google Sheet** (đã tạo ở Bước 2) | 0 đ |
| Chạy kịch bản tự động 24/7 | **Google Apps Script**, có sẵn trong Google Sheet, chạy trên máy chủ Google | 0 đ |
| AI đọc tin nhắn | **Claude API**, trả bằng **credit API bạn đã có** (khoảng 250 USD) | 0 đ tiền mới |
| **Tổng tiền phải trả thêm** | | **0 đ/tháng** |

**Credit dùng được bao lâu?** Mỗi tin giao việc tốn khoảng 1–2 xu Mỹ (ước tính, sẽ đo thật khi chạy). 250 USD tương đương khoảng **12.000–25.000 tin giao việc**. Các lệnh `viec`, `xong`, `xoa` và tin nhắc việc **không tốn credit**.

**Thay đổi so với bản n8n trước:**
- **Bỏ n8n Cloud**, phần duy nhất phải trả phí hằng tháng.
- **Giữ AI Claude**, nên độ chính xác như bản đã kiểm tra.

```
Bạn forward tin ─▶ Zalo Bot ─▶ Apps Script (trong Google Sheet) ─▶ Claude AI đọc tin
                       ▲                     │                    (trừ vào credit có sẵn)
                       │                     ▼
                       └── nhắc việc ◀── Google Sheet (bảng công việc)
                           (8h sáng & trước hạn 1 tiếng)
```

> **Lưu ý:** gói **Claude Max** (dùng trên claude.ai và Claude Code) và **credit API** là **hai thứ riêng**. Bot chỉ dùng được **credit API**, tức số dư trong trang Claude Console (platform.claude.com → Billing), không dùng được lượt của gói Max.

## 2. Tính năng: giữ nguyên

- Chuyển tiếp hoặc dán tin giao việc cho bot. AI tách ra việc gì, ai làm, hạn khi nào, gấp không.
- Lưu từng việc vào Google Sheet. Bạn xem và sửa được trên máy tính hoặc điện thoại.
- 8h sáng: tóm tắt các việc trễ hạn, việc hôm nay, việc 7 ngày tới.
- Nhắc trước hạn khoảng 1 tiếng.
- Lệnh: `viec` (xem danh sách), `xong ABCD` (đánh dấu xong), `xoa ABCD` (xóa), `hd` (hướng dẫn).
- **Thêm:** nếu AI lỗi (hết credit, mạng lỗi), bot **vẫn lưu tin thành việc thô** và báo để bạn sửa tay. Không mất tin nào.

## 3. Giới hạn cần biết

| Giới hạn | Ảnh hưởng | Cách xử lý |
|---|---|---|
| **Credit API có thể có hạn sử dụng** | Nếu credit hết hạn trước khi dùng hết, bot sẽ báo lỗi AI | Kiểm tra ngày hết hạn trong Claude Console → Billing. Đặt **giới hạn chi tiêu** (Limits) để không bị trừ tiền thẻ ngoài ý muốn |
| **Apps Script có hạn mức miễn phí** (khoảng 20.000 lần gọi ra ngoài mỗi ngày) | Dư sức cho nhóm nhỏ | Không cần làm gì |
| **Lịch nhắc của Google có thể lệch** trong vòng 1 tiếng | Tóm tắt "8h sáng" đến lúc 8:00–8:59 | Chấp nhận được |
| **Bot Zalo chỉ chat 1-1**, chưa vào nhóm | Phải chuyển tiếp hoặc dán tin cho bot | Giống bản trước |

## 4. Bạn cần làm gì (khoảng 30–45 phút)

| Bước | Việc | Trạng thái |
|---|---|---|
| 1 | Tạo bot Zalo, lấy token | ✅ Đã xong |
| 2 | Tạo Google Sheet `CongViec` với 13 cột | ✅ Đã xong, giữ nguyên |
| 3 | Vào **platform.claude.com**: kiểm tra số dư credit ở **Billing**, đặt **Limits**, tạo **API Key**. **Không cần nạp thêm tiền** | |
| 4 | Trong Google Sheet: **Tiện ích mở rộng → Apps Script**, dán đoạn mã tôi gửi (không cần sửa) | |
| 5 | Bấm **Triển khai (Deploy)** thành ứng dụng web, rồi chạy hàm **caiDat** một lần. Hàm này tự nối bot Zalo và tạo lịch chạy mỗi 15 phút (tóm tắt 8h sáng, nhắc trước hạn) | |
| 6 | Nhắn `hd` cho bot để thử | |

Không cần tài khoản n8n.

## 5. Việc tôi sẽ làm (phần kỹ thuật)

1. Viết **một file mã Apps Script** thay cho cả 3 kịch bản n8n cũ: nhận tin, gọi Claude, lưu Sheet, trả lời lệnh, tóm tắt sáng, nhắc trước hạn, tự cài đặt.
2. Dùng lại phần đọc lệnh, hiểu ngày giờ tiếng Việt và soạn tin trả lời đã kiểm tra ở bản trước (15 bài kiểm tra tự động).
3. Xử lý 2 điểm riêng của Apps Script:
   - Apps Script không đọc được tiêu đề (header) của tin Zalo gửi tới, nên **mã bí mật được đặt trong đường link webhook** để chặn tin giả mạo.
   - Apps Script có thể khiến Zalo **gửi lặp lại cùng một tin**, nên bot **nhớ mã tin đã xử lý** để không lưu trùng.
4. Viết dự phòng khi AI lỗi: lưu việc thô và báo cho bạn.
5. Viết lại hướng dẫn từng bước.
6. Kiểm tra bằng dữ liệu giả lập trước khi gửi. Lần chạy thật đầu tiên sẽ làm cùng bạn.

## 6. Rủi ro và phương án dự phòng

| Rủi ro | Khả năng | Dự phòng |
|---|---|---|
| Zalo không chấp nhận đường link webhook của Google Apps Script | Thấp đến vừa (chưa thử thực tế) | **Phương án B:** Apps Script tự hỏi Zalo "có tin mới không" mỗi phút. Tin chậm tối đa khoảng 1 phút, vẫn 0 đồng |
| Hết credit hoặc credit hết hạn | Thấp (250 USD dùng rất lâu) | Đổi 1 dòng sang **Gemini gói miễn phí** của Google (có giới hạn lượt mỗi ngày, AI hiểu kém hơn một chút) |
| Lỡ lộ token hoặc khóa | Thấp | Tạo token hoặc khóa mới, dán lại vào Apps Script |

## 7. So sánh các phương án

| | Bản n8n + Claude (trước) | **Apps Script + Claude credit (đề xuất)** | Apps Script + Gemini miễn phí | App thật ([PLAN.md](PLAN.md)) |
|---|---|---|---|---|
| Tiền phải trả thêm/tháng | ~25 USD cho n8n sau 14 ngày | **0 đ** | 0 đ | 50–130 USD + công làm |
| Độ chính xác AI | Cao | **Cao** | Khá | Cao |
| Giới hạn lượt AI | Theo credit | **Theo credit (rất nhiều)** | Vài chục đến vài trăm lượt/ngày | Theo credit |
| Bảo mật dữ liệu | Tốt | **Tốt** (dữ liệu API không dùng để huấn luyện theo mặc định) | Google có thể dùng dữ liệu ở gói miễn phí | Tốt |
| Số dịch vụ | 4 | **3 (Zalo, Google, Claude)** | 2 | Nhiều |
| Thời gian dựng | 1–2 giờ | **30–45 phút** | 30–45 phút | ~12 tuần |

## 8. Bước tiếp theo

1. Bạn đồng ý với kế hoạch này.
2. Tôi viết mã Apps Script và hướng dẫn mới.
3. Bạn làm Bước 3 (kiểm tra credit, tạo khóa API), rồi Bước 4–6.

Các file bản n8n cũ vẫn giữ trong thư mục `ban-thu-no-code/`.
