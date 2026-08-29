# 参考项目拆解：人生重开模拟器

> 来源：`ref/lifeRestart`（本地克隆）。以下全部是**实际读过源码后确认的**，不是印象。
> 目的：明确"抄什么、改什么、为什么"。

## 1. 条件 DSL（`src/functions/condition.js`）

原作最值得学的部分。条件是一个**字符串**，因此可以直接写在 xlsx 单元格里，
内容作者不需要碰代码。

语法：

```
AGE>=18 & (MNY>5 | INT?[3,4])
```

- 叶子节点形如 `PROP<op><value>`，用 `/[><!?=]/` 定位第一个运算符
- 运算符：`>` `<` `>=` `<=` `=` `!=` `?` `!`
- 值以 `[` 开头则 `JSON.parse` 成数组，否则 `Number`
- 括号用栈嵌套（`parseCondition` 遇 `(` 压栈、遇 `)` 弹栈）

数组属性的语义（这是设计精髓，一套运算符同时服务标量和列表）：

| 运算符 | 标量属性 | 数组属性 |
|---|---|---|
| `=` | 相等 | `includes(value)` |
| `!=` | 不等 | `!includes(value)` |
| `?` | 值在给定数组里 | 两个数组**交集非空** |
| `!` | 值不在给定数组里 | 两个数组**交集为空** |

### 必须修掉的缺陷

`checkParsedConditions` **严格从左到右求值，没有运算符优先级**：

```js
let ret = check(conditions[0]);
for(let i=1; i<conditions.length; i+=2) {
    switch(conditions[i]) {
        case '&': if(ret) ret = check(conditions[i+1]); break;
        case '|': if(ret) return true; ret = check(conditions[i+1]); break;
    }
}
```

于是 `A & B | C` 的含义是 `(A & B) | C`，而 `A | B & C` 的含义是 `(A | B) & C`
——后者不符合任何主流语言的直觉。内容作者一旦按常识写就会踩坑，且**静默出错**。

**本作决定**：实现 `&` 高于 `|` 的标准优先级，并在解析期对
"同一层混用 `&` 与 `|` 且未加括号"直接**报错**而不是猜意图。
内容层宁可多打一对括号，也不要静默的逻辑错误。

## 2. 事件结构（`src/modules/event.js`）

```js
check(eventId)  // NoRandom → 永不随机抽中；exclude 命中 → 排除；否则看 include
do(eventId)     // 遍历 branch 的 [cond, nextId]，首个命中返回 next
                // 否则返回 postEvent；另有 grade 做稀有度配色
```

值得抄的三点：

- **`include` / `exclude` 双闸门**比单一条件表达力强得多，且各自可读
- **`branch` 是 `"cond:nextId"` 字符串数组**，同样可写在表格里
- **`NoRandom`** 把"只能被指定跳转触发的事件"和"可随机抽中的事件"分开，
  这是做长链剧情的前提

## 3. 主循环（`src/modules/life.js`）

```js
next() {
    const {age, event, talent} = this.#property.ageNext();
    const talentContent = this.doTalent(talent);
    const eventContent  = this.doEvent(this.random(event));  // ← 关键
    ...
}
random(events) {
    return util.weightRandom(events.filter(([id]) => this.#event.check(id)));
}
```

**决定性发现：原作玩家全程零决策。** 每年的事件是从按年龄组织的加权池里
`weightRandom` 抽出来的，玩家只在开局做一次天赋三选一，之后一路点「继续」看戏。

这印证了 BRIEF §1 对原作的批评（"纯随机看戏的被动感"），也解释了为什么原作
耐玩性依赖 meta 解锁和文本量而不是玩法深度。

其他：

- `doTalent` 用 `max_triggers` 限制天赋触发次数，`extractMaxTriggers` 从
  `AGE?[6,12,18]` 这种条件里数逗号推出上限——**取巧但脆弱**，本作显式写字段
- `doEvent` 对 `next` **递归**，天然支持一年内连播多个事件
- `format()` 用 `{age}` `{money}` 这类占位符做文本插值，值得抄

## 4. 数据层

内容存在 `data/zh-cn/*.xlsx`（events / talents / age / achievement / character），
按 i18n 目录分语言。xlsx 本质是 zip + XML，运行时需要解析器。

**本作决定**：内容用 **纯 JS 模块导出的对象字面量**（`content/*.js`），
不用 xlsx。理由是 BRIEF C8 要求 `index.html` 双击即跑、无构建步骤、不依赖网络——
引入 xlsx 解析器与之冲突。代价是内容作者要碰 `.js` 文件，
用"一条事件一个对象字面量 + 条件仍是字符串"把这个代价压到最低。

## 5. 抄 / 不抄 清单

| 项 | 决定 |
|---|---|
| 字符串条件 DSL | **抄**，并修掉优先级缺陷 |
| `include` / `exclude` 双闸门 | 抄 |
| `branch` 链式事件 + `NoRandom` | 抄 |
| 文本占位符插值 | 抄 |
| 属性判档呈现（`MNY` 显示为"小康/富豪"而非数字） | 抄 |
| 按年龄的加权事件池 | 抄骨架，但**加权随机让位给状态门槛**（见 SYSTEM §5） |
| 天赋 `max_triggers` 的正则推导 | **不抄**，改显式字段 |
| xlsx 数据层 | **不抄**，改 JS 对象字面量 |
| 玩家零决策的主循环 | **不抄**，本作核心就是决策脉冲 |
| Laya 引擎 UI 层 | 不抄，本作用 Vue 3 + CSS |
