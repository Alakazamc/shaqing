/* 仅跑内容一致性检查
 * 正典：docs/modules/14-content-api.md §7.1
 * 新写一批事件后几秒内就能知道有没有引用错 id、有没有踩禁用词。
 */
import { loadEngine } from './harness.mjs';

const ENGINE = [
  'src/engine/errors.js',
  'src/engine/condition.js',
  'src/engine/state.js',
  'src/engine/props.js',
  'src/engine/scoring.js',
  'src/engine/format.js',
  'src/engine/registry.js',
  'src/engine/seal.js',
];

const BH = await loadEngine(ENGINE);
BH.props.registerBuiltins();

// 读同一份清单（浏览器与 node 共用）
await import(new URL('../content/manifest.js', import.meta.url).href);
for (const f of BH.MANIFEST) {
  await import(new URL('../' + f, import.meta.url).href);
}

try {
  BH.seal();
  const R = BH.registry;
  const counts = {
    events: R.list('events').length,
    decision: R.list('events').filter((e) => e.kind === 'decision').length,
    flavor: R.list('events').filter((e) => e.kind === 'flavor').length,
    death: R.list('events').filter((e) => e.kind === 'death').length,
    beat: R.list('events').filter((e) => e.kind === 'beat').length,
    cast: R.list('cast').length,
    scars: R.list('scars').length,
    talents: R.list('talents').length,
    tracks: R.list('tracks').length,
    npcs: R.list('npcs').length,
    eventlines: R.list('eventlines').length,
    endings: R.list('endings').length,
    gacha: R.list('gacha').length,
  };
  console.log('内容校验通过。');
  console.log(JSON.stringify(counts, null, 2));
  process.exit(0);
} catch (e) {
  console.log('内容校验失败：');
  console.log(e.message);
  process.exit(1);
}
