/* 关系纵切片：一个 NPC、一条可错过/可分叉/可重逢的线
 * 正典：docs/modules/23-relationships.md
 */
(function (g) {
  g.BH.define.npcs([
    {
      id: 'npc_lan', name: '合租室友', emoji: '🪴',
      scope: 'shushu', seasons: [3, 4], axis: 'qinmi',
      eventline: 'el_lan',
      exit: 'e_rel_lan_s4',
      exitEvents: ['e_rel_lan_f2b', 'e_rel_lan_miss'],
      tags: ['家庭', '网络'],
      gate: 'FLAG?["f_wangba"]',
      bio: '在县城网吧认识。记账很快，忘带钥匙也很快。',
      voice: '说话先报数字，遇到感情问题会开始算水电费。',
      never: '不会把关系说成命运，不会替你做决定，不会消失后立刻解释。',
    },
  ], 'content/relationships.js');

  g.BH.define.eventlines([
    {
      id: 'el_lan', name: '合租室友', track: 'shushu',
      stages: 4, minGap: 1, maxGap: 4,
      chain: [
        'e_rel_lan_s1', 'e_rel_lan_s2',
        'e_rel_lan_s3', 'e_rel_lan_s4',
      ],
      forks: [
        { from: 2, chain: ['e_rel_lan_f2a', 'e_rel_lan_f2b'],
          track: 'shushu', depth: 1 },
      ],
      missEvent: 'e_rel_lan_miss',
      reunion: { event: 'e_rel_lan_reunion', minGap: 3 },
    },
  ], 'content/relationships.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
