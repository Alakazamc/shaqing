/* 审计：精神指数五档的实际可达性（21-spirit.md §1）
 * 双向设计要求两端都走得通，否则退化成单向。
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

const R = BH.registry;
const NAMES = ['崩溃', '消沉', '常态', '敏锐', '超载'];

function run(strategy, n) {
  const everBand = [0, 0, 0, 0, 0];
  const endBand = [0, 0, 0, 0, 0];
  for (let k = 0; k < n; k++) {
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
    const seen = new Set();
    let pc = null, pr = null, g = 0;
    while (g++ < 400) {
      seen.add(BH.state.spiritBand(state.SPR));
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
      if (!o.length) { pc = null; continue; }
      if (strategy === 'greedy') {
        let b = 0; o.forEach((x, i) => { if (x.drama > o[b].drama) b = i; }); pc = b;
      } else if (strategy === 'restraint') {
        const i = o.findIndex((x) => x.restraint); pc = i >= 0 ? i : 0;
      } else pc = rng.int(0, o.length - 1);
    }
    seen.forEach((b) => everBand[b]++);
    endBand[BH.state.spiritBand(state.SPR)]++;
  }
  console.log('\n策略 ' + strategy + '（' + n + ' 局）');
  console.log('  曾进入过该档的局数占比：');
  NAMES.forEach((nm, i) =>
    console.log('    ' + nm + '  ' + (everBand[i] / n * 100).toFixed(1) + '%'));
  console.log('  终局停留档位：');
  NAMES.forEach((nm, i) =>
    console.log('    ' + nm + '  ' + (endBand[i] / n * 100).toFixed(1) + '%'));
}

run('random', 150);
run('greedy', 150);
run('restraint', 150);
process.exit(0);
