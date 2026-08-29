/* badhand — 计分
 *
 * 正典（唯一真相源，本文件不得偏离）：
 *   年度公式        docs/SYSTEM.md §2        R = round(B × M × A × F)
 *   结算顺序        docs/modules/01-scoring.md §2
 *   振幅 Amp        SYSTEM.md §3.1 / 01-scoring.md §4
 *   贯彻 Com        SYSTEM.md §3.2
 *   反讽 Iro        SYSTEM.md §3.3
 *   评分映射        SYSTEM.md §3.4
 *
 * 依赖：errors.js, state.js
 * 零 DOM 依赖
 */
(function (g) {
  'use strict';
  var BH = (g.BH = g.BH || {});
  var St = BH.state;
  var clamp = St.clamp;

  // ── 可调参常量（SYSTEM.md §8：量级估算，实测后回填）─────────────
  var K = {
    FATIGUE_BASE: 0.6,     // F = 0.6^n
    AUD_DIVISOR: 10,       // A = AUD / 10
    SEG_CAP: 0.8,          // 单段幅度上限
    AUD_WEIGHT_DIV: 20,    // g = min(段均 AUD / 20, 1.5)
    AUD_WEIGHT_CAP: 1.5,
    REPEAT_PENALTY: 0.5,   // 套路重复
    AMP_MIN: 0.5, AMP_MAX: 4.0,
    COM_MIN: 0.5, COM_MAX: 3.0,
    RATING_BASE: 2.0,      // 评分 = BASE + SLOPE × log10(total / PIVOT)
    RATING_SLOPE: 1.5,
    // 实测回填（SYSTEM.md §8）。首轮 250 只适合旧的 600 局内容量；
    // 当前内容量与职业/事件线接入后，总收视中位数约 2.6–2.9 万，
    // pivot 取 2000 才能让 random 评分回到 3.0–4.0 的默认区间。
    RATING_PIVOT: 2000,
    RATING_MIN: 1.0, RATING_MAX: 9.9,
  };

  // ── 年度收视 ────────────────────────────────────────────────

  /**
   * 计算一年（或一个场景）的收视。
   *
   * 调用方必须保证：effect/grant 已应用完毕，且 trope 计数**尚未** +1
   * （01-scoring.md §2 第 5 步：本次结算用的是"之前"的计数，
   *  否则同一 trope 首次出现就会自己打折自己）。
   *
   * @param {Object} args
   * @param {{label:string,value:number}[]} args.chips  B 的每一项
   * @param {{label:string,mult:number,kind:'add'|'mul'}[]} args.mults
   * @param {number} args.aud      当前 AUD
   * @param {number} args.tropeSeen 该 trope 本局**已计**次数
   * @returns {Object} ScoreBreakdown（design.md §3.1）
   */
  function year(args) {
    var chips = args.chips || [];
    var mults = args.mults || [];
    var i;

    var B = 0;
    for (i = 0; i < chips.length; i++) B += Number(chips[i].value) || 0;

    var addSum = 0;
    var mulProd = 1;
    for (i = 0; i < mults.length; i++) {
      var m = mults[i];
      if (m.kind === 'mul') mulProd *= Number(m.mult) || 1;
      else addSum += Number(m.mult) || 0;
    }
    // 舍入到两位小数。浮点累加会产生 1.7999999999999998 这类值，
    // 既在 UI 上难看，也让同 seed 的跨平台复现变脆
    addSum = Math.round(addSum * 100) / 100;
    mulProd = Math.round(mulProd * 1000) / 1000;
    var M = Math.round((1 + addSum) * mulProd * 1000) / 1000;

    var A = args.aud / K.AUD_DIVISOR;
    var F = Math.pow(K.FATIGUE_BASE, Math.max(0, args.tropeSeen | 0));

    var total = Math.round(B * M * A * F);

    return {
      chips: chips.slice(),
      mults: mults.slice(),
      B: B,
      M: M,
      aud: A,
      fatigue: F,
      total: total,
    };
  }

  // ── 振幅 Amp（SYSTEM.md §3.1，四道闸门）──────────────────────

  /**
   * @param {number[]} wlog        逐年水位
   * @param {number[]} audlog      与 wlog 等长的逐年 AUD
   * @param {string[]} tropelog    与 wlog 等长的逐年主 trope（可为 null）
   * @returns {{amp:number, segments:Object[]}}
   */
  function amplitude(wlog, audlog, tropelog) {
    var segs = [];
    if (!wlog || wlog.length < 2) return { amp: K.AMP_MIN, segments: segs };

    // 按一阶差分符号切段，差分为 0 的年份不打断单调段
    var dirs = [];
    var i;
    for (i = 1; i < wlog.length; i++) {
      var d = wlog[i] - wlog[i - 1];
      dirs.push(d === 0 ? 0 : d > 0 ? 1 : -1);
    }

    var start = 0;
    var lastDir = 0;
    for (i = 0; i < dirs.length; i++) {
      var dir = dirs[i];
      if (dir === 0) continue;
      if (lastDir !== 0 && dir !== lastDir) {
        segs.push({ from: start, to: i });
        start = i;
      }
      lastDir = dir;
    }
    if (lastDir !== 0) segs.push({ from: start, to: dirs.length });

    // 闸门四：必须多段。单调曲线（含一路平顺、一路烂到底）归零
    if (segs.length < 2) return { amp: K.AMP_MIN, segments: segs };

    var seenPairs = Object.create(null);
    var raw = 0;

    for (i = 0; i < segs.length; i++) {
      var sg = segs[i];
      var w0 = wlog[sg.from];
      var w1 = wlog[sg.to];
      if (!(w0 > 0) || !(w1 > 0)) continue;

      // 闸门一：段幅上限
      var a = Math.min(Math.abs(Math.log10(w1 / w0)), K.SEG_CAP);

      // 闸门二：观众权重。童年期 AUD 极低 → 段幅几乎不值钱
      var audSum = 0;
      var audN = 0;
      for (var j = sg.from; j <= sg.to && j < audlog.length; j++) {
        audSum += audlog[j];
        audN++;
      }
      var gw = audN
        ? Math.min(audSum / audN / K.AUD_WEIGHT_DIV, K.AUD_WEIGHT_CAP)
        : 0;

      // 闸门三：套路重复。(起点 trope, 终点 trope) 组合重复出现 → 折半
      var r = 1;
      if (tropelog) {
        var key = (tropelog[sg.from] || '') + '>' + (tropelog[sg.to] || '');
        if (key !== '>' && seenPairs[key]) r = K.REPEAT_PENALTY;
        if (key !== '>') seenPairs[key] = true;
      }

      sg.a = a;
      sg.g = gw;
      sg.r = r;
      sg.contrib = a * gw * r;
      raw += sg.contrib;
    }

    return {
      amp: clamp(K.AMP_MIN + raw, K.AMP_MIN, K.AMP_MAX),
      segments: segs,
    };
  }

  // ── 贯彻 Com（SYSTEM.md §3.2）────────────────────────────────

  /**
   * @param {Object} args
   * @param {number} args.dominantDecisions 主导轨道决策数
   * @param {number} args.totalDecisions    总决策数
   * @param {number} args.depth             主导轨道深度
   * @param {number} args.maxDepth          该轨道最大深度
   * @param {Object} args.trackDepths       {trackId: depth} 用于"什么都试了一下"判定
   */
  function commitment(args) {
    var depths = args.trackDepths || {};
    var ids = Object.keys(depths);

    // 硬惩罚：涉及 ≥3 条轨道且全部 depth ≤ 2 → 强制 0.5
    if (ids.length >= 3) {
      var allShallow = true;
      for (var i = 0; i < ids.length; i++) {
        if (depths[ids[i]] > 2) { allShallow = false; break; }
      }
      if (allShallow) return K.COM_MIN;
    }

    var total = args.totalDecisions || 0;
    if (!total) return K.COM_MIN;
    var p = clamp((args.dominantDecisions || 0) / total, 0, 1);
    var d = args.maxDepth
      ? clamp((args.depth || 0) / args.maxDepth, 0, 1)
      : 0;

    return clamp(K.COM_MIN + 2.5 * Math.pow(p, 1.5) * d, K.COM_MIN, K.COM_MAX);
  }

  // ── 反讽 Iro（SYSTEM.md §3.3）────────────────────────────────

  /**
   * @param {string[]} deathTags
   * @param {string[]} setupTags   开局天赋 ∪ 首张人设 ∪ S1 事件 的 tags
   * @param {string} deathTrope
   * @param {string} peakTrope     最高收视年的 trope
   */
  function irony(deathTags, setupTags, deathTrope, peakTrope) {
    deathTags = deathTags || [];
    setupTags = setupTags || [];
    var hits = 0;
    for (var i = 0; i < deathTags.length; i++) {
      if (setupTags.indexOf(deathTags[i]) !== -1) hits++;
    }
    var iro = hits >= 3 ? 4.0 : hits === 2 ? 2.5 : hits === 1 ? 1.5 : 1.0;
    // 首尾呼应
    if (deathTrope && peakTrope && deathTrope === peakTrope) iro += 0.5;
    return iro;
  }

  // ── 评分映射（SYSTEM.md §3.4）────────────────────────────────

  /**
   * @param {number} total 总收视
   * @returns {number} 豆瓣式评分
   */
  function rating(total) {
    if (!(total > 0)) return K.RATING_MIN;
    var r =
      K.RATING_BASE + K.RATING_SLOPE * Math.log10(total / K.RATING_PIVOT);
    return clamp(Math.round(r * 10) / 10, K.RATING_MIN, K.RATING_MAX);
  }

  /**
   * 终局结算。真结局时 rating 为 null（07-settlement.md §5：显示 —，不是 0.0）
   */
  function final(args) {
    var seasonTotal = 0;
    for (var i = 0; i < args.seasonSums.length; i++) {
      seasonTotal += args.seasonSums[i];
    }
    var amp = args.amp;
    var com = args.com;
    var iro = args.iro;
    var total = seasonTotal * amp * com * iro;
    return {
      seasonTotal: seasonTotal,
      amp: amp,
      com: com,
      iro: iro,
      total: total,
      rating: args.trueEnding ? null : rating(total),
    };
  }

  BH.scoring = {
    year: year,
    amplitude: amplitude,
    commitment: commitment,
    irony: irony,
    rating: rating,
    final: final,
    K: K,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
