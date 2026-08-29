# 模块：内容扩展契约（Content API）

> 上位：`docs/BRIEF.md` C8（无构建步骤、`file://` 双击即跑）、`docs/SYSTEM.md`。
> 本文规定**引擎与内容之间的唯一接口**。目标只有一条：
> **加内容 = 新增文件 + 改一行清单。不改引擎，不改任何已有内容文件。**

## 0. 为什么必须在写引擎之前定

事后补扩展点等于重写加载层。而且一旦有了几百条事件，
再改数据结构就要动全部内容文件——`09-vertical-slice.md` §1 已经用同一个理由
把真结局、NPC、开局四项的 schema 全部前置到 A 期。

内容接口是同一类问题，但更严重：它决定的是**未来所有内容更新的成本**。

---

## 1. 三条设计原则

| 原则 | 含义 |
|---|---|
| **纯追加** | 新增内容永不需要编辑已有文件。改动只有"新建文件"+"清单加一行" |
| **顺序无关** | 内容文件的加载顺序不影响结果。跨包互相引用也不需要排序 |
| **注册即校验** | 结构错误在加载期抛出，带上出错的 id 与文件名，不留到运行时 |

第二条是本设计最重要的部分，实现方式见 §3 的两阶段加载。

## 2. 唯一清单：`content/manifest.js`

```js
// content/manifest.js
(function (g) {
  var BH = (g.BH = g.BH || {});
  BH.MANIFEST = [
    // 基础表（枚举先于引用它们的内容）
    'content/tags.js',
    'content/tropes.js',
    'content/tracks.js',
    // 卡与人
    'content/cast.js',
    'content/scars.js',
    'content/talents.js',
    'content/npcs.js',
    'content/origins.js',
    // 结构
    'content/eventlines.js',
    'content/events/s1-shijing.js',
    // …
    'content/endings/stable.js',
    // 呈现层
    'content/titles.js',
    'content/reviews.js',
    'content/lexicon.js',
    'content/gacha.js',
  ];
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

**这个数组是"内容有哪些"的唯一真相源**，浏览器与 node 共用：

- 浏览器：加载器按顺序注入 `<script>`（`script.async = false` 保证执行顺序）
- node：测试与调参脚本读同一个数组，逐个 `import()` 触发副作用

共用一份清单的好处是：内容一致性断言（`content/README.md` §5）
检查的就是实际会被加载的那批文件，不可能出现"文件写了但没加载"的漏检。

> `file://` 下动态注入 classic script 是可行的（被 CORS 拦的是 ES module 与 `fetch`）。
> 加载器返回 Promise，Vue 应用在 `seal()` 完成后才挂载。

## 3. 两阶段加载：register → seal

这是"顺序无关"的实现方式。

### 阶段一：注册（各内容文件执行时）

每个内容文件只做一件事——把自己的数据交给注册表，**不解析任何引用**：

