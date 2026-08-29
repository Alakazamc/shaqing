/* badhand — 断言总入口
 * 用法：node test/run-tests.mjs
 * 断言编号对应 docs/modules/09-vertical-slice.md §4
 * 100 以上为该文档之外补充的健壮性断言
 */
import { loadEngine, report } from './harness.mjs';
import { loadFullContent, loadSave } from './full-content.mjs';
import { runConditionTests } from './suites/condition.test.mjs';
import { runScoringTests } from './suites/scoring.test.mjs';
import { runStateTests } from './suites/state.test.mjs';
import { runRuntimeTests } from './suites/runtime.test.mjs';
import { runContentTests } from './suites/content.test.mjs';
import { runSceneTests } from './suites/scene.test.mjs';
import { runContractTests } from './suites/contracts.test.mjs';
import { runNarrativeTests } from './suites/narrative.test.mjs';

const BH = await loadEngine([
  'src/engine/errors.js',
  'src/engine/condition.js',
  'src/engine/state.js',
  'src/engine/props.js',
  'src/engine/scoring.js',
  'src/engine/format.js',
  'src/engine/registry.js',
  'src/engine/seal.js',
  'src/engine/rng.js',
  'src/engine/run.js',
]);

runConditionTests(BH);
runStateTests(BH);
runScoringTests(BH);

await loadFullContent(BH);
globalThis.location = { search: '' };
globalThis.document = {};
await import(new URL('../src/ui/app.js?test=app', import.meta.url).href);
const save = await loadSave(BH);
await import(new URL('../src/ui/gacha.js?test=gacha', import.meta.url).href);
runRuntimeTests(BH);
runContentTests(BH);
runSceneTests(BH);
runContractTests(BH, save);
runNarrativeTests(BH, save);

const allPassed = report();
process.exit(allPassed ? 0 : 1);
