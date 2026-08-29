/* 场景：平台加码（S4）
 * 正典：docs/modules/16-scenes.md §6
 *
 * 这是全游戏最重的一段。前四拍不是铺垫，是玩家自己一步一步爬上去的；
 * 第五拍的「放弃」因此是放弃自己的劳动，不是放弃一个抽象数字。
 *
 * 节拍文案上限 30 字（比普通事件短一半，靠密度和推进感成立）。
 * 全部 kind: 'beat' + noRandom: true
 */
(function (g) {
  g.BH.define.events([
    { id: 'e_sc_jm_b1', kind: 'beat', noRandom: true, weight: 0,
      text: '平台的人加了你微信。头像是公司 logo。',
      drama: 0, tropes: [], tags: ['职场'] },

    { id: 'e_sc_jm_b2', kind: 'beat', noRandom: true, weight: 0,
      text: '他们把数据摆出来。你那条的完播率是行业均值的四倍。',
      drama: 21, tropes: [], tags: ['网络'] },

    { id: 'e_sc_jm_b3', kind: 'beat', noRandom: true, weight: 0,
      text: '合同发过来了，条款很简单。签字栏已经空好了。',
      drama: 35, tropes: ['qianyue'], tags: ['职场', '投机'] },

    { id: 'e_sc_jm_b4', kind: 'beat', noRandom: true, weight: 0,
      text: '你妈打电话问你最近在忙什么。你说在忙。',
      drama: 51, tropes: [], tags: ['家庭'] },

    // 第五拍：加码与收手必须在同一节拍内（断言 64）
    // 因为「放弃 N 分」要拿本节拍所有选项的最高潜在收视来算
    { id: 'e_sc_jm_b5', kind: 'beat', noRandom: true, weight: 0,
      text: '只要你再演一次那个梗。',
      drama: 0, tropes: [], tags: ['表演'],
      options: [
        { text: '演。签了', escalate: true, drama: 62,
          effect: { MNY: 6, AUD: 16, SPR: -3, HOOK: 3 },
          tropes: ['chuquan'],
          grant: { cast: ['cast_chouxiang'], scar: ['scar_heiliao'] } },
        // 文案要坦然承认这是个亏的选项。
        // 「回家吃饭」而不是「坚守自我」——后者在暗示这是正确答案，违反 C7
        { text: '不演了。回家吃饭', restraint: true, drama: 0,
          effect: { AUD: -10, SPR: 2, HOOK: -4 },
          grant: {} },
      ] },
  ], 'content/events/scene-jiama.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
