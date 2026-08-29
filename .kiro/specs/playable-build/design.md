# 设计：可玩构建（playable-build）

## 本文的定位

**本文不重述游戏设计。** 公式、机制、数值的唯一真相源是 `docs/`。
凡涉及这些内容，本文只给章节引用。

本文只回答实现层问题——也就是 `docs/` 里没有的那七样：

1. 模块依赖图与纯度约束
2. 加载时序（`manifest → register → seal → mount`）
3. 一次脉冲的数据流
4. 场景嵌套控制流
5. 显式状态机
6. 接口签名与数据形状
7. 失败模式与降级

按"贵改的钉死、便宜改的不钉"原则：本文钉死模块边界、时序、数据结构、
签名、状态机；**不钉**任何数值、动效曲线、文案——
那些属于 `SYSTEM.md` §8 的待调参项，实测后回填。

---

## 1. 模块依赖图

依赖只能从下往上，**箭头绝不反向**。

```
                    ┌──────────────────┐
                    │  index.html      │  只负责按 MANIFEST 注入 script
                    └────────┬─────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                          │
┌───────▼────────┐                       ┌────────▼─────────┐
│  src/ui/       │  Vue 组件、CSS、canvas │  content/**      │  纯数据
│  可用 DOM      │  订阅 engine 事件      │  无逻辑、无 DOM   │
└───────┬────────┘                       └────────┬─────────┘
        │                                          │
        │            ┌─────────────────────────────┘
        │            │
┌───────▼────────────▼──────────────────────────────────────┐
│  src/engine/                        零 DOM 依赖             │
│                                                            │
│   run.js        主循环、脉冲、场景嵌套、季末、终局           │
│      ├── scoring.js    年度公式、三乘数、评分映射            │
│      ├── state.js      状态模型、水位记录、effect 应用       │
│      ├── registry.js   define / seal / 只读查询             │
│      ├── condition.js  DSL 解析与求值                       │
│      └── rng.js        确定性随机                    ✅已完成 │
│                                                            │
│   ext/          带逻辑的内容扩展（effectOp 等）              │
└────────────────────────────────────────────────────────────┘
```

### 1.1 纯度约束（可静态验证）

| 目录 | 禁止出现 | 验证方式 |
|---|---|---|
| `src/engine/**` | `document` `window` `localStorage` `requestAnimationFrame` | 源码正则扫描断言 |
| `content/**` | 函数、`undefined`、计算表达式 | `JSON.stringify` 往返断言 |
| `src/ui/**` | 直接改写引擎状态 | 引擎状态对象 `seal` 后只读 |

第一条是硬要求：引擎必须能在 node 里批量跑 1000 局做调参
（`09-vertical-slice.md` §3）。存档读写属于 UI 层职责，引擎只接收/输出普通对象。

### 1.2 全局命名空间

无构建步骤，因此全部挂 `globalThis.BH`。每个文件统一形态：

```js
(function (g) {
  'use strict';
  var BH = (g.BH = g.BH || {});
  // …
  BH.xxx = xxx;
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

无 `import` / `export` 语句，因此：

- 浏览器：classic script，`file://` 下正常
- node：按 CommonJS 处理，`import()` 触发副作用后读 `globalThis.BH`

`src/engine/rng.js` 已按此形态写成，是参照样板。

## 2. 加载时序

```
1  index.html 同步加载 vendor/vue.global.prod.js
2  index.html 同步加载 content/manifest.js       → 得到 BH.MANIFEST
3  loader 按 MANIFEST 顺序注入 <script async=false>  → 各文件调用 BH.define.*
4  全部 onload 完成后调用 BH.seal()              → 解析跨引用 + 全量校验 + 冻结
5  seal 成功 → Vue createApp().mount()
   seal 失败 → 渲染错误页，显示出错 id / 文件 / 违反的检查条目
```

关键点：

