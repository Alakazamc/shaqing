/* 网红 / 说唱轨道事件（04-tracks.md §8.4）
 * 这两条是"没考上大学"分流出来的现实路径。
 * 文案要写具体的数字与琐事，不写"追梦"。
 */
(function (g) {
  g.BH.define.events([
    // ── 网红 flavor ───────────────────────────────────
    { id: 'e_wh_f01', season: 3, kind: 'flavor', weight: 12,
      include: 'TRACK=["wanghong"]',
      text: '你播了六个小时，同时在线最高十一人，' +
            '其中三个是你高中同学。有人刷了一个一块钱的礼物，' +
            '你念了他的名字，念错了。',
      drama: 14, tropes: [], tags: ['网络', '表演'] },

    { id: 'e_wh_f02', season: 3, kind: 'flavor', weight: 12,
      include: 'TRACK=["wanghong"] & AUD>=20',
      text: '一条视频突然起来了。评论里有人问你是哪个学校的，' +
            '有人说见过你在超市搬东西。你把那条评论置顶了。',
      drama: 20, tropes: ['chuquan'], tags: ['网络'] },

    { id: 'e_wh_f03', season: 3, kind: 'flavor', weight: 10,
      include: 'JOB=["job_zhubo"] & JOBYEARS>=3',
      text: '播到第{jobyears}年，你已经知道几点开播人最多。' +
            '嗓子在冬天会哑，你备了两种含片。',
      drama: 18, tropes: [], tags: ['网络', '疲惫'] },

    { id: 'e_wh_f04', season: 4, kind: 'flavor', weight: 10,
      include: 'TRACK=["wanghong"] & AUD>=40',
      text: '有人在超市认出你，说「你是不是那个」。' +
            '你说是。他拍了张照，没说要发到哪儿。',
      drama: 24, tropes: [], tags: ['网络', '街面'] },

    // ── 网红 decision：撞疲劳的那一刻 ────────────────────
    { id: 'e_wh_d01', season: 3, kind: 'decision', weight: 12,
      include: 'TRACK=["wanghong"] & AUD>=18',
      text: '数据掉了两周。后台的建议是「保持更新频率」。' +
            '你翻自己以前的东西，发现涨得最好那条是骂人的。' +
            '评论区还有人在等你骂下一个。',
      drama: 26, tropes: ['fanche'], tags: ['网络', '表演'],
      options: [
        { text: '再骂一个', escalate: true, drama: 36,
          effect: { AUD: 14, SPR: -3, HOOK: 4 },
          tropes: ['fanche'],
          grant: { cast: ['cast_chouxiang'], scar: ['scar_heiliao'] } },
        { text: '换个方向试试', drama: 16,
          effect: { AUD: 2, INT: 1, SPR: -1 },
          grant: { cast: ['cast_wanghong'] } },
        { text: '停更一个月', restraint: true, drama: 0,
          effect: { AUD: -10, SPR: 2, HOOK: -4 }, grant: {} },
      ] },

    // ── 说唱 flavor ───────────────────────────────────
    { id: 'e_sc_f01', season: 3, kind: 'flavor', weight: 12,
      include: 'TRACK=["shuochang"]',
      text: '地下室的音响一边有杂音。你上台唱了两首，' +
            '底下站着十四个人，其中五个是别的表演者。' +
            '散场分到八十块，路费一百二。',
      drama: 16, tropes: [], tags: ['街面', '说唱'] },

    { id: 'e_sc_f02', season: 3, kind: 'flavor', weight: 10,
      include: 'JOB=["job_dixia"] & JOBYEARS>=2',
      text: '你写了三十多首，只有四首唱得下去。' +
            '手机备忘录里存着一百多条半句话。',
      drama: 18, tropes: [], tags: ['说唱', '苦熬'] },

    { id: 'e_sc_f03', season: 4, kind: 'flavor', weight: 10,
      include: 'TRACK=["shuochang"] & TRACKLV>=2',
      text: '有人翻唱了你的东西，播放量比你的原版高六倍。' +
            '他在简介里写了你的名字，拼错了一个字。',
      drama: 26, tropes: ['chuquan'], tags: ['说唱', '网络'] },

    // ── 说唱 decision ─────────────────────────────────
    { id: 'e_sc_d01', season: 3, kind: 'decision', weight: 12,
      include: 'TRACK=["shuochang"] & AGE>=22',
      text: '有个节目在招人，要求签三年，内容方向由制作方定。' +
            '同一批去面试的还有那个翻唱你的人。' +
            '合同里有一条写着「不得使用原有名义演出」。',
      drama: 30, tropes: [], tags: ['说唱', '投机'],
      options: [
        { text: '签', escalate: true, drama: 40,
          effect: { MNY: 5, AUD: 14, SPR: -3, HOOK: 4 },
          tropes: ['qianyue'],
          grant: { scar: ['scar_shixin'], cast: ['cast_wanghong'] } },
        { text: '不签，接着在地下室唱', restraint: true, drama: 0,
          effect: { MNY: -1, SPR: 2, HOOK: -4 },
          grant: {}, track: { shuochang: 1 } },
      ] },

    // ── 落榜的回响（echo，必须引用 EVT）──────────────────
    { id: 'e_echo_luobang', season: 4, kind: 'echo', weight: 14,
      include: 'EVT?["e_ws_kao_fail"] & AGE>=36',
      text: '当年考上的那几个人现在在群里聊房贷。' +
            '有人问你在做什么，你说了。他说「这个好，自由」。' +
            '底下没人接话。',
      drama: 28, tropes: [], tags: ['校园', '麻木'] },

    { id: 'e_echo_fudu', season: 4, kind: 'echo', weight: 14,
      include: 'EVT?["e_ws_kao_near"] & FLAG?["f_fudu"] & AGE>=38',
      text: '复读那年的教室现在是杂物间。你回学校办事路过，' +
            '门开着，最后一排的桌子还在原来的位置。',
      drama: 30, tropes: [], tags: ['校园'] },
  ], 'content/events/wanghong.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* 入职事件（17-jobs.md §0）
 * id 用 e_job_ 前缀，入职保底才能识别。
 *
 * 这两个职业原本在 jobs.js 里定义了 entry 条件，但没有任何事件授予它们，
 * 于是 job_zhubo / job_dixia 事实上不可达——定义了却进不去。
 * 这类"孤儿职业"现在由 seal 断言拦下。
 */
(function (g) {
  g.BH.define.events([
    {
      id: 'e_job_zhubo', season: 3, kind: 'decision', weight: 16,
      include: 'AGE>=18 & JOB=[""] & FLAG?["f_jiaqi"]',
      text: '你把手机架在书桌上，用两本书垫高。' +
            '第一场播了四十分钟，进来过三个人，其中一个是走错的。' +
            '平台给新号有流量扶持，前七天。',
      drama: 20, tropes: ['chudao'], tags: ['网络', '表演'],
      options: [
        { text: '每天都播', escalate: true, drama: 26,
          effect: { MNY: 1, SPR: -1, AUD: 7, HOOK: 2 },
          grant: { job: 'job_zhubo', cast: ['cast_wanghong'] },
          track: { wanghong: 1 } },
        { text: '一周播两次', drama: 16,
          effect: { MNY: 1, AUD: 4, SPR: 1 },
          grant: { job: 'job_zhubo' },
          track: { wanghong: 1 } },
      ]
    },

    {
      id: 'e_job_dixia', season: 3, kind: 'decision', weight: 16,
      include: 'AGE>=18 & JOB=[""] & FLAG?["f_dixiashi"]',
      text: '地下室每周五有场子，报名要交三十块。' +
            '你写了两首，只有一首唱得下去。' +
            '主办问你艺名叫什么，你当场想了一个。',
      drama: 22, tropes: ['chudao'], tags: ['街面', '说唱'],
      options: [
        { text: '上台', escalate: true, drama: 28,
          effect: { MNY: -1, SPR: 2, AUD: 6, HOOK: 2 },
          grant: { job: 'job_dixia', cast: ['cast_xiashuidao'] },
          track: { shuochang: 1 } },
        { text: '这次先听，下次再唱', drama: 14,
          effect: { SPR: 1, AUD: 2, INT: 1 },
          grant: { job: 'job_dixia' },
          track: { shuochang: 1 } },
      ]
    },
  ], 'content/events/wanghong.js#job');
})(typeof globalThis !== 'undefined' ? globalThis : this);
