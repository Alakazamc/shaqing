/* 批量跑局与调参报告
 * 正典：docs/SYSTEM.md §8、docs/modules/09-vertical-slice.md §5 §5.1
 * 用法：node test/tune.mjs --runs 1000 --strategy random
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

const args = process.argv.slice(2);
const get = (k, d) => {
  const i = args.indexOf('--' + k);
  return i >= 0 ? args[i + 1] : d;
};
const RUNS = Number(get('runs', 300));
const STRATEGY = get('strategy', 'random');
const PACE_SECONDS = Number(get('pace', 2.5));
const BASE_SEED = String(get('seed', 'TUNE00'));

const R = BH.registry;
const FAMILIES = R.origins().family.map((f) => f.id);
const SEXES = R.origins().sex.map((f) => f.id);
const PERSONAS = R.origins().personality.map((f) => f.id);
const TALENTS = R.list('talents').map((t) => t.id);
const STAT_KEYS = ['CHR', 'INT', 'STR', 'MNY', 'SPR'];
const LINE_BY_EVENT = Object.create(null);
const LINE_TRACK = Object.create(null);
for (const line of R.list('eventlines')) {
  LINE_TRACK[line.id] = line.track || 'unknown';
  (line.chain || []).forEach((id) => { LINE_BY_EVENT[id] = line.id; });
  (line.forks || []).forEach((fork) => {
    (fork.chain || []).forEach((id) => { LINE_BY_EVENT[id] = line.id; });
  });
  Object.values(line.scenes || {}).forEach((scene) => {
    (scene.beats || []).forEach((id) => { LINE_BY_EVENT[id] = line.id; });
  });
}

function effectStatKeys(effect) {
  return STAT_KEYS.filter((key) => effect && Object.prototype.hasOwnProperty.call(effect, key));
}

function selectedEffectKeys(state, choiceIndex) {
  if (choiceIndex == null) return [];
  let event = null;
  if (state.pending) event = R.get('events', state.pending.eventId);
  else if (state.phase === 'SCENE' && state.scene) {
    event = R.get('events', state.scene.beats[state.scene.i]);
  } else if (state.LOOP) {
    event = R.get('events', state.LOOP.eventId);
  }
  if (!event) return [];
  const options = BH.run._visibleOptions(state, event);
  const option = options[choiceIndex] || options[0];
  return effectStatKeys(option && option.effect);
}

function emptyMap(keys) {
  return keys.reduce((out, key) => { out[key] = 0; return out; }, {});
}

function playOne(seed) {
  const rng = new BH.Rng(seed);
  const family = rng.pick(FAMILIES);
  const sex = rng.pick(SEXES);
  const persona0 = rng.pick(PERSONAS);
  const talents = [rng.pick(TALENTS)];

  let { state } = BH.run.create({ seed, family, sex, persona0, talents });
  state.phase = 'YEAR';
  const prng = new BH.Rng(seed + 'S');

  let pulses = 0;
  let pc = null;
  let cancelled = 0;
  let guard = 0;
  let pendingReward = null;
  const cancelledSeasons = [];
  const attrScores = emptyMap(STAT_KEYS);
  const attrPulses = emptyMap(STAT_KEYS);
  const lineScores = emptyMap(Object.keys(LINE_TRACK));
  const linePulses = emptyMap(Object.keys(LINE_TRACK));
  let normalScore = 0;
  let normalPulses = 0;

  while (guard++ < 500) {
    if (state.phase === 'SEASON_END') {
      const r = BH.run.commitSeason(state);
      state = r.state;
      if (r.result.seasonEnd && r.result.seasonEnd.verdict === 'cancel') {
        cancelled++;
        cancelledSeasons.push(r.result.seasonEnd.season);
      }
      pendingReward = r.result.reward || null;
      continue;
    }
    // 季末三选一（19-tension.md §1.2）。不处理这个相位会让季号永不推进
    if (state.phase === 'REWARD') {
      const pick = pendingReward && pendingReward.options.length
        ? prng.int(0, pendingReward.options.length - 1) : 0;
      state = BH.run.applyReward(state, pendingReward || { options: [] }, pick).state;
      pendingReward = null;
      continue;
    }
    if (state.phase === 'REVIVE') { state = BH.run.commitRevive(state).state; continue; }
    if (state.phase === 'ENDING') break;

    // UI 会在决策年直接展示路线卡，不额外调用一次 advance(null)。
    // 调参驱动保持同一点击预算；advance(null) 仍保留给旧契约测试。
    if (pc == null && state.phase === 'YEAR' && BH.run.canPlan(state)) {
      const route = BH.run.planOffers(state);
      if (route.length) {
        if (STRATEGY === 'greedy') {
          let bestPlan = -Infinity;
          route.forEach((p) => { if (p.drama > bestPlan) bestPlan = p.drama; });
          const ties = route.map((p, i) => p.drama === bestPlan ? i : -1)
            .filter((i) => i >= 0);
          pc = { type: 'plan', index: ties[prng.int(0, ties.length - 1)] };
        } else {
          pc = { type: 'plan', index: prng.int(0, route.length - 1) };
        }
      }
    }

    const beforeState = state;
    const beforeEventCount = beforeState.EVT.length;
    const activeLineId = beforeState.phase === 'SCENE' && beforeState.scene
      ? beforeState.scene.lineId : null;
    const selectedKeys = selectedEffectKeys(beforeState, pc);
    const r = BH.run.advance(beforeState, pc);
    state = r.state;
    const pulseScore = (r.result.score && r.result.score.total || 0) +
      (r.result.extraFlavor || []).reduce((sum, item) =>
        sum + (item.score && item.score.total || 0), 0);
    const newEventIds = state.EVT.slice(beforeEventCount);
    const lineIds = new Set();
    if (activeLineId) lineIds.add(activeLineId);
    newEventIds.forEach((id) => {
      if (LINE_BY_EVENT[id]) lineIds.add(LINE_BY_EVENT[id]);
    });
    if (pulseScore > 0) {
      if (lineIds.size) {
        lineIds.forEach((lineId) => {
          lineScores[lineId] += pulseScore / lineIds.size;
          linePulses[lineId]++;
        });
      } else {
        normalScore += pulseScore;
        normalPulses++;
      }
      selectedKeys.forEach((key) => {
        attrScores[key] += pulseScore;
        attrPulses[key]++;
      });
    }
    pulses++;
    pc = null;
    if (r.result.options.length) {
      const opts = r.result.options;
      if (STRATEGY === 'greedy') {
        // 同分时按 seed 随机选一个，否则永远取第一个命中的，
        // 导致单一路线垄断统计（实测「主播」一度占 86%）
        let best = -Infinity;
        opts.forEach((o) => { if (o.drama > best) best = o.drama; });
        const ties = [];
        opts.forEach((o, i) => { if (o.drama === best) ties.push(i); });
        pc = ties[prng.int(0, ties.length - 1)];
      } else if (STRATEGY === 'trueend') {
        const want = state.HOOKP >= 13 ? 'restraint' : 'escalate';
        const i = opts.findIndex((o) => o[want]);
        pc = i >= 0 ? i : prng.int(0, opts.length - 1);
      } else {
        pc = prng.int(0, opts.length - 1);
      }
    }
  }

  const fin = BH.run.commitEnding(state);
  const f = fin.result.final;
  return {
    sex, rating: f.rating, total: f.total, amp: f.amp, com: f.com, iro: f.iro,
    trueEnding: f.trueEnding, pulses, cancelled, cancelledSeasons,
    age: fin.state.age, scars: fin.state.SCAR.length, cast: fin.state.CAST.length,
    decisions: fin.state.decisions.total,
    scenes: fin.state.sceneCount || 0,
    seasonSums: fin.state.seasonSums.slice(),
    durationSeconds: pulses * PACE_SECONDS,
    attrScores, attrPulses, lineScores, linePulses,
    normalScore, normalPulses,
  };
}

const results = [];
for (let i = 0; i < RUNS; i++) {
  results.push(playOne(BASE_SEED + i));
}

const nums = (arr) => arr.slice().sort((a, b) => a - b);
const median = (arr) => {
  const a = nums(arr);
  return a.length ? a[Math.floor(a.length / 2)] : 0;
};
const pct = (arr, p) => {
  const a = nums(arr);
  return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0;
};
const mean = (arr) => (arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : 0);

const scored = results.filter((r) => r.rating !== null);
const ratings = scored.map((r) => r.rating);

console.log('策略 ' + STRATEGY + '   局数 ' + RUNS + '   seed ' + BASE_SEED);
console.log('评分   中位数 ' + median(ratings).toFixed(1) +
  '   p10 ' + pct(ratings, 0.1).toFixed(1) +
  '   p90 ' + pct(ratings, 0.9).toFixed(1) +
  '   最高 ' + Math.max(...ratings).toFixed(1));
console.log('总收视 中位数 ' + Math.round(median(results.map((r) => r.total))));
console.log('季收视中位数 ' + [1, 2, 3, 4, 5].map((season) =>
  'S' + season + ':' + Math.round(median(results.map((r) => r.seasonSums[season - 1] || 0)))
).join(' '));
console.log('脉冲   中位数 ' + median(results.map((r) => r.pulses)) +
  '   p10 ' + pct(results.map((r) => r.pulses), 0.1) +
  '   p90 ' + pct(results.map((r) => r.pulses), 0.9));
console.log('三乘数 振幅 ' + mean(results.map((r) => r.amp)).toFixed(2) +
  '   贯彻 ' + mean(results.map((r) => r.com)).toFixed(2) +
  '   反讽 ' + mean(results.map((r) => r.iro)).toFixed(2));
console.log('腰斩率 ' + (results.filter((r) => r.cancelled > 0).length / RUNS * 100).toFixed(1) + '%');
const cancelSeasonCounts = {};
results.forEach((r) => r.cancelledSeasons.forEach((season) => {
  cancelSeasonCounts[season] = (cancelSeasonCounts[season] || 0) + 1;
}));
console.log('腰斩季分布 ' + (Object.keys(cancelSeasonCounts).sort().map((k) =>
  'S' + k + ':' + cancelSeasonCounts[k]).join(' ') || '无'));
console.log('真结局率 ' + (results.filter((r) => r.trueEnding).length / RUNS * 100).toFixed(1) + '%');
console.log('死亡年龄 中位数 ' + median(results.map((r) => r.age)));

// 性别净期望（09-vertical-slice.md §5.1）
console.log('\n── 性别分组评分中位数');
const bySex = {};
scored.forEach((r) => { (bySex[r.sex] = bySex[r.sex] || []).push(r.rating); });
const meds = [];
Object.keys(bySex).sort().forEach((k) => {
  const m = median(bySex[k]);
  meds.push(m);
  console.log('  ' + k + '  n=' + bySex[k].length + '  中位数 ' + m.toFixed(1));
});
const spread = Math.max(...meds) - Math.min(...meds);
console.log('  组间极差 ' + spread.toFixed(2) + (spread <= 0.3 ? '  ✓ ≤0.3' : '  ✗ 超标'));

// T-contribution：按“该次选择的 effect 触及某属性”归因，
// 输出该属性关联脉冲的平均收视（不是声称公式只由该属性产生）。
console.log('\n── T-contribution（每局平均；effect 触及属性的脉冲收视）');
console.log('  性别       n   ' + STAT_KEYS.map((k) => k.padStart(9)).join(''));
Object.keys(bySex).sort().forEach((sex) => {
  const rows = results.filter((r) => r.sex === sex);
  console.log('  ' + sex.padEnd(8) + String(rows.length).padStart(4) + ' ' +
    STAT_KEYS.map((k) => mean(rows.map((r) => r.attrScores[k])).toFixed(1).padStart(9)).join(''));
});

// T-eventline：按事件线脉冲的平均收视与普通（非事件线）脉冲作基线。
console.log('\n── T-eventline（事件线命中局；每次关联脉冲平均收视）');
const normalPulseMean = mean(results
  .filter((r) => r.normalPulses > 0)
  .map((r) => r.normalScore / r.normalPulses));
console.log('  普通非事件线脉冲基线 ' + normalPulseMean.toFixed(1));
Object.keys(LINE_TRACK).sort().forEach((lineId) => {
  const hits = results.filter((r) => r.linePulses[lineId] > 0);
  const pulseValues = hits.flatMap((r) =>
    r.linePulses[lineId] ? [r.lineScores[lineId] / r.linePulses[lineId]] : []);
  const runValues = hits.map((r) => r.lineScores[lineId]);
  console.log('  ' + lineId + ' [' + LINE_TRACK[lineId] + '] 命中 ' + hits.length +
    ' 局，单局均值 ' + (runValues.length ? mean(runValues).toFixed(1) : '0.0') +
    '，单脉冲均值 ' + (pulseValues.length ? mean(pulseValues).toFixed(1) : '0.0'));
});

// T-duration/T-pulse：Node 没有真实人工点击时钟，使用固定 2.5 秒/脉冲的
// 可复现预算估算；浏览器人工计时仍是 M2/M6，不能被这个代理值冒充。
console.log('\n── T-duration（估算，' + PACE_SECONDS.toFixed(1) + ' 秒/脉冲）');
console.log('  中位数 ' + median(results.map((r) => r.durationSeconds)).toFixed(1) +
  ' 秒，p10 ' + pct(results.map((r) => r.durationSeconds), 0.1).toFixed(1) +
  '，p90 ' + pct(results.map((r) => r.durationSeconds), 0.9).toFixed(1) +
  (median(results.map((r) => r.durationSeconds)) <= 170 ? '  ✓ ≤170' : '  ✗ 超标'));
console.log('\n── T-pulse');
console.log('  总脉冲中位数 ' + median(results.map((r) => r.pulses)) +
  '，决策中位数 ' + median(results.map((r) => r.decisions)) +
  '，场景中位数 ' + median(results.map((r) => r.scenes)) +
  '（场景数目标 3–4）');
