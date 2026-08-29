/* badhand — 条件 DSL
 *
 * 语法：  AGE>=18 & (MNY>10 | CAST?["cast_zhuji"])
 * 正典：  docs/modules/03-events.md §1
 *
 * 与参考项目（ref/lifeRestart/src/functions/condition.js）的两处强制差异：
 *   (a) 括号分组必须被真正尊重。原作严格从左到右求值、无优先级，
 *       导致 A|B&C 实际是 (A|B)&C，不符合任何主流语言直觉，且静默出错。
 *   (b) 同层混用 & 与 | 且未加括号 → 解析期抛错。
 *       (b) 是主防线：歧义表达式根本不允许存在。
 *
 * 依赖：errors.js
 * classic script，挂载到 globalThis.BH。不使用 ES module。
 */
(function (g) {
  'use strict';
  var BH = (g.BH = g.BH || {});
  var contentFail = BH.contentFail;

  // ── 属性注册表 ────────────────────────────────────────────────
  // condition.js 只提供机制，不内置任何属性。
  // 内置属性由 state.js 注册（它才知道状态的形状），
  // 内容层新增属性走 BH.define.condProp（registry.js 委托到这里）。

  var props = Object.create(null);

  /**
   * @param {string} key    属性名，如 'AGE'
   * @param {(state:any)=>any} getter
   * @param {'scalar'|'list'} kind  决定运算符语义（03-events.md §1.2）
   */
  function defineProp(key, getter, kind) {
    if (typeof key !== 'string' || !/^[A-Z][A-Z0-9_]*$/.test(key)) {
      contentFail('属性键必须是大写字母开头的标识符：' + key, { key: key });
    }
    if (typeof getter !== 'function') {
      contentFail('属性 ' + key + ' 的 getter 必须是函数', { key: key });
    }
    if (kind !== 'scalar' && kind !== 'list') {
      contentFail('属性 ' + key + ' 的 kind 必须是 scalar 或 list', {
        key: key,
        kind: kind,
      });
    }
    if (props[key]) {
      contentFail('属性键重复注册：' + key, { key: key });
    }
    props[key] = { getter: getter, kind: kind };
  }

  function hasProp(key) {
    return !!props[key];
  }

  function propKind(key) {
    return props[key] ? props[key].kind : null;
  }

  function readProp(state, key) {
    var p = props[key];
    if (!p) contentFail('未登记的属性键：' + key, { key: key });
    return p.getter(state);
  }

  function propNames() {
    return Object.keys(props).sort();
  }

  /** 仅供测试使用：清空注册表 */
  function resetProps() {
    props = Object.create(null);
  }

  // ── 词法：切分成嵌套结构 ──────────────────────────────────────
  // 需要同时正确处理三件事：
  //   括号嵌套、方括号内的 & |（不是运算符）、引号内的字符（不是语法）

  var OPS = ['>=', '<=', '!=', '>', '<', '=', '?', '!'];

  /**
   * 把条件串切成嵌套的 token 数组。
   * 叶子是字符串（如 'AGE>=18'），分组是嵌套数组，运算符是 '&' / '|'。
   */
  function tokenize(src) {
    var root = [];
    var stack = [root];
    var buf = '';
    var bracket = 0; // [] 深度
    var quote = null; // 当前引号字符
    var i;

    function flush() {
      var s = buf.trim();
      buf = '';
      if (s) stack[stack.length - 1].push(s);
    }

    for (i = 0; i < src.length; i++) {
      var ch = src[i];

      // 引号内一切原样，包括 & | ( ) [ ]
      if (quote) {
        buf += ch;
        if (ch === quote && src[i - 1] !== '\\') quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        buf += ch;
        continue;
      }

      // 方括号内的 & | ( ) 不是语法
      if (ch === '[') {
        bracket++;
        buf += ch;
        continue;
      }
      if (ch === ']') {
        bracket--;
        if (bracket < 0) {
          contentFail('条件里出现多余的 ] ：' + src, { condition: src, at: i });
        }
        buf += ch;
        continue;
      }
      if (bracket > 0) {
        buf += ch;
        continue;
      }

      switch (ch) {
        case '(':
          flush();
          var sub = [];
          stack[stack.length - 1].push(sub);
          stack.push(sub);
          break;
        case ')':
          flush();
          if (stack.length === 1) {
            contentFail('条件里出现多余的 ) ：' + src, { condition: src, at: i });
          }
          stack.pop();
          break;
        case '&':
        case '|':
          flush();
          stack[stack.length - 1].push(ch);
          break;
        default:
          buf += ch;
      }
    }

    if (quote) {
      contentFail('条件里的引号没有闭合：' + src, { condition: src });
    }
    if (bracket !== 0) {
      contentFail('条件里的方括号没有闭合：' + src, { condition: src });
    }
    flush();
    if (stack.length !== 1) {
      contentFail('条件里的括号没有闭合：' + src, { condition: src });
    }
    return root;
  }

  BH.condition = {
    defineProp: defineProp,
    hasProp: hasProp,
    propNames: propNames,
    _propKind: propKind,
    _readProp: readProp,
    _resetProps: resetProps,
    _tokenize: tokenize,
    _OPS: OPS,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ── 语法：token → AST，并在此拒绝歧义表达式 ───────────────────── */
(function (g) {
  'use strict';
  var BH = g.BH;
  var contentFail = BH.contentFail;
  var C = BH.condition;

  /**
   * 把一层 token 数组转成 AST。
   *
   * 这里实现与原作的两处强制差异：
   *   (a) 分组递归下降，因此括号被真正尊重
   *   (b) 同层混用 & 与 | → 抛错
   */
  function build(tokens, src) {
    if (!Array.isArray(tokens)) return parseLeaf(tokens, src);

    // 空条件视为恒真。事件的 include 缺省时走这条
    if (tokens.length === 0) return { t: 'true' };

    if (tokens.length === 1) return build(tokens[0], src);

    // 形状必须是 操作数 (运算符 操作数)+
    if (tokens.length % 2 === 0) {
      contentFail('条件结构不完整（运算符缺少操作数）：' + src, { condition: src });
    }

    var ops = [];
    var i;
    for (i = 1; i < tokens.length; i += 2) {
      var op = tokens[i];
      if (op !== '&' && op !== '|') {
        contentFail('条件里应当是 & 或 | 的位置出现了：' + op, {
          condition: src,
          got: op,
        });
      }
      if (ops.indexOf(op) === -1) ops.push(op);
    }
    // 偶数位必须是操作数
    for (i = 0; i < tokens.length; i += 2) {
      if (tokens[i] === '&' || tokens[i] === '|') {
        contentFail('条件里出现连续的运算符：' + src, { condition: src });
      }
    }

    // (b) 主防线：同层混用必须加括号
    if (ops.length > 1) {
      contentFail(
        '同一层里混用了 & 与 |，必须显式加括号消歧：' +
          src +
          '\n  例：AGE>18 & (MNY>5 | INT>8)  或  (AGE>18 & MNY>5) | INT>8',
        { condition: src, ops: ops }
      );
    }

    var children = [];
    for (i = 0; i < tokens.length; i += 2) {
      children.push(build(tokens[i], src));
    }
    return { t: ops[0] === '&' ? 'and' : 'or', kids: children };
  }

  /* ── 叶子：PROP<op><value> ──────────────────────────────────── */

  function parseLeaf(raw, src) {
    // 找第一个运算符字符的位置
    var idx = raw.search(/[><!?=]/);
    if (idx <= 0) {
      contentFail('条件叶子缺少运算符或属性名：' + raw, {
        condition: src,
        leaf: raw,
      });
    }

    var key = raw.slice(0, idx).trim();
    var rest = raw.slice(idx);

    var op = null;
    var ops = C._OPS;
    for (var i = 0; i < ops.length; i++) {
      if (rest.indexOf(ops[i]) === 0) {
        op = ops[i];
        break;
      }
    }
    if (!op) {
      contentFail('无法识别的运算符：' + raw, { condition: src, leaf: raw });
    }

    var valueText = rest.slice(op.length).trim();
    if (valueText === '') {
      contentFail('运算符 ' + op + ' 后面缺少值：' + raw, {
        condition: src,
        leaf: raw,
      });
    }

    var value;
    if (valueText[0] === '[') {
      try {
        value = JSON.parse(valueText);
      } catch (e) {
        contentFail('条件里的数组值不是合法 JSON：' + valueText, {
          condition: src,
          leaf: raw,
        });
      }
      if (!Array.isArray(value)) {
        contentFail('以 [ 开头的值必须是数组：' + valueText, {
          condition: src,
          leaf: raw,
        });
      }
    } else {
      value = Number(valueText);
      if (!isFinite(value)) {
        contentFail(
          '条件里的值不是有限数字：' + valueText + '（字符串必须写在数组里）',
          { condition: src, leaf: raw }
        );
      }
    }

    // 属性必须已登记。绝不静默当 0（09-vertical-slice.md 断言 5）
    if (!C.hasProp(key)) {
      contentFail(
        '未登记的属性键：' + key + '\n  已登记：' + C.propNames().join(' '),
        { condition: src, leaf: raw, key: key }
      );
    }

    var kind = C._propKind(key);

    // 运算符与属性类型的相容性，在解析期查一次，运行期就不用再判
    if (op === '>' || op === '<' || op === '>=' || op === '<=') {
      if (kind !== 'scalar') {
        contentFail('列表属性 ' + key + ' 不能用 ' + op + ' 比较', {
          condition: src,
          leaf: raw,
        });
      }
      if (Array.isArray(value)) {
        contentFail(op + ' 的右值必须是数字：' + raw, {
          condition: src,
          leaf: raw,
        });
      }
    }

    if (op === '?' || op === '!') {
      if (!Array.isArray(value)) {
        contentFail(
          op + ' 的右值必须是数组，如 ' + key + op + '["a","b"]',
          { condition: src, leaf: raw }
        );
      }
    }

    if (op === '=' || op === '!=') {
      if (Array.isArray(value)) {
        if (value.length !== 1) {
          contentFail(
            op + ' 的数组右值只能有一个元素；表示集合请用 ? ：' + raw,
            { condition: src, leaf: raw }
          );
        }
        value = value[0];
      }
    }

    return { t: 'cmp', key: key, op: op, value: value, kind: kind, raw: raw };
  }

  C._build = build;
  C._parseLeaf = parseLeaf;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ── 求值与公开接口 ─────────────────────────────────────────────── */
(function (g) {
  'use strict';
  var BH = g.BH;
  var contentFail = BH.contentFail;
  var C = BH.condition;

  function intersects(a, b) {
    for (var i = 0; i < a.length; i++) {
      if (b.indexOf(a[i]) !== -1) return true;
    }
    return false;
  }

  function evalCmp(state, node) {
    var data = C._readProp(state, node.key);
    var v = node.value;

    if (node.kind === 'list') {
      if (!Array.isArray(data)) {
        // getter 违约。这是引擎/状态层的 bug，不是内容问题
        BH.invariant(false, '属性 ' + node.key + ' 声明为 list 但取到非数组', {
          key: node.key,
        });
      }
      switch (node.op) {
        case '=':
          return data.indexOf(v) !== -1;
        case '!=':
          return data.indexOf(v) === -1;
        case '?':
          return intersects(data, v);
        case '!':
          return !intersects(data, v);
      }
      contentFail('列表属性不支持运算符 ' + node.op, { leaf: node.raw });
    }

    // scalar
    switch (node.op) {
      case '>':
        return data > v;
      case '<':
        return data < v;
      case '>=':
        return data >= v;
      case '<=':
        return data <= v;
      case '=':
        return data === v;
      case '!=':
        return data !== v;
      case '?':
        return v.indexOf(data) !== -1;
      case '!':
        return v.indexOf(data) === -1;
    }
    contentFail('未知运算符 ' + node.op, { leaf: node.raw });
  }

  function evalNode(state, node) {
    switch (node.t) {
      case 'true':
        return true;
      case 'cmp':
        return evalCmp(state, node);
      case 'and':
        for (var i = 0; i < node.kids.length; i++) {
          if (!evalNode(state, node.kids[i])) return false;
        }
        return true;
      case 'or':
        for (var j = 0; j < node.kids.length; j++) {
          if (evalNode(state, node.kids[j])) return true;
        }
        return false;
    }
    BH.invariant(false, '未知 AST 节点：' + node.t, { node: node });
  }

  // 解析结果缓存。调参要跑上千局，同一条件会被求值成千上万次
  var cache = Object.create(null);

  /**
   * @param {string} src
   * @returns {Object} AST
   * @throws {BH.ContentError} 语法错误、未登记属性、运算符不相容
   */
  function parse(src) {
    if (src == null || src === '') return { t: 'true' };
    if (typeof src !== 'string') {
      contentFail('条件必须是字符串，收到 ' + typeof src, { condition: src });
    }
    var hit = cache[src];
    if (hit) return hit;
    var ast = C._build(C._tokenize(src), src);
    cache[src] = ast;
    return ast;
  }

  /**
   * @param {any} state
   * @param {string} src  空串/null 视为恒真
   * @returns {boolean}
   */
  function check(state, src) {
    return evalNode(state, parse(src));
  }

  /**
   * 供 seal() 用：只做语法与引用校验，不求值。
   * 这样内容错误在封盘阶段就暴露，不留到运行时（design.md §7）。
   */
  function validate(src) {
    parse(src);
  }

  function clearCache() {
    cache = Object.create(null);
  }

  C.parse = parse;
  C.check = check;
  C.validate = validate;
  C._clearCache = clearCache;
  C._evalNode = evalNode;
})(typeof globalThis !== 'undefined' ? globalThis : this);
