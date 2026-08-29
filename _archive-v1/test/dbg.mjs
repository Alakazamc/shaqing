import { loadEngine } from './harness.mjs';
const E = ['src/engine/errors.js','src/engine/condition.js','src/engine/state.js',
  'src/engine/props.js','src/engine/scoring.js',
  'src/engine/format.js','src/engine/registry.js',
  'src/engine/seal.js','src/engine/rng.js','src/engine/run.js'];
const BH = await loadEngine(E);
BH.props.registerBuiltins();
await import(new URL('../content/manifest.js', import.meta.url).href);
for (const f of BH.MANIFEST) await import(new URL('../' + f, import.meta.url).href);
BH.seal();

let { state } = BH.run.create({ seed:'DEMO01', family:'fam_shancun', sex:'sex_nv',
  persona0:'per_ningba', talents:['tal_fanshehui'] });
state.phase = 'YEAR';
let pc = null;
for (let i = 0; i < 60; i++) {
  if (state.phase === 'SEASON_END') { state = BH.run.commitSeason(state).state; continue; }
  if (state.phase === 'REVIVE') { state = BH.run.commitRevive(state).state; continue; }
  if (state.phase === 'ENDING') { console.log(i, 'ENDING'); break; }
  const before = state.phase === 'SCENE' ? JSON.stringify(state.scene && {i:state.scene.i, n:state.scene.beats.length}) : '-';
  const r = BH.run.advance(state, pc);
  state = r.state;
  const after = state.phase === 'SCENE' ? JSON.stringify(state.scene && {i:state.scene.i, n:state.scene.beats.length}) : '-';
  console.log(i, 'age=' + state.age, 'ph=' + r.result.phase, 'scnBefore=' + before, 'scnAfter=' + after, 'opts=' + r.result.options.length);
  pc = r.result.options.length ? 0 : null;
}
console.log('done');
process.exit(0);
