/* 内容清单 —— "内容有哪些"的唯一真相源
 * 正典：docs/modules/14-content-api.md §2
 *
 * 浏览器与 node 共用这一个数组：
 *   浏览器：加载器按顺序注入 <script async=false>
 *   node：  测试与调参脚本读同一数组，逐个 import() 触发副作用
 *
 * 共用一份清单，内容一致性断言检查的就是实际会被加载的那批文件，
 * 不可能出现"文件写了但没加载"的漏检。
 *
 * 加内容 = 新建文件 + 这里加一行。不改引擎，不改任何已有内容文件。
 * 注意：跨引用在 seal() 阶段统一解析，所以下面的顺序不影响结果。
 */
(function (g) {
  var BH = (g.BH = g.BH || {});
  BH.MANIFEST = [
    // 基础枚举
    'content/tags.js',
    'content/tropes.js',
    'content/tracks.js',
    'content/jobs.js',
    // 卡与人
    'content/cast.js',
    'content/scars.js',
    'content/talents.js',
    'content/npcs.js',
    'content/origins.js',
    // 结构
    'content/plans.js',
    'content/eventlines.js',
    'content/relationships.js',
    'content/events/s1-shijing.js',
    'content/events/s2-chudao.js',
    'content/events/s3-dangnr.js',
    'content/events/s4-zhongnian.js',
    'content/events/s5-shouwei.js',
    'content/events/lines.js',
    'content/events/relationships-main.js',
    'content/events/relationships-branches.js',
    'content/events/relationships-echoes.js',
    'content/events/watershed.js',
    'content/events/wanghong.js',
    'content/events/dilei.js',
    'content/events/anomaly.js',
    'content/events/mofa.js',
    'content/events/kehuan.js',
    'content/events/qiyue.js',
    'content/events/promote.js',
    'content/events/echoes.js',
    'content/events/expansion-life.js',
    'content/events/expansion-career.js',
    'content/events/expansion-anomaly.js',
    'content/events/expansion-echoes.js',
    'content/events/scene-jiama.js',
    'content/events/deaths.js',
    'content/endings/normal.js',
    'content/endings/stable.js',
    // 呈现层
    'content/titles.js',
    'content/reviews.js',
    'content/lexicon.js',
    'content/gacha.js',
  ];
})(typeof globalThis !== 'undefined' ? globalThis : this);
