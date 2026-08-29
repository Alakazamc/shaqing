/* 断言 1–5：条件 DSL
 * 正典：docs/modules/03-events.md §1
 */
import { group, test, eq, ok, throws } from '../harness.mjs';

export function runConditionTests(BH) {
  const C = BH.condition;

  // 测试用状态与属性表。engine 不内置属性，由 state.js 注册；
  // 这里注册一套测试属性，验证机制本身。
  C._resetProps();
  C._clearCache();
  C.defineProp('AGE', (s) => s.age, 'scalar');
  C.defineProp('MNY', (s) => s.mny, 'scalar');
  C.defineProp('INT', (s) => s.int, 'scalar');
  C.defineProp('TRACK', (s) => s.track, 'scalar');
  C.defineProp('CAST', (s) => s.cast, 'list');
  C.defineProp('SCAR', (s) => s.scar, 'list');

  const S = {
    age: 23,
    mny: 12,
    int: 7,
    track: 'xiuxian',
    cast: ['cast_chouxiang', 'cast_zhuji'],
    scar: [],
  };

  group('4.1 条件 DSL');

  test(1, '标量比较：> < >= <= = !=', () => {
    ok(C.check(S, 'AGE>18'), 'AGE>18');
    ok(!C.check(S, 'AGE>23'), 'AGE>23 应为假');
    ok(C.check(S, 'AGE>=23'), 'AGE>=23');
    ok(C.check(S, 'MNY<20'), 'MNY<20');
    ok(C.check(S, 'MNY<=12'), 'MNY<=12');
    ok(C.check(S, 'AGE=23'), 'AGE=23');
    ok(C.check(S, 'AGE!=24'), 'AGE!=24');
    ok(C.check(S, 'AGE>=18 & MNY>10'), '& 组合');
    ok(C.check(S, 'AGE>99 | MNY>10'), '| 组合');
  });

  test(2, '数组语义：= 包含 / ? 交集非空 / ! 交集为空', () => {
    ok(C.check(S, 'CAST=["cast_zhuji"]'), '单元素数组等价于包含');
    ok(!C.check(S, 'CAST=["cast_none"]'), '不包含');
    ok(C.check(S, 'CAST!=["cast_none"]'), '!= 不包含');
    ok(C.check(S, 'CAST?["cast_none","cast_zhuji"]'), '? 交集非空');
    ok(!C.check(S, 'CAST?["cast_none"]'), '? 交集为空应为假');
    ok(C.check(S, 'CAST!["cast_none"]'), '! 交集为空');
    ok(!C.check(S, 'CAST!["cast_zhuji"]'), '! 有交集应为假');
    // 标量属性用 ? 表示"值属于给定集合"
    ok(C.check(S, 'TRACK?["xiuxian","dianjing"]'), '标量 ? 成员判定');
    ok(!C.check(S, 'TRACK!["xiuxian"]'), '标量 ! 成员判定');
    ok(C.check(S, 'SCAR!["scar_zhushui"]'), '空列表与任何集合无交集');
  });

  test(3, '括号分组被真正尊重（原作缺陷的修复点）', () => {
    // 构造状态：A 假、B 真、C 真
    //   (A & B) | C  → 真
    //   A & (B | C)  → 假
    // 原作的左到右求值会让两式相同，这里必须不同
    const st = { age: 10, mny: 12, int: 7, track: '', cast: [], scar: [] };
    const A = 'AGE>18';
    const B = 'MNY>10';
    const Cc = 'INT>5';
    ok(!C.check(st, A), '前提：A 为假');
    ok(C.check(st, B), '前提：B 为真');
    ok(C.check(st, Cc), '前提：C 为真');

    const left = C.check(st, '(' + A + ' & ' + B + ') | ' + Cc);
    const right = C.check(st, A + ' & (' + B + ' | ' + Cc + ')');
    eq(left, true, '(A & B) | C');
    eq(right, false, 'A & (B | C)');
    ok(left !== right, '两式必须给出不同结果，否则分组没有生效');
  });

  test(4, '同层混用 & 与 | 未加括号 → 解析期抛错', () => {
    throws(() => C.parse('AGE>18 & MNY>5 | INT>8'), {
      name: 'ContentError',
      match: '混用',
    });
    throws(() => C.parse('AGE>18 | MNY>5 & INT>8'), { name: 'ContentError' });
    // 加了括号就必须通过
    C.parse('AGE>18 & (MNY>5 | INT>8)');
    C.parse('(AGE>18 & MNY>5) | INT>8');
    // 同一运算符连用不算混用
    C.parse('AGE>18 & MNY>5 & INT>3');
    C.parse('AGE>99 | MNY>99 | INT>3');
  });

  test(5, '未登记属性键 → 抛错，不静默当 0', () => {
    throws(() => C.parse('NOSUCH>1'), {
      name: 'ContentError',
      match: '未登记的属性键',
    });
    // 错误信息要列出已登记的键，便于内容作者自查
    const e = throws(() => C.parse('NOSUCH>1'));
    ok(e.message.indexOf('AGE') !== -1, '错误信息应列出已登记属性');
  });

  group('4.1 条件 DSL — 健壮性');

  test(100, '语法错误全部抛 ContentError 而不是静默', () => {
    throws(() => C.parse('AGE>'), { name: 'ContentError' });
    throws(() => C.parse('>18'), { name: 'ContentError' });
    throws(() => C.parse('AGE'), { name: 'ContentError' });
    throws(() => C.parse('(AGE>18'), { name: 'ContentError' });
    throws(() => C.parse('AGE>18)'), { name: 'ContentError' });
    throws(() => C.parse('AGE>18 &'), { name: 'ContentError' });
    throws(() => C.parse('AGE>18 & & MNY>1'), { name: 'ContentError' });
    throws(() => C.parse('AGE>abc'), { name: 'ContentError' });
    throws(() => C.parse('CAST?[unclosed'), { name: 'ContentError' });
  });

  test(101, '运算符与属性类型不相容 → 解析期抛错', () => {
    throws(() => C.parse('CAST>3'), {
      name: 'ContentError',
      match: '不能用',
    });
    throws(() => C.parse('AGE?18'), {
      name: 'ContentError',
      match: '必须是数组',
    });
    throws(() => C.parse('CAST=["a","b"]'), {
      name: 'ContentError',
      match: '只能有一个元素',
    });
  });

  test(102, '空条件恒真；括号内 & | 与引号不被误当语法', () => {
    ok(C.check(S, ''), '空串恒真');
    ok(C.check(S, null), 'null 恒真');
    // 数组里的 & | ( ) 不是运算符
    C.defineProp('TAG', (s) => s.tag || [], 'list');
    const st = Object.assign({}, S, { tag: ['a&b', 'c|d', '(e)'] });
    ok(C.check(st, 'TAG?["a&b"]'), '数组值内的 & 不是运算符');
    ok(C.check(st, 'TAG?["c|d"]'), '数组值内的 | 不是运算符');
    ok(C.check(st, 'TAG?["(e)"]'), '数组值内的括号不是语法');
  });

  test(103, '属性注册表本身的校验', () => {
    throws(() => C.defineProp('lowercase', () => 1, 'scalar'), {
      name: 'ContentError',
    });
    throws(() => C.defineProp('DUP_X', () => 1, 'bogus'), {
      name: 'ContentError',
      match: 'kind',
    });
    throws(() => C.defineProp('DUP_Y', 'not-a-fn', 'scalar'), {
      name: 'ContentError',
    });
    C.defineProp('DUP_Z', () => 1, 'scalar');
    throws(() => C.defineProp('DUP_Z', () => 2, 'scalar'), {
      name: 'ContentError',
      match: '重复注册',
    });
  });

  test(104, '解析缓存不改变语义', () => {
    const a = C.parse('AGE>18 & MNY>10');
    const b = C.parse('AGE>18 & MNY>10');
    ok(a === b, '同一条件串应命中缓存返回同一 AST');
    ok(C.check(S, 'AGE>18 & MNY>10'), '缓存后求值仍正确');
  });
}
