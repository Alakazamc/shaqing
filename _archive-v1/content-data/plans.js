/* 季内路线 / 节目编排节点
 * 正典：docs/modules/22-planning.md
 * 这里只描述路线取舍，不覆盖年度公式、季末规则或真结局判定。
 */
(function (g) {
  g.BH.define.plans([
    {
      id: 'plan_steady', label: '把日子按原来的方向播下去', kind: 'steady',
      season: [1, 2, 3, 4, 5], risk: 'low', audience: 'steady',
      cost: ['桥段偏低', 'SPR +1'],
      track: null, tags: ['家庭'], poolTags: ['家庭', '职场'], lineBias: [],
      hidden: false, preview: '普通生活/职业', effect: { SPR: 1 },
    },
    {
      id: 'plan_study', label: '把时间押在课桌和夜灯上', kind: 'study',
      season: [1, 2, 3, 4], risk: 'low', audience: 'steady',
      cost: ['INT +1', 'SPR -1'],
      track: 'dushu', tags: ['校园', '苦熬'], poolTags: ['校园', '苦熬'], lineBias: [],
      hidden: false, preview: '校园/苦熬', effect: { INT: 1, SPR: -1 },
    },
    {
      id: 'plan_hot', label: '把这一季做得更响', kind: 'hot',
      season: [2, 3, 4, 5], risk: 'high', audience: 'burst',
      cost: ['HOOK +2', 'SPR -1'],
      track: 'wanghong', tags: ['网络', '失控'], poolTags: ['网络', '失控'], lineBias: [],
      hidden: false, preview: '网络/失控', effect: { AUD: 3, HOOK: 2, SPR: -1 },
    },
    {
      id: 'plan_thread', label: '沿着一个人留下的线继续播', kind: 'thread',
      season: [2, 3, 4, 5], risk: 'medium', audience: 'swing',
      cost: ['关系线优先', 'SPR -1'],
      track: 'shushu', tags: ['网络', '职场'], poolTags: ['网络', '职场'],
      lineBias: ['el_pingtai'], hidden: false, preview: '关系/平台',
      effect: { AUD: 2, SPR: -1 },
    },
    {
      id: 'plan_unknown', label: '跟着一条没写在表上的线', kind: 'unknown',
      season: [1, 2, 3], risk: 'high', audience: 'swing',
      cost: ['未知信号', 'HOOK +1', 'SPR -1'],
      track: 'xiuxian', tags: ['山野', '苦熬'], poolTags: ['山野', '修仙'],
      lineBias: ['el_xiuxian'], gate: 'FLAG?["f_houshan"] & AGE<=12',
      hidden: true, preview: '未知信号', effect: { HOOK: 1, SPR: -1 },
    },
    {
      id: 'plan_mix', label: '把两种热闹剪在同一条片子里', kind: 'mix',
      season: [3, 4, 5], risk: 'medium', audience: 'swing',
      cost: ['MNY -1', 'AUD 波动'],
      track: null, tags: ['投机', '网络'], poolTags: ['投机', '网络'], lineBias: [],
      hidden: false, preview: '投机/网络', effect: { MNY: -1, AUD: 4, HOOK: 1 },
    },

    // 局外解锁的档案牌：只扩大路线/事件可能性，不给直接数值奖励。
    {
      id: 'plan_archive_xiuxian', label: '打开旧档案：山上的那条线', kind: 'archive',
      season: [1, 2, 3, 4, 5], risk: 'high', audience: 'swing',
      cost: ['未知信号', 'SPR -1'],
      track: 'xiuxian', tags: ['山野', '修仙'], poolTags: ['山野', '修仙'],
      lineBias: ['el_xiuxian'], metaUnlock: { type: 'track', id: 'xiuxian' },
      hidden: true, preview: '旧档案/修仙', effect: { HOOK: 1, SPR: -1 },
    },
    {
      id: 'plan_archive_dianjing', label: '把旧存档投到深夜赛场', kind: 'archive',
      season: [2, 3, 4, 5], risk: 'high', audience: 'burst',
      cost: ['高波动', 'SPR -1'],
      track: 'dianjing', tags: ['竞技', '网络'], poolTags: ['竞技', '网络'],
      lineBias: ['el_wangyou'], metaUnlock: { type: 'track', id: 'dianjing' },
      hidden: true, preview: '旧档案/竞技', effect: { AUD: 2, HOOK: 1, SPR: -1 },
    },
    {
      id: 'plan_archive_mofa', label: '给失控的想象留一个档期', kind: 'archive',
      season: [2, 3, 4, 5], risk: 'high', audience: 'swing',
      cost: ['未知信号', 'SPR -1'],
      track: 'mofa', tags: ['奇幻', '失控'], poolTags: ['奇幻', '失控'],
      lineBias: ['el_mofa'], metaUnlock: { type: 'track', id: 'mofa' },
      hidden: true, preview: '旧档案/奇幻', effect: { HOOK: 1, SPR: -1 },
    },
    {
      id: 'plan_archive_kehuan', label: '把未来的蓝光剪进本季', kind: 'archive',
      season: [3, 4, 5], risk: 'medium', audience: 'burst',
      cost: ['AUD 波动', 'SPR -1'],
      track: 'kehuan', tags: ['科幻', '网络'], poolTags: ['科幻', '网络'],
      lineBias: ['el_kehuan'], metaUnlock: { type: 'track', id: 'kehuan' },
      hidden: true, preview: '旧档案/科幻', effect: { AUD: 3, SPR: -1 },
    },
    {
      id: 'plan_archive_qishou', label: '把那封没寄出的信重新播出', kind: 'archive',
      season: [2, 3, 4, 5], risk: 'medium', audience: 'swing',
      cost: ['关系线优先', 'SPR -1'],
      track: 'xiuxian', tags: ['山野', '献祭'], poolTags: ['山野', '献祭'],
      lineBias: ['el_qishou'], metaUnlock: { type: 'npc', id: 'npc_qishou' },
      hidden: true, preview: '旧档案/关系', effect: { AUD: 1, SPR: -1 },
    },
    {
      id: 'plan_archive_wangyou', label: '给旧队友留一格回放时间', kind: 'archive',
      season: [2, 3, 4, 5], risk: 'medium', audience: 'swing',
      cost: ['关系线优先', 'SPR -1'],
      track: 'dianjing', tags: ['竞技', '街面'], poolTags: ['竞技', '街面'],
      lineBias: ['el_wangyou'], metaUnlock: { type: 'npc', id: 'npc_wangyou' },
      hidden: true, preview: '旧档案/关系', effect: { AUD: 1, SPR: -1 },
    },
  ], 'content/plans.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
