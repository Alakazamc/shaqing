// 主控制器
(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const DIM_NAMES = { CHR: ['颜', '颜值'], INT: ['智', '智力'], STR: ['体', '体质'], MNY: ['钱', '家境'], JOY: ['乐', '快乐'] };

  // ---------- meta 存档 ----------
  const META_KEY = 'bh_save_v1';
  let meta = { reinc: 0, deaths: 0, works: [], dex: {}, endings: {}, ach: {}, best: 0, sound: 0, danmu: 1, inherit: null, rigEpic: 0, bonus: 0, extra: 0 };
  try { meta = Object.assign(meta, JSON.parse(localStorage.getItem(META_KEY) || '{}')); } catch (e) {}
  function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {} }
  function evalAch(S) {
    for (const a of (BH.ACH || [])) {
      if (!meta.ach[a.id]) { try { if (a.cond(meta, S || null)) meta.ach[a.id] = 1; } catch (e) {} }
    }
  }

  // ---------- 全局状态 ----------
  let S = null, pool = [], sel = [], deltas = null, pendingAsk = null, autoTimer = null, holdTimer = null, busy = false, challenge = false;

  function show(id) { $$('.screen').forEach(s => s.classList.add('hidden')); $(id).classList.remove('hidden'); }
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  // ---------- 片名页 ----------
  function renderTitle() {
    $('#reinc-num').textContent = meta.reinc;
    evalAch(null); saveMeta();
    $('#btn-feast').classList.toggle('hidden', Object.keys(meta.endings || {}).length < 5);
    const dl = BH.DIRECTOR.filter(d => meta.deaths >= d.n).pop();
    $('#director-line').textContent = meta.deaths ? (dl ? dl.t : '导演：又开工了？') : '';
    if (challenge) {
      $('#challenge-banner').classList.remove('hidden');
      $('#challenge-banner').textContent = challengeInfo
        ? `⚔️ 同题挑战：TA 用同一副牌拍出了 ${challengeInfo.t} · 票房 ${challengeInfo.b} 亿 · 评分 ${challengeInfo.s.toFixed(1)}。同一副牌，看你的了。`
        : '⚔️ 你收到了同题挑战：你们将拿到同一个剧组。看看谁能把这条命拍得更好。';
    }
    show('#screen-title');
  }
  $('#btn-start').onclick = () => {
    const seed = challenge ? challengeSeed : String(Date.now() % 1e9 + Math.floor(Math.random() * 1e6));
    startRun(seed);
  };
  $('#btn-dex').onclick = () => renderDex('dex');
  $('#btn-works').onclick = () => renderDex('works');
  $('#btn-sound').onclick = () => { meta.sound = meta.sound ? 0 : 1; saveMeta(); applySound(); };
  $('#btn-danmu').onclick = () => { meta.danmu = meta.danmu ? 0 : 1; saveMeta(); applyDanmu(); };
  function applySound() { BH.SFX.set(!!meta.sound); $('#btn-sound').textContent = (meta.sound ? '🔊 音效：开' : '🔇 音效：关'); }
  function applyDanmu() { $('#btn-danmu').textContent = '💬 弹幕：' + (meta.danmu ? '开' : '关'); }

  // 轮回小卖部
  $('#btn-shop').onclick = () => { $('#shop').classList.toggle('hidden'); renderShop(); };
  function renderShop() {
    const items = [
      { k: 'rigEpic', cost: 15, label: '🎁 下把必出史诗天赋', desc: '选角时 guaranteed 一张紫色以上' },
      { k: 'bonus', cost: 10, label: '⚡ 下把开局点数 +5', desc: '属性是命运的底盘' },
      { k: 'extra', cost: 20, label: '🎫 下把抽卡 +1 次', desc: '十一连，多一次梦' },
    ];
    $('#shop').innerHTML = '<div class="hint">轮回点数：' + meta.reinc + '。买的是"下把"，买了就生效。</div>' + items.map(it =>
      `<button class="mid-btn" data-k="${it.k}" data-c="${it.cost}" ${meta[it.k] || meta.reinc < it.cost ? 'disabled' : ''}>${it.label}<small style="display:block;color:#8a8a98;font-size:11px;margin-top:2px">${it.desc} · ${it.cost} 点</small></button>`
    ).join('');
    $$('#shop button').forEach(b => b.onclick = () => {
      const k = b.dataset.k, c = +b.dataset.c;
      if (meta.reinc < c || meta[k]) return;
      meta.reinc -= c; meta[k] = 1; saveMeta(); renderShop(); $('#reinc-num').textContent = meta.reinc;
    });
  }

  // ---------- 开局 ----------
  function startRun(seed) {
    S = BH.newRun(seed, { inherit: meta.inherit, bonusPoints: meta.bonus ? 5 : 0, extraDraw: meta.extra ? 1 : 0 });
    if (meta.rigEpic) {
      const epics = BH.TALENTS.filter(t => t.g >= 2);
      S.rigTalent = epics[Math.floor(Math.random() * epics.length)].id;
    }
    meta.rigEpic = 0; // 一次性
    saveMeta();
    pool = BH.draftPool(S);
    sel = [];
    renderDraft();
  }
  function renderDraft() {
    show('#screen-draft');
    const grid = $('#draft-grid');
    grid.innerHTML = pool.map((t, i) =>
      `<div class="tcard" data-i="${i}"><div class="back">🎴</div>
       <div class="face"><div class="em">${t.emoji}</div><div class="nm">${esc(t.name)}</div><div class="ds">${esc(t.desc)}</div></div></div>`).join('');
    $$('#draft-grid .tcard').forEach(card => card.onclick = () => {
      const i = +card.dataset.i;
      if (!card.classList.contains('open')) {
        card.classList.add('open', 'g' + pool[i].g); BH.SFX.flip();
        if (pool[i].g >= 2) BH.SFX.epic();
        return; // 翻开即可选
      }
      if (sel.includes(i)) { sel = sel.filter(x => x !== i); card.classList.remove('sel'); }
      else { if (sel.length >= 3) return; sel.push(i); card.classList.add('sel'); BH.SFX.rare(); }
      $('#btn-draft-ok').textContent = `确定阵容（${sel.length}/3）`;
      $('#btn-draft-ok').disabled = sel.length !== 3;
    });
    $('#btn-draft-ok').onclick = () => {
      if (sel.length !== 3) return;
      BH.pickTalents(S, sel.map(i => pool[i].id));
      deltas = { CHR: 0, INT: 0, STR: 0, MNY: 0, JOY: 0 };
      renderPoints();
    };
  }

  // ---------- 配点 ----------
  const PRESETS = [
    { name: '牛马模板', d: { CHR: 1, INT: 4, STR: 5, MNY: 6, JOY: 4 } },
    { name: '天才少年', d: { CHR: 2, INT: 7, STR: 3, MNY: 2, JOY: 3 } },
    { name: '躺平大师', d: { CHR: 3, INT: 3, STR: 4, MNY: 2, JOY: 8 } },
    { name: '赌狗必输', d: { CHR: 5, INT: 1, STR: 4, MNY: 8, JOY: 2 } },
    { name: '脆皮美人', d: { CHR: 7, INT: 3, STR: 1, MNY: 3, JOY: 6 } },
  ];
  function renderPoints() {
    show('#screen-points');
    const bonus = S.bonusPoints || 0;
    $('#preset-row').innerHTML = PRESETS.map((p, i) => `<button data-i="${i}">${p.name}</button>`).join('');
    $$('#preset-row button').forEach(b => b.onclick = () => { deltas = Object.assign({ CHR: 0, INT: 0, STR: 0, MNY: 0, JOY: 0 }, PRESETS[+b.dataset.i].d); drawPoints(bonus); });
    $('#dims-rows').innerHTML = Object.keys(DIM_NAMES).map(k =>
      `<div class="dim-row" data-k="${k}"><div class="nm">${DIM_NAMES[k][1]}<small>${{ CHR: '好看程度', INT: '脑子', STR: '命值', MNY: '家底', JOY: '精神状态' }[k]}</small></div>
       <button class="minus">−</button><div class="val">3</div><button class="plus">＋</button></div>`).join('');
    $$('#dims-rows .dim-row').forEach(row => {
      const k = row.dataset.k;
      row.querySelector('.plus').onclick = () => { if (usedPts() < 20 + bonus && deltas[k] < 7) { deltas[k]++; drawPoints(bonus); } };
      row.querySelector('.minus').onclick = () => { if (deltas[k] > 0) { deltas[k]--; drawPoints(bonus); } };
    });
    $$('.sex-btn').forEach(b => b.onclick = () => { $$('.sex-btn').forEach(x => x.classList.remove('on')); b.classList.add('on'); S.sex = b.dataset.sex === 'r' ? (Math.random() < 0.5 ? 'm' : 'f') : b.dataset.sex; });
    $('#btn-life-start').onclick = () => {
      if (S.sex === null) S.sex = Math.random() < 0.5 ? 'm' : 'f';
      BH.applyPoints(S, deltas);
      startLife();
    };
    drawPoints(bonus);
  }
  function usedPts() { return Object.values(deltas).reduce((a, b) => a + b, 0); }
  function drawPoints(bonus) {
    $('#pts-left').textContent = (20 + bonus) - usedPts();
    $$('#dims-rows .dim-row').forEach(row => {
      const k = row.dataset.k;
      row.querySelector('.val').textContent = 3 + deltas[k];
      row.querySelector('.val').style.color = 3 + deltas[k] >= 9 ? '#ffe19e' : 3 + deltas[k] <= 1 ? '#ff9d6e' : '#fff';
    });
  }

  // ---------- 拍摄中 ----------
  function startLife() {
    show('#screen-life');
    $('#stream').innerHTML = '';
    renderHUD();
    addLine({ age: 0, text: '🎥 开机。你的人生开拍了。', grade: -1, tags: [], danmaku: false });
  }
  function renderHUD() {
    $('#hud-age').textContent = S.age + ' 岁';
    $('#hud-dims').innerHTML = Object.keys(DIM_NAMES).map(k => {
      let cls = '';
      if ((k === 'STR' && S.dims.STR <= 2) || (k === 'JOY' && S.dims.JOY <= 1) || (k === 'MNY' && S.dims.MNY <= -2)) cls = 'warn';
      else if ((k === 'CHR' && S.dims.CHR >= 9) || (k === 'INT' && S.dims.INT >= 9) || (k === 'MNY' && S.dims.MNY >= 10)) cls = 'good';
      return `<span class="dim-pill ${cls}">${DIM_NAMES[k][0]} ${S.dims[k]}</span>`;
    }).join('');
  }
  function addLine(line) {
    const cls = line.death ? 'death' : line.grade === -1 ? 'gm1' : line.grade === -2 ? 'gm1' : 'g' + line.grade;
    const el = document.createElement('div');
    el.className = 'line ' + cls;
    const prefix = line.grade === 3 ? '✨ ' : '';
    if (line.grade >= 1) {
      // 期待先于信息：先出晕
      el.innerHTML = '<span style="opacity:.35">……</span>';
      $('#stream').appendChild(el);
      $('#stream-wrap').scrollTop = $('#stream-wrap').scrollHeight;
      const txt = prefix + esc(line.text);
      setTimeout(() => { el.textContent = txt; }, line.grade === 3 ? 500 : 300);
    } else {
      el.textContent = prefix + line.text;
      $('#stream').appendChild(el);
    }
    $('#stream-wrap').scrollTop = $('#stream-wrap').scrollHeight;
    if (line.grade === 1) BH.SFX.rare(); else if (line.grade === 2) BH.SFX.epic(); else if (line.grade === 3) BH.SFX.golden(); else if (line.crisis || line.boss) BH.SFX.warn();
    if (meta.danmu && line.danmaku) spawnDanmaku(line);
    return el;
  }
  function spawnDanmaku(line) {
    let poolName = 'generic';
    if (line.compress) poolName = 'compress';
    else if (line.death) poolName = 'death';
    else if (line.crisis) poolName = 'crisis';
    else if (line.decade) poolName = 'decade';
    else if (line.grade === 3) poolName = 'legend';
    else if (line.grade === 2) poolName = 'epic';
    else if (line.grade === 1) poolName = 'rare';
    if (line.tags) {
      for (const tg of ['emo', 'rich', 'dianjing', 'xiuxian', 'lie', 'fame', 'guaitan']) {
        if (line.tags.includes(tg) && line.grade >= 1) { poolName = tg; break; }
      }
    }
    const pool = BH.DANMAKU[poolName] || BH.DANMAKU.generic;
    const n = 1 + Math.floor(Math.random() * (line.grade >= 2 ? 3 : 2));
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const dm = document.createElement('span');
        dm.className = 'dm';
        dm.textContent = pool[Math.floor(Math.random() * pool.length)];
        dm.style.top = (10 + Math.random() * 60) + '%';
        dm.style.animationDuration = (4 + Math.random() * 3) + 's';
        $('#danmu-layer').appendChild(dm);
        setTimeout(() => dm.remove(), 7500);
      }, i * 500 + Math.random() * 400);
    }
  }

  function doTick() {
    if (!S || S.phase !== 'life' || pendingAsk || busy) return;
    const r = BH.tick(S);
    if (!r) return;
    renderHUD();
    addLine(r.line);
    if (r.extra) addLine(r.extra);
    if (r.ask) { stopAuto(); pendingAsk = r.ask; setTimeout(() => showAsk(r.ask), 420); return; }
    if (r.end) { busy = true; setTimeout(settlement, 1400); }
  }

  // 点击/长按
  const wrap = $('#stream-wrap');
  wrap.addEventListener('pointerdown', e => {
    if (e.target.closest('.ask') || e.target.closest('.qte') || e.target.closest('.boss')) return;
    doTick();
    holdTimer = setInterval(doTick, 170);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => wrap.addEventListener(ev, () => clearInterval(holdTimer)));

  $('#btn-auto').onclick = () => {
    if (autoTimer) { stopAuto(); return; }
    $('#btn-auto').textContent = '⏸ 停';
    autoTimer = setInterval(doTick, 1150);
  };
  function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; $('#btn-auto').textContent = '▶ 自动'; } }
  $('#btn-skip-life').onclick = () => {
    let n = 0;
    const step = () => {
      doTick();
      n++;
      const last = S.lines[S.lines.length - 1];
      if (pendingAsk || (S && S.phase === 'end') || n > 40 || (last && (last.grade >= 1 || last.compress))) return;
      setTimeout(step, 60);
    };
    step();
  };

  // ---------- 决策弹层 ----------
  function showAsk(ask) {
    const box = $('#ask'), title = $('#ask-title'), opts = $('#ask-opts');
    let t = '', list = [];
    if (ask.kind === 'branch') { t = '你的选择：'; list = ask.opts; }
    else if (ask.kind === 'crisis') { t = '怎么办？'; list = ask.opts; }
    else if (ask.kind === 'decade') { t = '🪧 十年路牌'; list = ask.opts.map(o => ({ id: o.id, t: o.t, sub: o.sub })); }
    else if (ask.kind === 'trait') { t = '✦ 你感觉自己又行了，三选一：'; list = ask.opts; }
    else if (ask.kind === 'golden') { t = '命运敲门了。'; list = ask.opts.map(o => ({ id: o.id, t: o.t, gold: o.id === 'join' })); }
    else if (ask.kind === 'boss') { closeAsk(); openBoss(ask); return; }
    title.textContent = t;
    opts.innerHTML = list.map(o => `<button data-id="${o.id}" class="${o.gold ? 'gold' : ''}">${esc(o.t)}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</button>`).join('');
    box.classList.remove('hidden');
    $$('#ask-opts button').forEach(b => b.onclick = () => {
      const id = b.dataset.id;
      const r = BH.choose(S, ask.kind, id, ask);
      closeAsk();
      if (r && r.line) addLine(r.line);
      pendingAsk = null;
      renderHUD();
      if (S.phase === 'end') { busy = true; setTimeout(settlement, 1400); }
    });
  }
  function closeAsk() { $('#ask').classList.add('hidden'); }

  // ---------- 大劫 ----------
  let bossCtx = null;
  function openBoss(ask) {
    const B = BH.BOSSES.find(x => x.age === ask.age);
    bossCtx = { B, ask };
    if (B.type === 'qte') { openQTE(B, ask); return; }
    $('#boss-title').textContent = '★ 大劫 · ' + B.name;
    $('#boss-calc').innerHTML = `<div class="it" style="justify-content:center;color:#9a9aa8">${esc(B.desc)}</div>`;
    $('#boss-result').innerHTML = '';
    $('#boss-ok').classList.add('hidden');
    $('#boss-fill').style.width = '0%';
    $('#boss-line').style.display = 'none';
    $('#boss').classList.remove('hidden');
    const goBtn = document.createElement('button');
    goBtn.className = 'mid-btn'; goBtn.textContent = '开始结算';
    goBtn.style.marginTop = '6px';
    $('#boss-calc').appendChild(goBtn);
    goBtn.onclick = () => playBossShow(B, ask, null);
  }
  function openQTE(B, ask) {
    $('#qte-title').textContent = '★ 大劫 · ' + B.name + '：狂点答题！';
    $('#qte-count').textContent = '0';
    $('#qte-bar').style.width = '100%';
    $('#qte').classList.remove('hidden');
    let clicks = 0, t0 = Date.now(), DUR = 5000;
    const barTimer = setInterval(() => {
      const p = 1 - (Date.now() - t0) / DUR;
      $('#qte-bar').style.width = Math.max(0, p * 100) + '%';
      if (p <= 0) { clearInterval(barTimer); finishQTE(clicks, B, ask); }
    }, 60);
    $('#qte-btn').onclick = () => {
      clicks++; $('#qte-count').textContent = clicks; BH.SFX.flip();
      if (clicks % 10 === 0) BH.SFX.drum();
    };
    function finishQTE(c) {
      $('#qte-btn').onclick = null;
      setTimeout(() => { $('#qte').classList.add('hidden'); playBossShow(B, ask, c); }, 200);
    }
  }
  function playBossShow(B, ask, clicks) {
    const score = BH.bossScore(S, ask.age, clicks);
    const band = BH.bossBand(S, ask.age, score);
    const calc = $('#boss-calc'); calc.innerHTML = '';
    const items = [];
    for (const k in (B.base || {})) items.push(['基础 · ' + DIM_NAMES[k][1], '+' + Math.round(S.dims[k] * B.base[k] * 10) / 10]);
    if (clicks) items.push(['手速 · ' + clicks + ' 击', '+' + Math.round(clicks * (B.clickK || 0.4) * 10) / 10]);
    for (const tid of S.talents) { const t = BH.TALENTS.find(x => x.id === tid); const tb = B.talBonus && B.talBonus[tid]; if (t && tb) items.push([t.emoji + ' ' + t.name, (tb.add ? (tb.add > 0 ? '+' : '') + tb.add : '') + (tb.mul ? ' ×' + tb.mul : '')]); }
    for (const tid of S.traits) { const t = BH.TRAITS.find(x => x.id === tid); const tb = B.traitBonus && B.traitBonus[tid]; if (t && tb) items.push([t.emoji + ' ' + t.name, '+' + tb]); }
    for (const k in S.tracks) { const tb = B.trackBonus && B.trackBonus[k]; const tr = (BH.TRACKS || []).find(x => x.id === k); if (tb && tr) items.push(['🎞️ ' + tr.name + ' ×' + S.tracks[k], '+' + S.tracks[k] * tb]); }
    const opt0 = B.opts[0];
    const show2 = () => {
      const it = items.shift();
      if (it) {
        const el = document.createElement('div');
        el.className = 'it'; el.innerHTML = `<span>${esc(it[0])}</span><b>${esc(it[1])}</b>`;
        calc.appendChild(el); BH.SFX.flip();
        setTimeout(show2, 260);
      } else {
        const tot = document.createElement('div');
        tot.className = 'it tot'; tot.innerHTML = `<span>总分</span><b>${score}</b>`;
        calc.appendChild(tot); BH.SFX.drum();
        // 达标线：最高档阈值
        const line = B.opts[0].min;
        $('#boss-line').style.display = 'block';
        $('#boss-line').style.left = Math.min(96, (line / Math.max(line, score, 1)) * 100) + '%';
        setTimeout(() => {
          $('#boss-fill').style.width = Math.min(100, (score / Math.max(line * 1.6, 1)) * 100) + '%';
          const o = B.opts.find(x => x.id === band);
          const diff = line - score;
          setTimeout(() => {
            $('#boss-result').innerHTML = band === B.opts[0].id
              ? `<div class="big">${score >= line + 8 ? '漂亮！' : '过了！'}</div>${esc(o.rt)}`
              : (diff > -4 ? `<div class="big" style="color:#ff9d6e">就差一点！！</div>${esc(o.rt)}` : `<div class="big" style="color:#b9b9c6">${B.opts.find(x=>x.id===band).id === 'luo' || band === 'none' || band === 'hard' || band === 'down' || band === 'no' ? '没能过线' : '未达标'}</div>${esc(o.rt)}`);
            BH.SFX[band === B.opts[0].id ? 'win' : 'lose']();
            $('#boss-ok').classList.remove('hidden');
            $('#boss-ok').onclick = () => {
              $('#boss').classList.add('hidden');
              const r = BH.choose(S, 'boss', band, { age: ask.age });
              if (r.line) addLine(r.line);
              renderHUD();
            };
          }, 550);
        }, 350);
      }
    };
    show2();
  }

  // ---------- 结算 ----------
  function settlement() {
    stopAuto(); busy = false;
    const report = BH.settle(S);
    const rank = 7 + (BH.hashSeed(String(S.seed)) % 4800);
    // meta 更新
    meta.deaths++;
    if (S.deathCause) meta.dex[S.deathCause.cause] = 1;
    for (const e of (report.endings || [])) meta.endings[e.track] = e.title;
    evalAch(S);
    meta.works.unshift({ title: report.title.full, type: report.type, box: report.box, score: report.score, seed: String(S.seed) });
    meta.works = meta.works.slice(0, 24);
    meta.reinc += report.reinc;
    if (report.box > (meta.bestBox || 0)) meta.bestBox = report.box;
    if (report.score > (meta.bestScore || 0)) meta.bestScore = report.score;
    saveMeta();
    BH.Poster.render($('#poster-canvas'), report, S, meta, rank);
    $('#reinc-gain').textContent = report.reinc;
    // 继承
    const inh = $('#inherit-row');
    inh.innerHTML = '轮回继承（选一个天赋带去下辈子）：<br>' + S.talents.map(id => {
      const t = BH.TALENTS.find(x => x.id === id);
      return `<button class="inh" data-id="${id}">${t.emoji} ${esc(t.name)}</button>`;
    }).join('');
    $$('#inherit-row .inh').forEach(b => b.onclick = () => {
      meta.inherit = b.dataset.id; saveMeta();
      $$('#inherit-row .inh').forEach(x => x.style.borderColor = '');
      b.style.borderColor = '#e8443a';
    });
    show('#screen-poster');
    if (report.score >= 8.5 || report.box >= 50) BH.SFX.win();
    // 挑战对比
    if (challengeInfo) {
      const win = report.box > challengeInfo.b;
      const cr = $('#challenge-result');
      cr.classList.remove('hidden');
      cr.textContent = `⚔️ 挑战结果：你 ${report.box} 亿 vs TA ${challengeInfo.b} 亿 —— ${win ? '挑战成功！同一副牌，你打得更好。' : '未能超越，同一副牌，再试一次？'}`;
    }
    // 存当前结算数据供复制
    appCtx.report = report; appCtx.rank = rank;
  }
  const appCtx = { report: null, rank: 0 };

  $('#btn-save').onclick = () => {
    const a = document.createElement('a');
    a.download = '杀青-' + (appCtx.report ? appCtx.report.title.main : '海报') + '.png';
    a.href = $('#poster-canvas').toDataURL('image/png');
    a.click();
  };
  $('#btn-copy').onclick = () => {
    if (!appCtx.report) return;
    const txt = BH.Poster.textVersion(appCtx.report, S, appCtx.rank);
    const done = () => { $('#btn-copy').textContent = '✅ 已复制'; setTimeout(() => $('#btn-copy').textContent = '📋 复制文案', 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done).catch(() => fallbackCopy(txt, done));
    else fallbackCopy(txt, done);
  };
  function fallbackCopy(txt, done) {
    const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta);
    ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove();
  }
  $('#btn-challenge').onclick = () => {
    if (!appCtx.report) return;
    const base = location.href.split('?')[0];
    const url = base + '?seed=' + S.seed + '&c=1'
      + '&t=' + encodeURIComponent(appCtx.report.title.full)
      + '&b=' + appCtx.report.box + '&s=' + appCtx.report.score;
    const done = () => { $('#btn-challenge').textContent = '✅ 挑战已复制，发给朋友'; setTimeout(() => $('#btn-challenge').textContent = '⚔️ 发起同题挑战', 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done));
    else fallbackCopy(url, done);
  };
  $('#btn-again').onclick = () => { S = null; pendingAsk = null; challenge = false; renderTitle(); };

  // ---------- 图鉴/成就 ----------
  function renderDex(tab) {
    show('#screen-dex');
    $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $('#dex-grid').classList.toggle('hidden', tab !== 'dex');
    $('#works-grid').classList.toggle('hidden', tab !== 'works');
    $('#ach-grid').classList.toggle('hidden', tab !== 'ach');
    if (tab === 'dex') {
      const causes = {}; BH.DEATHS.forEach(d => { causes[d.death.cause] = d; });
      $('#dex-grid').innerHTML = Object.keys(causes).map(cause => {
        const d = causes[cause], got = meta.dex[cause];
        return `<div class="dex-card ${got ? 'got' : 'locked'}">
          <div class="ic">${got ? d.death.icon : '❔'}</div>
          <b>${got ? esc(cause) : '尚未解锁'}</b>
          <div>${got ? esc(d.t.length > 34 ? d.t.slice(0, 34) + '…' : d.t) : '在另一条人生里死于这个。'}</div></div>`;
      }).join('');
    } else if (tab === 'works') {
      $('#works-grid').innerHTML = meta.works.length
        ? meta.works.map(w => `<div class="dex-card got"><b>${esc(w.title)}</b><div>${w.type} · ${w.box} 亿 · ${w.score.toFixed(1)} 分</div><div style="color:#666">seed ${w.seed}</div></div>`).join('')
        : '<div class="dex-card">还没有作品。你的第一部人生电影正在等你。</div>';
    } else {
      const gotN = Object.keys(meta.ach || {}).length;
      $('#ach-grid').innerHTML = `<div class="dex-card got" style="grid-column:1/-1"><b>🏆 成就 ${gotN}/${BH.ACH.length}</b><div>${gotN >= BH.ACH.length ? '全成就！导演建议你直接来上班。' : '有些成就藏在离谱的人生里。'}</div></div>`
        + BH.ACH.map(a => {
          const got = meta.ach[a.id];
          return `<div class="dex-card ${got ? 'got' : 'locked'}"><div class="ic">${got ? a.emoji : '🔒'}</div><b>${got ? esc(a.name) : '???'}</b><div>${esc(a.desc)}</div></div>`;
        }).join('');
    }
  }
  function renderFeast() {
    show('#screen-feast');
    $('#feast-speech').textContent = BH.FEAST[Math.floor(Math.random() * BH.FEAST.length)];
    $('#feast-list').innerHTML = Object.entries(meta.endings || {}).map(([k, title]) => {
      const tr = (BH.TRACKS || []).find(t => t.id === k);
      return `<div class="dex-card got"><b>${tr ? (tr.emoji || '🎞️') + ' ' : ''}${esc(title)}</b><div>${tr ? esc(tr.name) : ''}线结局</div></div>`;
    }).join('') + '<div class="dex-card got"><b>👑 终身成就奖</b><div>授予：把每条命都活成片子的你</div></div>';
  }
  $('#btn-feast').onclick = renderFeast;
  $('#btn-feast-back').onclick = renderTitle;
  $$('.tab-btn').forEach(b => b.onclick = () => renderDex(b.dataset.tab));
  $('#btn-dex-back').onclick = renderTitle;

  // ---------- URL 挑战 ----------
  let challengeSeed = null, challengeInfo = null;
  (function parseURL() {
    const q = new URLSearchParams(location.search);
    if (q.get('seed')) {
      challengeSeed = q.get('seed');
      challenge = true;
      if (q.get('t')) challengeInfo = { t: q.get('t'), b: +q.get('b') || 0, s: +q.get('s') || 0 };
    }
    if (q.get('debugfeast')) { // 测试用：预置结局解锁
      (BH.TRACKS || []).slice(0, 6).forEach(t => { meta.endings[t.id] = (t.endingGood || {}).title || t.name; });
      saveMeta();
    }
  })();

  // ---------- 启动 ----------
  applySound(); applyDanmu(); renderTitle();
  // demo 模式：?demo=1 自动跑一局到海报（供无头截图/自动化测试）
  if (new URLSearchParams(location.search).get('demo')) {
    setTimeout(() => autoDemo(), 100);
  }
  function autoDemo() {
    startRun('demo-seed-1');
    setTimeout(() => {
      const cards = $$('#draft-grid .tcard');
      [0, 1, 2].forEach(i => { cards[i].click(); cards[i].click(); });
      setTimeout(() => { $('#btn-draft-ok').click(); setTimeout(() => { $('#btn-life-start').click(); autoLife(); }, 150); }, 150);
    }, 150);
  }
  function autoLife() {
    const stopAge = +(new URLSearchParams(location.search).get('stop') || 0);
    const iv = setInterval(() => {
      if (!S) { clearInterval(iv); return; }
      if (stopAge && S.age >= stopAge && !pendingAsk) { clearInterval(iv); return; }
      if (S.phase === 'end') { clearInterval(iv); setTimeout(settlement, 800); return; }
      if (pendingAsk) {
        const a = pendingAsk;
        if (a.kind === 'boss') {
          const clicks = a.age === 18 ? 60 : null;
          const score = BH.bossScore(S, a.age, clicks);
          const band = BH.bossBand(S, a.age, score);
          BH.choose(S, 'boss', band, { age: a.age });
          closeAsk(); pendingAsk = null; return;
        }
        const opt = a.opts[0];
        if (a.kind === 'golden') { BH.choose(S, 'golden', 'join', a); }
        else BH.choose(S, a.kind, opt.id, a);
        closeAsk(); pendingAsk = null; return;
      }
      doTick();
    }, 40);
  }
})();
