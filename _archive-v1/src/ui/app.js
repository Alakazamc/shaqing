/* badhand — UI（Vue 3 全局构建，无构建步骤）
 * 正典：.kiro/specs/playable-build/design.md §5（状态机）、docs/modules/07-settlement.md
 *
 * UI 层职责：按 phase 渲染、播放信号层效果、读写存档。
 * 绝不直接改写引擎状态——引擎只发数据，UI 决定怎么演。
 */
(function (g) {
  'use strict';
  var BH = g.BH;
  var Vue = g.Vue;

  var doc = g.document;

  function qs(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(g.location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  var DEV = qs('dev') === '1';

  var App = {
    data: function () {
      var R = BH.registry;
      return {
        dev: DEV,
        save: BH.save.load(DEV),
        phase: 'BOOT',
        seedInput: BH.Rng.normalizeSeed(qs('s')) || '',
        state: null,
        result: null,
        // 长日志：逐条向下累积，可回滚查看前面的年份。
        // 这同时是连贯性的载体——看得见前几年，一条命才读起来像一条命
        log: [],
        seasonReward: null,
        // 开局四项
        origins: R.origins(),
        pick: { family: null, sex: null, personality: null },
        talentChoices: [],
        talentPicked: null,
        // 抽卡
        gachaResult: null,
        runMaterialGain: 0,
        runMaterialBreakdown: null,
        fxClass: '',
        shatter: false,
        // 反馈层是 UI 瞬态：只读 result/state，不参与评分、调度或存档。
        feedbackClass: '',
        feedbackText: '',
        feedbackDetail: '',
        feedbackKey: 0,
        feedbackTimer: null,
        // 图鉴浏览不改写局内状态，关闭后返回打开前的相位。
        archiveTab: 'track',
        archiveReturn: 'BOOT',
      };
    },

    computed: {
      seasonName: function () {
        if (!this.state) return '';
        var s = BH.run.seasonOf(this.state.age);
        return 'S' + s.n + ' ' + s.name;
      },
      /** 运行页第一读数：玩家此刻处在人生哪一年，而不是只看到一串日志。 */
      yearReadout: function () {
        if (!this.state) return null;
        return {
          age: this.state.age,
          phase: this.phase === 'SCENE' ? 'SCENE' : this.phase === 'REWARD' ? 'REWARD' : 'YEAR',
          hook: this.state.HOOK,
          hookPeak: this.state.HOOKP,
        };
      },
      /** 当前季的可操作槽位与已承担风险，和续订线并列显示。 */
      routeStatus: function () {
        if (!this.state) return null;
        var route = this.state.ROUTE || {};
        var picked = Array.isArray(route.picked) ? route.picked.length : 0;
        return {
          slot: Math.min(3, picked + 1),
          picked: picked,
          risk: Number(route.risk || 0),
          deck: (this.state.DECK || []).length,
        };
      },
      actionHint: function () {
        if (!this.state) return '';
        if (this.phase === 'REWARD') return '季末结算：把超额收视换成下一季资源';
        if (this.phase === 'SCENE') return '场景进行中：这一拍会写入同一年';
        if (this.planOffers.length) return '选择一张节目牌，先决定这一季怎么被看见';
        if (this.result && this.result.options && this.result.options.length) {
          return '事件待决：选项会改变收视、状态或后续事件线';
        }
        return '推进到下一年，等待下一条人生信号';
      },
      deckSignal: function () {
        if (!this.state || !BH.run.planMatches) return null;
        var signal = BH.run.planMatches(this.state, []);
        return {
          suite: signal.suite,
          cast: (signal.matchedCast || []).map(function (id) { return this.nameOf('cast', id); }, this),
          chipBonus: signal.chipBonus,
          multBonus: signal.multBonus,
        };
      },
      tracks: function () { return BH.registry.all('tracks'); },
      /** 当前可选的季内编排。固定事件、待决事件或场景会让路线让位。 */
      planOffers: function () {
        if (!this.state || this.state.pending || this.state.phase !== 'YEAR') return [];
        if (this.result && this.result.options && this.result.options.length && !this.result.route) {
          return [];
        }
        return BH.run.planOffers(this.state);
      },
      /** 当前季节目牌，只读展示；牌本身不能拖动、排序或手动移除。 */
      deckCards: function () {
        if (!this.state) return [];
        var R = BH.registry;
        var counts = {};
        (this.state.DECK || []).forEach(function (d) {
          (d.tags || []).forEach(function (tag) { counts[tag] = (counts[tag] || 0) + 1; });
        });
        return (this.state.DECK || []).map(function (d) {
          var p = R.has('plans', d.id) ? R.get('plans', d.id) : null;
          var max = 0;
          (d.tags || []).forEach(function (tag) { max = Math.max(max, counts[tag] || 0); });
          return {
            id: d.id,
            label: p ? p.label : d.id,
            suite: max >= 3 ? '成套' : max >= 2 ? '合拍' : '',
          };
        });
      },
      /** 当前职业。它是文本连贯性的载体，必须在 HUD 上一直可见 */
      jobInfo: function () {
        if (!this.state || !this.state.JOB) return null;
        var R = BH.registry;
        if (!R.has('jobs', this.state.JOB)) return null;
        var j = R.get('jobs', this.state.JOB);
        return {
          emoji: j.emoji, name: j.name, tier: j.tier,
          years: this.state.JOBYEARS || 0,
        };
      },
      /** 当前在场关系：显示方向，但不把轴做成玩家要计算的第二套货币 */
      npcRelations: function () {
        if (!this.state) return [];
        var R = BH.registry;
        return (this.state.NPC || []).map(function (id) {
          if (!R.has('npcs', id)) return null;
          var n = R.get('npcs', id);
          var ax = (this.state.NPCAX && this.state.NPCAX[id]) || {};
          var axis = Number(ax.axis || 0);
          var band = axis >= 4 ? '靠近' : axis <= -4 ? '疏远' : axis > 0 ? '有来往' : axis < 0 ? '别扭' : '未定';
          return { id: id, emoji: n.emoji || '·', name: n.name, stage: ax.stage || 0, axis: axis, band: band };
        }, this).filter(Boolean);
      },
      /** 续订线进度：目标必须始终可见（19-tension.md §1.1）*/
      seasonProgress: function () {
        if (!this.state) return null;
        var sn = BH.run.SEASONS[this.state.season - 1];
        if (!sn || sn.threshold == null) {
          return { sum: this.state.seasonSum, target: null, ratio: 0, over: 0 };
        }
        var target = sn.threshold * Math.pow(1.5, this.state.cancelCount);
        var ratio = target ? this.state.seasonSum / target : 0;
        return {
          sum: this.state.seasonSum, target: target,
          ratio: Math.min(1, ratio),
          over: ratio,
          met: ratio >= 1,
        };
      },
      castCards: function () {
        if (!this.state) return [];
        var R = BH.registry;
        return this.state.CAST.map(function (c) {
          var card = R.get('cast', c.id);
          return { emoji: card.emoji, name: card.name, lv: c.lv };
        });
      },
      scarCards: function () {
        if (!this.state) return [];
        var R = BH.registry;
        return this.state.SCAR.map(function (id) {
          var s = R.get('scars', id);
          return { emoji: s.emoji, name: s.name };
        });
      },
      finalData: function () { return this.state && this.state.final; },
      scoreGuideVisible: function () {
        return this.phase === 'BOOT' && !(this.save.seen && this.save.seen.scoreGuide);
      },
      unlockedCount: function () {
        var unlocked = this.save.unlocked || {};
        return Object.keys(unlocked).reduce(function (n, key) {
          return n + (Array.isArray(unlocked[key]) ? unlocked[key].length : 0);
        }, 0);
      },
      foundTrackCount: function () {
        return this.save.found && Array.isArray(this.save.found.track)
          ? this.save.found.track.length : 0;
      },
      foundEventCount: function () {
        return this.save.found && Array.isArray(this.save.found.event)
          ? this.save.found.event.length : 0;
      },
      foundLineCount: function () {
        return this.save.found && Array.isArray(this.save.found.line)
          ? this.save.found.line.length : 0;
      },
      foundPlanCount: function () {
        return this.save.found && Array.isArray(this.save.found.plan)
          ? this.save.found.plan.length : 0;
      },
      eventTotal: function () {
        return BH.registry.list('events').length;
      },
      lineTotal: function () {
        return BH.registry.list('eventlines').length;
      },
      planTotal: function () {
        return BH.registry.list('plans').length;
      },
      trackTotal: function () {
        return BH.registry.list('tracks').length;
      },
      foundEndingCount: function () {
        return this.save.found && Array.isArray(this.save.found.ending)
          ? this.save.found.ending.length : 0;
      },
      foundCastCount: function () {
        var unlocked = this.save.unlocked && this.save.unlocked.cast;
        return Array.isArray(unlocked) ? unlocked.length : 0;
      },
      foundNpcCount: function () {
        var lines = this.save.found && Array.isArray(this.save.found.line)
          ? this.save.found.line : [];
        return BH.registry.list('npcs').filter(function (npc) {
          return lines.indexOf(npc.eventline) !== -1;
        }).length;
      },
      /** 图鉴页只在已发现后显示真结局槽位，避免提前暗示其存在。 */
      archiveTabs: function () {
        var R = BH.registry;
        var foundEndings = this.save.found && Array.isArray(this.save.found.ending)
          ? this.save.found.ending : [];
        var normalEndings = R.list('endings').filter(function (e) { return !e.trueEnding; }).length;
        var stableFound = R.list('endings').some(function (e) {
          return e.trueEnding && foundEndings.indexOf(e.id) !== -1;
        });
        return [
          { key: 'track', label: '轨道', count: this.foundTrackCount, total: R.list('tracks').length },
          { key: 'ending', label: '结局', count: this.foundEndingCount, total: normalEndings + (stableFound ? 1 : 0) },
          { key: 'cast', label: '人设', count: this.foundCastCount, total: R.list('cast').length },
          { key: 'npc', label: 'NPC', count: this.foundNpcCount, total: R.list('npcs').length },
          { key: 'line', label: '事件线', count: this.foundLineCount, total: R.list('eventlines').length },
          { key: 'plan', label: '节目牌', count: this.foundPlanCount, total: R.list('plans').length },
          { key: 'event', label: '事件', count: this.foundEventCount, total: R.list('events').length },
        ];
      },
      /** 将注册表内容投影为图鉴卡片；未知内容只显示占位，不泄漏条件或文本。 */
      archiveEntries: function () {
        var R = BH.registry;
        var found = this.save.found || {};
        var unlocked = this.save.unlocked || {};
        var list = function (key) { return Array.isArray(found[key]) ? found[key] : []; };
        var has = function (key, id) { return list(key).indexOf(id) !== -1; };
        var row = function (id, known, name, emoji, meta, description) {
          return { id: id, known: known, name: known ? name : '???',
            emoji: known ? (emoji || '·') : '░', meta: known ? meta : '尚未发现',
            description: known ? (description || '') : '' };
        };
        if (this.archiveTab === 'track') {
          return R.list('tracks').map(function (t) {
            return row(t.id, has('track', t.id), t.name, t.emoji,
              t.hidden ? '隐藏轨道 · 已写入图鉴' : '公开轨道',
              t.hidden ? '入口不会直接标注题材。' : '这条路线一直在节目单里。');
          });
        }
        if (this.archiveTab === 'ending') {
          return R.list('endings').filter(function (e) {
            return !e.trueEnding || has('ending', e.id);
          }).map(function (e) {
            return row(e.id, has('ending', e.id), e.trueEnding ? '稳定的好日子' : e.id,
              e.trueEnding ? '·' : '▣', e.trueEnding ? '已达成 · 无评分' : '普通结局', e.text);
          });
        }
        if (this.archiveTab === 'cast') {
          var castKnown = Array.isArray(unlocked.cast) ? unlocked.cast : [];
          return R.list('cast').map(function (c) {
            return row(c.id, castKnown.indexOf(c.id) !== -1, c.name, c.emoji,
              c.rarity + ' · ' + (c.track || '基础'), c.desc);
          });
        }
        if (this.archiveTab === 'npc') {
          return R.list('npcs').map(function (n) {
            var known = has('line', n.eventline);
            return row(n.id, known, n.name, n.emoji,
              known ? '事件线已推进' : '未遇见', known ? n.bio : '人物身份不会提前显示。');
          });
        }
        if (this.archiveTab === 'line') {
          return R.list('eventlines').map(function (line) {
            var known = has('line', line.id);
            var track = R.has('tracks', line.track) ? R.get('tracks', line.track).name : line.track;
            return row(line.id, known, line.name || line.id, '↳',
              known ? track + ' · 已推进' : '尚未推进', known ? '这条线的分叉与回响会留在记录里。' : '未知事件线');
          });
        }
        if (this.archiveTab === 'plan') {
          return R.list('plans').map(function (plan) {
            var known = has('plan', plan.id);
            return row(plan.id, known, plan.label, plan.hidden ? '░' : '▣',
              known ? (plan.kind + (plan.metaUnlock ? ' · archive' : '')) : '尚未选中过',
              known ? (plan.cost || []).join(' · ') : '节目牌效果暂不公开。');
          });
        }
        // 事件只列出实际播出过的条目，不把 234 条未发现文本提前摊开。
        return R.list('events').filter(function (event) {
          return has('event', event.id);
        }).map(function (event) {
          var season = event.season == null ? '跨季' : 'S' + event.season;
          return { id: event.id, known: true, name: event.id, emoji: '▶',
            meta: season + ' · ' + event.kind, description: event.text || '' };
        });
      },
      archiveEventNote: function () {
        return this.archiveTab === 'event'
          ? '只列出本局或过往局实际播出的事件；未知文本不会提前泄露。' : '';
      },
      showTitle: function () {
        return this.finalData ? BH.title.generate(this.state) : '';
      },
      reviewText: function () {
        return this.finalData ? BH.title.review(this.state) : '';
      },
      starText: function () {
        var r = this.finalData && this.finalData.rating;
        if (r == null) return '';
        var full = Math.round(r / 2);
        var out = '';
        for (var i = 0; i < 5; i++) out += i < full ? '★' : '☆';
        return out;
      },
    },

    methods: {
      openArchive: function (tab) {
        if (this.phase === 'ARCHIVE') return;
        this.archiveReturn = this.phase || 'BOOT';
        this.archiveTab = tab || 'track';
        this.phase = 'ARCHIVE';
      },
      closeArchive: function () {
        var target = this.archiveReturn || 'BOOT';
        this.phase = target === 'ARCHIVE' ? 'BOOT' : target;
        this.archiveReturn = 'BOOT';
      },
      selectArchiveTab: function (tab) {
        var allowed = ['track', 'ending', 'cast', 'npc', 'line', 'plan', 'event'];
        if (allowed.indexOf(tab) !== -1) this.archiveTab = tab;
      },
      archiveReturnLabel: function () {
        return {
          BOOT: '回到开局', ORIGIN: '回到出生', TALENT: '回到天赋',
          YEAR: '回到人生', SCENE: '回到场景', REWARD: '回到奖励',
          SEASON_END: '回到季末', REVIVE: '回到续命', SETTLEMENT: '回到结算',
          GACHA: '回到抽卡'
        }[this.archiveReturn] || '回到上一页';
      },
      dismissScoreGuide: function () {
        if (!this.save.seen) this.save.seen = {};
        this.save.seen.scoreGuide = true;
        BH.save.save(this.save, this.dev);
      },
      seasonOutcome: function (end, result) {
        if (!end) return '';
        if (end.threshold == null) {
          return end.season === 5
            ? '收尾季没有续订线：这一季的收视会进入终局总收视。'
            : '试镜季没有续订线：先把故事播起来，收视从下一季开始决定续订。';
        }
        if (end.verdict === 'extend') {
          return '本季收视达到续订线 2×，平台加更 ' +
            (result && result.extendYears ? result.extendYears : '数') +
            ' 年，并开放本季奖励。';
        }
        if (end.verdict === 'renew') {
          return '本季收视达到续订线，故事进入下一季；季末奖励会改变下一季的观众、人设或寿命。';
        }
        return '本季收视没有过线：观众减半、获得注水污点、下季续订线抬高 1.5×，但故事仍会播到收尾。';
      },
      scoreFormula: function (score) {
        if (!score || score.B == null) return '';
        return 'B ' + this.n1(score.B) + ' × M ' + this.n2(score.M) +
          ' × A ' + this.n2(score.aud) + ' × F ' + this.n2(score.fatigue);
      },
      // ── 开局 ────────────────────────────────────────
      rollOrigin: function () {
        var seed = BH.Rng.normalizeSeed(this.seedInput);
        if (!seed) {
          seed = BH.Rng.makeSeed();
          this.seedInput = seed;
        }
        var rng = new BH.Rng(seed + 'O');
        this.pick.family = rng.pick(this.origins.family).id;
        this.pick.sex = rng.pick(this.origins.sex).id;
        this.pick.personality = rng.pick(this.origins.personality).id;
      },
      startOrigin: function () {
        this.phase = 'ORIGIN';
        this.rollOrigin();
      },
      confirmOrigin: function () {
        var seed = BH.Rng.normalizeSeed(this.seedInput) || BH.Rng.makeSeed();
        this.seedInput = seed;
        var pool = BH.registry.list('talents');
        this.talentChoices = BH.gacha && BH.gacha.talentChoices
          ? BH.gacha.talentChoices(seed, this.save.unlocked, pool)
          : new BH.Rng(seed + 'TALENT').sample(pool, 3);
        this.talentPicked = null;
        this.phase = 'TALENT';
      },
      confirmTalent: function (id) {
        var seed = this.seedInput;
        var created = BH.run.create({
          seed: seed,
          family: this.pick.family,
          sex: this.pick.sex,
          persona0: this.pick.personality,
          talents: [id],
          meta: { unlocked: this.save.unlocked },
        });
        this.state = created.state;
        this.state.phase = 'YEAR';
        this.phase = 'YEAR';
        this.result = null;
        this.history = [];
      },

      // ── 长日志 ──────────────────────────────────────
      pushLog: function (entry) {
        this.log.push(entry);
        var self = this;
        // 日志现在随页面自然增长；新内容出现后把整页定位到交互区，
        // 不再把滚动锁在 logbox 这个内部小框里。
        g.requestAnimationFrame(function () {
          var el = self.$refs.actionbox || doc.querySelector('.actionbox');
          if (el && el.scrollIntoView) {
            el.scrollIntoView({ block: 'start' });
          }
          self.$forceUpdate && self.$forceUpdate();
        });
      },

      logFromResult: function (res) {
        var i;
        var self = this;
        for (i = 0; i < res.skippedYears.length; i++) {
          this.pushLog({ kind: 'skip', text: res.skippedYears[i] });
        }
        if (res.planPick && res.chosenText) {
          this.pushLog({ kind: 'choice', text: res.chosenText });
        }
        if (res.text && !res.resolved) {
          // 同一年内的第二条事件不重复打年龄标头
          var last = null;
          for (i = this.log.length - 1; i >= 0; i--) {
            if (this.log[i].kind === 'event' || this.log[i].kind === 'beat') {
              last = this.log[i];
              break;
            }
          }
          var sameYear = last && last.kind === 'event' &&
            last.age === this.state.age;
          this.pushLog({
            kind: res.phase === 'SCENE' ? 'beat' : 'event',
            age: this.state.age,
            showAge: !sameYear,
            text: res.text,
            fx: res.fx && res.fx.length ? res.fx[0].name : '',
            beat: res.sceneBeat || null,
          });
        }
        if (res.chosenText && !res.planPick) {
          this.pushLog({ kind: 'choice', text: res.chosenText });
        }
        if (res.score) {
          this.pushLog({ kind: 'score', score: res.score });
        }
        (res.relations || []).forEach(function (rel) {
          self.pushLog({ kind: 'relation', text: self.relationText(rel) });
        });
        // 同一脉冲携带的额外 flavor（脉冲合并后必须全部显示，
        // 否则玩家会丢掉这些文本）
        (res.extraFlavor || []).forEach(function (f) {
          self.pushLog({ kind: 'event', age: self.state.age,
            showAge: false, text: f.text, fx: '' });
          if (f.score) self.pushLog({ kind: 'score', score: f.score });
        });
        if (res.loop) {
          this.pushLog({ kind: 'loop', text: res.loop.broke
            ? '这一天终于走完了。'
            : '七月十四号，第 ' + res.loop.count + ' 次。' });
        }
        if (res.breakText) {
          this.pushLog({ kind: 'season', text: res.breakText });
        }
      },

      // ── 瞬态反馈层：只把既有结果翻译成 CSS 状态 ─────────────
      clearFeedback: function () {
        if (this.feedbackTimer) {
          g.clearTimeout(this.feedbackTimer);
          this.feedbackTimer = null;
        }
        this.feedbackClass = '';
        this.feedbackText = '';
        this.feedbackDetail = '';
      },
      setFeedback: function (className, title, detail, duration) {
        if (this.feedbackTimer) g.clearTimeout(this.feedbackTimer);
        this.feedbackClass = className || '';
        this.feedbackText = title || '';
        this.feedbackDetail = detail || '';
        this.feedbackKey = (this.feedbackKey || 0) + 1;
        if (!className && !title) {
          this.feedbackTimer = null;
          return;
        }
        var self = this;
        this.feedbackTimer = g.setTimeout(function () {
          self.feedbackClass = '';
          self.feedbackText = '';
          self.feedbackDetail = '';
          self.feedbackTimer = null;
        }, duration || 900);
      },
      feedbackFromResult: function (res) {
        if (!res) return;
        var classes = [];
        var title = '';
        var detail = '';
        var duration = 850;

        if (res.seasonEnd && res.seasonEnd.verdict) {
          var verdict = res.seasonEnd.verdict;
          classes.push('season-' + verdict);
          title = verdict === 'extend' ? '加更启动' :
            verdict === 'renew' ? '续订通过' : '腰斩 / 信号退潮';
          detail = 'S' + res.seasonEnd.season + ' · ' + res.seasonEnd.name;
          duration = 1200;
        }

        if (res.routePick && res.planPick) {
          var plan = res.planPick;
          classes.push('route-lock');
          if (plan.hidden) {
            classes.push('hidden-track');
            title = '隐藏信号已锁定';
            detail = '路线已写入本季节目单';
          } else if ((plan.matchedCast || []).length) {
            classes.push('deck-synergy');
            title = '构筑合拍';
            detail = '路线锁定 · ' + plan.matchedCast.map(function (c) {
              return (c.emoji || '') + c.name;
            }).join(' / ');
          } else {
            title = '路线锁定';
            detail = plan.label || plan.text || '节目牌已写入本季';
          }
          duration = 1100;
        }

        if (res.relations && res.relations.length) {
          classes.push('relation-shift');
          if (!title) {
            title = '关系发生变化';
            detail = this.relationText(res.relations[0]);
          }
        }

        if (res.score) {
          var total = Number(res.score.total) || 0;
          var burst = total >= 3000 ||
            !!(this.state && this.state.peak && this.state.peak.total === total && total >= 1000);
          classes.push('score-pulse');
          if (burst) classes.push('score-burst');
          if (!title) title = burst ? '收视爆发' : '收视入账';
          if (!detail) detail = '本年 +' + (this.fmt ? this.fmt(total) : String(total));
        }

        if (res.fx && res.fx.length && res.fx[0].name === 'sig-bad') {
          classes.push('signal-glitch');
          if (!title) {
            title = '信号异常';
            detail = '内容仍在继续';
          }
        }

        if (classes.length) this.setFeedback(classes.join(' '), title, detail, duration);
      },

      // ── 主循环 ──────────────────────────────────────
      step: function (choiceIndex, chosenOverride) {
        var chosen = chosenOverride || null;
        if (!chosen && choiceIndex != null && this.result && this.result.options.length) {
          chosen = this.result.options[choiceIndex];
        }
        var r = BH.run.advance(this.state, choiceIndex);
        this.state = r.state;
        this.result = r.result;
        if (chosen) this.result.chosenText = chosen.text || chosen.label;
        this.phase = r.result.phase;
        this.applyFx(r.result);
        this.logFromResult(this.result);
        if (this.phase === 'ENDING') this.finish();
      },
      choose: function (i) { this.step(i); },
      choosePlan: function (i) {
        var plan = this.planOffers[i];
        this.step({ type: 'plan', index: i }, plan || null);
      },
      cont: function () {
        if (this.phase === 'SEASON_END') {
          var r = BH.run.commitSeason(this.state);
          this.state = r.state;
          this.result = Object.assign({}, this.result, r.result);
          this.phase = r.result.phase;
          this.feedbackFromResult(r.result);
          if (r.result.text) this.pushLog({ kind: 'season', text: r.result.text });
          // 达标后进入三选一（19-tension.md §1.2）
          if (r.result.reward) {
            this.seasonReward = r.result.reward;
            this.phase = 'REWARD';
          }
          if (this.phase === 'ENDING') this.finish();
          return;
        }
        if (this.phase === 'REWARD') return;
        if (this.phase === 'REVIVE') {
          var rv = BH.run.commitRevive(this.state);
          this.state = rv.state;
          this.phase = 'YEAR';
          this.result = null;
          return;
        }
        this.step(null);
      },
      finish: function () {
        var r = BH.run.commitEnding(this.state);
        this.state = r.state;
        this.phase = 'SETTLEMENT';
        this.recordRun();
        if (this.state.final.trueEnding) {
          this.setFeedback('ending-true', '评分框架退出', '普通的一天不再被打分', 1600);
        } else if (this.state.final.rating >= 4.5) {
          this.setFeedback('ending-high', '高分终局', '观众评分 ' + this.state.final.rating.toFixed(1), 1500);
        } else {
          this.setFeedback('ending-cut', '终局评分', this.state.final.rating.toFixed(1), 1200);
        }
      },

      // ── 信号层（15-signal-fx.md，A 期只做 CSS 部分）────
      applyFx: function (res) {
        var self = this;
        this.clearFeedback();
        this.shatter = false;
        var cue = res.fx && res.fx.length ? res.fx[0] : null;
        this.fxClass = cue ? cue.name : '';
        if (cue) {
          // 单次 ≤ 800ms，且点击可打断（下一次 step 会覆盖）
          this.shatter = true;
          g.setTimeout(function () { self.shatter = false; }, 700);
        }
        this.feedbackFromResult(res);
      },
      shatterStyle: function (i) {
        var rnd = function (n) { return (Math.sin(i * 12.9898 + n) * 43758.5453) % 1; };
        return {
          '--i': i,
          '--dx': (rnd(1) * 40 - 20).toFixed(1) + 'px',
          '--dy': (Math.abs(rnd(2)) * 34 + 6).toFixed(1) + 'px',
          '--rot': (rnd(3) * 60 - 30).toFixed(1) + 'deg',
        };
      },

      // ── 结算与抽卡 ──────────────────────────────────
      recordRun: function () {
        var f = this.state.final;
        this.save.found = this.save.found || {};
        var found = this.save.found;
        ['track', 'ending', 'event', 'line', 'plan'].forEach(function (key) {
          if (!Array.isArray(found[key])) found[key] = [];
        });
        var knownTracks = found.track;
        var knownEndings = found.ending;
        var newTracks = Object.keys(this.state.TRACK || {}).filter(function (id) {
          return knownTracks.indexOf(id) === -1;
        }).length;
        var newEnding = f.endingId && knownEndings.indexOf(f.endingId) === -1 ? 1 : 0;
        var material = BH.gacha && BH.gacha.materialBreakdown
          ? BH.gacha.materialBreakdown(f, {
            firstTracks: newTracks,
            firstEndings: newEnding,
            cancelled: this.state.cancelCount > 0,
          })
          : { total: BH.gacha && BH.gacha.material ? BH.gacha.material(f) : 0 };
        this.runMaterialGain = material.total;
        this.runMaterialBreakdown = material;
        this.save.stats = this.save.stats || { runs: 0, best: 0, cancelled: 0, recentSeeds: [] };
        this.save.stats.runs = Number(this.save.stats.runs) || 0;
        this.save.stats.best = Number(this.save.stats.best) || 0;
        this.save.stats.cancelled = Number(this.save.stats.cancelled) || 0;
        if (!Array.isArray(this.save.stats.recentSeeds)) this.save.stats.recentSeeds = [];
        this.save.stats.runs++;
        if (f.rating != null && f.rating > this.save.stats.best) {
          this.save.stats.best = f.rating;
        }
        if (this.state.cancelCount >= 2) this.save.stats.cancelled++;

        // dev=1 只记录到独立的开发存档，不能产出素材、发现轨道或结局。
        // 这样调试固定 seed 不会污染玩家的真实解锁池（14-content-api.md §6.3）。
        if (this.dev) {
          BH.save.save(this.save, true);
          return;
        }

        this.save.material += material.total;
        var addUnique = function (list, id) {
          if (id && list.indexOf(id) === -1) list.push(id);
        };
        var self = this;
        Object.keys(this.state.TRACK || {}).forEach(function (t) {
          addUnique(self.save.found.track, t);
        });
        (this.state.EVT || []).forEach(function (id) {
          addUnique(self.save.found.event, id);
        });
        Object.keys(this.state.ELINE || {}).forEach(function (lineId) {
          var prog = self.state.ELINE[lineId] || {};
          if (prog.stage > 0 || prog.done || prog.forkId != null || prog.reunited || prog.missed) {
            addUnique(self.save.found.line, lineId);
          }
        });
        (this.state.PLANLOG || []).forEach(function (id) {
          addUnique(self.save.found.plan, id);
        });
        addUnique(this.save.found.ending, f.endingId);

        var seed = BH.Rng.normalizeSeed(this.state.seed || this.seedInput);
        if (seed) {
          this.save.stats.recentSeeds = [seed].concat(
            this.save.stats.recentSeeds.filter(function (known) { return known !== seed; })
          ).slice(0, 12);
        }
        BH.save.save(this.save, false);
      },
      toGacha: function () {
        this.phase = 'GACHA';
        if (this.dev) {
          this.gachaResult = {
            dev: true, tier: 1, emoji: '🧪', label: '开发模式',
            typeName: '不写入解锁池', dup: false,
          };
          return;
        }
        this.gachaResult = BH.gacha.draw(this.state, this.save, this.seedInput);
        if (this.gachaResult) BH.save.save(this.save, false);
      },
      takeReward: function (i) {
        var opt = this.seasonReward && this.seasonReward.options
          ? this.seasonReward.options[i] : null;
        var r = BH.run.applyReward(this.state, this.seasonReward, i);
        this.state = r.state;
        this.pushLog({ kind: 'reward', text: r.result.text });
        this.seasonReward = null;
        this.phase = this.state.phase;
        this.result = null;
        var type = opt && opt.type;
        var rewardClass = type === 'cast' || type === 'trade'
          ? 'reward-cast' : type === 'extend' ? 'reward-extend' : 'reward-pick';
        this.setFeedback(rewardClass,
          type === 'cast' || type === 'trade' ? '构筑更新' : '奖励已锁定',
          opt ? opt.label : r.result.text, 1050);
      },
      restart: function () {
        this.clearFeedback();
        this.state = null;
        this.result = null;
        this.gachaResult = null;
        this.runMaterialGain = 0;
        this.runMaterialBreakdown = null;
        this.log = [];
        this.seasonReward = null;
        this.archiveReturn = 'BOOT';
        this.archiveTab = 'track';
        this.seedInput = BH.Rng.makeSeed();
        this.phase = 'BOOT';
      },
      relationText: function (rel) {
        var R = BH.registry;
        var npc = R.has('npcs', rel.id) ? R.get('npcs', rel.id) : null;
        var name = npc ? (npc.emoji || '') + npc.name : rel.id;
        var move = rel.delta > 0 ? '靠近' : '拉远';
        var band = rel.axis >= 4 ? '靠近' : rel.axis <= -4 ? '疏远' : rel.axis > 0 ? '有来往' : rel.axis < 0 ? '别扭' : '未定';
        return name + ' · ' + move + ' ' + (rel.delta > 0 ? '+' : '') + rel.delta + ' · 现在：' + band;
      },
      nameOf: function (kind, id) {
        var R = BH.registry;
        if (!R.has(kind, id)) return id;
        var o = R.get(kind, id);
        return (o.emoji || '') + o.name;
      },
      isUnlocked: function (type, id) {
        var unlocked = this.save && this.save.unlocked;
        return !!(unlocked && Array.isArray(unlocked[type]) &&
          unlocked[type].indexOf(id) !== -1);
      },
      fmt: function (n) {
        if (n == null) return '—';
        if (n >= 10000) return (n / 10000).toFixed(1) + ' 万';
        return String(Math.round(n));
      },
      votes: function (state) { return BH.title.votes(state); },
      rarityCn: function (r) { return BH.run.RARITY_CN[r] || r; },
      riskCn: function (r) {
        return { low: '低风险', medium: '中风险', high: '高风险' }[r] || r;
      },
      audienceCn: function (a) {
        return { steady: '稳', swing: '波动', burst: '爆发' }[a] || a || '波动';
      },
      matchedCastText: function (plan) {
        return (plan.matchedCast || []).map(function (c) {
          return (c.emoji || '') + c.name;
        }).join(' / ');
      },
      // 浮点误差修正：0.2+0.6+1.0 会算出 1.7999999999999998
      n1: function (v) { return Math.round(Number(v) * 10) / 10; },
      n2: function (v) { return Math.round(Number(v) * 100) / 100; },
      hasStorage: function () { return BH.save.hasStorage(); },
    },
  };

  BH.mount = function () {
    Vue.createApp(App).mount('#app');
  };
  // 仅暴露相位方法供无 DOM 的契约测试调用；生产 UI 仍只通过 mount 使用。
  BH._uiApp = App;
})(typeof globalThis !== 'undefined' ? globalThis : this);
