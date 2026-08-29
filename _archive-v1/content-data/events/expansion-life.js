/* B 期内容扩充：普通生活、家庭、职业与关系日常
 * 不新增机制，只用现有属性、旗标、职业、人设和关系轴让人生互相指涉。
 */
(function (g) {
  g.BH.define.events([
    // ── 家庭与普通生活 ──────────────────────────────────
    { id: 'e_exp_s1_xiancheng', season: 1, kind: 'flavor', weight: 8,
      include: 'FAMILY=["fam_xiancheng"]',
      text: '县城停电两小时。你妈把饭菜移到窗台，邻居端来一盏充电灯。' +
            '灯的电量显示 3%，你爸在群里发来一张厂区夜班的照片。',
      drama: 7, tropes: [], tags: ['家庭', '街面'] },
    { id: 'e_exp_s1_gongfang', season: 1, kind: 'flavor', weight: 8,
      include: 'FAMILY=["fam_gongfang"]',
      text: '你妈把膏药贴在腰上，照常去厂里。她出门前检查了两遍煤气，' +
            '回来的时候手里多了一袋别人家送的青菜。',
      drama: 8, tropes: ['bingdao'], tags: ['家庭', '慢性'] },
    { id: 'e_exp_s1_shancun', season: 1, kind: 'flavor', weight: 8,
      include: 'FAMILY=["fam_shancun"]',
      text: '你爸寄回一双大了两号的鞋。你穿了两年，鞋底磨出一块亮面，' +
            '后来那双鞋放在门口，谁进门都顺手踢正。',
      drama: 8, tropes: [], tags: ['家庭', '山野'] },
    { id: 'e_exp_s2_xiancheng', season: 2, kind: 'flavor', weight: 8,
      include: 'FAMILY=["fam_xiancheng"] & AGE>=12',
      text: '你妈把小店的账本摊在饭桌上，让你把零钱按面额排好。' +
            '你排完一遍，她又把其中一枚硬币拿去买了冰棍。',
      drama: 10, tropes: [], tags: ['家庭', '街面'] },
    { id: 'e_exp_s2_gongfang', season: 2, kind: 'flavor', weight: 8,
      include: 'FAMILY=["fam_gongfang"] & AGE>=12',
      text: '厂区广播提前响了十分钟。你妈还在路上，' +
            '你爸把她那份饭盖好，饭盒上压着一张写了时间的纸。',
      drama: 11, tropes: [], tags: ['家庭', '职场'] },
    { id: 'e_exp_s2_shancun', season: 2, kind: 'flavor', weight: 8,
      include: 'FAMILY=["fam_shancun"] & AGE>=12',
      text: '村里修路，挖土机停在你家门口三天。' +
            '你每天绕远路去上学，鞋面沾着同一种灰。',
      drama: 9, tropes: [], tags: ['家庭', '山野'] },
    { id: 'e_exp_s3_rent', season: 3, kind: 'flavor', weight: 9,
      include: 'AGE>=20 & MNY<=4',
      text: '房租还差三百。你把抽屉里的硬币倒在桌上，' +
            '房东发来一条消息，只问了一个句号。',
      drama: 16, tropes: ['pochan'], tags: ['家庭', '街面'] },
    { id: 'e_exp_s3_bus', season: 3, kind: 'flavor', weight: 8,
      include: 'AGE>=21',
      text: '末班车提前一站停下。司机说前面施工，' +
            '车上的人一起下车，沿着围挡走了二十分钟。',
      drama: 12, tropes: ['taoli'], tags: ['街面', '疲惫'] },
    { id: 'e_exp_s4_laundry', season: 4, kind: 'flavor', weight: 8,
      include: 'AGE>=30',
      text: '洗衣机在夜里响了三次。你起床把衣服拿出来，' +
            '口袋里有一张五年前的停车票，已经洗得只剩日期。',
      drama: 15, tropes: [], tags: ['家庭', '麻木'] },
    { id: 'e_exp_s5_kettle', season: 5, kind: 'flavor', weight: 8,
      include: 'AGE>=50',
      text: '热水壶烧开后自己断电。你等了十分钟才想起，' +
            '家里已经没有第二个人会来倒水。',
      drama: 20, tropes: [], tags: ['家庭', '无人知晓'] },

    // ── 家庭压力：坏选项仍可被构筑利用 ─────────────────
    { id: 'e_exp_s3_care', season: 3, kind: 'decision', weight: 9,
      include: 'FLAG?["f_mom_ill"] & AGE>=24',
      text: '你妈住院后，厂里的排班表连续换了三次。' +
            '护士把缴费单夹在床头，问你下班后能不能再来一趟。',
      drama: 24, tropes: ['bingdao'], tags: ['家庭', '职场'],
      options: [
        { text: '把排班表拍给主管', escalate: true, drama: 30,
          effect: { MNY: -2, SPR: -2, AUD: 5, HOOK: 2 },
          grant: { flag: ['f_care'] } },
        { text: '先把药送回去', restraint: true, drama: 0,
          effect: { MNY: -1, SPR: 1, AUD: -3, HOOK: -3 }, grant: {} },
      ] },
    { id: 'e_exp_s4_dad', season: 4, kind: 'decision', weight: 8,
      include: 'FLAG?["f_dad_absent"] & AGE>=35',
      text: '你爸回来住了一阵，行李只有一个塑料袋。' +
            '他问你能不能帮忙找个白天的活，手机里还存着旧厂的门禁照片。',
      drama: 25, tropes: ['chongfeng'], tags: ['家庭', '职场'],
      options: [
        { text: '把简历改到凌晨', escalate: true, drama: 32,
          effect: { INT: 1, SPR: -2, AUD: 6, HOOK: 2 },
          grant: { flag: ['f_dad_job'] } },
        { text: '把门禁照片收起来', restraint: true, drama: 0,
          effect: { SPR: 1, AUD: -3, HOOK: -3 }, grant: {} },
      ] },

    // ── 关系日常：关系轴是后果，不是属性奖励 ─────────────
    { id: 'e_exp_rel_lan_home', season: 3, kind: 'decision', weight: 8,
      include: 'NPC?["npc_lan"] & FLAG?["f_lan_commit"] & AGE>=23',
      text: '你们把两张排班表钉在同一面墙上。' +
            '下个月只有一个晚上都不用加班，冰箱里还剩半袋饺子。',
      drama: 26, tropes: ['qianyue'], tags: ['家庭', '疲惫'],
      options: [
        { text: '把那晚空出来', escalate: true, drama: 34,
          effect: { HOOK: 2, AUD: 5 }, relation: { npc_lan: 2 },
          grant: { flag: ['f_lan_weekend'] } },
        { text: '各自把空白划掉', restraint: true, drama: 0,
          effect: { HOOK: -2, AUD: -2 }, relation: { npc_lan: -2 },
          grant: { flag: ['f_lan_distance'] } },
      ] },
    { id: 'e_exp_rel_lan_bill', season: 4, kind: 'flavor', weight: 8,
      include: 'NPC?["npc_lan"] & FLAG?["f_lan_shared"] & AGE>=30',
      text: '新租约把两个人的名字排在同一行。' +
            '房东问谁负责交水电，你们同时把手机递过去。',
      drama: 20, tropes: [], tags: ['家庭', '麻木'] },
    { id: 'e_exp_rel_lan_quiet', season: 5, kind: 'flavor', weight: 8,
      include: 'NPCGONE?["npc_lan"] & FLAG?["f_lan_breakup"] & AGE>=50',
      text: '你搬家时留下一个空抽屉。钥匙交给房东后，' +
            '你才想起那个人的地址还写在抽屉底面。',
      drama: 22, tropes: ['shilian'], tags: ['家庭', '无人知晓'] },
  ], 'content/events/expansion-life.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
