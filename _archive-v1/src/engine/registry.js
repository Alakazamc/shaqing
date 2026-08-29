/* badhand — 内容注册表
 *
 * 正典：docs/modules/14-content-api.md
 * 两阶段加载：register（各内容文件执行时）→ seal（全部加载完毕后一次性校验并冻结）
 * 因此内容文件的加载顺序对跨引用完全无所谓（断言 67）。
 *
 * 依赖：errors.js, condition.js
 */
(function (g) {
  'use strict';
  var BH = (g.BH = g.BH || {});
  var contentFail = BH.contentFail;

  BH.SCHEMA_VERSION = 1;

  var KINDS = [
    'tags', 'tropes', 'tracks', 'jobs', 'cast', 'scars', 'talents',
    'npcs', 'eventlines', 'plans', 'events', 'endings', 'gacha',
    'titles', 'reviews', 'lexicon', 'origins', 'packs',
  ];

  var store = null;
  var sealed = false;
  var sources = null; // id → 来源描述，用于重复注册的错误信息

  function reset() {
    store = {};
    sources = {};
    sealed = false;
    for (var i = 0; i < KINDS.length; i++) store[KINDS[i]] = {};
    store.titles = { patterns: [], slots: {} };
    store.origins = { family: [], sex: [], personality: [] };
    store.reviews = [];
    store.lexicon = {};
    store.tags = {};
  }
  reset();

  function assertOpen(what) {
    if (sealed) {
      contentFail('注册表已封盘，不能再注册 ' + what, { what: what });
    }
  }

  function requireFields(obj, fields, kind) {
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (obj[f] === undefined || obj[f] === null || obj[f] === '') {
        contentFail(
          kind + ' 缺少必填字段 ' + f + '：' + JSON.stringify(obj).slice(0, 120),
          { kind: kind, field: f, id: obj.id || null }
        );
      }
    }
  }

  /** 通用的 id 表登记 */
  function addById(kind, arr, required, src) {
    assertOpen(kind);
    if (!Array.isArray(arr)) {
      contentFail('define.' + kind + ' 需要数组', { kind: kind });
    }
    for (var i = 0; i < arr.length; i++) {
      var item = arr[i];
      requireFields(item, ['id'].concat(required || []), kind);
      var key = kind + ':' + item.id;
      if (store[kind][item.id]) {
        contentFail(
          'id 重复注册：' + item.id + '\n  先前来源：' + (sources[key] || '未知') +
            '\n  本次来源：' + (src || '未知'),
          { kind: kind, id: item.id }
        );
      }
      // 内容必须是纯数据（requirements §4）
      assertPlainData(item, kind + ':' + item.id);
      store[kind][item.id] = item;
      sources[key] = src || '未知';
    }
  }

  /** 递归检查纯数据：无函数、无 undefined。这条守住 content/ 与 engine/ 的边界 */
  function assertPlainData(v, where) {
    var t = typeof v;
    if (v === null) return;
    if (t === 'function') {
      contentFail('内容层不允许出现函数：' + where, { where: where });
    }
    if (t === 'undefined') {
      contentFail('内容层不允许出现 undefined：' + where, { where: where });
    }
    if (t === 'object') {
      if (Array.isArray(v)) {
        for (var i = 0; i < v.length; i++) assertPlainData(v[i], where + '[' + i + ']');
      } else {
        for (var k in v) assertPlainData(v[k], where + '.' + k);
      }
    }
  }

  // ── define API（14-content-api.md §4）───────────────────────
  var define = {
    pack: function (p) {
      assertOpen('pack');
      requireFields(p, ['id', 'schema'], 'pack');
      if (p.schema !== BH.SCHEMA_VERSION) {
        contentFail(
          '内容包 ' + p.id + ' 的 schema 版本为 ' + p.schema +
            '，引擎需要 ' + BH.SCHEMA_VERSION +
            (p.schema < BH.SCHEMA_VERSION ? '（内容包过旧）' : '（引擎过旧）'),
          { id: p.id, schema: p.schema }
        );
      }
      store.packs[p.id] = p;
    },
    tags: function (obj) {
      assertOpen('tags');
      for (var group in obj) {
        if (!Array.isArray(obj[group])) {
          contentFail('tags.' + group + ' 必须是数组', { group: group });
        }
        store.tags[group] = (store.tags[group] || []).concat(obj[group]);
      }
    },
    tropes: function (arr) {
      assertOpen('tropes');
      for (var i = 0; i < arr.length; i++) {
        store.tropes[arr[i]] = true;
      }
    },
    tracks: function (a, src) { addById('tracks', a, ['name', 'maxDepth'], src); },
    jobs: function (a, src) { addById('jobs', a, ['name', 'track', 'tier'], src); },
    cast: function (a, src) { addById('cast', a, ['name'], src); },
    scars: function (a, src) { addById('scars', a, ['name'], src); },
    talents: function (a, src) { addById('talents', a, ['name'], src); },
    npcs: function (a, src) { addById('npcs', a, ['name', 'bio', 'voice', 'never'], src); },
    eventlines: function (a, src) { addById('eventlines', a, ['chain'], src); },
    plans: function (a, src) { addById('plans', a, ['label', 'kind', 'risk'], src); },
    events: function (a, src) { addById('events', a, ['text'], src); },
    endings: function (a, src) { addById('endings', a, ['text'], src); },
    gacha: function (a, src) { addById('gacha', a, ['type', 'target', 'tier'], src); },
    titles: function (obj) {
      assertOpen('titles');
      if (obj.patterns) store.titles.patterns = store.titles.patterns.concat(obj.patterns);
      if (obj.slots) {
        for (var k in obj.slots) {
          store.titles.slots[k] = (store.titles.slots[k] || []).concat(obj.slots[k]);
        }
      }
    },
    reviews: function (arr) {
      assertOpen('reviews');
      store.reviews = store.reviews.concat(arr);
    },
    lexicon: function (arr) {
      assertOpen('lexicon');
      for (var i = 0; i < arr.length; i++) {
        requireFields(arr[i], ['id', 'term', 'scope', 'risk'], 'lexicon');
        store.lexicon[arr[i].id] = arr[i];
      }
    },
    origins: function (obj) {
      assertOpen('origins');
      ['family', 'sex', 'personality'].forEach(function (k) {
        if (obj[k]) {
          for (var i = 0; i < obj[k].length; i++) {
            requireFields(obj[k][i], ['id', 'name'], 'origins.' + k);
            assertPlainData(obj[k][i], 'origins.' + k + ':' + obj[k][i].id);
          }
          store.origins[k] = store.origins[k].concat(obj[k]);
        }
      });
    },
    condProp: function (key, getter, kind) {
      // 逻辑扩展住在 src/engine/ext/，不在 content/（requirements §4）
      BH.condition.defineProp(key, getter, kind);
    },
  };

  BH.define = define;
  BH.registry = {
    _store: function () { return store; },
    _reset: reset,
    isSealed: function () { return sealed; },
    _markSealed: function () { sealed = true; },
    all: function (kind) { return store[kind]; },
    list: function (kind) {
      var o = store[kind];
      return Object.keys(o).sort().map(function (k) { return o[k]; });
    },
    has: function (kind, id) { return !!store[kind][id]; },
    /** 找不到就抛错，绝不返回 undefined（design.md §6.1） */
    get: function (kind, id) {
      var v = store[kind][id];
      if (!v) {
        contentFail('引用了不存在的 ' + kind + '：' + id, { kind: kind, id: id });
      }
      return v;
    },
    origins: function () { return store.origins; },
    titles: function () { return store.titles; },
    reviews: function () { return store.reviews; },
    lexicon: function () { return store.lexicon; },
    tags: function () { return store.tags; },
    tropes: function () { return store.tropes; },
  };
  BH._assertPlainData = assertPlainData;
})(typeof globalThis !== 'undefined' ? globalThis : this);
