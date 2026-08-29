/* 科幻轨道事件线
 * 正典：docs/modules/04-tracks.md、13-eventlines.md §5.5
 *
 * 这条线不新增异常引擎规则。它把寿命当成一项可以签约、保存和回访的资源，
 * 终点人设牌分别给出冬眠与样本两种延寿方式。
 */
(function (g) {
  g.BH.define.events([
    { id: 'e_kh_s1', kind: 'chain', noRandom: true, weight: 0,
      include: 'AGE>=25 & INT>=10',
      text: '公司体检报告多了一页，打印时间是明年。页脚写着一家研究所和预约号。' +
            '前台说没人往你的邮箱发过东西。',
      drama: 20, tropes: [], tags: ['科幻', '职场'],
      options: [
        { text: '按预约号打过去', escalate: true, drama: 26,
          effect: { MNY: 2, SPR: -2, AUD: 5, HOOK: 2 },
          grant: { flag: ['f_kehuan'] }, track: { kehuan: 1 } },
        { text: '把报告交回前台', drama: 14,
          effect: { SPR: 1, AUD: 2 },
          grant: { flag: ['f_kehuan'] }, track: { kehuan: 1 } },
      ] },

    { id: 'e_kh_s2', kind: 'chain', noRandom: true, weight: 0,
      include: 'FLAG?["f_kehuan"] & AGE>=28',
      text: '研究所的冷藏层没有窗。护士把一枚写着你生日的金属片放进透明舱，' +
            '问你愿不愿意把十年后的身体先存起来。',
      drama: 28, tropes: [], tags: ['科幻', '献祭'],
      options: [
        { text: '躺进透明舱', escalate: true, drama: 36,
          effect: { STR: -2, SPR: -2, AUD: 10, HOOK: 3 },
          grant: { flag: ['f_kh_sleep'] }, track: { kehuan: 1 } },
        { text: '只签十年随访', fork: 0, drama: 22,
          effect: { MNY: -1, SPR: 1, AUD: 4 },
          grant: { flag: ['f_kh_follow'] }, track: { kehuan: 1 } },
      ] },

    { id: 'e_kh_s3', kind: 'chain', noRandom: true, weight: 0,
      include: 'FLAG?["f_kh_sleep"] & AGE>=32',
      text: '你醒来时，手机日期跳过了两年。研究所给你一份新合同，工资栏为空，' +
            '复查日期排到了你八十岁以后。',
      drama: 38, tropes: ['qianyue'], tags: ['科幻', '献祭'],
      options: [
        { text: '把醒来的年份交给他们', escalate: true, drama: 44,
          effect: { MNY: 3, STR: -1, SPR: -2, AUD: 12, HOOK: 3 },
          grant: { cast: ['cast_dongmian'], flag: ['f_kehuan_done'] },
          track: { kehuan: 1 } },
      ] },

    { id: 'e_kh_f2a', kind: 'chain', noRandom: true, weight: 0,
      include: 'FLAG?["f_kh_follow"] & AGE>=30',
      text: '你每年按合同回来一次。医生只问三件事：睡眠、牙齿、有没有梦见未来。' +
            '报告里你的年龄从未写对。',
      drama: 28, tropes: [], tags: ['科幻', '慢性'],
      options: [
        { text: '按时回来复查', drama: 30,
          effect: { SPR: -1, AUD: 5 },
          grant: { flag: ['f_kh_return'] }, track: { kehuan: 1 } },
      ] },

    { id: 'e_kh_f2b', kind: 'chain', noRandom: true, weight: 0,
      include: 'FLAG?["f_kh_return"] & AGE>=34',
      text: '第十年，研究所搬走，只留下一只冷藏箱和你第一次体检的复印件。' +
            '复印件上的照片比你现在年轻。',
      drama: 34, tropes: ['shilian'], tags: ['科幻', '无人知晓'],
      options: [
        { text: '把样本留下', drama: 36,
          effect: { INT: 2, SPR: 1, AUD: 7 },
          grant: { cast: ['cast_yuanshi'], flag: ['f_kehuan_done'] },
          track: { kehuan: 1 } },
      ] },

    { id: 'e_kh_f01', season: 4, kind: 'flavor', weight: 10,
      include: 'TRACK=["kehuan"]',
      text: '你家冰箱每周三凌晨自动启动。里面没有东西，' +
            '温度却会降到零下十八度，直到你把门打开。',
      drama: 22, tropes: [], tags: ['科幻', '家庭'] },

    { id: 'e_kh_f02', season: 5, kind: 'flavor', weight: 10,
      include: 'TRACK=["kehuan"] & TRACKLV>=2',
      text: '快递员送来一个没有寄件人的纸箱。你签收时看见单号，' +
            '那串数字和你的身份证后八位少了一位。',
      drama: 26, tropes: ['beiwuren'], tags: ['科幻', '街面'] },

    { id: 'e_echo_kehuan', season: 5, kind: 'echo', weight: 12,
      include: 'EVT?["e_kh_s1"] & AGE>=52',
      text: '你把旧体检报告拿去复印。机器吐出两张，第二张的打印日期是明年。' +
            '你把它夹回账本，没有告诉家里。',
      drama: 32, tropes: [], tags: ['科幻', '家庭', '无人知晓'] },
  ], 'content/events/kehuan.js');

  g.BH.define.eventlines([
    {
      id: 'el_kehuan', name: '冷藏层', track: 'kehuan',
      stages: 3, minGap: 2, maxGap: 8,
      chain: ['e_kh_s1', 'e_kh_s2', 'e_kh_s3'],
      forks: [
        { from: 2, chain: ['e_kh_f2a', 'e_kh_f2b'], track: 'kehuan', depth: 1 },
      ],
    },
  ], 'content/events/kehuan.js#el');
})(typeof globalThis !== 'undefined' ? globalThis : this);
