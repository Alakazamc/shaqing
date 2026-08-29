/* 合租室友：约会、暧昧、承诺与现实压力
 * 全部 noRandom，由 content/relationships.js 的事件线驱动。
 */
(function (g) {
  g.BH.define.events([
    {
      id: 'e_rel_lan_s1', kind: 'chain', noRandom: true, weight: 0,
      include: 'FLAG?["f_wangba"] & AGE>=16 & AGE<=21',
      text: '你在网吧门口捡到一把折伞。伞柄贴着一张水电费分摊表，' +
        '名字只有一个字。第二天，那个人来问你有没有见过。',
      drama: 14, tropes: ['chongfeng'], tags: ['街面', '网络'],
      options: [
        { text: '把伞还给他', drama: 16, relation: { npc_lan: 2 },
          grant: { flag: ['f_lan_contact'] } },
        { text: '放在门卫处', drama: 8, relation: { npc_lan: -1 },
          grant: { flag: ['f_lan_missed'] } },
      ],
    },
    {
      id: 'e_rel_lan_s2', kind: 'chain', noRandom: true, weight: 0,
      include: 'NPC?["npc_lan"] & FLAG?["f_lan_contact"] & AGE>=17',
      text: '他约你去超市买一盏灯。最后买了两盒速冻饺子、' +
        '一把螺丝刀和一张双人电影票。票根被夹进了租约。',
      drama: 18, tropes: ['qianyue'], tags: ['家庭', '街面'],
      options: [
        { text: '把关系说清楚', drama: 24, relation: { npc_lan: 3 },
          grant: { flag: ['f_lan_commit'] } },
        { text: '先照旧相处', drama: 12, relation: { npc_lan: 1 },
          grant: { flag: ['f_lan_ambiguous'] }, fork: 0 },
      ],
    },
    {
      id: 'e_rel_lan_s3', kind: 'chain', noRandom: true, weight: 0,
      include: 'NPC?["npc_lan"] & FLAG?["f_lan_commit"] & AGE>=19',
      text: '他的夜班换到了城南，你的工作排班贴在城北。' +
        '两个人把下个月的空白日期圈出来，只有一天重合。',
      drama: 22, tropes: ['qianyue'], tags: ['职场', '疲惫'],
      options: [
        { text: '一起租近一点', drama: 28, relation: { npc_lan: 2 },
          effect: { MNY: -1 }, grant: { flag: ['f_lan_shared'], cast: ['cast_paozao'] } },
        { text: '各自先忙', drama: 16, relation: { npc_lan: -2 },
          effect: { SPR: -1 }, grant: { flag: ['f_lan_pressure'] } },
      ],
    },
    {
      id: 'e_rel_lan_s4', kind: 'chain', noRandom: true, weight: 0,
      include: 'NPC?["npc_lan"] & FLAG?["f_lan_commit"] & AGE>=21',
      text: '房东把续租日期写在冰箱上。他的母亲打来电话，问你们' +
        '什么时候办酒。你们同时看向那张只剩一格的日历。',
      drama: 30, tropes: ['beipan'], tags: ['家庭', '破防'],
      options: [
        { text: '把日历再往后翻', drama: 34, relation: { npc_lan: 2 },
          grant: { flag: ['f_lan_settled'], cast: ['cast_shejiao'] } },
        { text: '把租约退掉', drama: 38, relation: { npc_lan: -6 },
          grant: { flag: ['f_lan_breakup'], cast: ['cast_dayuanzhong'] } },
      ],
    },
    {
      id: 'e_rel_lan_miss', kind: 'chain', noRandom: true, weight: 0,
      include: 'NPC?["npc_lan"]',
      text: '你连续四年没有再去那家网吧。旧号码还在通讯录里，' +
        '备注是“水电费”。最后一条消息停在未发送。',
      drama: 24, tropes: ['shilian'], tags: ['网络', '无人知晓'],
      options: [
        { text: '删掉这个备注', drama: 22, relation: { npc_lan: -3 },
          grant: { flag: ['f_lan_miss'], cast: ['cast_xiashuidao'] } },
      ],
    },
  ], 'content/events/relationships-main.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
