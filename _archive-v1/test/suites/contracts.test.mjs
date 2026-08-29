/* A66–A72：manifest、registry/seal、存档和 dev 隔离 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { group, test, eq, ok } from '../harness.mjs';

const CONTRACT_FIXTURE = fileURLToPath(new URL('../fixtures/content-contract.mjs', import.meta.url));
const WORKSPACE = fileURLToPath(new URL('../..', import.meta.url));

function child(mode) {
  return JSON.parse(execFileSync(process.execPath, [CONTRACT_FIXTURE, mode], {
    cwd: WORKSPACE, encoding: 'utf8',
  }));
}

export function runContractTests(BH, save) {
  const R = BH.registry;

  group('4.11 内容扩展契约');

  test(66, 'BH.MANIFEST 是唯一清单且每个文件都可加载', () => {
    ok(BH.MANIFEST.length > 0);
    eq(new Set(BH.MANIFEST).size, BH.MANIFEST.length, '清单 id 不应重复');
    BH.MANIFEST.forEach((file) => {
      ok(existsSync(new URL('../../' + file, import.meta.url)), '清单文件不存在：' + file);
    });
    eq(R.list('events').length, 234, '当前封盘事件数量');
  });

  test(67, '打乱 manifest 注册顺序后 seal 结果一致', () => {
    const normal = child('order');
    const reverse = child('reverse');
    eq(JSON.stringify(normal), JSON.stringify(reverse), '乱序封盘结果不一致');
  });

  test(68, '重复 id 注册错误包含两次来源', () => {
    const r = child('duplicate');
    ok(r.message.includes('先前来源'));
    ok(r.message.includes('本次来源'));
  });

  test(69, 'seal 后写注册表会抛错', () => {
    const r = child('freeze');
    eq(r.frozen, true);
    ok(r.message.includes('封盘'));
  });

  test(70, 'condProp 新键可用于 DSL，冲突键抛错', () => {
    eq(child('condprop').ok, true);
  });

  test(71, '存档前向兼容：丢失效 id，但保留 material；坏档留备份', () => {
    const migrated = save.migrate({
      material: 123,
      unlocked: { cast: ['cast_hanxiu', 'cast_removed'], talent: ['tal_removed'],
        npc: [], track: ['track_removed'], family: [], personality: [] },
      found: {
        track: ['track_removed'], ending: ['end_removed'],
        event: ['e_exp_mofa_home', 'event_removed'],
        line: ['el_mofa', 'line_removed'],
        plan: ['plan_mix', 'plan_removed'],
      },
      stats: { runs: 4, best: 6.2, cancelled: 1, recentSeeds: ['abc-123', 'abc123'] },
    });
    eq(migrated.material, 123);
    ok(migrated.unlocked.cast.includes('cast_hanxiu'));
    ok(!migrated.unlocked.cast.includes('cast_removed'));
    eq(migrated.stats.runs, 4);
    eq(migrated.stats.recentSeeds.length, 1, 'recentSeeds 应规范化并去重');
    eq(migrated.stats.recentSeeds[0], 'ABC123');
    ok(migrated.found.event.includes('e_exp_mofa_home'));
    ok(!migrated.found.event.includes('event_removed'));
    ok(migrated.found.line.includes('el_mofa'));
    ok(!migrated.found.line.includes('line_removed'));
    ok(migrated.found.plan.includes('plan_mix'));
    ok(!migrated.found.plan.includes('plan_removed'));
    globalThis.localStorage.setItem(save.KEY, '{bad json');
    const reset = save.load(false);
    eq(reset.material, 0, '坏档应静默重置');
    eq(globalThis.localStorage.getItem(save.BAK), '{bad json', '原值应写入备份键');
  });

  test(72, 'dev=1 使用独立存档且结算/抽卡不产出素材或解锁', () => {
    const normal = save.blank();
    normal.material = 7;
    save.save(normal, false);
    const dev = save.blank();
    dev.material = 2;
    save.save(dev, true);
    eq(save.load(false).material, 7);
    eq(save.load(true).material, 2);
    ok(save.KEY !== save.DEV_KEY, 'dev 键必须独立');

    const App = BH._uiApp;
    ok(App && App.methods, 'UI 应提供可测试的相位方法');
    const ctx = {
      dev: true,
      save: save.blank(),
      state: { final: { rating: 5.5, total: 100, endingId: 'end_normal' }, TRACK: {} },
      phase: 'SETTLEMENT', gachaResult: null, seedInput: 'DEV',
    };
    App.methods.recordRun.call(ctx);
    eq(ctx.save.material, 0, '开发结算不增加素材');
    eq(ctx.save.found.track.length, 0, '开发结算不发现轨道');
    eq(ctx.save.found.ending.length, 0, '开发结算不发现结局');
    App.methods.toGacha.call(ctx);
    eq(ctx.gachaResult.dev, true, '开发抽卡只显示隔离提示');
    eq(ctx.save.material, 0);
  });

  test(125, '正常结算写入 event/line/plan 图鉴并保留最近 seed', () => {
    const App = BH._uiApp;
    const ctx = {
      dev: false,
      save: save.blank(),
      state: {
        seed: 'DISCOVER-01',
        final: { rating: 5.5, total: 100, endingId: 'end_normal' },
        TRACK: { mofa: 1 },
        EVT: ['e_exp_mofa_home'],
        ELINE: { el_mofa: { stage: 1 } },
        PLANLOG: ['plan_archive_mofa'],
        cancelCount: 0,
      },
      phase: 'SETTLEMENT', gachaResult: null, seedInput: 'DISCOVER-01',
    };
    App.methods.recordRun.call(ctx);
    ok(ctx.save.found.event.includes('e_exp_mofa_home'));
    ok(ctx.save.found.line.includes('el_mofa'));
    ok(ctx.save.found.plan.includes('plan_archive_mofa'));
    eq(ctx.save.stats.recentSeeds[0], 'DISCOVER01');
  });

  test(126, 'ARCHIVE 相位可往返，未知结局不建槽且投影计数安全', () => {
    const App = BH._uiApp;
    ok(App && App.methods && App.computed.archiveEntries && App.computed.archiveTabs);
    const nav = { phase: 'SETTLEMENT', archiveTab: 'track', archiveReturn: 'BOOT' };
    App.methods.openArchive.call(nav, 'ending');
    eq(nav.phase, 'ARCHIVE');
    eq(nav.archiveReturn, 'SETTLEMENT');
    eq(nav.archiveTab, 'ending');
    App.methods.selectArchiveTab.call(nav, 'cast');
    eq(nav.archiveTab, 'cast');
    eq(App.methods.archiveReturnLabel.call(nav), '回到结算');
    App.methods.closeArchive.call(nav);
    eq(nav.phase, 'SETTLEMENT');
    eq(nav.archiveReturn, 'BOOT');

    const view = { save: save.blank(), archiveTab: 'ending' };
    const endingEntries = App.computed.archiveEntries.call(view);
    ok(!endingEntries.some((entry) => entry.id === 'end_stable'),
      '真结局未发现前不能出现在图鉴槽位');
    const endingTab = App.computed.archiveTabs.call(view).find((tab) => tab.key === 'ending');
    eq(endingTab.total, R.list('endings').filter((ending) => !ending.trueEnding).length);

    const track = R.list('tracks')[0].id;
    const cast = R.list('cast')[0].id;
    view.save.found.track.push(track);
    view.save.unlocked.cast.push(cast);
    eq(App.computed.foundTrackCount.call(view), 1);
    eq(App.computed.foundCastCount.call(view), 1);
    const trackEntries = App.computed.archiveEntries.call({ save: view.save, archiveTab: 'track' });
    ok(trackEntries.some((entry) => entry.id === track && entry.known));
    ok(trackEntries.some((entry) => !entry.known && entry.name === '???'));
  });

  test(127, '反馈层只投影已有结果：路线、爆发、关系和季末状态可区分', () => {
    const App = BH._uiApp;
    const ctx = {
      feedbackTimer: null, feedbackClass: '', feedbackText: '', feedbackDetail: '', feedbackKey: 0,
      state: { peak: { total: 4000 } },
      fmt: (n) => String(n),
      relationText: () => 'NPC · 靠近 +2',
      setFeedback: App.methods.setFeedback,
    };
    App.methods.feedbackFromResult.call(ctx, {
      routePick: true,
      planPick: { hidden: true, matchedCast: [], label: '隐藏路线' },
    });
    ok(ctx.feedbackClass.includes('route-lock'));
    ok(ctx.feedbackClass.includes('hidden-track'));
    eq(ctx.feedbackText, '隐藏信号已锁定');
    App.methods.clearFeedback.call(ctx);

    App.methods.feedbackFromResult.call(ctx, {
      relations: [{ id: 'npc_lan', delta: 2, axis: 4 }],
      score: { total: 5000 },
    });
    ok(ctx.feedbackClass.includes('relation-shift'));
    ok(ctx.feedbackClass.includes('score-burst'));
    eq(ctx.feedbackText, '关系发生变化');
    App.methods.clearFeedback.call(ctx);

    App.methods.feedbackFromResult.call(ctx, {
      seasonEnd: { verdict: 'cancel', season: 3, name: '失控季' },
    });
    ok(ctx.feedbackClass.includes('season-cancel'));
    eq(ctx.feedbackText, '腰斩 / 信号退潮');
    App.methods.clearFeedback.call(ctx);
  });
}
