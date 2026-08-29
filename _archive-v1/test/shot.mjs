/* 截图：手机竖屏下的实际卖相
 * 用法：node test/shot.mjs
 * 产出 test/shots/*.png（人工验收用，不进断言）
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PAGE = 'file:///' + resolve('index.html').replace(/\\/g, '/');
const PORT = 9225;
const profile = mkdtempSync(join(tmpdir(), 'bh-shot-'));
mkdirSync('test/shots', { recursive: true });

const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + profile, '--no-first-run', '--disable-gpu',
  '--allow-file-access-from-files', '--window-size=430,932', PAGE],
  { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target = null;
for (let i = 0; i < 40 && !target; i++) {
  try {
    const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
    target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  } catch (e) {}
  if (!target) await sleep(250);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
await new Promise((r) => ws.addEventListener('open', r));
const send = (method, params) => {
  const myId = ++id;
  ws.send(JSON.stringify({ id: myId, method, params }));
  return new Promise((res) => pending.set(myId, res));
};
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  return r.result?.result?.value;
};

await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',
  { width: 430, height: 932, deviceScaleFactor: 2, mobile: true });
await sleep(1800);

async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync('test/shots/' + name + '.png', Buffer.from(r.result.data, 'base64'));
  console.log('  test/shots/' + name + '.png');
}
const clickText = (t) => ev(`(() => { const b=[...document.querySelectorAll('#app button')]
  .find(x=>x.textContent.includes(${JSON.stringify(t)})); if(b){b.click();return 1;} return 0; })()`);
const clickFirst = () => ev(`(() => { const b=document.querySelector('#app button');
  if(b){b.click();return 1;} return 0; })()`);

await shot('1-boot');
await clickFirst(); await sleep(150);
await shot('2-origin');
await clickText('就这样'); await sleep(150);
await shot('3-talent');
await clickFirst(); await sleep(200);
await shot('4-year');

// 点到出现选项为止
for (let i = 0; i < 30; i++) {
  const hasOpts = await ev(`document.querySelectorAll('#app .options button').length>1`);
  if (hasOpts) break;
  await clickFirst(); await sleep(60);
}
await shot('5-decision');

// 点到结算
for (let i = 0; i < 400; i++) {
  const done = await ev(`/人评价|暂无评分|已下架/.test(document.getElementById('app').innerText)`);
  if (done) break;
  await clickFirst(); await sleep(25);
}
await shot('6-settlement');
await clickText('继续'); await sleep(300);
await shot('7-gacha');

ws.close(); child.kill();
process.exit(0);
