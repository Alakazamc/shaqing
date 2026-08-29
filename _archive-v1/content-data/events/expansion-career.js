/* B 期内容扩充：职业晋升后的具体日常与一次转岗选择
 * 职业只通过已有 JOB/JOBYEARS/JOBLOG 和 grant.job 产生后果。
 */
(function (g) {
  g.BH.define.events([
    { id: 'e_exp_job_liushui_s4', season: 4, kind: 'flavor', weight: 9,
      include: 'JOB=["job_liushui"]',
      text: '你在流水线上干了六年，手套已经按你的手指变薄。' +
            '新来的问哪台机器最容易卡，你指了指旁边的红灯。',
      drama: 18, tropes: [], tags: ['职场', '苦熬'] },
    { id: 'e_exp_job_zuzhang_s4', season: 4, kind: 'flavor', weight: 9,
      include: 'JOB=["job_zuzhang"]',
      text: '三号线换了两次人。你把交接表贴在墙上，' +
            '最后一栏写着“明天再说”，签名是你自己的。',
      drama: 21, tropes: [], tags: ['职场', '麻木'] },
    { id: 'e_exp_job_wenyuan_s4', season: 4, kind: 'flavor', weight: 9,
      include: 'JOB=["job_wenyuan"]',
      text: '你把文件名从 v7 改成最终版。下午有人发来 v8，' +
            '附件里只有一页，页脚写着“请按原格式修改”。',
      drama: 18, tropes: [], tags: ['职场', '疲惫'] },
    { id: 'e_exp_job_zhuguan_s5', season: 5, kind: 'flavor', weight: 9,
      include: 'JOB=["job_zhuguan"]',
      text: '你签了三份调岗单，其中一份是当年坐你旁边的人。' +
            '他在门口等你，说以后不用再叫你名字了。',
      drama: 24, tropes: ['beipan'], tags: ['职场', '麻木'] },
    { id: 'e_exp_job_daibi_s4', season: 4, kind: 'flavor', weight: 9,
      include: 'JOB=["job_daibi"]',
      text: '客户把登录密码改了三次，最后一次发来时已经天亮。' +
            '你把战绩截图按日期存好，文件夹名字是对方的生日。',
      drama: 19, tropes: [], tags: ['网络', '竞技'] },
    { id: 'e_exp_job_xuanshou_s4', season: 4, kind: 'flavor', weight: 9,
      include: 'JOB=["job_xuanshou"]',
      text: '你坐在替补房里看完整场比赛。' +
            '首发赢了，教练进来拍了拍你的肩，说下次也许轮到你。',
      drama: 23, tropes: ['tuisai'], tags: ['竞技', '疲惫'] },
    { id: 'e_exp_job_zhubo_s4', season: 4, kind: 'flavor', weight: 9,
      include: 'JOB=["job_zhubo"]',
      text: '你准时开播，后台显示同时在线 43 人。' +
            '其中一个账号从开场看到结束，最后只发了一个问号。',
      drama: 18, tropes: [], tags: ['网络', '表演'] },
    { id: 'e_exp_job_daren_s5', season: 5, kind: 'flavor', weight: 9,
      include: 'JOB=["job_daren"]',
      text: '商务合同又换了一个版本。你数到第六页，' +
            '发现自己的名字少了一个字，法务说不影响结算。',
      drama: 24, tropes: ['qianyue'], tags: ['网络', '投机'] },
    { id: 'e_exp_job_dixia_s4', season: 4, kind: 'flavor', weight: 9,
      include: 'JOB=["job_dixia"]',
      text: '地下室的麦克风只在你唱到副歌时有电。' +
            '散场后主办把路费递给你，少了十块，说下次补。',
      drama: 20, tropes: [], tags: ['街面', '说唱'] },
    { id: 'e_exp_job_chuwei_s5', season: 5, kind: 'flavor', weight: 9,
      include: 'JOB=["job_chuwei"]',
      text: '有人在后台问你那首旧歌还能不能唱。' +
            '你说能，音响师把歌单往后翻了两页，没找到歌名。',
      drama: 25, tropes: ['fuchu'], tags: ['说唱', '舞台'] },

    { id: 'e_exp_job_switch', season: 4, kind: 'decision', weight: 7,
      include: 'JOB=["job_liushui"] & JOBYEARS>=5 & AGE>=28',
      text: '旧同事把一张文员内推表放在你工位上。' +
            '工资只多一点，空调会一直开着，表格最后一栏问你能不能从明天开始。',
      drama: 25, tropes: ['qianyue'], tags: ['职场', '逃避'],
      options: [
        { text: '把工牌交回去', escalate: true, drama: 34,
          effect: { MNY: 2, STR: 1, SPR: -2, AUD: 6, HOOK: 2 },
          grant: { job: 'job_wenyuan', flag: ['f_job_switch'] },
          track: { dushu: 1 } },
        { text: '继续守三号线', restraint: true, drama: 0,
          effect: { SPR: 1, AUD: -2, HOOK: -3 }, grant: {} },
      ] },
  ], 'content/events/expansion-career.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
