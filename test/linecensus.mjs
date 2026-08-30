// 39 条线全量普查：每条线的触发率与完成深度
import { loadBH } from './loader.mjs';
const BH = loadBH();
const N = Number(process.argv[2] || 400);
function rc(a){return a[Math.floor(Math.random()*a.length)];}
const lines = {};
for (const e of BH.EVENTS) {
  const m = e.id.match(/^([a-z]+)(\d+)$/);
  if (!m) continue;
  const pre = m[1];
  lines[pre] = lines[pre] || { ids: [] };
  lines[pre].ids.push({ id: e.id, n: +m[2], age: e.a });
}
let anyDeep = 0, nofire = [];
for (let i = 0; i < N; i++) {
  const S = BH.newRun('census-' + i);
  const pool = BH.draftPool(S);
  BH.pickTalents(S, [pool[0].id, pool[1].id, pool[2].id]);
  const d = { CHR: 0, INT: 0, STR: 0, MNY: 0, JOY: 0 };
  let left = 20; const ks = Object.keys(d).sort(() => Math.random() - 0.5);
  for (const k of ks) { const p = Math.min(7, Math.floor(Math.random() * (left + 1))); d[k] = p; left -= p; if (!left) break; }
  BH.applyPoints(S, d); S.sex = Math.random() < 0.5 ? 'm' : 'f';
  let g = 0, deep = 0;
  while (S.phase === 'life' && g++ < 8000) {
    const r = BH.tick(S);
    if (!r) break;
    if (r.ask) {
      if (r.ask.kind === 'boss') { const c = r.ask.age === 18 ? 55 : null; BH.choose(S, 'boss', BH.bossBand(S, r.ask.age, BH.bossScore(S, r.ask.age, c)), { age: r.ask.age }); }
      else if (r.ask.kind === 'golden') BH.choose(S, 'golden', Math.random() < 0.7 ? 'join' : 'pass', r.ask);
      else BH.choose(S, r.ask.kind, rc(r.ask.opts).id, r.ask);
    }
    if (S.phase === 'end') break;
  }
  for (const pre in lines) {
    const seen = lines[pre].ids.filter(x => S.seen[x.id]).length;
    lines[pre].fired = (lines[pre].fired || 0) + (seen > 0 ? 1 : 0);
    if (seen >= 3) deep++;
  }
  if (deep === 0) nofire.push(i);
}
console.log(`===== ${N} 局 · ${Object.keys(lines).length} 条线普查 =====`);
const rows = [];
for (const pre in lines) {
  const L = lines[pre];
  const total = L.ids.length;
  const firePct = (L.fired / N * 100).toFixed(0);
  rows.push({ pre, firePct: +firePct, total });
}
rows.sort((a, b) => a.firePct - b.firePct);
for (const r of rows) console.log(`${r.pre.padEnd(6)} 触发${String(r.firePct).padStart(3)}%  (${r.total}拍)`);
console.log(`\n平均每局走完≥3拍的线: ${(rows.reduce((a,b)=>a+b.firePct,0)/100).toFixed(1)} 条触发 | 零剧本局占比: ${(nofire.length/N*100).toFixed(0)}%`);
