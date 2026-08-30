// 无头模拟：随机玩 N 局，输出 A1-A8 验收指标
import { loadBH } from './loader.mjs';

const BH = loadBH();
const N = Number(process.argv[2] || 300);

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

let totalAge = 0, totalScore = 0, totalBox = 0, maxScore = 0, maxBox = 0;
let decisions = [], durations = [], deaths = {}, trackEntries = {}, trackDepth = {};
let legendaries = 0, rarePerRun = 0, compressPerRun = 0, lineCounts = [];
let fails = 0;
let undefLines = 0;
const chNames = ['序幕0-12', '一幕13-18', '二幕19-35', '三幕36-60', '终幕61+'];
const chLines = [0, 0, 0, 0, 0];
function chIdx(a) { return a <= 12 ? 0 : a <= 18 ? 1 : a <= 35 ? 2 : a <= 60 ? 3 : 4; }

for (let run = 0; run < N; run++) {
  try {
    const S = BH.newRun('sim-' + run);
    const pool = BH.draftPool(S);
    BH.pickTalents(S, [pool[0].id, pool[1].id, pool[2].id]);
    const dims = { CHR: 0, INT: 0, STR: 0, MNY: 0, JOY: 0 };
    let left = 20;
    const keys = Object.keys(dims).sort(() => Math.random() - 0.5);
    for (const k of keys) { const p = Math.min(7, Math.floor(Math.random() * (left + 1))); dims[k] = p; left -= p; if (!left) break; }
    BH.applyPoints(S, dims);
    S.sex = Math.random() < 0.5 ? 'm' : 'f';

    let dec = 0, guard = 0;
    while (S.phase === 'life' && guard++ < 3000) {
      const r = BH.tick(S);
      if (!r) break;
      if (r.ask) {
        dec++;
        const a = r.ask;
        if (a.kind === 'boss') {
          const clicks = a.age === 18 ? 30 + Math.floor(Math.random() * 50) : null;
          const score = BH.bossScore(S, a.age, clicks);
          const band = BH.bossBand(S, a.age, score);
          BH.choose(S, 'boss', band, { age: a.age });
        } else if (a.kind === 'golden') {
          BH.choose(S, 'golden', Math.random() < 0.7 ? 'join' : 'pass', a);
        } else {
          BH.choose(S, a.kind, randomChoice(a.opts).id, a);
        }
      }
      if (S.phase === 'end') break;
    }
    if (S.phase !== 'end') { fails++; console.error(`第${run}局未结束！age=${S.age} lif=${S.lif}`); continue; }
    const rep = BH.settle(S);
    totalAge += S.age; totalScore += rep.score; totalBox += rep.box;
    maxScore = Math.max(maxScore, rep.score); maxBox = Math.max(maxBox, rep.box);
    decisions.push(dec); lineCounts.push(S.lines.length);
    for (const l of S.lines) if ((l.text || '').includes('undefined')) undefLines++;
    rarePerRun += S.stats.rare + S.stats.epic; legendaries += S.stats.legend; compressPerRun += S.lines.filter(l => l.compress).length;
    for (const l of S.lines) chLines[chIdx(l.age)]++;
    deaths[S.deathCause.cause] = (deaths[S.deathCause.cause] || 0) + 1;
    for (const k in S.tracks) { trackEntries[k] = (trackEntries[k] || 0) + 1; trackDepth[k] = Math.max(trackDepth[k] || 0, S.tracks[k]); }
  } catch (e) {
    fails++; console.error(`第${run}局崩溃：`, e.message, e.stack.split('\n')[1]);
  }
}

console.log(`\n===== 模拟 ${N} 局（失败 ${fails}）=====`);
console.log(`平均寿命: ${(totalAge / N).toFixed(1)} 岁`);
console.log(`平均评分: ${(totalScore / N).toFixed(2)} | 最高 ${maxScore}`);
console.log(`平均票房: ${(totalBox / N).toFixed(1)} 亿 | 最高 ${maxBox} 亿`);
console.log(`平均决策数: ${(decisions.reduce((a, b) => a + b, 0) / N).toFixed(1)}`);
console.log(`平均展示行数: ${(lineCounts.reduce((a, b) => a + b, 0) / N).toFixed(0)}`);
console.log(`平均稀有+史诗/局: ${(rarePerRun / N).toFixed(1)} | 传说/局: ${(legendaries / N).toFixed(2)} | 压缩/局: ${(compressPerRun / N).toFixed(1)}`);
console.log(`轨道进入率:`, Object.fromEntries(Object.entries(trackEntries).map(([k, v]) => [k, (v / N * 100).toFixed(1) + '%'])));
console.log(`轨道最深:`, trackDepth);
const top = Object.entries(deaths).sort((a, b) => b[1] - a[1]).slice(0, 6);
console.log(`死法 TOP6:`, top.map(([k, v]) => `${k}×${v}`).join(' | '));
console.log('五幕行数/局:', chNames.map((n, i) => n + ':' + (chLines[i] / N).toFixed(1)).join(' | '));
console.log(`undefined文本行: ${undefLines}（必须为0）`);
console.log(`死法图鉴覆盖率: ${Object.keys(deaths).length}/${BH.DEATHS.length}`);