- **第 3 步用 `script.async = false`** 保证动态插入脚本按顺序执行
- **第 4 步是唯一的跨引用解析点**，因此第 3 步的顺序不影响结果（A67）
- **第 5 步在 seal 之后**，Vue 永远看不到未封盘的注册表
- node 侧跳过 1 和 5，用 `import()` 走 2–4，共用同一份 `MANIFEST`

### 2.1 为什么不用 `fetch` 读 JSON

`file://` 下 `fetch` 被 CORS 拦死。这也是内容用 `.js` 而非 `.json` 的唯一原因
（`docs/explore/ref-lifeRestart.md` §4）。

内容本身仍然是 JSON 子集（requirements §4），只是包在 `BH.define.*(...)` 调用里。

---

## 3. 一次脉冲的数据流

**顺序是有意义的，实现必须严格按此执行**（依据 `01-scoring.md` §2）。

```
UI: 点击
 │
 ▼
run.advance(choiceIndex?)
 │
 ├─1 选事件 ──────────────────────────────────────────┐
 │     决策年 → decision 池，include 通过者加权抽 1     │
 │     否则   → flavor 池；池空 → 无事件，压缩推进      │
 │     事件线到期 → 优先于通用池                        │
 │                                          rng.js ────┘
 │
 ├─2 应用选项 effect        （属性 / AUD / HOOK 增减）
 ├─3 授予 grant             （cast / scar / flag / track / eventline 推进）
 │        ▲ 2 和 3 必须在 4 之前：桥段与倍率要读到本次变化后的状态
 │
 ├─4 收集 B  = 事件基数 + 选项桥段 + Σ人设 addDrama
 ├─5 收集 M  = (1 + Σ addMult) × Π xMult      含污点 ×0.85
 ├─6 查 trope 计数得 F，**然后**才把本次 trope 计数 +1
 │        ▲ 顺序颠倒会让同一 trope 首次出现就自己打折自己
 ├─7 A = AUD / 10           用第 2 步之后的 AUD
 ├─8 R_year = round(B × M × A × F)
 │
 ├─9 记录水位 W → WLOG，累加 S_season
 │
 ├─10 判定相位（见 §5 状态机）：
 │      年龄跨季 → SEASON_END
 │      死亡条件 → ENDING
 │      否则     → YEAR
 │
 ▼
返回 PulseResult（普通对象，无 DOM）
 │
 ▼
UI: 渲染 + 按 fx[] 播放信号层效果
```

### 3.1 `PulseResult` 形状

引擎与 UI 之间**唯一**的数据通道。引擎不发视觉指令，只发数据（`15-signal-fx.md` §3）。

```js
/**
 * @typedef {Object} PulseResult
 * @property {number}   age
 * @property {number}   season
 * @property {string[]} skippedYears   压缩掠过的年份文案
 * @property {string}   text           事件正文（已插值）
 * @property {Option[]} options        空数组 = 推进脉冲
 * @property {ScoreBreakdown} score    逐项拆解，供 UI 逐行蹦出
 * @property {Delta[]}  deltas         属性/AUD/HOOK 变化
 * @property {Grant[]}  grants         新获得的牌/旗标
 * @property {FxCue[]}  fx             信号层提示：{ name, tone, at }
 * @property {string}   phase          见 §5
 */
```

```js
/**
 * @typedef {Object} ScoreBreakdown
 * @property {{label:string, value:number}[]} chips   B 的每一项
 * @property {{label:string, mult:number, kind:'add'|'mul'}[]} mults
 * @property {number} aud       A
 * @property {number} fatigue   F
 * @property {number} total     R_year
 */
```

`ScoreBreakdown` 拆得这么细，是因为 `01-scoring.md` §3.3 要求
疲劳惩罚必须让玩家看见（`×0.6 观众看腻了`），不能是暗箱。

## 4. 场景嵌套控制流

全项目最容易出 bug 的地方：**脉冲里套脉冲**。

