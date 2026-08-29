/* A25–A58：内容一致性、事件线、NPC、开局四项与抽卡 */
import { readFileSync } from 'node:fs';
import { group, test, eq, ok } from '../harness.mjs';

function optionsOf(R) {
  const out = [];
  R.list('events').forEach((e) => (e.options || []).forEach((o) => out.push({ e, o })));
  return out;
}

function allConditionStrings(BH) {
  const R = BH.registry;
  const out = [];
  R.list('events').forEach((e) => {
    ['include', 'exclude'].forEach((k) => { if (e[k]) out.push([e[k], e.id + '.' + k]); });
    (e.options || []).forEach((o, i) => {
      if (o.include) out.push([o.include, e.id + '.options[' + i + '].include']);
    });
  });
  R.list('tracks').forEach((x) => { if (x.entry) out.push([x.entry, 'track:' + x.id]); });
  R.list('jobs').forEach((x) => { if (x.entry) out.push([x.entry, 'job:' + x.id]); });
  R.list('npcs').forEach((x) => { if (x.gate) out.push([x.gate, 'npc:' + x.id]); });
  return out;
}

function eventRefs(R) {
  const refs = new Set();
  R.list('events').forEach((e) => {
    (e.options || []).forEach((o) => {
      if (o.next) refs.add(o.next);
      if (o.grant && o.grant.loop) refs.add(o.grant.loop);
    });
  });
  R.list('eventlines').forEach((el) => {
    (el.chain || []).forEach((id) => refs.add(id));
    (el.forks || []).forEach((f) => (f.chain || []).forEach((id) => refs.add(id)));
    Object.values(el.scenes || {}).forEach((sc) => (sc.beats || []).forEach((id) => refs.add(id)));
    if (el.missEvent) refs.add(el.missEvent);
    if (el.reunion && el.reunion.event) refs.add(el.reunion.event);
  });
  R.list('npcs').forEach((n) => {
    if (n.exit) refs.add(n.exit);
    (n.exitEvents || []).forEach((id) => refs.add(id));
  });
  return refs;
}

