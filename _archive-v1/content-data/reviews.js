/* 结算页短评模板
 * 正典：docs/modules/07-settlement.md §3
 *
 * 短评属于**观众层**（authoring.md §1.5），因此不受叙述层的零评价规范约束
 * ——恰恰相反，它就是要有观点、要刻薄。
 *
 * 短评永远不夸玩家。这是 C3 的延伸：游戏的评价体系本身是荒谬的，
 * 它只关心好不好看，而且它嘴很碎。
 */
(function (g) {
  g.BH.define.reviews([
    { when: 'lowAmpHighScore', text: '太顺了，没戏。' },
    { when: 'comPenalty', text: '编剧自己都不知道要讲什么。' },
    { when: 'hasZhushui', text: '第二季开始就在硬撑。' },
    { when: 'highIrony', text: '结尾还行，前面白熬了。' },
    { when: 'cancelled', text: '开高走低，建议直接看解说。' },
    { when: 'veryHigh', text: '看完了，但我不推荐任何人看。' },
    { when: 'manyScars', text: '主角每一集都在做最差的选择，我居然看完了。' },
    { when: 'lowAud', text: '这剧有观众吗。' },
    { when: 'default', text: '前期挺有意思，后面就为了流量硬演了。' },
  ]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
