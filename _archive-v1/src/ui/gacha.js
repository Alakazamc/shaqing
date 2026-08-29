/* badhand — 结算后抽卡
 * 正典：docs/modules/12-gacha.md
 *
 * 核心设计：抽卡池按本局剧情加权，让抽卡是"这条命留下的遗产"
 * 而不是一台和刚才那局无关的老虎机。
 */
(function (g) {
  'use strict';
  var BH = (g.BH = g.BH || {});

  /** 素材 = 对数收视换算 + 首次发现/结局奖励，保底 5；重复抽卡另行转成素材 */
  function materialBreakdown(f, bonus) {
    bonus = bonus || {};
    var base = Math.floor(10 * Math.log10((f.total || 0) + 1));
    var firstTrackBonus = Math.max(0, Number(bonus.firstTracks) || 0) * 20;
    var firstEndingBonus = Math.max(0, Number(bonus.firstEndings) || 0) * 15;
    var cancelBonus = bonus.cancelled ? 5 : 0;
    var guaranteed = Math.max(5, base);
    return {
      base: base,
      guaranteed: guaranteed,
      firstTrackBonus: firstTrackBonus,
      firstEndingBonus: firstEndingBonus,
      cancelBonus: cancelBonus,
      total: guaranteed + firstTrackBonus + firstEndingBonus + cancelBonus,
    };
  }

  function material(f) {
    return materialBreakdown(f).total;
  }

  var TYPE_KIND = { cast: 'cast', talent: 'talents', npc: 'npcs', track: 'tracks' };

  function unlockedList(save, type) {
    if (!save.unlocked) save.unlocked = {};
    if (!Array.isArray(save.unlocked[type])) save.unlocked[type] = [];
    return save.unlocked[type];
  }

  /**
   * 开局天赋三选一：已解锁天赋占一个 archive slot，其余仍从全基础池抽取。
   * 这样解锁增加可能性，但不会让新玩家失去基础开局内容。
   */
  function talentChoices(seed, unlocked, pool) {
    var all = (pool || BH.registry.list('talents')).slice();
    var source = unlocked && unlocked.unlocked ? unlocked.unlocked : (unlocked || {});
    var known = Array.isArray(source.talent) ? source.talent : [];
    var rng = new BH.Rng((seed || 'X') + 'TALENT');
    var archive = all.filter(function (item) { return known.indexOf(item.id) !== -1; });
    var choices = [];
    if (archive.length) choices.push(rng.pick(archive));
    var used = choices.map(function (item) { return item.id; });
    var rest = all.filter(function (item) { return used.indexOf(item.id) === -1; });
    return choices.concat(rng.sample(rest, Math.min(3 - choices.length, rest.length)));
  }

  /**
   * 抽一次。
   * 档位权重按评分抬升（不是解锁门槛）；主题倾斜按本局圈层 ×3。
   */
  function draw(state, save, seed) {
    var R = BH.registry;
    var f = state.final || {};
    var rng = new BH.Rng((seed || 'X') + 'G' + save.stats.runs);

    // 本局圈层：主导轨道 + 出场过的 NPC
    var scopes = ['common'];
    var St = BH.state;
    var dom = St.dominantTrack(state);
    if (dom.id && R.has('tracks', dom.id)) {
      scopes.push(R.get('tracks', dom.id).lexiconScope);
    }
    state.NPC.concat(state.NPCGONE).forEach(function (id) {
      if (R.has('npcs', id)) scopes.push(R.get('npcs', id).scope);
    });

    var rating = f.rating == null ? 3 : f.rating;
    // 评分越高，高档权重越大
    var tierBoost = { 1: 1, 2: 1 + Math.max(0, (rating - 3) * 0.5),
      3: 1 + Math.max(0, (rating - 4) * 0.8) };

    var allItems = R.list('gacha');
    // 有未解锁内容时优先从未解锁池抽；全池完成后才回退重复。
    var unseen = allItems.filter(function (item) {
      return unlockedList(save, item.type).indexOf(item.target) === -1;
    });
    var source = unseen.length ? unseen : allItems;
    var pool = source.map(function (item) {
      var w = item.weight || 1;
      w *= tierBoost[item.tier] || 1;
      var hit = (item.scopes || []).some(function (s) { return scopes.indexOf(s) >= 0; });
      if (hit) w *= 3;
      return { item: item, weight: w };
    });

    var picked = rng.weighted(pool);
    if (!picked) return null;
    var item = picked.item;
    var list = unlockedList(save, item.type);
    var isDup = list.indexOf(item.target) !== -1;

    if (isDup) {
      // 重复保护：转成素材，绝不空手
      save.material += item.dupValue;
      return {
        dup: true, gained: item.dupValue, tier: item.tier,
        label: labelOf(item), emoji: emojiOf(item),
      };
    }
    list.push(item.target);
    return {
      dup: false, tier: item.tier,
      label: labelOf(item), emoji: emojiOf(item), typeName: typeName(item.type),
    };
  }

  function typeName(t) {
    return { cast: '人设牌', talent: '天赋', npc: '人物', track: '轨道',
      family: '出身', personality: '性格' }[t] || t;
  }

  function labelOf(item) {
    var R = BH.registry;
    var kind = TYPE_KIND[item.type];
    if (kind && R.has(kind, item.target)) return R.get(kind, item.target).name;
    var pool = (R.origins()[item.type] || []);
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].id === item.target) return pool[i].name;
    }
    return item.target;
  }

  function emojiOf(item) {
    var R = BH.registry;
    var kind = TYPE_KIND[item.type];
    if (kind && R.has(kind, item.target)) return R.get(kind, item.target).emoji || '🎴';
    return '🎴';
  }

  BH.gacha = {
    draw: draw,
    talentChoices: talentChoices,
    material: material,
    materialBreakdown: materialBreakdown,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
