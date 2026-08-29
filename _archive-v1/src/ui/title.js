/* badhand — 剧名生成与短评
 * 正典：docs/modules/07-settlement.md §2 §3
 *
 * 剧名是截图的第一钩子。生成规则：优先选包含反差的组合
 * ——「我在中专修仙」好过「我的修仙生涯」，因为反差是转发理由。
 */
(function (g) {
  'use strict';
  var BH = (g.BH = g.BH || {});

  /** 槽位取值来自本局实际轨迹，不是随机词表 */
  function slotValues(state) {
    var R = BH.registry;
    var St = BH.state;
    var dom = St.dominantTrack(state);
    var t = dom.id && R.has('tracks', dom.id) ? R.get('tracks', dom.id) : null;
    var f = state.final || {};

    var 地点 = { dushu: '学校', shushu: '出租屋', xiuxian: '山上', dianjing: '网吧' };
    var 行为 = { dushu: '刷题', shushu: '装死', xiuxian: '修仙', dianjing: '打排位' };
    var 身份 = {
      dushu: ['好学生', '刷题机器'], shushu: ['鼠鼠', '大冤种'],
      xiuxian: ['修仙者', '半仙', '野生道士'], dianjing: ['替补', '手速怪'],
    };

    var depth = dom.depth || 0;
    var idPool = 身份[dom.id] || ['普通人'];
    var 转折 = '再也没红过';
    if (state.SCAR.length >= 4) 转折 = '塌房三次';
    else if (state.MNY <= 0) 转折 = '暴富之后赔光';
    else if (state.ELINE && Object.keys(state.ELINE).length) 转折 = '突然下山';

    var 形容 = '很闲的';
    if (state.HOOKP >= 12 && state.HOOK <= 3) 形容 = '不肯收手的';
    else if (state.SCAR.length >= 3) 形容 = '连续翻车的';
    else if ((f.rating || 0) < 3) 形容 = '过气的';
    else if (state.AUD < 10) 形容 = '沉默的';

    var 结局 = '一场误会';
    if (f.deathId) {
      var m = {
        e_death_yiwai: '电梯故障', e_death_manxing: '拖到最后',
        e_death_wurenzhi: '没人叫醒', e_death_zhibo: '直播切断',
        e_death_leijie: '雷劫', e_death_jingsai: '包厢里',
        e_death_zirankeshou: '晒被子', e_death_huangdan: '一场误会',
      };
      结局 = m[f.deathId] || '一场误会';
    }

    return {
      地点: 地点[dom.id] || '县城',
      行为: 行为[dom.id] || '混',
      身份: idPool[Math.min(idPool.length - 1, Math.floor(depth / 2))],
      形容: 形容,
      转折: 转折,
      结局: 结局,
      _scope: t ? t.lexiconScope : 'common',
      _track: dom.id,
    };
  }

  /** 反差分：两个槽位的圈层距离越远越好 */
  function contrastScore(pattern, v) {
    var s = 0;
    if (pattern.indexOf('{地点}') >= 0 && pattern.indexOf('{行为}') >= 0) {
      // 「中专 + 修仙」这类跨圈层组合得分最高
      var mundane = ['学校', '出租屋', '网吧', '县城'];
      var exotic = ['修仙', '雷劫'];
      if (mundane.indexOf(v.地点) >= 0 && exotic.indexOf(v.行为) >= 0) s += 3;
      else s += 1;
    }
    if (pattern.indexOf('{转折}') >= 0) s += 2;
    if (pattern.indexOf('{结局}') >= 0) s += 1;
    if (pattern.indexOf('{形容}') >= 0) s += 1;
    return s;
  }

  function generate(state) {
    var R = BH.registry;
    var pats = R.titles().patterns;
    var v = slotValues(state);
    var best = null, bestScore = -1;
    for (var i = 0; i < pats.length; i++) {
      var sc = contrastScore(pats[i], v);
      // 同分时用 seed 决定，保证同 seed 同剧名
      if (sc > bestScore) { bestScore = sc; best = pats[i]; }
    }
    // 槽位名是中文，\w 匹配不到，必须用 [^}]+
    var out = best.replace(/\{([^}]+)\}/g, function (_, k) { return v[k] || k; });
    return '《' + out + '》';
  }

  /** 短评属观众层，永远不夸玩家（07-settlement.md §3）*/
  function review(state) {
    var f = state.final || {};
    var R = BH.registry;
    var rules = R.reviews();
    var when = 'default';

    if (state.cancelCount >= 2) when = 'cancelled';
    else if (f.com === 0.5) when = 'comPenalty';
    else if ((f.rating || 0) >= 6) when = 'veryHigh';
    else if (f.amp <= 0.8 && (f.rating || 0) >= 4) when = 'lowAmpHighScore';
    else if (state.SCAR.indexOf('scar_zhushui') >= 0) when = 'hasZhushui';
    else if (state.SCAR.length >= 4) when = 'manyScars';
    else if (f.iro >= 2.5) when = 'highIrony';
    else if (state.AUD < 10) when = 'lowAud';

    for (var i = 0; i < rules.length; i++) {
      if (rules[i].when === when) return rules[i].text;
    }
    return rules[rules.length - 1].text;
  }

  /** 假的评价人数，跟着收视量级走 */
  function votes(state) {
    var t = (state.final && state.final.total) || 0;
    return Math.max(12, Math.round(t / 24));
  }

  BH.title = { generate: generate, review: review, votes: votes, _slots: slotValues };
})(typeof globalThis !== 'undefined' ? globalThis : this);
