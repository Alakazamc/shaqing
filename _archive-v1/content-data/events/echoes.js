/* 回响事件（echo）
 * 正典：docs/modules/17-jobs.md §3.2、docs/content/authoring.md §2.10
 *
 * 定义：kind: 'echo'，专门指涉多年前发生过的事，**只能靠 EVT 门槛进池**。
 * 这是"这是我的人生"感觉的主要来源。
 *
 * 每条的 include 必须引用 EVT（seal 会检查）。
 */
(function (g) {
  g.BH.define.events([
    // ── 那张中专表格的回响 ────────────────────────────
    { id: 'e_echo_biao', season: 4, kind: 'echo', weight: 14,
      include: 'EVT?["e_s2_d02"] & AGE>=34',
      text: '有人把当年那张表格拍进同学群，问四个人后来去了哪。' +
            '签过的人报了三个城市。你没发，班主任只回了句「收到」。',
      drama: 24, tropes: [], tags: ['校园', '麻木'] },

    { id: 'e_echo_liuxia', season: 4, kind: 'echo', weight: 14,
      include: 'EVT?["e_s2_d02"] & FLAG?["f_liuxia"] & AGE>=36',
      text: '当年跟你一起被叫到办公室的四个人，有三个签了。' +
            '你是没签的那个。今年同学会上，' +
            '有人说「还是你当时有主意」。你想不起自己当时想的是什么。',
      drama: 28, tropes: [], tags: ['校园', '破防'] },

    // ── 网吧那张会员卡 ────────────────────────────────
    { id: 'e_echo_wangba', season: 4, kind: 'echo', weight: 12,
      include: 'EVT?["e_s2_d01"] & AGE>=35',
      text: '那家网吧改成了奶茶店。门口的玻璃还在，前台的位置摆着取餐架。' +
            '你拿到小票，店员问你要不要办会员。',
      drama: 26, tropes: [], tags: ['街面', '麻木'] },

    // ── 第一条发出去的东西 ────────────────────────────
    { id: 'e_echo_faguo', season: 4, kind: 'echo', weight: 12,
      include: 'EVT?["e_s2_d03"] & FLAG?["f_faguo"] & AGE>=38',
      text: '有人把你十几年前那条挖出来，说「原来他早就这样」。' +
            '底下有人问「他是谁」。' +
            '那条东西你自己都忘了具体写的是什么。',
      drama: 30, tropes: ['fuchu'], tags: ['网络'] },

    // ── 母亲的腰 ──────────────────────────────────────
    { id: 'e_echo_mom', season: 4, kind: 'echo', weight: 14,
      include: 'EVT?["e_s3_f08"] & AGE>=40',
      text: '你妈现在走路要扶着东西。她还是说没事。' +
            '你把当年那张「建议复查」的单子找出来，' +
            '发现日期是二十多年前，纸已经黄了。',
      drama: 32, tropes: ['bingdao'], tags: ['家庭', '慢性'] },

    { id: 'e_echo_dad', season: 4, kind: 'echo', weight: 12,
      include: 'EVT?["e_s2_f10"] & AGE>=42',
      text: '你爸退了，回来住。他每天早上六点就醒，' +
            '在客厅坐着，不开灯。你问他要不要出去走走，他说「不用」。' +
            '他的手指关节还是那样。',
      drama: 30, tropes: [], tags: ['家庭'] },

    // ── 后山与老头 ────────────────────────────────────
    { id: 'e_echo_houshan', season: 5, kind: 'echo', weight: 14,
      include: 'EVT?["e_s1_d02"] & FLAG?["f_houshan"] & AGE>=52',
      text: '后山那条路封了，说要修。你站在封条前面，' +
            '发现自己记不清当年是从哪个口上去的。' +
            '水缸大概早就没了。',
      drama: 34, tropes: [], tags: ['山野', '无人知晓'] },

    // ── 那次收手 ──────────────────────────────────────
    { id: 'e_echo_shoushou', season: 5, kind: 'echo', weight: 14,
      include: 'HOOKP>=10 & HOOK<=6 & AGE>=55',
      text: '当年推掉的访谈在电视上重播。主持人已经换了，片头还用了你那年的一句话。' +
            '你听完开头，去把电视关了。',
      drama: 30, tropes: [], tags: ['舞台', '麻木'] },

    // ── 职业的回响 ────────────────────────────────────
    { id: 'e_echo_job', season: 5, kind: 'echo', weight: 12,
      include: 'JOBLOG?["job_liushui"] & AGE>=54',
      text: '你在地图上搜那家厂，定位落在一座商场中间。' +
            '手机导航说“已到达”，你站在喷泉旁边，没找到门。',
      drama: 30, tropes: [], tags: ['职场', '无人知晓'] },

    { id: 'e_echo_shengzhi', season: 5, kind: 'echo', weight: 12,
      include: 'FLAG?["f_shengzhi"] & AGE>=56',
      text: '你带过的那批人里有一个现在做得比你好。' +
            '他过年发消息问你近况，称呼还是当年那个。' +
            '你回了四个字：都还行。',
      drama: 28, tropes: [], tags: ['职场'] },
  ], 'content/events/echoes.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
