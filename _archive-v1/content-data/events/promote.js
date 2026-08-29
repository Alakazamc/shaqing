/* 晋升事件（17-jobs.md §1）
 * id 用 e_promo_ 前缀，晋升保底才能识别。
 *
 * 每条职业阶梯各自一条晋升事件：同一情境在不同职业下写不同文案，
 * 不做通用文案 + 占位符替换（17-jobs.md §3.3 禁止）。
 *
 * 门槛统一放宽到 JOBYEARS>=3：原来的 >=4 加上"要恰好落在决策年"，
 * 实测 6 个 tier 2 职业全部从未出现。
 */
(function (g) {
  g.BH.define.events([
    // ── 流水线 → 组长 ────────────────────────────────
    {
      id: 'e_promo_zuzhang', kind: 'decision', weight: 16,
      include: 'JOB=["job_liushui"] & JOBYEARS>=3',
      text: '线长调走后，车间主任在食堂把饭卡推到你面前。' +
            '他说每月加三百，先让你盯三号线的交接；' +
            '以后谁迟到、哪箱货没贴标签，都要由你在月底的说明会上解释。',
      drama: 24, tropes: [], tags: ['职场'],
      options: [
        { text: '拿走饭卡，接下三号线', escalate: true, drama: 30,
          effect: { MNY: 2, SPR: -2, AUD: 7, HOOK: 2 },
          tropes: ['qianyue'],
          grant: { job: 'job_zuzhang', cast: ['cast_dayuanzhong'],
                   flag: ['f_shengzhi'] } },
        { text: '把饭卡推回去，只做自己的工位', restraint: true, drama: 0,
          effect: { SPR: 2, HOOK: -3 }, grant: {} },
      ]
    },

    // ── 文员 → 主管 ─────────────────────────────────
    {
      id: 'e_promo_zhuguan', kind: 'decision', weight: 16,
      include: 'JOB=["job_wenyuan"] & JOBYEARS>=3',
      text: '部门重组，打印出来的新架构图把你的名字挪到两个人上面。' +
            'HR 说这是好事，随后把绩效表和一支红笔放到你桌上。' +
            '那两个人的加薪、调岗和离开，从下个月起都要先经过你。',
      drama: 26, tropes: [], tags: ['职场'],
      options: [
        { text: '在新岗位说明上签名', escalate: true, drama: 32,
          effect: { MNY: 3, SPR: -2, AUD: 8, HOOK: 2 },
          tropes: ['qianyue'],
          grant: { job: 'job_zhuguan', cast: ['cast_dayuanzhong'],
                   flag: ['f_shengzhi'] } },
        { text: '申请留在原岗，不给同事打分', restraint: true, drama: 0,
          effect: { SPR: 2, HOOK: -3 }, grant: {} },
      ]
    },

    // ── 代练 → 职业选手 ──────────────────────────────
    {
      id: 'e_promo_xuanshou', kind: 'decision', weight: 16,
      include: 'JOB=["job_daibi"] & JOBYEARS>=2 & TRACKLV>=2',
      text: '城南的队伍发来试训通知：两周包住，白天复盘，晚上打训练赛。' +
            '教练把你的数据页翻到最后，说操作没问题，' +
            '但合同是一年一签，输掉首发位置就只剩替补房的床位。',
      drama: 30, tropes: ['chudao'], tags: ['竞技'],
      options: [
        { text: '带着键盘去试训两周', escalate: true, drama: 38,
          effect: { MNY: 2, STR: -2, AUD: 12, HOOK: 3 },
          tropes: ['qianyue'],
          grant: { job: 'job_xuanshou', cast: ['cast_baoli'] },
          track: { dianjing: 1 } },
        { text: '留在网吧继续接单', restraint: true, drama: 0,
          effect: { MNY: 1, SPR: 1, HOOK: -3 }, grant: {} },
      ]
    },

    // ── 看山的 → 道人 ───────────────────────────────
    {
      id: 'e_promo_daoren', kind: 'decision', weight: 16,
      include: 'JOB=["job_kanshan"] & JOBYEARS>=3 & TRACKLV>=2',
      text: '山下的人把病历袋放在巡护站的木桌上，问你能不能替他父亲看看。' +
            '你说自己只负责巡路，他还是留下两百块，约定下个月带弟弟再来。' +
            '第三个人来的时候，已经知道你住哪间板房。',
      drama: 30, tropes: [], tags: ['山野', '修仙'],
      options: [
        { text: '收下病历，开始替人看事', escalate: true, drama: 36,
          effect: { MNY: 2, SPR: 2, AUD: 9, HOOK: 3 },
          grant: { job: 'job_daoren', cast: ['cast_dazuoye'] },
          track: { xiuxian: 1 } },
        { text: '把钱装回病历袋，劝他们去医院', restraint: true, drama: 0,
          effect: { SPR: 2, MNY: -1, HOOK: -3 }, grant: {} },
      ]
    },

    // ── 主播 → 达人 ─────────────────────────────────
    {
      id: 'e_promo_daren', kind: 'decision', weight: 16,
      include: 'JOB=["job_zhubo"] & AUD>=22',
      text: '第一个商务把一箱代餐粉放到你直播桌旁，脚本上写着：' +
            '「我自己一直在吃，晚上也不饿」。你拆开一袋，闻起来像奶粉，' +
            '但你从没吃过；对方说今晚九点前必须把链接挂上。',
      drama: 30, tropes: [], tags: ['网络', '投机'],
      options: [
        { text: '照脚本说自己一直在吃', escalate: true, drama: 38,
          effect: { MNY: 3, SPR: -2, AUD: 10, HOOK: 3 },
          tropes: ['qianyue'],
          grant: { job: 'job_daren', scar: ['scar_shixin'],
                   cast: ['cast_wanghong'] } },
        { text: '改成「我听说不错」，承担少拿一半', drama: 20,
          effect: { MNY: 2, AUD: 4, INT: 1 },
          grant: { job: 'job_daren' } },
        { text: '把样品和脚本一起退回去', restraint: true, drama: 0,
          effect: { SPR: 2, AUD: -4, HOOK: -3 }, grant: {} },
      ]
    },

    // ── 地下说唱 → 出味了 ────────────────────────────
    {
      id: 'e_promo_chuwei', kind: 'decision', weight: 16,
      include: 'JOB=["job_dixia"] & JOBYEARS>=2 & TRACKLV>=2',
      text: '有人把你的歌录在出租屋的墙上，播放量是原版的六倍。' +
            '评论区只问翻唱的人是谁，没人提原唱；厂牌的人却把你的歌词截图发来，' +
            '约你去见面，第一句话是「你东西挺特别」，合同在第二页等着签名。',
      drama: 32, tropes: ['chuquan'], tags: ['说唱', '网络'],
      options: [
        { text: '带着母带去见厂牌的人', escalate: true, drama: 40,
          effect: { MNY: 2, SPR: -1, AUD: 12, HOOK: 3 },
          tropes: ['qianyue'],
          grant: { job: 'job_chuwei', cast: ['cast_wanghong'] },
          track: { shuochang: 1 } },
        { text: '不回消息，回地下室继续录', restraint: true, drama: 0,
          effect: { SPR: 2, HOOK: -3 },
          grant: {}, track: { shuochang: 1 } },
      ]
    },
  ], 'content/events/promote.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
