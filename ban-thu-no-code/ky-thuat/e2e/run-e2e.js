// Sends Zalo-shaped webhook calls to the running n8n and checks what the mock received.
const assert = require('assert');
const HOOK = 'http://127.0.0.1:5678/webhook/zaloplan';
const MOCK = 'http://127.0.0.1:9999';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const state = async () => (await fetch(`${MOCK}/state`)).json();

async function zalo(text, { secret = 'BiMat12345678', chat = 'chat-1', event = 'message.text.received' } = {}) {
  const before = (await state()).sent.length;
  const r = await fetch(HOOK, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Bot-Api-Secret-Token': secret },
    body: JSON.stringify({ ok: true, result: { event_name: event, message: { message_id: 'm1', date: Date.now(), text, chat: { id: chat, chat_type: 'PRIVATE' }, from: { id: chat, display_name: 'Minh', is_bot: false } } } }),
  });
  assert.strictEqual(r.status, 200, 'webhook should answer 200');
  for (let i = 0; i < 60; i++) {
    const s = await state();
    if (s.sent.length > before) { await wait(500); return (await state()).sent.slice(before); }
    await wait(250);
  }
  return [];
}

(async () => {
  let s;
  // 1. help
  let out = await zalo('hd');
  assert.strictEqual(out.length, 1); assert.match(out[0].text, /Chào bạn, mình là ZaloPlan/); assert.strictEqual(out[0].chat_id, 'chat-1'); assert.strictEqual(out[0].token, 'TOKEN123');
  console.log('ok - help reply');

  // 2. wrong secret: nothing sent
  out = await zalo('hd', { secret: 'sai' });
  assert.strictEqual(out.length, 0); console.log('ok - wrong secret ignored');

  // 3. task message -> AI -> 2 rows appended -> one confirmation
  out = await zalo('Lan ơi chiều thứ 6 gửi anh báo giá thép hộp Q7 nhé, gấp! Gọi xác nhận lịch đổ bê tông luôn');
  s = await state();
  assert.strictEqual(s.ai.length, 1);
  assert.deepStrictEqual(s.ai[0].headers, { key: 'test-key', version: '2023-06-01', beta: 'server-side-fallback-2026-07-01' });
  assert.strictEqual(s.ai[0].body.output_config.format.type, 'json_schema');
  assert.strictEqual(s.rows.length, 2, 'two rows appended');
  assert.strictEqual(s.rows[0].ChatID, 'chat-1');
  assert.strictEqual(s.rows[0].TrangThai, 'Mới');
  assert.strictEqual(out.length, 1, 'exactly one confirmation message');
  assert.match(out[0].text, /Đã lưu 2 việc/);
  assert.match(out[0].text, /17:00 Thứ Sáu 16\/10/);
  const id = s.rows[0].ID;
  console.log('ok - task saved, confirmation:', JSON.stringify(out[0].text.split('\n')[0]));

  // 4. chit-chat -> AI says no tasks
  out = await zalo('cảm ơn anh nhiều nha');
  assert.strictEqual(out.length, 1); assert.match(out[0].text, /không thấy việc/);
  assert.strictEqual((await state()).rows.length, 2);
  console.log('ok - no-task message');

  // 5. list
  out = await zalo('việc');
  assert.strictEqual(out.length, 1); assert.match(out[0].text, /2 việc đang mở/); assert.match(out[0].text, new RegExp(id));
  console.log('ok - list');

  // 6. other user sees nothing
  out = await zalo('viec', { chat: 'chat-2' });
  assert.match(out[0].text, /không còn việc/);
  console.log('ok - list is per user');

  // 7. done
  out = await zalo(`xong ${id.toLowerCase()}`);
  assert.strictEqual(out.length, 1); assert.match(out[0].text, /Đã đánh dấu xong/);
  s = await state();
  assert.strictEqual(s.rows.find((r) => r.ID === id).TrangThai, 'Xong');
  assert.match(s.rows.find((r) => r.ID === id).XongLuc, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  console.log('ok - xong updates sheet');

  // 8. unknown id / other user's id
  out = await zalo(`xong ${s.rows[1].ID}`, { chat: 'chat-2' });
  assert.match(out[0].text, /không tìm thấy/);
  console.log('ok - cannot close someone else\'s task');

  // 9. image message
  out = await zalo('', { event: 'message.image.received' });
  assert.match(out[0].text, /chỉ đọc được tin nhắn chữ/);
  console.log('ok - image message');

  console.log('\nE2E workflow 1: all checks passed');
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
