/* 跑一局完整流程，人工看输出。用法：node test/playone.mjs [seed] [策略]
 * 策略：greedy（选桥段最高）| restraint（一直收手）| random
 */
import { loadEngine } from './harness.mjs';

const ENGINE = [
  'src/engine/errors.js', 'src/engine/condition.js', 'src/engine/state.js',
  'src/engine/props.js', 'src/engine/scoring.js',
  'src/engine/format.js', 'src/engine/registry.js',
  'src/engine/seal.js', 'src/engine/rng.js', 'src/engine/run.js',
];
const BH = await loadEngine(ENGINE);
BH.props.registerBuiltins();
await import(new URL('../content/manifest.js', import.meta.url).href);
for (const f of BH.MANIFEST) await import(new URL('../' + f, import.meta.url).href);
BH.seal();

const seed = process.argv[2] || 'DEMO01';
const strategy = process.argv[3] || 'greedy';

let { state } = BH.run.create({
  seed, family: 'fam_shancun', sex: 'sex_nv',
  persona0: 'per_ningba', talents: ['tal_fanshehui'],
});
state.phase = 'YEAR';

const rng = new BH.Rng(seed + 'PLAY');
function choose(opts, st) {
  // trueend：先加码把戏瘾拉到 13 以上（证明真的红过、真的疯过），
  // 之后在每个高价点收手。这是 C7 要求的唯一路径。
  if (strategy === 'trueend') {
    const wantRestraint = st.HOOKP >= 13;
    const i = opts.findIndex((o) => (wantRestraint ? o.restraint : o.escalate));
    if (i >= 0) return i;
  }
  if (strategy === 'restraint') {
    const i = opts.findIndex((o) => o.restraint);
    if (i >= 0) return i;
  }
  if (strategy === 'random') return rng.int(0, opts.length - 1);
  let best = 0;
  opts.forEach((o, i) => { if (o.drama > opts[best].drama) best = i; });
  return best;
}

let guard = 0;
let pendingChoice = null;
let pendingReward = null;
while (guard++ < 400) {
  if (state.phase === 'SEASON_END') {
    const r = BH.run.commitSeason(state);
    state = r.state;
    const v = r.result.seasonEnd;
    console.log(`\n=== S${v.season} ${v.name} 结算  收视 ${Math.round(v.sum)}` +
      (v.threshold ? ` / 线 ${Math.round(v.threshold)}` : ' / 无线') + `  → ${v.verdict}`);
    if (r.result.text) console.log('    ' + r.result.text);
    pendingReward = r.result.reward || null;
    continue;
  }
  if (state.phase === 'REWARD') {
    const opts = (pendingReward && pendingReward.options) || [];
    console.log(`  ── 季末三选一（${pendingReward ? pendingReward.tier : '?'}` +
      `，超额 ${pendingReward ? pendingReward.over.toFixed(1) : '?'}×）`);
    opts.forEach((o, i) => console.log(`      [${i}] ${o.label}  (${o.rarity})`));
    const pick = 0;
    const rr = BH.run.applyReward(state, pendingReward || { options: [] }, pick);
    state = rr.state;
    if (rr.result.text) console.log('      → ' + rr.result.text);
    pendingReward = null;
    continue;
  }
  if (state.phase === 'REVIVE') { state = BH.run.commitRevive(state).state; continue; }
  if (state.phase === 'ENDING') {
    const r = BH.run.commitEnding(state);
    state = r.state;
    const f = r.result.final;
    console.log('\n──────── 结算 ────────');
    if (f.deathText) console.log('死法：' + f.deathText);
    console.log('结局：' + f.endingText);
    console.log(`总收视 ${Math.round(f.total)}  = Σ${Math.round(f.seasonTotal)}` +
      ` × 振幅${f.amp.toFixed(2)} × 贯彻${f.com.toFixed(2)} × 反讽${f.iro.toFixed(2)}`);
    console.log('评分：' + (f.rating === null ? '—（无评分）' : f.rating));
    console.log('真结局：' + (f.trueEnding ? '是' : '否'));
    console.log('人设：' + state.CAST.map((c) => c.id + '·' + c.lv).join(' '));
    console.log('污点：' + (state.SCAR.join(' ') || '无'));
    console.log('高价收手：' + state.restraintLog.filter((r) => r.highValue).length +
      ' 次   HOOKP=' + state.HOOKP + '  HOOK=' + state.HOOK);
    break;
  }

  const { state: ns, result } = BH.run.advance(state, pendingChoice);
  state = ns;
  pendingChoice = null;

  result.skippedYears.forEach((t) => console.log('  ' + t));
  if (result.text && !result.resolved) {
    const tag = result.phase === 'SCENE' ? `[场景 ${result.sceneBeat.i}/${result.sceneBeat.of}]` : '';
    console.log(`${state.age} 岁 ${tag} ${result.text}`);
  }
  if (result.score) {
    console.log(`    收视 ${result.score.total}  (B=${result.score.B}` +
      ` M=${result.score.M.toFixed(2)} A=${result.score.aud.toFixed(2)}` +
      ` F=${result.score.fatigue.toFixed(2)})`);
  }
  if (result.options.length) {
    result.options.forEach((o, i) => {
      console.log(`      [${i}] ${o.text}  +${o.drama}` +
        (o.restraint ? `   放弃 ${o.givenUp}` : ''));
    });
    pendingChoice = choose(result.options, state);
    console.log(`      → 选 [${pendingChoice}]`);
  }
}
console.log('\n脉冲数约 ' + guard);
