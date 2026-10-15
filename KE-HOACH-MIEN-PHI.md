# Kế hoạch ZaloPlan bản miễn phí (0 đồng)

> Mục tiêu: bot Zalo đọc tin giao việc, AI tách thành công việc, lưu vào Google Sheet, nhắc việc mỗi sáng và trước hạn, **mà không tốn đồng nào và không cần thẻ thanh toán**.

---

## 1. Tóm tắt

| Thành phần | Dùng gì | Chi phí |
|---|---|---|
| Nhận và gửi tin Zalo | **Zalo Bot** (bạn đã tạo ở Bước 1) | 0 đ |
| Lưu công việc | **Google Sheet** (bạn đã tạo ở Bước 2) | 0 đ |
| Chạy kịch bản tự động 24/7 | **Google Apps Script**, có sẵn trong Google Sheet, chạy trên máy chủ của Google | 0 đ |
| AI đọc tin nhắn | **Google Gemini API, gói miễn phí** (loại Flash/Flash-Lite) | 0 đ, không cần thẻ |
| **Tổng** | | **0 đ/tháng** |

**Thay đổi so với bản trước:**
- **Bỏ n8n Cloud**, phần duy nhất phải trả phí hằng tháng.
- **Đổi AI Claude sang Gemini miễn phí.** Claude không có gói API miễn phí.

**Điểm cộng:** chỉ còn 2 thứ là Zalo và Google, không phải đăng ký thêm dịch vụ nào. Toàn bộ kịch bản nằm ngay trong Google Sheet của bạn.

```
Bạn forward tin ─▶ Zalo Bot ─▶ Apps Script (trong Google Sheet) ─▶ Gemini AI đọc tin
                       ▲                     │
                       │                     ▼
                       └── nhắc việc ◀── Google Sheet (bảng công việc)
                           (8h sáng & trước hạn 1 tiếng)
```

## 2. Tính năng: giữ nguyên như bản trước

- Chuyển tiếp hoặc dán tin giao việc cho bot. AI tách ra việc gì, ai làm, hạn khi nào, gấp không.
- Lưu từng việc vào Google Sheet. Bạn xem và sửa được trên máy tính hoặc điện thoại.
- 8h sáng: gửi tóm tắt các việc trễ hạn, việc hôm nay, việc 7 ngày tới.
- Nhắc trước hạn khoảng 1 tiếng.
- Lệnh: `viec` (xem danh sách), `xong ABCD` (đánh dấu xong), `xoa ABCD` (xóa), `hd` (hướng dẫn).

**Thêm mới:** nếu AI hết lượt miễn phí trong ngày, bot **vẫn lưu tin thành việc** (chưa tách hạn, người làm) và báo để bạn sửa tay trong Sheet. Không mất tin nào.

## 3. Cái giá của "miễn phí": những giới hạn cần biết

| Giới hạn | Ảnh hưởng thực tế | Cách xử lý |
|---|---|---|
| **Gemini miễn phí giới hạn số lượt mỗi ngày.** Con số chính xác Google không công bố cố định; các nguồn đưa ra từ vài chục đến vài trăm lượt/ngày tùy loại mô hình | Nhóm nhỏ (dưới 10 người, dưới khoảng 100 tin giao việc/ngày) thường đủ. Chỉ tin giao việc mới tốn lượt AI; các lệnh `viec`, `xong` không tốn | Dùng loại Flash-Lite (nhiều lượt nhất); khi hết lượt thì lưu việc thô như mục 2. Xem số lượt thật của bạn trong Google AI Studio |
| **Quyền riêng tư:** ở gói miễn phí, Google có thể dùng nội dung gửi vào để cải thiện sản phẩm của họ | Không nên gửi tin có thông tin nhạy cảm như số tài khoản, hợp đồng mật hay dữ liệu khách hàng | Chỉ chuyển tiếp tin giao việc thông thường. Khi cần bảo mật hơn thì nâng cấp gói trả phí (mục 7) |
| **Apps Script có hạn mức** (khoảng 20.000 lần gọi ra ngoài mỗi ngày, thời gian chạy tự động có giới hạn) | Dư sức cho nhóm nhỏ | Không cần làm gì |
| **Nhắc việc theo giờ có thể lệch vài phút** (Google chạy lịch hẹn "trong khoảng" giờ đó) | Tóm tắt "8h sáng" có thể đến lúc 8:00–8:59 | Chấp nhận được với bản thử |
| **Bot Zalo chỉ chat 1-1**, chưa vào nhóm | Phải chuyển tiếp hoặc dán tin cho bot | Giống bản trước |

## 4. Bạn cần làm gì (khoảng 30–45 phút)

