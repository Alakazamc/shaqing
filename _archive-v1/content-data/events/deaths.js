/* 死法事件池
 * 正典：docs/modules/05-chapter.md §5.1
 * 硬要求：每条至少 2 个 tag，其中至少 1 个来自「收尾」组（seal 会检查）
 *
 * 敏感题材红线（C4 / authoring.md §4）：
 *   写状态与后果，不写过程与方法。死亡描写留在"没有人第二天叫醒他"这一层。
 */
(function (g) {
  g.BH.define.events([
    { id: 'e_death_yiwai', kind: 'death', noRandom: true, weight: 10,
      text: '电梯停在四楼和五楼之间。检修记录上一次签字是三年前。',
      drama: 40, tropes: ['fanche'], tags: ['意外', '荒诞'] },

    { id: 'e_death_manxing', kind: 'death', noRandom: true, weight: 10,
      text: '那三个箭头后来变成了五个。你一直说等忙完这阵。',
      drama: 36, tropes: ['bingdao'], tags: ['慢性', '疲惫'] },

    { id: 'e_death_wurenzhi', kind: 'death', noRandom: true, weight: 10,
      text: '物业敲了三天门。没有人第二天叫醒他。',
      drama: 44, tropes: [], tags: ['无人知晓', '慢性'] },

    { id: 'e_death_zhibo', kind: 'death', noRandom: true, weight: 8,
      include: 'AUD>30',
      text: '直播还开着。在线人数从三万涨到八十万，然后被切断。',
      drama: 60, tropes: ['fanche'], tags: ['荒诞', '网络', '表演'] },

    { id: 'e_death_leijie', kind: 'death', noRandom: true, weight: 8,
      include: 'FLAG?["f_zhuji"]',
      text: '那天山上打了很久的雷。册子最后一页写着「不必回头」。',
      drama: 70, tropes: [], tags: ['荒诞', '修仙', '山野'] },

    { id: 'e_death_jingsai', kind: 'death', noRandom: true, weight: 8,
      include: 'TRACK=["dianjing"]',
      text: '包厢里空调开得很足。第二天有人来收键盘。',
      drama: 52, tropes: [], tags: ['无人知晓', '竞技', '疲惫'] },

    { id: 'e_death_zirankeshou', kind: 'death', noRandom: true, weight: 10,
      text: '你在椅子上坐了一下午。窗外那棵树今年长了半米。',
      drama: 30, tropes: [], tags: ['慢性', '家庭'] },

    { id: 'e_death_huangdan', kind: 'death', noRandom: true, weight: 6,
      include: 'SCARN>=4',
      text: '事故报告里把你的职业写错了。没有人来更正。',
      drama: 48, tropes: [], tags: ['荒诞', '无人知晓'] },
  ], 'content/events/deaths.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
