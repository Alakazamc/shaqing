/* badhand — 错误类型
 *
 * 分两类，对应 design.md §7 的原则：
 *   内容错误要吵（开发期立刻暴露）
 *   运行时环境缺失要静（玩家无感降级）
 *
 * classic script，挂载到 globalThis.BH。不使用 ES module（BRIEF C8：file:// 双击即跑）
 */
(function (g) {
  'use strict';
  var BH = (g.BH = g.BH || {});

  /**
   * 内容作者错误：id 写错、条件语法错、字段缺失、引用不存在。
   * 这类错误必须在 seal() 阶段就抛出，绝不允许留到运行时静默降级。
   */
  function ContentError(message, detail) {
    var err = Error.call(this, message);
    this.name = 'ContentError';
    this.message = message;
    /** @type {Object} 出错的 id / 文件 / 违反的检查条目 */
    this.detail = detail || {};
    if (err.stack) this.stack = err.stack;
    else if (Error.captureStackTrace) Error.captureStackTrace(this, ContentError);
  }
  ContentError.prototype = Object.create(Error.prototype);
  ContentError.prototype.constructor = ContentError;

  /**
   * 引擎内部不变式被破坏。出现即代表有 bug，不是内容问题。
   */
  function EngineError(message, detail) {
    var err = Error.call(this, message);
    this.name = 'EngineError';
    this.message = message;
    this.detail = detail || {};
    if (err.stack) this.stack = err.stack;
    else if (Error.captureStackTrace) Error.captureStackTrace(this, EngineError);
  }
  EngineError.prototype = Object.create(Error.prototype);
  EngineError.prototype.constructor = EngineError;

  /** 抛 ContentError 的简写 */
  function contentFail(message, detail) {
    throw new ContentError(message, detail);
  }

  /** 断言引擎不变式。失败即 bug */
  function invariant(cond, message, detail) {
    if (!cond) throw new EngineError(message, detail);
  }

  BH.ContentError = ContentError;
  BH.EngineError = EngineError;
  BH.contentFail = contentFail;
  BH.invariant = invariant;
})(typeof globalThis !== 'undefined' ? globalThis : this);
