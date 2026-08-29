/* 抽卡池
 * 正典：docs/modules/12-gacha.md
 * A 期 12 条。
 *
 * 三条红线：
 *   只解锁内容，永不解锁数值强化
 *   T3 的"高级"是更离谱，不是更强
 *   真结局不进池、不被任何抽卡结果暗示（seal 会拦 type: 'ending'）
 */
(function (g) {
  g.BH.define.gacha([
    // 人设牌进池（不是直接发牌）
    { id: 'g_cast_pofang', type: 'cast', target: 'cast_pofang', tier: 2,
      scopes: ['common'], weight: 8, dupValue: 18 },
    { id: 'g_cast_zhuji', type: 'cast', target: 'cast_zhuji', tier: 2,
      scopes: ['xianxia'], weight: 8, dupValue: 18 },
    { id: 'g_cast_poguan', type: 'cast', target: 'cast_poguan', tier: 3,
      scopes: ['common'], weight: 3, dupValue: 30 },
    { id: 'g_cast_baoli', type: 'cast', target: 'cast_baoli', tier: 1,
      scopes: ['esports'], weight: 12, dupValue: 10 },
    { id: 'g_cast_paihang', type: 'cast', target: 'cast_paihang', tier: 1,
      scopes: ['esports'], weight: 12, dupValue: 10 },

    // 天赋进三选一池
    { id: 'g_tal_fanshehui', type: 'talent', target: 'tal_fanshehui', tier: 3,
      scopes: ['common'], weight: 3, dupValue: 30 },
    { id: 'g_tal_lingmin', type: 'talent', target: 'tal_lingmin', tier: 2,
      scopes: ['common'], weight: 8, dupValue: 16 },
    { id: 'g_tal_yunqi', type: 'talent', target: 'tal_yunqi', tier: 1,
      scopes: ['common'], weight: 12, dupValue: 10 },

    // NPC 进池
    { id: 'g_npc_qishou', type: 'npc', target: 'npc_qishou', tier: 2,
      scopes: ['xianxia'], weight: 8, dupValue: 16 },
    { id: 'g_npc_wangyou', type: 'npc', target: 'npc_wangyou', tier: 1,
      scopes: ['esports'], weight: 12, dupValue: 10 },

    // 轨道起点权限
    { id: 'g_track_xiuxian', type: 'track', target: 'xiuxian', tier: 2,
      scopes: ['xianxia'], weight: 6, dupValue: 20 },
    { id: 'g_track_dianjing', type: 'track', target: 'dianjing', tier: 1,
      scopes: ['esports'], weight: 10, dupValue: 12 },
    { id: 'g_cast_yongye', type: 'cast', target: 'cast_yongye', tier: 2,
      scopes: ['fantasy'], weight: 6, dupValue: 20 },
    { id: 'g_cast_dengxin', type: 'cast', target: 'cast_dengxin', tier: 2,
      scopes: ['fantasy'], weight: 8, dupValue: 16 },
    { id: 'g_cast_dongmian', type: 'cast', target: 'cast_dongmian', tier: 3,
      scopes: ['scifi'], weight: 4, dupValue: 28 },
    { id: 'g_cast_yuanshi', type: 'cast', target: 'cast_yuanshi', tier: 2,
      scopes: ['scifi'], weight: 7, dupValue: 18 },
    { id: 'g_track_mofa', type: 'track', target: 'mofa', tier: 2,
      scopes: ['fantasy'], weight: 6, dupValue: 20 },
    { id: 'g_track_kehuan', type: 'track', target: 'kehuan', tier: 2,
      scopes: ['scifi'], weight: 5, dupValue: 20 },
  ], 'content/gacha.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
