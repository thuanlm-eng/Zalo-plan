# Kế hoạch sản phẩm: App lập kế hoạch công việc từ tin nhắn Zalo

> Tên tạm: **ZaloPlan**
> Mục tiêu: tự động biến những tin nhắn Zalo kiểu *"Em ơi chiều thứ 6 gửi anh báo giá nhé"* thành công việc có người làm, hạn chót và lời nhắc, để không còn việc bị trôi trong nhóm chat.

---

## 1. Vấn đề và cơ hội

- Ở Việt Nam, Zalo là kênh giao việc chính của rất nhiều đội nhóm (SME, công trường, bán hàng, văn phòng, gia đình).
- Việc được giao **lẫn trong hàng trăm tin nhắn**, dễ trôi, không ai theo dõi hạn chót, không có tổng hợp "hôm nay ai phải làm gì".
- Các công cụ quản lý công việc (Trello, Asana, ClickUp…) đòi người dùng **nhập lại thủ công**, nên phần lớn đội nhóm nhỏ không dùng.

**Ý tưởng cốt lõi:** người dùng không phải đổi thói quen. Họ vẫn nhắn Zalo như cũ, còn app "nghe" (hoặc nhận tin chuyển tiếp), dùng AI trích xuất công việc rồi đưa lên lịch, nhắc việc và tổng hợp.

## 2. Người dùng mục tiêu và tình huống sử dụng

| Nhóm người dùng | Tình huống điển hình |
|---|---|
| Chủ SME hoặc quản lý nhóm | Giao việc trong nhóm Zalo và muốn xem bảng tổng hợp ai đang làm gì, việc nào trễ hạn |
| Nhân viên hoặc cá nhân | Muốn nhận danh sách "việc của tôi hôm nay" được gom từ nhiều nhóm chat |
| Shop bán hàng qua Zalo OA | Đơn hàng hoặc yêu cầu của khách tự động thành việc cần xử lý |
| Kỹ sư hoặc QS công trường | Yêu cầu từ chủ đầu tư hoặc tư vấn giám sát qua Zalo thành checklist có hạn chót |

**User story chính (MVP):**
1. Là quản lý, tôi chuyển tiếp (forward) một tin nhắn Zalo cho bot và nhận lại một công việc đã điền sẵn tiêu đề, người làm và hạn chót để tôi xác nhận bằng một chạm.
2. Là nhân viên, mỗi sáng 8h tôi nhận một tin nhắn Zalo tóm tắt việc hôm nay và việc sắp trễ.
3. Là quản lý, tôi mở bảng (web hoặc Mini App) để xem việc theo người, theo dự án và theo trạng thái.

## 3. Thách thức số 1: lấy tin nhắn từ Zalo

Đây là quyết định kiến trúc quan trọng nhất. **Zalo không có API chính thức để đọc tin nhắn của tài khoản cá nhân.** Các phương án:

| # | Phương án | Chính thức? | Tự động? | Ưu điểm | Nhược điểm |
|---|---|---|---|---|---|
| A | **Zalo Bot Platform** (bot API kiểu Telegram: webhook, `sendMessage`…) | ✅ | Bán tự động | Hợp lệ, dễ làm, người dùng chat 1-1 hoặc forward tin cho bot | Hỗ trợ nhóm cần kiểm tra lại trên tài liệu chính thức (nguồn bên thứ ba đang mâu thuẫn) |
| B | **Zalo Official Account (OA) API** + webhook | ✅ | Tự động với tin gửi tới OA | Phù hợp doanh nghiệp: tin khách gửi OA tự thành việc | Cần OA đã xác thực; chỉ thấy tin gửi tới OA, không thấy nhóm nội bộ |
| C | **Nhập thủ công thông minh**: dán văn bản, chia sẻ (share sheet), chụp màn hình rồi OCR, file xuất chat | ✅ | Thủ công 1 bước | Luôn hoạt động, không phụ thuộc API | Người dùng phải thao tác |
| D | Thư viện không chính thức đăng nhập tài khoản cá nhân (vd. `zca-js`) | ❌ | Hoàn toàn tự động | Đọc được mọi nhóm | **Vi phạm điều khoản Zalo, có thể bị khóa tài khoản, rủi ro bảo mật và pháp lý.** Không dùng cho sản phẩm thương mại |

