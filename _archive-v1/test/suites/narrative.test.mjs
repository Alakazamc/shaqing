/* A73–A76：叙述层禁用词、引号豁免与信号层边界 */
import { group, test, eq, ok } from '../harness.mjs';

function scanContent(BH, fn) {
  const R = BH.registry;
  R.list('events').forEach((e) => {
    fn(e.text, 'event:' + e.id + '.text');
    (e.options || []).forEach((o, i) => fn(o.text, 'event:' + e.id + '.options[' + i + ']'));
  });
  R.list('endings').forEach((e) => fn(e.text, 'ending:' + e.id));
}

export function runNarrativeTests(BH) {
  const S = BH._seal;
  group('4.12 叙述层禁用词');

  test(73, '全部事件/选项/结局叙述不命中评价与说教禁用词', () => {
    S._clear();
    scanContent(BH, (text, where) => {
      S.checkNarration(text, where);
      S.checkInnerThought(text, where);
    });
    eq(S.problems.length, 0, S.problems.map((x) => x.msg).join('\n'));
  });

  test(74, '角色台词和普通引号内容跳过叙述禁用词检查', () => {
    S._clear();
    S.checkNarration('你听见有人说「你很勇敢」，然后关了门。', 'quote');
    S.checkNarration('短信写着“这很幸福”，你没有回复。', 'quote2');
    S.checkNarration('备注是"这很痛苦"，你把它删了。', 'quote3');
    eq(S.problems.length, 0, '引号内词不应污染叙述层');
  });

  test(75, '心理活动仍禁止用说教连接词替玩家点题', () => {
    S._clear();
    S.checkInnerThought('你想「原来这才是最重要的」。', 'thought');
    ok(S.problems.some((x) => x.msg.includes('心理活动')), '应拦截心理活动说教词');
  });

  test(76, '恐怖/灵异正文也只允许事实叙述，信号层负责表现异常', () => {
    S._clear();
    const R = BH.registry;
    R.list('events').filter((e) => e.fx || (e.tags || []).includes('灵异'))
      .forEach((e) => {
        S.checkNarration(e.text, 'signal:' + e.id);
        (e.options || []).forEach((o, i) => S.checkNarration(o.text, 'signal:' + e.id + ':' + i));
      });
    eq(S.problems.length, 0, S.problems.map((x) => x.msg).join('\n'));
  });
}
