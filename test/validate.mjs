// 内容校验：schema / 唯一性 / 红线词 / 年龄覆盖
import { loadBH } from './loader.mjs';
const BH = loadBH(undefined, false);
let errs = [], warns = [];

// ===== 红线词（真实人物 / 平台品牌 / 危险方法）=====
const REDLIST = ['自杀', '上吊', '跳楼', '安眠药', '百草枯', '敌敌畏', '轻生', '割腕', '剂量',
  '丁真', '吴亦凡', '郑爽', '李云迪', '蔡徐坤', '汪汪队', '迪士尼', '原神', '明日方舟',
  '拼多多', '阿里巴巴', '腾讯', '网易', '米哈游', '抖音', '快手', '微博', '淘宝', '京东', '美团', 'B站', '哔哩哔哩'];
const allTexts = [];
BH.EVENTS.forEach(e => allTexts.push(['event:' + e.id, e.t, ...(e.br || []).map(b => b.t)]));
BH.DEATHS.forEach(d => allTexts.push(['death:' + d.death.cause, d.t]));
BH.CRISES.forEach(c => allTexts.push(['crisis:' + c.id, c.t, ...c.opts.map(o => o.t + ' ' + (o.rt || ''))]));
BH.DECADES.forEach(d => allTexts.push(['decade:' + d.age, d.t, ...d.opts.map(o => o.name + o.desc + o.rt)]));
BH.TRAITS.forEach(t => allTexts.push(['trait:' + t.id, t.name + t.d]));
BH.TALENTS.forEach(t => allTexts.push(['talent:' + t.id, t.name + t.desc]));
BH.FILLERS && Object.values(BH.FILLERS).forEach(arr => arr.forEach((t, i) => allTexts.push(['filler:' + i, t])));
BH.DANMAKU && Object.entries(BH.DANMAKU).forEach(([k, arr]) => arr.forEach(t => allTexts.push(['danmaku:' + k, t])));
BH.DIRECTOR.forEach(d => allTexts.push(['director:' + d.n, d.t]));
BH.FAKEFILMS.forEach((t, i) => allTexts.push(['fakefilm:' + i, t]));

for (const [where, ...texts] of allTexts) {
  for (const tx of texts) {
    if (!tx) continue;
    for (const w of REDLIST) if (tx.includes(w)) errs.push(`红线词「${w}」出现在 ${where}: ${tx.slice(0, 30)}`);
  }
}

// ===== 事件 schema =====
const ids = new Set();
for (const e of BH.EVENTS) {
  if (!e.id || ids.has(e.id)) errs.push('事件 id 缺失或重复: ' + e.id);
  ids.add(e.id);
  if (!e.a || e.a.length !== 2 || e.a[0] > e.a[1]) errs.push(`事件 ${e.id} 年龄区间非法`);
  if (!e.t || e.t.length < 4) errs.push(`事件 ${e.id} 文本过短`);
  if (![0, 1, 2, 3].includes(e.g)) errs.push(`事件 ${e.id} grade 非法: ${e.g}`);
  if (e.br && (e.br.length < 2 || e.br.some(b => !b.t))) errs.push(`事件 ${e.id} 分支不完整`);
  for (const k of Object.keys(e.e || {})) if (!['CHR', 'INT', 'STR', 'MNY', 'JOY', 'AGE', 'LIF'].includes(k)) errs.push(`事件 ${e.id} 非法效果键 ${k}`);
  if (e.tr && !BH.TRACKS.some(t => t.id === (e.tr.id || e.tr))) errs.push(`事件 ${e.id} 引用未知轨道`);
}
// 轨道事件引用的存在性（inc.f/inc.tg 无强制注册表，只查轨道）
for (const t of BH.TRACKS) {
  if (!t.entryText || !t.joinOpt) errs.push(`轨道 ${t.id} 入口不完整`);
  const depths = (t.events || []).map(e => e.tr.d);
  if (!depths.includes(5) && !depths.includes(6)) warns.push(`轨道 ${t.id} 缺少深度 5-6 事件`);
  for (const e of t.events) {
    if (ids.has(e.id)) errs.push(`轨道事件 id 冲突: ${e.id}`);
    ids.add(e.id);
  }
}
// ===== 死法 =====
const causes = new Set();
for (const d of BH.DEATHS) {
  if (!d.death || !d.death.cause || !d.death.icon) errs.push('死法字段不完整: ' + d.t.slice(0, 20));
  if (causes.has(d.death.cause)) errs.push('死法 cause 重复: ' + d.death.cause);
  causes.add(d.death.cause);
}
// ===== 大劫/危机/路牌/特质 =====
for (const B of BH.BOSSES) {
  if (!B.opts || !B.opts.length) errs.push(`大劫 ${B.id} 无选项`);
  const mins = B.opts.map(o => o.min ?? -999);
  for (let i = 1; i < mins.length; i++) if (mins[i] >= mins[i - 1]) errs.push(`大劫 ${B.id} 阈值非降序`);
}
for (const c of BH.CRISES) {
  if (!c.opts.some(o => o.rt)) warns.push(`危机 ${c.id} 缺 rt 文本`);
  if (!['debt', 'emo', 'health', 'opp'].includes(c.domain)) errs.push(`危机 ${c.id} 域非法`);
  if (c.domain === 'emo' && !c.opts.some(o => o.clear === 'emo' || (o.f === 'someone_there'))) errs.push(`emo 危机 ${c.id} 缺出口选项（红线）`);
}
for (const d of BH.DECADES) for (const o of d.opts) if (!o.name || !o.desc || !o.rt) errs.push(`路牌 ${d.age} 选项不完整`);
const tids = new Set();
for (const t of BH.TRAITS) { if (tids.has(t.id)) errs.push('特质重复: ' + t.id); tids.add(t.id); }

// ===== 年龄覆盖密度 =====
const cov = new Array(101).fill(0);
for (const e of BH.EVENTS) for (let a = e.a[0]; a <= Math.min(e.a[1], 100); a++) cov[a]++;
for (let a = 0; a <= 90; a++) if (cov[a] < 3) warns.push(`年龄 ${a} 岁可用事件少于 3 条（现 ${cov[a]}）`);

// ===== 汇总 =====
console.log(`事件总数: ${BH.EVENTS.length}（含轨道 ${(BH.TRACKS || []).reduce((n, t) => n + (t.events || []).length, 0)}）`);
console.log(`天赋 ${BH.TALENTS.length} | 死法 ${BH.DEATHS.length} | 危机 ${BH.CRISES.length} | 路牌 ${BH.DECADES.length} | 特质 ${BH.TRAITS.length} | 大劫 ${BH.BOSSES.length}`);
console.log(`\n错误 ${errs.length} 条:`); errs.slice(0, 30).forEach(e => console.log('  ✗ ' + e));
console.log(`警告 ${warns.length} 条:`); warns.slice(0, 20).forEach(w => console.log('  ⚠ ' + w));
process.exit(errs.length ? 1 : 0);
