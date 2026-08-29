/* 人设牌（＝小丑）
 * 正典：docs/modules/02-cast.md
 * A 期 18 张，含 1 张 legend、2 张 epic
 *
 * 硬约束（01-scoring.md §3.2）：
 *   单张牌不得让 M 超过 4.0；M > 8 必须是至少 3 张牌咬合的结果
 */
(function (g) {
  g.BH.define.cast([
    // ── common：+0.2 – +0.4 ──────────────────────────────
    { id: 'cast_hanxiu', name: '含羞', emoji: '😳', rarity: 'common',
      track: null, tags: ['校园'], desc: '倍率 +0.2',
      addMult: 0.2, maxLv: 3 },
    { id: 'cast_aokemu', name: '熬科目', emoji: '📖', rarity: 'common',
      track: 'dushu', tags: ['校园', '苦熬'], desc: '倍率 +0.3',
      addMult: 0.3, maxLv: 3 },
    { id: 'cast_zaoqi', name: '早起', emoji: '⏰', rarity: 'common',
      track: null, tags: ['苦熬'], desc: '倍率 +0.2',
      addMult: 0.2, maxLv: 3 },
    { id: 'cast_xiashuidao', name: '下水道', emoji: '🕳️', rarity: 'common',
      track: 'shushu', tags: ['街面', '逃避'], desc: '倍率 +0.4',
      addMult: 0.4, maxLv: 3 },
    { id: 'cast_paozao', name: '泡澡', emoji: '🛁', rarity: 'common',
      track: null, tags: ['逃避'], desc: '桥段 +3',
      addDrama: { per: 'fixed', value: 3 }, maxLv: 3 },
    { id: 'cast_wanghong', name: '网感', emoji: '📱', rarity: 'common',
      track: null, tags: ['网络'], desc: '每 10 点观众桥段 +1',
      addDrama: { per: 'AUD10', value: 1 }, maxLv: 3 },

    // ── rare：+0.5 – +0.9 ────────────────────────────────
    { id: 'cast_chouxiang', name: '抽象怪', emoji: '🤡', rarity: 'rare',
      track: null, tags: ['网络', '失控'], desc: '倍率 +0.8，每张污点桥段 +2',
      addMult: 0.8, addDrama: { per: 'SCAR', value: 2 }, maxLv: 3 },
    { id: 'cast_dayuanzhong', name: '大冤种', emoji: '😤', rarity: 'rare',
      track: null, tags: ['职场', '麻木'], desc: '倍率 +0.5',
      addMult: 0.5, maxLv: 3 },
    { id: 'cast_shushuwoa', name: '鼠鼠我啊', emoji: '🐭', rarity: 'rare',
      track: 'shushu', tags: ['街面', '麻木'], desc: '倍率 +0.6',
      addMult: 0.6, maxLv: 3 },
    { id: 'cast_shoulian', name: '手练', emoji: '🖱️', rarity: 'rare',
      track: 'dianjing', tags: ['竞技', '亢奋'], desc: '倍率 +0.7',
      addMult: 0.7, maxLv: 3 },
    { id: 'cast_dazuoye', name: '打坐业', emoji: '🪷', rarity: 'rare',
      track: 'xiuxian', tags: ['山野', '苦熬'], desc: '倍率 +0.6',
      addMult: 0.6, maxLv: 3 },
    { id: 'cast_shejiao', name: '社交恐怖分子', emoji: '🗣️', rarity: 'rare',
      track: null, tags: ['网络'], desc: '每张人设牌桥段 +1',
      addDrama: { per: 'CAST', value: 1 }, addMult: 0.5, maxLv: 3 },
    { id: 'cast_baoli', name: '暴力输出', emoji: '💥', rarity: 'rare',
      track: 'dianjing', tags: ['竞技', '失控'], desc: '倍率 +0.9',
      addMult: 0.9, maxLv: 2 },
    { id: 'cast_zhaipin', name: '宅品', emoji: '🥡', rarity: 'rare',
      track: 'shushu', tags: ['家庭', '逃避'], desc: '桥段 +6',
      addDrama: { per: 'fixed', value: 6 }, maxLv: 3 },
    { id: 'cast_paihang', name: '排行执念', emoji: '🏆', rarity: 'rare',
      track: 'dianjing', tags: ['竞技'], desc: '每级主导轨道深度桥段 +2',
      addDrama: { per: 'TRACKLV', value: 2 }, maxLv: 3 },

    // ── epic：+1.0 – +1.5 或 ×1.5 – ×2.0 ─────────────────
    { id: 'cast_pofang', name: '破防现场', emoji: '💔', rarity: 'epic',
      track: null, tags: ['网络', '破防'], desc: '倍率 ×2.0',
      xMult: 2.0, maxLv: 1 },
    { id: 'cast_zhuji', name: '筑基', emoji: '🧘', rarity: 'epic',
      track: 'xiuxian', tags: ['修仙', '山野'], desc: '倍率 +1.4，寿命上限 +30',
      addMult: 1.4, lifespan: 30, maxLv: 1 },

    // ── legend：×2.5 – ×3.0 ──────────────────────────────
    { id: 'cast_poguan', name: '破罐破摔', emoji: '🩹', rarity: 'legend',
      track: null, tags: ['失控', '献祭'],
      desc: '污点 ≥5 时倍率 ×2.5',
      xMultIf: { cond: 'SCARN>=5', mult: 2.5 }, maxLv: 1 },
  ], 'content/cast.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* 异常轨道的专属牌（20-anomaly.md）
 * 其中「只在没人看见时出手」是 C3 的又一个基准例：
 * 它把"没人看见"——本作最重的惩罚——变成了数值优势。
 */
(function (g) {
  g.BH.define.cast([
    { id: 'cast_wurenkanjian', name: '只在没人看见时出手', emoji: '🦸',
      rarity: 'legend', track: 'pifeng', tags: ['街面', '献祭'],
      desc: '观众不再增长，但倍率 ×3.0',
      xMult: 3.0, freezeAud: true, maxLv: 1 },

    { id: 'cast_biaoge', name: '表格 C', emoji: '📋',
      rarity: 'epic', track: 'shourong', tags: ['职场', '荒诞'],
      desc: '每张污点牌桥段 +4',
      addDrama: { per: 'SCAR', value: 4 }, addMult: 1.0, maxLv: 1 },

    { id: 'cast_zoulang', name: '走廊', emoji: '🚪',
      rarity: 'epic', track: 'houshi', tags: ['荒诞', '无人知晓'],
      desc: '倍率 ×1.8',
      xMult: 1.8, maxLv: 1 },

    { id: 'cast_chaobei', name: '朝北', emoji: '🩸',
      rarity: 'rare', track: 'yeli', tags: ['家庭', '慢性'],
      desc: '倍率 +0.8',
      addMult: 0.8, maxLv: 2 },

    { id: 'cast_ganzhi', name: '感知', emoji: '🪄',
      rarity: 'rare', track: 'mofa', tags: ['奇幻'],
      desc: '倍率 +0.7',
      addMult: 0.7, maxLv: 3 },

    // ── 延寿型超自然与科幻终点牌 ─────────────────────────
    { id: 'cast_yongye', name: '永夜合同', emoji: '🌒', rarity: 'epic',
      track: 'mofa', tags: ['奇幻', '慢性'], desc: '倍率 +1.0，寿命上限 +45',
      addMult: 1.0, lifespan: 45, maxLv: 1 },
    { id: 'cast_dengxin', name: '灯芯', emoji: '🕯️', rarity: 'rare',
      track: 'mofa', tags: ['奇幻', '家庭'], desc: '倍率 +0.6，寿命上限 +20',
      addMult: 0.6, lifespan: 20, maxLv: 1 },
    { id: 'cast_dongmian', name: '冬眠舱', emoji: '🧊', rarity: 'epic',
      track: 'kehuan', tags: ['科幻', '献祭'], desc: '倍率 +1.1，寿命上限 +60',
      addMult: 1.1, lifespan: 60, maxLv: 1 },
    { id: 'cast_yuanshi', name: '原始样本', emoji: '🧬', rarity: 'rare',
      track: 'kehuan', tags: ['科幻', '慢性'], desc: '倍率 +0.7，寿命上限 +25',
      addMult: 0.7, lifespan: 25, maxLv: 1 },
  ], 'content/cast.js#anomaly');
})(typeof globalThis !== 'undefined' ? globalThis : this);
