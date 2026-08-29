/* 验证时间循环真的能跑：年龄锁住、选项消耗、破环收益递增
 * 正典：docs/modules/20-anomaly.md §3
 */
import { loadEngine } from './harness.mjs';
const E = ['src/engine/errors.js', 'src/engine/condition.js', 'src/engine/state.js',
  'src/engine/props.js', 'src/engine/scoring.js', 'src/engine/format.js',
  'src/engine/registry.js', 'src/engine/seal.js', 'src/engine/rng.js',
  'src/engine/run.js'];
const BH = await loadEngine(E);
BH.props.registerBuiltins();
await import(new URL('../content/manifest.js', import.meta.url).href);
for (const f of BH.MANIFEST) await import(new URL('../' + f, import.meta.url).href);
BH.seal();

// 手工构造：直接进入循环
let { state } = BH.run.create({
  seed: 'LOOP1', family: 'fam_gongfang', sex: 'sex_nv',
  persona0: 'per_ningba', talents: ['tal_jixinghao'],
});
state.phase = 'YEAR';
state.age = 34;
state.SPR = 3;                 // 消沉带，满足入口
BH.run.loop.enter(state, 'e_qy_loop');

console.log('进入循环：age=' + state.age + ' LOOP=' + JSON.stringify(state.LOOP));
console.log('\n逐轮（每轮选第一个非出口选项，最后一轮选出口）：');

let guard = 0;
while (state.LOOP && guard++ < 10) {
  const shown = BH.run.advance(state, null).result;
  const opts = shown.options;
  const outIdx = opts.findIndex((o) => o.text.includes('电话回了'));
  // 前 3 轮故意不破环，第 4 轮走出口
  const pick = guard <= 3 ? 0 : outIdx;
  const before = state.age;
  const wlogBefore = state.WLOG.length;
  const r = BH.run.advance(state, pick);
  state = r.state;
  console.log('  轮' + guard + '  选「' + opts[pick].text + '」' +
    '  可选数=' + opts.length +
    '  age ' + before + '→' + state.age +
    '  收视=' + (r.result.score ? r.result.score.total : '-') +
    '  WLOG ' + wlogBefore + '→' + state.WLOG.length +
    (r.result.loop && r.result.loop.broke ? '  ← 破环' : ''));
}

console.log('\n破环后：LOOP=' + state.LOOP + ' LOOPED=' + state.LOOPED +
  ' 人设=' + state.CAST.map((c) => c.id).join(',') +
  ' 旗标含回电话=' + (state.FLAG.indexOf('f_huidianhua') >= 0));
console.log('破环收益表：轮数 1→' + BH.run.loop.breakDrama(1) +
  '  3→' + BH.run.loop.breakDrama(3) + '  6→' + BH.run.loop.breakDrama(6));
process.exit(0);