**Khuyến nghị:**
- **MVP = A + C.** Bot Zalo chính thức làm "cửa vào" chính (forward hoặc nhắn trực tiếp), kèm ô dán văn bản và OCR ảnh chụp màn hình trong app.
- **Giai đoạn 2 = B** cho khách hàng doanh nghiệp có OA.
- **Không dùng D** cho bản phát hành. Nếu cần thử nghiệm nội bộ thì tách riêng, ghi rõ rủi ro.
- Việc đầu tiên của Sprint 0: **đọc tài liệu chính thức của Zalo Bot Platform và Zalo for Developers** để chốt bot có vào được nhóm và nhận tin nhóm hay không. Phạm vi MVP phụ thuộc vào điểm này.

## 4. Tính năng

### MVP (phiên bản 1)
- **Thu nhận tin nhắn:** forward hoặc nhắn cho Zalo Bot; dán văn bản; tải ảnh chụp màn hình (OCR).
- **AI trích xuất công việc:** tiêu đề, mô tả, người được giao, hạn chót, mức ưu tiên, dự án hoặc nhóm, và trích dẫn tin gốc.
- **Hiểu thời gian tiếng Việt:** "chiều mai", "thứ 6 tuần sau", "trước 10h sáng 15/11", "cuối tháng", "ASAP".
- **Xác nhận một chạm:** bot trả về thẻ công việc kèm nút ✅ Lưu / ✏️ Sửa / ❌ Bỏ qua. AI chỉ đề xuất, người dùng quyết định.
- **Danh sách việc:** Hôm nay / Sắp tới / Trễ hạn / Đã xong; lọc theo người và dự án.
- **Nhắc việc qua Zalo:** trước hạn chót (cấu hình được) và bản tóm tắt buổi sáng.
- **Đánh dấu hoàn thành** ngay trong chat bằng lệnh hoặc nút (vd. "xong #12").

### Giai đoạn 2
- Zalo OA: tin khách hàng tự động thành việc (đơn hàng, khiếu nại, yêu cầu báo giá).
- **Zalo Mini App** làm giao diện chính, để người dùng không phải rời Zalo.
- Lịch (calendar view), đồng bộ Google Calendar.
- Phát hiện trùng lặp (cùng một việc được nhắc nhiều lần) và cập nhật việc cũ thay vì tạo mới.
- Báo cáo tuần: số việc hoàn thành và trễ hạn theo người.

### Giai đoạn 3
- **Gợi ý lập kế hoạch:** sắp xếp việc vào khung giờ trống, cảnh báo quá tải.
- Phụ thuộc giữa các việc, việc lặp lại (hằng tuần, hằng tháng).
- Tích hợp Google Sheets, Notion, Trello, Excel.
- Ghi âm giọng nói (tin nhắn thoại Zalo) chuyển thành văn bản rồi thành việc.

## 5. Kiến trúc hệ thống

```
┌──────────────┐  webhook   ┌─────────────────────────────────────────────┐
│  Zalo Bot    │──────────▶│                Backend API                   │
│  Zalo OA     │◀──────────│  (xác thực secret, chống trùng, rate limit)  │
└──────────────┘ sendMessage└──────┬──────────────────────────┬───────────┘
                                   │ đẩy vào hàng đợi         │ REST/JSON
┌──────────────┐  dán/OCR          ▼                          ▼
│ Web / Mini   │──────────▶┌───────────────┐       ┌───────────────────┐
│ App / Mobile │◀──────────│  Worker AI    │       │  PostgreSQL       │
└──────────────┘           │ 1. Lọc tin    │──────▶│  (tasks, users,   │
                           │ 2. Trích xuất │       │   messages...)    │
                           │ 3. Chuẩn hóa  │       └───────────────────┘
                           │    thời gian  │                ▲
                           └───────────────┘                │
                           ┌───────────────┐                │
                           │  Scheduler    │────────────────┘
                           │ (nhắc việc,   │── gửi nhắc qua Zalo Bot/OA
                           │  tóm tắt 8h)  │
                           └───────────────┘
```

