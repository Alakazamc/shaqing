/* badhand — 文本占位符插值
 * 正典：docs/modules/03-events.md §2.2（抄参考项目的 format()）
 *
 * 未知占位符原样输出而不是报错——文案容错优先。
 * 注意：这不是"通用文案 + 占位符替换"那种偷懒做法（17-jobs.md §3.3 禁止）。
 * 占位符只用来填具体数字与名词，事件仍然按职业写不同文案。
 *
 * 依赖：state.js, registry.js
 */
(function (g) {
  'use strict';
  var BH = (g.BH = g.BH || {});

  var STAT_CN = { CHR: '颜', INT: '智', STR: '体', MNY: '钱', SPR: '心' };

  function jobName(s) {
    var R = BH.registry;
    // 无业时给一个能自然嵌进句子的说法，而不是"没工作的人"这种硬造的名词
    if (!s.JOB || !R.has('jobs', s.JOB)) return '本地人';
    return R.get('jobs', s.JOB).name;
  }

  function trackName(s) {
    var R = BH.registry;
    var dom = BH.state.dominantTrack(s);
    if (!dom.id || !R.has('tracks', dom.id)) return '';
    return R.get('tracks', dom.id).name;
  }

  function resolve(key, s) {
    switch (key) {
      case 'age': return String(s.age);
      case 'aud': return String(s.AUD);
      case 'job': return jobName(s);
      case 'jobyears': return String(s.JOBYEARS || 0);
      case 'track': return trackName(s);
      case 'money': return String(s.MNY);
      case 'dadjob': {
        var R = BH.registry;
        var j = s.parents && s.parents.father && s.parents.father.job;
        return j && R.has('jobs', j) ? R.get('jobs', j).name : '';
      }
      case 'momjob': {
        var R2 = BH.registry;
        var j2 = s.parents && s.parents.mother && s.parents.mother.job;
        return j2 && R2.has('jobs', j2) ? R2.get('jobs', j2).name : '';
      }
      default:
        if (STAT_CN[key.toUpperCase()]) return String(s[key.toUpperCase()]);
        return null;
    }
  }

  /**
   * @param {string} text
   * @param {Object} state
   * @returns {string}
   */
  function format(text, state) {
    if (!text) return '';
    return String(text).replace(/\{\s*([0-9a-zA-Z_-]+)\s*\}/g, function (m, key) {
      var v = resolve(key, state);
      return v == null ? m : v;   // 未知占位符原样输出
    });
  }

  BH.format = format;
  BH.formatKeys = ['age', 'aud', 'job', 'jobyears', 'track', 'money',
    'dadjob', 'momjob', 'chr', 'int', 'str', 'mny', 'spr'];
})(typeof globalThis !== 'undefined' ? globalThis : this);
