// 剧本线触发率统计：随机 N 局，看各条剧本的入口/分岔/结局到达率
import { loadBH } from './loader.mjs';
const BH = loadBH();
const N = Number(process.argv[2] || 500);
const ARCS = {
  '高考全本': ['gk0', 'gk3', 'gk3b', 'gk3c', 'gk3c2', 'gk5'],
  '初恋全本': ['lo0', 'lo2', 'lo5', 'lo7', 'lo8', 'lo10'],
  '发小': ['fr0', 'fr3', 'fr4', 'fr5', 'fr6', 'fr7'],
  '父母': ['pa0', 'pa1', 'pa2', 'pa3', 'pa4', 'pa5'],
  '职场': ['wk0', 'wk1', 'wk5', 'wk6', 'wk8', 'wk9'],
  '走红': ['vl0', 'vl1', 'vl2', 'vl3', 'vl4'],
  '婚姻': ['mg0', 'mg1', 'mg2', 'mg3'],
  '病榻': ['bc0', 'bc1', 'bc2', 'sn0', 'sn1'],
};
function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
const hit = {}; for (const k in ARCS) hit[k] = {};
let branchesPerRun = 0, arcDeepRuns = 0;
for (let run = 0; run < N; run++) {
  const S = BH.newRun('arc-' + run);
  const pool = BH.draftPool(S);
  BH.pickTalents(S, [pool[0].id, pool[1].id, pool[2].id]);
  const dims = { CHR: 0, INT: 0, STR: 0, MNY: 0, JOY: 0 };
  let left = 20; const keys = Object.keys(dims).sort(() => Math.random() - 0.5);
  for (const k of keys) { const p = Math.min(7, Math.floor(Math.random() * (left + 1))); dims[k] = p; left -= p; if (!left) break; }
  BH.applyPoints(S, dims); S.sex = Math.random() < 0.5 ? 'm' : 'f';
  let guard = 0, br = 0;
  while (S.phase === 'life' && guard++ < 3000) {
    const r = BH.tick(S);
    if (!r) break;
    if (r.ask) { br++;
      if (r.ask.kind === 'boss') {
        const clicks = r.ask.age === 18 ? 30 + Math.floor(Math.random() * 50) : null;
        const band = BH.bossBand(S, r.ask.age, BH.bossScore(S, r.ask.age, clicks));
        BH.choose(S, 'boss', band, { age: r.ask.age });
      } else if (r.ask.kind === 'golden') BH.choose(S, 'golden', Math.random() < 0.7 ? 'join' : 'pass', r.ask);
      else BH.choose(S, r.ask.kind, randomChoice(r.ask.opts).id, r.ask);
    }
    if (S.phase === 'end') break;
  }
  branchesPerRun += br;
  let deep = 0;
  for (const name in ARCS) {
    for (const id of ARCS[name]) {
      if (S.seen[id]) { hit[name][id] = (hit[name][id] || 0) + 1; if (['gk5','lo10','fr5','pa3','wk8','vl3','mg2','sn2'].includes(id)) deep++; }
    }
  }
  if (deep >= 1) arcDeepRuns++;
}
console.log(`===== ${N} 局剧本统计 =====`);
for (const name in ARCS) {
  const row = ARCS[name].map(id => `${id}:${((hit[name][id] || 0) / N * 100).toFixed(0)}%`).join(' ');
  console.log(`${name}: ${row}`);
}
console.log(`平均决策/局: ${(branchesPerRun / N).toFixed(1)} | 至少走完一条剧本深处(结局/回声)的局: ${(arcDeepRuns / N * 100).toFixed(0)}%`);