**Luồng xử lý một tin nhắn:**
1. Webhook nhận event, kiểm tra header secret, bỏ event trùng (theo `message_id`), trả `200` ngay.
2. Lưu tin thô vào bảng `messages` rồi đẩy job vào hàng đợi.
3. Worker AI:
   - **Bước lọc (model nhỏ, rẻ):** tin này có chứa công việc không? Phần lớn tin chat ("ok", "😂", "đã nhận") bị loại ở đây để tiết kiệm chi phí.
   - **Bước trích xuất (model mạnh hơn):** trả về JSON theo schema (mục 6), có kèm ngữ cảnh khoảng 10 tin trước đó để hiểu "việc đó", "cái này".
   - **Chuẩn hóa thời gian:** chuyển "thứ 6 tuần sau" thành ngày giờ cụ thể theo múi giờ `Asia/Ho_Chi_Minh` và thời điểm gửi tin.
4. Tạo `task` ở trạng thái `draft`, rồi bot gửi thẻ xác nhận.
5. Người dùng xác nhận thì task chuyển sang `todo` và Scheduler lên lịch nhắc.

## 6. Pipeline AI trích xuất công việc

**Schema đầu ra (structured output / tool use):**
```json
{
  "has_task": true,
  "tasks": [
    {
      "title": "Gửi báo giá cho anh Minh",
      "description": "Báo giá thép hộp cho công trình Q7",
      "assignee_hint": "Lan",
      "assigner_hint": "anh Minh",
      "due_text": "chiều thứ 6",
      "due_at": "2026-10-16T17:00:00+07:00",
      "due_confidence": "medium",
      "priority": "high",
      "project_hint": "Công trình Q7",
      "source_quote": "Lan ơi chiều thứ 6 gửi anh báo giá thép hộp Q7 nhé, gấp",
      "confidence": 0.86
    }
  ]
}
```

**Nguyên tắc:**
- Dùng **LLM có structured output** (vd. Claude qua Anthropic API: model nhỏ cho bước lọc, model trung bình cho bước trích xuất). Prompt có nhiều ví dụ tiếng Việt, kể cả không dấu, viết tắt và teencode ("ko", "dc", "nhé", "nha", "gấp").
- **Không bịa:** khi không chắc về hạn chót hoặc người làm thì để `null` và hỏi lại người dùng, không đoán bừa.
- Tính `due_at` bằng **code** từ `due_text` cộng thời điểm gửi tin, hoặc để LLM đề xuất rồi code kiểm tra lại. Không tin hoàn toàn vào ngày LLM tự tính.
- **Ghép người làm:** so `assignee_hint` với danh bạ thành viên (tên Zalo, biệt danh) bằng so khớp mờ (fuzzy), bỏ dấu tiếng Việt khi so.
- **Vòng phản hồi:** mỗi lần người dùng sửa thẻ (đổi hạn, đổi người) thì lưu lại làm dữ liệu đánh giá, dùng để cải thiện prompt và ví dụ.
- **Bộ đánh giá (eval set):** khoảng 300 tin nhắn thật đã ẩn danh, gán nhãn thủ công, đo độ chính xác trước mỗi lần đổi prompt hoặc model.

## 7. Mô hình dữ liệu (rút gọn)

```
workspaces   (id, name, plan, created_at)
users        (id, workspace_id, zalo_user_id, display_name, aliases[], role, timezone)
channels     (id, workspace_id, type[bot|oa|manual], zalo_chat_id, name)
messages     (id, channel_id, zalo_message_id UNIQUE, sender_id, text, attachments,
              sent_at, processed_at, has_task)
tasks        (id, workspace_id, title, description, assignee_id, creator_id,
              project_id, due_at, priority, status[draft|todo|doing|done|dismissed],
              source_message_id, ai_confidence, created_at, completed_at)
task_events  (id, task_id, actor_id, type[created|edited|status_changed|reminded], payload, at)
projects     (id, workspace_id, name)
reminders    (id, task_id, remind_at, sent_at, channel)
```

## 8. Công nghệ đề xuất

