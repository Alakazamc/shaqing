/* S2 出道 12–17 岁
 * 正典：docs/SYSTEM.md §1.3（决策点 2，续订阈值 90）
 *
 * 连贯性（authoring.md §2.10）：本季引用 EVT（童年选择）、FLAG（父母状况）、
 * 并在末尾接上第一份职业。
 */
(function (g) {
  g.BH.define.events([
    // ── flavor ────────────────────────────────────────
    { id: 'e_s2_f01', season: 2, kind: 'flavor', weight: 10,
      text: '你在课桌角上刻字，刻到第三笔上课了。' +
            '那个字一直是半个。后来换座位，你专门去看了一眼，还在。',
      drama: 7, tropes: [], tags: ['校园'] },

    { id: 'e_s2_f02', season: 2, kind: 'flavor', weight: 10,
      text: '月考排名贴在走廊尽头。你从后往前找自己的名字，' +
            '找到了，又从前往后确认了一遍。围观的人比名单长。',
      drama: 8, tropes: [], tags: ['校园', '疲惫'] },

    { id: 'e_s2_f03', season: 2, kind: 'flavor', weight: 10,
      include: 'EVT?["e_s1_d01"] & FLAG?["f_bushuo"]',
      text: '老师又问了一次谁想当班长。这次没有人举手，' +
            '包括那个每次考第一的。她说「那就还是他」。',
      drama: 10, tropes: [], tags: ['校园'] },

    { id: 'e_s2_f04', season: 2, kind: 'flavor', weight: 9,
      include: 'FLAG?["f_mom_ill"]',
      text: '你妈去了一次医院，回来说是老毛病，开了三盒药。' +
            '第二盒还没吃完她就上班了。剩下那盒放在冰箱上面。',
      drama: 12, tropes: ['bingdao'], tags: ['家庭', '慢性'] },

    { id: 'e_s2_f05', season: 2, kind: 'flavor', weight: 9,
      include: 'TRACK=["xiuxian"]',
      text: '老头让你每天站两个小时，不许靠墙。你问站着有什么用，' +
            '他说「站着就行」。第十七天你发现自己不数时间了。',
      drama: 11, tropes: [], tags: ['山野', '苦熬'] },

    { id: 'e_s2_f06', season: 2, kind: 'flavor', weight: 9,
      include: 'TRACK=["shushu"]',
      text: '你连着两天没出门。外卖盒在桌上摞到比水杯高的时候，' +
            '你把它们挪到了地上。',
      drama: 9, tropes: [], tags: ['家庭', '逃避'] },

    { id: 'e_s2_f07', season: 2, kind: 'flavor', weight: 8,
      text: '亲戚问你考多少分。你说了。他说「哦」，' +
            '转头开始讲他儿子在市里的学校。你妈在旁边一直点头。',
      drama: 10, tropes: [], tags: ['家庭', '破防'] },

    { id: 'e_s2_f08', season: 2, kind: 'flavor', weight: 8,
      include: 'SEX=["sex_nv"]',
      text: '你把头发剪短了。理发师问要不要拍张照，你说不用。' +
            '第二天有三个人问你是不是失恋了。',
      drama: 10, tropes: [], tags: ['舞台'] },

    { id: 'e_s2_f09', season: 2, kind: 'flavor', weight: 8,
      include: 'SEX=["sex_nan"]',
      text: '你在楼梯间哭了一次，被人看见。那人说「男的哭什么」。' +
            '你想「哦」，然后把眼泪擦了，跟他一起下楼。',
      drama: 10, tropes: [], tags: ['破防'] },

    { id: 'e_s2_f10', season: 2, kind: 'flavor', weight: 8,
      include: 'FLAG?["f_dad_absent"]',
      text: '你爸过年回来待了六天。走的那天早上你还在睡，' +
            '醒了看见桌上放着两百块和一张纸条，写着「好好读书」。',
      drama: 13, tropes: [], tags: ['家庭'] },

    // ── decision 1：电竞入口 ───────────────────────────
    { id: 'e_s2_d01', season: 2, kind: 'decision', weight: 10,
      include: 'AGE>=13',
      text: '周末有人叫你出去，说去个地方，两小时，不告诉家里。' +
            '他手里捏着一张网吧的会员卡，边角已经卷了。',
      drama: 12, tropes: [], tags: ['街面'],
      options: [
        { text: '去', drama: 14,
          effect: { STR: 1, SPR: 1, AUD: 3 },
          grant: { flag: ['f_wangba'] },
          track: { shushu: 1 } },
        { text: '不去，回去写作业', drama: 8,
          effect: { INT: 2, CHR: -1 },
          track: { dushu: 1 } },
        { text: '去，然后坐到闭店', drama: 20,
          include: 'FLAG?["f_wangba"]',
          effect: { STR: -1, SPR: 2, AUD: 5 },
          tropes: ['chudao'],
          grant: { flag: ['f_shangshou'], cast: ['cast_shoulian'] },
          track: { dianjing: 1 } },
      ] },

    // ── decision 2：中专分流 + 第一份职业的分岔 ──────────
    { id: 'e_s2_d02', season: 2, kind: 'decision', weight: 10,
      include: 'AGE>=16',
      text: '班主任把你和另外三个人叫到办公室，说建议你们考虑一下中专，' +
            '现在报名还有名额。桌上摆着四张表格，' +
            '姓名那一栏已经填好了，字是她写的。',
      drama: 18, tropes: [], tags: ['校园'],
      options: [
        { text: '签了', drama: 16,
          effect: { MNY: 1, INT: -1, AUD: 4 },
          tropes: ['taoli'],
          grant: { scar: ['scar_shixin'], cast: ['cast_dayuanzhong'],
                   flag: ['f_zhongzhuan'] },
          track: { shushu: 2 } },
        { text: '把表格推回去', drama: 20,
          effect: { INT: 2, SPR: -2, AUD: 6 },
          tropes: ['fanche'],
          grant: { cast: ['cast_aokemu'], flag: ['f_liuxia'] },
          track: { dushu: 2 } },
        { text: '问她自己孩子读哪儿', drama: 26,
          effect: { CHR: 1, SPR: -1, AUD: 9 },
          tropes: ['fanche'],
          grant: { cast: ['cast_chouxiang'], scar: ['scar_heiliao'] } },
      ] },

    // ── decision 3：第一个加码点（真结局需要戏瘾早点起来）──
    { id: 'e_s2_d03', season: 2, kind: 'decision', weight: 12,
      include: 'AGE>=14',
      text: '你随手发的一条东西被转了几百次。' +
            '底下有人问你还有没有别的，有人问你是哪个学校的。' +
            '你妈还不知道这件事。',
      drama: 14, tropes: ['chuquan'], tags: ['网络'],
      options: [
        { text: '有，接着发', escalate: true, drama: 22,
          effect: { AUD: 8, SPR: -1, HOOK: 4 },
          tropes: ['chuquan'],
          grant: { cast: ['cast_wanghong'], flag: ['f_faguo'] } },
        { text: '说没有了', restraint: true, drama: 0,
          effect: { AUD: -2, SPR: 1, HOOK: -2 }, grant: {} },
      ] },
  ], 'content/events/s2-chudao.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
