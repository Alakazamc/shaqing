/* badhand — 极简测试骨架
 * 无框架依赖：node test/run-tests.mjs 裸跑（09-vertical-slice.md §3）
 */

const results = [];
let currentGroup = '';

export function group(name) {
  currentGroup = name;
}

/** @param {number} id 断言编号，对应 docs/modules/09-vertical-slice.md §4 */
export function test(id, name, fn) {
  try {
    fn();
    results.push({ id, name, group: currentGroup, ok: true });
  } catch (e) {
    results.push({
      id,
      name,
      group: currentGroup,
      ok: false,
      err: e && e.message ? e.message : String(e),
      stack: e && e.stack,
    });
  }
}

export function eq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(
      (msg ? msg + '：' : '') + '期望 ' + JSON.stringify(expected) + '，实际 ' + JSON.stringify(actual)
    );
  }
}

export function ok(v, msg) {
  if (!v) throw new Error(msg || '期望为真，实际为 ' + JSON.stringify(v));
}

export function close(actual, expected, tol, msg) {
  if (!(Math.abs(actual - expected) <= tol)) {
    throw new Error(
      (msg ? msg + '：' : '') + '期望 ' + expected + ' ±' + tol + '，实际 ' + actual
    );
  }
}

/** 断言 fn 抛出错误；可选校验错误类型名与消息片段 */
export function throws(fn, opts) {
  opts = opts || {};
  let threw = null;
  try {
    fn();
  } catch (e) {
    threw = e;
  }
  if (!threw) throw new Error('期望抛错，但没有抛');
  if (opts.name && threw.name !== opts.name) {
    throw new Error('期望错误类型 ' + opts.name + '，实际 ' + threw.name + '（' + threw.message + '）');
  }
  if (opts.match && String(threw.message).indexOf(opts.match) === -1) {
    throw new Error('错误消息应包含「' + opts.match + '」，实际：' + threw.message);
  }
  return threw;
}

export function report() {
  const pass = results.filter((r) => r.ok);
  const fail = results.filter((r) => !r.ok);
  let lastGroup = null;
  for (const r of results) {
    if (r.group !== lastGroup) {
      console.log('\n── ' + r.group);
      lastGroup = r.group;
    }
    const tag = r.ok ? 'PASS' : 'FAIL';
    console.log('  ' + tag + '  A' + r.id + '  ' + r.name);
    if (!r.ok) console.log('        ' + r.err);
  }
  console.log(
    '\n' + pass.length + ' 通过 / ' + fail.length + ' 失败 / 共 ' + results.length
  );
  const slice = results.filter((r) => r.id >= 1 && r.id <= 76);
  const extra = results.filter((r) => r.id < 1 || r.id > 76);
  console.log(
    '纵切片 A1–A76：' + slice.filter((r) => r.ok).length +
      ' 通过 / ' + slice.filter((r) => !r.ok).length +
      ' 失败 / 已注册 ' + slice.length + ' 条；补充断言：' + extra.length + ' 条'
  );
  // 编号重复检查：防止两条断言抢同一个编号
  const seen = new Map();
  for (const r of results) {
    if (seen.has(r.id)) {
      console.log('警告：断言编号 A' + r.id + ' 重复（' + seen.get(r.id) + ' / ' + r.name + '）');
    }
    seen.set(r.id, r.name);
  }
  return fail.length === 0;
}

/** 按依赖顺序加载 engine 的 classic script，之后读 globalThis.BH */
export async function loadEngine(files) {
  for (const f of files) {
    await import(new URL('../' + f, import.meta.url).href);
  }
  if (!globalThis.BH) throw new Error('加载后 globalThis.BH 不存在');
  return globalThis.BH;
}