| Lớp | Lựa chọn | Lý do |
|---|---|---|
| Backend | **Node.js + TypeScript** (NestJS hoặc Fastify) | Hệ sinh thái Zalo SDK cộng đồng chủ yếu là JS; một ngôn ngữ cho cả frontend |
| Hàng đợi / lịch | BullMQ + Redis | Job xử lý AI, nhắc việc, retry |
| Cơ sở dữ liệu | PostgreSQL (Prisma hoặc Drizzle) | Quan hệ rõ ràng, JSONB cho payload thô |
| AI | Anthropic API (Claude), structured output | Hiểu tiếng Việt tốt, trả JSON ổn định |
| OCR | Google Cloud Vision hoặc model AI đa phương thức đọc ảnh trực tiếp | Đọc ảnh chụp màn hình chat |
| Frontend | Next.js (web dashboard) → **Zalo Mini App** (giai đoạn 2) | Web làm nhanh cho MVP; Mini App để ở lại trong Zalo |
| Hạ tầng | Docker; VPS hoặc cloud có vùng gần VN (Singapore) hoặc nhà cung cấp trong nước | Độ trễ thấp; cân nhắc yêu cầu lưu trữ dữ liệu tại VN |
| Giám sát | Sentry + log có cấu trúc | Theo dõi lỗi webhook và AI |

## 9. Trải nghiệm người dùng (luồng chính)

**Luồng 1: forward tin cho bot**
```
[Người dùng] forward: "Lan ơi chiều thứ 6 gửi anh báo giá thép hộp Q7 nhé, gấp"
[Bot] 📝 Việc mới:
      • Gửi báo giá thép hộp – Công trình Q7
      • 👤 Lan   • ⏰ 17:00 Thứ 6, 16/10   • 🔥 Cao
      [✅ Lưu]  [✏️ Sửa]  [❌ Bỏ qua]
```

**Luồng 2: tóm tắt buổi sáng (8:00)**
```
[Bot] ☀️ Chào Lan, hôm nay bạn có 3 việc:
      1. Gửi báo giá thép hộp Q7 – 17:00 🔥
      2. Gọi xác nhận lịch đổ bê tông – 10:00
      3. ⚠️ Trễ hạn: Nộp hồ sơ nghiệm thu tầng 5 (từ hôm qua)
      Trả lời "xong 1" để đánh dấu hoàn thành.
```

**Luồng 3: dashboard quản lý.** Bảng Kanban theo trạng thái, lọc theo người và dự án, nhấn vào việc để xem tin nhắn gốc.

## 10. Bảo mật, quyền riêng tư, pháp lý

- Tin nhắn là **dữ liệu cá nhân**. Cần tuân thủ **Luật Bảo vệ dữ liệu cá nhân** (hiệu lực từ 01/01/2026) và Nghị định 13/2023/NĐ-CP: có sự đồng ý rõ ràng, có mục đích xử lý, cho phép xóa dữ liệu.
- **Tối thiểu hóa dữ liệu:** chỉ lưu tin được forward hoặc gửi tới bot/OA; tự xóa tin thô không chứa việc sau N ngày (vd. 30 ngày).
- Mã hóa khi truyền (HTTPS) và khi lưu (mã hóa cột nhạy cảm); tách dữ liệu theo workspace.
- Xác thực webhook bằng secret token; chống replay và trùng lặp; rate limit.
- Khi gửi dữ liệu cho nhà cung cấp AI: dùng gói API không dùng dữ liệu để huấn luyện, ghi rõ trong chính sách quyền riêng tư.
- Tuân thủ điều khoản Zalo Platform; **không** tự động hóa tài khoản cá nhân.

## 11. Lộ trình triển khai (khoảng 12 tuần cho MVP và beta)

| Giai đoạn | Thời gian | Kết quả |
|---|---|---|
| **Sprint 0: Khảo sát** | Tuần 1 | Chốt khả năng Zalo Bot/OA (nhóm, webhook, giới hạn); phỏng vấn 5–10 người dùng; thu khoảng 300 tin mẫu để làm eval set |
| **Sprint 1: Nền tảng** | Tuần 2–3 | Repo, CI, DB schema, webhook Zalo Bot, lưu tin, gửi tin trả lời |
| **Sprint 2: AI trích xuất** | Tuần 4–5 | Pipeline lọc, trích xuất và chuẩn hóa thời gian; eval set đạt ≥ 85% đúng tiêu đề và hạn chót |
| **Sprint 3: Xác nhận & quản lý việc** | Tuần 6–7 | Thẻ xác nhận, sửa và hoàn thành trong chat; ghép người làm |
| **Sprint 4: Nhắc việc & dashboard** | Tuần 8–9 | Scheduler nhắc việc, tóm tắt 8h, web dashboard (danh sách, Kanban, lọc) |
| **Sprint 5: Nhập thủ công & OCR** | Tuần 10 | Dán văn bản, tải ảnh chụp màn hình |
| **Beta kín** | Tuần 11–12 | 3–5 đội nhóm thật dùng thử; đo KPI; sửa lỗi; chính sách quyền riêng tư |
| Giai đoạn 2 | Tháng 4–6 | Zalo OA, Mini App, lịch, chống trùng, báo cáo tuần |

