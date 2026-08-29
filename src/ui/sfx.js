// WebAudio 合成音效（零素材），默认关闭
window.BH = window.BH || {};
BH.SFX = (function () {
  let ctx = null, on = false;
  function ac() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return ctx; }
  function tone(f0, f1, dur, type, vol) {
    if (!on) return; const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f0, c.currentTime);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, c.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.08, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur);
  }
  return {
    set: function (v) { on = v; if (on) { const c = ac(); if (c && c.state === 'suspended') c.resume(); } },
    get: function () { return on; },
    flip: function () { tone(520, 300, 0.07, 'triangle', 0.05); },
    rare: function () { tone(700, 1050, 0.16, 'sine', 0.09); },
    epic: function () { tone(500, 1300, 0.3, 'sine', 0.1); },
    golden: function () { tone(600, 1800, 0.45, 'sine', 0.12); },
    warn: function () { tone(220, 160, 0.2, 'square', 0.06); },
    drum: function () { tone(140, 60, 0.18, 'sine', 0.16); },
    win: function () { tone(523, 1046, 0.5, 'triangle', 0.12); },
    lose: function () { tone(300, 120, 0.5, 'sawtooth', 0.08); },
  };
})();