```
YEAR 相位
 │
 ├─ 抽到的事件线阶段带 scenes[stage] ?
 │        │ 否 → 普通单点事件，走 §3 全流程，一次点击结束
 │        │
 │        └ 是 → 进入 SCENE 相位
 │                 │
 │                 ├ beatIndex = 0
 │                 │
 │                 ├─◄─────────────────────────┐
 │                 │                            │
 │                 ├ 渲染 beats[beatIndex]      │
 │                 ├ 有 options → 等选择         │
 │                 │ 无 options → 等点击         │
 │                 │                            │
 │                 ├ 累加 B（M 在场景内保持不变）│
 │                 ├ beatIndex++                │
 │                 │                            │
 │                 └ beatIndex < beats.length ──┘
 │                 │
 │                 ▼ 场景结束
 │                 一次性执行 §3 的第 6–9 步
 │                 （F / A / R_year / WLOG 只算一次）
 │
 ▼ 回到 YEAR，年龄推进
```

### 4.1 三条不变式

| 不变式 | 理由 |
|---|---|
| **一个场景 = 一年 = 一手牌** | BRIEF §3 映射不得改动。场景只是把这手牌的结算展开 |
| **`M` 在场景内不变** | 倍率是构筑的属性，不是节拍的属性。节拍只累加 `B`（A65） |
| **`F` / `A` / `R_year` / `WLOG` 每场景只算一次** | 否则同一年被重复计入水位与疲劳，振幅统计失真 |

第三条是最容易写错的：把结算放进节拍循环里，`WLOG` 会多出四个点，
`Amp` 的分段全乱。

### 4.2 场景内的选择仍是构筑选择

节拍的 `options` 与普通事件选项同构：可以 `grant` 人设牌、推进轨道、
携带 `escalate` / `restraint`。

**加码/收手必须在同一节拍内成对出现**（A64），
因为"放弃 N 分"需要拿本节拍所有选项的最高潜在收视来算。

---

## 5. 状态机

相位切换是 bug 温床，所以显式化。**引擎只暴露 `phase`，UI 按 `phase` 决定渲染哪个组件。**

```
      BOOT
       │ seal() 成功
       ▼
     ORIGIN ──────────────► 抽家庭/性别/性格（可重抽）
       │ 确认
       ▼
     TALENT ──────────────► 天赋三选一
       │ 选定
       ▼
   ┌─ YEAR ◄──────────────────────┐
   │   │                           │
   │   ├─ 有场景 ─► SCENE ─────────┤
   │   │            （§4 内部循环） │
   │   │                           │
   │   ├─ 跨季 ──► SEASON_END ─────┤
   │   │            续订/加更 ──────┘
   │   │            腰斩 ─► REVIVE ─┘（注水续命，第 2 次挂烂尾但继续播到 S5）
   │   │
   │   └─ 死亡条件 ─┐
   │                 ▼
   └──────────────► ENDING
                     │ 结算三乘数 + 评分映射
                     ▼
                  SETTLEMENT ──────► 分享时刻（结算页）
                     │ 点继续
                     ▼
                   GACHA ──────────► 可一键跳过
                     │
                     ▼
                   BOOT（下一局）
```

### 5.1 相位约束

| 相位 | 允许的输入 | 禁止 |
|---|---|---|
| `BOOT` | 无 | — |
| `ORIGIN` | 重抽、确认 | 跳过（必须确认一次，哪怕是一键随机） |
| `TALENT` | 三选一 | 重抽 |
| `YEAR` | 继续 / 选项 | — |
| `SCENE` | 继续 / 选项 | **不可中途退出场景** |
| `SEASON_END` | 继续 | — |
| `REVIVE` | 继续 | — |
| `ENDING` | 继续 | — |
| `SETTLEMENT` | 继续、导出分享卡 | — |
| `GACHA` | 抽、跳过 | — |

`SCENE` 不可中途退出，是因为退出的语义已经由**分叉**承担
（`13-eventlines.md` §3）——分叉是内容层的选择，不是 UI 层的逃逸。

### 5.2 真结局的相位

真结局走 `ENDING → SETTLEMENT`，**不走特殊分支**。
区别只在 `SETTLEMENT` 渲染无评分形态（`07-settlement.md` §5），
以及跳过 `GACHA` 的解锁提示。

