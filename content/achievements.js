// 成就系统 + 杀青宴致辞
// cond(meta, S)：meta=跨局存档，S=本局状态（片名页检查时可能为 null）
window.BH = window.BH || {};
BH.ACH = [
  { id: 'debut', name: '处女作', emoji: '🎬', desc: '杀青第一部作品', cond: m => (m.works || []).length >= 1 },
  { id: 'veteran', name: '常驻演员', emoji: '🎭', desc: '累计死亡 10 次', cond: m => m.deaths >= 10 },
  { id: 'nail', name: '剧组钉子户', emoji: '🏕️', desc: '累计死亡 30 次', cond: m => m.deaths >= 30 },
  { id: 'box100', name: '百亿俱乐部', emoji: '💰', desc: '单部票房破 100 亿', cond: m => (m.bestBox || 0) >= 100 },
  { id: 'score9', name: '影帝/影后', emoji: '🏆', desc: '单部评分破 9.0', cond: m => (m.bestScore || 0) >= 9 },
  { id: 'score99', name: '满分级', emoji: '⭐', desc: '拿到 9.9 分（豆瓣不敢开分的那种）', cond: m => (m.bestScore || 0) >= 9.9 },
  { id: 'young', name: '已老实', emoji: '😭', desc: '5 岁前就杀青一次', cond: (m, S) => S && S.phase === 'end' && S.age <= 5 },
  { id: 'feisheng', name: '白日飞升', emoji: '🕊️', desc: '达成修仙线真结局', cond: (m, S) => !!(m.endings && m.endings.xiuxian === '白日飞升') },
  { id: 'dex50', name: '图鉴半程', emoji: '🪦', desc: '死法图鉴收集 50 种', cond: m => Object.keys(m.dex || {}).length >= 50 },
  { id: 'dexall', name: '图鉴大师', emoji: '📚', desc: '死法图鉴全收集', cond: m => Object.keys(m.dex || {}).length >= (window.BH.DEATHS || []).length && m.deaths > 0 },
  { id: 'first_end', name: '开门红', emoji: '🎞️', desc: '达成第一条轨道结局', cond: m => Object.keys(m.endings || {}).length >= 1 },
  { id: 'feast', name: '杀青宴', emoji: '🥂', desc: '达成 5 条轨道结局，解锁杀青宴', cond: m => Object.keys(m.endings || {}).length >= 5 },
  { id: 'all_end', name: '十项全能', emoji: '👑', desc: '10 条轨道全部达成结局', cond: m => Object.keys(m.endings || {}).length >= 10 },
  { id: 'allin', name: '大冤种开局', emoji: '🫏', desc: '选角时三个天赋全是灰色负面', cond: (m, S) => !!S && S.talents.slice(0, 3).every(id => { const t = (window.BH.TALENTS || []).find(x => x.id === id); return t && t.g === 0; }) },
  { id: 'rich_meta', name: '轮回资本家', emoji: '🏦', desc: '轮回点数攒到 100', cond: m => m.reinc >= 100 },
];
BH.FEAST = [
  '导演：都到齐了？坐。今晚不谈票房，谈的都是把日子过成了戏的人。',
  '导演：五条线你都走通了。说真的，现实里这么活是会累死的——所以游戏才好啊。',
  '导演：本届杀青宴的主题是"荒诞且认真"。你是最佳注脚。',
  '导演：奖杯是电子的，但你那些人生是真的离谱，值得这顿饭。',
];
