/* 状态层健壮性断言
 * 正典：docs/SYSTEM.md §0
 */
import { group, test, eq, ok, throws } from '../harness.mjs';

export function runStateTests(BH) {
  const St = BH.state;
  const L = St.LIMITS;

  group('状态层');

  test(110, '初始状态符合正典：AUD 起始 3，HOOK 0', () => {
    const s = St.create();
    eq(s.AUD, 3, 'AUD 起始值');
    eq(s.HOOK, 0);
    eq(s.HOOKP, 0);
    eq(s.age, 0);
    eq(s.season, 1);
    eq(s.CAST.length, 0);
    eq(s.SCAR.length, 0);
  });

  test(111, '状态是纯数据：JSON 往返后完全相等', () => {
    const s = St.create({ stats: { INT: 5 }, family: 'f_shancun', sex: 'nv' });
    St.grantCast(s, 'cast_x', 3);
    St.grantScar(s, 'scar_zhushui');
    St.bumpTrack(s, 'xiuxian', 2, 5);
    St.addTags(s, ['山野']);
    const round = JSON.parse(JSON.stringify(s));
    eq(JSON.stringify(round), JSON.stringify(s), 'JSON 往返一致');
    ok(St.clone(s) !== s, 'clone 返回新对象');
    eq(JSON.stringify(St.clone(s)), JSON.stringify(s), 'clone 内容一致');
  });

  test(112, '属性钳制：五维 -5…20，AUD 1…100，HOOK 0…20', () => {
    const s = St.create();
    St.applyEffect(s, { INT: 999 });
    eq(s.INT, L.STAT_MAX, '五维上限');
    St.applyEffect(s, { INT: -999 });
    eq(s.INT, L.STAT_MIN, '五维下限');
    St.applyEffect(s, { AUD: 999 });
    eq(s.AUD, L.AUD_MAX, 'AUD 上限');
    St.applyEffect(s, { AUD: -999 });
    eq(s.AUD, L.AUD_MIN, 'AUD 下限（不为 0）');
    St.applyEffect(s, { HOOK: 999 });
    eq(s.HOOK, L.HOOK_MAX, 'HOOK 上限');
    St.applyEffect(s, { HOOK: -999 });
    eq(s.HOOK, L.HOOK_MIN, 'HOOK 下限');
  });

  test(113, 'HOOKP 只增不减，记录峰值', () => {
    const s = St.create();
    St.applyEffect(s, { HOOK: 12 });
    eq(s.HOOKP, 12);
    St.applyEffect(s, { HOOK: -9 });
    eq(s.HOOK, 3, 'HOOK 下降');
    eq(s.HOOKP, 12, 'HOOKP 保持峰值');
    St.applyEffect(s, { HOOK: 2 });
    eq(s.HOOKP, 12, '未超过峰值时不变');
    St.applyEffect(s, { HOOK: 20 });
    eq(s.HOOKP, L.HOOK_MAX, '新峰值');
  });

  test(114, 'effect 未知键抛错，不静默忽略', () => {
    const s = St.create();
    throws(() => St.applyEffect(s, { NOSUCH: 1 }), {
      name: 'ContentError',
      match: '未知键',
    });
    throws(() => St.applyEffect(s, { INT: 'abc' }), {
      name: 'ContentError',
    });
    // AUD/HOOK 之外不允许直接写只读字段
    throws(() => St.applyEffect(s, { HOOKP: 5 }), { name: 'ContentError' });
  });

  test(115, '人设牌同名升级、污点永不去重', () => {
    const s = St.create();
    St.grantCast(s, 'cast_x', 3);
    St.grantCast(s, 'cast_x', 3);
    eq(s.CAST.length, 1, '同名不新增');
    eq(s.CAST[0].lv, 2, 'lv +1');
    St.grantCast(s, 'cast_x', 2);
    eq(s.CAST[0].lv, 2, '达到 maxLv 后不再升');

    St.grantScar(s, 'scar_zhushui');
    St.grantScar(s, 'scar_zhushui');
    eq(s.SCAR.length, 2, '污点可叠加，不去重');
  });

  test(116, '主导轨道判定确定性（并列取字典序）', () => {
    const s = St.create();
    St.bumpTrack(s, 'zzz', 3, 5);
    St.bumpTrack(s, 'aaa', 3, 5);
    eq(St.dominantTrack(s).id, 'aaa', '并列时取字典序最小，保证可复现');
    eq(St.dominantTrack(s).depth, 3);
    St.bumpTrack(s, 'zzz', 1, 5);
    eq(St.dominantTrack(s).id, 'zzz', '更深者胜出');
  });

  test(117, 'trope 计数：先读后写', () => {
    const s = St.create();
    eq(St.tropeCount(s, 'fanche'), 0, '初始为 0');
    St.bumpTrope(s, 'fanche');
    eq(St.tropeCount(s, 'fanche'), 1);
    St.bumpTrope(s, 'fanche');
    eq(St.tropeCount(s, 'fanche'), 2);
  });

  test(118, '内置条件属性全部可用（03-events.md §1.4）', () => {
    // condition 套件注册过一批测试属性，先清干净再装内置的
    const C = BH.condition;
    C._resetProps();
    C._clearCache();
    BH.props._reset();
    BH.props.registerBuiltins();
    const expected = [
      'AGE', 'SEASON', 'CHR', 'INT', 'STR', 'MNY', 'SPR',
      'AUD', 'HOOK', 'HOOKP', 'CAST', 'SCAR', 'FLAG', 'EVT', 'TAG',
      'SCARN', 'CASTN', 'TRACK', 'TRACKLV',
      'FAMILY', 'SEX', 'NPC', 'NPCGONE', 'NPCAX', 'NPCLV', 'ELINE',
    ];
    for (const k of expected) {
      ok(C.hasProp(k), '缺少内置属性 ' + k);
    }

    // 端到端：真实状态上跑条件
    const s = St.create({ stats: { INT: 9 }, sex: 'nv' });
    s.age = 23;
    St.grantCast(s, 'cast_zhuji', 3);
    St.bumpTrack(s, 'xiuxian', 4, 5);
    St.grantScar(s, 'scar_zhushui');
    s.ELINE = { el_qishou: { stage: 2, forkId: null, lastYear: 20 } };
    s.NPCAX = { npc_qishou: { axis: 6, stage: 2 } };
    s.NPC = ['npc_qishou'];

    ok(C.check(s, 'AGE>=18 & INT>8'), '标量组合');
    ok(C.check(s, 'CAST?["cast_zhuji"]'), '人设牌列表');
    ok(C.check(s, 'TRACK=["xiuxian"]'), '主导轨道');
    ok(C.check(s, 'TRACKLV>=4'), '轨道深度');
    ok(C.check(s, 'SCARN=1'), '污点计数');
    ok(C.check(s, 'ELINE?["el_qishou:2"]'), '事件线阶段');
    ok(C.check(s, 'NPCAX?["npc_qishou:2"]'), 'NPC 阶段');
    ok(C.check(s, 'NPC?["npc_qishou"]'), 'NPC 在场');
    ok(C.check(s, 'NPCGONE!["npc_qishou"]'), '未退场');
    ok(C.check(s, 'SEX=["nv"]'), '性别');
  });

  test(124, 'META 快照与 PLANLOG 是纯数据且旧调用保持空快照', () => {
    const source = { track: ['xiuxian'], npc: ['npc_qishou'] };
    const s = St.create({ meta: { unlocked: source } });
    const old = St.create();
    eq(JSON.stringify(s.META.unlocked.track), '["xiuxian"]');
    eq(JSON.stringify(s.META.unlocked.npc), '["npc_qishou"]');
    eq(JSON.stringify(old.META.unlocked.track), '[]');
    eq(JSON.stringify(s.PLANLOG), '[]');
    source.track.push('mofa');
    eq(s.META.unlocked.track.length, 1, 'META 不应引用外部数组');
  });

}