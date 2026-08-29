/* S5 收尾 50–70 岁
 * 正典：docs/SYSTEM.md §1.3（决策点 2，无续订阈值，终局与死法在此结算）
 * 反讽乘数 Iro 在本季兑现——玩家在这里为自己的人生挑一个收尾。
 */
(function (g) {
  g.BH.define.events([
    // ── flavor ────────────────────────────────────────────
    { id: 'e_s5_f01', season: 5, kind: 'flavor', weight: 10,
      text: '你换了个手机。旧的那个还能开机，放在抽屉里。',
      drama: 16, tropes: [], tags: ['家庭', '麻木'] },
    { id: 'e_s5_f02', season: 5, kind: 'flavor', weight: 10,
      text: '有人整理了一份名单，把你放在「早期」那一栏。',
      drama: 20, tropes: [], tags: ['网络'] },
    { id: 'e_s5_f03', season: 5, kind: 'flavor', weight: 10,
      text: '楼下开了家新店。三个月后又换了一家。',
      drama: 14, tropes: [], tags: ['街面'] },
    { id: 'e_s5_f04', season: 5, kind: 'flavor', weight: 8,
      include: 'SCARN>=4',
      text: '有人问你后不后悔。你说了个别的事。',
      drama: 22, tropes: [], tags: ['麻木'] },
    { id: 'e_s5_f05', season: 5, kind: 'flavor', weight: 8,
      include: 'AUD<15',
      text: '你发了一条，两个赞。其中一个是自己点的。',
      drama: 18, tropes: [], tags: ['网络', '无人知晓'] },

    // ── decision 1：复出还是收 ────────────────────────────
    { id: 'e_s5_d01', season: 5, kind: 'decision', weight: 10,
      include: 'AGE>=52',
      text: '回顾专题发来三个问题，附件里还放着你二十多岁时的一段旧录像。' +
            '制片人说不需要准备，坐下来照着看就行。出镜费够付一年的水电。',
      drama: 24, tropes: [], tags: ['舞台'],
      options: [
        { text: '坐到镜头前', escalate: true, drama: 36,
          effect: { AUD: 12, SPR: -2, HOOK: 2 },
          tropes: ['fuchu'],
          grant: { cast: ['cast_wanghong'] } },
        { text: '把答案发过去', restraint: true, drama: 0,
          effect: { AUD: -6, SPR: 1, HOOK: -3 },
          grant: {} },
      ] },

    // ── decision 2：为收尾挑 tag。反讽乘数在此埋定 ──────────────
    { id: 'e_s5_d02', season: 5, kind: 'decision', weight: 10,
      include: 'AGE>=60',
      text: '你清理书柜，翻出一个旧硬盘、两张医院缴费单和一张已经停用的门禁卡。' +
            '每一样都能想起一个地址，只有硬盘还打不开。',
      drama: 22, tropes: [], tags: ['家庭'],
      options: [
        { text: '一件不动', drama: 18,
          effect: { SPR: 1 },
          grant: { flag: ['f_liuzhe'] } },
        { text: '先扔掉纸张', drama: 20,
          effect: { SPR: -1, MNY: 1 },
          grant: { flag: ['f_rengdiao'] } },
        { text: '寄给那个人', drama: 28,
          effect: { CHR: 1, AUD: 4 },
          tropes: ['chongfeng'],
          grant: { flag: ['f_jichu'] } },
      ] },
  ], 'content/events/s5-shouwei.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
