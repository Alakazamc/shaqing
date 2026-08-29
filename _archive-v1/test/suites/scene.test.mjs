/* A59–A65：场景契约与一次性结算；119+ 为精神/异常补充断言 */
import { group, test, eq, ok } from '../harness.mjs';

function sceneStart(BH) {
  const made = BH.run.create({ seed: 'SCENE-FIXTURE', family: 'fam_shancun',
    sex: 'sex_nv', persona0: 'per_ningba', talents: ['tal_jixinghao'] });
  const s = made.state;
  s.phase = 'YEAR';
  s.age = 30;
  s.season = 4;
  s.AUD = 30;
  s.JOB = 'job_zhuguan'; // 跳过入职保底，直达平台关系线
  s.JOBLOG = ['job_wenyuan', 'job_zhuguan'];
  s.FLAG = s.FLAG.filter((x) => x !== 'f_shancun'); // 避免 NPC 线抢先
  return s;
}

export function runSceneTests(BH) {
  const R = BH.registry;
  const Run = BH.run;
  const St = BH.state;

  group('4.9 场景模式');

  test(59, '场景 beat 存在、kind=beat 且 noRandom', () => {
    R.list('eventlines').forEach((el) => Object.values(el.scenes || {}).forEach((sc) => {
      (sc.beats || []).forEach((id) => {
        ok(R.has('events', id), el.id + ' beat 不存在 ' + id);
        const e = R.get('events', id);
        eq(e.kind, 'beat', id + ' kind');
        eq(e.noRandom, true, id + ' noRandom');
      });
    }));
  });

  test(60, '场景 beats 为 3–6 个，键落在 1…stages', () => {
    R.list('eventlines').forEach((el) => Object.keys(el.scenes || {}).forEach((key) => {
      const n = Number(key);
      ok(n >= 1 && n <= el.stages, el.id + ' 场景键越界');
      const len = (el.scenes[key].beats || []).length;
      ok(len >= 3 && len <= 6, el.id + ' beat 数 ' + len);
    }));
  });

  test(61, '每个场景 beat 文本不超过 30 字', () => {
    R.list('eventlines').forEach((el) => Object.values(el.scenes || {}).forEach((sc) => {
      (sc.beats || []).forEach((id) => {
        const text = R.get('events', id).text.replace(/\s/g, '');
        ok(text.length <= 30, id + ' 文本 ' + text.length + ' 字');
      });
    }));
  });

  test(62, '每场景带 options 的 beat 数为 1–2', () => {
    R.list('eventlines').forEach((el) => Object.values(el.scenes || {}).forEach((sc) => {
      const n = (sc.beats || []).filter((id) => (R.get('events', id).options || []).length).length;
      ok(n >= 1 && n <= 2, el.id + ' 有选项 beat 数 ' + n);
    }));
  });

  test(63, '单局场景数上限是引擎常量 4，达到上限后不再取 scene', () => {
    eq(Run.MAX_SCENES_PER_RUN, 4);
    const s = sceneStart(BH);
    s.age = 31;
    s.sceneCount = 4;
    s.ELINE = { el_pingtai: { stage: 1, forkId: null, forkStage: 0, lastYear: 30 } };
    const due = Run._dueEventline(s);
    ok(due && due.line.id === 'el_pingtai', 'fixture 应命中平台线');
    eq(due.scene, null, '达到场景上限后必须降级为普通事件');
  });

  test(64, '带 restraint 的场景 beat 同时带 escalate 选项', () => {
    R.list('eventlines').forEach((el) => Object.values(el.scenes || {}).forEach((sc) => {
      (sc.beats || []).forEach((id) => {
        const opts = R.get('events', id).options || [];
        if (opts.some((o) => o.restraint)) ok(opts.some((o) => o.escalate), id + ' 缺 escalate');
      });
    }));
  });

  test(65, '场景 B 逐 beat 累加，且只调用一次年度计分/写入一次 WLOG', () => {
    let s = sceneStart(BH);
    let r = Run.advance(s, null);
    s = r.state;
    ok(r.result.options.length >= 2, '平台第一拍应有决策选项');
    r = Run.advance(s, 0); // 平台线第一阶段
    s = r.state;
    const beforeWlog = s.WLOG.length;
    r = Run.advance(s, null); // 进入场景，返回第一拍
    s = r.state;
    eq(r.result.phase, 'SCENE');

    const original = BH.scoring.year;
    let calls = 0;
    BH.scoring.year = function (args) { calls++; return original(args); };
    try {
      let current = r;
      while (current.state.phase === 'SCENE') {
        const choice = current.result.options.length ? 0 : null;
        current = Run.advance(current.state, choice);
      }
      s = current.state;
      r = current;
    } finally {
      BH.scoring.year = original;
    }
    eq(calls, 1, '一个场景只能结算一次年度收视');
    eq(s.WLOG.length, beforeWlog + 1, '一个场景只能写入一个水位');
    eq(r.result.score.B, 176, '五拍桥段与最后加码及场上人设桥段应累加为 176');
    ok(r.result.score.M >= 1, '场景结算应有倍率');
  });

  group('4.10 精神指数与异常轨道（补充）');

  test(119, '精神指数五档边界与双向极端记录正确', () => {
    [[-5, 0], [0, 0], [1, 1], [4, 1], [5, 2], [11, 2],
      [12, 3], [16, 3], [17, 4], [20, 4]].forEach(([v, band]) => {
      eq(St.spiritBand(v), band, 'SPR=' + v);
    });
    const low = St.create({ stats: { SPR: 3 } });
    St.applyEffect(low, { SPR: -10 });
    eq(low.SPR, -5);
    eq(low.sprLow, true);
    const high = St.create({ stats: { SPR: 16 } });
    St.applyEffect(high, { SPR: 10 });
    eq(high.SPR, 20);
    eq(high.sprHigh, true);
  });

  test(120, '精神属性条件可用，常态档不额外打开两端轨道', () => {
    const C = BH.condition;
    const low = St.create({ stats: { SPR: 0 } });
    const flat = St.create({ stats: { SPR: 8 } });
    const keen = St.create({ stats: { SPR: 12 } });
    ok(C.check(low, 'SPRBAND=0'));
    ok(C.check(keen, 'SPRBAND>=3'));
    ok(C.check(flat, 'SPRBAND=2'));
    ok(!C.check(flat, 'SPRBAND<=1'));
    ok(!C.check(flat, 'SPRBAND>=3'));
  });

  test(121, '异常轨道入口隐藏且不以 SEX 为门槛', () => {
    const ids = ['shourong', 'houshi', 'yeli', 'pifeng', 'qiyue', 'mofa', 'lingyi'];
    ids.forEach((id) => {
      const t = R.get('tracks', id);
      eq(t.hidden, true, id + ' 必须 hidden');
      ok(!/\bSEX\b/.test(t.entry || ''), id + ' 入口不得引用 SEX');
    });
  });

  test(122, '后室冻结 AUD；夜里的人声明寿命增益与 AUD 上限', () => {
    const back = R.get('tracks', 'houshi');
    eq(back.audFrozen, true);
    R.list('events').filter((e) => (e.include || '').includes('TRACK=["houshi"]'))
      .forEach((e) => (e.options || []).forEach((o) => {
        ok(!(o.effect && Number(o.effect.AUD) > 0), e.id + ' 不得给后室增加 AUD');
      }));
    const yeli = R.get('tracks', 'yeli');
    eq(yeli.lifespan, 120);
    eq(yeli.audCap, 30);
    const s = sceneStart(BH);
    s.AUD = 90;
    s.TRACK.yeli = 1;
    BH.run._applyOption(s, { effect: { AUD: 20 } }, 'test:yeli');
    eq(s.audCap, 30);
    eq(s.AUD, 30, '应用夜里的人规则时也要收紧已有 AUD');
    eq(s.lifespan, BH.run.BASE_LIFESPAN + 120);
  });

  test(123, '时间循环有六个普通选项、唯一出口且没有 restraint', () => {
    const loop = R.get('events', 'e_qy_loop');
    const opts = loop.options || [];
    eq(opts.filter((o) => !o.breaks).length, 6);
    eq(opts.filter((o) => o.breaks).length, 1);
    ok(!opts.some((o) => o.restraint));
  });
}
