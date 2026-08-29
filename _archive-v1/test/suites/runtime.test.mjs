/* A15–A24、A34–A35、A43：季末、真结局、确定性与分叉计分 */
import { group, test, eq, ok } from '../harness.mjs';

function makeRun(BH, seed = 'RUNTIME1') {
  const made = BH.run.create({ seed, family: 'fam_shancun', sex: 'sex_nv',
    persona0: 'per_ningba', talents: ['tal_jixinghao'] });
  made.state.phase = 'YEAR';
  return made.state;
}

function seasonState(BH, sum, season, cancelCount = 0) {
  const s = makeRun(BH, 'SEASON' + season + '-' + cancelCount + '-' + sum);
  s.phase = 'SEASON_END';
  s.season = season;
  s.age = season === 1 ? 12 : 18;
  s.seasonSum = sum;
  s.cancelCount = cancelCount;
  s.AUD = 40;
  return s;
}

function trueState(BH) {
  const s = makeRun(BH, 'TRUE-END');
  s.HOOKP = 12;
  s.HOOK = 3;
  s.restraintLog = [
    { season: 2, highValue: true, givenUp: 10, potential: 20 },
    { season: 3, highValue: true, givenUp: 20, potential: 30 },
    { season: 4, highValue: true, givenUp: 40, potential: 60 },
  ];
  return s;
}

function endingState(BH, trueEnding = false) {
  const s = trueEnding ? trueState(BH) : makeRun(BH, 'ENDING');
  s.phase = 'ENDING';
  s.age = 80;
  s.lifespan = 70;
  s.seasonSum = 0;
  s.seasonSums = [1000];
  s.WLOG = [10, 40, 12, 35];
  s.audlog = [3, 20, 6, 30];
  s.tropelog = ['fanche', 'baofu', 'fanche', 'baofu'];
  s.setupTags = ['网络'];
  s.peak = { total: 100, trope: 'fanche', age: 40 };
  s.TRACK = { dushu: 3 };
  s.decisions = { total: 4, byTrack: { dushu: 3 } };
  s.TAG = ['网络'];
  return s;
}

