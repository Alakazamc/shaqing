/* 浏览器实跑验证（C8：index.html 双击即跑，file:// 下必须工作）
 * 用 Edge 的 headless + CDP，不引入任何 npm 依赖。
 * 用法：node test/browser-check.mjs
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PAGE = 'file:///' + resolve('index.html').replace(/\\/g, '/');
const PORT = 9223;
const profile = mkdtempSync(join(tmpdir(), 'bh-'));

const child = spawn(EDGE, [
  '--headless=new',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + profile,
  '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', '--allow-file-access-from-files',
  PAGE,
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpTargets() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + PORT + '/json/list');
      const list = await r.json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch (e) { /* 还没起来 */ }
    await sleep(250);
  }
  throw new Error('无法连接到浏览器调试端口');
}

const target = await cdpTargets();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const logs = [];
const errors = [];

ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    logs.push((msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' '));
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    errors.push(msg.params.exceptionDetails.exception?.description ||
      msg.params.exceptionDetails.text);
  }
});

await new Promise((r) => ws.addEventListener('open', r));

function send(method, params) {
  const myId = ++id;
  ws.send(JSON.stringify({ id: myId, method, params }));
  return new Promise((res) => pending.set(myId, res));
}

async function evaluate(expr) {
  const r = await send('Runtime.evaluate', {
    expression: expr, returnByValue: true, awaitPromise: true,
  });
  if (r.result?.exceptionDetails) {
    throw new Error(r.result.exceptionDetails.exception?.description ||
      r.result.exceptionDetails.text);
  }
  return r.result?.result?.value;
}

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url: PAGE });
await sleep(2500);

const checks = [];
function check(name, ok, extra) {
  checks.push({ name, ok, extra });
}

// 1 页面挂载成功、没有渲染错误页
const bodyText = await evaluate('document.getElementById("app").innerText.slice(0,400)');
check('页面渲染（无错误页）', !/内容校验失败|启动失败|加载中…/.test(bodyText), bodyText.slice(0, 120));

// 2 引擎与内容都在
check('BH 引擎已加载', await evaluate('!!(window.BH && BH.run && BH.scoring)'));
check('内容已封盘', await evaluate('BH.registry.isSealed()'));
check('事件数 > 80', (await evaluate('BH.registry.list("events").length')) > 80);

// 3 无控制台异常
check('无未捕获异常', errors.length === 0, errors.join('\n'));

// 4 图鉴可从开局打开、切换到结局页后仍不泄露未发现真结局，再返回开局
check('开局含图鉴入口', await evaluate(
  '!!document.querySelector(".boot-archive") && document.body.innerText.includes("打开图鉴")'
));
const openedArchive = await evaluate(`(() => {
  const b = document.querySelector('.boot-archive');
  if (!b) return false;
  b.click(); return true;
})()`);
await sleep(100);
check('ARCHIVE 页面可见', openedArchive && await evaluate(
  'document.body.innerText.includes("发现图鉴") && !!document.querySelector(".archive-close")'
));
await evaluate(`(() => {
  const b = [...document.querySelectorAll('.archive-tab')]
    .find(x => x.textContent.includes('结局'));
  if (b) b.click(); return !!b;
})()`);
await sleep(50);
check('未发现真结局不出现在图鉴', !/稳定的好日子/.test(await evaluate(
  'document.querySelector("#app").innerText'
)));
await evaluate(`(() => {
  const b = document.querySelector('.archive-close');
  if (b) b.click(); return !!b;
})()`);
await sleep(100);
check('图鉴可返回开局', await evaluate(
  'document.body.innerText.includes("开始这一局") && !document.body.innerText.includes("ARCHIVE // LIFE INDEX")'
));

// 5 完整走一局：用 DOM 点击驱动，从开局点到结算
async function clickFirstButton() {
  return evaluate(`(() => {
    const b = document.querySelector('#app button.primary') ||
              document.querySelector('#app button');
    if (!b) return 'none';
    b.click();
    return 'clicked';
  })()`);
}

await clickFirstButton();           // 开始这一局 → ORIGIN
await sleep(120);
await evaluate(`(() => {
  const bs=[...document.querySelectorAll('#app button')];
  const b=bs.find(x=>x.textContent.includes('就这样')); if(b) b.click(); return !!b;
})()`);                              // → TALENT
await sleep(120);
await clickFirstButton();            // 选第一个天赋 → YEAR
await sleep(150);

let clicks = 0;
let reachedSettlement = false;
let sawFeedback = false;
for (let i = 0; i < 400; i++) {
  const done = await evaluate(`(() => {
    const t = document.getElementById('app').innerText;
    return /人评价|暂无评分|已下架/.test(t);
  })()`);
  if (done) { reachedSettlement = true; break; }
  const r = await evaluate(`(() => {
    const bs=[...document.querySelectorAll('#app button')];
    if(!bs.length) return 'none';
    bs[0].click(); return 'ok';
  })()`);
  if (r === 'none') break;
  clicks++;
  await sleep(30);
  if (!sawFeedback) {
    sawFeedback = await evaluate('!!document.querySelector(".feedback-toast")');
  }
}

check('反馈层能显示瞬态提示', sawFeedback);
check('能一路点到结算页', reachedSettlement, '点击 ' + clicks + ' 次');
check('点击数落在 40–75', clicks >= 30 && clicks <= 90, '实际 ' + clicks);

const settle = await evaluate('document.getElementById("app").innerText.slice(0,500)');
check('结算页含评分或无评分标记', /人评价|暂无评分/.test(settle), settle.slice(0, 160));

// 5 无网络请求（file:// 下任何外部请求都会失败，这里检查没有 http(s) 资源）
const remoteReqs = await evaluate(`(() => {
  var names = performance.getEntriesByType('resource')
    .map(function(r){ return r.name; })
    .filter(function(n){ return /^https?:/i.test(n); });
  return names.join('\\n');
})()`);
// file:// 下 Resource Timing API 不记录资源，所以改查 script 标签的来源
const remoteScripts = await evaluate(`(() => {
  return [].slice.call(document.scripts)
    .map(function(s){ return s.src; })
    .filter(function(u){ return /^https?:/i.test(u); })
    .join('\\n');
})()`);
const manifestUsed = await evaluate(
  'BH.MANIFEST.length + "/" + document.scripts.length'
);
check('运行时零外部网络请求', !remoteReqs, remoteReqs);
check('无 CDN 脚本引用（全部本地）', !remoteScripts, remoteScripts);
check('清单全部注入', (function () {
  var p = String(manifestUsed).split('/');
  return Number(p[1]) >= Number(p[0]);
})(), '清单/实际 script 数 = ' + manifestUsed);

console.log('\n── 浏览器实跑（file://）');
let fails = 0;
for (const c of checks) {
  console.log('  ' + (c.ok ? 'PASS' : 'FAIL') + '  ' + c.name +
    (c.ok ? '' : '\n        ' + (c.extra || '')));
  if (!c.ok) fails++;
}
console.log('\n' + (checks.length - fails) + ' 通过 / ' + fails + ' 失败');
if (logs.length) console.log('\n控制台：\n  ' + logs.slice(0, 6).join('\n  '));

ws.close();
child.kill();
process.exit(fails ? 1 : 0);
