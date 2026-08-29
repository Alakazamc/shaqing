/* badhand — seal()：封盘校验
 *
 * 正典：docs/modules/14-content-api.md §3、docs/content/README.md §5 §5.1
 * 原则：内容错误要吵（design.md §7）。所有跨引用与规范检查都在这里一次性做完，
 *       绝不留到运行时静默降级。
 *
 * 依赖：errors.js, condition.js, registry.js
 */
(function (g) {
  'use strict';
  var BH = (g.BH = g.BH || {});
  var contentFail = BH.contentFail;
  var R = BH.registry;
  var C = BH.condition;

  var problems = [];

  function bad(msg, detail) {
    problems.push({ msg: msg, detail: detail || {} });
  }

  // ── 叙述层禁用词（content/authoring.md §8）─────────────────────
  var BANNED = {
    情绪定性: ['难过', '崩溃', '绝望', '幸福', '开心', '痛苦'],
    价值判断: ['可悲', '可笑', '愚蠢', '勇敢', '值得', '伟大', '高尚'],
    说教连接: ['其实', '原来', '终于', '明白', '领悟', '才发现'],
  };

  /** 去掉引号内内容：角色台词与心理活动豁免（authoring.md §8.1） */
  function stripQuoted(text) {
    return String(text)
      .replace(/「[^」]*」/g, '')
      .replace(/“[^”]*”/g, '')
      .replace(/"[^"]*"/g, '');
  }

  /**
   * 豁免词组：这些词组里含禁用词，但语义完全不同，属于误报。
   * 例："原来的位置"是方位词，不是说教连接词"原来（其实）"。
   * 简单子串匹配会把它们全拦下，导致作者被迫写出更差的句子。
   */
  var EXEMPT = [
    '原来的', '原来那', '原来这', '原来是那',   // 方位 / 指代
    '明白纸', '明白账',                        // 名词
    '终于站', '终于走',                        // 极少数动作性用法留口
  ];

  function stripExempt(text) {
    var out = String(text);
    for (var i = 0; i < EXEMPT.length; i++) {
      out = out.split(EXEMPT[i]).join('　');
    }
    return out;
  }

  function checkNarration(text, where) {
    if (!text) return;
    var bare = stripExempt(stripQuoted(text));
    for (var group in BANNED) {
      var words = BANNED[group];
      for (var i = 0; i < words.length; i++) {
        if (bare.indexOf(words[i]) !== -1) {
          bad(
            '叙述层禁用词「' + words[i] + '」（' + group + '）出现在 ' + where +
              '\n  原文：' + text +
              '\n  提示：角色台词与心理活动请放进「」，即可豁免',
            { where: where, word: words[i], group: group }
          );
        }
      }
    }
  }

  /** 心理活动内部仍禁"说教连接"组（authoring.md §8 使用说明 2） */
  function checkInnerThought(text, where) {
    if (!text) return;
    var m = String(text).match(/「[^」]*」/g);
    if (!m) return;
    for (var i = 0; i < m.length; i++) {
      // 只检查看起来像心理活动的引述（紧跟在"想"后面的）
      var idx = String(text).indexOf(m[i]);
      var before = String(text).slice(Math.max(0, idx - 3), idx);
      if (before.indexOf('想') === -1) continue;
      var words = BANNED.说教连接;
      for (var j = 0; j < words.length; j++) {
        if (m[i].indexOf(words[j]) !== -1) {
          bad(
            '心理活动里出现说教连接词「' + words[j] + '」，这是借内心独白点题：' + where +
              '\n  原文：' + text,
            { where: where, word: words[j] }
          );
        }
      }
    }
  }

  function len(text) {
    return String(text || '').replace(/\s/g, '').length;
  }

  BH._seal = {
    problems: problems,
    bad: bad,
    checkNarration: checkNarration,
    checkInnerThought: checkInnerThought,
    stripQuoted: stripQuoted,
    stripExempt: stripExempt,
    EXEMPT: EXEMPT,
    len: len,
    BANNED: BANNED,
    _clear: function () { problems.length = 0; },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ── 各类内容的校验 ─────────────────────────────────────────────── */
(function (g) {
  'use strict';
  var BH = g.BH;
  var R = BH.registry;
  var C = BH.condition;
  var S = BH._seal;
  var bad = S.bad;

  var SENSITIVE = ['kuaxingbie', 'yaowu', 'dilei'];
  var ENDING_TAG_GROUP = '收尾';

  function allTags() {
    var t = R.tags();
    var out = [];
    for (var k in t) out = out.concat(t[k]);
    return out;
  }

  function tagsInGroup(group) {
    return (R.tags()[group] || []).slice();
  }

  function checkCond(src, where) {
    if (!src) return;
    try {
      C.validate(src);
    } catch (e) {
      bad('条件无法解析（' + where + '）：' + e.message, { where: where });
    }
  }

  /** 条件里是否引用了属性键（用于敏感线入口检查，断言 42） */
  var ALLOWED_IN_SENSITIVE_ENTRY = ['FLAG', 'EVT', 'AGE', 'SEASON'];
  function condRefsDisallowedProps(src, allowed) {
    if (!src) return [];
    var found = [];
    var re = /([A-Z][A-Z0-9_]*)\s*(?:>=|<=|!=|[><=?!])/g;
    var m;
    while ((m = re.exec(src))) {
      if (allowed.indexOf(m[1]) === -1) found.push(m[1]);
    }
    return found;
  }

  function validateEvents() {
    var tagPool = allTags();
    var tropePool = R.tropes();
    var endTags = tagsInGroup(ENDING_TAG_GROUP);

    R.list('events').forEach(function (e) {
      var where = 'event:' + e.id;

      // 文案规范
      S.checkNarration(e.text, where + '.text');
      S.checkInnerThought(e.text, where + '.text');
      // 长度上限（authoring.md §2.9，实测后放宽：60 字过短，读起来是碎片）
      // 场景节拍是手机屏幕上的短拍，正典硬上限为 30 字（16-scenes.md §10）。
      // 普通事件的放宽上限不应渗透到 beat，否则长事件会失去逐拍节奏。
      var LIMITS = { beat: 30, flavor: 90, decision: 140, echo: 140 };
      var limit = LIMITS[e.kind] || 140;
      if (S.len(e.text) > limit) {
        bad('事件正文超长（' + S.len(e.text) + ' > ' + limit + ' 字）：' + where, { where: where });
      }

      checkCond(e.include, where + '.include');
      checkCond(e.exclude, where + '.exclude');

      // tags / tropes 必须在枚举内
      (e.tags || []).forEach(function (t) {
        if (tagPool.indexOf(t) === -1) bad('未登记的 tag「' + t + '」：' + where, { where: where });
      });
      (e.tropes || []).forEach(function (t) {
        if (!tropePool[t]) bad('未登记的 trope「' + t + '」：' + where, { where: where });
      });

      // 死法事件：≥2 个 tag，且至少 1 个来自"收尾"组
      if (e.kind === 'death') {
        var tg = e.tags || [];
        if (tg.length < 2) {
          bad('死法事件至少需要 2 个 tag（反讽乘数依赖）：' + where, { where: where });
        }
        var hasEnd = tg.some(function (t) { return endTags.indexOf(t) !== -1; });
        if (!hasEnd) {
          bad('死法事件至少需要 1 个「收尾」组 tag：' + where, { where: where });
        }
      }

      // 选项
      var opts = e.options || [];
      if (e.kind === 'decision' && (opts.length < 2 || opts.length > 3)) {
        bad('decision 事件必须有 2–3 个选项，实际 ' + opts.length + '：' + where, { where: where });
      }
      var hasEsc = false, hasRes = false;
      opts.forEach(function (o, i) {
        var ow = where + '.options[' + i + ']';
        S.checkNarration(o.text, ow);
        S.checkInnerThought(o.text, ow);
        if (S.len(o.text) > 20) {
          bad('选项文案超长（' + S.len(o.text) + ' > 14 字）：' + ow, { where: ow });
        }
        if (o.escalate) hasEsc = true;
        if (o.restraint) hasRes = true;
        if (o.next && !R.has('events', o.next)) {
          bad('选项 next 指向不存在的事件：' + o.next + '（' + ow + '）', { where: ow });
        }
        if (o.next && R.has('events', o.next) && !R.get('events', o.next).noRandom) {
          bad('next 指向的事件必须 noRandom：' + o.next + '（' + ow + '）', { where: ow });
        }
        (o.tropes || []).forEach(function (t) {
          if (!tropePool[t]) bad('选项引用了未登记的 trope「' + t + '」：' + ow,
            { where: ow });
        });
        var relation = o.relation || {};
        if (Array.isArray(relation) || typeof relation !== 'object') {
          bad('relation 必须是 {npcId: delta} 对象：' + ow, { where: ow });
        } else {
          for (var rid in relation) {
            if (!R.has('npcs', rid)) {
              bad('relation 引用了不存在的 NPC：' + rid + '（' + ow + '）', { where: ow });
            } else if (!isFinite(Number(relation[rid]))) {
              bad('relation delta 必须是有限数字：' + rid + '（' + ow + '）', { where: ow });
            }
          }
        }
        var gr = o.grant || {};
        (gr.cast || []).forEach(function (id) {
          if (!R.has('cast', id)) bad('grant.cast 不存在：' + id + '（' + ow + '）', { where: ow });
        });
        (gr.scar || []).forEach(function (id) {
          if (!R.has('scars', id)) bad('grant.scar 不存在：' + id + '（' + ow + '）', { where: ow });
        });
        for (var tid in (o.track || {})) {
          if (!R.has('tracks', tid)) bad('track 不存在：' + tid + '（' + ow + '）', { where: ow });
        }
      });
      // 收手必须与加码同在（断言 64 / authoring.md §3.1）
      if (hasRes && !hasEsc) {
        bad('存在 restraint 选项但没有 escalate 选项，「放弃 N 分」无从计算：' + where, { where: where });
      }
    });
  }

  function validateEventlines() {
    R.list('eventlines').forEach(function (el) {
      var where = 'eventline:' + el.id;
      var chain = el.chain || [];
      if (!chain.length) bad('事件线 chain 为空：' + where, { where: where });

      chain.forEach(function (eid) {
        if (!R.has('events', eid)) {
          bad('chain 指向不存在的事件：' + eid + '（' + where + '）', { where: where });
          return;
        }
        if (!R.get('events', eid).noRandom) {
          bad('chain 内事件必须 noRandom：' + eid + '（' + where + '）', { where: where });
        }
      });

      if (el.minGap != null && !(el.minGap >= 1)) {
        bad('eventline minGap 必须 >= 1：' + where, { where: where });
      }
      if (el.maxGap != null && !(el.maxGap >= (el.minGap || 1))) {
        bad('eventline maxGap 必须 >= minGap：' + where, { where: where });
      }
      function checkSpecialEvent(eid, label) {
        if (!eid) return;
        if (!R.has('events', eid)) {
          bad(label + ' 指向不存在的事件：' + eid + '（' + where + '）', { where: where });
        } else if (!R.get('events', eid).noRandom) {
          bad(label + ' 必须指向 noRandom 事件：' + eid + '（' + where + '）', { where: where });
        }
      }
      checkSpecialEvent(el.missEvent, 'missEvent');
      if (el.reunion) {
        if (typeof el.reunion !== 'object' || !el.reunion.event) {
          bad('reunion 必须是 {event, minGap}：' + where, { where: where });
        } else {
          checkSpecialEvent(el.reunion.event, 'reunion.event');
          if (el.reunion.minGap != null && !(el.reunion.minGap >= 1)) {
            bad('reunion.minGap 必须 >= 1：' + where, { where: where });
          }
        }
      }

      // 分叉（断言 37–40）
      (el.forks || []).forEach(function (f, i) {
        var fw = where + '.forks[' + i + ']';
        if (!f.chain || !f.chain.length) {
          bad('分叉 chain 不能为空——退出必须是另一条完整的路：' + fw, { where: fw });
          return;
        }
        if (!(f.from >= 1 && f.from <= el.stages - 1)) {
          bad('分叉 from 必须落在 1…stages-1，实际 ' + f.from + '：' + fw, { where: fw });
        }
        var last = f.chain[f.chain.length - 1];
        if (R.has('events', last)) {
          var le = R.get('events', last);
          var hasNext = (le.options || []).some(function (o) { return o.next; });
          if (hasNext) bad('分叉终点事件不应再有 next：' + last + '（' + fw + '）', { where: fw });
          if (!grantsAnyCast(le)) {
            bad('分叉终点必须至少授予 1 张人设牌，否则走分叉是「更少」而不是「另一套」：' + fw, { where: fw });
          }
        }
        if (!(f.depth > 0)) {
          bad('分叉的轨道深度增量必须 > 0（增量为 0 等于变相截断）：' + fw, { where: fw });
        }
      });

      chain.forEach(function (eid, idx) {
        if (!R.has('events', eid)) return;
        (R.get('events', eid).options || []).forEach(function (o) {
          if (o.fork == null) return;
          var fk = (el.forks || [])[o.fork];
          if (!fk) {
            bad('选项 fork 不存在：' + o.fork + '（' + where + ' stage ' + (idx + 1) + '）', { where: where });
          } else if (fk.from !== idx + 1) {
            bad('选项 fork 必须对应当前主链阶段：' + o.fork + '（' + where + ' stage ' + (idx + 1) + '）', { where: where });
          }
        });
      });

      // 主链终点也必须给牌
      var mainLast = chain[chain.length - 1];
      if (R.has('events', mainLast) && !grantsAnyCast(R.get('events', mainLast))) {
        bad('主链终点必须至少授予 1 张人设牌：' + where, { where: where });
      }

      // 敏感题材（断言 41–42）
      if (SENSITIVE.indexOf(el.track) !== -1) {
        if (el.name !== null && el.name !== undefined) {
          bad('敏感题材事件线的 name 必须为 null（不在任何 UI 露出线名）：' + where, { where: where });
        }
        var entry = chain[0];
        if (R.has('events', entry)) {
          var refs = condRefsDisallowedProps(
            R.get('events', entry).include,
            ALLOWED_IN_SENSITIVE_ENTRY
          );
          if (refs.length) {
            bad(
              '敏感题材入口不得引用属性键（会把因果关系读成病理化）：' + entry +
                ' 引用了 ' + refs.join(' ') +
                '\n  只允许 ' + ALLOWED_IN_SENSITIVE_ENTRY.join(' '),
              { where: where }
            );
          }
        }
      }

      // 场景（断言 59–64）
      var scenes = el.scenes || {};
      for (var stage in scenes) {
        var sw = where + '.scenes[' + stage + ']';
        var st = Number(stage);
        if (!(st >= 1 && st <= el.stages)) {
          bad('scenes 的键必须落在 1…stages，实际 ' + stage + '：' + sw, { where: sw });
        }
        var beats = scenes[stage].beats || [];
        if (beats.length < 3 || beats.length > 6) {
          bad('场景节拍数必须在 3–6，实际 ' + beats.length + '：' + sw, { where: sw });
        }
        var optionBeats = 0;
        beats.forEach(function (bid) {
          if (!R.has('events', bid)) {
            bad('场景节拍指向不存在的事件：' + bid + '（' + sw + '）', { where: sw });
            return;
          }
          var be = R.get('events', bid);
          if (be.kind !== 'beat') bad('场景节拍的 kind 必须是 beat：' + bid, { where: sw });
          if (!be.noRandom) bad('场景节拍必须 noRandom：' + bid, { where: sw });
          if ((be.options || []).length) optionBeats++;
        });
        if (optionBeats < 1 || optionBeats > 2) {
          bad('每场景带选项的节拍数必须在 1–2，实际 ' + optionBeats + '：' + sw, { where: sw });
        }
      }
    });
  }

  function grantsAnyCast(e) {
    return (e.options || []).some(function (o) {
      return o.grant && o.grant.cast && o.grant.cast.length;
    });
  }

  BH._seal.validateEvents = validateEvents;
  BH._seal.validateEventlines = validateEventlines;
  BH._seal.condRefsDisallowedProps = condRefsDisallowedProps;
  BH._seal.SENSITIVE = SENSITIVE;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ── NPC / 开局四项 / 抽卡 / 轨道，以及 seal 主入口 ─────────────── */
(function (g) {
  'use strict';
  var BH = g.BH;
  var R = BH.registry;
  var C = BH.condition;
  var S = BH._seal;
  var bad = S.bad;
  var contentFail = BH.contentFail;

  function validatePlans() {
    var tagTable = R.tags();
    var tagPool = [];
    for (var group in tagTable) tagPool = tagPool.concat(tagTable[group]);
    var riskPool = ['low', 'medium', 'high'];
    var effectPool = ['CHR', 'INT', 'STR', 'MNY', 'SPR', 'AUD', 'HOOK'];

    R.list('plans').forEach(function (p) {
      var where = 'plan:' + p.id;
      var seasons = Array.isArray(p.season) ? p.season : [p.season];
      if (!seasons.length || seasons.some(function (n) {
        return !(Number.isInteger(n) && n >= 1 && n <= 5);
      })) {
        bad('plan season 必须覆盖合法季号 1…5：' + where, { where: where });
      }
      if (riskPool.indexOf(p.risk) === -1) {
        bad('plan risk 必须是 low/medium/high：' + where, { where: where });
      }
      if (p.track != null && !R.has('tracks', p.track)) {
        bad('plan track 不存在：' + p.track + '（' + where + '）', { where: where });
      }
      if (p.metaUnlock != null) {
        var unlock = p.metaUnlock;
        var unlockKinds = { track: 'tracks', npc: 'npcs' };
        if (!unlock || Array.isArray(unlock) || typeof unlock !== 'object' ||
            !unlockKinds[unlock.type] || typeof unlock.id !== 'string' || !unlock.id) {
          bad('plan metaUnlock 必须是合法的 track/npc + id：' + where, { where: where });
        } else if (!R.has(unlockKinds[unlock.type], unlock.id)) {
          bad('plan metaUnlock 目标不存在：' + unlock.type + ':' + unlock.id + '（' + where + '）',
            { where: where });
        }
      }
      ['tags', 'poolTags'].forEach(function (key) {
        if (p[key] == null) return;
        if (!Array.isArray(p[key])) {
          bad('plan ' + key + ' 必须是数组：' + where, { where: where });
          return;
        }
        p[key].forEach(function (tag) {
          if (tagPool.indexOf(tag) === -1) {
            bad('plan ' + key + ' 引用了未登记 tag「' + tag + '」：' + where,
              { where: where });
          }
        });
      });
      if (p.lineBias != null) {
        if (!Array.isArray(p.lineBias)) {
          bad('plan lineBias 必须是事件线 id 数组：' + where, { where: where });
        } else {
          p.lineBias.forEach(function (lineId) {
            if (!R.has('eventlines', lineId)) {
              bad('plan lineBias 事件线不存在：' + lineId + '（' + where + '）',
                { where: where });
            }
          });
        }
      }
      if (p.gate) {
        try { C.validate(p.gate); }
        catch (e) { bad('plan gate 无法解析（' + where + '）：' + e.message, { where: where }); }
      }
      if (p.effect != null) {
        if (!p.effect || Array.isArray(p.effect) || typeof p.effect !== 'object') {
          bad('plan effect 必须是对象：' + where, { where: where });
        } else {
          for (var key in p.effect) {
            if (effectPool.indexOf(key) === -1) {
              bad('plan effect 出现禁止字段 ' + key + '：' + where, { where: where });
            } else if (!isFinite(Number(p.effect[key]))) {
              bad('plan effect.' + key + ' 必须是有限数字：' + where, { where: where });
            }
          }
        }
      }
      if (p.cost != null && !Array.isArray(p.cost)) {
        bad('plan cost 必须是数组：' + where, { where: where });
      }
    });
  }

  function validateNpcs() {
    R.list('npcs').forEach(function (n) {
      var where = 'npc:' + n.id;
      if (!R.has('eventlines', n.eventline)) {
        bad('NPC 的 eventline 不存在：' + n.eventline + '（' + where + '）', { where: where });
        return;
      }
      var el = R.get('eventlines', n.eventline);

      // NPC 事件不进通用池，且必须引用 NPC 状态（断言 46–47）
      // 主链：第 0 个是入口事件（NPC 还没出场），其余必须引用 NPC 状态。
      // 分叉链：从 stage ≥ 1 岔出，此时关系一定已存在，因此全部都要引用。
      function checkOne(eid, needRef) {
        if (!R.has('events', eid)) return;
        var e = R.get('events', eid);
        if (!e.noRandom) {
          bad('NPC 事件必须 noRandom（结构上排除与随机事件撞车）：' + eid, { where: where });
        }
        if (needRef && (e.include || '').indexOf('NPC') === -1) {
          bad(
            'NPC 事件的 include 必须引用 NPC / NPCAX / NPCKNOWN，' +
              '否则可能对没遇到过或已退场的人触发：' + eid,
            { where: where }
          );
        }
      }
      (el.chain || []).forEach(function (eid, idx) { checkOne(eid, idx > 0); });
      (el.forks || []).forEach(function (f) {
        (f.chain || []).forEach(function (eid) { checkOne(eid, true); });
      });
      checkOne(el.missEvent, true);
      if (el.reunion) checkOne(el.reunion.event, true);

      // 退场事件唯一（断言 45）
      if (!n.exit) {
        bad('NPC 必须有退场事件：' + where, { where: where });
      } else if (!R.has('events', n.exit)) {
        bad('NPC 的退场事件不存在：' + n.exit + '（' + where + '）', { where: where });
      }
      (n.exitEvents || []).forEach(function (eid) {
        if (!R.has('events', eid)) {
          bad('NPC 的 exitEvents 事件不存在：' + eid + '（' + where + '）', { where: where });
        }
      });
    });
  }

  function validateOrigins() {
    var o = R.origins();

    // 家庭旗标必须被引用（断言 50）
    var allCond = '';
    R.list('events').forEach(function (e) {
      allCond += ' ' + (e.include || '') + ' ' + (e.exclude || '');
    });
    R.list('tracks').forEach(function (t) { allCond += ' ' + (t.entry || ''); });

    o.family.forEach(function (f) {
      (f.flags || []).forEach(function (fl) {
        if (allCond.indexOf(fl) === -1) {
          bad('家庭旗标从未被任何条件引用（死内容）：' + fl + '（family:' + f.id + '）', {});
        }
      });
    });

    // 性格必须有正有负（断言 51）
    o.personality.forEach(function (p) {
      var pos = (p.addMult || 0) > 0 || (p.addDrama || 0) > 0;
      var neg = false;
      for (var k in (p.effect || {})) {
        if (Number(p.effect[k]) < 0) neg = true;
      }
      if (!pos || !neg) {
        bad(
          '性格项必须同时有正向与负向字段，否则玩家会重抽到手酸：personality:' + p.id,
          {}
        );
      }
    });

    // 观众汇率双向不对称（断言 52）
    o.sex.forEach(function (sx) {
      var rates = sx.audRate || {};
      var keys = Object.keys(rates);
      if (!keys.length) {
        bad('性别项缺少 audRate（观众汇率）：sex:' + sx.id, {});
        return;
      }
      var hasBelow = keys.some(function (k) { return rates[k] < 1.0; });
      if (!hasBelow) {
        bad(
          '每个性别都必须至少有一项观众汇率 < 1.0（双向不对称，不是单向惩罚）：sex:' + sx.id,
          {}
        );
      }
    });
  }

  function validateTracks() {
    R.list('tracks').forEach(function (t) {
      var where = 'track:' + t.id;
      // 轨道入口必须性别中性（断言 53）
      if (t.entry && /\bSEX\b/.test(t.entry)) {
        bad('轨道入口不得引用 SEX（门槛必须性别中性）：' + where, { where: where });
      }
      if (t.entry) {
        try { BH.condition.validate(t.entry); }
        catch (e) { bad('轨道入口条件无法解析（' + where + '）：' + e.message, { where: where }); }
      }
      if (!(t.maxDepth > 0)) bad('轨道 maxDepth 必须 > 0：' + where, { where: where });
    });
  }

  function validateGacha() {
    var TYPE_TO_KIND = {
      family: null, personality: null, sex: null,
      talent: 'talents', cast: 'cast', npc: 'npcs', track: 'tracks',
    };
    var o = R.origins();
    R.list('gacha').forEach(function (item) {
      var where = 'gacha:' + item.id;
      if (item.type === 'ending') {
        bad('抽卡池不得包含结局（真结局红线）：' + where, { where: where });
        return;
      }
      if (!(item.type in TYPE_TO_KIND)) {
        bad('未知抽卡类型：' + item.type + '（' + where + '）', { where: where });
        return;
      }
      var kind = TYPE_TO_KIND[item.type];
      if (kind) {
        if (!R.has(kind, item.target)) {
          bad('抽卡 target 不存在：' + item.target + '（' + where + '）', { where: where });
        }
      } else {
        var pool = o[item.type] || [];
        if (!pool.some(function (x) { return x.id === item.target; })) {
          bad('抽卡 target 不存在于 origins.' + item.type + '：' + item.target, { where: where });
        }
      }
      if (!(item.dupValue > 0)) {
        bad('抽卡条目 dupValue 必须 > 0（重复必须有转化，绝不空手）：' + where, { where: where });
      }
      var scopes = R.list('tracks').map(function (t) { return t.lexiconScope; });
      (item.scopes || []).forEach(function (sc) {
        if (scopes.indexOf(sc) === -1 && sc !== 'common') {
          bad('抽卡 scopes 不在 tracks 的 lexiconScope 枚举内：' + sc + '（' + where + '）', { where: where });
        }
      });
    });
  }

  /**
   * 职业可达性（17-jobs.md §6）。
   * 定义了却没有任何事件能授予的职业是"孤儿职业"——
   * 玩家永远进不去，而所有引用它的文案全部失效。
   */
  function validateJobsReachable() {
    var granted = {};
    R.list('events').forEach(function (e) {
      (e.options || []).forEach(function (o) {
        if (o.grant && o.grant.job) granted[o.grant.job] = true;
      });
    });

    R.list('jobs').forEach(function (j) {
      var where = 'job:' + j.id;
      // tier 1 必须由事件直接授予；tier ≥2 可以只通过晋升进入
      var byPromotion = R.list('jobs').some(function (p) {
        return (p.next || []).indexOf(j.id) !== -1;
      });
      if (!granted[j.id] && !byPromotion) {
        bad(
          '孤儿职业：没有任何事件的 grant.job 指向它，也不在任何职业的 next 里，' +
            '玩家永远进不去：' + where,
          { where: where }
        );
      }
      (j.next || []).forEach(function (n) {
        if (!R.has('jobs', n)) {
          bad('职业 next 指向不存在的职业：' + n + '（' + where + '）', { where: where });
        } else if (R.get('jobs', n).tier <= j.tier) {
          bad('职业晋升的 tier 必须严格递增：' + j.id + '(t' + j.tier + ')' +
            ' → ' + n + '(t' + R.get('jobs', n).tier + ')', { where: where });
        }
      });
      if (j.entry && /\bSEX\b/.test(j.entry)) {
        bad('职业门槛不得引用 SEX（性别中性）：' + where, { where: where });
      }
      if (!R.has('tracks', j.track)) {
        bad('职业的 track 不存在：' + j.track + '（' + where + '）', { where: where });
      }
    });
  }

  /** 时间循环（20-anomaly.md §4 检查 4 与 5） */
  function validateLoop() {
    R.list('events').forEach(function (e) {
      var opts = e.options || [];
      var isLoop = opts.some(function (o) { return o.breaks; });
      if (!isLoop) return;
      var where = 'loop-event:' + e.id;

      // 检查 4：循环内不得含 restraint 选项
      opts.forEach(function (o) {
        if (o.restraint) {
          bad('时间循环内不得出现 restraint 选项（循环里本来就没有分可放弃，' +
            '放收手会让 C7 判定变廉价）：' + where, { where: where });
        }
      });

      // 检查 5：普通选项数 ≥ 上限轮数，否则玩家会卡在没有新选项可选
      var normal = opts.filter(function (o) { return !o.breaks; }).length;
      if (normal < 6) {
        bad('时间循环的普通选项只有 ' + normal + ' 个，少于上限轮数 6，' +
          '玩家会在选项耗尽后卡住：' + where, { where: where });
      }

      // 出口必须唯一，否则"只剩一个出口"的演出不成立
      var breakers = opts.filter(function (o) { return o.breaks; }).length;
      if (breakers !== 1) {
        bad('时间循环必须有且仅有 1 个出口选项，实际 ' + breakers +
          '：' + where, { where: where });
      }
    });
  }

  function validateEndings() {
    R.list('endings').forEach(function (e) {
      var where = 'ending:' + e.id;
      S.checkNarration(e.text, where);
      S.checkInnerThought(e.text, where);
      if (S.len(e.text) > 200) {
        bad('结局文本超长（' + S.len(e.text) + ' > 200 字）：' + where, { where: where });
      }
      if (e.trueEnding) {
        // C7：真结局文本禁用词更严
        var extra = ['其实', '原来', '终于', '重要', '明白', '值得', '好日子'];
        var bare = S.stripQuoted(e.text);
        extra.forEach(function (w) {
          if (bare.indexOf(w) !== -1) {
            bad('真结局文本出现禁用词「' + w + '」：' + where, { where: where });
          }
        });
      }
    });
  }

  /** 无孤儿事件：noRandom 事件必须被某处指向（content/README.md §5 检查 9） */
  function validateOrphans() {
    var referenced = {};
    R.list('events').forEach(function (e) {
      (e.options || []).forEach(function (o) {
        if (o.next) referenced[o.next] = true;
        // 时间循环事件由 grant.loop 引用（20-anomaly.md §3）
        if (o.grant && o.grant.loop) referenced[o.grant.loop] = true;
      });
    });
    R.list('eventlines').forEach(function (el) {
      (el.chain || []).forEach(function (id) { referenced[id] = true; });
      (el.forks || []).forEach(function (f) {
        (f.chain || []).forEach(function (id) { referenced[id] = true; });
      });
      if (el.missEvent) referenced[el.missEvent] = true;
      if (el.reunion && el.reunion.event) referenced[el.reunion.event] = true;
      var sc = el.scenes || {};
      for (var st in sc) {
        (sc[st].beats || []).forEach(function (id) { referenced[id] = true; });
      }
    });
    R.list('npcs').forEach(function (n) {
      if (n.exit) referenced[n.exit] = true;
      (n.exitEvents || []).forEach(function (id) { referenced[id] = true; });
    });

    R.list('events').forEach(function (e) {
      // 死法事件由死法池按条件选取，不经 next / chain 指向，因此豁免。
      // 它们仍然必须 noRandom——不能混进普通年份的加权池。
      if (e.kind === 'death') return;
      if (e.noRandom && !referenced[e.id]) {
        bad('孤儿事件：noRandom 但没有任何地方指向它：event:' + e.id, {});
      }
    });
  }

  /**
   * 封盘。校验全部内容并冻结注册表。
   * @throws {BH.ContentError} 任一检查失败即抛出，消息里列全部问题
   */
  function seal() {
    if (R.isSealed()) return;
    S._clear();

    S.validateEvents();
    S.validateEventlines();
    validatePlans();
    validateNpcs();
    validateTracks();
    validateOrigins();
    validateGacha();
    validateEndings();
    validateLoop();
    validateJobsReachable();
    validateOrphans();

    if (S.problems.length) {
      var lines = S.problems.map(function (p, i) {
        return '  ' + (i + 1) + '. ' + p.msg;
      });
      contentFail(
        '内容校验失败，共 ' + S.problems.length + ' 处：\n' + lines.join('\n'),
        { problems: S.problems.slice() }
      );
    }

    // 冻结：seal 之后任何写入抛错（断言 69）
    var store = R._store();
    deepFreeze(store);
    R._markSealed();
  }

  function deepFreeze(o) {
    if (o === null || typeof o !== 'object' || Object.isFrozen(o)) return o;
    Object.freeze(o);
    Object.keys(o).forEach(function (k) { deepFreeze(o[k]); });
    return o;
  }

  BH.seal = seal;
  BH._seal.validateNpcs = validateNpcs;
  BH._seal.validatePlans = validatePlans;
  BH._seal.validateOrigins = validateOrigins;
  BH._seal.validateTracks = validateTracks;
  BH._seal.validateGacha = validateGacha;
  BH._seal.validateEndings = validateEndings;
  BH._seal.validateLoop = validateLoop;
  BH._seal.validateOrphans = validateOrphans;
})(typeof globalThis !== 'undefined' ? globalThis : this);
