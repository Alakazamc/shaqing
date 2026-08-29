/* S1 试镜 0–11 岁
 * 正典：docs/SYSTEM.md §1.3、docs/content/authoring.md §2（七条规则 + §2.10 连贯性）
 *
 * 文案规范（本季按新上限重写）：
 *   decision ≤140 字，flavor ≤90 字
 *   摄像机视角、零评价、笑点来自并置、不给因果
 *   角色台词与心理活动放进「」，可以随便评价
 *
 * 连贯性：本季事件引用父母职业与状况（DADJOB / MOMST / FLAG），
 * 让童年不再是通用的"上学放学"，而是有具体家境的童年。
 */
(function (g) {
  g.BH.define.events([
    // ── flavor：引用具体家境 ──────────────────────────
    { id: 'e_s1_f01', season: 1, kind: 'flavor', weight: 10,
      text: '你把邻居家的猫从树上抱下来，猫在你手腕上留了三道。' +
            '你妈拿碘伏擦的时候说「这叫好人没好报」，' +
            '擦完又说「下回还得帮」。',
      drama: 4, tropes: [], tags: ['家庭'] },

    { id: 'e_s1_f02', season: 1, kind: 'flavor', weight: 10,
      include: 'FLAG?["f_dad_absent"]',
      text: '你爸打电话回来，问你期末考了多少。你说了。' +
            '他那边很吵，像是有机器在转。他说「知道了」，' +
            '然后让你把电话给你妈。',
      drama: 7, tropes: [], tags: ['家庭'] },

    { id: 'e_s1_f03', season: 1, kind: 'flavor', weight: 10,
      include: 'FLAG?["f_mom_ill"]',
      text: '你妈弯腰捡东西的时候停了两秒。你问她怎么了，' +
            '她说「没事」，然后让你去把作业写完。' +
            '桌上的膏药盒是空的。',
      drama: 9, tropes: [], tags: ['家庭', '慢性'] },

    { id: 'e_s1_f04', season: 1, kind: 'flavor', weight: 10,
      text: '你在作文里写想当科学家。老师给了个「优」，' +
            '在旁边写了两个字：切实。你查了半天这两个字什么意思。',
      drama: 5, tropes: [], tags: ['校园'] },

    { id: 'e_s1_f05', season: 1, kind: 'flavor', weight: 9,
      include: 'FLAG?["f_shancun"]',
      text: '山上有雾。你走到能看见自家屋顶的那块石头就停下，' +
            '再往上就看不见了。你在石头上坐了很久，' +
            '回去的时候天已经黑了。',
      drama: 6, tropes: [], tags: ['山野'] },

    { id: 'e_s1_f06', season: 1, kind: 'flavor', weight: 9,
      include: 'FLAG?["f_wangba"]',
      text: '网吧门口贴着「未成年人禁止入内」，' +
            '玻璃门上糊了一层深色的膜。里面有人在喊你听不懂的词。' +
            '你在门口站了一会儿。',
      drama: 5, tropes: [], tags: ['街面'] },

    { id: 'e_s1_f07', season: 1, kind: 'flavor', weight: 9,
      include: 'FLAG?["f_gongfang"]',
      text: '厂里的下班铃六点响。整栋楼在六点零五分同时开始炒菜，' +
            '油烟从每一扇窗户出来。你能从味道认出是哪一家。',
      drama: 5, tropes: [], tags: ['家庭'] },

    { id: 'e_s1_f08', season: 1, kind: 'flavor', weight: 8,
      text: '体检说你有点近视。表格上写着「建议复查」，' +
            '你把表格交给家里，它被压在电视柜的玻璃板下面。' +
            '后来一直在那儿。',
      drama: 5, tropes: [], tags: ['慢性'] },

    { id: 'e_s1_f09', season: 1, kind: 'flavor', weight: 8,
      text: '你捡到五毛钱交给老师。老师在班上夸了你，' +
            '说这是拾金不昧。放学的时候你看见那五毛钱在她口袋边上露出来。',
      drama: 7, tropes: [], tags: ['校园'] },

    { id: 'e_s1_f10', season: 1, kind: 'flavor', weight: 8,
      include: 'DADJOB=["job_liushui"]',
      text: '你爸的手指关节比别人粗一圈。他说这是干活干的，' +
            '不疼。你捏了一下，他把手抽回去了。',
      drama: 8, tropes: [], tags: ['家庭', '慢性'] },

    // ── decision 1：性格定向 ───────────────────────────
    { id: 'e_s1_d01', season: 1, kind: 'decision', weight: 10,
      text: '班里选班长，老师说想当的举手。你数了一圈，有三个人举了，' +
            '其中一个是每次考第一的。老师看了一眼没举手的那半边，' +
            '说「还有没有」。',
      drama: 8, tropes: [], tags: ['校园'],
      options: [
        { text: '也举手', drama: 6,
          effect: { CHR: 1, SPR: 1, AUD: 1 },
          grant: { cast: ['cast_hanxiu'] } },
        { text: '把手放回桌上', drama: 4,
          effect: { SPR: -1 },
          grant: { cast: ['cast_paozao'], flag: ['f_bushuo'] } },
        { text: '举手，然后推荐别人', drama: 10,
          effect: { CHR: 1, INT: 1, AUD: 2 },
          grant: { cast: ['cast_shejiao'] } },
      ] },

    // ── decision 2：轨道分流。修仙入口读起来是普通选项（C4）──
    { id: 'e_s1_d02', season: 1, kind: 'decision', weight: 10,
      include: 'AGE>=9',
      text: '暑假很长，第一个星期就把作业写完了。' +
            '你妈说随便你，别惹事，别往水边去。' +
            '院子里那台风扇转起来有点响。',
      drama: 8, tropes: [], tags: ['家庭'],
      options: [
        { text: '把下学期的课本先看完', drama: 6,
          effect: { INT: 2 },
          grant: { cast: ['cast_aokemu'] },
          track: { dushu: 1 } },
        { text: '躺着，把风扇调到三档', drama: 5,
          effect: { SPR: 1, STR: -1 },
          grant: { cast: ['cast_zhaipin'] },
          track: { shushu: 1 } },
        { text: '跟着那个老头去后山', drama: 12,
          include: 'FLAG?["f_shancun"]',
          effect: { STR: 1, SPR: 1 },
          tropes: ['baishi'],
          grant: { flag: ['f_houshan'], cast: ['cast_dazuoye'] },
          track: { xiuxian: 1 } },
      ] },
  ], 'content/events/s1-shijing.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