export function runContentTests(BH) {
  const R = BH.registry;
  const C = BH.condition;
  const tags = new Set(Object.values(R.tags()).flat());
  const tropes = new Set(Object.keys(R.tropes()));

  group('4.5 内容一致性');

  test(25, '所有事件 tags/tropes 都在固定枚举内', () => {
    R.list('events').forEach((e) => {
      (e.tags || []).forEach((t) => ok(tags.has(t), e.id + ' 未登记 tag ' + t));
      (e.tropes || []).forEach((t) => ok(tropes.has(t), e.id + ' 未登记 trope ' + t));
    });
  });

  test(26, '所有 include/exclude 条件都可被 DSL 解析', () => {
    allConditionStrings(BH).forEach(([src, where]) => {
      try { C.validate(src); } catch (e) { throw new Error(where + '：' + e.message); }
    });
  });

  test(27, '所有 grant 的 cast/scar/track 引用都存在', () => {
    optionsOf(R).forEach(({ e, o }) => {
      const g = o.grant || {};
      (g.cast || []).forEach((id) => ok(R.has('cast', id), e.id + ' grant.cast ' + id));
      (g.scar || []).forEach((id) => ok(R.has('scars', id), e.id + ' grant.scar ' + id));
      Object.keys(o.track || {}).forEach((id) => ok(R.has('tracks', id), e.id + ' track ' + id));
      if (g.loop) ok(R.has('events', g.loop), e.id + ' loop ' + g.loop);
    });
  });

  test(28, '所有 next 都指向存在且 noRandom 的事件', () => {
    optionsOf(R).forEach(({ e, o }) => {
      if (!o.next) return;
      ok(R.has('events', o.next), e.id + ' next 不存在 ' + o.next);
      ok(R.get('events', o.next).noRandom === true, e.id + ' next 必须 noRandom');
    });
  });

  test(29, '每条死法至少两个 tag，且至少一个来自收尾组', () => {
    const endings = new Set(R.tags().收尾 || []);
    R.list('events').filter((e) => e.kind === 'death').forEach((e) => {
      ok((e.tags || []).length >= 2, e.id + ' 死法 tag 不足');
      ok((e.tags || []).some((t) => endings.has(t)), e.id + ' 缺收尾 tag');
    });
  });

  test(30, '每个 decision 事件有 2–3 个选项', () => {
    R.list('events').filter((e) => e.kind === 'decision').forEach((e) => {
      ok((e.options || []).length >= 2 && (e.options || []).length <= 3,
        e.id + ' 选项数不在 2–3');
    });
  });

  test(31, 'lexicon.js 的词条 id/term 都出现在 lexicon.md 表格', () => {
    const md = readFileSync(new URL('../../docs/content/lexicon.md', import.meta.url), 'utf8');
    R.list('lexicon').forEach((x) => {
      ok(md.includes('`' + x.id + '`'), x.id + ' 不在 lexicon.md');
      ok(md.includes('| ' + x.term + ' |'), x.term + ' 不在 lexicon.md');
    });
  });

  test(77, 'lexicon 词条具备受众、过期风险与替换元数据', () => {
    const activeScopes = new Set(['common', ...R.list('tracks').map((t) => t.lexiconScope)]);
    // 预留 scope 可以先承载 pending 词条，但未绑定轨道前不得进入事件正文。
    const reservedScopes = new Set(['workplace']);
    const scopes = new Set([...activeScopes, ...reservedScopes]);
    const risks = new Set(['low', 'mid', 'high']);
    const hotness = new Set(['settled', 'current', '待核']);
    const statuses = new Set(['confirmed', 'pending']);
    R.list('lexicon').forEach((x) => {
      ok(scopes.has(x.scope), x.id + ' scope 未登记：' + x.scope);
      ok(risks.has(x.risk) && x.expiryRisk === x.risk, x.id + ' risk 镜像不一致');
      ok(hotness.has(x.hotness), x.id + ' hotness 不合法');
      ok(statuses.has(x.reviewStatus), x.id + ' reviewStatus 不合法');
      ok(String(x.audience || '').trim(), x.id + ' 缺 audience');
      eq(x.replaceable, true, x.id + ' 必须可替换');
    });
  });

  test(78, '高风险词只进 review，castname 只允许 low 风险', () => {
    R.list('lexicon').forEach((x) => {
      if (x.risk === 'high') {
        ok((x.slot || []).every((slot) => slot === 'review'), x.id + ' high 词进入了非 review 槽位');
      }
      if ((x.slot || []).includes('castname')) {
        eq(x.risk, 'low', x.id + ' castname 不是 low 风险');
      }
    });
  });

  test(79, '选项 trope 也必须来自固定枚举', () => {
    R.list('events').forEach((e) => (e.options || []).forEach((o, i) => {
      (o.tropes || []).forEach((t) => ok(tropes.has(t),
        e.id + '.options[' + i + '] 未登记 trope ' + t));
    }));
  });

  test(80, 'EVT/JOBLOG 条件只回指已登记事件与职业', () => {
    const refs = allConditionStrings(BH);
    const re = /\b(EVT|JOBLOG)(?:!=|[?!=])\s*(\[[^\]]*\])/g;
    refs.forEach(([src, where]) => {
      let match;
      while ((match = re.exec(src))) {
        let ids;
        try { ids = JSON.parse(match[2]); } catch (error) {
          throw new Error(where + '：列表引用不是合法 JSON：' + match[2]);
        }
        ids.forEach((id) => {
          const exists = match[1] === 'EVT' ? R.has('events', id) : R.has('jobs', id);
          ok(exists, where + ' ' + match[1] + ' 回指不存在：' + id);
        });
      }
    });
  });

  test(81, 'archive plan 的 metaUnlock 只指向已登记轨道或 NPC', () => {
    const kinds = { track: 'tracks', npc: 'npcs' };
    const archives = R.list('plans').filter((p) => p.metaUnlock);
    eq(archives.length, 6, '当前应有 4 条轨道 + 2 条 NPC 档案牌');
    archives.forEach((p) => {
      ok(p.metaUnlock && kinds[p.metaUnlock.type], p.id + ' metaUnlock 类型非法');
      ok(typeof p.metaUnlock.id === 'string' && p.metaUnlock.id,
        p.id + ' metaUnlock 缺 id');
      ok(R.has(kinds[p.metaUnlock.type], p.metaUnlock.id),
        p.id + ' metaUnlock 目标不存在');
    });
  });

  test(32, '有 restraint 的事件同时有 escalate 选项', () => {
    R.list('events').forEach((e) => {
      const opts = e.options || [];
      if (!opts.some((o) => o.restraint)) return;
      ok(opts.some((o) => o.escalate), e.id + ' 没有同事件 escalate');
    });
  });

  test(33, '所有非 death 的 noRandom 事件都有引用来源', () => {
    const refs = eventRefs(R);
    R.list('events').filter((e) => e.noRandom && e.kind !== 'death').forEach((e) => {
      ok(refs.has(e.id), '孤儿事件 ' + e.id);
    });
  });

  group('4.6 事件线与分叉');

  test(36, '每条事件线 chain 事件存在且 noRandom', () => {
    R.list('eventlines').forEach((el) => (el.chain || []).forEach((id) => {
      ok(R.has('events', id), el.id + ' chain 缺 ' + id);
      ok(R.get('events', id).noRandom === true, id + ' 必须 noRandom');
    }));
  });

  test(37, '每条分叉 chain 非空，终点无 next', () => {
    R.list('eventlines').forEach((el) => (el.forks || []).forEach((f) => {
      ok(f.chain && f.chain.length > 0, el.id + ' 空分叉');
      const last = R.get('events', f.chain[f.chain.length - 1]);
      ok(!(last.options || []).some((o) => o.next), el.id + ' 分叉终点仍有 next');
    }));
  });

  test(38, '每条分叉 from 落在 1…stages-1', () => {
    R.list('eventlines').forEach((el) => (el.forks || []).forEach((f) => {
      ok(f.from >= 1 && f.from <= el.stages - 1, el.id + ' 分叉 from 越界');
    }));
  });

  test(39, '主链与每条分叉终点各至少授予一张人设牌', () => {
    R.list('eventlines').forEach((el) => {
      const ends = [el.chain[el.chain.length - 1]];
      (el.forks || []).forEach((f) => ends.push(f.chain[f.chain.length - 1]));
      ends.forEach((id) => {
        const e = R.get('events', id);
        ok((e.options || []).some((o) => o.grant && (o.grant.cast || []).length),
          el.id + ' 终点未授予 cast：' + id);
      });
    });
  });

  test(40, '每条分叉的轨道深度增量大于零', () => {
    R.list('eventlines').forEach((el) => (el.forks || []).forEach((f) => {
      ok(f.depth > 0, el.id + ' 分叉深度增量必须 >0');
    }));
  });

  test(41, '敏感题材事件线不显示 name', () => {
    const sensitive = new Set(['kuaxingbie', 'yaowu', 'dilei']);
    R.list('eventlines').filter((el) => sensitive.has(el.track)).forEach((el) => {
      eq(el.name, null, el.id + ' 敏感线 name 必须为 null');
    });
  });

  test(42, '敏感题材入口只允许 FLAG/EVT/AGE/SEASON 条件', () => {
    const sensitive = new Set(['kuaxingbie', 'yaowu', 'dilei']);
    const allowed = new Set(['FLAG', 'EVT', 'AGE', 'SEASON']);
    const re = /([A-Z][A-Z0-9_]*)\s*(?:>=|<=|!=|[><=?!])/g;
    R.list('eventlines').filter((el) => sensitive.has(el.track)).forEach((el) => {
      const entry = R.get('events', el.chain[0]).include || '';
      let m;
      while ((m = re.exec(entry))) ok(allowed.has(m[1]), el.id + ' 入口引用 ' + m[1]);
    });
  });

  group('4.7 NPC 与开局四项');

  test(44, 'NPC eventline 存在，且 scope 与对应轨道 lexiconScope 相容', () => {
    R.list('npcs').forEach((n) => {
      ok(R.has('eventlines', n.eventline), n.id + ' eventline 不存在');
      const el = R.get('eventlines', n.eventline);
      const tr = R.get('tracks', el.track);
      eq(n.scope, tr.lexiconScope, n.id + ' scope 与 track 不相容');
    });
  });

  test(45, '每个 NPC 的 exit 在其关系线中恰好出现一次', () => {
    R.list('npcs').forEach((n) => {
      const el = R.get('eventlines', n.eventline);
      const ids = (el.chain || []).concat(...(el.forks || []).map((f) => f.chain || []));
      eq(ids.filter((id) => id === n.exit).length, 1, n.id + ' exit 不唯一');
      ok(R.has('events', n.exit), n.id + ' exit 不存在');
    });
  });

  test(46, '所有 NPC 关系线事件都 noRandom', () => {
    R.list('npcs').forEach((n) => {
      const el = R.get('eventlines', n.eventline);
      const ids = (el.chain || []).concat(...(el.forks || []).map((f) => f.chain || []));
      ids.forEach((id) => eq(R.get('events', id).noRandom, true, id + ' 不是 noRandom'));
    });
  });

  test(47, 'NPC 关系推进事件（入口除外）引用 NPC/NPCAX/NPCKNOWN', () => {
    R.list('npcs').forEach((n) => {
      const el = R.get('eventlines', n.eventline);
      const ids = (el.chain || []).slice(1).concat(...(el.forks || []).map((f) => f.chain || []));
      ids.forEach((id) => {
        const src = R.get('events', id).include || '';
        ok(/NPC/.test(src), id + ' include 未引用 NPC 状态');
      });
    });
  });

  test(48, '每个 NPC 的 bio/voice/never 非空', () => {
    R.list('npcs').forEach((n) => {
      ['bio', 'voice', 'never'].forEach((k) => ok(String(n[k] || '').trim(), n.id + ' 缺 ' + k));
    });
  });

  test(49, '运行时同时在场 NPC 不超过 5 个', () => {
    const s = BH.run.create({ seed: 'NPC-LIMIT' }).state;
    s.NPC = ['a', 'b', 'c', 'd', 'e'];
    s.NPCAX = { a: { axis: 1, stage: 1 }, b: { axis: 1, stage: 1 },
      c: { axis: 1, stage: 1 }, d: { axis: 1, stage: 1 }, e: { axis: 1, stage: 1 } };
    s.NPCGONE = [];
    BH.run._syncNpc(s, 'el_qishou', null);
    ok(s.NPC.length <= 5, 'syncNpc 不能突破 5 人上限');
  });

  test(50, '每个家庭旗标至少被轨道入口或事件条件引用', () => {
    const source = R.list('events').map((e) => (e.include || '') + ' ' + (e.exclude || ''))
      .concat(R.list('tracks').map((t) => t.entry || '')).join(' ');
    R.origins().family.forEach((f) => (f.flags || []).forEach((flag) => {
      ok(source.includes(flag), f.id + ' 旗标未被引用：' + flag);
    }));
  });

  test(51, '每个性格项同时有正向与负向字段', () => {
    R.origins().personality.forEach((p) => {
      const positive = Number(p.addMult || 0) > 0 || Number(p.addDrama || 0) > 0;
      const negative = Object.values(p.effect || {}).some((v) => Number(v) < 0);
      ok(positive && negative, p.id + ' 缺正向或负向字段');
    });
  });

  test(52, '两个性别的观众汇率非空且各有低于 1 的项目', () => {
    R.origins().sex.forEach((s) => {
      const rates = Object.values(s.audRate || {});
      ok(rates.length > 0, s.id + ' 缺 audRate');
      ok(rates.some((v) => Number(v) < 1), s.id + ' 没有被低估的属性');
    });
  });

  test(53, '所有轨道入口不引用 SEX', () => {
    R.list('tracks').forEach((t) => ok(!/\bSEX\b/.test(t.entry || ''), t.id + ' 入口引用 SEX'));
  });

  group('4.8 抽卡');

  test(54, '每个抽卡 target 存在于对应内容表', () => {
    const originKinds = new Set(['family', 'sex', 'personality']);
    const kinds = { cast: 'cast', talent: 'talents', npc: 'npcs', track: 'tracks' };
    R.list('gacha').forEach((g) => {
      if (originKinds.has(g.type)) ok(R.origins()[g.type].some((x) => x.id === g.target), g.id + ' target');
      else ok(kinds[g.type] && R.has(kinds[g.type], g.target), g.id + ' target');
    });
  });

  test(55, '每个 scopes 值都在轨道 lexiconScope 枚举或 common 内', () => {
    const scopes = new Set(['common', ...R.list('tracks').map((t) => t.lexiconScope)]);
    R.list('gacha').forEach((g) => (g.scopes || []).forEach((s) => ok(scopes.has(s), g.id + ' scope ' + s)));
  });

  test(56, '每个 T2/T3 抽卡目标恰好被一个条目覆盖', () => {
    const counts = new Map();
    R.list('gacha').filter((g) => g.tier === 2 || g.tier === 3).forEach((g) => {
      const key = g.type + ':' + g.target;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    counts.forEach((n, key) => eq(n, 1, key + ' 覆盖次数'));
    ok(counts.size > 0, 'A 期抽卡池必须有 T2/T3 项');
  });

  test(57, '抽卡池不含 ending 条目', () => {
    R.list('gacha').forEach((g) => ok(g.type !== 'ending', g.id + ' 不能抽结局'));
  });

  test(58, '每个抽卡条目的 dupValue > 0', () => {
    R.list('gacha').forEach((g) => ok(g.dupValue > 0, g.id + ' 重复转化为空'));
  });
}
