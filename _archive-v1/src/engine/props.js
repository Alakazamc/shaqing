/* badhand — 内置条件属性注册
 *
 * 正典：docs/modules/03-events.md §1.4（属性命名空间表）
 *
 * 单独成文件的理由：condition.js 只提供机制、不内置属性；
 * state.js 只管状态形状。谁把两者接起来是第三件事，
 * 分开之后 condition.js 可以脱离状态层单独测试。
 *
 * 依赖：errors.js, condition.js, state.js
 */
(function (g) {
  'use strict';
  var BH = (g.BH = g.BH || {});
  var C = BH.condition;
  var St = BH.state;

  var registered = false;

  function registerBuiltins() {
    if (registered) return;
    registered = true;

    // 时间
    C.defineProp('AGE', function (s) { return s.age; }, 'scalar');
    C.defineProp('SEASON', function (s) { return s.season; }, 'scalar');

    // 五维
    C.defineProp('CHR', function (s) { return s.CHR; }, 'scalar');
    C.defineProp('INT', function (s) { return s.INT; }, 'scalar');
    C.defineProp('STR', function (s) { return s.STR; }, 'scalar');
    C.defineProp('MNY', function (s) { return s.MNY; }, 'scalar');
    C.defineProp('SPR', function (s) { return s.SPR; }, 'scalar');

    // 本作特有三轴
    C.defineProp('AUD', function (s) { return s.AUD; }, 'scalar');
    C.defineProp('HOOK', function (s) { return s.HOOK; }, 'scalar');
    C.defineProp('HOOKP', function (s) { return s.HOOKP; }, 'scalar');

    // 列表
    C.defineProp('CAST', function (s) {
      return s.CAST.map(function (c) { return c.id; });
    }, 'list');
    C.defineProp('SCAR', function (s) { return s.SCAR; }, 'list');
    C.defineProp('FLAG', function (s) { return s.FLAG; }, 'list');
    C.defineProp('EVT', function (s) { return s.EVT; }, 'list');
    C.defineProp('TAG', function (s) { return s.TAG; }, 'list');

    // 便利量
    C.defineProp('SCARN', function (s) { return s.SCAR.length; }, 'scalar');
    C.defineProp('CASTN', function (s) { return s.CAST.length; }, 'scalar');

    // 轨道
    C.defineProp('TRACK', function (s) {
      return St.dominantTrack(s).id || '';
    }, 'scalar');
    C.defineProp('TRACKLV', function (s) {
      return St.dominantTrack(s).depth;
    }, 'scalar');

    // 职业（17-jobs.md §3.1：文本连贯性的主要引用对象）
    C.defineProp('JOB', function (s) { return s.JOB || ''; }, 'scalar');
    C.defineProp('JOBTIER', function (s) {
      if (!s.JOB) return 0;
      var R = BH.registry;
      return R.has('jobs', s.JOB) ? (R.get('jobs', s.JOB).tier || 1) : 1;
    }, 'scalar');
    C.defineProp('JOBYEARS', function (s) { return s.JOBYEARS || 0; }, 'scalar');
    C.defineProp('JOBLOG', function (s) { return s.JOBLOG || []; }, 'list');

    // 父母（17-jobs.md §2）
    C.defineProp('DADJOB', function (s) { return s.parents ? (s.parents.father.job || '') : ''; }, 'scalar');
    C.defineProp('MOMJOB', function (s) { return s.parents ? (s.parents.mother.job || '') : ''; }, 'scalar');
    C.defineProp('DADST', function (s) { return s.parents ? s.parents.father.status : ''; }, 'scalar');
    C.defineProp('MOMST', function (s) { return s.parents ? s.parents.mother.status : ''; }, 'scalar');

    // 开局四项
    C.defineProp('FAMILY', function (s) { return s.FAMILY || ''; }, 'scalar');
    // SEX 禁止被任何轨道入口引用（SYSTEM.md §0.4）——由 seal() 阶段的
    // 断言 53 检查，不在此处限制，因为普通事件可以正常引用它
    C.defineProp('SEX', function (s) { return s.SEX || ''; }, 'scalar');

    // NPC（10-npc.md §8）
    C.defineProp('NPC', function (s) { return s.NPC; }, 'list');
    C.defineProp('NPCGONE', function (s) { return s.NPCGONE; }, 'list');
    // 派生量：本局遇到过的人（在场 ∪ 已退场）。
    // 分叉链条件需要它——那个人可能在场，也可能已经淡了。
    C.defineProp('NPCKNOWN', function (s) {
      var out = s.NPC.slice();
      for (var i = 0; i < s.NPCGONE.length; i++) {
        if (out.indexOf(s.NPCGONE[i]) === -1) out.push(s.NPCGONE[i]);
      }
      return out;
    }, 'list');
    C.defineProp('NPCAX', function (s) {
      var out = [];
      var ids = Object.keys(s.NPCAX).sort();
      for (var i = 0; i < ids.length; i++) {
        out.push(ids[i] + ':' + s.NPCAX[ids[i]].stage);
      }
      return out;
    }, 'list');
    C.defineProp('NPCREL', function (s) {
      var out = [];
      var ids = Object.keys(s.NPCAX).sort();
      for (var i = 0; i < ids.length; i++) {
        out.push(ids[i] + ':' + (s.NPCAX[ids[i]].axis || 0));
      }
      return out;
    }, 'list');
    C.defineProp('NPCLV', function (s) {
      // 主导 NPC = 关系轴绝对值最大者；并列取 id 字典序，保证确定性
      var ids = Object.keys(s.NPCAX).sort();
      var best = 0;
      var bestAbs = -1;
      for (var i = 0; i < ids.length; i++) {
        var ax = s.NPCAX[ids[i]];
        var a = Math.abs(ax.axis || 0);
        if (a > bestAbs) { bestAbs = a; best = ax.stage || 0; }
      }
      return best;
    }, 'scalar');

    // 事件线（13-eventlines.md）
    // 精神指数档位（21-spirit.md §5.1）
    // 用序号而不是字符串，是为了让 SPRBAND<=1 这类区间条件写得出来
    C.defineProp('SPRBAND', function (s) {
      return BH.state.spiritBand(s.SPR);
    }, 'scalar');
    C.defineProp('SPRLOW', function (s) { return s.sprLow ? 1 : 0; }, 'scalar');
    C.defineProp('SPRHIGH', function (s) { return s.sprHigh ? 1 : 0; }, 'scalar');

    // 时间循环（20-anomaly.md §3）
    C.defineProp('LOOPN', function (s) { return s.LOOP ? s.LOOP.count : 0; }, 'scalar');
    C.defineProp('INLOOP', function (s) { return s.LOOP ? 1 : 0; }, 'scalar');
    C.defineProp('LOOPED', function (s) { return s.LOOPED ? 1 : 0; }, 'scalar');

    C.defineProp('ELINE', function (s) {
      var out = [];
      var ids = Object.keys(s.ELINE).sort();
      for (var i = 0; i < ids.length; i++) {
        out.push(ids[i] + ':' + s.ELINE[ids[i]].stage);
      }
      return out;
    }, 'list');
  }

  /** 仅供测试：允许在 condition._resetProps() 之后重新注册 */
  function _reset() {
    registered = false;
  }

  BH.props = { registerBuiltins: registerBuiltins, _reset: _reset };
})(typeof globalThis !== 'undefined' ? globalThis : this);
