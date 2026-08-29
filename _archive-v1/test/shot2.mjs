/* 截图：滚动日志 + 续订线进度条 + 季末三选一 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PAGE = 'file:///' + resolve('index.html').replace(/\\/g, '/');
const PORT = 9227;
const profile = mkdtempSync(join(tmpdir(), 'bh-s2-'));
mkdirSync('test/shots', { recursive: true });

const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + profile, '--no-first-run', '--disable-gpu',
  '--allow-file-access-from-files', '--window-size=430,932', PAGE], { stdio: 'ignore' });
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
let id = 0; const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
await new Promise((r) => ws.addEventListener('open', r));
const send = (method, params) => {
  const myId = ++id; ws.send(JSON.stringify({ id: myId, method, params }));
  return new Promise((res) => pending.set(myId, res));
};
const ev = async (expr) => (await send('Runtime.evaluate',
  { expression: expr, returnByValue: true })).result?.result?.value;

await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',
  { width: 430, height: 932, deviceScaleFactor: 2, mobile: true });
await sleep(1800);

async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('test/shots/' + name + '.png', Buffer.from(r.result.data, 'base64'));
  console.log('  ' + name);
}
const clickText = (t) => ev(`(() => { const b=[...document.querySelectorAll('#app button')]
  .find(x=>x.textContent.includes(${JSON.stringify(t)})); if(b){b.click();return 1;} return 0; })()`);
const clickFirst = () => ev(`(() => { const b=document.querySelector('#app .actionbox button')
  || document.querySelector('#app button'); if(b){b.click();return 1;} return 0; })()`);

await clickFirst(); await sleep(150);
await clickText('就这样'); await sleep(150);
await clickFirst(); await sleep(250);

// 点到日志攒起来
for (let i = 0; i < 22; i++) { await clickFirst(); await sleep(45); }
await shot('A-log');

// 点到出现季末三选一
let gotReward = false;
for (let i = 0; i < 200; i++) {
  const isReward = await ev(`/奖励档位/.test(document.getElementById('app').innerText)`);
  if (isReward) { gotReward = true; break; }
  const done = await ev(`/人评价|暂无评分/.test(document.getElementById('app').innerText)`);
  if (done) break;
  await clickFirst(); await sleep(35);
}
if (gotReward) await shot('B-reward');
else console.log('  （本局未触发三选一）');

ws.close(); child.kill(); process.exit(0);
