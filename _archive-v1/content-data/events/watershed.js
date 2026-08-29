/* 分水岭事件：18 岁的那场考试
 * 正典：docs/modules/04-tracks.md §8
 *
 * 三个必要条件：固定年份、结果由前情决定（不掷骰子）、分流互斥。
 *
 * "没考上"不是失败分支，是内容最厚的分支——它通向四条轨道，
 * 而"考上了"只通向一条。这个不对称是刻意的：
 * 本作的题材密度在偏离主干的地方，不在主干上。
 */
(function (g) {
  g.BH.define.events([
    // ── 分数够（INT>=12，或 INT>=9 且当年留下来了）─────────
    {
      id: 'e_ws_kao_pass', season: 3, kind: 'decision', weight: 100,
      include: 'AGE=18 & (INT>=12 | (INT>=9 & FLAG?["f_liuxia"]))',
      exclude: 'FLAG?["f_kaowan"]',
      text: '分数出来了，够。你妈把那张纸看了三遍，' +
            '然后拿去给楼下的邻居看。志愿表要填三天，' +
            '你在第一栏写了一个离家很远的城市。',
      drama: 26, tropes: [], tags: ['校园'],
      options: [
        { text: '填远的那个', drama: 24,
          effect: { INT: 2, SPR: 1, AUD: 5 },
          grant: { flag: ['f_kaowan', 'f_kaoshang', 'f_yuanmen'] },
          track: { dushu: 2 } },
        { text: '改成本地的', drama: 18,
          effect: { INT: 1, MNY: 1, SPR: -1, AUD: 3 },
          grant: { flag: ['f_kaowan', 'f_kaoshang'] },
          track: { dushu: 2 } },
      ] },

    // ── 差一点（INT 9–11）：复读 ────────────────────────
    {
      id: 'e_ws_kao_near', season: 3, kind: 'decision', weight: 100,
      include: 'AGE=18 & INT>=9 & INT<=11',
      exclude: 'FLAG?["f_kaowan"] | FLAG?["f_zhongzhuan"]',
      text: '差十几分。复读班的老师说这个分数再来一年很稳，' +
            '学费是六千。你爸没说话，你妈说「你自己想」。' +
            '桌上放着一张已经填了一半的复读报名表。',
      drama: 28, tropes: [], tags: ['校园', '苦熬'],
      options: [
        { text: '再来一年', escalate: true, drama: 30,
          effect: { INT: 3, SPR: -3, MNY: -2, AUD: 6, HOOK: 2 },
          tropes: ['tuisai'],
          grant: { flag: ['f_kaowan', 'f_fudu'], cast: ['cast_aokemu'] },
          track: { dushu: 1 } },
        { text: '不读了', drama: 22,
          effect: { SPR: 1, AUD: 4 },
          tropes: ['taoli'],
          grant: { flag: ['f_kaowan', 'f_luobang'] } },
      ] },

    // ── 没考上（INT<=8 或中专分流）：分流到四条轨道 ─────────
    {
      id: 'e_ws_kao_fail', season: 3, kind: 'decision', weight: 100,
      include: 'AGE=18 & (INT<=8 | FLAG?["f_zhongzhuan"])',
      exclude: 'FLAG?["f_kaowan"]',
      text: '分数出来那天下午下了雨。你在小卖部门口站了很久，' +
            '手机里有七个未接来电，六个是你妈的。' +
            '晚上吃饭没人提这件事，电视一直开着。',
      drama: 30, tropes: [], tags: ['校园', '破防'],
      options: [
        // 三个分流的桥段刻意拉平：初版 24/32/34 让贪心策略
        // 永远选最高的那个，实测「地下说唱」占 85% 而「主播」「流水线」为 0%。
        // 分水岭的价值在于分流真的会分开，不是三选一里有个显然最优。
        { text: '出去找活干', drama: 30,
          effect: { MNY: 2, STR: -1, AUD: 5 },
          grant: { flag: ['f_kaowan', 'f_luobang'] },
          track: { shushu: 1 } },
        { text: '把手机架起来', drama: 31,
          effect: { CHR: 1, SPR: -1, AUD: 9 },
          tropes: ['chudao'],
          grant: { flag: ['f_kaowan', 'f_luobang', 'f_jiaqi'],
                   cast: ['cast_wanghong'] },
          track: { wanghong: 1 } },
        { text: '去那个每周五有人聚的地下室', drama: 31,
          effect: { SPR: 1, MNY: -1, AUD: 7 },
          tropes: ['baishi'],
          grant: { flag: ['f_kaowan', 'f_luobang', 'f_dixiashi'],
                   cast: ['cast_xiashuidao'] },
          track: { shuochang: 1 } },
      ] },
  ], 'content/events/watershed.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
