/* 污点牌
 * 正典：docs/modules/02-cast.md §4
 * 设计红线：removable 永远是 false。不提供任何洗白、赎回、治疗机制。
 * 玩家会去搜"怎么去掉污点"，找不到——这本身是态度表达。
 */
(function (g) {
  g.BH.define.scars([
    { id: 'scar_zhushui', name: '注水', emoji: '💧',
      desc: '全局倍率 ×0.85（可叠加）', mult: 0.85,
      removable: false, tags: ['烂尾'] },
    { id: 'scar_qianzhai', name: '欠账', emoji: '🧾',
      desc: '全局倍率 ×0.9', mult: 0.9,
      removable: false, tags: ['投机'] },
    { id: 'scar_shixin', name: '失信', emoji: '📉',
      desc: '全局倍率 ×0.9', mult: 0.9,
      removable: false, tags: ['职场'] },
    { id: 'scar_jiuchang', name: '旧伤', emoji: '🩼',
      desc: '全局倍率 ×0.92', mult: 0.92,
      removable: false, tags: ['慢性'] },
    { id: 'scar_heiliao', name: '黑料', emoji: '🗃️',
      desc: '全局倍率 ×0.88', mult: 0.88,
      removable: false, tags: ['网络'] },
    // 时间循环到上限强制破环时留下（20-anomaly.md §3.2）
    { id: 'scar_qiyue', name: '那年七月', emoji: '🔁',
      desc: '全局倍率 ×0.9', mult: 0.9,
      removable: false, tags: ['荒诞'] },
  ], 'content/scars.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
