/* badhand — 存档（UI 层职责，引擎不碰 localStorage）
 * 正典：docs/modules/06-meta.md §5、docs/modules/14-content-api.md §6.2
 *
 * 原则：运行时环境缺失要静（design.md §7）。
 * 存档坏了静默重置并留备份键，不弹对话框。
 */
(function (g) {
  'use strict';
  var BH = (g.BH = g.BH || {});
  var KEY = 'badhand.save.v1';
  var BAK = 'badhand.save.backup';
  var DEV_KEY = 'badhand.save.dev';

  var memory = null; // localStorage 不可用时的内存态

  function blank() {
    return {
      v: 1, material: 0,
      unlocked: { cast: [], talent: [], npc: [], track: [], family: [], personality: [] },
      found: { track: [], ending: [], event: [], line: [], plan: [] },
      stats: { runs: 0, best: 0, cancelled: 0, recentSeeds: [] },
      seen: { scoreGuide: false },
    };
  }

  function available() {
    try {
      var k = '__bh_probe__';
      g.localStorage.setItem(k, '1');
      g.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  var HAS_LS = available();

  function keyFor(dev) { return dev ? DEV_KEY : KEY; }

  function load(dev) {
    if (!HAS_LS) return memory || (memory = blank());
    var raw = null;
    try { raw = g.localStorage.getItem(keyFor(dev)); } catch (e) { raw = null; }
    if (!raw) return blank();
    var data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      // 静默重置，原值存入备份键
      try { g.localStorage.setItem(BAK, raw); } catch (e2) {}
      return blank();
    }
    return migrate(data);
  }

  /**
   * 前向兼容：存档里引用的、当前注册表中已不存在的 id 一律静默丢弃。
   * 绝不因为内容更新就清空玩家进度（14-content-api.md §6.2）。
   */
  function migrate(data) {
    var base = blank();
    if (!data || typeof data !== 'object') return base;
    base.material = Number(data.material) || 0;
    if (data.stats) {
      base.stats.runs = Number(data.stats.runs) || 0;
      base.stats.best = Number(data.stats.best) || 0;
      base.stats.cancelled = Number(data.stats.cancelled) || 0;
      var seeds = Array.isArray(data.stats.recentSeeds) ? data.stats.recentSeeds : [];
      seeds.forEach(function (raw) {
        var seed = BH.Rng && BH.Rng.normalizeSeed
          ? BH.Rng.normalizeSeed(raw) : String(raw || '').trim().toUpperCase();
        if (!seed || base.stats.recentSeeds.indexOf(seed) !== -1) return;
        if (base.stats.recentSeeds.length < 12) base.stats.recentSeeds.push(seed);
      });
    }
    if (data.seen) {
      base.seen.scoreGuide = data.seen.scoreGuide === true;
    }

    var R = BH.registry;
    var dropped = 0;
    var KIND = {
      cast: 'cast', talent: 'talents', npc: 'npcs', track: 'tracks',
      event: 'events', line: 'eventlines', plan: 'plans',
    };

    function keep(list, kind) {
      if (!Array.isArray(list)) return [];
      return list.filter(function (id) {
        if (!kind) return true;
        var ok = R.has(kind, id);
        if (!ok) dropped++;
        return ok;
      });
    }

    if (data.unlocked) {
      Object.keys(base.unlocked).forEach(function (k) {
        base.unlocked[k] = keep(data.unlocked[k], KIND[k] || null);
      });
    }
    if (data.found) {
      base.found.track = keep(data.found.track, 'tracks');
      base.found.ending = keep(data.found.ending, 'endings');
      base.found.event = keep(data.found.event, 'events');
      base.found.line = keep(data.found.line, 'eventlines');
      base.found.plan = keep(data.found.plan, 'plans');
    }
    if (dropped && g.console) {
      g.console.info('[badhand] 存档里有 ' + dropped + ' 个已失效的 id，已忽略。');
    }
    return base;
  }

  function save(data, dev) {
    if (!HAS_LS) { memory = data; return; }
    try {
      g.localStorage.setItem(keyFor(dev), JSON.stringify(data));
    } catch (e) {
      memory = data;
    }
  }

  BH.save = {
    load: load, save: save, blank: blank, migrate: migrate,
    hasStorage: function () { return HAS_LS; },
    KEY: KEY, BAK: BAK, DEV_KEY: DEV_KEY,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
