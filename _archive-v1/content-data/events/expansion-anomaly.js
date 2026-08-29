/* B 期内容扩充：异常、科幻与隐秘轨道的普通后续
 * 异常仍然嵌在房租、工作、家人和物件里，不新增异常规则。
 */
(function (g) {
  g.BH.define.events([
    { id: 'e_exp_mofa_home', season: 4, kind: 'flavor', weight: 9,
      include: 'TRACK=["mofa"] & TRACKLV>=2',
      text: '你搬过三次家，那盏灯每次都在纸箱最上面。' +
            '搬家公司问是不是贵重物品，你说只是旧灯，账单却多收了一个箱子。',
      drama: 24, tropes: [], tags: ['奇幻', '家庭'] },
    { id: 'e_exp_kehuan_home', season: 4, kind: 'flavor', weight: 9,
      include: 'TRACK=["kehuan"]',
      text: '你把研究所的说明书夹进菜谱。' +
            '每次做饭翻到那一页，纸上的日期都会比今天晚一天。',
      drama: 24, tropes: [], tags: ['科幻', '家庭'] },
    { id: 'e_exp_shourong_shift', season: 5, kind: 'flavor', weight: 8,
      include: 'TRACK=["shourong"]',
      text: '新来的同事问你周末值不值班。' +
            '你翻开交接本，周六那一页已经盖了你的章，日期还没到。',
      drama: 25, tropes: [], tags: ['职场', '荒诞'] },
    { id: 'e_exp_houshi_note', season: 5, kind: 'flavor', weight: 8,
      include: 'TRACK=["houshi"]',
      text: '你在墙上写下家的地址。第二天那行字移到了天花板，' +
            '旁边多了一句“记得带伞”，笔迹像你妈发来的消息。',
      drama: 26, tropes: [], tags: ['荒诞', '家庭'], fx: 'sig-bad' },
    { id: 'e_exp_yeli_day', season: 5, kind: 'flavor', weight: 8,
      include: 'TRACK=["yeli"] & AGE>=75',
      text: '白天有人敲门。你等到天黑才打开，门外是一袋放凉的饭，' +
            '袋子上写着你的门牌号，送餐时间是下午三点。',
      drama: 29, tropes: [], tags: ['家庭', '无人知晓'] },
    { id: 'e_exp_pifeng_address', season: 5, kind: 'flavor', weight: 8,
      include: 'TRACK=["pifeng"] & AUD>=20',
      text: '你换了三次住址，快递仍然能准确送到。' +
            '箱子里是一件旧外套，口袋里放着你第一次出手那天的公交卡。',
      drama: 30, tropes: ['beiwuren'], tags: ['街面', '网络'] },
    { id: 'e_exp_lingyi_receipt', season: 4, kind: 'flavor', weight: 8,
      include: 'TRACK=["lingyi"]',
      text: '你去便利店买水，收银员把小票递给你。' +
            '小票上有两行时间：付款时间和你离开后十分钟的时间。',
      drama: 24, tropes: [], tags: ['灵异', '街面'], fx: 'sig-bad' },
    { id: 'e_exp_dilei_account', season: 5, kind: 'flavor', weight: 8,
      include: 'TRACK=["dilei"]',
      text: '那个旧账号还在自动续费。' +
            '你改了两次密码，平台发来的验证短信都落在一部没用过的手机上。',
      drama: 24, tropes: ['shilian'], tags: ['网络', '麻木'] },
    { id: 'e_exp_xiuxian_city', season: 5, kind: 'flavor', weight: 8,
      include: 'TRACK=["xiuxian"] & TRACKLV>=3',
      text: '你在楼顶晒被子，邻居问那块石头为什么一直放在窗边。' +
            '你说压纸用。天气预报说今晚没有风。',
      drama: 25, tropes: [], tags: ['山野', '家庭'] },
    { id: 'e_exp_dianjing_cafe', season: 4, kind: 'flavor', weight: 8,
      include: 'TRACK=["dianjing"] & TRACKLV>=2',
      text: '你回到那家网吧，前台换成了自助机。' +
            '机器识别出你的旧账号，提示余额还有 0.01 元。',
      drama: 25, tropes: ['chongfeng'], tags: ['竞技', '街面'] },
    { id: 'e_exp_wanghong_storage', season: 5, kind: 'flavor', weight: 8,
      include: 'TRACK=["wanghong"] & AUD>=30',
      text: '你把旧设备装进储物柜，柜门上贴着合作方的名字。' +
            '押金退回时，平台说少了一根没有出现在清单里的线。',
      drama: 27, tropes: [], tags: ['网络', '投机'] },

    { id: 'e_exp_kehuan_choice', season: 4, kind: 'decision', weight: 7,
      include: 'TRACK=["kehuan"] & AGE>=38',
      text: '研究所发来一张取件单，冷藏箱已经寄到你家楼下。' +
            '签收栏要求本人确认，保管期限写到你八十岁以后。',
      drama: 30, tropes: ['qianyue'], tags: ['科幻', '家庭'],
      options: [
        { text: '把冷藏箱带回家', escalate: true, drama: 40,
          effect: { INT: 2, SPR: -2, AUD: 6, HOOK: 2 },
          grant: { flag: ['f_kh_home'] } },
        { text: '留在研究所', restraint: true, drama: 0,
          effect: { SPR: 1, AUD: -3, HOOK: -3 }, grant: {} },
      ] },
    { id: 'e_exp_houshi_choice', season: 4, kind: 'decision', weight: 6,
      include: 'TRACK=["houshi"] & AGE>=35',
      text: '走廊尽头出现一扇写着你家门牌的门。' +
            '门缝里有饭菜味，墙上的钟显示你已经迟到两小时。',
      drama: 30, tropes: ['taoli'], tags: ['荒诞', '家庭'], fx: 'sig-bad',
      options: [
        { text: '把门打开', escalate: true, drama: 38,
          effect: { INT: 1, SPR: -3, AUD: -4, HOOK: 2 },
          grant: { flag: ['f_hs_home'] } },
        { text: '沿原路走回去', restraint: true, drama: 0,
          effect: { SPR: 1, HOOK: -3 }, grant: {} },
      ] },
  ], 'content/events/expansion-anomaly.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