export function runRuntimeTests(BH) {
  const Run = BH.run;
  const St = BH.state;

  group('4.3 季末、真结局与确定性');

  test(15, 'S ≥ 2T 加更，S ≥ T 续订，S < T 腰斩', () => {
    const extend = Run.commitSeason(seasonState(BH, 180, 2));
    eq(extend.result.seasonEnd.verdict, 'extend');
    eq(extend.state.phase, 'REWARD');

    const renew = Run.commitSeason(seasonState(BH, 90, 2));
    eq(renew.result.seasonEnd.verdict, 'renew');
    eq(renew.state.phase, 'REWARD');

    const cancel = Run.commitSeason(seasonState(BH, 20, 2));
    eq(cancel.result.seasonEnd.verdict, 'cancel');
    eq(cancel.state.phase, 'REVIVE');
  });

  test(16, '腰斩获得注水、AUD 砍半、阈值按腰斩次数递增', () => {
    const r = Run.commitSeason(seasonState(BH, 20, 2));
    ok(r.state.SCAR.includes('scar_zhushui'), '应获得注水污点');
    eq(r.state.AUD, 20, 'AUD 应砍半');
    eq(r.result.seasonEnd.threshold, 90, '首次腰斩前阈值');
    const next = seasonState(BH, 20, 2, 1);
    const r2 = Run.commitSeason(next);
    eq(r2.result.seasonEnd.threshold, 135, '第二次判定阈值 ×1.5');
  });

  test(17, '第二次腰斩挂烂尾并继续进入注水续命，不截断完整故事', () => {
    const r = Run.commitSeason(seasonState(BH, 20, 2, 1));
    eq(r.state.cancelCount, 2);
    eq(r.state.lanwei, true);
    eq(r.state.phase, 'REVIVE');
    ok(r.state.SCAR.includes('scar_zhushui'), '第二次腰斩仍保留污点');
    const revived = Run.commitRevive(r.state);
    eq(revived.state.phase, 'YEAR');
  });

  test(18, 'S1 没有续订线，永不腰斩', () => {
    const r = Run.commitSeason(seasonState(BH, 0, 1));
    eq(r.result.seasonEnd.verdict, 'renew');
    eq(r.result.seasonEnd.threshold, null);
    eq(r.state.cancelCount, 0);
    eq(r.state.phase, 'YEAR');
  });

  test(19, 'HOOKP、终局 HOOK、高价收手和 S4+ 收手全部满足才触发真结局', () => {
    ok(Run.checkTrueEnding(trueState(BH)), '四条件应同时满足');
    const s = trueState(BH);
    s.HOOKP = 11;
    ok(!Run.checkTrueEnding(s), 'HOOKP 不足不能触发');
  });

  test(20, '一路选安稳（HOOKP < 12）不触发', () => {
    const s = trueState(BH);
    s.HOOKP = 0;
    s.HOOK = 0;
    ok(!Run.checkTrueEnding(s));
  });

  test(21, '只有低价收手不触发', () => {
    const s = trueState(BH);
    s.restraintLog.forEach((r) => { r.highValue = false; });
    ok(!Run.checkTrueEnding(s));
  });

  test(22, '高价收手全部在 S3 及更早不触发', () => {
    const s = trueState(BH);
    s.restraintLog[s.restraintLog.length - 1].season = 3;
    ok(!Run.checkTrueEnding(s));
  });

  test(23, '真结局 rating 为 null 且污点数量不变', () => {
    const s = endingState(BH, true);
    s.SCAR = ['scar_zhushui', 'scar_qianzhai'];
    const before = s.SCAR.length;
    const r = Run.commitEnding(s);
    eq(r.state.final.rating, null);
    eq(r.state.final.trueEnding, true);
    eq(r.state.SCAR.length, before);
  });

  test(24, 'cast/talent 效果字段不直接引用 HOOK', () => {
    const R = BH.registry;
    const containsHook = (v) => {
      if (!v || typeof v !== 'object') return false;
      if (Array.isArray(v)) return v.some(containsHook);
      return Object.keys(v).some((k) => k === 'HOOK' || containsHook(v[k]));
    };
    R.list('cast').concat(R.list('talents')).forEach((item) => {
      ok(!containsHook(item), item.id + ' 不得引用 HOOK');
    });
  });

  function trace(BH, seed, limit = 12) {
    let state = makeRun(BH, seed);
    let choice = null;
    const out = [];
    for (let i = 0; i < limit; i++) {
      if (state.phase === 'SEASON_END') {
        const r = Run.commitSeason(state);
        state = r.state;
        out.push({ phase: r.result.phase, verdict: r.result.seasonEnd.verdict });
        if (state.phase === 'REWARD') {
          state = Run.applyReward(state, r.result.reward, 0).state;
        } else if (state.phase === 'REVIVE') {
          state = Run.commitRevive(state).state;
        }
        choice = null;
        continue;
      }
      if (state.phase === 'ENDING') {
        state = Run.commitEnding(state).state;
        out.push(state.final);
        break;
      }
      const r = Run.advance(state, choice);
      state = r.state;
      out.push({ state, result: r.result });
      choice = r.result.options.length ? 0 : null;
    }
    return JSON.stringify(out);
  }

  test(34, '同 seed + 同选择序列逐年结果完全一致', () => {
    eq(trace(BH, 'DETERMINISTIC'), trace(BH, 'DETERMINISTIC'));
  });

  test(35, '同 seed + 不同选择会分化人生结果', () => {
    let first = makeRun(BH, 'BRANCHING');
    let found = null;
    for (let i = 0; i < 40; i++) {
      const r = Run.advance(first, null);
      first = r.state;
      if (r.result.options.length >= 2) {
        found = { state: first, result: r.result };
        break;
      }
    }
    ok(found, '测试 seed 应能遇到至少一个决策点');
    const left = Run.advance(found.state, 0).state;
    const right = Run.advance(found.state, found.result.options.length - 1).state;
    ok(JSON.stringify(left) !== JSON.stringify(right), '不同选项不能得到同一状态');
  });

  test(43, '等长分叉与主链只要深度/决策相同，Com 不因 fork 标记降低', () => {
    const main = endingState(BH, false);
    const fork = endingState(BH, false);
    main.ELINE = { el_xiuxian: { stage: 3, forkId: null, forkStage: 0, done: true } };
    fork.ELINE = { el_xiuxian: { stage: 3, forkId: 0, forkStage: 2, done: true } };
    const a = Run.commitEnding(main).state.final.com;
    const b = Run.commitEnding(fork).state.final.com;
    eq(a, b, 'Com 只读实际轨道深度与决策，不读取 fork 作为惩罚');
  });

  test(82, '同 seed + 同 meta 会复制权限快照，基础状态不共享解锁数组', () => {
    const unlocked = { track: ['xiuxian'], npc: ['npc_qishou'], talent: ['tal_jixinghao'] };
    const a = Run.create({ seed: 'META-REPLAY', meta: { unlocked } }).state;
    const b = Run.create({ seed: 'META-REPLAY', meta: { unlocked } }).state;
    eq(JSON.stringify(a.META), JSON.stringify(b.META));
    ok(a.META !== b.META && a.META.unlocked !== b.META.unlocked);
    unlocked.track.push('mofa');
    eq(a.META.unlocked.track.length, 1, '运行状态不能引用外部存档数组');
    eq(JSON.stringify(a.PLANLOG), '[]');
  });

  test(83, '未解锁 archive plan 不可进入，解锁后只扩大路线可能性', () => {
    const locked = Run.create({ seed: 'ARCHIVE-PLAN' }).state;
    const open = Run.create({ seed: 'ARCHIVE-PLAN', meta: {
      unlocked: { track: ['xiuxian'] }
    }}).state;
    const archive = BH.registry.get('plans', 'plan_archive_xiuxian');
    ok(!Run._planIsEligible(locked, archive, 2), '空快照应屏蔽档案牌');
    ok(Run._planIsEligible(open, archive, 2), '对应轨道解锁后应开放档案牌');
    Run._applyPlan(open, 'plan_steady');
    Run._applyPlan(open, 'plan_study');
    eq(JSON.stringify(open.PLANLOG), '["plan_steady","plan_study"]');
    Run._resetRoute(open);
    eq(open.PLANLOG.length, 2, '跨季/重置路线不能清空 PLANLOG');
  });

  test(84, '开局天赋 archive slot 与抽卡未解锁优先均确定且不重复', () => {
    const unlocked = { talent: ['tal_jixinghao'] };
    const a = BH.gacha.talentChoices('TALENT-REPLAY', unlocked);
    const b = BH.gacha.talentChoices('TALENT-REPLAY', unlocked);
    eq(JSON.stringify(a), JSON.stringify(b));
    eq(a.length, 3);
    eq(a.filter((t) => t.id === 'tal_jixinghao').length, 1);

    const save = BH.save.blank();
    const items = BH.registry.list('gacha');
    const target = items[0];
    items.forEach((item) => {
      if (item.id !== target.id) save.unlocked[item.type].push(item.target);
    });
    const state = Run.create({ seed: 'GACHA-PRIORITY' }).state;
    BH.gacha.draw(state, save, 'GACHA-PRIORITY');
    ok(save.unlocked[target.type].includes(target.target), '仍有新条目时应优先解锁它');
  });

  test(85, 'origin seed 重放不依赖墙钟', () => {
    const App = BH._uiApp;
    const origins = BH.registry.origins();
    const make = () => ({ seedInput: 'ORIGIN-REPLAY', origins,
      pick: { family: null, sex: null, personality: null } });
    const left = make();
    const right = make();
    App.methods.rollOrigin.call(left);
    App.methods.rollOrigin.call(right);
    eq(JSON.stringify(left.pick), JSON.stringify(right.pick));
  });

  test(86, '已解锁 cast 优先进入同稀有度季末奖励池', () => {
    const candidate = BH.registry.list('cast').find((card) => card.rarity === 'common');
    ok(candidate, '需要至少一张 common 人设牌');
    const s = Run.create({ seed: 'CAST-ARCHIVE', meta: {
      unlocked: { cast: [candidate.id] }
    }}).state;
    const pool = Run._castOfRarity('common', [], s);
    eq(pool.length, 1, '有 archive cast 时应优先使用 archive 子池');
    eq(pool[0].id, candidate.id);
  });
}
