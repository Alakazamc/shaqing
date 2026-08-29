/* 独立进程 fixture：registry 的顺序、重复注册、封盘和 condProp。 */
import { existsSync } from 'node:fs';

const ENGINE = [
  'src/engine/errors.js', 'src/engine/condition.js', 'src/engine/state.js',
  'src/engine/props.js', 'src/engine/scoring.js', 'src/engine/format.js',
  'src/engine/registry.js', 'src/engine/seal.js', 'src/engine/rng.js',
  'src/engine/run.js',
];
for (const file of ENGINE) await import(new URL('../../' + file, import.meta.url).href);
const BH = globalThis.BH;
const mode = process.argv[2];

if (mode === 'condprop') {
  BH.condition.defineProp('ZZ_TEST', (s) => s.zz, 'scalar');
  const ast = BH.condition.parse('ZZ_TEST=7');
  if (!ast || !BH.condition.check({ zz: 7 }, 'ZZ_TEST=7')) process.exit(2);
  let message = '';
  try { BH.condition.defineProp('ZZ_TEST', (s) => s.zz, 'scalar'); }
  catch (e) { message = e.message; }
  if (!message.includes('重复注册')) process.exit(3);
  console.log(JSON.stringify({ ok: true }));
  process.exit(0);
}

async function loadContent(reverse) {
  BH.props.registerBuiltins();
  await import(new URL('../../content/manifest.js', import.meta.url).href);
  const files = reverse ? BH.MANIFEST.slice().reverse() : BH.MANIFEST.slice();
  for (const file of files) {
    if (!existsSync(new URL('../../' + file, import.meta.url))) process.exit(4);
    await import(new URL('../../' + file, import.meta.url).href);
  }
  BH.seal();
}

if (mode === 'order' || mode === 'reverse' || mode === 'freeze') {
  await loadContent(mode === 'reverse');
  if (mode === 'freeze') {
    let message = '';
    try { BH.define.cast([{ id: 'after_seal', name: 'x' }], 'contract-after'); }
    catch (e) { message = e.message; }
    if (!message.includes('封盘')) process.exit(5);
    console.log(JSON.stringify({ frozen: true, message }));
    process.exit(0);
  }
  const R = BH.registry;
  console.log(JSON.stringify({
    events: R.list('events').map((x) => x.id),
    tracks: R.list('tracks').map((x) => x.id),
    gacha: R.list('gacha').map((x) => x.id),
  }));
  process.exit(0);
}

if (mode === 'duplicate') {
  let message = '';
  BH.define.cast([{ id: 'dup_contract', name: 'one' }], 'contract-first');
  try { BH.define.cast([{ id: 'dup_contract', name: 'two' }], 'contract-second'); }
  catch (e) { message = e.message; }
  if (!message.includes('先前来源') || !message.includes('本次来源')) process.exit(6);
  console.log(JSON.stringify({ message }));
  process.exit(0);
}

process.exit(7);
