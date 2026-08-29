/* badhand — 确定性随机
 * classic script，挂载到 globalThis.BH。不使用 ES module（BRIEF C8：file:// 双击即跑）
 */
(function (g) {
  'use strict';
  var BH = (g.BH = g.BH || {});

  var ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 去掉易混字符 0O1I

  function hashSeed(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  // mulberry32：小、快、确定性足够，且实现只有几行便于跨语言复现
  function Rng(seed) {
    if (!(this instanceof Rng)) return new Rng(seed);
    this.seedText = String(seed == null ? Rng.makeSeed() : seed).toUpperCase();
    this.state = hashSeed(this.seedText);
    this.calls = 0;
  }

  Rng.prototype.next = function () {
    this.calls++;
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    var t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /** [min, max] 闭区间整数 */
  Rng.prototype.int = function (min, max) {
    if (max < min) return min;
    return min + Math.floor(this.next() * (max - min + 1));
  };

  Rng.prototype.pick = function (arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(this.next() * arr.length)];
  };

  /** Fisher-Yates，返回新数组，不改原数组 */
  Rng.prototype.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(this.next() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  };

  /** 加权抽取。items: [{weight}]；weight 缺省为 1，非正数视为 0（不可被抽中） */
  Rng.prototype.weighted = function (items) {
    if (!items || items.length === 0) return null;
    var total = 0;
    var i;
    for (i = 0; i < items.length; i++) {
      var w = items[i].weight;
      total += w == null ? 1 : Math.max(0, w);
    }
    if (total <= 0) return null;
    var roll = this.next() * total;
    for (i = 0; i < items.length; i++) {
      var wi = items[i].weight;
      wi = wi == null ? 1 : Math.max(0, wi);
      roll -= wi;
      if (roll < 0) return items[i];
    }
    return items[items.length - 1];
  };

  /** 从数组里不重复取 n 个 */
  Rng.prototype.sample = function (arr, n) {
    return this.shuffle(arr).slice(0, n);
  };

  Rng.makeSeed = function (len) {
    len = len || 6;
    var out = '';
    // 只在"生成新种子"时用非确定性随机，之后全程走 Rng
    for (var i = 0; i < len; i++) {
      out += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
    }
    return out;
  };

  Rng.normalizeSeed = function (raw) {
    if (raw == null) return null;
    var s = String(raw).toUpperCase().replace(/[^0-9A-Z]/g, '');
    return s.length ? s.slice(0, 12) : null;
  };

  BH.Rng = Rng;
  BH.hashSeed = hashSeed;
})(typeof globalThis !== 'undefined' ? globalThis : this);
