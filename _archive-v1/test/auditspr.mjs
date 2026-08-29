/* 审计：收手选项是否都给了养心（21-spirit.md §5.2 / §6 检查 6） */
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
const bad = [];
let restraintTotal = 0;
const sprGainBySeason = {};

for (const e of R.list('events')) {
  for (const o of (e.options || [])) {
    const spr = o.effect && o.effect.SPR;
    if (o.restraint) {
      restraintTotal++;
      if (!(spr > 0)) bad.push(e.id + ' → 「' + o.text + '」');
    }
    if (spr > 0) {
      const s = e.season || '?';
      sprGainBySeason[s] = (sprGainBySeason[s] || 0) + 1;
    }
  }
}

console.log('收手选项总数 ' + restraintTotal + '，其中缺养心 ' + bad.length);
bad.forEach((b) => console.log('  MISS ' + b));
console.log('\n各季养心途径数量（检查 6 要求每季 ≥2）：');
for (const s of ['1', '2', '3', '4', '5', '?']) {
  if (sprGainBySeason[s] != null) {
    console.log('  S' + s + '  ' + sprGainBySeason[s] +
      (sprGainBySeason[s] >= 2 ? '  ok' : '  不足'));
  }
}
process.exit(0);
