/* 事件线各阶段与分叉链的事件
 * 正典：docs/modules/13-eventlines.md
 * 全部 noRandom: true（只能被事件线驱动，不进通用池）
 *
 * 硬约束：主链终点与每条分叉终点都必须至少授予 1 张人设牌，
 *        否则走分叉就是「更少」而不是「另一套」。
 */
(function (g) {
  g.BH.define.events([
    // ══ 修仙线主链 ═════════════════════════════════════════
    { id: 'e_el_xx_s1', kind: 'chain', noRandom: true, weight: 0,
      include: 'FLAG?["f_houshan"] & AGE>=11',
      text: '老头把一根扁担靠在井边，指着水缸说「先挑满」。' +
            '缸底有一道从里往外的裂缝。你挑了一趟，水沿着脚背流进鞋里。',
      drama: 12, tropes: [], tags: ['山野', '苦熬'],
      options: [
        { text: '照他说的挑', drama: 10, effect: { STR: 2, SPR: 1 },
          grant: { cast: ['cast_dazuoye'] }, track: { xiuxian: 1 } },
        { text: '先找泥补缝', drama: 14, effect: { INT: 2 },
          grant: { cast: ['cast_aokemu'] }, track: { xiuxian: 1 } },
      ] },

    { id: 'e_el_xx_s2', kind: 'chain', noRandom: true, weight: 0,
      include: 'TRACK=["xiuxian"] & AGE>=15',
      text: '入冬前，老头把你的棉被搬到门外，说山上那间屋子空着。' +
            '你问吃什么，他把一把盐放进你手里：「山上有水。」',
      drama: 20, tropes: [], tags: ['山野', '献祭'],
      options: [
        { text: '带着盐上山', escalate: true, drama: 26,
          effect: { STR: -1, SPR: 2, AUD: 5, HOOK: 2 },
          grant: { cast: ['cast_dazuoye'] }, track: { xiuxian: 1 } },
        { text: '把棉被也带走', drama: 16,
          effect: { STR: 1, SPR: 1, AUD: 2 },
          grant: { cast: ['cast_zaoqi'] }, track: { xiuxian: 1 } },
      ] },

    { id: 'e_el_xx_s3', kind: 'chain', noRandom: true, weight: 0,
      include: 'TRACK=["xiuxian"] & TRACKLV>=3 & AGE>=19',
      text: '雪停后的第三天，山下的村子放鞭炮。' +
            '老头把棋盘扣在膝上，问你还记不记得自己下山的路。' +
            '屋后的水缸在夜里裂成了两半。',
      drama: 34, tropes: [], tags: ['山野', '修仙'],
      options: [
        { text: '继续坐在屋里', escalate: true, drama: 44,
          effect: { SPR: 3, STR: -1, AUD: 10, HOOK: 3 },
          grant: { cast: ['cast_zhuji'], flag: ['f_zhuji'] },
          track: { xiuxian: 2 } },
      ] },

    // ══ 修仙线分叉一：从阶段 1 岔出（下山）══════════════════
    { id: 'e_el_xx_f1a', kind: 'chain', noRandom: true, weight: 0,
      text: '你把扁担横在门口，去找老头。屋里没人，灶灰还是热的。' +
            '你等到太阳落过屋檐，把扁担背上，沿公路下山。',
      drama: 18, tropes: ['xiashan'], tags: ['山野', '逃避'],
      options: [
        { text: '沿着公路走', drama: 16,
          effect: { STR: 1, SPR: -1, AUD: 3 },
          grant: { cast: ['cast_xiashuidao'] }, track: { xiuxian: 1 } },
      ] },

    { id: 'e_el_xx_f1b', kind: 'chain', noRandom: true, weight: 0,
      text: '城里第一份活是在后厨洗碗。水池边有人问你为什么肩膀这么硬。' +
            '你说搬过东西。梦里那只水缸每次都少一条裂缝。',
      drama: 24, tropes: [], tags: ['街面', '麻木'],
      options: [
        { text: '不提山上', drama: 20,
          effect: { SPR: 1, AUD: 4 },
          grant: { cast: ['cast_shushuwoa'] } },
        { text: '讲给一个人听', drama: 26,
          effect: { CHR: 1, AUD: 6 },
          grant: { cast: ['cast_shejiao'] } },
      ] },

    // ══ 修仙线分叉二：从阶段 2 岔出 ═══════════════════════
    { id: 'e_el_xx_f2a', kind: 'chain', noRandom: true, weight: 0,
      text: '你走到山口，手机重新有了信号。屏幕跳出十七条消息，' +
            '最上面一条来自老头：下山别回头。你把手机装回口袋。',
      drama: 22, tropes: ['xiashan'], tags: ['山野'],
      options: [
        { text: '继续下山', drama: 20,
          effect: { STR: 1, AUD: 4 },
          grant: { cast: ['cast_zaoqi'] }, track: { xiuxian: 1 } },
      ] },

    { id: 'e_el_xx_f2b', kind: 'chain', noRandom: true, weight: 0,
      text: '城里有人问你为什么每天在阳台上站两小时。你说等衣服干。' +
            '那件衣服第二天还湿着，你还是站到闹钟响。',
      drama: 30, tropes: [], tags: ['山野', '苦熬'],
      options: [
        { text: '照旧站着', drama: 28,
          effect: { STR: 2, SPR: 2, AUD: 5 },
          grant: { cast: ['cast_dazuoye', 'cast_zaoqi'] } },
      ] },

    // ══ NPC 线：下棋的老头 ════════════════════════════════
    { id: 'e_el_qs_s1', kind: 'chain', noRandom: true, weight: 0,
      include: 'FLAG?["f_shancun"] & AGE>=9',
      text: '村口的棋盘少了两颗黑子。老头用指甲敲了敲空位，' +
            '问你愿不愿意替他坐一会儿。你说不会，他说「会不会都得坐」。',
      drama: 10, tropes: [], tags: ['山野'],
      options: [
        { text: '坐到他收摊', drama: 12, effect: { SPR: 1 },
          grant: { cast: ['cast_dazuoye'], flag: ['f_houshan'] },
          track: { xiuxian: 1 } },
        { text: '回家吃饭', drama: 6, effect: { SPR: 1 },
          grant: { cast: ['cast_paozao'] } },
      ] },

    { id: 'e_el_qs_s2', kind: 'chain', noRandom: true, weight: 0,
      include: 'NPC?["npc_qishou"] & AGE>=12',
      text: '你连输了三天，老头每次都把被吃的棋子放回同一个位置。' +
            '你问为什么不换，他说「看着」。第四天你先动了那一步。',
      drama: 16, tropes: [], tags: ['山野'],
      options: [
        { text: '照他的落子', drama: 18, effect: { INT: 2, SPR: 1 },
          grant: { cast: ['cast_dazuoye'] }, track: { xiuxian: 1 } },
        { text: '故意走错', drama: 20, effect: { CHR: 1, AUD: 3 },
          grant: { cast: ['cast_chouxiang'] } },
      ] },

    { id: 'e_el_qs_s3', kind: 'chain', noRandom: true, weight: 0,
      include: 'NPC?["npc_qishou"] & AGE>=17',
      text: '棋盘还在，茶缸里积着雨水。邻居说老头上个月去了城里，' +
            '没人知道哪个城。棋盘上那盘棋已经轮到你。',
      drama: 30, tropes: ['shilian'], tags: ['山野', '无人知晓'],
      options: [
        { text: '把棋局收起来', drama: 32, effect: { SPR: -1, AUD: 6 },
          grant: { cast: ['cast_dazuoye'] } },
      ] },

    { id: 'e_el_qs_f2a', kind: 'chain', noRandom: true, weight: 0,
      include: 'NPC?["npc_qishou"]',
      text: '你半年没到村口。再去时，棋盘边坐着一个小孩，手里攥着老头留下的黑子。' +
            '她问你下一步怎么走。',
      drama: 22, tropes: [], tags: ['山野', '麻木'],
      options: [
        { text: '坐下看一局', drama: 24, effect: { SPR: 1, AUD: 4 },
          grant: { cast: ['cast_zaoqi'] }, track: { xiuxian: 1 } },
      ] },

    { id: 'e_el_qs_f2b', kind: 'chain', noRandom: true, weight: 0,
      include: 'NPCKNOWN?["npc_qishou"]',
      text: '那个小孩后来不来了。你记住老头留下的那一步，' +
            '每次轮到你，都没人告诉你对面是谁。',
      drama: 26, tropes: [], tags: ['山野'],
      options: [
        { text: '自己把棋下完', drama: 28, effect: { INT: 2, SPR: 1, AUD: 4 },
          grant: { cast: ['cast_dazuoye'] } },
      ] },

    // ══ NPC 线：网吧那个人 ════════════════════════════════
    { id: 'e_el_wy_s1', kind: 'chain', noRandom: true, weight: 0,
      include: 'FLAG?["f_wangba"] & AGE>=13',
      text: '凌晨一点，网吧只剩风扇和键盘声。隔壁那个人摘下一只耳机，' +
            '看了眼你输掉的回放：「再来一把？这次别追那个人头。」' +
            '他把自己那侧的声音调小，像是已经默认你会坐下。',
      drama: 12, tropes: [], tags: ['街面', '竞技'],
      options: [
        { text: '把耳机戴上，跟他再开一局', drama: 14, effect: { SPR: 1, AUD: 3 },
          grant: { cast: ['cast_shoulian'] }, track: { dianjing: 1 } },
        { text: '把剩下的上机时间退掉回家', drama: 8, effect: { INT: 1 },
          grant: { cast: ['cast_hanxiu'] } },
      ] },

    { id: 'e_el_wy_s2', kind: 'chain', noRandom: true, weight: 0,
      include: 'NPC?["npc_wangyou"] & AGE>=15',
      text: '市赛报名截止那天，他把两百块报名费的截图发给你。' +
            '队伍还缺一个人，训练地点在城南地下室，周末没有末班车。' +
            '他只补了一句：「再来一把，赢了就能报。」',
      drama: 20, tropes: ['chudao'], tags: ['竞技', '街面'],
      options: [
        { text: '周五放学就去地下室试训', escalate: true, drama: 28,
          effect: { STR: -1, AUD: 8, HOOK: 2 },
          grant: { cast: ['cast_baoli'] }, track: { dianjing: 1 } },
        { text: '把两百块转回去，留在网吧练', drama: 12, effect: { MNY: -1, SPR: 1 },
          grant: { cast: ['cast_dayuanzhong'] } },
      ] },

    { id: 'e_el_wy_s3', kind: 'chain', noRandom: true, weight: 0,
      include: 'NPC?["npc_wangyou"] & AGE>=18',
      text: '名单贴在训练室的白板上：他的名字在正选，你的名字在替补。' +
            '他把一瓶没开封的水推到你面前，说今晚先把战术跑完。' +
            '没人问是谁把你换下去的。',
      drama: 32, tropes: ['beipan'], tags: ['竞技', '破防'],
      options: [
        { text: '照常坐到最后，替补也把战术跑熟', drama: 34, effect: { STR: -1, SPR: -2, AUD: 8 },
          grant: { cast: ['cast_paihang'] } },
      ] },

    { id: 'e_el_wy_f2a', kind: 'chain', noRandom: true, weight: 0,
      include: 'NPC?["npc_wangyou"]',
      text: '你没去那个赛。他后来发来两条消息，第一条问你到了没有，' +
            '第二条改成「算了，别熬夜」。你盯着输入框，回了「在忙」。',
      drama: 20, tropes: ['shilian'], tags: ['街面', '逃避'],
      options: [
        { text: '把对话框滑掉，不再回', drama: 22, effect: { SPR: -1, AUD: 4 },
          grant: { cast: ['cast_xiashuidao'] }, track: { dianjing: 1 } },
      ] },

    { id: 'e_el_wy_f2b', kind: 'chain', noRandom: true, weight: 0,
      include: 'NPCKNOWN?["npc_wangyou"]',
      text: '你还在每天打两小时。排名往上爬，他偶尔发来一张对局截图，' +
            '不评价输赢，只问：「再来一把？」' +
            '你抽屉里那只贴过胶带的耳机，已经很久没人和你共用。',
      drama: 26, tropes: [], tags: ['竞技', '网络'],
      options: [
        { text: '戴上旧耳机，把这一局打完', drama: 28, effect: { SPR: 1, AUD: 5 },
          grant: { cast: ['cast_shoulian', 'cast_paihang'] } },
      ] },

    // ══ 平台线（带场景）═══════════════════════════════════
    { id: 'e_el_pt_s1', kind: 'chain', noRandom: true, weight: 0,
      include: 'AUD>25',
      text: '凌晨零点四十七分，后台跳出一条合作邀请。对方要你的身份证、' +
            '收款账户和一段「先别告诉现公司」的独家条款。' +
            '服务费写着三成，报价却比你一个月工资还高。',
      drama: 16, tropes: [], tags: ['网络', '职场'],
      options: [
        { text: '点开附件，先看独家条款', drama: 18, effect: { AUD: 4 },
          grant: { cast: ['cast_wanghong'] }, track: { shushu: 1 } },
        { text: '关掉后台，第二天按原班上工', drama: 10, effect: { SPR: 1 },
          grant: { cast: ['cast_paozao'] } },
      ] },

    // 阶段 2 走场景（e_sc_jm_b1..b5），这里是场景的容器事件
    { id: 'e_el_pt_s2', kind: 'chain', noRandom: true, weight: 0,
      include: 'AUD>25',
      text: '他们约你去写字楼十九层。前台让你把手机调成静音，' +
            '会议室里已经放好一杯温水和一份保密协议。' +
            '最醒目的那行写着：账号所有权归平台。',
      drama: 0, tropes: [], tags: ['职场'],
      options: [
        { text: '推门进去，先听他们怎么分你的账号', drama: 0, effect: {},
          grant: { cast: ['cast_wanghong'] } },
      ] },
  ], 'content/events/lines.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
