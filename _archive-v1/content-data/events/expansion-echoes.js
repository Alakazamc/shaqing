/* B 期跨季 echo：把家庭、职业、关系与异常选择带回后半生
 * 每条都用 EVT（部分再加 JOBLOG/FLAG）回指前情，不是随机感想。
 */
(function (g) {
  g.BH.define.events([
    { id: 'e_exp_echo_xiancheng', season: 4, kind: 'echo', weight: 10,
      include: 'EVT?["e_exp_s1_xiancheng"] & AGE>=30',
      text: '你整理旧账本时掉出一枚停电那晚用过的电池。' +
            '电量还是 3%，邻居家的充电灯已经换成了感应灯。',
      drama: 22, tropes: ['chongfeng'], tags: ['家庭', '街面'] },
    { id: 'e_exp_echo_gongfang', season: 4, kind: 'echo', weight: 10,
      include: 'EVT?["e_exp_s1_gongfang"] & AGE>=32',
      text: '厂区旧楼拆了一半。你妈说那面墙以前贴过排班表，' +
            '你在废墟旁找到一块膏药盒大小的白色瓷砖。',
      drama: 24, tropes: ['taoli'], tags: ['家庭', '职场'] },
    { id: 'e_exp_echo_shancun', season: 4, kind: 'echo', weight: 10,
      include: 'EVT?["e_exp_s1_shancun"] & AGE>=34',
      text: '你把门口那双旧鞋翻出来，鞋底的亮面还在。' +
            '快递员问要不要丢掉，你说不用，随后把它放回原处。',
      drama: 23, tropes: [], tags: ['家庭', '山野'] },
    { id: 'e_exp_echo_care', season: 5, kind: 'echo', weight: 10,
      include: 'EVT?["e_exp_s3_care"] & AGE>=50',
      text: '你在旧手机里找到一张医院缴费单的照片。' +
            '照片没有拍全，右下角只剩当天的排班时间。',
      drama: 28, tropes: ['bingdao'], tags: ['家庭', '慢性'] },
    { id: 'e_exp_echo_lan_home', season: 5, kind: 'echo', weight: 10,
      include: 'EVT?["e_exp_rel_lan_home"] & AGE>=42',
      text: '你搬家时撕下那面墙上的钉子。' +
            '两张排班表的胶痕还在，冰箱里的饺子已经换过很多袋。',
      drama: 27, tropes: ['shilian'], tags: ['家庭', '无人知晓'] },
    { id: 'e_exp_echo_liushui', season: 5, kind: 'echo', weight: 10,
      include: 'EVT?["e_exp_job_liushui_s4"] & JOBLOG?["job_liushui"] & AGE>=45',
      text: '你路过一间卖电器的店，玻璃里摆着和旧流水线同款的外壳。' +
            '店员说这是新型号，你盯着看了两分钟。',
      drama: 26, tropes: ['chongfeng'], tags: ['职场', '街面'] },
    { id: 'e_exp_echo_switch', season: 5, kind: 'echo', weight: 10,
      include: 'EVT?["e_exp_job_switch"] & JOBLOG?["job_wenyuan"] & AGE>=48',
      text: '你在抽屉底找到那张内推表。' +
            '表格已经失效，打印机型号却还在公司采购清单里。',
      drama: 25, tropes: [], tags: ['职场', '逃避'] },
    { id: 'e_exp_echo_zhuguan', season: 5, kind: 'echo', weight: 10,
      include: 'EVT?["e_exp_job_zhuguan_s5"] & JOBLOG?["job_zhuguan"] & AGE>=56',
      text: '你收到一封旧下属的邮件，附件是一张绩效表。' +
            '他把你的评语删掉，只留下日期和签名。',
      drama: 28, tropes: ['beipan'], tags: ['职场', '麻木'] },
    { id: 'e_exp_echo_esports', season: 5, kind: 'echo', weight: 10,
      include: 'EVT?["e_exp_job_xuanshou_s4"] & JOBLOG?["job_xuanshou"] & AGE>=50',
      text: '你整理旧硬盘时打开一场比赛录像。' +
            '画面上的替补席没有拍到你，解说却叫过你的名字。',
      drama: 29, tropes: ['fuchu'], tags: ['竞技', '无人知晓'] },
    { id: 'e_exp_echo_daren', season: 5, kind: 'echo', weight: 10,
      include: 'EVT?["e_exp_job_daren_s5"] & JOBLOG?["job_daren"] & AGE>=60',
      text: '你在药店门口遇到以前的商务。' +
            '他还记得你的账号名，却把你叫成了另一个人的名字。',
      drama: 27, tropes: ['beiwuren'], tags: ['网络', '街面'] },
    { id: 'e_exp_echo_mofa', season: 5, kind: 'echo', weight: 10,
      include: 'EVT?["e_exp_mofa_home"] & AGE>=50',
      text: '那盏灯的电费仍然没有增加。' +
            '你把它放进储物柜，第二天柜门里多了一张过期的车票。',
      drama: 28, tropes: [], tags: ['奇幻', '无人知晓'] },
    { id: 'e_exp_echo_kehuan', season: 5, kind: 'echo', weight: 10,
      include: 'EVT?["e_exp_kehuan_choice"] & AGE>=52',
      text: '冷藏箱的保管单被风吹到楼道里。' +
            '物业问你是不是还有一个住户，你说只是旧家具。',
      drama: 29, tropes: ['shilian'], tags: ['科幻', '家庭'] },
    { id: 'e_exp_echo_houshi', season: 5, kind: 'echo', weight: 10,
      include: 'EVT?["e_exp_houshi_choice"] & AGE>=52',
      text: '你回到家，门牌已经换了。' +
            '新门牌后面贴着旧地址，胶带边缘还留着那条走廊的黄色。',
      drama: 30, tropes: ['taoli'], tags: ['荒诞', '无人知晓'] },
    { id: 'e_exp_echo_yeli', season: 5, kind: 'echo', weight: 10,
      include: 'EVT?["e_exp_yeli_day"] & AGE>=90',
      text: '你在厨房找到一只没有寄件人的饭盒。' +
            '盒盖上的日期是昨天，里面的米饭还热着。',
      drama: 32, tropes: ['chongfeng'], tags: ['家庭', '无人知晓'] },
    { id: 'e_exp_echo_dilei', season: 5, kind: 'echo', weight: 10,
      include: 'EVT?["e_exp_dilei_account"] & AGE>=55',
      text: '旧账号的验证短信停了。' +
            '你登录进去，首页只剩一张模糊的头像，名字栏没有内容。',
      drama: 27, tropes: ['shilian'], tags: ['网络', '麻木'] },
    { id: 'e_exp_echo_dianjing', season: 5, kind: 'echo', weight: 10,
      include: 'EVT?["e_exp_dianjing_cafe"] & AGE>=48',
      text: '那台自助机换成了新的。' +
            '你输入旧账号，屏幕提示最后登录时间是今天凌晨两点。',
      drama: 28, tropes: ['chongfeng'], tags: ['竞技', '网络'] },
  ], 'content/events/expansion-echoes.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
