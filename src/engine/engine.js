// 《杀青》引擎 — 无 DOM 依赖，可在 Node 中直接运行（test/simulate.mjs）
// 内容由 content/*.js 挂到 window.BH.* 上，引擎惰性读取。
window.BH = window.BH || {};
(function (E) {
  const BOSS_AGES = [18, 22, 28, 35, 66];
  const DECADE_AGES = [10, 20, 30, 40, 50, 60];
  const TRAIT_AGES = [6, 14, 24, 32, 45, 58];
  const DIM_KEYS = ['CHR', 'INT', 'STR', 'MNY', 'JOY'];
  // 五幕节奏表（21-rhythm.md §1）
  const PACE = [
    { id: 'prologue', max: 12, compressAfter: 3, golden: 0.5 },
    { id: 'act1', max: 18, compressAfter: 4, golden: 0.8 },
    { id: 'act2', max: 35, compressAfter: 3, golden: 1.2 },
    { id: 'act3', max: 60, compressAfter: 3, golden: 1.0 },
    { id: 'finale', max: 999, compressAfter: 2, golden: 1.0 },
  ];
  function chapterOf(age) { return age <= 12 ? PACE[0] : age <= 18 ? PACE[1] : age <= 35 ? PACE[2] : age <= 60 ? PACE[3] : PACE[4]; }
  E.chapterOf = chapterOf;

  // ---------- 随机 ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  E.hashSeed = function (str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  // ---------- 新局 ----------
  E.newRun = function (seed, meta) {
    meta = meta || {};
    const s = typeof seed === 'string' ? E.hashSeed(seed) : (seed >>> 0);
    const R = mulberry32(s);
    const S = {
      seed: s, R,
      age: -1, phase: 'draft', // draft -> life -> end
      dims: { CHR: 3, INT: 3, STR: 3, MNY: 3, JOY: 3 },
      sex: null, talents: [], traits: [],
      flags: [], tags: {}, tracks: {},
      wlog: [], lines: [], // {age,text,grade,br}
      seen: {}, plainStreak: 0, queue: [], titles: [], moments: 0,
      stats: { gradeSum: 0, legend: 0, rare: 0, epic: 0, branches: 0, crises: 0, golden: 0 },
      decade: {}, bossDone: {}, traitDone: {},
      crisisCd: {}, debtSince: -1, emoStrikes: 0,
      bias: { tag: {}, track: {} },
      lif: 0, deathCause: null,
      inherit: meta.inherit || null,      // 继承天赋 id
      rigTalent: meta.rigTalent || null,  // 定向池：必出某天赋
      bonusPoints: meta.bonusPoints || 0, // 轮回购买：开局+5点
      extraDraw: meta.extraDraw || 0,     // 轮回购买：抽卡+1
    };
    return S;
  };

  // ---------- 开局：天赋池 ----------
  E.draftPool = function (S) {
    const T = BH.TALENTS.filter(t => t.id !== (S.inherit || ''));
    const pool = [];
    const rig = S.rigTalent ? T.find(t => t.id === S.rigTalent) : null;
    if (rig) { pool.push(rig); }
    const n = 10 + (S.extraDraw || 0);
    const used = new Set(pool.map(t => t.id));
    let guard = 0;
    while (pool.length < n && guard++ < 500) {
      const t = T[(S.R() * T.length) | 0];
      if (!used.has(t.id)) { used.add(t.id); pool.push(t); }
    }
    // 稀有度保底：至少 1 个 grade>=2（无 rig 时）
    if (!pool.some(t => t.g >= 2)) {
      const epics = T.filter(t => t.g >= 2 && !used.has(t.id));
      if (epics.length) pool[0] = epics[(S.R() * epics.length) | 0];
    }
    return pool;
  };
  E.pickTalents = function (S, ids) {
    S.talents = ids.slice();
    if (S.inherit) S.talents.push(S.inherit);
    for (const id of S.talents) {
      const t = BH.TALENTS.find(x => x.id === id);
      if (!t) continue;
      applyEff(S, t.e || {});
      (t.tags || []).forEach(g => addTag(S, g));
      if (t.flag) addFlag(S, t.flag);
    }
    return S;
  };
  E.applyPoints = function (S, dims) {
    for (const k of DIM_KEYS) S.dims[k] = clamp(S.dims[k] + (dims[k] || 0), -5, 20);
    // 自然寿命
    S.lif = Math.round(clamp(58 + S.dims.STR * 1.5 + S.R() * 25, 42, 108));
    S.phase = 'life';
    S.age = 0;
    return S;
  };
  E.setSex = function (S, sex) { S.sex = sex; return S; };

  // ---------- 工具 ----------
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function addTag(S, t) { S.tags[t] = (S.tags[t] || 0) + 1; }
  function addFlag(S, f) { if (!S.flags.includes(f)) S.flags.push(f); }
  function applyEff(S, e) {
    for (const k of DIM_KEYS) if (e[k]) S.dims[k] = clamp(S.dims[k] + e[k], -5, 20);
    if (e.LIF) S.lif = clamp(S.lif + e.LIF, 20, 500);
  }
  function w(S) { return S.R(); }
  function pick(arr, R) { return arr[(R() * arr.length) | 0]; }

  // ---------- 事件池过滤 ----------
  function eventOk(S, ev) {
    if (S.seen[ev.id]) return false;
    if (S.age < ev.a[0] || S.age > ev.a[1]) return false;
    const inc = ev.inc || {}, exc = ev.exc || {};
    if (inc.f && !inc.f.every(f => S.flags.includes(f))) return false;
    if (inc.tg && !inc.tg.every(t => S.tags[t])) return false;
    if (inc.tr && !inc.tr.every(t => S.tracks[t])) return false;
    if (inc.trd && !inc.trd.every(p => { const [id, min] = p; return (S.tracks[id] || 0) >= min; })) return false;
    if (inc.dim && !Object.keys(inc.dim).every(k => S.dims[k] >= inc.dim[k])) return false;
    if (inc.dimMax && !Object.keys(inc.dimMax).every(k => S.dims[k] <= inc.dimMax[k])) return false;
    if (inc.sex && S.sex && !inc.sex.includes(S.sex)) return false;
    if (inc.talent && !inc.talent.every(t => S.talents.includes(t))) return false;
    if (exc.f && exc.f.some(f => S.flags.includes(f))) return false;
    if (exc.tg && exc.tg.some(t => S.tags[t])) return false;
    if (exc.tr && exc.tr.some(t => S.tracks[t])) return false;
    return true;
  }
  function evWeight(S, ev) {
    let x = (ev.w || 1);
    const g = ev.g || 0;
    // 剧本节拍（story/inc.f）豁免稀有度税并高动量续演（20-arcs.md §1）
    const isBeat = !!(ev.inc && ev.inc.f && ev.inc.f.length);
    if (ev.br && S.age - (S.lastSoftAsk === undefined ? -9 : S.lastSoftAsk) < 2) x *= 0.15;
    if (ev.story) x *= 30;
    else if (isBeat) x *= 12;
    else { if (g === 1) x *= 0.35; if (g === 2) x *= 0.12; if (g === 3) x *= 0.03; }
    for (const tg of (ev.tags || [])) if (S.bias.tag[tg]) x *= S.bias.tag[tg];
    if (ev.tr) { const id = ev.tr.id || ev.tr; x *= (S.bias.track[id] || 1) * (1.5 + (S.tracks[id] || 0) * 0.9); }
    // 反转槽补偿：本十年稀有出勤不足则加权
    if (g >= 1 && (S.age % 10) >= 5 && S.stats.tenRareMiss >= 5) x *= 3;
    return x;
  }
  function drawEvent(S, cands) {
    let total = 0; const ws = [];
    for (const ev of cands) { const x = Math.max(0.0001, evWeight(S, ev)); ws.push(x); total += x; }
    let r = S.R() * total;
    for (let i = 0; i < cands.length; i++) { r -= ws[i]; if (r <= 0) return cands[i]; }
    return cands[cands.length - 1];
  }

  function runEvent(S, ev) {
    S.seen[ev.id] = 1;
    applyEff(S, ev.e || {});
    (ev.tags || []).forEach(t => addTag(S, t));
    if (ev.flag) { addFlag(S, ev.flag); syncQueue(S); }
    if (ev.tr) {
      const id = ev.tr.id || ev.tr, d = ev.tr.d || 1;
      S.tracks[id] = Math.max(S.tracks[id] || 0, d);
    }
    const g = ev.g || 0;
    S.stats.gradeSum += g + 1;
    if (g === 1) S.stats.rare++; if (g === 2) S.stats.epic++; if (g === 3) S.stats.legend++;
    if (g >= 1) S.stats.tenRareMiss = 0;
    S.plainStreak = g === 0 ? (S.plainStreak || 0) + 1 : 0;
    const line = { age: S.age, text: ev.t, grade: g, br: !!ev.br, tags: ev.tags || [], danmaku: true };
    if (ev.inc && ev.inc.f && ev.inc.f.length) line.arc = true;
    if (ev.tr) line.trackId = ev.tr.id || ev.tr;
    S.lines.push(line);
    let ask = null;
    if (ev.br) {
      S.stats.branches++;
      ask = { kind: 'branch', eventId: ev.id, text: ev.t, opts: ev.br.map((o, i) => ({ id: String(i), t: o.t })) };
    }
    if (ev.death) {
      S.deathCause = ev.death;
      S.phase = 'end';
    }
    return { line, ask };
  }

  // ---------- 危机 ----------
  function crisisCandidates(S) {
    const list = (BH.CRISES || []).filter(c => {
      if (S.age < (c.a ? c.a[0] : 0) || S.age > (c.a ? c.a[1] : 999)) return false;
      if (S.age - (S.lastCrisisYear === undefined ? -9 : S.lastCrisisYear) < 3) return false;
    let trig = c.trig || {};
    if (c.domain === 'health' && S.traits.includes('pao') && trig.STR) trig = Object.assign({}, trig, { STR: [trig.STR[0] - 1, '<'] });
    const cd = S.crisisCd[c.id] || -99;
      if (S.age - cd < (c.cd || 8)) return false;
      const inc = c.inc || {};
      if (inc.f && !inc.f.every(f => S.flags.includes(f))) return false;
      if (excOk(S, c)) return false;
      for (const k of Object.keys(trig)) {
        const v = S.dims[k], need = trig[k];
        if (need[1] === '<' ? !(v <= need[0]) : !(v >= need[0])) return false;
      }
      if (c.once && S.seen['C:' + c.id]) return false;
      return true;
    });
    const pri = { health: 0, debt: 1, emo: 2, opp: 3 };
    list.sort((a, b) => (pri[a.domain] ?? 9) - (pri[b.domain] ?? 9));
    return list;
  }
  function excOk(S, c) {
    const exc = c.exc || {};
    if (exc.f && exc.f.some(f => S.flags.includes(f))) return true;
    if (exc.tg && exc.tg.some(t => S.tags[t])) return true;
    return false;
  }

  function askCrisis(S, c) {
    S.crisisCd[c.id] = S.age;
    S.lastCrisisYear = S.age;
    S.seen['C:' + c.id] = 1;
    S.stats.crises++;
    if (c.domain === 'debt' && S.debtSince < 0) S.debtSince = S.age;
    if (c.domain === 'emo') S.emoStrikes++;
    const line = { age: S.age, text: c.t, grade: -1, crisis: c.domain, tags: [] };
    S.lines.push(line);
    return { line, ask: { kind: 'crisis', domain: c.domain, crisisId: c.id, opts: c.opts.map(o => ({ id: o.id, t: o.t, sub: o.sub || '' })) } };
  }

  E.choose = function (S, kind, id, payload) {
    payload = payload || {};
    if (kind === 'branch') {
      const ev = (BH.EVENTS || []).find(x => x.id === payload.eventId);
      if (ev && ev.br) {
        const o = ev.br[+id] || ev.br[0];
        applyEff(S, o.e || {});
        (o.tg || []).forEach(t => addTag(S, t));
        if (o.f) addFlag(S, o.f);
        if (o.tr) S.tracks[o.tr.id] = Math.max(S.tracks[o.tr.id] || 0, o.tr.d || 1);
        const line = { age: S.age, text: '→ ' + (o.rt || o.t), grade: 1, tags: o.tg || [], danmaku: true, ans: true };
        S.lines.push(line);
        syncQueue(S);
      }
      return { line: S.lines[S.lines.length - 1] };
    }
    if (kind === 'crisis') {
      const c = (BH.CRISES || []).find(x => x.id === payload.crisisId);
      const o = c && c.opts.find(x => x.id === id);
      if (o) {
        const soft = (c.domain === 'emo' && S.traits.includes('jingshen')) || S.traits.includes('foxi2');
        let eff = o.e || {};
        if (soft) { eff = {}; for (const k in (o.e || {})) eff[k] = o.e[k] < 0 ? Math.ceil(o.e[k] / 2) : o.e[k]; }
        applyEff(S, eff);
        (o.tg || []).forEach(t => addTag(S, t));
        if (o.f) addFlag(S, o.f);
        if (o.clear) { if (o.clear === 'debt') S.debtSince = -1; if (o.clear === 'emo') S.emoStrikes = 0; }
        const line = { age: S.age, text: '→ ' + (o.rt || o.t), grade: 0, tags: o.tg || [], danmaku: o.dm !== false, ans: true };
        S.lines.push(line);
        syncQueue(S);
      }
      return { line: S.lines[S.lines.length - 1] };
    }
    if (kind === 'decade') {
      const d = (BH.DECADES || []).find(x => x.age === payload.age);
      const o = d && d.opts.find(x => x.id === id);
      if (o) {
        S.decade[payload.age] = o.id;
        (o.tg || []).forEach(t => { addTag(S, t); S.bias.tag[t] = (S.bias.tag[t] || 1) * 1.6 + 0.4; });
        if (o.f) addFlag(S, o.f);
        if (o.trackBias) for (const k in o.trackBias) S.bias.track[k] = (S.bias.track[k] || 1) * o.trackBias[k];
        if (o.tr) S.tracks[o.tr.id] = Math.max(S.tracks[o.tr.id] || 0, o.tr.d || 1);
        const line = { age: S.age, text: '→ ' + o.rt, grade: 1, decade: true, tags: o.tg || [], danmaku: true };
        S.lines.push(line);
        if (payload.age === 20 && !S.seen['ob0']) S.queue.push('ob0');
        S.lines.push({ age: S.age, text: '📋 十年小结：颜' + S.dims.CHR + ' 智' + S.dims.INT + ' 体' + S.dims.STR + ' 钱' + S.dims.MNY + ' 乐' + S.dims.JOY + ' · 称号 ' + S.titles.length + ' 个', grade: 0, summary: true, tags: [], danmaku: false });
        syncQueue(S);
      }
      return { line: S.lines[S.lines.length - 1] };
    }
    if (kind === 'trait') {
      const t = (BH.TRAITS || []).find(x => x.id === id);
      if (t && !S.traits.includes(t.id)) {
        S.traits.push(t.id);
        applyEff(S, t.e || {});
        (t.tg || []).forEach(x => addTag(S, x));
        const syn = (t.syn && t.syn.with || []).find(w2 => S.traits.includes(w2));
        let text = (t.emoji || '✦') + ' ' + t.name + '｜' + t.d;
        if (syn) text += '（与' + (BH.TRAITS.find(x => x.id === syn) || { name: '' }).name + '联动：' + t.syn.text + '）';
        const line = { age: S.age, text: '✦ ' + text, grade: 1, trait: true, tags: [], danmaku: true };
        S.lines.push(line);
      }
      return { line: S.lines[S.lines.length - 1] };
    }
    if (kind === 'golden') {
      const te = (BH.TRACKS || []).find(x => x.id === payload.trackId);
      if (te && id === 'join') {
        S.tracks[te.id] = 1;
        addTag(S, te.circle || te.id);
        S.bias.track[te.id] = (S.bias.track[te.id] || 1) * 3.0;
        const line = { age: S.age, text: '→ ' + (te.joinText || '你记住了这种感觉。'), grade: 2, tags: [te.id], danmaku: true };
        S.lines.push(line);
        S.stats.golden++;
        return { line };
      }
      const line = { age: S.age, text: '→ ' + (te ? te.passText : '你转身走了。'), grade: 0, tags: [], danmaku: true };
      S.lines.push(line);
      return { line };
    }
    if (kind === 'boss') {
      return resolveBoss(S, id, payload);
    }
    return {};
  };

  function resolveBoss(S, band, payload) {
    const B = (BH.BOSSES || []).find(x => x.age === payload.age);
    if (!B) return {};
    S.bossDone[payload.age] = band;
    const opt = B.opts.find(o => o.id === band) || B.opts[0];
    applyEff(S, opt.e || {});
    if (opt.f) { addFlag(S, opt.f); syncQueue(S); }
    (opt.tg || []).forEach(t => addTag(S, t));
    const line = { age: S.age, text: '★ ' + opt.rt, grade: 2, boss: B.id, tags: opt.tg || [], danmaku: true, ans: true };
    S.lines.push(line);
    S.stats.gradeSum += 2;
    return { line };
  }
  E.bossScore = function (S, age, clicks) {
    const B = (BH.BOSSES || []).find(x => x.age === age);
    if (!B) return 0;
    let sc = clicks ? clicks * (B.clickK || 0.4) : 0;
    for (const k in (B.base || {})) sc += (S.dims[k] || 0) * B.base[k];
    for (const t of S.talents) {
      const tb = B.talBonus && B.talBonus[t];
      if (tb) sc += tb.add || 0, sc *= (tb.mul || 1);
    }
    for (const t of S.traits) {
      const tb = B.traitBonus && B.traitBonus[t];
      if (tb) sc += tb.add || 0;
    }
    for (const k in (S.tracks || {})) { const tb = B.trackBonus && B.trackBonus[k]; if (tb) sc += (S.tracks[k] || 0) * tb; }
    return Math.round(sc * 10) / 10;
  };
  E.bossBand = function (S, age, score) {
    const B = (BH.BOSSES || []).find(x => x.age === age);
    let band = B.opts[B.opts.length - 1].id;
    for (const o of B.opts) { if (score >= (o.min ?? -999)) { band = o.id; break; } }
    return band;
  };

  // ---------- 称号：局内里程碑收集（21-rhythm.md §2）----------
  function nextTitle(S) {
    for (const t of (BH.TITLES || [])) {
      if (S.titles.includes(t.id)) continue;
      try { if (t.test(S)) { S.titles.push(t.id); return { age: S.age, text: '🏅 获得称号：【' + t.name + '】', grade: 1, title: true, tags: [], danmaku: true }; } } catch (e) {}
    }
    return null;
  }

  // ---------- 剧本队列：旗标→订阅事件，节拍强制续演（20-arcs.md §1）----------
  let _flagSubs = null;
  function flagSubs() {
    if (_flagSubs) return _flagSubs;
    _flagSubs = {};
    for (const ev of (BH.EVENTS || [])) {
      for (const f of ((ev.inc && ev.inc.f) || [])) (_flagSubs[f] = _flagSubs[f] || []).push(ev);
    }
    return _flagSubs;
  }
  function syncQueue(S) {
    const subs = flagSubs();
    let added = false;
    for (const f of S.flags) {
      for (const ev of (subs[f] || [])) {
        if (S.queue.includes(ev.id) || S.seen[ev.id]) continue;
        // 只入队"当前或近两年窗口内"的节拍；远期节拍走普通抽卡
        if (ev.a[0] <= S.age + 4 && ev.a[1] >= S.age - 1 && eventOk(S, ev)) {
          S.queue.push(ev.id); added = true;
          if (S.queue.length >= 4) return added;
        }
      }
    }
    return added;
  }

  // ---------- 主循环：过一年 ----------
  E.tick = function (S) {
    const r = _tick(S);
    if (S.pendingLine && r) { r.extra = [].concat(r.extra || [], S.pendingLine); S.pendingLine = null; }
    if (r && r.ask && ['crisis', 'trait', 'branch', 'golden'].includes(r.ask.kind)) S.lastSoftAsk = S.age;
    return r;
  };

  function _tick(S) {
    if (S.phase !== 'life') return null;

    // 瞬间事件：日常小事不消耗年份（21-rhythm.md §4——一次点击≠一年）
    if ((S.moments || 0) < 2 && S.age >= 4) {
      const mp = (BH.EVENTS || []).filter(ev => ev.g === 0 && !ev.br && !ev.tr && !ev.flag && !(ev.inc && (ev.inc.f || ev.inc.tg || ev.inc.tr)) && eventOk(S, ev));
      if (mp.length && S.R() < 0.55) {
        S.moments = (S.moments || 0) + 1;
        const ev = drawEvent(S, mp);
        const r = emit(S, runEvent(S, ev));
        S.stats.gradeSum -= 1; // 瞬间不计入基础盘
        S.plainStreak = Math.max(0, (S.plainStreak || 0) - 1); // 瞬间也不计入平淡连击
        if (r.line) r.line.moment = true;
        syncQueue(S);
        return r;
      }
    }

    S.age++;
    S.moments = 0;
    for (const tid of S.talents) {
      const tl = BH.TALENTS.find(x => x.id === tid);
      if (tl && tl.late && S.age >= tl.late.age && !S.seen['LT:' + tid]) { S.seen['LT:' + tid] = 1; applyEff(S, tl.late.e || {}); }
    }
    if (S.age >= S.lif) return dieNatural(S);

    // 幕转场卡片（21-rhythm.md：节奏刻度）
    const CH_TITLE = { 13: '—— 第一幕 · 少年 ——', 19: '—— 第二幕 · 青年 ——', 36: '—— 第三幕 · 中年 ——', 61: '—— 终幕 · 老年 ——' };
    if (CH_TITLE[S.age] && !S.seen['CH:' + S.age]) {
      S.seen['CH:' + S.age] = 1;
      const chLine = { age: S.age, text: CH_TITLE[S.age], grade: -1, chapter: true, tags: [], danmaku: false };
      S.lines.push(chLine);
      S.wlog.push(wsum(S));
      S.pendingLine = chLine;
    }

    // 死亡链：体质归零
    if (S.dims.STR <= 0) {
      const d = pick((BH.DEATHS || []).filter(x => x.irony === 'frail'), S.R) || { t: '你的身体先于梦想停机了。', death: { cause: '积劳成疾', icon: '🪦', irony: 'frail' } };
      return finishDeath(S, d);
    }
    // 意外死亡
    let pAcc = 0.008 + (S.debtSince >= 0 && S.age - S.debtSince > 6 ? 0.008 : 0)
      + (S.flags.includes('ignore_health') ? 0.006 : 0) + (S.age > 72 ? 0.016 : 0) + (S.age > 85 ? 0.035 : 0);
    if (S.talents.includes('tieding')) pAcc *= 0.6;
    if (S.R() < pAcc) {
      const pool = (BH.DEATHS || []).filter(x => !x.ok || x.ok(S) !== false);
      const irony = pool.filter(x => (x.ironyTags || []).some(t => S.tags[t]));
      const d = (irony.length && S.R() < 0.45) ? pick(irony, S.R) : pick(pool, S.R);
      return finishDeath(S, d);
    }

    // 1. 大劫
    if (BOSS_AGES.includes(S.age) && !S.bossDone[S.age]) {
      const B = (BH.BOSSES || []).find(x => x.age === S.age);
      if (B) {
        const line = { age: S.age, text: B.t, grade: -2, boss: B.id, tags: [] };
        S.lines.push(line);
        return { line, ask: { kind: 'boss', bossId: B.id, age: B.age, type: B.type, title: B.name, desc: B.desc || '', opts: B.type === 'show' ? [{ id: 'resolve', t: '开始结算' }] : [{ id: 'qte', t: '开始答题' }] } };
      }
    }
    // 2. 路牌
    if (DECADE_AGES.includes(S.age) && !S.decade[S.age]) {
      const d = (BH.DECADES || []).find(x => x.age === S.age);
      if (d) {
        let opts = d.opts.filter(o => !o.excTrack || !S.tracks[o.excTrack]);
        // 轨道承诺后追加专属路牌
        for (const tid in S.tracks) {
          const ex = (d.trackOpts || []).find(o => o.track === tid && (S.tracks[tid] >= (o.minDepth || 1)));
          if (ex) opts = opts.concat([ex]);
        }
        opts = opts.slice(0, 4);
        const line = { age: S.age, text: d.t, grade: -1, decade: true, tags: [] };
        S.lines.push(line);
        return { line, ask: { kind: 'decade', age: S.age, opts: opts.map(o => ({ id: o.id, t: o.name, sub: o.desc })) } };
      }
    }
    // 半生回望：51 岁的中场锚点（21-rhythm.md §3）
    if (S.age === 51 && !S.seen['HLF'] && S.lines.length > 14) {
      const hl = S.lines.filter(l => l.grade >= 2 && !l.death && !l.memory && l.age <= 45);
      if (hl.length >= 2) {
        S.seen['HLF'] = 1;
        const a1 = hl[(S.R() * hl.length) | 0];
        let b1 = hl[(S.R() * hl.length) | 0];
        let gd = 0; while (b1 === a1 && gd++ < 10) b1 = hl[(S.R() * hl.length) | 0];
        const ln = { age: S.age, text: '📋 半生回望：' + a1.age + ' 岁，"' + a1.text.replace('✨ ', '') + '"；' + b1.age + ' 岁，"' + b1.text.replace('✨ ', '') + '"。前半本翻完了，后半本才刚起笔。', grade: 1, memory: true, tags: [], danmaku: true };
        S.lines.push(ln);
        S.wlog.push(wsum(S));
        return { line: ln };
      }
    }

    // 回忆杀：多年前的高光在晚年回响（叙事连贯性）
    if (S.R() < 0.03 && S.lines.length > 10) {
      const memCands = S.lines.filter(l => l.grade >= 2 && !l.death && !l.memory && l.age <= S.age - 15);
      if (memCands.length) {
        const old = memCands[(S.R() * memCands.length) | 0];
        const tails = ['嘴角不自觉上扬。', '心里轻轻动了一下。', '你摇摇头笑了。', '那段日子突然清晰起来。', '你把这段记忆又擦亮了一遍。'];
        const memLine = { age: S.age, text: '你想起了 ' + old.age + ' 岁那年——"' + old.text.replace('✨ ', '') + '"。' + tails[(S.R() * tails.length) | 0], grade: 1, memory: true, tags: [], danmaku: false };
        S.lines.push(memLine);
        S.wlog.push(wsum(S));
        return { line: memLine };
      }
    }

    // 2.8 剧本队列强制续演（未到窗口的节拍留队等年龄）
    let qGuard = S.queue.length * 2 + 4;
    while (S.queue.length && qGuard-- > 0) {
      const qid = S.queue.shift();
      const ev = (BH.EVENTS || []).find(x => x.id === qid);
      if (!ev) continue;
      if (!eventOk(S, ev)) {
        if (!S.seen[ev.id] && ev.a[1] + 2 >= S.age) S.queue.push(qid);
        continue;
      }
      // 分支节流：软抉择之间至少隔 2 年（大劫/路牌是硬时刻不计数），不到点留队
      if (ev.br && S.age - (S.lastSoftAsk === undefined ? -9 : S.lastSoftAsk) < 2) { S.queue.push(ev.id); continue; }
      const r = emit(S, runEvent(S, ev));
      syncQueue(S);
      const extras = [];
      const cl = tryCompress(S);
      if (cl) extras.push(cl);
      const tl = nextTitle(S);
      if (tl) extras.push(tl);
      if (extras.length) r.extra = extras;
      return r;
    }
    // 3. 危机
    const cc = crisisCandidates(S);
    if (cc.length) {
      // emo 三振：含蓄收束（红线：出口常在，这是最终兜底且极罕见）
      const c = cc[0];
      if (c.domain === 'emo' && S.emoStrikes >= 3) {
        return finishDeath(S, { t: '那个冬天的清晨，你睡过了所有闹钟，也睡过了整个世界。', death: { cause: '长眠', icon: '🌙', irony: 'emo' }, gentle: true });
      }
      return askCrisis(S, c);
    }
    // 4. 特质
    if (TRAIT_AGES.includes(S.age) && !S.traitDone[S.age]) {
      const avail = (BH.TRAITS || []).filter(t => !S.traits.includes(t.id));
      if (avail.length >= 3) {
        S.traitDone[S.age] = 1;
        const picks = [];
        const used = new Set();
        let g2 = 0;
        while (picks.length < 3 && g2++ < 60) {
          const t = avail[(S.R() * avail.length) | 0];
          if (!used.has(t.id)) { used.add(t.id); picks.push(t); }
        }
        const line = { age: S.age, text: '✦ 你感觉自己又行了，三选一：', grade: -1, trait: true, tags: [] };
        S.lines.push(line);
        return { line, ask: { kind: 'trait', opts: picks.map(o => ({ id: o.id, t: o.name, sub: o.d })) } };
      }
    }
    // 5. 机缘（金闪）
    let gRate = 0.03 * chapterOf(S.age).golden;
    if (S.talents.includes('yeli')) gRate *= 1.6;
    if (S.talents.includes('tiangou')) gRate *= 1.8;
    if (S.traits.includes('ouhuang')) gRate *= 1.5;
    if (S.traits.includes('feiqiu')) gRate *= 0.7;
    if (S.R() < gRate) {
      // 先看轨道入口（符合条件的多条随机挑一条，避免电竞独吞入口）
      const tes = (BH.TRACKS || []).filter(t => !S.tracks[t.id] && S.age >= (t.entryAge || 0)
        && (!t.cond || t.cond(S)));
      const te = tes.length ? pick(tes, S.R) : null;
      if (te && S.R() < 0.6) {
        const line = { age: S.age, text: te.entryText, grade: 3, golden: true, tags: [te.id], danmaku: true };
        S.lines.push(line);
        S.stats.golden++;
        return { line, ask: { kind: 'golden', trackId: te.id, opts: [{ id: 'join', t: te.joinOpt }, { id: 'pass', t: te.passOpt }] } };
      }
      const golds = (BH.EVENTS || []).filter(ev => ev.g === 3 && eventOk(S, ev));
      if (golds.length) return emit(S, runEvent(S, drawEvent(S, golds)));
    }
    // 6. 普通抽卡
    const cands = (BH.EVENTS || []).filter(ev => !ev.g3only && eventOk(S, ev));
    if (cands.length) {
      const ev = drawEvent(S, cands);
      const r = emit(S, runEvent(S, ev));
      const extras = [];
      const cl = tryCompress(S);
      if (cl) extras.push(cl);
      const tl = nextTitle(S);
      if (tl) extras.push(tl);
      if (extras.length) r.extra = extras;
      return r;
    }
    // 7. 平年
    const band = S.age <= 3 ? 'baby' : S.age <= 12 ? 'child' : S.age <= 18 ? 'teen' : S.age <= 30 ? 'young' : S.age <= 50 ? 'mid' : S.age <= 68 ? 'late' : 'old';
    const fill = pick((BH.FILLERS && BH.FILLERS[band]) || ['这一年平淡如水。'], S.R);
    S.lines.push({ age: S.age, text: fill, grade: 0, tags: [], danmaku: false });
    S.plainStreak++;
    S.stats.tenRareMiss = (S.stats.tenRareMiss || 0) + 1;
    S.wlog.push(wsum(S));
    const cl2 = tryCompress(S);
    return { line: S.lines[S.lines.length - 1], extra: cl2 };
  };

  // 压缩：连续 3+ 平淡年（含 grade0 事件）→ 快进到检查点前
  function tryCompress(S) {
    if ((S.plainStreak || 0) < chapterOf(S.age).compressAfter) return null;
    const cps = [...DECADE_AGES, ...BOSS_AGES, ...TRAIT_AGES, S.lif - 1];
    for (const qid of S.queue) { const qe = (BH.EVENTS || []).find(x => x.id === qid); if (qe) cps.push(qe.a[1] + 1); }
    const cpFiltered = cps.filter(a => a > S.age);
    const next = cpFiltered.length ? Math.min(...cpFiltered) : S.lif;
    let jump = (S.age <= 18 ? 2 : 3) + ((S.R() * 3) | 0);
    jump = Math.min(jump, next - 1 - S.age);
    if (jump >= 2) {
      const y0 = S.age, y1 = S.age + jump;
      S.age = y1;
      for (let i = 0; i < jump; i++) S.wlog.push(wsum(S));
      const span = y1 - y0 > 1 ? y0 + ' 到 ' + y1 + ' 年' : y1 + ' 年';
      const cl = { age: y1, text: '▲ ' + span + '，岁月快进：' + pick((BH.FILLERS && BH.FILLERS.compress) || ['平淡得连弹幕都撤了。'], S.R), grade: 0, compress: true, tags: [], danmaku: true };
      S.lines.push(cl);
      S.plainStreak = 0;
      return cl;
    }
    return null;
  }

  function wsum(S) {
    return S.dims.CHR + S.dims.INT + S.dims.STR + S.dims.MNY * 1.5 + S.dims.JOY;
  }
  function emit(S, r) { S.wlog.push(wsum(S)); return r; }

  function dieNatural(S) {
    const fly = S.tracks.xiuxian >= 6;
    const lines = fly ? ['五百岁那年，你白日飞升，留下一个巨大的传说和一间空房。']
      : S.age >= 85 ? ['你在午睡里安然离开，摇椅还在轻轻晃。', '你走的那天阳光很好，窗台上的腊梅开了。', '你睡着后再没醒来，手边是没织完的毛衣和全家福。']
      : S.age <= 60 ? ['命运没有给你一个盛大的告别，你只是安静地睡过了头。', '你走得很突然，手机还停在没打完的半句话上。']
      : ['你在睡梦中安详离世，枕头边放着年轻时的电影票。', '那个傍晚你看完了一整集电视剧，然后永久地休息了。', '你在自家院子里看星星，看着看着就融进了星空。'];
    return finishDeath(S, {
      t: pick(lines, S.R),
      death: { cause: fly ? '白日飞升' : '寿终正寝', icon: fly ? '🕊️' : '🕊️', irony: null }
    });
  }
  function finishDeath(S, d) {
    S.deathCause = d.death || { cause: '意外', icon: '🪦' };
    S.gentleDeath = !!d.gentle;
    S.lines.push({ age: S.age, text: '✝ ' + d.t, grade: 3, death: true, tags: [], danmaku: !d.gentle });
    S.phase = 'end';
    S.wlog.push(wsum(S));
    return { line: S.lines[S.lines.length - 1], end: true };
  }

  // ---------- 结算 ----------
  E.settle = function (S) {
    const AMP = (() => {
      if (S.wlog.length < 2) return 1;
      let mx = -99, mn = 99;
      for (const x of S.wlog) { if (x > mx) mx = x; if (x < mn) mn = x; }
      return 1 + Math.max(0, mx - mn) / 12;
    })();
    const depths = Object.values(S.tracks);
    const maxDepth = depths.length ? Math.max(...depths) : 0;
    const DECADE_CONSIST = (() => {
      const ds = Object.values(S.decade);
      if (!ds.length) return 0;
      const cnt = {}; let mx = 0;
      ds.forEach(d => { cnt[d] = (cnt[d] || 0) + 1; mx = Math.max(mx, cnt[d]); });
      return mx / ds.length;
    })();
    const DEEP = 1 + maxDepth * 0.4 + DECADE_CONSIST * 0.3;
    const base = 2.5 + S.stats.gradeSum * 0.045;
    let box = Math.round(base * AMP * DEEP * (0.9 + S.R() * 0.25));
    box = Math.max(1, box);

    // 反讽：死法与 TAGS/天赋呼应
    let irony = 0, ironyWhy = '';
    const dc = S.deathCause || {};
    if (dc.irony === 'emo' && S.tags.emo) { irony = 2; ironyWhy = 'emo贯彻到底'; }
    if (dc.irony === 'frail' && S.talents.includes('yisui')) { irony = 2; ironyWhy = '【易碎体质】名不虚传'; }
    if (dc.irony === 'rich' && S.tags.rich) { irony = 2; ironyWhy = '富过的痕迹到处都是'; }
    if (dc.cause === '白日飞升') { irony = 2.5; ironyWhy = '修成真人'; }
    if (S.deathCause && S.deathCause.cause === '长眠') { irony = 1.2; ironyWhy = 'emo线收束'; }
    S.ironyWhy = ironyWhy;

    // 执念判定（21-rhythm.md §2）
    var obLine = '';
    var obScore = 0;
    var obFlag = S.flags.find(f => f.startsWith('obsession_') && f !== 'obsession_letgo');
    if (obFlag) {
      const key = obFlag.slice(10);
      const OB_NAMES = { love: '被爱着过', chaos: '活得尽兴', fame: '留下痕迹', rich: '富过' };
      if (S.flags.includes('obsession_letgo')) { obLine = '执念：放下亦是圆满'; obScore = 0.3; }
      else if ((S.tags[key] || 0) >= 3) { obLine = '执念得偿（' + OB_NAMES[key] + '）'; obScore = 0.6; }
      else { obLine = '执念未了（' + OB_NAMES[key] + '）'; }
    }

    let score = 4.0 + Math.min(S.stats.legend, 3) * 0.55 + S.stats.rare * 0.04 + S.stats.branches * 0.05 + maxDepth * 0.2 + irony;
    score += obScore + Math.min(S.titles.length, 5) * 0.08;
    const totalLines = S.lines.length || 1;
    const plainRatio = S.lines.filter(l => l.grade === 0 && !l.compress).length / totalLines;
    if (plainRatio > 0.75) score -= 1.6;
    score = clamp(score, 2.0, 9.9);

    // 片名
    const title = E.makeTitle(S);

    // 经典台词
    const cand = S.lines.filter(l => l.grade >= 1 && !l.death && !l.boss && !l.memory);
    cand.sort((a, b) => (b.grade * 3 + (b.br ? 1 : 0)) - (a.grade * 3 + (a.br ? 1 : 0)));
    const quote = cand.length ? cand[(S.R() * Math.min(3, cand.length)) | 0].text : (S.lines[0] || {}).text || '无声之作。';

    // 轨道结局判定（供 meta 收集/杀青宴）
    const endings = [];
    for (const t of (BH.TRACKS || [])) {
      const d = S.tracks[t.id] || 0;
      if (d >= 3) {
        const good = t.endingGood && t.endingGood.cond(d);
        const bad = t.endingBad && t.endingBad.cond(d);
        if (good || bad) endings.push({ track: t.id, title: good ? t.endingGood.title : t.endingBad.title, good: !!good });
      }
    }

    return {
      box, score: Math.round(score * 10) / 10, amp: Math.round(AMP * 100) / 100, deep: Math.round(DEEP * 100) / 100,
      base: Math.round(base * 10) / 10,
      irony, ironyWhy, title, quote, obsession: obLine, titles: S.titles.slice(),
      type: title.type, tracks: S.tracks, maxDepth, endings,
      reinc: Math.max(1, Math.round(box / 10)) + (S.stats.legend ? S.stats.legend * 3 : 0),
    };
  };

  E.makeTitle = function (S) {
    const R = S.R;
    // 类型
    let type = '剧情';
    const tmap = [['dianjing', '热血'], ['xiuxian', '玄幻'], ['rich', '黑色幽默'], ['emo', '文艺'], ['guaitan', '恐怖'], ['fame', '偶像'], ['chaos', '荒诞'], ['broke', '现实主义'], ['shuochang', '热血'], ['ergci', '文艺'], ['mofa', '奇幻'], ['aicy', '科幻']];
    for (const [tg, ty] of tmap) if (S.tags[tg]) { type = ty; break; }
    const trackIds = Object.keys(S.tracks);
    const topTrack = trackIds.sort((a, b) => S.tracks[b] - S.tracks[a])[0];
    const death = (S.deathCause || {}).cause || '';
    const mains = {
      dianjing: ['37秒女帝', '凌晨四点的训练室', '补时绝杀', '青训废稿', '大龄新秀'],
      xiuxian: ['我在人间攒灵气', '筑基失败实录', '山下暂时', '飞升倒计时', '渡劫那天下雨'],
      fuhao: ['泼天富贵接住了', '拆迁户的第二个春天', '归零进行曲', '理财小天才', '豪宅与花呗'],
      hegang: ['全款拿下', '五万块的春天', '逃离进行时', '鹤岗的月光', '反向卷王'],
      ouxiang: ['出道即巅峰', '塌房倒计时', '练习生第800天', '顶流的空窗期', '打投少女'],
      guaitan: ['员工守则第七条', '凌晨的入住须知', '规则之外', '第13层', '别回头'],
      shuochang: ['地下八英里', '忘词三秒', 'punchline之王', '买它买它', '方言有节拍'],
      ergu: ['痛包漫步', '海景房与泡面', '吧唧收藏家', '以谷养谷', '无料之神'],
      mofa: ['旧书店的第三层', '霜花与鼻血', '守门人日记', '那扇没推开的门', '借阅证300年'],
      aicy: ['要聊聊吗', '赛博摆渡人', '最后一秒的截图', '数字孙子', '晚安，服务器'],
    };
    const generic = ['人生一场大梦', '平凡之路（指很平）', '岁月神偷（他偷的是我）', '大时代小人物', '春风又一吹', '人间烟火气', '无名之辈传', '热热闹闹一辈子'];
    let main;
    if (topTrack && S.tracks[topTrack] >= 2 && mains[topTrack]) main = pick(mains[topTrack], R);
    else main = pick(generic, R);
    const subs = {
      '寿终正寝': '一个普通人安详的落幕', '白日飞升': '他真的飞走了',
      '积劳成疾': '身体是革命的本钱，而他没本钱', '长眠': '睡着的 人 最诚实',
    };
    let sub = subs[death] || pick(['一部关于普通人的离谱电影', '本故事纯属巧合', '如有雷同，那就是你', '观众哭没哭不知道，反正 dice 哭了', '根据真实事件瞎编'], R);
    if (S.ironyWhy === '【易碎体质】名不虚传') sub = '易碎品，请轻拿轻放';
    return { type, main, sub, full: '《' + main + '》' };
  };
})(window.BH);
// 轨道事件注入（在全部内容加载后调用一次）
window.BH.injectTracks = function () {
  if (window.BH._tracksInjected) return;
  window.BH._tracksInjected = true;
  (window.BH.TRACKS || []).forEach(t => (window.BH.EVENTS = window.BH.EVENTS || []).push.apply(window.BH.EVENTS, t.events || []));
};
