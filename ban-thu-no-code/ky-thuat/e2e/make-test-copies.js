// Turns the shipped workflows into test copies: external URLs point at the local mock,
// Google Sheets nodes become HTTP calls to the mock sheet, credentials are inlined.
const fs = require('fs');
const path = require('path');
const [, , inDir, outDir] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const MOCK = 'http://127.0.0.1:9999';

function toHttp(n) {
  const p = n.parameters;
  const base = { ...n, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2 };
  if (p.operation === 'append') {
    return { ...base, parameters: { method: 'POST', url: `${MOCK}/sheet/append`, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json) }}', options: {} } };
  }
  if (p.operation === 'read') {
    const f = p.filtersUI && p.filtersUI.values[0];
    const qs = f ? `?col=${f.lookupColumn}&val={{ encodeURIComponent(${f.lookupValue.startsWith('=') ? f.lookupValue.slice(4, -3) : JSON.stringify(f.lookupValue)}) }}` : '';
    return { ...base, parameters: { method: 'GET', url: `=${MOCK}/sheet/read${qs}`, options: {} } };
  }
  if (p.operation === 'update') {
    const fields = Object.entries(p.columns.value).map(([k, v]) => `${JSON.stringify(k)}: ${v.slice(4, -3)}`).join(', ');
    return { ...base, parameters: { method: 'POST', url: `${MOCK}/sheet/update`, sendBody: true, specifyBody: 'json', jsonBody: `={{ JSON.stringify({ ${fields} }) }}`, options: {} } };
  }
  throw new Error('unknown op ' + p.operation);
}

for (const f of fs.readdirSync(inDir).filter((f) => f.endsWith('.json'))) {
  const wf = JSON.parse(fs.readFileSync(path.join(inDir, f), 'utf8'));
  wf.id = 'test' + f[0];
  wf.nodes = wf.nodes.map((n) => {
    if (n.type === 'n8n-nodes-base.googleSheets') return toHttp(n);
    if (n.type === 'n8n-nodes-base.httpRequest') {
      const p = { ...n.parameters };
      p.url = p.url.replace('https://bot-api.zaloplatforms.com', MOCK).replace('https://api.anthropic.com', MOCK);
      if (p.authentication) {
        delete p.authentication; delete p.genericAuthType;
        p.headerParameters.parameters.push({ name: 'x-api-key', value: 'test-key' });
      }
      return { ...n, parameters: p };
    }
    if (n.name === 'Cấu hình') {
      const p = JSON.parse(JSON.stringify(n.parameters));
      for (const a of p.assignments.assignments) {
        if (a.name === 'BOT_TOKEN') a.value = 'TOKEN123';
        if (a.name === 'MA_BI_MAT') a.value = 'BiMat12345678';
        if (a.name === 'LINK_GOOGLE_SHEET') a.value = 'https://docs.google.com/spreadsheets/d/abc/edit';
        if (a.name === 'WEBHOOK_URL') a.value = 'https://example.app.n8n.cloud/webhook/zaloplan';
      }
      return { ...n, parameters: p };
    }
    return n;
  });
  fs.writeFileSync(path.join(outDir, f), JSON.stringify(wf, null, 2));
}
console.log('test copies written');
