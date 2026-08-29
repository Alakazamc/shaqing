/* 断言 6–14：计分
 * 正典：docs/SYSTEM.md §2 §3、docs/modules/01-scoring.md
 */
import { group, test, eq, ok, close } from '../harness.mjs';

export function runScoringTests(BH) {
  const Sc = BH.scoring;
  const St = BH.state;

  group('4.2 计分 — 年度公式');

  test(6, '结算顺序：同一 trope 首次出现 F = 1.0', () => {
    const r = Sc.year({
      chips: [{ label: 'e', value: 10 }],
      mults: [],
      aud: 10,
      tropeSeen: 0,
    });
    eq(r.fatigue, 1, 'F 应为 1.0');
    eq(r.B, 10);
    eq(r.M, 1);
    eq(r.aud, 1);
    eq(r.total, 10);
  });

  test(7, 'trope 疲劳：第 2 次 0.6，第 3 次 0.36', () => {
    close(Sc.year({ chips: [], mults: [], aud: 10, tropeSeen: 1 }).fatigue, 0.6, 1e-9);
    close(Sc.year({ chips: [], mults: [], aud: 10, tropeSeen: 2 }).fatigue, 0.36, 1e-9);
    close(Sc.year({ chips: [], mults: [], aud: 10, tropeSeen: 3 }).fatigue, 0.216, 1e-9);
  });

  test(8, 'M = (1 + Σadd) × Πmul，污点 ×0.85 参与', () => {
    const r = Sc.year({
      chips: [{ label: 'e', value: 49 }],
      mults: [
        { label: '抽象怪', mult: 0.8, kind: 'add' },
        { label: '大冤种', mult: 0.5, kind: 'add' },
        { label: '破防现场', mult: 2.0, kind: 'mul' },
      ],
      aud: 38,
      tropeSeen: 0,
    });
    close(r.M, 4.6, 1e-9, 'M = (1+1.3)×2.0');
    close(r.aud, 3.8, 1e-9);
    // 01-scoring.md §3.3 的算例：F=1 时应为 857
    eq(r.total, Math.round(49 * 4.6 * 3.8), 'R_year');
    eq(r.total, 857, '与正典算例一致');

    // 同一年第 2 次翻车 → 514
    const r2 = Sc.year({
      chips: [{ label: 'e', value: 49 }],
      mults: [
        { label: '抽象怪', mult: 0.8, kind: 'add' },
        { label: '大冤种', mult: 0.5, kind: 'add' },
        { label: '破防现场', mult: 2.0, kind: 'mul' },
      ],
      aud: 38,
      tropeSeen: 1,
    });
    eq(r2.total, 514, '与正典算例一致（F=0.6）');

    // 污点惩罚
    const r3 = Sc.year({
      chips: [{ label: 'e', value: 100 }],
      mults: [{ label: '注水', mult: 0.85, kind: 'mul' }],
      aud: 10,
      tropeSeen: 0,
    });
    close(r3.M, 0.85, 1e-9, '污点以乘法参与');
  });

  group('4.2 计分 — 振幅四道闸门');

  const flatAud = (n, v) => Array(n).fill(v);

  test(9, '单调 WLOG（一路上升 / 一路下降）→ Amp = 0.5', () => {
    const up = [10, 20, 30, 40, 50];
    const down = [50, 40, 30, 20, 10];
    eq(Sc.amplitude(up, flatAud(5, 40), null).amp, 0.5, '一路上升');
    eq(Sc.amplitude(down, flatAud(5, 40), null).amp, 0.5, '一路烂到底');
    // 完全平坦也是单调
    eq(Sc.amplitude([20, 20, 20, 20], flatAud(4, 40), null).amp, 0.5, '一路平顺');
  });

  test(10, '段幅超过 0.8 被截断', () => {
    // 1 → 100 是两个数量级，单段应被截到 0.8
    const w = [1, 100, 1];
    const res = Sc.amplitude(w, flatAud(3, 200), null);
    ok(res.segments.length === 2, '应切成两段');
    close(res.segments[0].a, 0.8, 1e-9, '第一段被 cap');
    close(res.segments[1].a, 0.8, 1e-9, '第二段被 cap');
  });

  test(11, '全程低 AUD（童年式自残）→ Amp 接近下限', () => {
    const w = [10, 40, 10, 40];
    const lowAud = flatAud(4, 3);   // 童年 AUD ≈ 3
    const highAud = flatAud(4, 40);
    const low = Sc.amplitude(w, lowAud, null).amp;
    const high = Sc.amplitude(w, highAud, null).amp;
    const FLOOR = 0.5;
    ok(low < high, '低观众时振幅收益必须显著更低');
    // 有意义的判据是"超出下限的部分"之比，而不是绝对值
    ok(
      low - FLOOR < 0.15 * (high - FLOOR),
      '低观众的振幅增益应不足高观众的 15%，实际 ' +
        (low - FLOOR).toFixed(3) + ' vs ' + (high - FLOOR).toFixed(3)
    );
    ok(low < 0.85, '低观众振幅应贴近下限，实际 ' + low);
    ok(high > 2.5, '高观众振幅应明显抬升，实际 ' + high);
  });

  test(12, '同一 (起点trope, 终点trope) 组合第二次 → 该段 ×0.5', () => {
    const w = [10, 40, 10, 40, 10];
    const aud = flatAud(5, 40);
    // 每段起终点 trope 相同 → 第 2 次及以后应被折半
    const tropes = ['zican', 'baofu', 'zican', 'baofu', 'zican'];
    const res = Sc.amplitude(w, aud, tropes);
    ok(res.segments.length >= 3, '应有多段');
    const s0 = res.segments[0];
    const s2 = res.segments[2];
    eq(s0.r, 1, '首次组合不打折');
    eq(s2.r, 0.5, '重复组合折半');
    ok(s2.contrib < s0.contrib, '重复段贡献必须更低');
  });

  group('4.2 计分 — 贯彻与反讽');

  test(13, 'Com：3 条轨道且全部 depth ≤ 2 → 强制 0.5', () => {
    eq(
      Sc.commitment({
        dominantDecisions: 4,
        totalDecisions: 6,
        depth: 2,
        maxDepth: 5,
        trackDepths: { a: 2, b: 1, c: 2 },
      }),
      0.5,
      '什么都试了一下'
    );
    // 一条道走到黑应显著更高
    const deep = Sc.commitment({
      dominantDecisions: 6,
      totalDecisions: 6,
      depth: 5,
      maxDepth: 5,
      trackDepths: { a: 5 },
    });
    ok(deep > 2.5, '纯度与深度都满时应接近上限，实际 ' + deep);
    // 半途而废的修仙者 < 走火入魔的修仙者
    const half = Sc.commitment({
      dominantDecisions: 3,
      totalDecisions: 6,
      depth: 2,
      maxDepth: 5,
      trackDepths: { a: 2, b: 1 },
    });
    ok(half < deep, '半途而废必须劣于走到极致');
  });

  test(14, 'Iro：tag 交集 0/1/2/≥3 → 1.0/1.5/2.5/4.0', () => {
    const setup = ['网络', '失控', '山野', '献祭'];
    eq(Sc.irony([], setup), 1.0, '0 命中');
    eq(Sc.irony(['网络'], setup), 1.5, '1 命中');
    eq(Sc.irony(['网络', '失控'], setup), 2.5, '2 命中');
    eq(Sc.irony(['网络', '失控', '山野'], setup), 4.0, '3 命中');
    eq(Sc.irony(['网络', '失控', '山野', '献祭'], setup), 4.0, '4 命中仍为 4.0');
    // 首尾呼应额外 +0.5
    eq(Sc.irony(['网络'], setup, 'fanche', 'fanche'), 2.0, 'trope 呼应 +0.5');
    eq(Sc.irony(['网络'], setup, 'fanche', 'baofu'), 1.5, 'trope 不同不加');
  });

  group('4.2 计分 — 评分映射');

  test(105, '评分映射与正典表一致', () => {
    // pivot 实测回填为 2000（SYSTEM.md §3.4 / §8）
    close(Sc.rating(2000), 2.0, 0.05);
    close(Sc.rating(20000), 3.5, 0.05);
    close(Sc.rating(200000), 5.0, 0.05);
    close(Sc.rating(2000000), 6.5, 0.05);
    close(Sc.rating(20000000), 8.0, 0.05);
    // 07-settlement.md §1 的结算页样例：11.6 万 → 4.6
    close(Sc.rating(116000), 4.6, 0.1, '结算页样例');
    // 边界钳制
    eq(Sc.rating(1), 1.0, '下限');
    eq(Sc.rating(1e12), 9.9, '上限');
    eq(Sc.rating(0), 1.0, '零收视');
  });

  test(106, '真结局：rating 为 null 而不是 0', () => {
    const normal = Sc.final({
      seasonSums: [100, 500, 5000],
      amp: 2,
      com: 2,
      iro: 2,
      trueEnding: false,
    });
    ok(normal.rating !== null, '普通结局有评分');
    const tru = Sc.final({
      seasonSums: [100, 500, 5000],
      amp: 2,
      com: 2,
      iro: 2,
      trueEnding: true,
    });
    eq(tru.rating, null, '真结局必须是 null，UI 据此渲染 —');
    eq(tru.total, normal.total, '总收视照常计算，只是不给评分');
  });

  group('4.2 计分 — 水位');

  test(107, '水位公式填满 [1,100]，且好出身压缩上升空间', () => {
    const poor = St.create({ stats: { MNY: 0, SPR: 3 } });
    const rich = St.create({ stats: { MNY: 15, SPR: 10 } });
    rich.TRACK = { chuangye: 4 };
    const tracks = { chuangye: { socialWeight: 1.2 } };

    const wPoor = St.waterLevel(poor, tracks);
    const wRich = St.waterLevel(rich, tracks);
    ok(wPoor >= 1 && wPoor <= 100, '水位在范围内：' + wPoor);
    ok(wRich > wPoor, '富出身水位更高');

    // 11-origin.md §7：好出身往上的空间更小
    const roomPoor = Math.log10(100 / wPoor);
    const roomRich = Math.log10(100 / wRich);
    ok(roomRich < roomPoor, '富出身上升空间必须更小');
    ok(roomRich < 0.8, '富出身连一段满幅都不够：' + roomRich);

    // 极值必须真的能接近 100（旧公式的缺陷正是填不满）
    const maxed = St.create({ stats: { MNY: 20, SPR: 20 } });
    maxed.TRACK = { x: 10 };
    const wMax = St.waterLevel(maxed, { x: { socialWeight: 1 } });
    ok(wMax > 95, '极值应接近 100，实际 ' + wMax);
  });
}
