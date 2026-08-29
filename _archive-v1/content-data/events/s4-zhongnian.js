/* S4 中年 30–49 岁
 * 正典：docs/SYSTEM.md §1.3（决策点 3，其中场景 1–2，续订阈值 15000）
 *       §1.3 硬要求：S4 必须至少有一个场景，且应为加码/收手场景
 * 倍率兑现期。真结局条件 ④（至少一次高价收手在 S4+）的承载点。
 */
(function (g) {
  g.BH.define.events([
    // ── flavor ────────────────────────────────────────────
    { id: 'e_s4_f01', season: 4, kind: 'flavor', weight: 10,
      text: '同学群里有人发了张合照。你放大看了很久，认出四个。',
      drama: 14, tropes: [], tags: ['家庭', '麻木'] },
    { id: 'e_s4_f02', season: 4, kind: 'flavor', weight: 10,
      text: '你开始记不住新认识的人的名字。会照常开完。',
      drama: 13, tropes: [], tags: ['职场', '疲惫'] },
    { id: 'e_s4_f03', season: 4, kind: 'flavor', weight: 10,
      text: '体检加了一项。医生问你以前有没有查过，你说查过，他说「哦」。',
      drama: 15, tropes: ['bingdao'], tags: ['慢性'] },
    { id: 'e_s4_f04', season: 4, kind: 'flavor', weight: 8,
      include: 'AUD>40',
      text: '机场有人认出你，要合影。拍完他说「你比视频里矮」。',
      drama: 22, tropes: [], tags: ['网络', '舞台'] },
    { id: 'e_s4_f05', season: 4, kind: 'flavor', weight: 8,
      include: 'SCARN>=3',
      text: '有人把你几年前的事整理成了一条时间线。转发量比你的新作品高。',
      drama: 24, tropes: ['tafang'], tags: ['网络', '破防'] },
    { id: 'e_s4_f06', season: 4, kind: 'flavor', weight: 8,
      text: '房东说这间以前也租过人。押一付三，他没说付几个月。',
      drama: 18, tropes: [], tags: ['灵异', '家庭'],
      fx: 'sig-bad' },
    { id: 'e_s4_f07', season: 4, kind: 'flavor', weight: 6,
      include: 'MNY>=12',
      text: '你买了个很贵的东西。放在柜子里，一次没用过。',
      drama: 16, tropes: [], tags: ['投机'] },

    // ── decision 1：赔光的常见来源 ─────────────────────────
    { id: 'e_s4_d01', season: 4, kind: 'decision', weight: 10,
      include: 'AGE>=32 & MNY>=8',
      text: '你以前的同事把一沓合同摊在你家餐桌上。' +
            '他说这次不是借钱，是让你把手上的钱变成“以后不用上班的钱”。' +
            '最后一页列着三个陌生人的名字。',
      drama: 28, tropes: [], tags: ['投机', '赌'],
      options: [
        { text: '把存款全转过去', escalate: true, drama: 40,
          effect: { MNY: -9, SPR: -3, AUD: 14, HOOK: 3 },
          tropes: ['peiguang'],
          grant: { scar: ['scar_qianzhai'], cast: ['cast_poguan'] } },
        { text: '只投四成', drama: 20,
          effect: { MNY: -4, AUD: 6, HOOK: 1 },
          tropes: ['toji'],
          grant: { scar: ['scar_qianzhai'] } },
        { text: '把合同推回去', restraint: true, drama: 0,
          effect: { SPR: 1, HOOK: -3 },
          grant: {} },
      ] },

    // ── decision 2：身体 ─────────────────────────────────
    { id: 'e_s4_d02', season: 4, kind: 'decision', weight: 10,
      include: 'AGE>=40',
      text: '复查时医生在报告上圈了一个数字，建议你停三个月。' +
            '手机里同时跳出明天的排班、一个要交的方案和一条未读的家人消息。' +
            '医生问你先处理哪一件。',
      drama: 26, tropes: ['bingdao'], tags: ['慢性', '疲惫'],
      options: [
        { text: '把报告塞回包里', escalate: true, drama: 34,
          effect: { STR: -4, AUD: 8, HOOK: 2 },
          grant: { scar: ['scar_jiuchang'], cast: ['cast_dayuanzhong'] } },
        { text: '请三个月假', restraint: true, drama: 0,
          effect: { STR: 2, AUD: -8, HOOK: -3, SPR: 1 },
          grant: {} },
      ] },
  ], 'content/events/s4-zhongnian.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* 补充：S4 加码 / 收手机会
 * S4 必须承载真结局条件 ④（至少一次高价收手在 S4 或更晚）。
 * 只有两个决策点时，若门槛不满足就完全没有收手机会，条件事实上不可达。
 */
(function (g) {
  g.BH.define.events([
    { id: 'e_s4_d03', season: 4, kind: 'decision', weight: 12,
      include: 'AGE>=34',
      text: '剪辑师拿着你早年的聊天记录来找你，说可以做成一套系列。' +
            '第一集标题已经拟好，封面是你当年发过的那张证件照。' +
            '分成写在最后一页。',
      drama: 30, tropes: [], tags: ['网络', '投机'],
      options: [
        { text: '把整套交给他', escalate: true, drama: 42,
          effect: { MNY: 4, AUD: 14, SPR: -3, HOOK: 4 },
          tropes: ['fuchu'],
          grant: { scar: ['scar_heiliao'], cast: ['cast_wanghong'] } },
        { text: '只给一段', drama: 18,
          effect: { MNY: 2, AUD: 5, HOOK: 1 }, grant: {} },
        { text: '不让他碰', restraint: true, drama: 0,
          effect: { AUD: -7, SPR: 1, HOOK: -4 }, grant: {} },
      ] },

    { id: 'e_s4_d04', season: 4, kind: 'decision', weight: 12,
      include: 'AGE>=44',
      text: '公司把你二十多岁时那段最出圈的片段放在续约书旁边，说观众还记得。' +
            '新合同只改了一个字：工作周期从一年变成三年。',
      drama: 32, tropes: [], tags: ['职场', '表演'],
      options: [
        { text: '按旧办法再拍', escalate: true, drama: 44,
          effect: { MNY: 5, AUD: 12, SPR: -3, HOOK: 4 },
          tropes: ['qianyue'],
          grant: { scar: ['scar_zhushui'] } },
        { text: '把合同放回去', restraint: true, drama: 0,
          effect: { AUD: -9, SPR: 2, HOOK: -4 }, grant: {} },
      ] },
  ], 'content/events/s4-zhongnian.js#2');
})(typeof globalThis !== 'undefined' ? globalThis : this);
