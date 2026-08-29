/* 诊断：脉冲构成。压缩幅度已经加大但脉冲仍 57–60，要看钱花在哪 */
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
const acc = { present: 0, resolve: 0, flavorOnly: 0, scene: 0, loop: 0, total: 0 };
const N = 120;

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

    const inLoop = !!state.LOOP;
    const wasScene = state.phase === 'SCENE';
    const r = BH.run.advance(state, pc);
    state = r.state;
    acc.total++;
    if (inLoop) acc.loop++;
    else if (wasScene || r.result.phase === 'SCENE') acc.scene++;
    else if (r.result.options.length) acc.present++;
    else if (r.result.resolved) acc.resolve++;
    else acc.flavorOnly++;

    const o = r.result.options;
    if (o.length) { let b = 0; o.forEach((x, i) => { if (x.drama > o[b].drama) b = i; }); pc = b; }
    else pc = null;
  }
}

console.log('脉冲构成（贪心 ' + N + ' 局平均）');
const per = (v) => (v / N).toFixed(1);
console.log('  呈现选项      ' + per(acc.present));
console.log('  结算选择      ' + per(acc.resolve));
console.log('  仅 flavor     ' + per(acc.flavorOnly));
console.log('  场景节拍      ' + per(acc.scene));
console.log('  循环轮        ' + per(acc.loop));
console.log('  合计          ' + per(acc.total));
console.log('\n决策类脉冲占比 ' +
  ((acc.present + acc.resolve) / acc.total * 100).toFixed(1) + '%');
process.exit(0);