刻意复用同一条路径：如果真结局有独立相位，
UI 上就会出现"这局不一样"的信号，违反 C7（游戏不得表扬玩家）。

## 6. 接口签名

无 TypeScript，因此签名靠 JSDoc 钉死。以下为**冻结接口**，改动需同步改本文。

### 6.1 registry

```js
BH.define.events(arr)        // 全部 define.* 均为追加式，重复 id 抛错
BH.define.condProp(key, getter, kind)   // kind: 'scalar' | 'list'
BH.seal()                    // 解析跨引用 + 全量校验 + Object.freeze
BH.registry.events           // seal 后只读
BH.registry.get(kind, id)    // 未找到抛错，不返回 undefined
```

`registry.get` 不返回 `undefined` 是刻意的：内容 id 写错应当立刻炸，
而不是在三十年后的某个脉冲里静默变成空事件。

### 6.2 condition

```js
BH.condition.parse(str)              // → AST；语法错误抛错
BH.condition.check(state, str)       // → boolean
```

两处强制差异（`03-events.md` §1.3）：括号分组必须被真正尊重（A3）；
同层混用 `&` `|` 未加括号 → **解析期**抛错（A4）。
未登记属性键 → 抛错（A5）。

### 6.3 scoring

```js
BH.scoring.year(ctx)      // → ScoreBreakdown
BH.scoring.season(runState)  // → { sum, verdict: 'renew'|'extend'|'cancel' }
BH.scoring.final(runState)   // → { total, amp, com, iro, rating|null }
```

`rating` 为 `null` 表示真结局的无评分形态。**UI 必须区分 `null` 与 `0`**：
前者渲染 `—`，后者渲染 `0.0`。

### 6.4 run

```js
BH.run.create({ seed, meta })   // → RunState
BH.run.advance(runState, choiceIndex?)  // → PulseResult
BH.run.phase(runState)          // → string
```

`advance` 是**纯函数式**的：接收状态、返回新状态与结果，不改写入参。
这样调参脚本可以对同一状态跑多条分支，也让 A34 的确定性断言容易写。

## 7. 失败模式与降级

| 失败 | 行为 |
|---|---|
| `seal()` 校验失败 | 渲染错误页：出错 id、所属文件、违反的检查条目。**不进游戏** |
| 内容 id 引用不存在 | `seal()` 阶段就抛，不留到运行时 |
| 存档 JSON 解析失败 | 静默重置为初始状态，原值存入备份键，**不弹对话框** |
| 存档含已失效的解锁 id | 静默丢弃，`console.info` 记数量，`material` 不清零（A71） |
| `canvas` 不可用 / 上下文创建失败 | 关闭粒子与破碎，保留 CSS 变色。游戏可继续 |
| `toBlob` 不可用 | 提示玩家直接截图。**不阻塞看到结算页** |
| `prefers-reduced-motion: reduce` | 关抖动与粒子，保留变色（M16） |
| `localStorage` 不可用（隐私模式） | 内存态运行，开局提示一次"本局进度不会保存" |

原则：**内容错误要吵（开发期暴露），运行时环境缺失要静（玩家无感降级）。**

## 8. 文件清单

```
index.html
vendor/vue.global.prod.js        ✅ 已就位（3.5.40，165599 字节）
src/
  engine/
    rng.js          ✅ 已完成
    condition.js
    registry.js
    state.js
    scoring.js
    run.js
    ext/            effectOp / perCounter / titleSlot / reviewRule
  ui/
    app.js          Vue 根组件 + 相位路由
    components/     按相位拆分
    fx.js           canvas 粒子与信号层（唯一持有 canvas 的模块）
    save.js          localStorage 读写（引擎不碰）
    styles.css
content/
  manifest.js       ← 唯一清单，浏览器与 node 共用
  …                 见 docs/content/README.md §2
test/
  run-tests.mjs      76 条断言
  validate-content.mjs  仅内容一致性检查
  tune.mjs           批量跑局与调参报告
```
