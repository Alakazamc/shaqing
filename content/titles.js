// 称号系统：局内里程碑收集（21-rhythm.md §2）
// test(S) 达成即弹「🏅 获得称号」，一次性（S.titles 去重）
window.BH = window.BH || {};
BH.TITLES = [
  { id: 'xueba', name: '学霸', emoji: '📚', test: S => S.dims.INT >= 12 },
  { id: 'xueshen', name: '学神本神', emoji: '🧠', test: S => S.dims.INT >= 16 },
  { id: 'shoufu', name: '首富预备役', emoji: '💎', test: S => S.dims.MNY >= 13 },
  { id: 'legaotian', name: '乐天派', emoji: '🌞', test: S => S.dims.JOY >= 13 },
  { id: 'tieren', name: '铁人体质', emoji: '🦾', test: S => S.dims.STR >= 13 },
  { id: 'zunqiang', name: '全村最靓', emoji: '🌹', test: S => S.dims.CHR >= 13 },
  { id: 'genewang', name: '梗王', emoji: '🐸', test: S => (S.tags.chaos || 0) >= 5 },
  { id: 'renmai', name: '人脉王', emoji: '🤝', test: S => (S.tags.social || 0) >= 6 },
  { id: 'fengyun', name: '风云人物', emoji: '📣', test: S => (S.tags.fame || 0) >= 5 },
  { id: 'dingliangzhu', name: '全家顶梁柱', emoji: '🏠', test: S => (S.tags.family || 0) >= 6 },
  { id: 'jinli', name: '锦鲤转世', emoji: '🍀', test: S => (S.tags.lucky || 0) >= 3 },
  { id: 'dianjingmiao', name: '电竞苗子', emoji: '🕹️', test: S => (S.tags.dianjing || 0) >= 3 },
  { id: 'daoxin', name: '道心初成', emoji: '☯️', test: S => (S.tracks.xiuxian || 0) >= 2 },
  { id: 'guaicun', name: '怪谈幸存者', emoji: '🚪', test: S => (S.tracks.guaitan || 0) >= 2 },
  { id: 'caifu', name: '富过', emoji: '💸', test: S => (S.tags.rich || 0) >= 5 },
  { id: 'guyongzhe', name: '孤勇者', emoji: '🐺', test: S => (S.tags.emo || 0) >= 3 && S.dims.JOY >= 5 },
  { id: 'ganfanren', name: '饭搭子之王', emoji: '🍚', test: S => (S.tags.social || 0) >= 3 && (S.tags.family || 0) >= 3 },
  { id: 'yishujia', name: '民间艺术家', emoji: '🎨', test: S => (S.tags.art || 0) >= 5 },
];
