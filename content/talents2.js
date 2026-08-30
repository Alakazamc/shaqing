// 天赋池第二批：+36（金3/紫8/蓝15/灰10）
window.BH = window.BH || {};
BH.TALENTS = BH.TALENTS || [];
BH.TALENTS.push(
  // 金
  { id: 'guoyun', name: '国运之子', emoji: '🐉', g: 3, desc: '生在风口上，而你恰好会飞。', eff: { JOY: 1, MNY: 1 }, tags: ['lucky'] },
  { id: 'xiantian', name: '先天圣体', emoji: '🌟', g: 3, desc: '你的体检报告永远是那三个字：正常的。', eff: { STR: 2, INT: 1 } },
  { id: 'qifen', name: '气氛组长', emoji: '🎤', g: 3, desc: '你在哪，哪就没有冷场。', eff: { CHR: 2, JOY: 1 }, tags: ['social'] },
  // 紫
  { id: 'dazhiruoyu', name: '大智若愚', emoji: '🦆', g: 2, desc: '你妈说你傻，考官说你大巧不工。', eff: { INT: 2, JOY: 2 } },
  { id: 'tiangong', name: '天选打工人', emoji: '🐂', g: 2, desc: '加班到凌晨还精神抖擞，体检表看了都佩服。', eff: { MNY: 2, STR: 1 } },
  { id: 'duanshui', name: '端水大师', emoji: '⚖️', g: 2, desc: '家里家外、领导同事，一碗水端得比国家体育馆还平。', eff: { CHR: 2 }, tags: ['social'] },
  { id: 'jinliyang', name: '锦鲤养成', emoji: '🎣', g: 2, desc: '你的"再来一瓶"中奖率是统计学奇迹。', eff: { JOY: 1 }, tags: ['lucky'] },
  { id: 'yeshi', name: '夜市战神', emoji: '🍢', g: 2, desc: '深夜十二点的路边摊，你是行走的活地图。', eff: { JOY: 1, MNY: 1 } },
  { id: 'jiema', name: '解码者', emoji: '🔍', g: 2, desc: '说明书和报错日志在你眼里都是悬疑小说。', eff: { INT: 2 } },
  { id: 'jiuhuo', name: '旧物猎人', emoji: '🏺', g: 2, desc: '旧货市场在你眼里是未开采的金矿。', eff: { MNY: 1 }, tags: ['weird'] },
  { id: 'chetian', name: '天生车神', emoji: '🚗', g: 2, desc: '科目二一次过，教练逢人就吹。', eff: { STR: 1, INT: 1 } },
  // 蓝
  { id: 'zaoshui', name: '早睡冠军', emoji: '😴', g: 1, desc: '十点睡觉雷打不动，你的黑眼圈选择了转世。', eff: { STR: 1, JOY: 1 } },
  { id: 'chufang', name: '厨房杀手', emoji: '💥', g: 1, desc: '你做的菜难吃到发笑，朋友聚餐全靠你活跃气氛。', eff: { CHR: 1, JOY: 1 } },
  { id: 'feiji', name: '纸飞机大师', emoji: '✈️', g: 1, desc: '你的纸飞机能绕教室一圈回到讲台。', eff: { CHR: 1 } },
  { id: 'dianming', name: '班级点名器', emoji: '🎯', g: 1, desc: '老师最爱点你回答问题，你练就了三秒编答案的神技。', eff: { CHR: -1, INT: 1 } },
  { id: 'naicha', name: '奶茶品鉴师', emoji: '🧋', g: 1, desc: '三分糖去冰你从不失手，你的味觉是行业标杆。', eff: { JOY: 1, MNY: -1 } },
  { id: 'zixingche', name: '自行车达人', emoji: '🚲', g: 1, desc: '两轮世界的主宰，上坡不喘，下坡不慌。', eff: { STR: 2 } },
  { id: 'xijie', name: '细节控', emoji: '🔎', g: 1, desc: '错一个标点你都难受，你就是行走的校对器。', eff: { INT: 1 } },
  { id: 'luchi', name: '路痴', emoji: '🧭', g: 1, desc: '你永远在找路，于是认识了全城的路人。', eff: { CHR: 1 } },
  { id: 'maoyu', name: '猫语者', emoji: '🐱', g: 1, desc: '流浪猫见你就打滚，你家窗台是猫界中转站。', eff: { JOY: 2 } },
  { id: 'youxiB', name: '游戏白痴', emoji: '🎮', g: 1, desc: '你玩游戏全靠运气，但运气也是实力的一部分。', eff: { INT: -1, CHR: 1 } },
  { id: 'kaixinguo', name: '家族开心果', emoji: '🎊', g: 1, desc: '家族聚会你一开口，七大姑八大姨全放下筷子听你说。', eff: { CHR: 2 }, tags: ['family'] },
  { id: 'shengqianB', name: '省钱雷达', emoji: '📉', g: 1, desc: '你的购物车满打满算，你的生活精打细算到快乐。', eff: { MNY: 1 } },
  { id: 'paizhao', name: '拍照手残', emoji: '📸', g: 1, desc: '你拍的照片总能精准避开所有人的脸，包括你自己的。', eff: { CHR: -1, JOY: 1 } },
  { id: 'zeyanguang', name: '择偶眼光', emoji: '👀', g: 1, desc: '你喜欢的人，后来都过得很好——只是不是和你。', eff: { CHR: 1 }, tags: ['love'] },
  { id: 'xuanxueka', name: '玄学抽卡手', emoji: '🎴', g: 1, desc: '你抽卡从不看概率，你信眼神。', eff: { INT: 1 }, tags: ['dianjing'] },
  // 灰/负面
  { id: 'qimingfei', name: '起名废', emoji: '🏷️', g: 0, desc: '你给宠物起名"猫"，给网名起名"用户123"。', eff: { CHR: -1 } },
  { id: 'tuoyan', name: '拖延症晚期', emoji: '⏳', g: 0, desc: '你的口头禅是"明天"，你的明天永远在明天。', eff: { STR: -1 } },
  { id: 'xuanzeP', name: '选择困难Pro', emoji: '🎲', g: 0, desc: '你连奶茶甜度都要纠结十分钟。', eff: { INT: -1, JOY: -1 } },
  { id: 'ditouzu', name: '低头族', emoji: '📱', g: 0, desc: '你的颈椎比你先进入中年。', eff: { STR: -1 } },
  { id: 'lunu', name: '路怒', emoji: '🚗', g: 0, desc: '方向盘一握你就变了个人。', eff: { STR: 1, CHR: -2 } },
  { id: 'sheniuH', name: '社牛幻觉', emoji: '🦜', g: 0, desc: '你以为你social，其实大家只是在礼貌。', eff: { CHR: 1 } },
  { id: 'tunjix', name: '囤积癖', emoji: '📦', g: 0, desc: '你的口头禅是"万一以后用得上呢"。', eff: { MNY: -1 } },
  { id: 'aoyeG', name: '熬夜冠军', emoji: '🌛', g: 0, desc: '凌晨四点的城市你见过一千次，凌晨四点的早餐你没吃过。', eff: { STR: -2, JOY: 1 } },
  { id: 'fangxiang', name: '方向感错乱', emoji: '🌀', g: 0, desc: '你往东走会到西，朋友管你叫人形指南针反面。', eff: { STR: -1, INT: -1, CHR: 1 } },
  { id: 'yiwang', name: '易忘体质', emoji: '🫥', g: 0, desc: '你忘了你要说什么，所以你说的都是新话。', eff: { INT: -1 } },
);
