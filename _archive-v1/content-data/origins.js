/* 开局四项：家庭 / 性别 / 性格
 * 正典：docs/modules/11-origin.md
 * A 期每项 3 个选项，只做 T1
 */
(function (g) {
  g.BH.define.origins({
    // ── 家庭：给场景、旗标、可达轨道入口，不给属性加成 ──────────
    // 父母职业决定童年事件池，父母状况决定哪些事件可触发（17-jobs.md §2）
    // 父母不给属性加成——家庭给可能性，不给强度
    family: [
      {
        id: 'fam_shancun', name: '山村', emoji: '⛰️', tier: 1, rarity: 'common',
        desc: '手机信号只有半格。你爸在南方，一年回来一次',
        flags: ['f_shancun'], scene: '山里', income: 0,
        parents: {
          father: { job: 'job_liushui', status: 'absent', note: '在南方的厂里' },
          mother: { job: null, status: 'present', note: '种地，也管你' },
        },
      },
      {
        id: 'fam_xiancheng', name: '县城', emoji: '🏙️', tier: 1, rarity: 'common',
        desc: '楼下有个网吧。你妈在窗口能看见门口',
        flags: ['f_wangba'], scene: '县城', income: 1,
        parents: {
          father: { job: 'job_wenyuan', status: 'present', note: '在单位，话不多' },
          mother: { job: null, status: 'present', note: '开了个小店' },
        },
      },
      {
        id: 'fam_gongfang', name: '工房', emoji: '🏭', tier: 1, rarity: 'common',
        desc: '父母在同一家厂，作息一模一样。你妈的身体一直不太好',
        flags: ['f_gongfang'], scene: '厂区', income: 1,
        parents: {
          father: { job: 'job_liushui', status: 'present', note: '夜班多' },
          mother: { job: 'job_liushui', status: 'ill', note: '腰不好，一直说要去看' },
        },
      },
    ],

    // ── 性别：三落点。颜与体用同一起点区间，不由性别决定 ─────────
    // 落点一：起点微差（只在 SPR / STR，不碰 CHR）
    // 落点二：观众汇率（双向不对称——两边都有被观众低估的属性）
    // 落点三：各自特有的污点风险
    sex: [
      {
        id: 'sex_nv', name: '女', emoji: '🌷', tier: 1,
        effect: { SPR: 1 },
        // 观众对同一属性的反应不同。游戏不评论，只给它定价。
        audRate: { CHR: 1.4, STR: 0.8, INT: 1.0, MNY: 1.0, SPR: 1.0 },
        eventPool: 'nv',
        scarRisk: { CHR: 'scar_heiliao' },
      },
      {
        id: 'sex_nan', name: '男', emoji: '🧱', tier: 1,
        effect: { STR: 1 },
        audRate: { CHR: 0.85, STR: 1.35, INT: 1.0, MNY: 1.0, SPR: 1.0 },
        eventPool: 'nan',
        scarRisk: { STR: 'scar_jiuchang' },
      },
      {
        id: 'sex_wei', name: '未定', emoji: '🌫️', tier: 1,
        effect: {},
        audRate: { CHR: 1.1, STR: 1.1, INT: 0.9, MNY: 1.0, SPR: 0.95 },
        eventPool: 'wei',
        scarRisk: {},
      },
    ],

    // ── 性格：相当于开局人设牌，必须有正有负 ────────────────────
    personality: [
      { id: 'per_ningba', name: '拧巴', emoji: '🫥', tier: 1,
        desc: '倍率 +0.6，心 -1',
        addMult: 0.6, effect: { SPR: -1 } },
      { id: 'per_reqing', name: '自来熟', emoji: '🫱', tier: 1,
        desc: '倍率 +0.4，观众 +2，智 -1',
        addMult: 0.4, effect: { AUD: 2, INT: -1 } },
      { id: 'per_muran', name: '木讷', emoji: '🪵', tier: 1,
        desc: '桥段 +5，颜 -1',
        addDrama: 5, effect: { CHR: -1 } },
    ],
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
