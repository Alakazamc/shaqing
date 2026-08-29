/* 异常轨道事件（20-anomaly.md）
 *
 * 每条轨道有独占机制，不是换皮：
 *   收容   把超自然当成要填表的工作
 *   后室   AUD 增长被切断
 *   夜里的人 寿命极长但 AUD 上限锁 30
 *   披风   能力与曝光是同一件事，直接喂 HOOK
 *
 * 硬底线（§0）：即使走了异常轨道，一局里四分之三的事件仍是普通生活。
 * 房租、体检、你妈打电话——这些不能因为你成了吸血鬼就消失。
 * 正是它们让异常显得异常。
 */
(function (g) {
  g.BH.define.events([
    // ══ 入口：都读起来像普通选项（C4）═══════════════════
    { id: 'e_an_biaoge', season: 3, kind: 'decision', weight: 8,
      include: 'AGE>=22 & INT>=10 & JOB=["job_wenyuan"]',
      text: '你在档案室把一摞旧合同按年份重新装盒，最底下那份没有甲方盖章。' +
            '午休时，来面试的单位把录用通知推过来：岗位叫资料整理，' +
            '月薪高一截，唯一的问题是「能不能不跟家里说工作内容」。',
      drama: 24, tropes: [], tags: ['职场'],
      options: [
        { text: '答应只在家里说自己还在整理资料', escalate: true, drama: 30,
          effect: { MNY: 3, SPR: -2, AUD: 6, HOOK: 2 },
          grant: { flag: ['f_biaoge'] },
          track: { shourong: 1 } },
        { text: '把录用通知带回去，先问清楚再决定', restraint: true, drama: 0,
          effect: { SPR: 1, HOOK: -3 }, grant: {} },
      ] },

    { id: 'e_an_zoucuo', season: 4, kind: 'decision', weight: 6,
      include: 'SPRBAND<=1 & AGE>=30',
      text: '你在财务室改完一张报销单，抱着文件夹走去盖章。' +
            '平时三分钟的走廊今天没有尽头，门牌从 304 直接跳到 306。' +
            '你回头，身后的打印机还在响，来的方向却也只剩一条走廊。',
      drama: 30, tropes: [], tags: ['荒诞'], fx: 'sig-bad',
      options: [
        { text: '沿着门牌继续找盖章室', escalate: true, drama: 34,
          effect: { SPR: -3, AUD: -4, HOOK: 2 },
          grant: { flag: ['f_zoucuo'], scar: ['scar_jiuchang'] },
          track: { houshi: 1 } },
        { text: '靠墙坐下，等保洁来开灯', restraint: true, drama: 0,
          effect: { SPR: 1, HOOK: -2 }, grant: {} },
      ] },

    { id: 'e_an_yeban', season: 4, kind: 'decision', weight: 6,
      include: 'AGE>=25 & (JOB=["job_liushui"] | JOB=["job_zhubo"])',
      text: '你连续两年上夜班，凌晨四点在便利店对着微波炉发呆。' +
            '体检单上只有「建议调整作息」，医生把这句话圈了两遍。' +
            '下班时，楼下那个人替你按住电梯门，说自己有一份只在夜里做的活。',
      drama: 28, tropes: [], tags: ['慢性'],
      options: [
        { text: '跟他走到街角，把活的内容听完', escalate: true, drama: 36,
          effect: { STR: 3, SPR: -2, AUD: -3, HOOK: 3 },
          grant: { flag: ['f_yeban'] },
          track: { yeli: 1 } },
        { text: '拿着体检单去申请白班', restraint: true, drama: 0,
          effect: { STR: 1, SPR: 2, HOOK: -3 }, grant: {} },
      ] },

    { id: 'e_an_chushou', season: 3, kind: 'decision', weight: 6,
      include: 'AGE>=20 & STR>=10',
      text: '你拎着两袋菜走过路口，一辆车冲上人行道。' +
            '你先把穿反光背心的小孩拽回电线杆旁，塑料袋在脚边裂开，' +
            '土豆滚了一地。路人的手机已经举起来，回放里你的手快得不像平时。',
      drama: 32, tropes: ['chuquan'], tags: ['街面'],
      options: [
        { text: '捡起土豆，留下来接受采访', escalate: true, drama: 42,
          effect: { AUD: 16, SPR: -2, HOOK: 4 },
          tropes: ['chuquan'],
          grant: { flag: ['f_chushou'], cast: ['cast_wanghong'] },
          track: { pifeng: 1 } },
        { text: '只说没看清，拎着破袋子离开', restraint: true, drama: 0,
          effect: { AUD: -5, SPR: 2, HOOK: -4 },
          grant: { flag: ['f_chushou'] } },
      ] },

    // ══ 收容：先是填表的工作，规则从备注栏里长出来 ════════
    { id: 'e_sr_f01', season: 4, kind: 'flavor', weight: 12,
      include: 'TRACK=["shourong"]',
      text: '早班先清点防护服，再给编号 1174 换水。' +
            '它今天要三次投喂，第三次前你得在表格 C 上签「情绪稳定」。' +
            '你签完，发现备注栏已经替你写好了「同上」，字迹和你的一样。',
      drama: 20, tropes: [], tags: ['职场', '荒诞'] },

    { id: 'e_sr_f02', season: 4, kind: 'flavor', weight: 12,
      include: 'TRACK=["shourong"]',
      text: '月度演习前，你把工牌翻到正面，顺手给新来的同事贴好鞋套。' +
            '广播说这是演习，重复了两遍。第三遍点到你的名字，' +
            '声音停了一下，随后又接着说这是演习。',
      drama: 24, tropes: [], tags: ['职场', '荒诞'], fx: 'sig-bad' },

    { id: 'e_sr_f03', season: 4, kind: 'flavor', weight: 10,
      include: 'TRACK=["shourong"] & TRACKLV>=2',
      text: '你带新人做月末盘点。他指着 1174 的空柜问里面到底放过什么，' +
            '你让他先核对铅封，再把问题写进交接本。' +
            '那一页最后只有一句「同上」，落款是六年前的你。',
      drama: 26, tropes: [], tags: ['职场', '麻木'] },

    // ══ 后室：普通差事还在继续，但没人能把它讲给谁听 ═════
    { id: 'e_hs_f01', season: 4, kind: 'flavor', weight: 12,
      include: 'TRACK=["houshi"]',
      text: '你下班前把外卖盒扔进垃圾桶，按习惯从消防通道回家。' +
            '墙纸是那种发旧的黄色，转过第七个角后，门牌又回到 203。' +
            '没有窗，头顶的灯却一直像午休时间那样亮。',
      drama: 22, tropes: [], tags: ['荒诞', '无人知晓'], fx: 'sig-bad' },

    { id: 'e_hs_f02', season: 4, kind: 'flavor', weight: 12,
      include: 'TRACK=["houshi"]',
      text: '你在门框上贴了一张便利贴，写着「周五给妈妈回电话」。' +
            '走过三段走廊，便利贴还在，胶带却贴到了另一面。' +
            '你把电话打出去，听见自己的手机在更远的地方响。',
      drama: 24, tropes: [], tags: ['荒诞'], fx: 'sig-bad' },

    { id: 'e_hs_f03', season: 5, kind: 'flavor', weight: 10,
      include: 'TRACK=["houshi"] & TRACKLV>=2',
      text: '手机早就没电了，你还是每周五把它放在走廊尽头的插座旁。' +
            '家里的群消息停在「你到哪了」，日期已经翻过很多次。' +
            '插座旁没有电，屏幕偶尔会亮一下。',
      drama: 28, tropes: [], tags: ['无人知晓', '麻木'] },

    // ══ 夜里的人：明确的取舍，不是纯增益 ══════════════════
    { id: 'e_yl_f01', season: 4, kind: 'flavor', weight: 12,
      include: 'TRACK=["yeli"]',
      text: '你搬进朝北的房子，白天拉两层窗帘，晚上出门倒垃圾。' +
            '房东把收据塞进门缝，问你为什么从不在白天交房租。' +
            '你把现金夹在账本里，等天黑再下楼。',
      drama: 20, tropes: [], tags: ['家庭'] },

    { id: 'e_yl_f02', season: 5, kind: 'flavor', weight: 12,
      include: 'TRACK=["yeli"]',
      text: '同学聚会前，群里让大家把合照发到相册。' +
            '你站在最边上，手机里明明有那一刻，上传后却只剩旁边的空地。' +
            '有人问你是不是临时没来，你回了一个「嗯」。',
      drama: 30, tropes: [], tags: ['荒诞', '无人知晓'], fx: 'sig-bad' },

    { id: 'e_yl_f03', season: 5, kind: 'flavor', weight: 10,
      include: 'TRACK=["yeli"] & AGE>=70',
      text: '你去参加葬礼，在签到表上写下名字，认识的人只剩四个。' +
            '灵堂里的小孩指着照片问你和那个人什么关系。' +
            '你看了一眼照片，说：「以前一起上过夜班。」',
      drama: 34, tropes: [], tags: ['慢性', '无人知晓'] },

    // ══ 披风：能力与曝光是同一件事 ═══════════════════════
    { id: 'e_pf_f01', season: 4, kind: 'flavor', weight: 12,
      include: 'TRACK=["pifeng"]',
      text: '你出手了三次，两次被拍到。' +
            '本地论坛有个帖子在猜你是谁，已经八十七楼。',
      drama: 26, tropes: [], tags: ['街面', '网络'] },

    { id: 'e_pf_d01', season: 4, kind: 'decision', weight: 12,
      include: 'TRACK=["pifeng"] & AGE>=32',
      text: '又是同一个路口。这次有摄像头，也有直播的人。' +
            '你算了一下，出手大概能救下两个，但今晚之后' +
            '就没有人不知道你住在哪一栋。',
      drama: 34, tropes: [], tags: ['街面', '表演'],
      options: [
        { text: '出手', escalate: true, drama: 46,
          effect: { AUD: 18, SPR: -3, STR: -2, HOOK: 4 },
          tropes: ['chuquan'],
          grant: { cast: ['cast_wanghong'], scar: ['scar_heiliao'] } },
        { text: '等警察来', restraint: true, drama: 0,
          effect: { AUD: -8, SPR: 2, HOOK: -4 }, grant: {} },
      ] },
  ], 'content/events/anomaly.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
