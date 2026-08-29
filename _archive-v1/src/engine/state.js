/* badhand — 状态模型
 *
 * 正典：docs/SYSTEM.md §0（状态字段）、§3.1 与 docs/modules/01-scoring.md §4.1（水位）
 *
 * 职责：
 *   1. 定义一局的全部状态，并保证它是纯数据（可 JSON 往返）
 *   2. 应用 effect / grant，负责全部范围钳制
 *   3. 计算水位 W
 *   4. 向 condition.js 注册内置属性
 *
 * 依赖：errors.js, condition.js
 * 零 DOM 依赖（design.md §1.1）
 */
(function (g) {
  'use strict';
  var BH = (g.BH = g.BH || {});
  var contentFail = BH.contentFail;
  var invariant = BH.invariant;

  // ── 范围常量（SYSTEM.md §0）──────────────────────────────────
  var STAT_KEYS = ['CHR', 'INT', 'STR', 'MNY', 'SPR'];
  var STAT_MIN = -5;
  var STAT_MAX = 20;
  var AUD_MIN = 1;
  var AUD_MAX = 100;
  var HOOK_MIN = 0;
  var HOOK_MAX = 20;
  var NPC_AXIS_MIN = -10;
  var NPC_AXIS_MAX = 10;
  var AUD_START = 3;
  var STAT_START = 3;

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function copyIds(value) {
    var out = [];
    if (!Array.isArray(value)) return out;
    value.forEach(function (id) {
      if (typeof id !== 'string' || !id || out.indexOf(id) !== -1) return;
      out.push(id);
    });
    return out;
  }

  /**
   * 本局内容权限快照。引擎只复制纯数据，不读写 localStorage。
   * @param {Object} meta { unlocked: { cast, talent, npc, track, ... } }
   */
  function metaSnapshot(meta) {
    var unlocked = meta && meta.unlocked || {};
    return {
      cast: copyIds(unlocked.cast),
      talent: copyIds(unlocked.talent),
      npc: copyIds(unlocked.npc),
      track: copyIds(unlocked.track),
      family: copyIds(unlocked.family),
      personality: copyIds(unlocked.personality),
    };
  }

  /**
   * 创建一局初始状态。
   * @param {Object} [opts] { stats, family, sex, persona0, talents, meta }
   */
  function create(opts) {
    opts = opts || {};
    var s = {
      // 相位与时间
      phase: 'BOOT',
      age: 0,
      season: 1,

      // 五维。起始 3（SYSTEM.md §0.1：必须 > 0，否则出生即触发 STR<=0 死亡）
      CHR: STAT_START, INT: STAT_START, STR: STAT_START,
      MNY: STAT_START, SPR: STAT_START,

      // 本作特有三轴
      AUD: AUD_START,
      HOOK: 0,
      HOOKP: 0,

      // 职业（17-jobs.md）。null = 无业
      JOB: null,
      JOBYEARS: 0,     // 现职年数，用于晋升门槛与"熬了多久"的文案
      JOBLOG: [],      // 做过的职业 id，回响事件用

      // 开局四项（局内只读）
      FAMILY: opts.family || null,
      SEX: opts.sex || null,
      PERSONA0: opts.persona0 || null,
      TALENT: (opts.talents || []).slice(),

      // 列表与字典
      CAST: [],      // [{id, lv}]
      SCAR: [],      // [id]
      TRACK: {},     // {trackId: depth}
      TROPE: {},     // {tropeId: count}
      FLAG: [],
      EVT: [],
      TAG: [],
      WLOG: [],      // 逐年水位
      DECK: [],      // 当前季节目牌 [{id, track, tags}]，最多 3 张
      ROUTE: { season: 1, slot: 0, offers: [], picked: [], risk: 0 },
      META: { unlocked: metaSnapshot(opts.meta) }, // 本局权限快照，不连存档
      PLANLOG: [],    // 跨季实际选中的 plan id，只增不减

      // NPC
      NPC: [],       // 在场 id
      NPCAX: {},     // {npcId: {axis, stage}}
      NPCGONE: [],

      // 事件线
      ELINE: {},     // {lineId: {stage, forkId, lastYear}}

      // 精神指数两端记录（21-spirit.md §5.1）。只增不减
      sprLow: false,
      sprHigh: false,

      // 时间循环（20-anomaly.md §3）。null = 不在循环里
      LOOP: null,    // {year, count, seen:[optionKey], lineId}
      LOOPED: false, // 本局是否已用过一次循环（一局最多一次）

      // 观众上限。某些异常轨道会压低它（"夜里的人"锁在 30）
      audCap: 100,
      audFrozen: false,   // 后室轨道：观众增长被切断
      yeliApplied: false, // 夜里的人的寿命/上限只应用一次

      // 季与结局
      seasonSum: 0,
      seasonSums: [],
      cancelCount: 0,
      restraintLog: [], // 收手记录，真结局判定用
      escalateCount: 0,
      ended: false,
      endingId: null,
    };

    if (opts.stats) {
      for (var i = 0; i < STAT_KEYS.length; i++) {
        var k = STAT_KEYS[i];
        if (opts.stats[k] != null) {
          s[k] = clamp(Number(opts.stats[k]), STAT_MIN, STAT_MAX);
        }
      }
    }
    return s;
  }

  /** 深拷贝。状态是纯数据，因此 JSON 往返即可——顺便证明了纯数据约束 */
  function clone(s) {
    return JSON.parse(JSON.stringify(s));
  }

  // ── 水位（01-scoring.md §4.1）────────────────────────────────

  function norm(x) {
    return clamp((x + 5) / 25, 0, 1);
  }

  /**
   * 社会位置 ∈ [0, 10]，由轨道深度与旗标决定（04-tracks.md §2）。
   * 轨道的 socialWeight 由 registry 提供；缺失时按 0.5 计。
   */
  function socialRank(s, trackTable, jobTable) {
    var total = 0;
    for (var id in s.TRACK) {
      var w = trackTable && trackTable[id] && trackTable[id].socialWeight != null
        ? trackTable[id].socialWeight
        : 0.5;
      total += s.TRACK[id] * w;
    }
    // 职业参与社会位置，于是失业是真的掉水位（17-jobs.md §1）
    if (s.JOB && jobTable && jobTable[s.JOB]) {
      var j = jobTable[s.JOB];
      total += (j.tier || 1) * (j.socialWeight != null ? j.socialWeight : 0.5);
    }
    return clamp(total, 0, 10);
  }

  /** @returns {number} W ∈ [1, 100] */
  function waterLevel(s, trackTable, jobTable) {
    var w =
      0.5 * norm(s.MNY) +
      0.3 * (socialRank(s, trackTable, jobTable) / 10) +
      0.2 * norm(s.SPR);
    return 1 + 99 * clamp(w, 0, 1);
  }

  // ── effect 应用 ─────────────────────────────────────────────

  var EFFECT_KEYS = STAT_KEYS.concat(['AUD', 'HOOK']);

  /**
   * 应用一个 effect 对象。就地修改 s（调用方负责先 clone）。
   * 未知键抛 ContentError——绝不静默忽略，否则内容作者写错字段名永远发现不了。
   */
  function applyEffect(s, effect, where) {
    if (!effect) return s;
    for (var k in effect) {
      if (EFFECT_KEYS.indexOf(k) === -1) {
        contentFail(
          'effect 里出现未知键：' + k + '\n  可用：' + EFFECT_KEYS.join(' '),
          { key: k, where: where || null }
        );
      }
      var d = Number(effect[k]);
      if (!isFinite(d)) {
        contentFail('effect.' + k + ' 不是有限数字：' + effect[k], {
          key: k,
          where: where || null,
        });
      }
      if (k === 'AUD') {
        // 循环期间观众不增长——重播不涨观众（20-anomaly.md §3.5）
        if (s.LOOP && d > 0) continue;
        // 后室轨道：观众增长被彻底切断（20-anomaly.md §1.2）
        if (s.audFrozen && d > 0) continue;
        var cap = s.audCap != null ? s.audCap : AUD_MAX;
        s.AUD = clamp(s.AUD + d, AUD_MIN, Math.min(cap, AUD_MAX));
      } else if (k === 'HOOK') {
        s.HOOK = clamp(s.HOOK + d, HOOK_MIN, HOOK_MAX);
        if (s.HOOK > s.HOOKP) s.HOOKP = s.HOOK;
      } else {
        s[k] = clamp(s[k] + d, STAT_MIN, STAT_MAX);
      }
    }
    trackSpiritExtremes(s);
    return s;
  }

  // ── 精神指数档位（21-spirit.md §1）────────────────────────────
  // 双向门槛：两端都开内容，中间（常态带）刻意什么都没有。
  // "过得平平稳稳"在机制上就是无事发生——这是 C2 的直接实现。
  var SPR_BANDS = [
    { key: 'crash', name: '崩溃', max: 0 },
    { key: 'low', name: '消沉', max: 4 },
    { key: 'flat', name: '常态', max: 11 },
    { key: 'keen', name: '敏锐', max: 16 },
    { key: 'over', name: '超载', max: Infinity }
  ];

  /** @returns {number} 档位序号 0崩溃 1消沉 2常态 3敏锐 4超载 */
  function spiritBand(spr) {
    for (var i = 0; i < SPR_BANDS.length; i++) {
      if (spr <= SPR_BANDS[i].max) return i;
    }
    return SPR_BANDS.length - 1;
  }

  function spiritBandInfo(spr) {
    return SPR_BANDS[spiritBand(spr)];
  }

  /** 记录是否进过两端。只增不减，供后期回响事件引用 */
  function trackSpiritExtremes(s) {
    var b = spiritBand(s.SPR);
    if (b === 0) s.sprLow = true;
    if (b === 4) s.sprHigh = true;
  }

  /** 人设牌：同名再获得则 lv+1（02-cast.md §2） */
  function grantCast(s, id, maxLv) {
    for (var i = 0; i < s.CAST.length; i++) {
      if (s.CAST[i].id === id) {
        if (maxLv == null || s.CAST[i].lv < maxLv) s.CAST[i].lv += 1;
        return s;
      }
    }
    s.CAST.push({ id: id, lv: 1 });
    return s;
  }

  /** 污点牌：永不移除，可叠加（02-cast.md §4） */
  function grantScar(s, id) {
    s.SCAR.push(id);
    return s;
  }

  function addFlag(s, id) {
    if (s.FLAG.indexOf(id) === -1) s.FLAG.push(id);
    return s;
  }

  /** 关系轴：内容选项显式改变，事件线推进不自动加好感。 */
  function bumpNpcAxis(s, id, delta) {
    var d = Number(delta);
    if (!id || !isFinite(d)) {
      contentFail('relation 必须提供 NPC id 与有限数字 delta', {
        id: id || null, delta: delta,
      });
    }
    var entry = s.NPCAX[id] || { axis: 0, stage: 0 };
    entry.axis = clamp(Number(entry.axis || 0) + d, NPC_AXIS_MIN, NPC_AXIS_MAX);
    if (entry.stage == null) entry.stage = 0;
    s.NPCAX[id] = entry;
    return s;
  }

  function addTags(s, tags) {
    if (!tags) return s;
    for (var i = 0; i < tags.length; i++) {
      if (s.TAG.indexOf(tags[i]) === -1) s.TAG.push(tags[i]);
    }
    return s;
  }

  function bumpTrack(s, id, delta, maxDepth) {
    var cur = s.TRACK[id] || 0;
    var next = cur + delta;
    if (maxDepth != null) next = Math.min(next, maxDepth);
    s.TRACK[id] = Math.max(0, next);
    return s;
  }

  /** 主导轨道：深度最高者；并列时取 id 字典序最小，保证确定性 */
  function dominantTrack(s) {
    var best = null;
    var bestDepth = -1;
    var ids = Object.keys(s.TRACK).sort();
    for (var i = 0; i < ids.length; i++) {
      if (s.TRACK[ids[i]] > bestDepth) {
        bestDepth = s.TRACK[ids[i]];
        best = ids[i];
      }
    }
    return { id: best, depth: bestDepth < 0 ? 0 : bestDepth };
  }

  /** 入职 / 转行。转行时 tier 从头来，代价由 Com 乘数自然承担 */
  function setJob(s, jobId) {
    if (s.JOB === jobId) return s;
    s.JOB = jobId;
    s.JOBYEARS = 0;
    if (jobId && s.JOBLOG.indexOf(jobId) === -1) s.JOBLOG.push(jobId);
    return s;
  }

  /** 失业。income 归零，社会位置跟着掉 */
  function loseJob(s) {
    s.JOB = null;
    s.JOBYEARS = 0;
    return s;
  }

  /** trope 计数：先读后写由调用方保证顺序（01-scoring.md §2 第 5 步） */
  function tropeCount(s, id) {
    return s.TROPE[id] || 0;
  }

  function bumpTrope(s, id) {
    s.TROPE[id] = tropeCount(s, id) + 1;
    return s;
  }

  BH.state = {
    create: create,
    metaSnapshot: metaSnapshot,
    clone: clone,
    applyEffect: applyEffect,
    grantCast: grantCast,
    grantScar: grantScar,
    addFlag: addFlag,
    bumpNpcAxis: bumpNpcAxis,
    addTags: addTags,
    bumpTrack: bumpTrack,
    setJob: setJob,
    loseJob: loseJob,
    dominantTrack: dominantTrack,
    tropeCount: tropeCount,
    bumpTrope: bumpTrope,
    waterLevel: waterLevel,
    socialRank: socialRank,
    norm: norm,
    clamp: clamp,
    spiritBand: spiritBand,
    spiritBandInfo: spiritBandInfo,
    SPR_BANDS: SPR_BANDS,
    STAT_KEYS: STAT_KEYS,
    EFFECT_KEYS: EFFECT_KEYS,
    LIMITS: {
      STAT_MIN: STAT_MIN, STAT_MAX: STAT_MAX,
      AUD_MIN: AUD_MIN, AUD_MAX: AUD_MAX,
      HOOK_MIN: HOOK_MIN, HOOK_MAX: HOOK_MAX,
      NPC_AXIS_MIN: NPC_AXIS_MIN, NPC_AXIS_MAX: NPC_AXIS_MAX,
      AUD_START: AUD_START,
      STAT_START: STAT_START,
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
