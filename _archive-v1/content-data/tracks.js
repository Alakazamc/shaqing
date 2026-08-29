/* 轨道定义
 * 正典：docs/modules/04-tracks.md
 * A 期只做 4 条：2 明（dushu / shushu）+ 2 隐（xiuxian / dianjing）
 *
 * 关键约束：entry 条件不得引用 SEX（门槛必须性别中性，04-tracks.md §7）
 */
(function (g) {
  g.BH.define.tracks([
    {
      id: 'dushu', name: '读书', emoji: '📚',
      hidden: false, maxDepth: 4, socialWeight: 0.9,
      lexiconScope: 'campus',
      entry: 'INT>=4',
    },
    {
      id: 'shushu', name: '鼠鼠', emoji: '🐭',
      hidden: false, maxDepth: 5, socialWeight: 0.3,
      lexiconScope: 'shushu',
      entry: 'SPR<=4',
    },
    {
      id: 'xiuxian', name: '修仙', emoji: '🧘',
      hidden: true, maxDepth: 5, socialWeight: 0.6,
      lexiconScope: 'xianxia',
      // 纯剧情门槛：山村出身 + 童年期。不挂 SEX
      entry: 'FLAG?["f_shancun"] & AGE<=12',
    },
    {
      id: 'dianjing', name: '电竞', emoji: '🎮',
      hidden: true, maxDepth: 4, socialWeight: 0.5,
      lexiconScope: 'esports',
      entry: 'FLAG?["f_wangba"] & AGE>=12',
    },
    {
      id: 'kehuan', name: '科幻', emoji: '🛰️',
      hidden: true, maxDepth: 4, socialWeight: 0.35,
      lexiconScope: 'scifi',
      entry: 'AGE>=25 & INT>=10',
    },
    {
      id: 'wanghong', name: '网红', emoji: '📱',
      hidden: false, maxDepth: 5, socialWeight: 0.5,
      lexiconScope: 'wanghong',
      entry: 'FLAG?["f_luobang"] & AGE>=18',
    },
    // 半隐秘：从"没考上"分流进来，不是彩蛋但也不摆在明面
    {
      id: 'shuochang', name: '说唱', emoji: '🎧',
      hidden: true, maxDepth: 4, socialWeight: 0.4,
      lexiconScope: 'rap',
      entry: 'FLAG?["f_luobang"] & AGE>=18',
    },
    // 地雷系：入口是纯事件链 + 高中窗口，**不引用任何属性键**
    // （04-tracks.md §8.5：挂在"心低"上等于病理化）
    {
      id: 'dilei', name: '地雷系', emoji: '🎀',
      hidden: true, maxDepth: 4, socialWeight: 0.2,
      lexiconScope: 'jirai',
      entry: 'AGE>=15 & AGE<=17 & FLAG?["f_bushuo"]',
    },
  ], 'content/tracks.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* 异常轨道群（20-anomaly.md）
 *
 * 配额上限：异常轨道 ≤ 总轨道数 1/3。
 * 现在 6 明面（读书/鼠鼠/网红）+ 说唱 + 地雷系 + 电竞 + 修仙 = 7 常规，
 * 异常 5 条（收容/后室/夜里的人/披风/七月）+ 魔法 + 灵异。
 * 首发 23 条时异常最多 7 条，目前刚好在线上。
 *
 * 全部 hidden: true，入口读起来必须像普通选项（C4）。
 */
(function (g) {
  g.BH.define.tracks([
    // 把超自然当成一份要填表的工作。笑点来自并置
    {
      id: 'shourong', name: '收容', emoji: '📋',
      hidden: true, maxDepth: 4, socialWeight: 0.8,
      lexiconScope: 'shourong',
      entry: 'AGE>=22 & INT>=10 & FLAG?["f_biaoge"]',
    },
    // 机制独特点：AUD 增长被切断。"没有观众"是这游戏最重的惩罚
    {
      id: 'houshi', name: '后室', emoji: '🚪',
      hidden: true, maxDepth: 3, socialWeight: 0.0,
      audFrozen: true,
      lexiconScope: 'houshi',
      entry: 'FLAG?["f_zoucuo"]',
    },
    // 寿命极长但不能被拍到：AUD 上限锁 30，得分只能靠累积不能靠爆发
    {
      id: 'yeli', name: '夜里的人', emoji: '🩸',
      hidden: true, maxDepth: 4, socialWeight: 0.4,
      lifespan: 120, audCap: 30,
      lexiconScope: 'yeli',
      entry: 'FLAG?["f_yeban"] & AGE>=25',
    },
    // 全作最贴主题：超级英雄本质就是在为观众表演
    {
      id: 'pifeng', name: '披风', emoji: '🦸',
      hidden: true, maxDepth: 4, socialWeight: 0.6,
      lexiconScope: 'pifeng',
      entry: 'FLAG?["f_chushou"] & AGE>=20',
    },
    // 时间循环。机制见 20-anomaly.md §3
    {
      id: 'qiyue', name: '七月', emoji: '🔁',
      hidden: true, maxDepth: 2, socialWeight: 0.1,
      lexiconScope: 'common',
      entry: 'FLAG?["f_qiyue"]',
    },
    // 魔法：敏锐带入口（21-spirit.md §2）。与灵异不再重叠
    {
      id: 'mofa', name: '魔法', emoji: '🪄',
      hidden: true, maxDepth: 4, socialWeight: 0.3,
      lexiconScope: 'fantasy',
      entry: 'SPRBAND>=3 & AGE>=16',
    },
    // 灵异：崩溃带入口。信号层效果的独占轨道
    {
      id: 'lingyi', name: '灵异', emoji: '👁',
      hidden: true, maxDepth: 3, socialWeight: 0.1,
      lexiconScope: 'lingyi',
      entry: 'SPRBAND=0 & AGE>=18',
    },
  ], 'content/tracks.js#anomaly');
})(typeof globalThis !== 'undefined' ? globalThis : this);