| Bước | Việc | Trạng thái |
|---|---|---|
| 1 | Tạo bot Zalo, lấy token | ✅ Đã xong |
| 2 | Tạo Google Sheet `CongViec` với 13 cột | ✅ Đã xong, giữ nguyên |
| 3 (mới) | Lấy **khóa Gemini miễn phí** tại aistudio.google.com bằng tài khoản Google, **không cần thẻ** | Thay cho khóa Claude, nên **bỏ qua việc nạp 5 USD** |
| 4 (mới) | Trong Google Sheet: **Tiện ích mở rộng → Apps Script**, dán đoạn mã tôi gửi, điền 3 ô: token Zalo, khóa Gemini, mã bí mật | |
| 5 (mới) | Bấm **Triển khai (Deploy)** thành ứng dụng web, rồi chạy hàm **caiDat** một lần. Hàm này tự nối bot Zalo và tự tạo lịch nhắc 8h sáng và mỗi giờ | |
| 6 | Nhắn `hd` cho bot để thử | |

Không cần tạo tài khoản n8n, không cần khóa Claude.

## 5. Việc tôi sẽ làm (phần kỹ thuật)

1. Viết **một file mã Apps Script** làm đủ các việc của 3 kịch bản n8n cũ: nhận tin, gọi AI, lưu Sheet, trả lời lệnh, tóm tắt sáng, nhắc trước hạn, tự cài đặt.
2. Giữ nguyên cách đọc lệnh, cách hiểu ngày giờ tiếng Việt và cách soạn tin trả lời đã kiểm tra ở bản trước (15 bài kiểm tra tự động).
3. Xử lý 2 điểm riêng của Apps Script:
   - Apps Script **không đọc được tiêu đề (header) của tin Zalo gửi tới**. Vì vậy mã bí mật được đặt **trong đường link webhook** để chặn tin giả mạo.
   - Apps Script có thể trả lời Zalo bằng một bước chuyển hướng, khiến Zalo **gửi lặp lại cùng một tin**. Bot sẽ **nhớ mã tin đã xử lý** để không lưu trùng.
4. Viết **dự phòng hết lượt AI**: lưu việc thô và báo cho bạn.
5. Viết lại hướng dẫn từng bước kèm ảnh minh họa vị trí nút.
6. Kiểm tra trước khi gửi bằng dữ liệu giả lập. Riêng phần chạy thật trên Google, Zalo và Gemini sẽ thử cùng bạn ở lần đầu.

## 6. Rủi ro và phương án dự phòng

| Rủi ro | Khả năng | Dự phòng |
|---|---|---|
| Zalo không chấp nhận đường link webhook của Google Apps Script | Thấp đến vừa (chưa thử thực tế) | **Phương án B:** không dùng webhook; Apps Script tự hỏi Zalo "có tin mới không" mỗi phút. Tin đến chậm tối đa khoảng 1 phút, vẫn 0 đồng |
| Gemini đổi chính sách miễn phí | Vừa | Đổi sang mô hình miễn phí khác của Gemini (chỉ sửa 1 dòng), hoặc tạm dùng chế độ lưu việc thô không cần AI |
| AI miễn phí hiểu kém hơn Claude với tin phức tạp | Vừa | Luôn có lệnh `xoa` và sửa tay trong Sheet; tin dài thì nên tách ra |
| Lỡ lộ token hoặc khóa | Thấp | Tạo token hoặc khóa mới, rồi dán lại vào Apps Script |

## 7. Khi nào nên trả tiền (không bắt buộc)

Bản miễn phí phù hợp để **dùng thử và dùng lâu dài cho nhóm nhỏ**. Chỉ cân nhắc trả phí khi:

- Nhóm đông, **thường xuyên hết lượt AI** → bật gói trả phí của Gemini (trả theo lượt, rất rẻ) hoặc quay lại dùng Claude.
- Cần **bảo mật dữ liệu khách hàng** → dùng gói AI trả phí (không dùng dữ liệu để huấn luyện).
- Cần **giao diện riêng, nhiều nhóm, báo cáo** → làm app thật như [PLAN.md](PLAN.md).

## 8. So sánh 3 phương án

| | Bản n8n + Claude (trước) | **Bản miễn phí (đề xuất)** | App thật ([PLAN.md](PLAN.md)) |
|---|---|---|---|
| Chi phí/tháng | ~25–30 USD sau 14 ngày dùng thử | **0 đ** | 50–130 USD + công làm |
| Cần thẻ thanh toán | Có | **Không** | Có |
| Số dịch vụ phải đăng ký | 4 (Zalo, Google, n8n, Claude) | **2 (Zalo, Google)** | Nhiều |
| Độ chính xác AI | Cao | Khá | Cao |
| Thời gian dựng | 1–2 giờ | **30–45 phút** | ~12 tuần |
| Phù hợp | Nhóm cần AI tốt nhất | **Thử nghiệm, nhóm nhỏ** | Bán cho nhiều khách |

## 9. Bước tiếp theo

1. Bạn đồng ý với kế hoạch này.
2. Tôi viết mã Apps Script và hướng dẫn mới.
3. Bạn làm Bước 3 mới (lấy khóa Gemini miễn phí), rồi Bước 4–6 theo hướng dẫn.

Các file của bản n8n cũ vẫn được giữ trong thư mục `ban-thu-no-code/`, phòng khi sau này muốn chuyển sang.
