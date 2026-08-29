/* 职业阶梯
 * 正典：docs/modules/17-jobs.md
 * A 期 8 个（4 轨道 × 2 阶梯）。首发目标 40。
 *
 * 职业是让一条命读起来连贯的骨头：它具体、持续、可被文本指涉、会晋升也会丢。
 * entry 条件不得引用 SEX（职业门槛性别中性，17-jobs.md §6 检查 3）
 */
(function (g) {
  g.BH.define.jobs([
    // ── 鼠鼠轨道 ───────────────────────────────────────
    {
      id: 'job_liushui', name: '流水线', emoji: '🔧',
      track: 'shushu', tier: 1, rarity: 'common',
      next: ['job_zuzhang'],
      entry: 'AGE>=17',
      income: 1, wear: { STR: -1 },
      socialWeight: 0.4,
      tags: ['职场', '苦熬'],
      desc: '早八晚八，两班倒',
    },
    {
      id: 'job_zuzhang', name: '组长', emoji: '📋',
      track: 'shushu', tier: 2, rarity: 'rare',
      next: [],
      entry: 'JOB=["job_liushui"] & JOBYEARS>=4',
      income: 2, wear: { SPR: -1 },
      socialWeight: 0.6,
      tags: ['职场', '麻木'],
      desc: '管着十几个人，还是要打卡',
    },

    // ── 读书轨道 ───────────────────────────────────────
    {
      id: 'job_wenyuan', name: '文员', emoji: '🗂️',
      track: 'dushu', tier: 1, rarity: 'common',
      next: ['job_zhuguan'],
      entry: 'AGE>=21 & INT>=6',
      income: 2, wear: { STR: -1 },
      socialWeight: 0.7,
      tags: ['职场'],
      desc: '表格、会议、再一份表格',
    },
    {
      id: 'job_zhuguan', name: '主管', emoji: '💼',
      track: 'dushu', tier: 2, rarity: 'rare',
      next: [],
      entry: 'JOB=["job_wenyuan"] & JOBYEARS>=5',
      income: 4, wear: { SPR: -2 },
      socialWeight: 1.1,
      tags: ['职场', '疲惫'],
      desc: '你现在是那个把方案发到群里的人',
    },

    // ── 电竞轨道 ───────────────────────────────────────
    {
      id: 'job_daibi', name: '代练', emoji: '🖱️',
      track: 'dianjing', tier: 1, rarity: 'common',
      next: ['job_xuanshou'],
      entry: 'AGE>=17 & FLAG?["f_shangshou"]',
      income: 1, wear: { STR: -1, SPR: 1 },
      socialWeight: 0.3,
      tags: ['竞技', '网络'],
      desc: '按小时收钱，凌晨最贵',
    },
    {
      id: 'job_xuanshou', name: '职业选手', emoji: '🎮',
      track: 'dianjing', tier: 2, rarity: 'epic',
      next: [],
      entry: 'JOB=["job_daibi"] & TRACKLV>=2',
      income: 3, wear: { STR: -2 },
      socialWeight: 0.9,
      tags: ['竞技', '亢奋'],
      desc: '有工资，有合同，有替补',
    },

    // ── 修仙轨道 ───────────────────────────────────────
    {
      id: 'job_kanshan', name: '看山的', emoji: '⛰️',
      track: 'xiuxian', tier: 1, rarity: 'common',
      next: ['job_daoren'],
      entry: 'AGE>=18 & FLAG?["f_houshan"]',
      income: 1, wear: {},
      socialWeight: 0.3,
      tags: ['山野', '苦熬'],
      desc: '一个月下山两次',
    },
    {
      id: 'job_daoren', name: '道人', emoji: '🧘',
      track: 'xiuxian', tier: 2, rarity: 'epic',
      next: [],
      entry: 'JOB=["job_kanshan"] & TRACKLV>=3',
      income: 2, wear: { STR: -1, SPR: 2 },
      socialWeight: 0.7,
      tags: ['山野', '修仙'],
      desc: '有人来问事，你收香火钱',
    },
  ], 'content/jobs.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* 补充：网红与说唱轨道的职业阶梯（04-tracks.md §8.4）
 * 这两条是"没考上大学"分流出来的现实路径，不是奇观轨道。
 */
(function (g) {
  g.BH.define.jobs([
    {
      id: 'job_zhubo', name: '主播', emoji: '📱',
      track: 'wanghong', tier: 1, rarity: 'common',
      next: ['job_daren'],
      entry: 'AGE>=18 & FLAG?["f_luobang"]',
      income: 1, wear: { SPR: -1 },
      socialWeight: 0.4,
      tags: ['网络', '表演'],
      desc: '一天播六小时，同时在线两位数',
    },
    {
      id: 'job_daren', name: '达人', emoji: '✨',
      track: 'wanghong', tier: 2, rarity: 'rare',
      next: [],
      entry: 'JOB=["job_zhubo"] & AUD>=25',
      income: 3, wear: { SPR: -2 },
      socialWeight: 0.7,
      tags: ['网络', '表演'],
      desc: '有商务了，也有黑评了',
    },
    {
      id: 'job_dixia', name: '地下说唱', emoji: '🎧',
      track: 'shuochang', tier: 1, rarity: 'common',
      next: ['job_chuwei'],
      entry: 'AGE>=18 & FLAG?["f_luobang"]',
      income: 0, wear: { MNY: -1 },
      socialWeight: 0.3,
      tags: ['街面', '说唱'],
      desc: '一场演出分到八十块，路费一百二',
    },
    {
      id: 'job_chuwei', name: '出味了', emoji: '🔥',
      track: 'shuochang', tier: 2, rarity: 'epic',
      next: [],
      entry: 'JOB=["job_dixia"] & TRACKLV>=2',
      income: 2, wear: { SPR: -1 },
      socialWeight: 0.5,
      tags: ['说唱', '亢奋'],
      desc: '有人翻唱你的东西了',
    },
  ], 'content/jobs.js#2');
})(typeof globalThis !== 'undefined' ? globalThis : this);
