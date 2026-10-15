# Phần kỹ thuật của bản thử no-code

Dành cho người làm kỹ thuật muốn sửa kịch bản. Người dùng thường không cần thư mục này.

- `src/`: mã của 4 khối Code trong n8n (đọc tin, tách việc, xử lý lệnh, soạn tin nhắc).
- `build-workflows.js`: tạo lại 3 file kịch bản `.json` từ `src/`:
  `node build-workflows.js ..`
- `test.js`: kiểm tra 4 khối Code với dữ liệu giả: `node test.js`
- `e2e/`: chạy thử toàn bộ kịch bản trên n8n thật, với Zalo, AI và Google Sheet giả lập:
  1. `node e2e/mock.js e2e/mock-log.json` (máy chủ giả lập ở cổng 9999)
  2. `node e2e/make-test-copies.js .. e2e/test-wf`, rồi nhập các file trong `e2e/test-wf` vào n8n, bấm Publish kịch bản 1
  3. `node e2e/run-e2e.js`
