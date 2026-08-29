/* 魔法轨道事件线
 * 正典：docs/modules/04-tracks.md、13-eventlines.md §5.5
 *
 * 魔法不是能力说明书。它从敏锐带的日常失真开始，
 * 终点用人设牌兑现寿命延长；主链更强，分叉更能留在普通生活里。
 */
(function (g) {
  g.BH.define.events([
    { id: 'e_mf_s1', kind: 'chain', noRandom: true, weight: 0,
      include: 'SPRBAND>=3 & AGE>=16',
      text: '你在公交站捡到一张被雨泡软的纸。上面只有你的名字和明天的日期。' +
            '站牌把下一班车报了两次，时间相同。',
      drama: 18, tropes: [], tags: ['奇幻', '街面'],
      options: [
        { text: '把纸片带回家', drama: 20,
          effect: { INT: 1, SPR: -1, AUD: 3, HOOK: 1 },
          grant: { flag: ['f_mofa'] }, track: { mofa: 1 } },
        { text: '把纸压回广告栏', drama: 12,
          effect: { SPR: 1, AUD: 1 },
          grant: { flag: ['f_mofa'] }, track: { mofa: 1 } },
      ] },

    { id: 'e_mf_s2', kind: 'chain', noRandom: true, weight: 0,
      include: 'FLAG?["f_mofa"] & AGE>=18',
      text: '纸片第二天变干了，字迹却多出一行：你能把哪一年借给我。' +
            '下班回家，门缝里多了一盏没电的灯。',
      drama: 24, tropes: [], tags: ['奇幻', '家庭'],
      options: [
        { text: '在名字下面写一行', escalate: true, drama: 30,
          effect: { SPR: -2, AUD: 7, HOOK: 3 },
          grant: { flag: ['f_mofa_name'], cast: ['cast_ganzhi'] },
          track: { mofa: 1 } },
        { text: '折起纸片，去找原地址', fork: 0, drama: 22,
          effect: { INT: 2, MNY: -1, SPR: -1, AUD: 3 },
          grant: { flag: ['f_mofa_fold'] }, track: { mofa: 1 } },
      ] },

    { id: 'e_mf_s3', kind: 'chain', noRandom: true, weight: 0,
      include: 'FLAG?["f_mofa_name"] & AGE>=22',
      text: '你写下的那一行在纸上留了三年。每年生日，灯会亮一小时，' +
            '屋外的钟少走一天。你把它放在搬家时唯一没扔的箱子里。',
      drama: 34, tropes: [], tags: ['奇幻', '家庭', '慢性'],
      options: [
        { text: '把灯带回家', escalate: true, drama: 40,
          effect: { STR: -1, SPR: 2, AUD: 10, HOOK: 3 },
          grant: { cast: ['cast_yongye'], flag: ['f_mofa_done'] },
          track: { mofa: 1 } },
      ] },

    { id: 'e_mf_f2a', kind: 'chain', noRandom: true, weight: 0,
      include: 'FLAG?["f_mofa_fold"] & AGE>=20',
      text: '地址在城郊一间关门的照相馆。老板退给你十年前的胶卷钱，' +
            '又从柜台后拿出一只还在走的旧钟。钟面没有十二点。',
      drama: 26, tropes: [], tags: ['奇幻', '街面'],
      options: [
        { text: '照着钟面走到天亮', drama: 28,
          effect: { STR: -1, SPR: 1, AUD: 5 },
          grant: { flag: ['f_mofa_quiet'] }, track: { mofa: 1 } },
      ] },

    { id: 'e_mf_f2b', kind: 'chain', noRandom: true, weight: 0,
      include: 'FLAG?["f_mofa_quiet"] & AGE>=23',
      text: '你每年去一次照相馆，老板每次都把照片洗成同一个年份。' +
            '第七次去时，门口贴着你的住址，字是你的笔迹。',
      drama: 32, tropes: [], tags: ['奇幻', '无人知晓'],
      options: [
        { text: '把灯留在窗台', drama: 34,
          effect: { INT: 1, SPR: 2, AUD: 6 },
          grant: { cast: ['cast_dengxin'], flag: ['f_mofa_done'] },
          track: { mofa: 1 } },
      ] },

    { id: 'e_mf_f01', season: 4, kind: 'flavor', weight: 10,
      include: 'TRACK=["mofa"]',
      text: '你家里有一盏灯只在凌晨三点亮。电费单没有增加，' +
            '邻居却说那一晚看见你家窗户亮到了早上。',
      drama: 22, tropes: [], tags: ['奇幻', '家庭'] },

    { id: 'e_mf_f02', season: 5, kind: 'flavor', weight: 10,
      include: 'TRACK=["mofa"] & TRACKLV>=2',
      text: '你去修表，师傅说这只表少走了四百三十七天。' +
            '你付了钱，没问少掉的那些日子去了哪里。',
      drama: 28, tropes: [], tags: ['奇幻', '慢性'] },

    { id: 'e_echo_mofa', season: 5, kind: 'echo', weight: 12,
      include: 'EVT?["e_mf_s1"] & AGE>=50',
      text: '你在抽屉里找到那张泡软的纸。日期已经过去很多年，' +
            '名字下面多出的那一行还没有褪色。',
      drama: 30, tropes: [], tags: ['奇幻', '无人知晓'] },
  ], 'content/events/mofa.js');

  g.BH.define.eventlines([
    {
      id: 'el_mofa', name: '那盏灯', track: 'mofa',
      stages: 3, minGap: 2, maxGap: 7,
      chain: ['e_mf_s1', 'e_mf_s2', 'e_mf_s3'],
      forks: [
        { from: 2, chain: ['e_mf_f2a', 'e_mf_f2b'], track: 'mofa', depth: 1 },
      ],
    },
  ], 'content/events/mofa.js#el');
})(typeof globalThis !== 'undefined' ? globalThis : this);
