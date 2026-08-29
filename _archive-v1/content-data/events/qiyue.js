/* 时间循环：永无止境的七月（20-anomaly.md §3）
 *
 * 机制要点：循环本身几乎不得分，因为疲劳系数把重播的收视吃掉了，
 * 而水位不记入 WLOG 所以振幅也冻结。玩家必须想办法出去。
 *
 * 大部分选项是"试了但没用"（选过即消耗），只有一个带 breaks 是出口。
 * 出口不设门槛——第一轮就能选，只是破环收益随轮数递增，
 * 所以贪心的玩家会想多熬几轮。
 *
 * 循环内不得出现 restraint 选项（§3.4）：循环里本来就没有分可放弃，
 * 在这里放收手会让 C7 的判定变廉价。
 */
(function (g) {
  g.BH.define.events([
    // ── 入口 ─────────────────────────────────────────
    {
      id: 'e_qy_entry', season: 4, kind: 'decision', weight: 6,
      include: 'AGE>=30 & AGE<=45 & SPRBAND<=1',
      exclude: 'LOOPED=1',
      text: '七月十四号，星期二。你妈昨晚打过一通电话，你看见了，没有回。' +
            '早上煮了两个鸡蛋，一个裂了。你把闹钟定到六点。' +
            '第二天，鸡蛋完整，未接来电还在。',
      drama: 26, tropes: [], tags: ['荒诞'], fx: 'sig-bad',
      options: [
        { text: '再睡一次看看', drama: 20,
          effect: { SPR: -2 },
          grant: { loop: 'e_qy_loop', flag: ['f_qiyue'] },
          track: { qiyue: 1 } },
        { text: '照常出门上班', drama: 12,
          effect: { SPR: 1 },
          grant: {} },
      ]
    },

    // ── 循环本体：六个动作 + 一个出口 ─────────────────────
    {
      id: 'e_qy_loop', kind: 'chain', noRandom: true, weight: 0,
      text: '七月十四号，星期二。鸡蛋完整。楼下的狗在六点十七分叫了两声。' +
            '手机显示一通来自你妈的未接来电，时间是昨天。',
      drama: 8, tropes: [], tags: ['荒诞'], fx: 'sig-bad',
      options: [
        { id: 'a', text: '把鸡蛋敲开', drama: 6,
          effect: { SPR: -1 }, grant: {} },
        { id: 'b', text: '去问狗的主人', drama: 6,
          effect: { SPR: -1, STR: -1 }, grant: {} },
        { id: 'c', text: '关机坐最早的车', drama: 8,
          effect: { SPR: -1 }, grant: {} },
        { id: 'd', text: '给公司发请假消息', drama: 8,
          effect: { SPR: -1, CHR: -1 }, grant: {} },
        { id: 'e', text: '把这天写进备忘录', drama: 8,
          effect: { INT: 1, SPR: -1 }, grant: {} },
        { id: 'f', text: '去敲隔壁的门', drama: 10,
          effect: { SPR: -1, MNY: -1 }, grant: {} },
        // 出口：玩家一开始不愿意选的那个
        { id: 'out', text: '把那通电话回了', breaks: true,
          escalate: true, drama: 12,
          effect: { SPR: 2, AUD: 8, HOOK: 2 },
          grant: { cast: ['cast_pofang'], flag: ['f_huidianhua'] },
          track: { qiyue: 1 } },
      ]
    },

    // ── 回响 ─────────────────────────────────────────
    {
      id: 'e_echo_qiyue', season: 5, kind: 'echo', weight: 12,
      include: 'EVT?["e_qy_entry"] & AGE>=55',
      text: '又是七月十四号。你买了两个鸡蛋，其中一个在袋子里磕裂。' +
            '你先把锅洗了，再把那通电话回了。',
      drama: 30, tropes: [], tags: ['荒诞', '家庭']
    },
  ], 'content/events/qiyue.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