```js
// content/npcs.js
(function (g) {
  g.BH.define.npcs([
    { id: 'npc_qishou', name: '下棋的老头', emoji: '🧓',
      eventline: 'el_qishou', /* … */ },
  ]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

此时 `el_qishou` 可能还没注册，**不检查**。只做本地结构校验
（必填字段、类型、id 重复）。

### 阶段二：封盘（全部文件加载完毕后一次性执行）

```js
BH.seal();   // 解析全部跨引用 + 跑全量一致性检查 + 冻结注册表
```

`seal()` 负责：

1. 解析所有跨引用（事件的 `next`、NPC 的 `eventline`、抽卡的 `target`…）
2. 跑 `content/README.md` §5 与 §5.1 的全部检查
3. `Object.freeze` 注册表，之后任何写入抛错

**因此内容文件的加载顺序对跨引用完全无所谓。** 一个资料片可以为核心 NPC
新增事件线，而不必关心它排在核心内容之前还是之后。

`seal()` 失败时抛出的错误必须包含：出错的 id、所属文件、以及**违反了哪一条检查**。

## 4. 注册 API

全部挂在 `BH.define` 下，均为**追加式**，重复 id 直接抛错。

| 方法 | 内容 |
|---|---|
| `define.tags(obj)` | 语义标签枚举（分组） |
| `define.tropes(arr)` | 戏码枚举 |
| `define.tracks(arr)` | 轨道 |
| `define.cast(arr)` | 人设牌 |
| `define.scars(arr)` | 污点牌 |
| `define.talents(arr)` | 天赋 |
| `define.npcs(arr)` | NPC |
| `define.origins(obj)` | `{ family, sex, personality }` |
| `define.eventlines(arr)` | 事件线与分叉 |
| `define.plans(arr)` | 季内路线/节目编排节点 |
| `define.events(arr)` | 事件（含 `kind: 'death'`） |
| `define.endings(arr)` | 结局 |
| `define.gacha(arr)` | 抽卡池条目 |
| `define.titles(obj)` | 剧名槽位词表 |
| `define.reviews(arr)` | 短评模板 |
| `define.lexicon(arr)` | 梗词条 |

读取侧统一走 `BH.registry.*`，`seal()` 之后只读。

### 4.1 id 唯一性是唯一的防撞机制

不做包命名空间，因为它会让跨包引用变复杂。
**重复 id 直接抛错**就够了，且错误信息里带上两次注册的文件名。

前缀（`e_` / `cast_` / `npc_` / `el_` / `g_`）是**约定**，不是强制。
资料片建议再加一个包 token（`e_xp1_...`）以降低撞车概率。

---

## 5. 开放什么，以及绝不开放什么

这一节是本文档的核心。**开放太少，加内容就得改引擎；开放太多，正典会漂移。**

### 5.1 开放的扩展点

| 扩展点 | API | 用途 |
|---|---|---|
| 数据 | `BH.define.*` | §4 全部内容表 |
| **新 DSL 属性键** | `BH.define.condProp(key, getter, kind)` | 新机制要能被条件门槛引用 |
| **新效果原子** | `BH.define.effectOp(name, fn)` | 新的状态改写方式 |
| **新计数器** | `BH.define.perCounter(name, fn)` | 人设牌 `addDrama.per` 的新取值 |
| 剧名槽位 | `BH.define.titleSlot(name, fn)` | 新的剧名生成维度 |
| 短评规则 | `BH.define.reviewRule(pred, tpl)` | 新的观众层吐槽触发条件 |
| 信号层效果 | `BH.define.signalFx(name, spec)` | 见 `15-signal-fx.md` |

三个带 `fn` 的接口允许内容层跑逻辑。这在本项目是可接受的——
全部代码本地、单机、由项目自己编写，不存在不可信内容源。
它换来的是**引擎对修改封闭、对扩展开放**。

`condProp` 的 `kind` 必填（`scalar` / `list`），因为 DSL 的运算符语义依赖它
（`03-events.md` §1.2）。注册时若与已有键冲突则抛错。

### 5.2 绝不开放的四样

以下由引擎独占，**没有任何内容层接口可以覆盖**：

| 绝不开放 | 正典位置 | 理由 |
|---|---|---|
| 年度收视公式 `R = B × M × A × F` | `SYSTEM.md` §2 | 唯一真相源，覆盖即产生第二份 |
| 三乘数与评分映射 | `SYSTEM.md` §3 | 同上。且改了它，所有历史截图不可比 |
| 季表与腰斩规则 | `SYSTEM.md` §1.3 §4 | 结构性节奏，不是内容参数 |
| 真结局四条件 | `08-true-ending.md` §3 | 一旦可配置，就会有人把它做成可攻略的开关 |

**五处反刷分机制**（`01-scoring.md` §5）同样不开放：
段幅上限、观众权重、套路重复衰减、必须多段、trope 疲劳。
它们是 `C2` 的实现，不是可调内容。

数值调参走 `SYSTEM.md` §8 的回填流程，改的是引擎里的常量表，
**不是**给内容层开配置口。这条区别很重要：
调参是一次性校准，可配置是永久的漂移入口。

### 5.3 判断新需求该走哪边

一条实用判据：

> 这个东西如果两个内容包给出不同的值，游戏还是同一个游戏吗？

- 是 → 可以开放（新事件、新牌、新轨道、新信号效果）
- 不是 → 引擎独占（计分、季表、真结局）

## 6. 版本与前向兼容

### 6.1 内容 schema 版本

```js
BH.SCHEMA_VERSION = 1;
BH.define.pack({ id: 'core', schema: 1 });
```

`seal()` 时校验：内容包声明的 `schema` 与引擎的 `SCHEMA_VERSION` 不符 → 抛错，
错误信息说明是内容包过旧还是引擎过旧。

### 6.2 存档必须容忍内容变化

这是内容更新最容易踩的坑：**存档里记着已解锁的 id，而内容更新后某些 id 可能改名或删除。**

规则（补充 `06-meta.md` §5）：

- 读档时对 `unlocked` / `found` 里**不存在于当前注册表的 id 一律静默丢弃**，不报错、不崩溃
- 丢弃的数量写进一次 `console.info`，便于排查，但不打扰玩家
- `material`（素材）永不因内容变化而清零
- 存档 `v` 字段与 `BH.SCHEMA_VERSION` 分离：内容加了东西不需要迁移存档

反面做法：读档时校验所有 id 存在，缺一个就重置存档。那等于每次内容更新
都清空所有玩家进度。

## 7. 内容作者工具

两件都很便宜，但决定了后续加内容的实际体验。

### 7.1 单独的内容自检

```
node test/validate-content.mjs
```

只跑 `content/README.md` §5 与 §5.1 的一致性检查，不跑引擎逻辑断言。
新写一批事件后几秒内就能知道有没有引用错 id、有没有踩禁用词。

### 7.2 作者调试模式

```
index.html?dev=1&season=3&force=e_zhibo_fanche&seed=8F3K2Q
```

| 参数 | 作用 |
|---|---|
| `dev=1` | 开启调试面板：显示当前全部状态、可直接改属性 |
| `season=N` | 直接跳到第 N 季开局 |
| `force=id` | 下一个脉冲强制触发指定事件 |
| `line=id:stage` | 把某条事件线直接推到指定阶段 |

没有这个，测一条 S4 的事件线要先玩四十年。它不是锦上添花，
是内容量上去之后唯一可行的写作方式。

**约束**：`dev=1` 下的存档写入独立键，不污染正常存档；
且调试模式下的结算不产出素材、不解锁内容。
