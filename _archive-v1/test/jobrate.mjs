/* 验证入职保底：职业是连贯性的载体，不该靠运气（17-jobs.md §0） */
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

function run(strategy, N) {
  let everJob = 0;
  let promoted = 0;
  const jobCount = {};
  let sumYears = 0;

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
      if (!o.length) { pc = null; continue; }
      if (strategy === 'greedy') {
        // 同分时随机打破平局，否则单一路线会垄断统计
        let best = -Infinity;
        o.forEach((x) => { if (x.drama > best) best = x.drama; });
        const ties = [];
        o.forEach((x, i) => { if (x.drama === best) ties.push(i); });
        pc = ties[rng.int(0, ties.length - 1)];
      } else pc = rng.int(0, o.length - 1);
    }
    if (state.JOBLOG.length) everJob++;
    if (state.JOBLOG.length >= 2) promoted++;
    sumYears += state.JOBYEARS || 0;
    state.JOBLOG.forEach((j) => { jobCount[j] = (jobCount[j] || 0) + 1; });
  }

  console.log('\n策略 ' + strategy + '（' + N + ' 局）');
  console.log('  一生中有过职业   ' + (everJob / N * 100).toFixed(1) + '%');
  console.log('  换过/晋升过职业  ' + (promoted / N * 100).toFixed(1) + '%');
  console.log('  终局现职年数均值 ' + (sumYears / N).toFixed(1));
  console.log('  各职业出现率：');
  R.list('jobs').forEach((j) => {
    const c = jobCount[j.id] || 0;
    console.log('    ' + j.emoji + ' ' + j.name.padEnd(6) +
      ' t' + j.tier + '  ' + (c / N * 100).toFixed(1) + '%' +
      (c === 0 ? '   ← 从未出现' : ''));
  });
}

run('random', 200);
run('greedy', 200);
process.exit(0);
