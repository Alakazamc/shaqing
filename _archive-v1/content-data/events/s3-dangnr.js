/* S3 当红 18–29 岁
 * 正典：docs/SYSTEM.md §1.3（决策点 4，续订阈值 700）
 *
 * 连贯性（authoring.md §2.10）：
 *   本季是职业接入点。同一情境在不同职业下写不同文案，
 *   不做通用文案 + 占位符替换——那读起来仍然是模板。
 */
(function (g) {
  g.BH.define.events([
    // ── 入职：三条轨道各自的第一份工作 ─────────────────
    { id: 'e_job_liushui', season: 3, kind: 'decision', weight: 14,
      include: 'AGE>=18 & JOB=[""] & (FLAG?["f_zhongzhuan"] | FLAG?["f_luobang"])',
      text: '中专实习把你送进做电器外壳的车间。带班师傅把工牌挂到你胸前，' +
            '指着夜班签到表说：晚上多两百，但下班时电梯只开货梯。' +
            '白灯从早到晚照着传送带，铝屑会钻进鞋底。',
      drama: 16, tropes: [], tags: ['职场', '苦熬'],
      options: [
        { text: '在夜班名单上签字', drama: 18,
          effect: { MNY: 2, STR: -1, AUD: 3 },
          grant: { job: 'job_liushui', cast: ['cast_dayuanzhong'] },
          track: { shushu: 1 } },
        { text: '只签白班，少拿那两百', drama: 12,
          effect: { MNY: 1, SPR: 1 },
          grant: { job: 'job_liushui' },
          track: { shushu: 1 } },
      ] },

    { id: 'e_job_wenyuan', season: 3, kind: 'decision', weight: 14,
      include: 'AGE>=21 & JOB=[""] & INT>=6',
      text: '你投了十七份简历，只有一家档案外包公司让你去面试。' +
            '办公室在旧商场后面，要转两趟公交；面试官把一箱未拆封的合同推过来，' +
            '问你能不能把每一页的日期和盖章位置录进表格。',
      drama: 16, tropes: [], tags: ['职场'],
      options: [
        { text: '记下两趟公交的时间，接受这份工作', drama: 18,
          effect: { MNY: 2, AUD: 3 },
          grant: { job: 'job_wenyuan' },
          track: { dushu: 1 } },
        { text: '把简历再投一周，暂时不签', drama: 14,
          effect: { MNY: -1, SPR: -1, AUD: 2 },
          grant: { flag: ['f_dengguo'] } },
      ] },

    { id: 'e_job_daibi', season: 3, kind: 'decision', weight: 14,
      include: 'AGE>=18 & JOB=[""] & FLAG?["f_shangshou"]',
      text: '陪玩群里有人发来一张段位截图，问你能不能替他把账号打上去。' +
            '价钱按小时算，凌晨那档最贵；对方要求你不能登录自己的账号，' +
            '还要在每局结束后把战绩截图发给他。',
      drama: 18, tropes: [], tags: ['网络', '竞技'],
      options: [
        { text: '接凌晨的单，先把自己的账号放一边', drama: 22,
          effect: { MNY: 2, STR: -1, SPR: 1, AUD: 5 },
          grant: { job: 'job_daibi', cast: ['cast_shoulian'] },
          track: { dianjing: 1 } },
        { text: '只接白天的单，不动通宵价', drama: 14,
          effect: { MNY: 1, AUD: 2 },
          grant: { job: 'job_daibi' },
          track: { dianjing: 1 } },
      ] },

    { id: 'e_job_kanshan', season: 3, kind: 'decision', weight: 14,
      include: 'AGE>=18 & JOB=[""] & FLAG?["f_houshan"]',
      text: '林场招巡护员，住在半山的板房里，一个月只下山两次领补给。' +
            '老头替你把介绍信压在棋盘底下，只说「你去」。' +
            '招工表上的紧急联系人一栏，他已经替你写了自己的名字。',
      drama: 18, tropes: [], tags: ['山野', '苦熬'],
      options: [
        { text: '带上介绍信去板房报到', drama: 20,
          effect: { MNY: 1, STR: 1, SPR: 2, AUD: 2 },
          grant: { job: 'job_kanshan', cast: ['cast_dazuoye'] },
          track: { xiuxian: 1 } },
        { text: '把介绍信留在棋盘下，先下山找活', drama: 16,
          effect: { CHR: 1, AUD: 4 },
          tropes: ['xiashan'],
          grant: { cast: ['cast_xiashuidao'] } },
      ] },
  ], 'content/events/s3-dangnr.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ── flavor：按职业分流，同一情境不同职业不同文案 ──────────── */
(function (g) {
  g.BH.define.events([
    { id: 'e_s3_f01', season: 3, kind: 'flavor', weight: 10,
      include: 'JOB=["job_liushui"]',
      text: '你租的房子朝北，中午十二点开灯，晚上八点也开灯。' +
            '下班回来第一件事是把工服挂在门后，它自己能立住。',
      drama: 10, tropes: [], tags: ['家庭', '疲惫'] },

    { id: 'e_s3_f02', season: 3, kind: 'flavor', weight: 10,
      include: 'JOB=["job_wenyuan"]',
      text: '甲方把你的方案发到群里，说「大家看看这个」。' +
            '群里安静了四分钟，然后有人发了个表情。' +
            '你把文件重命名成 v7。',
      drama: 13, tropes: [], tags: ['职场', '破防'] },

    { id: 'e_s3_f03', season: 3, kind: 'flavor', weight: 10,
      include: 'JOB=["job_daibi"]',
      text: '客户要求赢，不要求好看。你连着上了六个小时，' +
            '战绩发过去，对方只回了个「收到」。转账是第二天早上到的。',
      drama: 12, tropes: [], tags: ['网络', '竞技'] },

    { id: 'e_s3_f04', season: 3, kind: 'flavor', weight: 10,
      include: 'JOB=["job_kanshan"]',
      text: '巡山一趟四个小时，路上只有你和一台对讲机。' +
            '第八个月你开始能听出是哪种鸟。没人可以说这件事。',
      drama: 12, tropes: [], tags: ['山野'] },

    { id: 'e_s3_f05', season: 3, kind: 'flavor', weight: 9,
      include: 'JOBYEARS>=4',
      text: '你在这儿干了{jobyears}年。新来的人问你什么时候能转正，' +
            '你说了个数，他脸上的表情变了一下。',
      drama: 15, tropes: [], tags: ['职场', '麻木'] },

    { id: 'e_s3_f06', season: 3, kind: 'flavor', weight: 10,
      text: '医生说没什么大事。挂号费 300。' +
            '你把单子折起来放进外套内侧的口袋，那里已经有两张了。',
      drama: 13, tropes: [], tags: ['慢性'] },

    { id: 'e_s3_f07', season: 3, kind: 'flavor', weight: 9,
      include: 'FLAG?["f_faguo"] & AUD>15',
      text: '你发的那条有 4 万赞。你妈打电话来，问你什么时候找个正经工作。' +
            '你说这就是工作。她说「哦」，然后问你吃饭了没。',
      drama: 20, tropes: ['chuquan'], tags: ['网络'] },

    { id: 'e_s3_f08', season: 3, kind: 'flavor', weight: 9,
      include: 'FLAG?["f_mom_ill"] & AGE>=24',
      text: '你妈的腰这次是真的不行了，住了九天。' +
            '你请假回去，在医院走廊的椅子上睡了两晚。' +
            '她一直说让你回去上班。',
      drama: 22, tropes: ['bingdao'], tags: ['家庭', '慢性'] },

    { id: 'e_s3_f09', season: 3, kind: 'flavor', weight: 9,
      include: 'TRACK=["dianjing"] & TRACKLV>=2',
      text: '队里换人。公告发出来，你的名字在「感谢」那一栏，' +
            '排在第三个。评论区有人问那三个人是谁。',
      drama: 16, tropes: ['tuisai'], tags: ['竞技', '破防'] },

    { id: 'e_s3_f10', season: 3, kind: 'flavor', weight: 8,
      text: '连着上了四个月，没休整过一个整天。' +
            '体检报告上有三个箭头，你拍了张照发给自己，然后关掉。',
      drama: 15, tropes: ['bingdao'], tags: ['疲惫', '慢性'] },

    { id: 'e_s3_f11', season: 3, kind: 'flavor', weight: 8,
      include: 'AUD>20',
      text: '有人在评论里叫你老师。你想「我连社保都是自己交的」，' +
            '然后回了个笑脸。',
      drama: 17, tropes: [], tags: ['网络'] },
  ], 'content/events/s3-dangnr.js#f');
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ── decision：加码 / 收手，以及晋升 ────────────────────── */
(function (g) {
  g.BH.define.events([
    // 晋升事件已移到 content/events/promote.js，改用 e_promo_ 前缀，
    // 由晋升保底优先调度（原来挤在普通决策池里，tier 2 职业全部进不去）

    { id: 'e_s3_d01', season: 3, kind: 'decision', weight: 10,
      include: 'AGE>=20 & AUD>8',
      text: '你下班回到出租屋，工服还没脱就开了直播。' +
            '你说了句关于老板的话，有人截出八秒，配上字幕发到同城群。' +
            '评论区开始问你是不是那家厂的人。',
      drama: 18, tropes: ['fanche'], tags: ['网络', '失控'],
      options: [
        { text: '把老板也说出来', escalate: true, drama: 25,
          effect: { AUD: 12, SPR: -2, HOOK: 3 },
          tropes: ['chuquan'],
          grant: { cast: ['cast_chouxiang'], flag: ['f_chuquan'] } },
        { text: '删掉那八秒', drama: 6,
          effect: { AUD: -4, SPR: 1 },
          grant: { scar: ['scar_shixin'] } },
        { text: '关播去洗碗', restraint: true, drama: 0,
          effect: { AUD: -4, SPR: 1, HOOK: -4 }, grant: {} },
      ] },

    { id: 'e_s3_d02', season: 3, kind: 'decision', weight: 10,
      include: 'AGE>=23',
      text: '对接人从下午发到凌晨，钱是平时六倍，地点另发，内容“不违法”。' +
            '他把合同拍给你，甲方一栏空着，签名页已经折过一次。',
      drama: 20, tropes: [], tags: ['投机', '职场'],
      options: [
        { text: '先签了再说', escalate: true, drama: 22,
          effect: { MNY: 5, SPR: -2, AUD: 6, HOOK: 3 },
          tropes: ['qianyue'],
          grant: { scar: ['scar_qianzhai'], cast: ['cast_dayuanzhong'] } },
        { text: '问清甲方是谁', drama: 10,
          effect: { INT: 1, MNY: 1 }, grant: {} },
        { text: '把这活推掉', restraint: true, drama: 0,
          effect: { MNY: -1, SPR: 1, HOOK: -3 }, grant: {} },
      ] },

    { id: 'e_s3_d05', season: 3, kind: 'decision', weight: 10,
      include: 'AGE>=21 & AUD>10',
      text: '你三年前写过一段话，有人把前后两句裁掉，只留下最适合转发的那句。' +
            '配图里写着你的名字。两千个人开始替你解释原意。',
      drama: 20, tropes: ['chuquan'], tags: ['网络', '失控'],
      options: [
        { text: '顺着这句话往下说', escalate: true, drama: 28,
          effect: { AUD: 10, SPR: -2, HOOK: 4 },
          tropes: ['chuquan'],
          grant: { cast: ['cast_wanghong'] } },
        { text: '把原文贴出来', drama: 8,
          effect: { AUD: -2, INT: 1 }, grant: {} },
        { text: '关掉手机睡觉', restraint: true, drama: 0,
          effect: { AUD: -3, SPR: 1, HOOK: -4 }, grant: {} },
      ] },

    { id: 'e_s3_d06', season: 3, kind: 'decision', weight: 10,
      include: 'AGE>=25 & AUD>18',
      text: '编导发来一页提纲。第一问是“你那时候是不是想过算了”，' +
            '第二问是“现在还会吗”。他们说可以不回答，标题已经排好。',
      drama: 24, tropes: [], tags: ['舞台', '表演'],
      options: [
        { text: '把那段讲完', escalate: true, drama: 34,
          effect: { AUD: 12, SPR: -3, HOOK: 4 },
          tropes: ['chuquan'],
          grant: { cast: ['cast_chouxiang'], scar: ['scar_heiliao'] } },
        { text: '只回答事实', drama: 12,
          effect: { AUD: 3, CHR: 1 }, grant: {} },
        { text: '不去录', restraint: true, drama: 0,
          effect: { AUD: -5, SPR: 1, HOOK: -4 }, grant: {} },
      ] },

    { id: 'e_s3_d03', season: 3, kind: 'decision', weight: 8,
      include: 'TRACKLV>=3',
      text: '你交上去的东西被人看了三遍。对方在便利店把手机推给你，' +
            '说可以给你半年时间，但你得先辞掉现在的工作。' +
            '合同没有抬头，转账日期写好了。',
      drama: 24, tropes: [], tags: ['献祭'],
      options: [
        { text: '把工牌交回去', escalate: true, drama: 30,
          effect: { MNY: -4, SPR: -1, AUD: 10, HOOK: 3 },
          tropes: ['baishi'],
          grant: { cast: ['cast_pofang'], loseJob: true } },
        { text: '两边一起做', drama: 14,
          effect: { STR: -2, SPR: -2, AUD: 4 },
          grant: { scar: ['scar_jiuchang'] } },
        { text: '继续按现在的来', restraint: true, drama: 0,
          effect: { SPR: 1, HOOK: -3 }, grant: {} },
      ] },

    { id: 'e_s3_d04', season: 3, kind: 'decision', weight: 8,
      include: 'TRACK=["xiuxian"] & TRACKLV>=3',
      text: '老头不在，门口只剩一本没有封皮的册子，石头下面压着一张车票。' +
            '第一页写着“慎入”，末页写着你今天的日期。',
      drama: 26, tropes: [], tags: ['修仙', '山野'],
      options: [
        { text: '按第一页做', escalate: true, drama: 32,
          effect: { STR: 2, SPR: -3, AUD: 8, HOOK: 3 },
          grant: { cast: ['cast_zhuji'], flag: ['f_zhuji'] },
          track: { xiuxian: 2 } },
        { text: '先把册子收好', restraint: true, drama: 0,
          effect: { SPR: 1, HOOK: -3 }, grant: {} },
      ] },
  ], 'content/events/s3-dangnr.js#d');
})(typeof globalThis !== 'undefined' ? globalThis : this);
