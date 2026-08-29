/* 诊断：分水岭事件为什么不触发 */
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

const R = BH.registry;
console.log('分水岭事件是否注册：');
for (const id of ['e_ws_kao_pass', 'e_ws_kao_near', 'e_ws_kao_fail']) {
  console.log('  ' + id + ' → ' + (R.has('events', id) ? 'yes' : 'NO'));
}

let { state } = BH.run.create({
  seed: 'LB01', family: 'fam_xiancheng', sex: 'sex_nv',
  persona0: 'per_ningba', talents: ['tal_jixinghao'],
});
state.phase = 'YEAR';
state.age = 18;
console.log('\n18 岁时的状态：INT=' + state.INT + ' FLAG=' + JSON.stringify(state.FLAG));

for (const id of ['e_ws_kao_pass', 'e_ws_kao_near', 'e_ws_kao_fail']) {
  const e = R.get('events', id);
  let inc = null, exc = null;
  try { inc = BH.condition.check(state, e.include); } catch (err) { inc = 'ERR ' + err.message; }
  try { exc = e.exclude ? BH.condition.check(state, e.exclude) : false; } catch (err) { exc = 'ERR ' + err.message; }
  console.log('  ' + id + '  include=' + inc + '  exclude=' + exc +
    '  season=' + e.season + '  seasonOf(18)=' + BH.run.seasonOf(18).n);
}

const ws = BH.run._pickWatershed(state);
console.log('\npickWatershed → ' + (ws ? ws.id : 'null'));
process.exit(0);
