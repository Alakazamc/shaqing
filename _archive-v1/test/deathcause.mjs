/* 诊断：贪心策略到底死于什么 */
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
const causes = { str: 0, lifespan: 0, doubleCancel: 0 };
const ages = [];
const N = 200;

for (let k = 0; k < N; k++) {
  const seed = BH.Rng.makeSeed(6) + k;
  const rng = new BH.Rng(seed);
  let { state } = BH.run.create({
    seed,
    family: rng.pick(R.origins().family).id,
    sex: rng.pick(R.origins().sex).id,
    persona0: rng.pick(R.origins().personality).id,
    talents: [rng.pick(R.list('talents')).id],
  });
  state.phase = 'YEAR';
  let pc = null, pr = null, g = 0;
  while (g++ < 400) {
    if (state.phase === 'SEASON_END') {
      const r = BH.run.commitSeason(state); state = r.state; pr = r.result.reward || null; continue;
    }
    if (state.phase === 'REWARD') {
      state = BH.run.applyReward(state, pr || { options: [] }, 0).state; pr = null; continue;
    }
    if (state.phase === 'REVIVE') { state = BH.run.commitRevive(state).state; continue; }
    if (state.phase === 'ENDING') break;
    const r = BH.run.advance(state, pc);
    state = r.state;
    const o = r.result.options;
    if (o.length) { let b = 0; o.forEach((x, i) => { if (x.drama > o[b].drama) b = i; }); pc = b; }
    else pc = null;
  }
  ages.push(state.age);
  if (state.forcedEnding) causes.doubleCancel++;
  else if (state.STR <= 0) causes.str++;
  else causes.lifespan++;
}
ages.sort((a, b) => a - b);
console.log('死因分布（贪心 ' + N + ' 局）');
console.log('  STR 归零      ' + (causes.str / N * 100).toFixed(1) + '%');
console.log('  寿命到期      ' + (causes.lifespan / N * 100).toFixed(1) + '%');
console.log('  两次腰斩完结  ' + (causes.doubleCancel / N * 100).toFixed(1) + '%');
console.log('死亡年龄 p10=' + ages[20] + ' 中位=' + ages[100] + ' p90=' + ages[180]);
process.exit(0);
