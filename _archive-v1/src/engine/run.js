/* badhand — 主循环
 *
 * 正典：
 *   脉冲数据流    .kiro/specs/playable-build/design.md §3
 *   场景嵌套      design.md §4 / docs/modules/16-scenes.md
 *   状态机        design.md §5
 *   季表与腰斩    docs/SYSTEM.md §1.3 §4 / docs/modules/05-chapter.md
 *   季末三选一    docs/modules/19-tension.md
 *   职业          docs/modules/17-jobs.md
 *
 * advance() 是纯函数式的：接收状态、返回新状态与结果，不改写入参。
 * 这样调参脚本可以对同一状态跑多条分支，确定性断言也容易写。
 *
 * 依赖：errors.js, condition.js, state.js, props.js, scoring.js,
 *       format.js, registry.js
 * 零 DOM 依赖
 */
(function (g) {
  'use strict';
  var BH = (g.BH = g.BH || {});
  var St = BH.state;

  // 季表（SYSTEM.md §1.3）
  // 阈值为实测回填值（SYSTEM.md §8）。初版量级估算 300/2500/15000，
  // 当前内容量下回填为 90/700/30000：random 评分保持 3–4，
  // greedy 仍有非零腰斩，且不会因为中年阈值过低而无脑续订。
  var SEASONS = [
    { n: 1, name: '试镜', from: 0, to: 11, decisions: 2, threshold: null },
    { n: 2, name: '出道', from: 12, to: 17, decisions: 2, threshold: 90 },
    { n: 3, name: '当红', from: 18, to: 29, decisions: 4, threshold: 700 },
    { n: 4, name: '中年', from: 30, to: 49, decisions: 3, threshold: 30000 },
    { n: 5, name: '收尾', from: 50, to: 70, decisions: 2, threshold: null }
  ];

  var MAX_SCENES_PER_RUN = 4;  // 16-scenes.md §8：引擎常量，不可内容配置
  var BASE_LIFESPAN = 70;

  // 分水岭年份：这些年份必触发对应事件，且压缩推进不得跳过
  // （04-tracks.md §8.2 第一条：固定年份，玩家可以预期它要来）
  var WATERSHED_AGES = [18];

  function seasonOf(age) {
    for (var i = 0; i < SEASONS.length; i++) {
      if (age >= SEASONS[i].from && age <= SEASONS[i].to) return SEASONS[i];
    }
    return SEASONS[SEASONS.length - 1];
  }

  /** 按 seed 预排每季的决策年。决策年是预排的，不是随机的（03-events.md §3） */
  function planDecisionYears(rng) {
    var plan = {};
    for (var i = 0; i < SEASONS.length; i++) {
      var s = SEASONS[i];
      var years = [];
      for (var y = s.from; y <= s.to; y++) years.push(y);
      // S1 的决策点不要落在太小的年纪
      if (s.n === 1) {
        years = years.filter(function (y) { return y >= 6; });
      }
      plan[s.n] = rng.sample(years, Math.min(s.decisions, years.length))
        .sort(function (a, b) { return a - b; });
    }
    return plan;
  }

  /**
   * @param {Object} opts { seed, family, sex, persona0, talents, meta }
   */
  function create(opts) {
    opts = opts || {};
    var Rng = BH.Rng;
    var seed = Rng.normalizeSeed(opts.seed) || Rng.makeSeed();
    var rng = new Rng(seed);
    var R = BH.registry;

    var s = St.create({
      family: opts.family || null,
      sex: opts.sex || null,
      persona0: opts.persona0 || null,
      talents: opts.talents || [],
      meta: opts.meta || null
    });
    s.seed = seed;
    s.rngCalls = 0;
    s.phase = 'BOOT';
    s.decisionPlan = planDecisionYears(rng);
    s.lifespan = BASE_LIFESPAN;
    s.sceneCount = 0;
    s.scene = null;
    s.audlog = [];
    s.tropelog = [];
    s.decisions = { total: 0, byTrack: {} };
    s.peak = { total: 0, trope: null, age: 0 };
    s.timeline = [];
    s.setupTags = [];
    s.familyIncome = 0;

    // 应用开局四项（11-origin.md）。顺序：家庭 → 性别 → 性格 → 天赋
    var O = R.origins();

    function findIn(list, id) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) return list[i];
      }
      return null;
    }

    var fam = s.FAMILY ? findIn(O.family, s.FAMILY) : null;
    if (fam) {
      (fam.flags || []).forEach(function (f) { St.addFlag(s, f); });
      s.scene0 = fam.scene || null;
      s.familyIncome = fam.income || 0;
      // 父母进状态：童年事件池与后期回响都要引用（17-jobs.md §2）
      s.parents = JSON.parse(JSON.stringify(fam.parents || {
        father: { job: null, status: 'present', note: '' },
        mother: { job: null, status: 'present', note: '' }
      }));
      // 父母状况转成旗标，方便事件用 FLAG 引用
      ['father', 'mother'].forEach(function (who) {
        var p = s.parents[who];
        if (!p) return;
        St.addFlag(s, (who === 'father' ? 'f_dad_' : 'f_mom_') + p.status);
      });
    }

    var sx = s.SEX ? findIn(O.sex, s.SEX) : null;
    if (sx) St.applyEffect(s, sx.effect, 'sex:' + sx.id);

    var per = s.PERSONA0 ? findIn(O.personality, s.PERSONA0) : null;
    if (per) St.applyEffect(s, per.effect, 'personality:' + per.id);

    s.TALENT.forEach(function (tid) {
      var t = R.get('talents', tid);
      if (t.effect) St.applyEffect(s, t.effect, 'talent:' + tid);
      // 天赋 tags 计入 setupTags（反讽乘数的铺垫来源之一）
      (t.tags || []).forEach(function (tg) {
        if (s.setupTags.indexOf(tg) === -1) s.setupTags.push(tg);
      });
    });

    return { state: s, seed: seed };
  }

  /**
   * 每次 advance 用同一个 seed + 调用计数重建 rng，保证纯函数式下的确定性。
   *
   * 关键：重放完必须把 calls 归零。否则 commitRng 会把"重放的次数"
   * 也累加进 rngCalls，导致计数指数增长——第 30 个脉冲要重放十亿次。
   */
  function rngFor(s) {
    var rng = new BH.Rng(s.seed);
    for (var i = 0; i < s.rngCalls; i++) rng.next();
    rng.calls = 0;
    return rng;
  }

  /** 只累加本次 advance 新消耗的随机数 */
  function commitRng(s, rng) {
    s.rngCalls += rng.calls;
  }

  BH.run = {
    SEASONS: SEASONS,
    MAX_SCENES_PER_RUN: MAX_SCENES_PER_RUN,
    BASE_LIFESPAN: BASE_LIFESPAN,
    WATERSHED_AGES: WATERSHED_AGES,
    seasonOf: seasonOf,
    create: create,
    phase: function (s) { return s.phase; },
    _rngFor: rngFor,
    _commitRng: commitRng,
    _planDecisionYears: planDecisionYears
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ── 事件选取 ─────────────────────────────────────────────────── */
(function (g) {
  'use strict';
  var BH = g.BH;
  var C = BH.condition;
  var R = BH.registry;
  var Run = BH.run;
  var St = BH.state;

  var PLAN_RISK_VALUE = { low: 1, medium: 2, high: 3 };

  function ensureRoute(s) {
    if (!Array.isArray(s.DECK)) s.DECK = [];
    if (!s.ROUTE || typeof s.ROUTE !== 'object' || s.ROUTE.season !== s.season) {
      s.ROUTE = { season: s.season, slot: 0, offers: [], picked: [], risk: 0 };
    }
    if (!Array.isArray(s.ROUTE.offers)) s.ROUTE.offers = [];
    if (!Array.isArray(s.ROUTE.picked)) s.ROUTE.picked = [];
    if (typeof s.ROUTE.slot !== 'number') s.ROUTE.slot = s.ROUTE.picked.length;
    if (typeof s.ROUTE.risk !== 'number') s.ROUTE.risk = 0;
  }

  function resetRoute(s) {
    s.DECK = [];
    s.ROUTE = { season: s.season, slot: 0, offers: [], picked: [], risk: 0 };
  }

  function seasonAllowed(plan, season) {
    var seasons = Array.isArray(plan.season) ? plan.season : [plan.season];
    return seasons.indexOf(season) !== -1;
  }

  /** 已解锁的局外内容只扩大可能性，不改变基础路线。 */
  function hasMetaUnlock(s, gate) {
    if (!gate) return true;
    if (!gate.type || !gate.id) return false;
    var unlocked = s && s.META && s.META.unlocked;
    var list = unlocked && unlocked[gate.type];
    return Array.isArray(list) && list.indexOf(gate.id) !== -1;
  }

  function planIsEligible(s, p, season) {
    if (!seasonAllowed(p, season)) return false;
    if (p.metaUnlock && !hasMetaUnlock(s, p.metaUnlock)) return false;
    return !p.gate || C.check(s, p.gate);
  }

  function forcedStep(s) {
    return !!(
      (Run._pickWatershed && Run._pickWatershed(s)) ||
      (Run._pickJobEntry && Run._pickJobEntry(s)) ||
      (Run._pickPromotion && Run._pickPromotion(s)) ||
      (Run._dueEventline && Run._dueEventline(s))
    );
  }

  function canPlan(s) {
    if (!s || s.phase !== 'YEAR' || s.pending || s.scene || s.LOOP) return false;
    if (!Run._isDecisionYear || !Run._isDecisionYear(s)) return false;
    if ((s.DECK || []).length >= 3) return false;
    if (forcedStep(s)) return false;
    return true;
  }

  function eligiblePlans(s) {
    if (!s) return [];
    var season = Run.seasonOf(s.age).n;
    return R.list('plans').filter(function (p) {
      return planIsEligible(s, p, season);
    });
  }

  function routeSeed(s) {
    var picked = s.ROUTE && s.ROUTE.picked ? s.ROUTE.picked.join(',') : '';
    return String(s.seed || '') + '|PLAN|' + s.season + '|' + s.age + '|' +
      ((s.DECK || []).length) + '|' + picked;
  }

  function deckProfile(s) {
    var counts = {};
    var tracks = {};
    (s.DECK || []).forEach(function (card) {
      (card.tags || []).forEach(function (tag) { counts[tag] = (counts[tag] || 0) + 1; });
      if (card.track) tracks[card.track] = (tracks[card.track] || 0) + 1;
    });
    var maxCount = 0;
    for (var tag in counts) maxCount = Math.max(maxCount, counts[tag]);
    return { counts: counts, tracks: tracks, maxCount: maxCount };
  }

  function deckSynergy(s, tags) {
    var profile = deckProfile(s);
    var tagHits = 0;
    var seen = {};
    (tags || []).forEach(function (tag) {
      if (seen[tag]) return;
      seen[tag] = true;
      if (profile.counts[tag]) tagHits++;
    });
    var matched = [];
    (s.CAST || []).forEach(function (owned) {
      if (!R.has('cast', owned.id)) return;
      var card = R.get('cast', owned.id);
      if (card.track && profile.tracks[card.track]) matched.push(card);
    });
    var suite = profile.maxCount >= 3 ? 'set' : profile.maxCount >= 2 ? 'pair' : null;
    var chipBonus = Math.min(3, matched.length) + (tagHits ? (suite === 'set' ? 2 : 1) : 0);
    var multBonus = Math.min(0.3,
      matched.length * 0.05 + (tagHits ? 0.05 : 0) +
      (suite === 'set' ? 0.1 : suite === 'pair' ? 0.05 : 0));
    return {
      tagHits: tagHits, matchedCards: matched, suite: suite,
      chipBonus: chipBonus, multBonus: multBonus,
    };
  }

  function planPreview(s, p) {
    var track = p.track && R.has('tracks', p.track) ? R.get('tracks', p.track) : null;
    var hidden = !!p.hidden || !!(track && track.hidden);
    var matched = [];
    if (p.track) {
      (s.CAST || []).forEach(function (owned) {
        if (!R.has('cast', owned.id)) return;
        var card = R.get('cast', owned.id);
        if (card.track === p.track) {
          matched.push({ id: card.id, name: card.name, emoji: card.emoji, lv: owned.lv });
        }
      });
    }
    return {
      id: p.id, text: p.label, label: p.label, kind: p.kind,
      drama: PLAN_RISK_VALUE[p.risk] || 1,
      risk: p.risk, audience: p.audience || 'swing',
      cost: (p.cost || []).slice(), tags: (p.tags || []).slice(),
      poolTags: (p.poolTags || p.tags || []).slice(),
      track: p.track || null, hidden: hidden,
      archive: !!p.metaUnlock, metaUnlock: p.metaUnlock || null,
      possible: hidden ? '未知信号' : (p.preview || '普通事件'),
      matchedCast: matched,
      suite: deckProfile(s).maxCount >= 3 ? '成套' :
        deckProfile(s).maxCount >= 2 ? '合拍' : '',
      plan: true,
    };
  }

  function planOffers(s) {
    if (!canPlan(s)) return [];
    ensureRoute(s);
    var ids = s.ROUTE.offers || [];
    var pool;
    if (ids.length) {
      pool = ids.filter(function (id) { return R.has('plans', id); })
        .map(function (id) { return R.get('plans', id); })
        .filter(function (p) { return planIsEligible(s, p, Run.seasonOf(s.age).n); });
    } else {
      pool = eligiblePlans(s);
      if (pool.length > 3) pool = new BH.Rng(routeSeed(s)).sample(pool, 3);
    }
    return pool.map(function (p) { return planPreview(s, p); });
  }

  function applyPlan(s, planOrId) {
    ensureRoute(s);
    var id = typeof planOrId === 'string' ? planOrId : planOrId && planOrId.id;
    var p = R.get('plans', id);
    St.applyEffect(s, p.effect, 'plan:' + p.id);
    s.DECK.push({ id: p.id, track: p.track || null, tags: (p.tags || []).slice() });
    s.ROUTE.picked.push(p.id);
    s.PLANLOG = Array.isArray(s.PLANLOG) ? s.PLANLOG : [];
    s.PLANLOG.push(p.id);
    s.ROUTE.slot = s.ROUTE.picked.length;
    s.ROUTE.offers = [];
    s.ROUTE.risk += PLAN_RISK_VALUE[p.risk] || 0;
    St.addTags(s, p.tags);
    if (p.track && R.has('tracks', p.track)) {
      var tr = R.get('tracks', p.track);
      St.bumpTrack(s, p.track, 1, tr.maxDepth);
      s.decisions = s.decisions || { total: 0, byTrack: {} };
      s.decisions.byTrack = s.decisions.byTrack || {};
      s.decisions.byTrack[p.track] = (s.decisions.byTrack[p.track] || 0) + 1;
    }
    s.decisions = s.decisions || { total: 0, byTrack: {} };
    s.decisions.total = (s.decisions.total || 0) + 1;
    return p;
  }

  function weightedPool(s, rng, pool) {
    var weighted = pool.map(function (e) {
      var base = e.weight == null ? 1 : Math.max(0, e.weight);
      var syn = deckSynergy(s, e.tags);
      var boost = syn.tagHits * 0.45;
      if (syn.suite === 'pair' && syn.tagHits) boost += 0.35;
      if (syn.suite === 'set' && syn.tagHits) boost += 0.75;
      return { item: e, weight: base * (1 + Math.min(2.5, boost)) };
    });
    var picked = rng.weighted(weighted);
    return picked ? picked.item : null;
  }

  function lineBiased(s, lineId) {
    return (s.DECK || []).some(function (card) {
      if (!R.has('plans', card.id)) return false;
      return (R.get('plans', card.id).lineBias || []).indexOf(lineId) !== -1;
    });
  }

  function passes(s, e) {
    if (e.exclude && C.check(s, e.exclude)) return false;
    if (e.include && !C.check(s, e.include)) return false;
    return true;
  }

  /** 选项也可以有 include：不满足就不出现在选项列表里 */
  function visibleOptions(s, e) {
    return (e.options || []).filter(function (o) {
      return !o.include || C.check(s, o.include);
    });
  }

  /**
   * 事件线是否到期可推进。
   * @returns {{line, stage, eventId, scene, onFork}|null}
   */
  function dueEventline(s) {
    var lines = R.list('eventlines');
    var fallback = null;
    var biased = null;
    for (var i = 0; i < lines.length; i++) {
      var el = lines[i];
      var prog = s.ELINE[el.id];
      var stage = prog ? prog.stage : 0;

      // 已完成的关系线仍可能有一次多年后的重逢。
      if (prog && prog.done) {
        var reunion = el.reunion;
        if (reunion && !prog.reunited && reunion.event && R.has('events', reunion.event)) {
          var reunionGap = s.age - (prog.lastYear == null ? s.age : prog.lastYear);
          if (reunionGap >= (reunion.minGap || 1)) {
            var reunionEvent = R.get('events', reunion.event);
            if (passes(s, reunionEvent)) {
              var reunionCandidate = {
                line: el, stage: stage, eventId: reunion.event,
                scene: null, onFork: null, reunion: true, missed: false
              };
              if (lineBiased(s, el.id)) {
                biased = reunionCandidate;
                break;
              }
              if (!fallback) fallback = reunionCandidate;
            }
          }
        }
        continue;
      }

      var eventId;
      var onFork = null;
      var missed = false;

      // 间隔检查。超过 maxGap 的关系线不静默消失：若内容声明了
      // missEvent，就把“没再赴约”本身播成一次可见后果。
      if (prog) {
        var gap = s.age - prog.lastYear;
        if (gap < (el.minGap || 1)) continue;
        if (gap > (el.maxGap || 99)) {
          if (!el.missEvent || prog.missed || !R.has('events', el.missEvent)) continue;
          eventId = el.missEvent;
          missed = true;
        }
      }

      if (!missed && prog && prog.forkId != null) {
        var fork = (el.forks || [])[prog.forkId];
        if (!fork) continue;
        var fi = prog.forkStage || 0;
        if (fi >= fork.chain.length) continue;
        eventId = fork.chain[fi];
        onFork = prog.forkId;
      } else if (!missed) {
        if (stage >= el.chain.length) continue;
        eventId = el.chain[stage];
      }

      if (!R.has('events', eventId)) continue;
      var e = R.get('events', eventId);
      if (!passes(s, e)) continue;

      var scene = null;
      var sc = el.scenes || {};
      var sceneKey = String(stage + 1);
      if (!missed && !prog && sc[sceneKey] && s.sceneCount < Run.MAX_SCENES_PER_RUN) {
        scene = sc[sceneKey];
      } else if (!missed && prog && sc[sceneKey] && s.sceneCount < Run.MAX_SCENES_PER_RUN) {
        scene = sc[sceneKey];
      }
      var candidate = {
        line: el, stage: stage, eventId: eventId,
        scene: scene, onFork: onFork, missed: missed, reunion: false
      };
      if (lineBiased(s, el.id)) {
        biased = candidate;
        break;
      }
      if (!fallback) fallback = candidate;
    }
    return biased || fallback;
  }

  /** 从通用池按 kind 加权抽取 */
  function pickFromPool(s, rng, kind) {
    var season = Run.seasonOf(s.age).n;
    var pool = R.list('events').filter(function (e) {
      if (e.noRandom) return false;
      if (e.kind !== kind) return false;
      if (e.season != null && e.season !== season) return false;
      // 已发生过的事件不再重复。否则同一条会连着播两年
      if (s.EVT.indexOf(e.id) !== -1) return false;
      return passes(s, e);
    });
    if (!pool.length) return null;
    return weightedPool(s, rng, pool);
  }

  function pickDeath(s, rng) {
    var pool = R.list('events').filter(function (e) {
      return e.kind === 'death' && passes(s, e);
    });
    if (!pool.length) {
      // 兜底：一定要能死
      pool = R.list('events').filter(function (e) {
        return e.kind === 'death' && !e.include;
      });
    }
    return rng.weighted(pool);
  }

  Run._passes = passes;
  Run._visibleOptions = visibleOptions;
  Run.canPlan = canPlan;
  Run.planOffers = planOffers;
  Run.planMatches = function (s, value) {
    var syn = deckSynergy(s, value && value.tags ? value.tags : value);
    return {
      tagHits: syn.tagHits,
      matchedCast: syn.matchedCards.map(function (c) { return c.id; }),
      suite: syn.suite,
      chipBonus: syn.chipBonus,
      multBonus: syn.multBonus,
    };
  };
  Run._planPreview = planPreview;
  Run._applyPlan = applyPlan;
  Run._hasMetaUnlock = hasMetaUnlock;
  Run._planIsEligible = planIsEligible;
  Run._resetRoute = resetRoute;
  Run._ensureRoute = ensureRoute;
  Run._deckSynergy = deckSynergy;
  Run._visibleOptions = visibleOptions;
  Run._dueEventline = dueEventline;
  Run._pickFromPool = pickFromPool;
  Run._pickDeath = pickDeath;

  /**
   * 分水岭事件：固定年份必触发（04-tracks.md §8.2）。
   * 约定：id 以 e_ws_ 开头，且 include 里锁定了具体年龄。
   */
  function pickWatershed(s) {
    var pool = R.list('events').filter(function (e) {
      if (e.id.indexOf('e_ws_') !== 0) return false;
      if (s.EVT.indexOf(e.id) !== -1) return false;
      return passes(s, e);
    });
    return pool.length ? pool[0] : null;
  }
  Run._pickWatershed = pickWatershed;

  /**
   * 入职保底（17-jobs.md §0）。
   *
   * 职业是让一条命读起来连贯的骨头，它不该靠运气。
   * 入职事件原本和普通事件挤在同一个决策池里，实测经常被挤掉——
   * 玩家走完修仙轨道却一辈子"无业"，后面所有引用 JOB 的文案全部失效。
   *
   * 约定：id 以 e_job_ 开头。无业且门槛满足时优先于普通决策池。
   */
  function pickJobEntry(s) {
    if (s.JOB) return null;
    var pool = R.list('events').filter(function (e) {
      if (e.id.indexOf('e_job_') !== 0) return false;
      if (s.EVT.indexOf(e.id) !== -1) return false;
      return passes(s, e);
    });
    if (!pool.length) return null;
    // 多个都满足时取 weight 最高的，保证确定性
    pool.sort(function (a, b) {
      return (b.weight || 0) - (a.weight || 0) || (a.id < b.id ? -1 : 1);
    });
    return pool[0];
  }
  Run._pickJobEntry = pickJobEntry;

  /**
   * 晋升保底（17-jobs.md §1）。
   *
   * 和入职是同一类毛病：晋升事件挤在普通决策池里抢年份，
   * 实测 6 个 tier 2 职业**全部从未出现**——阶梯做了却上不去，
   * `next` 字段形同虚设。
   *
   * 约定：id 以 e_promo_ 开头。在职且满足门槛时优先于普通决策池。
   */
  function pickPromotion(s) {
    if (!s.JOB || !R.has('jobs', s.JOB)) return null;
    var cur = R.get('jobs', s.JOB);
    if (!cur.next || !cur.next.length) return null;

    var pool = R.list('events').filter(function (e) {
      if (e.id.indexOf('e_promo_') !== 0) return false;
      if (s.EVT.indexOf(e.id) !== -1) return false;
      return passes(s, e);
    });
    if (!pool.length) return null;
    pool.sort(function (a, b) {
      return (b.weight || 0) - (a.weight || 0) || (a.id < b.id ? -1 : 1);
    });
    return pool[0];
  }
  Run._pickPromotion = pickPromotion;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ── 桥段与倍率收集 ───────────────────────────────────────────── */
(function (g) {
  'use strict';
  var BH = g.BH;
  var C = BH.condition;
  var St = BH.state;
  var R = BH.registry;
  var Run = BH.run;

  function perValue(s, per, value) {
    switch (per) {
      case 'SCAR': return s.SCAR.length * value;
      case 'CAST': return s.CAST.length * value;
      case 'TRACKLV': return St.dominantTrack(s).depth * value;
      case 'AUD10': return Math.floor(s.AUD / 10) * value;
      case 'fixed':
      default: return value;
    }
  }

  /** 收集 B 的各项（design.md §3 第 4 步，在 effect/grant 之后） */
  function collectChips(s, baseDrama, optDrama, tags) {
    var chips = [];
    if (baseDrama) chips.push({ label: '事件', value: baseDrama });
    if (optDrama) chips.push({ label: '选择', value: optDrama });

    s.CAST.forEach(function (c) {
      if (!R.has('cast', c.id)) return;
      var card = R.get('cast', c.id);
      if (!card.addDrama) return;
      var v = perValue(s, card.addDrama.per, card.addDrama.value) * c.lv;
      if (v) chips.push({ label: card.emoji + card.name, value: v });
    });

    s.TALENT.forEach(function (tid) {
      if (!R.has('talents', tid)) return;
      var t = R.get('talents', tid);
      if (!t.addDrama) return;
      var v = perValue(s, t.addDrama.per, t.addDrama.value);
      if (v) chips.push({ label: t.emoji + t.name, value: v });
    });

    if (s.PERSONA0) {
      var pool = R.origins().personality;
      for (var i = 0; i < pool.length; i++) {
        if (pool[i].id === s.PERSONA0 && pool[i].addDrama) {
          chips.push({
            label: pool[i].emoji + pool[i].name,
            value: pool[i].addDrama
          });
        }
      }
    }

    var synergy = Run._deckSynergy ? Run._deckSynergy(s, tags) : null;
    if (synergy && synergy.chipBonus > 0) {
      if (synergy.matchedCards.length) {
        chips.push({ label: '🤝 合拍·人设', value: Math.min(3, synergy.matchedCards.length) });
      }
      if (synergy.tagHits) {
        chips.push({
          label: synergy.suite === 'set' ? '🎬 节目牌·成套' : '🎬 节目牌·合拍',
          value: synergy.suite === 'set' ? 2 : 1
        });
      }
    }
    return chips;
  }

  /** 收集 M 的各项（design.md §3 第 5 步） */
  function collectMults(s, tags) {
    var mults = [];

    s.CAST.forEach(function (c) {
      if (!R.has('cast', c.id)) return;
      var card = R.get('cast', c.id);
      if (card.addMult) {
        mults.push({
          label: card.emoji + card.name,
          mult: card.addMult * c.lv,
          kind: 'add'
        });
      }
      if (card.xMult) {
        mults.push({
          label: card.emoji + card.name, mult: card.xMult, kind: 'mul'
        });
      }
      if (card.xMultIf && C.check(s, card.xMultIf.cond)) {
        mults.push({
          label: card.emoji + card.name,
          mult: card.xMultIf.mult, kind: 'mul'
        });
      }
    });

    s.TALENT.forEach(function (tid) {
      if (!R.has('talents', tid)) return;
      var t = R.get('talents', tid);
      if (!t.addMult) return;
      var v = perValue(s, t.addMult.per, t.addMult.value);
      if (v) mults.push({ label: t.emoji + t.name, mult: v, kind: 'add' });
    });

    if (s.PERSONA0) {
      var pool = R.origins().personality;
      for (var i = 0; i < pool.length; i++) {
        if (pool[i].id === s.PERSONA0 && pool[i].addMult) {
          mults.push({
            label: pool[i].emoji + pool[i].name,
            mult: pool[i].addMult, kind: 'add'
          });
        }
      }
    }

    // 污点：乘法惩罚，可叠加
    s.SCAR.forEach(function (id) {
      if (!R.has('scars', id)) return;
      var sc = R.get('scars', id);
      if (sc.mult) {
        mults.push({ label: sc.emoji + sc.name, mult: sc.mult, kind: 'mul' });
      }
    });

    var synergy = Run._deckSynergy ? Run._deckSynergy(s, tags) : null;
    if (synergy && synergy.multBonus > 0) {
      if (synergy.matchedCards.length) {
        mults.push({ label: '🤝 合拍·人设', mult: Math.min(0.15,
          synergy.matchedCards.length * 0.05), kind: 'add' });
      }
      if (synergy.tagHits) {
        mults.push({ label: synergy.suite === 'set' ? '🎬 成套' : '🎬 合拍',
          mult: Math.min(0.15, synergy.multBonus), kind: 'add' });
      }
    }
    return mults;
  }

  /** 观众汇率：性别对同一属性的转化率不同（11-origin.md §4.3） */
  function audRateFor(s, tags) {
    if (!s.SEX) return 1;
    var pool = R.origins().sex;
    var rates = null;
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].id === s.SEX) { rates = pool[i].audRate; break; }
    }
    if (!rates) return 1;
    if (tags && tags.indexOf('竞技') !== -1) return rates.STR || 1;
    if (tags && (tags.indexOf('舞台') !== -1 || tags.indexOf('网络') !== -1)) {
      return rates.CHR || 1;
    }
    return 1;
  }

  Run._collectChips = collectChips;
  Run._collectMults = collectMults;
  Run._perValue = perValue;
  Run._audRateFor = audRateFor;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ── 选项应用、职业结算、一次结算 ──────────────────────────────── */
(function (g) {
  'use strict';
  var BH = g.BH;
  var St = BH.state;
  var Sc = BH.scoring;
  var R = BH.registry;
  var Run = BH.run;

  /** 按事件选项记录贯彻：路线牌已经记过路线选择，事件只读取 opt.track。 */
  function noteDecision(s, opt) {
    if (!opt || !opt.track) return;
    s.decisions = s.decisions || { total: 0, byTrack: {} };
    s.decisions.byTrack = s.decisions.byTrack || {};
    for (var id in opt.track) {
      if (opt.track[id] == null || Number(opt.track[id]) === 0) continue;
      s.decisions.byTrack[id] = (s.decisions.byTrack[id] || 0) + 1;
    }
  }

  /** 应用一个选项的全部后果（design.md §3 第 2–3 步） */
  function applyOption(s, opt, where) {
    if (!opt) return;
    St.applyEffect(s, opt.effect, where);
    var relation = opt.relation || {};
    for (var npcId in relation) {
      St.bumpNpcAxis(s, npcId, relation[npcId]);
    }
    var gr = opt.grant || {};
    (gr.cast || []).forEach(function (id) {
      var card = R.get('cast', id);
      St.grantCast(s, id, card.maxLv);
      if (card.lifespan) s.lifespan += card.lifespan;
    });
    (gr.scar || []).forEach(function (id) { St.grantScar(s, id); });
    (gr.flag || []).forEach(function (id) { St.addFlag(s, id); });
    for (var tid in (opt.track || {})) {
      var tr = R.get('tracks', tid);
      St.bumpTrack(s, tid, opt.track[tid], tr.maxDepth);
    }
    // 入职 / 晋升 / 失业（17-jobs.md §1）
    if (gr.job) St.setJob(s, gr.job);
    if (gr.loseJob) St.loseJob(s);
    if (opt.escalate) s.escalateCount++;

    // 异常轨道的独占机制（20-anomaly.md）。不接这一步它们只是换皮
    applyTrackRules(s);

    // 进入时间循环
    if (gr.loop) Run.loop.enter(s, gr.loop);
  }

  /**
   * 轨道级规则。目前两条：
   *   houshi 后室   —— AUD 增长被切断（"没有观众"是本作最重的惩罚）
   *   yeli 夜里的人 —— 寿命 +120，但 AUD 上限锁 30
   */
  function applyTrackRules(s) {
    if ((s.TRACK.houshi || 0) > 0) {
      s.audFrozen = true;
    }
    if ((s.TRACK.yeli || 0) > 0 && !s.yeliApplied) {
      s.yeliApplied = true;
      var yeli = R.has('tracks', 'yeli') ? R.get('tracks', 'yeli') : {};
      s.lifespan += Number(yeli.lifespan || 120);
      s.audCap = Number(yeli.audCap || 30);
      s.AUD = Math.min(s.AUD, s.audCap);
    }
  }

  /** 每年的职业收入与磨损。这是"日子在过"的体感来源（17-jobs.md §1） */
  function jobTick(s) {
    if (s.familyIncome && Run.seasonOf(s.age).n === 1) {
      St.applyEffect(s, { MNY: s.familyIncome }, 'family');
    }
    if (!s.JOB || !R.has('jobs', s.JOB)) return;
    var j = R.get('jobs', s.JOB);
    s.JOBYEARS++;
    if (j.income) St.applyEffect(s, { MNY: j.income }, 'job:' + j.id);
    // 磨损隔年生效；已经垮掉的话再隔一倍（已经废了，扣不动了）
    var period = s.brokenDown ? 4 : 2;
    if (j.wear && s.JOBYEARS % period === 0) {
      St.applyEffect(s, j.wear, 'job:' + j.id);
    }
  }

  /** 本年/本节拍所有选项里的最高潜在桥段——收手要显示"放弃 N" */
  function bestPotential(s, opts) {
    var best = 0;
    opts.forEach(function (o) {
      var d = o.drama || 0;
      if (d > best) best = d;
    });
    return best;
  }

  /** 记录一次收手（08-true-ending.md §3） */
  function logRestraint(s, givenUp, potential) {
    var highValue = potential > 0 && givenUp >= potential * 0.6;
    s.restraintLog.push({
      age: s.age,
      season: Run.seasonOf(s.age).n,
      givenUp: givenUp,
      potential: potential,
      highValue: highValue
    });
  }

  /**
   * 一次结算（design.md §3 第 4–9 步）。场景结束时也走这里，且只走一次。
   *
   * 三条不变式（design.md §4.1）：
   *   一个场景 = 一年 = 一手牌
   *   M 在场景内不变
   *   F / A / R_year / WLOG 每场景只算一次
   */
  /* eslint-disable no-use-before-define */
  function settle(s, baseDrama, optDrama, tropes, tags) {
    var chips = Run._collectChips(s, baseDrama, optDrama, tags);
    var mults = Run._collectMults(s, tags);

    // 第 6 步：先读 trope 计数，再 +1。
    // 顺序颠倒会让同一 trope 首次出现就自己打折自己
    var mainTrope = (tropes && tropes[0]) || null;
    var seen = mainTrope ? St.tropeCount(s, mainTrope) : 0;

    var rate = Run._audRateFor(s, tags);
    var breakdown = Sc.year({
      chips: chips,
      mults: mults,
      aud: s.AUD * rate,
      tropeSeen: seen
    });

    if (mainTrope) St.bumpTrope(s, mainTrope);

    // 职业年度结算必须在记录水位之前
    jobTick(s);

    // 垮掉检查：属性触底不致死，改为污点 + 观众下降（SYSTEM.md §1.35）
    var bd = checkBreakdown(s);
    if (bd) breakdown.breakdownText = bd.text;

    // 第 9 步：记录水位与观众
    var W = St.waterLevel(s, R.all('tracks'), R.all('jobs'));
    s.WLOG.push(W);
    s.audlog.push(s.AUD);
    s.tropelog.push(mainTrope);
    s.seasonSum += breakdown.total;

    if (breakdown.total > s.peak.total) {
      s.peak = { total: breakdown.total, trope: mainTrope, age: s.age };
    }
    if (breakdown.total > 0) {
      s.timeline.push({
        age: s.age, total: breakdown.total, tropes: tropes || []
      });
    }
    return breakdown;
  }

  function isDecisionYearAt(s, age) {
    var plan = s.decisionPlan[Run.seasonOf(age).n] || [];
    return plan.indexOf(age) !== -1;
  }

  function isDecisionYear(s) {
    return isDecisionYearAt(s, s.age);
  }

  /**
   * 死亡只由内容驱动（SYSTEM.md §1.35 §1.4）。
   * 属性耗尽**不致死**——那会截断这一局，走不到反讽结算，
   * 结算页拿不出手，C6 断掉。
   */
  function shouldDie(s) {
    if (Run.seasonOf(s.age).n === 1) return false;
    return s.age >= s.lifespan;
  }

  /**
   * 垮掉：STR 触底时的处理（05-chapter.md §5）。
   * "身体已经废了但你还在演"——而且它能被吃污点的构筑反过来利用，
   * 截断式死亡做不到这一点。
   */
  function checkBreakdown(s) {
    if (s.STR > 0) return null;
    s.STR = 1;
    var first = s.SCAR.indexOf('scar_jiuchang') === -1;
    if (first) St.grantScar(s, 'scar_jiuchang');
    St.applyEffect(s, { AUD: -6 }, 'breakdown');
    s.brokenDown = true;
    return {
      text: first
        ? '你在楼梯上蹲了一会儿才站起来。后来那条腿一直是这样。'
        : '又是那条腿。你已经知道怎么绕开会疼的那个角度。',
      scar: first ? 'scar_jiuchang' : null
    };
  }

  Run._applyOption = applyOption;
  Run._noteDecision = noteDecision;
  Run._jobTick = jobTick;
  Run._bestPotential = bestPotential;
  Run._logRestraint = logRestraint;
  Run._settle = settle;
  Run._isDecisionYear = isDecisionYear;
  Run._isDecisionYearAt = isDecisionYearAt;
  Run._shouldDie = shouldDie;
  Run._checkBreakdown = checkBreakdown;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ── advance()：脉冲推进 ──────────────────────────────────────── */
(function (g) {
  'use strict';
  var BH = g.BH;
  var St = BH.state;
  var R = BH.registry;
  var Run = BH.run;

  function fxOf(e) {
    return e && e.fx ? [{ name: e.fx, tone: e.fx, at: 0 }] : [];
  }

  function relationSnapshot(s) {
    var out = {};
    Object.keys(s.NPCAX || {}).forEach(function (id) {
      out[id] = Number(s.NPCAX[id].axis || 0);
    });
    return out;
  }

  function relationChanges(before, s) {
    var out = [];
    var ids = {};
    Object.keys(before || {}).forEach(function (id) { ids[id] = true; });
    Object.keys(s.NPCAX || {}).forEach(function (id) { ids[id] = true; });
    Object.keys(ids).sort().forEach(function (id) {
      var prev = before && before[id] != null ? before[id] : 0;
      var now = s.NPCAX[id] ? Number(s.NPCAX[id].axis || 0) : 0;
      if (now !== prev) {
        out.push({
          id: id, delta: now - prev, axis: now,
          active: (s.NPC || []).indexOf(id) !== -1,
        });
      }
    });
    return out;
  }

  Run._relationSnapshot = relationSnapshot;
  Run._relationChanges = relationChanges;

  function optionsOut(s, opts) {
    var best = Run._bestPotential(s, opts);
    return opts.map(function (o) {
      return {
        text: BH.format(o.text, s),
        drama: o.drama || 0,
        escalate: !!o.escalate,
        restraint: !!o.restraint,
        // 收手必须显示放弃掉的具体分数（08-true-ending.md §4）
        givenUp: o.restraint ? best - (o.drama || 0) : 0,
        _ref: o
      };
    });
  }

  function planIndexOf(choice) {
    if (choice && typeof choice === 'object' && choice.type === 'plan') {
      return Number(choice.index);
    }
    return typeof choice === 'number' ? choice : null;
  }

  /** 路线节点应用后立即呈现事件；固定事件线仍在此处再次优先检查。 */
  function presentAfterPlan(s, rng, out) {
    var due = Run._dueEventline(s);
    if (due) {
      if (due.scene) {
        s.scene = {
          lineId: due.line.id, beats: due.scene.beats.slice(),
          i: 0, shown: 0, acc: 0, tropes: [], tags: [], forkChoice: null
        };
        s.phase = 'SCENE';
        var firstBeat = R.get('events', s.scene.beats[0]);
        var fvis = Run._visibleOptions(s, firstBeat);
        out.phase = 'SCENE';
        out.text = BH.format(firstBeat.text, s);
        out.sceneBeat = { i: 1, of: s.scene.beats.length };
        out.sceneTotal = 0;
        if (fvis.length) out.options = optionsOut(s, fvis);
        Run._commitRng(s, rng);
        return { state: s, result: out };
      }
      var de = R.get('events', due.eventId);
      var dvis = Run._visibleOptions(s, de);
      if (dvis.length) {
        s.pending = {
          eventId: de.id, lineId: due.line.id,
          missed: !!due.missed, reunion: !!due.reunion
        };
        out.text = BH.format(de.text, s);
        out.options = optionsOut(s, dvis);
        out.fx = fxOf(de);
        Run._commitRng(s, rng);
        return { state: s, result: out };
      }
    }

    var ev = Run._pickFromPool(s, rng, 'decision');
    if (ev) {
      var evis = Run._visibleOptions(s, ev);
      if (evis.length >= 2) {
        s.pending = { eventId: ev.id, lineId: null };
        out.text = BH.format(ev.text, s);
        out.options = optionsOut(s, evis);
        out.fx = fxOf(ev);
        Run._commitRng(s, rng);
        return { state: s, result: out };
      }
    }

    // 内容池耗尽时不把玩家卡在同一年：路线仍生效，播一条普通回响后推进。
    var flavor = Run._pickFromPool(s, rng, 'echo')
      || Run._pickFromPool(s, rng, 'flavor');
    if (flavor) {
      s.EVT.push(flavor.id);
      St.addTags(s, flavor.tags);
      out.text = BH.format(flavor.text, s);
      out.score = Run._settle(s, flavor.drama || 0, 0,
        flavor.tropes, flavor.tags);
      out.fx = fxOf(flavor);
    }
    Run._commitRng(s, rng);
    return finishYear(s, out);
  }

  /**
   * 推进一个脉冲。
   * @param {Object} state
   * @param {number|Object} [choiceIndex] 普通选项序号，或 {type:'plan',index}
   * @returns {{state:Object, result:Object}}  result 形状见 design.md §3.1
   */
  function advance(state, choiceIndex) {
    // 相位守卫：这些相位有各自的提交函数，不能走 advance。
    // 静默跑下去会让季号永不推进 → 每年都判季末 → 反复加更 → 寿命失控。
    // 这个 bug 曾经把调参数据里的死亡年龄中位数抬到 245 岁。
    BH.invariant(
      state.phase !== 'REWARD' && state.phase !== 'SEASON_END' &&
      state.phase !== 'REVIVE' && state.phase !== 'ENDING' &&
      state.phase !== 'SETTLEMENT',
      'advance() 不能在 ' + state.phase + ' 相位调用；' +
      '请改用 commitSeason / applyReward / commitRevive / commitEnding',
      { phase: state.phase }
    );

    var s = St.clone(state);
    Run._ensureRoute(s);
    var rng = Run._rngFor(s);
    var out = {
      age: s.age, season: s.season, skippedYears: [],
      text: '', options: [], score: null, deltas: [], grants: [],
      fx: [], phase: s.phase, sceneBeat: null, sceneTotal: null,
      relations: []
    };

    // ── 时间循环：年龄锁住，同一年反复播（20-anomaly.md §3）──────
    if (s.LOOP) {
      var le = R.get('events', s.LOOP.eventId);
      var lopts = Run.loop.remaining(s, Run._visibleOptions(s, le));

      if (choiceIndex == null) {
        out.text = BH.format(le.text, s);
        out.options = optionsOut(s, lopts);
        out.loop = { count: s.LOOP.count, max: Run.loop.MAX };
        out.fx = fxOf(le);
        out.phase = 'YEAR';
        return { state: s, result: out };
      }

      var lpick = lopts[choiceIndex] || lopts[0];
      var relationBefore = Run._relationSnapshot(s);
      var lkey = lpick.id || String(choiceIndex);
      Run._applyOption(s, lpick, 'loop:' + le.id);
      out.relations = Run._relationChanges(relationBefore, s);
      var res = Run.loop.pick(s, lkey, !!lpick.breaks);

      out.text = BH.format(le.text, s);
      out.resolved = true;
      out.loop = { count: res.rounds, max: Run.loop.MAX, broke: res.broke };

      if (!res.broke) {
        // 循环期间：水位不记入 WLOG（不产生振幅段），年龄不推进。
        // 收视照常结算，但 F 疲劳会把重播的收视吃掉——
        // "观众在看重播"不是隐喻，是字面意思
        out.score = Run._settle(s, le.drama || 0, lpick.drama || 0,
          le.tropes, le.tags);
        s.WLOG.pop();
        s.audlog.pop();
        s.tropelog.pop();
        out.phase = 'YEAR';
        Run._commitRng(s, rng);
        return { state: s, result: out };
      }

      // 破环：一次性给足，补偿循环期间被疲劳吃掉的收视
      var bonus = Run.loop.breakDrama(res.rounds);
      out.score = Run._settle(s, (le.drama || 0) + bonus,
        lpick.drama || 0, ['taoli'], le.tags);
      out.breakText = res.forced
        ? '第七次的时候你没再试，就那么过去了。'
        : null;
      Run._commitRng(s, rng);
      return finishYear(s, out);
    }

    // ── SCENE 相位：场景内部循环（design.md §4）──────────────
    if (s.phase === 'SCENE') {
      var scn = s.scene;
      var beatId = scn.beats[scn.i];
      var be = R.get('events', beatId);
      var vis = Run._visibleOptions(s, be);

      if (vis.length && choiceIndex == null) {
        out.text = BH.format(be.text, s);
        out.options = optionsOut(s, vis);
        out.phase = 'SCENE';
        out.resolved = true;   // 文本已随上一拍推送过，不重复入日志
        out.sceneBeat = { i: scn.i + 1, of: scn.beats.length };
        out.sceneTotal = scn.acc;
        return { state: s, result: out };
      }

      var chosen = vis.length ? vis[choiceIndex || 0] : null;
      var relationBefore = Run._relationSnapshot(s);
      if (chosen) {
        if (chosen.restraint) {
          var bestB = Run._bestPotential(s, vis);
          Run._logRestraint(s, bestB - (chosen.drama || 0), bestB);
        }
        Run._applyOption(s, chosen, 'beat:' + beatId);
        out.relations = Run._relationChanges(relationBefore, s);
      }

      // 节拍只累加 B。M 在场景内保持不变（不变式二）
      scn.acc += (be.drama || 0) + (chosen ? (chosen.drama || 0) : 0);
      (be.tropes || []).forEach(function (t) {
        if (scn.tropes.indexOf(t) === -1) scn.tropes.push(t);
      });
      (be.tags || []).forEach(function (t) {
        if (scn.tags.indexOf(t) === -1) scn.tags.push(t);
      });
      St.addTags(s, be.tags);
      s.EVT.push(beatId);

      out.resolved = scn.shown === scn.i;
      scn.i++;
      out.text = BH.format(be.text, s);
      out.sceneBeat = { i: scn.i, of: scn.beats.length };
      out.sceneTotal = scn.acc;
      out.fx = fxOf(be);

      if (scn.i < scn.beats.length) {
        out.phase = 'SCENE';
        return { state: s, result: out };
      }

      // 场景结束：一次性结算（不变式三）
      out.score = Run._settle(s, scn.acc, 0, scn.tropes, scn.tags);
      s.scene = null;
      s.sceneCount++;
      advanceLine(s, scn.lineId, scn.forkChoice,
        scn.beats[scn.beats.length - 1]);
      Run._commitRng(s, rng);
      return finishYear(s, out);
    }

    // ── 决策年若已有待决事件，choiceIndex 就是对它的回答 ──────
    if (s.pending) {
      var pe = R.get('events', s.pending.eventId);
      var pvis = Run._visibleOptions(s, pe);
      var pick = pvis[choiceIndex || 0];
      var relationBefore = Run._relationSnapshot(s);
      if (pick) {
        if (pick.restraint) {
          var bestP = Run._bestPotential(s, pvis);
          Run._logRestraint(s, bestP - (pick.drama || 0), bestP);
        }
        Run._applyOption(s, pick, 'event:' + pe.id);
        out.relations = Run._relationChanges(relationBefore, s);
      }
      s.EVT.push(pe.id);
      St.addTags(s, pe.tags);
      s.decisions.total++;
      Run._noteDecision(s, pick);
      if (s.season === 1) {
        (pe.tags || []).forEach(function (t) {
          if (s.setupTags.indexOf(t) === -1) s.setupTags.push(t);
        });
      }
      out.text = BH.format(pe.text, s);
      out.resolved = true;
      out.score = Run._settle(s, pe.drama || 0,
        pick ? (pick.drama || 0) : 0, pe.tropes, pe.tags);
      out.fx = fxOf(pe);
      var lineId = s.pending.lineId;
      var forkChoice = pick && pick.fork != null ? pick.fork : null;
      s.pending = null;
      if (lineId) advanceLine(s, lineId, forkChoice, pe.id);

      // 结算完直接续推这一年的后续内容，不再单独消耗一个脉冲。
      // 一个决策原本要点两下（呈现 + 结算），合计占 29.6 个脉冲/局，
      // 是脉冲超标的最大单项。合并之后一个决策只花一次点击，
      // 且不损失任何内容——玩家仍然看到全部文本与计分。
      var after = finishYear(s, out);
      if (after.result.phase === 'YEAR' && !after.state.pending) {
        var tail = Run._tailFlavor(after.state, rng);
        if (tail) {
          after.result.extraFlavor = (after.result.extraFlavor || [])
            .concat(tail.entries);
          after.state = tail.state;
        }
      }
      Run._commitRng(after.state, rng);
      return after;
    }

    // ── 路线节点：数字序号兼容旧测试，UI 使用 {type:'plan'} ────
    var routeIndex = planIndexOf(choiceIndex);
    if (routeIndex != null && Run.canPlan(s)) {
      var planChoices = Run.planOffers(s);
      var selectedPlan = planChoices[routeIndex] || planChoices[0];
      if (selectedPlan) {
        var appliedPlan = Run._applyPlan(s, selectedPlan.id);
        out.routePick = true;
        out.planPick = Run._planPreview(s, appliedPlan);
        return presentAfterPlan(s, rng, out);
      }
    }

    // ── 新的一年 ────────────────────────────────────────────
    // 分水岭优先于一切：固定年份必触发（04-tracks.md §8.2 第一条）。
    // 排在事件线之后会被事件线抢走那一年，"必触发"就不成立。
    var ws0 = Run._pickWatershed(s);
    if (ws0) {
      var wv0 = Run._visibleOptions(s, ws0);
      if (wv0.length) {
        s.pending = { eventId: ws0.id, lineId: null };
        out.text = BH.format(ws0.text, s);
        out.options = optionsOut(s, wv0);
        out.fx = fxOf(ws0);
        Run._commitRng(s, rng);
        return { state: s, result: out };
      }
    }

    // 入职保底：排在事件线之前，否则会被事件线一直挤掉（17-jobs.md §0）
    var je = Run._pickJobEntry(s);
    if (je) {
      var jv = Run._visibleOptions(s, je);
      if (jv.length) {
        s.pending = { eventId: je.id, lineId: null };
        out.text = BH.format(je.text, s);
        out.options = optionsOut(s, jv);
        out.fx = fxOf(je);
        Run._commitRng(s, rng);
        return { state: s, result: out };
      }
    }

    // 晋升保底：与入职同理，否则 tier 2 职业永远进不去
    var pe2 = Run._pickPromotion(s);
    if (pe2) {
      var pv2 = Run._visibleOptions(s, pe2);
      if (pv2.length) {
        s.pending = { eventId: pe2.id, lineId: null };
        out.text = BH.format(pe2.text, s);
        out.options = optionsOut(s, pv2);
        out.fx = fxOf(pe2);
        Run._commitRng(s, rng);
        return { state: s, result: out };
      }
    }

    var due = Run._dueEventline(s);
    if (due) {
      if (due.scene) {
        s.scene = {
          lineId: due.line.id, beats: due.scene.beats.slice(),
          i: 0, shown: 0, acc: 0, tropes: [], tags: [], forkChoice: null
        };
        s.phase = 'SCENE';
        var firstBeat = R.get('events', s.scene.beats[0]);
        var fvis = Run._visibleOptions(s, firstBeat);
        out.phase = 'SCENE';
        out.text = BH.format(firstBeat.text, s);
        out.sceneBeat = { i: 1, of: s.scene.beats.length };
        out.sceneTotal = 0;
        if (fvis.length) out.options = optionsOut(s, fvis);
        Run._commitRng(s, rng);
        return { state: s, result: out };
      }
      var de = R.get('events', due.eventId);
      var dvis = Run._visibleOptions(s, de);
      if (dvis.length) {
        s.pending = {
          eventId: de.id, lineId: due.line.id,
          missed: !!due.missed, reunion: !!due.reunion
        };
        out.text = BH.format(de.text, s);
        out.options = optionsOut(s, dvis);
        out.fx = fxOf(de);
        Run._commitRng(s, rng);
        return { state: s, result: out };
      }
    }

    // 决策年先展示季内编排节点；节点选择后立即抽取事件，替代空的“继续”。
    if (Run.canPlan(s)) {
      var planChoices0 = Run.planOffers(s);
      if (planChoices0.length) {
        s.ROUTE.offers = planChoices0.map(function (p) { return p.id; });
        out.route = true;
        out.options = planChoices0;
        out.phase = 'YEAR';
        Run._commitRng(s, rng);
        return { state: s, result: out };
      }
    }

    // 决策年 → decision 池
    if (Run._isDecisionYear(s)) {
      var ev = Run._pickFromPool(s, rng, 'decision');
      if (ev) {
        var evis = Run._visibleOptions(s, ev);
        if (evis.length >= 2) {
          s.pending = { eventId: ev.id, lineId: null };
          out.text = BH.format(ev.text, s);
          out.options = optionsOut(s, evis);
          out.fx = fxOf(ev);
          Run._commitRng(s, rng);
          return { state: s, result: out };
        }
      }
    }

    // 推进脉冲：回响优先于普通 flavor（17-jobs.md §3.2）
    //
    // 一个脉冲可以携带多条 flavor：它们不产生决策，却每条各占一次点击。
    // 内容量上去之后纯 flavor 脉冲达到 22.7 个/局，是脉冲超标的主因。
    // 合并之后一次点击读 1–2 条，决策密度反而更高。
    var flavor = Run._pickFromPool(s, rng, 'echo')
      || Run._pickFromPool(s, rng, 'flavor');
    var extraFlavor = [];
    var skipped = [];
    var guard = 0;
    while (!flavor && s.age < s.lifespan && guard < 4) {
      skipped.push(s.age + ' 岁 · 没什么事发生');
      s.age++;
      Run._jobTick(s);
      s.WLOG.push(St.waterLevel(s, R.all('tracks'), R.all('jobs')));
      s.audlog.push(s.AUD);
      s.tropelog.push(null);
      guard++;
      if (Run._isDecisionYear(s)) break;
      if (Run.WATERSHED_AGES.indexOf(s.age) !== -1) break;
      flavor = Run._pickFromPool(s, rng, 'echo')
        || Run._pickFromPool(s, rng, 'flavor');
    }
    out.skippedYears = skipped;

    if (flavor) {
      s.EVT.push(flavor.id);
      St.addTags(s, flavor.tags);
      if (s.season === 1) {
        (flavor.tags || []).forEach(function (t) {
          if (s.setupTags.indexOf(t) === -1) s.setupTags.push(t);
        });
      }
      out.text = BH.format(flavor.text, s);
      out.score = Run._settle(s, flavor.drama || 0, 0,
        flavor.tropes, flavor.tags);
      out.fx = fxOf(flavor);

      // 同一脉冲优先再带一条 flavor，减少纯过场点击；UI 会逐条显示并结算
      if (rng.next() < 0.72) {
        var f2 = Run._pickFromPool(s, rng, 'flavor');
        if (f2) {
          s.EVT.push(f2.id);
          St.addTags(s, f2.tags);
          extraFlavor.push({
            text: BH.format(f2.text, s),
            score: Run._settle(s, f2.drama || 0, 0, f2.tropes, f2.tags)
          });
        }
      }
      out.extraFlavor = extraFlavor;

      // 压缩推进：一次点击再额外掠过 1–3 个无事年份（SYSTEM.md §1.1）。
      // 不做这一步，一局会有 60+ 个脉冲，远超目标。
      // 内容量从 97 涨到 145 之后可触发事件变多，脉冲数升到 60+，
      // 超过 SYSTEM.md §1.2 的 40–55。加大压缩幅度。
      var extra = rng.int(2, 5);
      for (var x = 0; x < extra; x++) {
        // s.age 在循环内已自增，所以每轮都是 +1，不能再加 x
        var nextAge = s.age + 1;
        if (nextAge >= s.lifespan) break;
        if (Run.seasonOf(nextAge).n !== s.season) break;
        if (Run._isDecisionYearAt(s, nextAge)) break;
        if (Run.WATERSHED_AGES.indexOf(nextAge) !== -1) break;
        out.skippedYears.push(nextAge + ' 岁 · 没什么事发生');
        s.age = nextAge;
        Run._jobTick(s);
        s.WLOG.push(St.waterLevel(s, R.all('tracks'), R.all('jobs')));
        s.audlog.push(s.AUD);
        s.tropelog.push(null);
      }
    }
    Run._commitRng(s, rng);
    return finishYear(s, out);
  }

  /** 找到以该事件线为关系线的 NPC */
  function npcOfLine(lineId) {
    var list = R.list('npcs');
    for (var i = 0; i < list.length; i++) {
      if (list[i].eventline === lineId) return list[i];
    }
    return null;
  }

  /**
   * NPC 出场 / 阶段推进 / 退场。
   * 出场发生在关系线第一次推进时——此前那个人还只是路人。
   */
  function syncNpc(s, lineId, lastEventId) {
    var npc = npcOfLine(lineId);
    if (!npc) return;
    var el = R.get('eventlines', lineId);
    var prog = s.ELINE[lineId] || {};
    var isReunion = !!(el.reunion && el.reunion.event === lastEventId);

    if (isReunion && s.NPCGONE.indexOf(npc.id) !== -1) {
      var gi = s.NPCGONE.indexOf(npc.id);
      s.NPCGONE.splice(gi, 1);
      if (s.NPC.indexOf(npc.id) === -1 && s.NPC.length < 5) {
        s.NPC.push(npc.id);
      }
      if (!s.NPCAX[npc.id]) s.NPCAX[npc.id] = { axis: 0, stage: 0 };
      s.NPCAX[npc.id].stage = Math.max(1, prog.stage || 1);
    } else if (s.NPC.indexOf(npc.id) === -1 && s.NPCGONE.indexOf(npc.id) === -1) {
      // 同时在场上限 5（10-npc.md §2）
      if (s.NPC.length < 5) {
        s.NPC.push(npc.id);
        var prior = s.NPCAX[npc.id];
        s.NPCAX[npc.id] = {
          axis: prior ? Number(prior.axis || 0) : 0,
          stage: 1
        };
      }
    } else if (s.NPCAX[npc.id]) {
      s.NPCAX[npc.id].stage = prog.forkId != null
        ? (prog.forkStage || 0) + 1
        : (prog.stage || 1);
    }

    // 退场：主链终点、分叉终点和 maxGap 的 missEvent 都可以让人离场。
    var exits = npc.exitEvents || [];
    var isExit = lastEventId && (
      npc.exit === lastEventId || exits.indexOf(lastEventId) !== -1 ||
      el.missEvent === lastEventId
    );
    if (isExit) {
      var i = s.NPC.indexOf(npc.id);
      if (i >= 0) s.NPC.splice(i, 1);
      if (s.NPCGONE.indexOf(npc.id) === -1) s.NPCGONE.push(npc.id);
      St.addTags(s, npc.tags || []);
    }
  }

  /** 事件线推进：选了分叉就走分叉链，否则走主链 */
  function advanceLine(s, lineId, forkChoice, lastEventId) {
    if (!lineId) return;
    var el = R.get('eventlines', lineId);
    var prog = s.ELINE[lineId]
      || { stage: 0, forkId: null, forkStage: 0, lastYear: s.age };

    if (el.reunion && el.reunion.event === lastEventId && prog.done) {
      prog.reunited = true;
      prog.lastYear = s.age;
      s.ELINE[lineId] = prog;
      syncNpc(s, lineId, lastEventId);
      return;
    }

    if (el.missEvent === lastEventId) {
      prog.missed = true;
      prog.done = true;
      prog.stage = el.chain.length;
      prog.lastYear = s.age;
      s.ELINE[lineId] = prog;
      syncNpc(s, lineId, lastEventId);
      return;
    }

    if (prog.forkId != null) {
      prog.forkStage = (prog.forkStage || 0) + 1;
      var fk = (el.forks || [])[prog.forkId];
      if (fk && prog.forkStage >= fk.chain.length) {
        prog.done = true;
        // 分叉推进轨道深度（增量必须 > 0，seal 已校验）
        var tr = R.get('tracks', fk.track);
        St.bumpTrack(s, fk.track, fk.depth, tr.maxDepth);
      }
    } else if (forkChoice != null && (el.forks || [])[forkChoice] &&
        (el.forks || [])[forkChoice].from === prog.stage + 1) {
      prog.forkId = forkChoice;
      prog.forkStage = 0;
    } else {
      prog.stage += 1;
      if (prog.stage >= el.chain.length) prog.done = true;
    }
    prog.lastYear = s.age;
    s.ELINE[lineId] = prog;
    syncNpc(s, lineId, lastEventId);
  }

  /** 年末：推进年龄、判定季末与死亡 */
  function finishYear(s, out) {
    s.age++;
    var sn = Run.seasonOf(s.age);

    if (Run._shouldDie(s)) {
      s.phase = 'ENDING';
      out.phase = 'ENDING';
      return { state: s, result: out };
    }

    if (sn.n !== s.season) {
      s.phase = 'SEASON_END';
      out.phase = 'SEASON_END';
      out.seasonEnd = seasonVerdict(s);
      return { state: s, result: out };
    }

    s.phase = 'YEAR';
    out.phase = 'YEAR';
    out.age = s.age;
    return { state: s, result: out };
  }

  /** 季末判定（05-chapter.md §1） */
  function seasonVerdict(s) {
    var prev = Run.SEASONS[s.season - 1];
    var T = prev.threshold;
    var verdict = 'renew';
    if (T != null) {
      var eff = T * Math.pow(1.5, s.cancelCount);
      if (s.seasonSum >= eff * 2) verdict = 'extend';
      else if (s.seasonSum >= eff) verdict = 'renew';
      else verdict = 'cancel';
    }
    return {
      season: s.season, name: prev.name, sum: s.seasonSum,
      threshold: T == null ? null : T * Math.pow(1.5, s.cancelCount),
      verdict: verdict
    };
  }

  /**
   * 决策结算后顺带播的 flavor（合并脉冲用）。
   * 返回 null 表示这一年没有多余内容。
   */
  function tailFlavor(state, rng) {
    if (rng.next() >= 0.5) return null;
    var s = state;
    var f = Run._pickFromPool(s, rng, 'echo')
      || Run._pickFromPool(s, rng, 'flavor');
    if (!f) return null;
    s.EVT.push(f.id);
    St.addTags(s, f.tags);
    var sc = Run._settle(s, f.drama || 0, 0, f.tropes, f.tags);
    return {
      state: s,
      entries: [{ text: BH.format(f.text, s), score: sc }]
    };
  }

  Run.advance = advance;
  Run._tailFlavor = tailFlavor;
  Run._advanceLine = advanceLine;
  Run._syncNpc = syncNpc;
  Run._npcOfLine = npcOfLine;
  Run._finishYear = finishYear;
  Run._seasonVerdict = seasonVerdict;
  Run._optionsOut = optionsOut;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ── 季末提交、终局、真结局判定 ────────────────────────────────── */
(function (g) {
  'use strict';
  var BH = g.BH;
  var St = BH.state;
  var Sc = BH.scoring;
  var R = BH.registry;
  var Run = BH.run;

  var REVIVES = [
    'end_revive_chuanyue', 'end_revive_shiyi',
    'end_revive_shuangbao', 'end_revive_meng'
  ];

  /**
   * 提交季末结果。SEASON_END 相位下调用。
   * 达标后进入三选一（19-tension.md §1.2）——这就是分数的用处。
   */
  function commitSeason(state) {
    var s = St.clone(state);
    var rng = Run._rngFor(s);
    var v = Run._seasonVerdict(s);
    var out = {
      phase: 'YEAR', seasonEnd: v, text: '',
      revive: null, extendYears: 0, reward: null
    };

    s.seasonSums.push(s.seasonSum);
    // 季末已经离开当前节目季；REWARD/REVIVE 画面不应继续持有旧季牌组。
    // 后续 applyReward/commitRevive 仍会再次 reset，兼容直接提交旧存档。
    Run._resetRoute(s);

    if (v.verdict === 'extend') {
      out.extendYears = rng.int(2, 4);
      s.lifespan += out.extendYears;
      out.text = '平台看了数据，追加了投资。你多活了 ' + out.extendYears +
        ' 年，合同上写着「内容方向不变」。';
      out.reward = Run.makeReward(s, rng);
      s.phase = 'REWARD';
      out.phase = 'REWARD';
      Run._commitRng(s, rng);
      return { state: s, result: out };
    }

    if (v.verdict === 'renew' && v.threshold != null) {
      out.reward = Run.makeReward(s, rng);
      s.phase = 'REWARD';
      out.phase = 'REWARD';
      Run._commitRng(s, rng);
      return { state: s, result: out };
    }

    if (v.verdict === 'cancel') {
      s.cancelCount++;
      // 腰斩可以无限次发生，不再提前完结（SYSTEM.md §1.35）。
      // 代价是污点越堆越多、阈值越抬越高，分数被压到底，
      // 但玩家一定能看完自己这条命。
      if (s.cancelCount >= 2) s.lanwei = true;
      var rid = rng.pick(REVIVES);
      St.grantScar(s, 'scar_zhushui');
      s.AUD = Math.max(St.LIMITS.AUD_MIN, Math.floor(s.AUD / 2));
      out.revive = { id: rid, text: R.get('endings', rid).text };
      out.text = out.revive.text;
      s.phase = 'REVIVE';
      out.phase = 'REVIVE';
      Run._commitRng(s, rng);
      return { state: s, result: out };
    }

    // S1 / S5：无阈值，直接进下一季
    s.seasonSum = 0;
    s.season = Run.seasonOf(s.age).n;
    Run._resetRoute(s);
    s.phase = 'YEAR';
    Run._commitRng(s, rng);
    return { state: s, result: out };
  }

  /** REVIVE 相位点继续 */
  function commitRevive(state) {
    var s = St.clone(state);
    s.seasonSum = 0;
    s.season = Run.seasonOf(s.age).n;
    Run._resetRoute(s);
    s.phase = 'YEAR';
    return { state: s, result: { phase: 'YEAR', text: '' } };
  }

  /**
   * 真结局四条件（08-true-ending.md §3）
   *   ① HOOKP ≥ 12   ② 终局 HOOK ≤ 3
   *   ③ 高价收手 ≥ 3 次   ④ 至少 1 次高价收手在 S4 或更晚
   */
  function checkTrueEnding(s) {
    var high = s.restraintLog.filter(function (r) { return r.highValue; });
    var late = high.filter(function (r) { return r.season >= 4; });
    return s.HOOKP >= 12 && s.HOOK <= 3 &&
      high.length >= 3 && late.length >= 1;
  }

  /** 终局结算 */
  function commitEnding(state) {
    var s = St.clone(state);
    var rng = Run._rngFor(s);

    if (s.seasonSum > 0) {
      s.seasonSums.push(s.seasonSum);
      s.seasonSum = 0;
    }

    var trueEnd = checkTrueEnding(s);
    var death = null;
    var endingId;

    if (trueEnd) {
      endingId = 'end_stable';
    } else if (s.lanwei) {
      // 烂尾是一个标签，不是终止条件（SYSTEM.md §1.35）
      endingId = 'end_lanwei';
      death = Run._pickDeath(s, rng);
    } else {
      endingId = 'end_normal';
      death = Run._pickDeath(s, rng);
    }

    // 三乘数
    var ampRes = Sc.amplitude(s.WLOG, s.audlog, s.tropelog);
    var dom = St.dominantTrack(s);
    var maxDepth = dom.id && R.has('tracks', dom.id)
      ? R.get('tracks', dom.id).maxDepth : 1;
    var com = Sc.commitment({
      dominantDecisions: s.decisions.byTrack[dom.id] || dom.depth,
      totalDecisions: Math.max(1, s.decisions.total || s.EVT.length),
      depth: dom.depth,
      maxDepth: maxDepth,
      trackDepths: s.TRACK
    });
    var deathTags = death ? (death.tags || []) : [];
    var deathTrope = death && death.tropes ? death.tropes[0] : null;
    var iro = Sc.irony(deathTags, s.setupTags, deathTrope, s.peak.trope);

    var fin = Sc.final({
      seasonSums: s.seasonSums,
      amp: ampRes.amp, com: com, iro: iro,
      trueEnding: trueEnd
    });

    s.ended = true;
    s.endingId = endingId;
    s.phase = 'SETTLEMENT';
    s.final = {
      trueEnding: trueEnd,
      endingId: endingId,
      endingText: BH.format(R.get('endings', endingId).text, s),
      deathId: death ? death.id : null,
      deathText: death ? BH.format(death.text, s) : null,
      seasonTotal: fin.seasonTotal,
      amp: fin.amp, com: fin.com, iro: fin.iro,
      total: fin.total,
      rating: fin.rating,
      segments: ampRes.segments,
      timeline: s.timeline.slice()
        .sort(function (a, b) { return b.total - a.total; })
        .slice(0, 4)
        .sort(function (a, b) { return a.age - b.age; })
    };
    Run._commitRng(s, rng);
    return { state: s, result: { phase: 'SETTLEMENT', final: s.final } };
  }

  Run.commitSeason = commitSeason;
  Run.commitRevive = commitRevive;
  Run.commitEnding = commitEnding;
  Run.checkTrueEnding = checkTrueEnding;
  Run.REVIVES = REVIVES;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ── 季末三选一奖励（19-tension.md §1.2）────────────────────────── */
(function (g) {
  'use strict';
  var BH = g.BH;
  var St = BH.state;
  var R = BH.registry;
  var Run = BH.run;

  var RARITY_CN = {
    common: '普通', rare: '稀有', epic: '史诗', legend: '传说'
  };
  var RARITY_UP = {
    common: 'rare', rare: 'epic', epic: 'legend', legend: 'legend'
  };

  /** 超额倍数 → 奖励档位 */
  function tierOf(over) {
    if (over >= 2.0) return 'epic';
    if (over >= 1.5) return 'rare';
    return 'common';
  }

  function castOfRarity(rarity, ownedIds, state) {
    var pool = R.list('cast').filter(function (c) {
      return c.rarity === rarity && ownedIds.indexOf(c.id) === -1;
    });
    var unlocked = state && state.META && state.META.unlocked && state.META.unlocked.cast;
    var preferred = Array.isArray(unlocked) ? pool.filter(function (c) {
      return unlocked.indexOf(c.id) !== -1;
    }) : [];
    if (preferred.length) return preferred;
    if (!pool.length) {
      pool = R.list('cast').filter(function (c) { return c.rarity === rarity; });
    }
    return pool;
  }

  /**
   * 生成三选一。三个选项 type 互不相同（19-tension.md §4 检查 5）。
   * @returns {{tier:string, over:number, options:Object[]}}
   */
  function makeReward(s, rng) {
    var sn = Run.SEASONS[s.season - 1];
    var target = sn && sn.threshold != null
      ? sn.threshold * Math.pow(1.5, s.cancelCount) : 0;
    var lastSum = s.seasonSums[s.seasonSums.length - 1] || 0;
    var over = target ? lastSum / target : 1.2;
    var tier = tierOf(over);
    var owned = s.CAST.map(function (c) { return c.id; });

    var builders = [];

    // 人设牌
    var cardPool = castOfRarity(tier, owned, s);
    if (cardPool.length) {
      var card = rng.pick(cardPool);
      builders.push({
        type: 'cast', rarity: tier,
        label: card.emoji + ' ' + card.name,
        desc: card.desc,
        payload: { cast: card.id }
      });
    }

    // 观众
    var audGain = tier === 'epic' ? 16 : tier === 'rare' ? 10 : 6;
    builders.push({
      type: 'aud', rarity: tier,
      label: '👀 观众 +' + audGain,
      desc: '收视放大系数直接提高',
      payload: { effect: { AUD: audGain } }
    });

    // 加更
    var years = tier === 'epic' ? 4 : tier === 'rare' ? 3 : 2;
    builders.push({
      type: 'extend', rarity: tier,
      label: '📼 加更 ' + years + ' 年',
      desc: '本季追加年份，更多年就是更多分',
      payload: { years: years }
    });

    // 属性
    var STAT_CN = { CHR: '颜', INT: '智', STR: '体', MNY: '钱', SPR: '心' };
    var k = rng.pick(St.STAT_KEYS);
    var amt = tier === 'epic' ? 4 : tier === 'rare' ? 3 : 2;
    var eff = {};
    eff[k] = amt;
    builders.push({
      type: 'stat', rarity: tier,
      label: '📈 ' + STAT_CN[k] + ' +' + amt,
      desc: '',
      payload: { effect: eff }
    });

    // 污点交易：主动吃一张污点，换一张高一档的人设牌（C3 的载体）
    var upRarity = RARITY_UP[tier];
    var upPool = castOfRarity(upRarity, owned, s);
    var scarPool = R.list('scars');
    if (upPool.length && scarPool.length) {
      var upCard = rng.pick(upPool);
      var scar = rng.pick(scarPool);
      builders.push({
        type: 'trade', rarity: upRarity,
        label: upCard.emoji + upCard.name + '　+　' + scar.emoji + scar.name,
        desc: '吃一张永不移除的污点，换高一档的牌',
        payload: { cast: upCard.id, scar: scar.id }
      });
    }

    return {
      tier: tier, over: over,
      options: rng.sample(builders, Math.min(3, builders.length))
    };
  }

  /** 应用玩家选中的奖励 */
  function applyReward(state, reward, index) {
    var s = St.clone(state);
    var opt = reward && reward.options ? reward.options[index] : null;
    var txt = '';

    if (opt) {
      var p = opt.payload || {};
      if (p.effect) St.applyEffect(s, p.effect, 'reward');
      if (p.cast) {
        var card = R.get('cast', p.cast);
        St.grantCast(s, p.cast, card.maxLv);
        if (card.lifespan) s.lifespan += card.lifespan;
      }
      if (p.scar) St.grantScar(s, p.scar);
      if (p.years) s.lifespan += p.years;
      txt = '本季奖励（' + RARITY_CN[opt.rarity] + '）：' + opt.label;
    }

    s.seasonSum = 0;
    s.season = Run.seasonOf(s.age).n;
    Run._resetRoute(s);
    s.phase = 'YEAR';
    return { state: s, result: { text: txt } };
  }

  Run.makeReward = makeReward;
  Run.applyReward = applyReward;
  Run._castOfRarity = castOfRarity;
  Run._tierOf = tierOf;
  Run.RARITY_CN = RARITY_CN;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ── 时间循环（20-anomaly.md §3）────────────────────────────────
 *
 * 设计要点：循环本身几乎不得分，因为 F 疲劳系数把重播的收视吃掉了，
 * 而水位不记入 WLOG 所以振幅也冻结。玩家必须想办法出去。
 *
 * "观众在看重播"不是隐喻，是字面意思——同一台数学，两种用途。
 */
(function (g) {
  'use strict';
  var BH = g.BH;
  var St = BH.state;
  var R = BH.registry;
  var Run = BH.run;

  var LOOP_MAX = 6;              // 循环上限轮数
  var BREAK_BASE = 60;           // 破环基础桥段
  var BREAK_PER_ROUND = 12;      // 每轮循环追加

  /** 进入循环。一局最多一次（§3.5） */
  function enterLoop(s, eventId) {
    if (s.LOOPED || s.LOOP) return false;
    s.LOOP = { year: s.age, count: 0, seen: [], eventId: eventId };
    return true;
  }

  /**
   * 循环内可见的选项：做过的标记为 tried。
   * "选项逐轮减少"让玩家看得见自己在重复，不靠提示告诉他。
   */
  function loopOptions(s, opts) {
    return opts.map(function (o, i) {
      var key = o.id || String(i);
      return {
        opt: o,
        key: key,
        tried: s.LOOP.seen.indexOf(key) !== -1
      };
    });
  }

  /**
   * 记录一次循环内的选择。
   *
   * 大部分选项是"试了但没用"（消耗掉，之后不再出现），
   * 只有带 breaks 的是出口。
   *
   * @param {Object} s
   * @param {string} key 选项键
   * @param {boolean} breaks 该选项是否是出口
   * @returns {{broke:boolean, rounds:number, forced:boolean}}
   */
  function loopPick(s, key, breaks) {
    s.LOOP.seen.push(key);

    if (breaks) {
      var n = s.LOOP.count;
      s.LOOP = null;
      s.LOOPED = true;
      return { broke: true, rounds: n, forced: false };
    }

    s.LOOP.count++;
    if (s.LOOP.count >= LOOP_MAX) {
      // 到上限强制破环，并留一张污点
      St.grantScar(s, 'scar_qiyue');
      var rounds = s.LOOP.count;
      s.LOOP = null;
      s.LOOPED = true;
      return { broke: true, rounds: rounds, forced: true };
    }
    return { broke: false, rounds: s.LOOP.count, forced: false };
  }

  /** 破环桥段：补偿循环期间被疲劳吃掉的收视 */
  function breakDrama(rounds) {
    return BREAK_BASE + BREAK_PER_ROUND * rounds;
  }

  /** 循环内还剩的选项：普通选项选过即消耗，出口永远在 */
  function remaining(s, opts) {
    return opts.filter(function (o, i) {
      var key = o.id || String(i);
      if (o.breaks) return true;
      return s.LOOP.seen.indexOf(key) === -1;
    });
  }

  Run.loop = {
    MAX: LOOP_MAX,
    enter: enterLoop,
    options: loopOptions,
    remaining: remaining,
    pick: loopPick,
    breakDrama: breakDrama
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
