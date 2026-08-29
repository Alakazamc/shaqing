/* 合租室友：保持距离分叉与多年后重逢 */
(function (g) {
  g.BH.define.events([
    {
      id: 'e_rel_lan_f2a', kind: 'chain', noRandom: true, weight: 0,
      include: 'NPC?["npc_lan"] & FLAG?["f_lan_ambiguous"]',
      text: '你们继续合租。快递单上的收件人从两个变成一个，' +
        '他把备用钥匙放回鞋柜，没再问你哪天有空。',
      drama: 20, tropes: ['shilian'], tags: ['家庭', '麻木'],
      options: [
        { text: '照旧分摊房租', drama: 18, relation: { npc_lan: -2 },
          grant: { flag: ['f_lan_distance'], cast: ['cast_hanxiu'] } },
      ],
    },
    {
      id: 'e_rel_lan_f2b', kind: 'chain', noRandom: true, weight: 0,
      include: 'NPC?["npc_lan"] & FLAG?["f_lan_distance"]',
      text: '搬家公司的车停在楼下。他把最后一只纸箱交给你，' +
        '箱上写着“厨房”。你们各自报了新地址。',
      drama: 32, tropes: ['shilian'], tags: ['家庭', '逃避'],
      options: [
        { text: '把地址存下来', drama: 30, relation: { npc_lan: -5 },
          grant: { flag: ['f_lan_breakup'], cast: ['cast_shoulian'] },
          track: { shushu: 1 } },
      ],
    },
    {
      id: 'e_rel_lan_reunion', kind: 'chain', noRandom: true, weight: 0,
      include: 'NPCGONE?["npc_lan"] & NPCKNOWN?["npc_lan"] & AGE>=28',
      text: '你在医院自动售货机旁看见他。他拿着两杯水，' +
        '先问你现在住哪，再问那张旧租约有没有留着。',
      drama: 28, tropes: ['chongfeng'], tags: ['家庭', '网络'],
      options: [
        { text: '坐下喝完这杯水', drama: 32, relation: { npc_lan: 2 },
          grant: { flag: ['f_lan_reunion'], cast: ['cast_paozao'] } },
      ],
    },
  ], 'content/events/relationships-branches.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
