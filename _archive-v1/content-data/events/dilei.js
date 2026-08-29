/* 地雷系事件线（04-tracks.md §8.5）
 *
 * 入口是**纯事件链 + 高中阶段**，不引用任何属性键。
 * 理由与跨性别线相同：把入口挂在"心低"上，
 * 等于用机制断言这类身份源于精神状态不好，那是病理化。
 *
 * 内容红线（content/authoring.md §4）：
 *   写状态与后果，不写过程与方法
 *   不浪漫化，也不说教
 *   不猎奇——桥段基数与其他轨道同档
 *   不用梗，全程平实中文
 *
 * 带分叉退出（13-eventlines.md §3）：退出是另一条完整的路，不是更少的路。
 */
(function (g) {
  g.BH.define.events([
    // ── 入口：表达链。只引用 AGE 与 FLAG ─────────────────
    { id: 'e_dl_s1', kind: 'chain', noRandom: true, weight: 0,
      include: 'AGE>=15 & AGE<=17 & FLAG?["f_bushuo"]',
      text: '你开了一个没人认识你的号，把想说的写在上面。' +
            '第一条有两个赞，其中一个是自己点的。' +
            '你把头像换成了一张模糊的照片。',
      drama: 14, tropes: [], tags: ['网络'],
      options: [
        { text: '接着写', drama: 16,
          effect: { SPR: 1, AUD: 3 },
          grant: { cast: ['cast_hanxiu'], flag: ['f_dl_xie'] },
          track: { dilei: 1 } },
        { text: '删了', drama: 10,
          effect: { SPR: -1 },
          grant: { cast: ['cast_paozao'] } },
      ] },

    { id: 'e_dl_s2', kind: 'chain', noRandom: true, weight: 0,
      include: 'FLAG?["f_dl_xie"] & AGE>=16',
      text: '那个号有了三百多个关注。有人半夜给你发消息，' +
            '说看你的东西看到哭。你回了很长一段，' +
            '发出去之后又觉得说太多了。',
      drama: 20, tropes: [], tags: ['网络'],
      options: [
        { text: '继续聊', escalate: true, drama: 24,
          effect: { SPR: 2, AUD: 5, HOOK: 2 },
          grant: { cast: ['cast_shejiao'], flag: ['f_dl_liao'] },
          track: { dilei: 1 } },
        { text: '不回了', drama: 14,
          effect: { SPR: -1, AUD: 2 },
          grant: { cast: ['cast_zhaipin'] },
          track: { dilei: 1 } },
      ] },

    { id: 'e_dl_s3', kind: 'chain', noRandom: true, weight: 0,
      include: 'FLAG?["f_dl_xie"] & AGE>=19',
      text: '你把那个号的名字改了，用的是自己想了很久的四个字。' +
            '现实里没有人知道这个号。两边的你都在正常运转。',
      drama: 26, tropes: [], tags: ['网络'],
      options: [
        { text: '让两边继续分开', escalate: true, drama: 32,
          effect: { SPR: 2, CHR: 1, AUD: 8, HOOK: 2 },
          grant: { cast: ['cast_pofang'], flag: ['f_dl_liangbian'] },
          track: { dilei: 2 } },
      ] },

    // ── 分叉：从阶段 2 岔出。不是"回到正常"，是另一种稳定 ──
    { id: 'e_dl_f2a', kind: 'chain', noRandom: true, weight: 0,
      include: 'FLAG?["f_dl_xie"]',
      text: '你把号设成了仅自己可见。那些东西还在，只是不再有人看。' +
            '你偶尔翻回去看，翻到一半就退出来。',
      drama: 22, tropes: [], tags: ['网络'],
      options: [
        { text: '就这样放着', drama: 20,
          effect: { SPR: 1, AUD: 3 },
          grant: { cast: ['cast_paozao'] },
          track: { dilei: 1 } },
      ] },

    { id: 'e_dl_f2b', kind: 'chain', noRandom: true, weight: 0,
      include: 'FLAG?["f_dl_xie"]',
      text: '后来你在别的地方交到了朋友，是当面认识的那种。' +
            '那个号一直没删，密码也没改。',
      drama: 26, tropes: [], tags: ['家庭'],
      options: [
        { text: '不再提它', drama: 24,
          effect: { SPR: 2, CHR: 1, AUD: 4 },
          grant: { cast: ['cast_shejiao'] } },
        { text: '有一次讲给别人听了', drama: 28,
          effect: { CHR: 1, SPR: 1, AUD: 6 },
          grant: { cast: ['cast_shejiao', 'cast_hanxiu'] } },
      ] },

    // ── 回响 ─────────────────────────────────────────
    { id: 'e_echo_dilei', season: 4, kind: 'echo', weight: 12,
      include: 'EVT?["e_dl_s1"] & AGE>=35',
      text: '那个平台改版了，早年的内容不再显示时间。' +
            '你登进去看了一次，最上面那条还是十几年前写的。',
      drama: 28, tropes: [], tags: ['网络', '麻木'] },
  ], 'content/events/dilei.js');

  g.BH.define.eventlines([
    {
      id: 'el_dilei', name: null, track: 'dilei',
      stages: 3, minGap: 1, maxGap: 8,
      chain: ['e_dl_s1', 'e_dl_s2', 'e_dl_s3'],
      forks: [
        { from: 2, chain: ['e_dl_f2a', 'e_dl_f2b'], track: 'dilei', depth: 1 },
      ],
    },
  ], 'content/events/dilei.js#el');
})(typeof globalThis !== 'undefined' ? globalThis : this);