**Nhân sự tối thiểu:** 1 full-stack (Node/TS), 1 người lo AI/prompt và eval (có thể kiêm nhiệm), và 1 product/design bán thời gian.

## 12. Ước tính chi phí vận hành (tham khảo, giai đoạn beta)

| Hạng mục | Ước tính/tháng |
|---|---|
| Server + DB + Redis (VPS hoặc cloud nhỏ) | 20–60 USD |
| AI: khoảng 50.000 tin/tháng, ~80% bị loại ở bước lọc rẻ, ~10.000 tin qua bước trích xuất | khoảng 15–60 USD (tùy model và độ dài ngữ cảnh) |
| OCR | < 10 USD |
| Zalo OA (nếu dùng, gói doanh nghiệp) | theo bảng giá Zalo |

> Mẹo tiết kiệm: lọc nhanh bằng quy tắc (tin quá ngắn, chỉ có emoji hoặc sticker) trước khi gọi AI; dùng prompt caching cho phần hướng dẫn cố định.

## 13. Rủi ro và cách giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Bot không đọc được tin nhóm | Cao | Thiết kế quanh forward và nhập thủ công ngay từ đầu; nhóm là phần thưởng thêm nếu có |
| Zalo thay đổi API hoặc chính sách | Trung bình | Lớp adapter `ZaloChannel` tách biệt; theo dõi changelog |
| AI trích xuất sai hạn hoặc sai người | Trung bình | Luôn có bước xác nhận; độ tin cậy thấp thì hỏi lại; eval set |
| Người dùng ngại forward thủ công | Trung bình | Tối ưu còn 1 thao tác; bản tóm tắt sáng tạo giá trị ngay để giữ chân |
| Quyền riêng tư và lòng tin | Cao | Minh bạch, tối thiểu dữ liệu, cho xóa, không đọc tài khoản cá nhân |
| Chi phí AI tăng theo lượng tin | Thấp | Lọc 2 tầng, caching, giới hạn theo gói |

## 14. Chỉ số thành công (KPI)

- **Độ chính xác trích xuất:** ≥ 85% việc được lưu mà không cần sửa.
- **Tỉ lệ chấp nhận đề xuất:** tỉ lệ thẻ được bấm ✅ so với tổng thẻ.
- **Kích hoạt:** ≥ 60% người dùng mới tạo ít nhất 3 việc trong tuần đầu.
- **Giữ chân:** tỉ lệ người dùng hoạt động ở tuần 4 ≥ 40%.
- **Giá trị:** tỉ lệ việc hoàn thành đúng hạn tăng so với trước khi dùng (khảo sát beta).

## 15. Câu hỏi cần chốt trước khi bắt đầu

1. **Đối tượng ưu tiên:** đội nhóm nội bộ (quản lý giao việc) hay shop hoặc doanh nghiệp xử lý tin khách (OA)? Câu trả lời quyết định A hay B làm trước.
2. **Giao diện chính:** chỉ bot trong Zalo, web dashboard, Zalo Mini App, hay app mobile riêng?
3. **Mô hình kinh doanh:** miễn phí cho cá nhân, thu phí theo workspace hay theo số thành viên?
4. **Lưu trữ dữ liệu:** có yêu cầu đặt server tại Việt Nam không (khách hàng doanh nghiệp hoặc nhà nước)?
5. **Lĩnh vực khởi đầu:** có nên chọn một ngành cụ thể (vd. xây dựng hoặc QS, bán hàng online) để tối ưu prompt và ví dụ trước không?

---

### Bước tiếp theo đề xuất
1. Trả lời 5 câu hỏi ở mục 15.
2. Sprint 0: xác minh năng lực Zalo Bot Platform và OA trên tài liệu chính thức, thu tin mẫu.
3. Dựng prototype trích xuất (script nhận văn bản, trả JSON công việc) để thử với tin nhắn thật trước khi viết backend đầy đủ.
