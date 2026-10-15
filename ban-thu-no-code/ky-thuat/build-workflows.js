// Generates the three importable n8n workflow files from the tested Code-node sources in ./src.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OUT = process.argv[2];
const src = (f) => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const uid = () => crypto.randomUUID();

const ZALO_API = 'https://bot-api.zaloplatforms.com/bot';
const MODEL = 'claude-opus-5-5';

const node = (name, type, typeVersion, position, parameters, extra = {}) => ({ parameters, id: uid(), name, type, typeVersion, position, ...extra });
const code = (name, file, position) => node(name, 'n8n-nodes-base.code', 2, position, { jsCode: src(file) });
const setCfg = (name, fields, position, includeOther = false) =>
  node(name, 'n8n-nodes-base.set', 3.4, position, {
    assignments: { assignments: fields.map(([n, v]) => ({ id: uid(), name: n, value: v, type: 'string' })) },
    includeOtherFields: includeOther,
    options: {},
  });

// Send a Zalo message. chatExpr/textExpr are n8n expressions (without the leading "=").
const sendZalo = (name, position, chatExpr, textExpr, extra = {}) =>
  node(name, 'n8n-nodes-base.httpRequest', 4.2, position, {
    method: 'POST',
    url: `=${ZALO_API}{{ $('Cấu hình').first().json.BOT_TOKEN }}/sendMessage`,
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({ chat_id: ${chatExpr}, text: ${textExpr} }) }}`,
    options: {},
  }, extra);

const sheetLoc = {
  documentId: { __rl: true, mode: 'url', value: "={{ $('Cấu hình').first().json.LINK_GOOGLE_SHEET }}" },
  sheetName: { __rl: true, mode: 'name', value: 'CongViec' },
};
const sheetsNode = (name, position, parameters, extra = {}) =>
  node(name, 'n8n-nodes-base.googleSheets', 4.7, position, { ...parameters }, extra);
const readSheet = (name, position, filters) =>
  sheetsNode(name, position, {
    operation: 'read',
    ...sheetLoc,
    ...(filters ? { filtersUI: { values: filters } } : {}),
    options: {},
  }, { alwaysOutputData: true });
const updateSheet = (name, position, valueExprs) =>
  sheetsNode(name, position, {
    operation: 'update',
    ...sheetLoc,
    columns: {
      mappingMode: 'defineBelow',
      value: valueExprs,
      matchingColumns: ['ID'],
      schema: Object.keys(valueExprs).map((k) => ({ id: k, displayName: k, required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true })),
    },
    options: { cellFormat: 'RAW' },
  });
const note = (content, position, width = 360, height = 220) =>
  node('Ghi chú ' + uid().slice(0, 4), 'n8n-nodes-base.stickyNote', 1, position, { content, width, height, color: 5 });

const connect = (pairs) => {
  const c = {};
  for (const [from, to, outIndex = 0] of pairs) {
    c[from] = c[from] || { main: [] };
    while (c[from].main.length <= outIndex) c[from].main.push([]);
    c[from].main[outIndex].push({ node: to, type: 'main', index: 0 });
  }
  return c;
};
const workflow = (name, nodes, connections) => ({
  name,
  nodes,
  connections,
  active: false,
  settings: { executionOrder: 'v1', timezone: 'Asia/Ho_Chi_Minh' },
  pinData: {},
  meta: { templateCredsSetupCompleted: false },
});

// ---------------- Workflow 1: nhận tin ----------------
const ifTrue = (name, position, leftExpr) =>
  node(name, 'n8n-nodes-base.if', 2.2, position, {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
      conditions: [{ id: uid(), leftValue: `={{ ${leftExpr} }}`, rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }],
      combinator: 'and',
    },
    options: {},
  });

const wf1 = workflow('ZaloPlan 1 – Nhận tin và lưu việc', [
  note('## ZaloPlan 1: nhận tin\n1. Mở khối **Cấu hình**, điền BOT_TOKEN, MA_BI_MAT, LINK_GOOGLE_SHEET.\n2. Chọn tài khoản Google ở 3 khối Google Sheets.\n3. Khối **Gọi AI**: tạo Header Auth, Name `x-api-key`, Value là khóa AI.\n4. Bấm **Publish** để bật.', [-420, -260], 420, 240),
  node('Zalo gửi tin đến', 'n8n-nodes-base.webhook', 2, [-400, 0], { httpMethod: 'POST', path: 'zaloplan', options: {} }, { webhookId: uid() }),
  setCfg('Cấu hình', [
    ['BOT_TOKEN', 'DIEN_BOT_TOKEN_ZALO'],
    ['MA_BI_MAT', 'DIEN_MA_BI_MAT_TU_DAT'],
    ['LINK_GOOGLE_SHEET', 'DIEN_LINK_GOOGLE_SHEET'],
    ['MO_HINH_AI', MODEL],
  ], [-180, 0], true),
  code('Đọc tin Zalo', 'doc-tin-zalo.js', [40, 0]),
  node('Phân loại', 'n8n-nodes-base.switch', 3.2, [260, 0], {
    mode: 'expression',
    numberOutputs: 3,
    output: "={{ ({ ai: 0, sheet: 1, tra_loi: 2 })[$json.route] ?? 2 }}",
    options: {},
  }),
  node('Gọi AI', 'n8n-nodes-base.httpRequest', 4.2, [500, -200], {
    method: 'POST',
    url: 'https://api.anthropic.com/v1/messages',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendHeaders: true,
    headerParameters: { parameters: [
      { name: 'anthropic-version', value: '2023-06-01' },
      { name: 'anthropic-beta', value: 'server-side-fallback-2026-07-01' },
    ] },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: '={{ JSON.stringify($json.aiRequest) }}',
    options: { response: { response: { neverError: true } }, timeout: 120000 },
  }),
  code('Tách công việc', 'tach-cong-viec.js', [720, -200]),
  ifTrue('Có việc?', [940, -200], '$json.coViec'),
  node('Tách từng việc', 'n8n-nodes-base.splitOut', 1, [1160, -300], { fieldToSplitOut: 'rows', options: {} }),
  sheetsNode('Lưu vào Google Sheet', [1380, -300], { operation: 'append', ...sheetLoc, columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [], schema: [] }, options: { cellFormat: 'RAW' } }),
  sendZalo('Báo đã lưu', [1600, -300], "$('Tách công việc').first().json.chatId", "$('Tách công việc').first().json.reply", { executeOnce: true }),
  sendZalo('Báo không có việc', [1160, -100], '$json.chatId', '$json.reply'),
  readSheet('Đọc việc của tôi', [500, 0], [{ lookupColumn: 'ChatID', lookupValue: '={{ $json.chatId }}' }]),
  code('Xử lý lệnh', 'xu-ly-lenh.js', [720, 0]),
  ifTrue('Cần cập nhật?', [940, 0], '$json.canCapNhat'),
  updateSheet('Cập nhật Google Sheet', [1160, 60], { ID: '={{ $json.ID }}', TrangThai: '={{ $json.TrangThai }}', XongLuc: '={{ $json.XongLuc }}' }),
  sendZalo('Báo đã cập nhật', [1380, 60], "$('Xử lý lệnh').first().json.chatId", "$('Xử lý lệnh').first().json.reply", { executeOnce: true }),
  sendZalo('Gửi danh sách', [1160, 220], '$json.chatId', '$json.reply'),
  sendZalo('Trả lời nhanh', [500, 220], '$json.chatId', '$json.reply'),
], connect([
  ['Zalo gửi tin đến', 'Cấu hình'],
  ['Cấu hình', 'Đọc tin Zalo'],
  ['Đọc tin Zalo', 'Phân loại'],
  ['Phân loại', 'Gọi AI', 0],
  ['Phân loại', 'Đọc việc của tôi', 1],
  ['Phân loại', 'Trả lời nhanh', 2],
  ['Gọi AI', 'Tách công việc'],
  ['Tách công việc', 'Có việc?'],
  ['Có việc?', 'Tách từng việc', 0],
  ['Có việc?', 'Báo không có việc', 1],
  ['Tách từng việc', 'Lưu vào Google Sheet'],
  ['Lưu vào Google Sheet', 'Báo đã lưu'],
  ['Đọc việc của tôi', 'Xử lý lệnh'],
  ['Xử lý lệnh', 'Cần cập nhật?'],
  ['Cần cập nhật?', 'Cập nhật Google Sheet', 0],
  ['Cần cập nhật?', 'Gửi danh sách', 1],
  ['Cập nhật Google Sheet', 'Báo đã cập nhật'],
]));

// ---------------- Workflow 2: nhắc việc ----------------
const wf2 = workflow('ZaloPlan 2 – Tóm tắt sáng và nhắc việc', [
  note('## ZaloPlan 2: nhắc việc\n1. Mở khối **Cấu hình**, điền BOT_TOKEN và LINK_GOOGLE_SHEET (giống kịch bản 1).\n2. Chọn tài khoản Google ở 2 khối Google Sheets.\n3. Bấm **Publish** để bật.\n\nMỗi 8h sáng: gửi tóm tắt. Mỗi giờ: nhắc việc sắp đến hạn trong 60 phút.', [-420, -300], 420, 240),
  node('Mỗi sáng 8h', 'n8n-nodes-base.scheduleTrigger', 1.2, [-400, -40], { rule: { interval: [{ field: 'days', triggerAtHour: 8, triggerAtMinute: 0 }] } }),
  node('Mỗi giờ', 'n8n-nodes-base.scheduleTrigger', 1.2, [-400, 140], { rule: { interval: [{ field: 'hours', hoursInterval: 1, triggerAtMinute: 0 }] } }),
  setCfg('Cấu hình', [
    ['BOT_TOKEN', 'DIEN_BOT_TOKEN_ZALO'],
    ['LINK_GOOGLE_SHEET', 'DIEN_LINK_GOOGLE_SHEET'],
    ['CHE_DO', "={{ $('Mỗi sáng 8h').isExecuted ? 'sang' : 'nhac' }}"],
  ], [-180, 40]),
  readSheet('Đọc tất cả việc', [40, 40], [{ lookupColumn: 'TrangThai', lookupValue: 'Mới' }]),
  code('Soạn tin', 'soan-tin-nhac.js', [260, 40]),
  ifTrue('Là tin nhắc?', [480, 40], "$('Cấu hình').first().json.CHE_DO === 'nhac'"),
  updateSheet('Đánh dấu đã nhắc', [700, -40], { ID: '={{ $json.ID }}', DaNhac: '={{ $json.DaNhac }}' }),
  sendZalo('Gửi tin nhắc', [700, -200], '$json.chatId', '$json.reply'),
  sendZalo('Gửi tóm tắt', [700, 140], '$json.chatId', '$json.reply'),
], connect([
  ['Mỗi sáng 8h', 'Cấu hình'],
  ['Mỗi giờ', 'Cấu hình'],
  ['Cấu hình', 'Đọc tất cả việc'],
  ['Đọc tất cả việc', 'Soạn tin'],
  ['Soạn tin', 'Là tin nhắc?'],
  ['Là tin nhắc?', 'Đánh dấu đã nhắc', 0],
  ['Là tin nhắc?', 'Gửi tóm tắt', 1],
  ['Là tin nhắc?', 'Gửi tin nhắc', 0],
]));

// ---------------- Workflow 3: cài webhook ----------------
const wf3 = workflow('ZaloPlan 3 – Nối bot Zalo với n8n (chạy 1 lần)', [
  note('## ZaloPlan 3: chạy một lần\n1. Bật kịch bản 1 trước, copy **Production URL** của khối "Zalo gửi tin đến".\n2. Điền khối **Cấu hình** bên dưới.\n3. Bấm **Execute workflow**. Khối **Kết quả** hiện `"ok": true` là xong.', [-420, -280], 420, 220),
  node('Bấm để chạy', 'n8n-nodes-base.manualTrigger', 1, [-400, 0], {}),
  setCfg('Cấu hình', [
    ['BOT_TOKEN', 'DIEN_BOT_TOKEN_ZALO'],
    ['MA_BI_MAT', 'DIEN_MA_BI_MAT_GIONG_KICH_BAN_1'],
    ['WEBHOOK_URL', 'DIEN_PRODUCTION_URL_CUA_KICH_BAN_1'],
  ], [-180, 0]),
  node('Kết quả', 'n8n-nodes-base.httpRequest', 4.2, [40, 0], {
    method: 'POST',
    url: `=${ZALO_API}{{ $json.BOT_TOKEN }}/setWebhook`,
    sendBody: true,
    specifyBody: 'json',
    jsonBody: '={{ JSON.stringify({ url: $json.WEBHOOK_URL, secret_token: $json.MA_BI_MAT }) }}',
    options: { response: { response: { neverError: true } } },
  }),
], connect([
  ['Bấm để chạy', 'Cấu hình'],
  ['Cấu hình', 'Kết quả'],
]));

fs.mkdirSync(OUT, { recursive: true });
for (const [file, wf] of [['1-zaloplan-nhan-tin.json', wf1], ['2-zaloplan-nhac-viec.json', wf2], ['3-zaloplan-cai-webhook.json', wf3]]) {
  fs.writeFileSync(path.join(OUT, file), JSON.stringify(wf, null, 2) + '\n');
  console.log('wrote', file, wf.nodes.length, 'nodes');
}
