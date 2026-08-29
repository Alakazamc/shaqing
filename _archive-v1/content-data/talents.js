/* 开局天赋（三选一，沿用原作）
 * 正典：docs/modules/11-origin.md §6
 * A 期 12 个。其中「反社会人格」是 BRIEF C3 的审查基准：
 *   它让每张污点牌 +1.0 倍率，于是"活成一团糟"在数值上是最优解，
 *   被腰斩反而是构筑燃料——游戏用自己的计分公式否定自己的道德框架。
 */
(function (g) {
  g.BH.define.talents([
    { id: 'tal_fanshehui', name: '反社会人格', emoji: '🧊', rarity: 'legend',
      tags: ['失控', '献祭'], desc: '每张污点牌倍率 +1.0',
      addMult: { per: 'SCAR', value: 1.0 } },
    { id: 'tal_jixinghao', name: '记性好', emoji: '📚', rarity: 'common',
      tags: ['校园'], desc: '智 +3', effect: { INT: 3 } },
    { id: 'tal_pishi', name: '皮实', emoji: '🐭', rarity: 'common',
      tags: ['街面'], desc: '体 +2，心 +1', effect: { STR: 2, SPR: 1 } },
    { id: 'tal_haokan', name: '长得还行', emoji: '🌷', rarity: 'common',
      tags: ['舞台'], desc: '颜 +3', effect: { CHR: 3 } },
    { id: 'tal_jiadi', name: '家底', emoji: '🍸', rarity: 'rare',
      tags: ['家庭'], desc: '钱 +4', effect: { MNY: 4 } },
    { id: 'tal_shoubai', name: '手白', emoji: '🖱️', rarity: 'rare',
      tags: ['竞技'], desc: '体 +1，倍率 +0.3',
      effect: { STR: 1 }, addMult: { per: 'fixed', value: 0.3 } },
    { id: 'tal_zaoshu', name: '早熟', emoji: '🌱', rarity: 'rare',
      tags: ['校园'], desc: '智 +2，心 -1', effect: { INT: 2, SPR: -1 } },
    { id: 'tal_lianmo', name: '脸皮厚', emoji: '🧱', rarity: 'rare',
      tags: ['表演'], desc: '每 10 点观众倍率 +0.1',
      addMult: { per: 'AUD10', value: 0.1 } },
    { id: 'tal_yunqi', name: '运气这回事', emoji: '🎰', rarity: 'rare',
      tags: ['赌', '投机'], desc: '桥段 +5', addDrama: { per: 'fixed', value: 5 } },
    { id: 'tal_lingmin', name: '灵敏', emoji: '👁', rarity: 'rare',
      tags: ['灵异'], desc: '心 -2，倍率 +0.6',
      effect: { SPR: -2 }, addMult: { per: 'fixed', value: 0.6 } },
    { id: 'tal_naoze', name: '闹着玩', emoji: '🤡', rarity: 'common',
      tags: ['网络'], desc: '倍率 +0.25',
      addMult: { per: 'fixed', value: 0.25 } },
    { id: 'tal_shanmin', name: '山里人', emoji: '⛰️', rarity: 'common',
      tags: ['山野'], desc: '体 +2', effect: { STR: 2 } },
  ], 'content/talents.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
