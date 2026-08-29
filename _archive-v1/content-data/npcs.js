/* NPC 档案
 * 正典：docs/modules/10-npc.md
 * A 期 2 个（首发目标 30–40）。池大出场少：一局只遇 3–5 个。
 *
 * bio / voice / never 三字段**不进游戏**，是给写文案的人的约束。
 * 其中 never（这个角色不会做什么）比 bio 有用得多：
 * 它防的正是十条事件写下来人物走形。
 */
(function (g) {
  g.BH.define.npcs([
    {
      id: 'npc_qishou',
      name: '下棋的老头', emoji: '🧓',
      scope: 'xianxia',
      seasons: [1, 2, 3],
      axis: 'qinmi',
      eventline: 'el_qishou',
      exit: 'e_el_qs_s3',
      tags: ['山野', '献祭'],
      gate: 'FLAG?["f_shancun"]',

      bio: '在村口下棋二十年。没人知道他从哪来，也没人问过。他不是隐士，只是没走。',
      voice: '说话短，不解释，爱用棋的比喻。被问原因时只说「看着」。',
      never: '不会主动求你，不会解释自己是谁，不会说任何鼓励的话，不会在你放弃时挽留。',
    },
    {
      id: 'npc_wangyou',
      name: '网吧那个人', emoji: '🎧',
      scope: 'esports',
      seasons: [2, 3],
      axis: 'qinmi',
      eventline: 'el_wangyou',
      exit: 'e_el_wy_s3',
      tags: ['竞技', '街面'],
      gate: 'FLAG?["f_wangba"]',

      bio: '比你大三岁，手比你稳。他真的有天赋，但天赋只够走到市级。',
      voice: '话多，口头禅是「再来一把」。谈钱时反而变得很干脆。',
      never: '不会承认自己打不过别人，不会记恨你，不会在赛后复盘时怪队友。',
    },
  ], 'content/npcs.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
