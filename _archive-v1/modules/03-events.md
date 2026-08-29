# 模块：事件与条件 DSL

> 上位：`docs/SYSTEM.md` §0 §1。源码依据：`docs/explore/ref-lifeRestart.md`。

## 1. 条件 DSL

沿用原作的字符串 DSL（可作者化、可表格化），**但修掉其优先级缺陷**。

### 1.1 语法

```
AGE>=18 & (MNY>10 | CAST?["cast_zhuji"])
```

- 叶子：`PROP<op><value>`
- 运算符：`>` `<` `>=` `<=` `=` `!=` `?` `!`
- 值：以 `[` 开头按 JSON 数组解析，否则按数字；字符串必须写在数组里
- 逻辑：`&` `|`，括号可嵌套

### 1.2 数组语义（一套运算符同时服务标量与列表）

| 运算符 | 标量属性 | 数组属性 |
|---|---|---|
| `=` | 相等 | 包含该值 |
| `!=` | 不等 | 不包含该值 |
| `?` | 值属于给定数组 | 两数组**交集非空** |
| `!` | 值不属于给定数组 | 两数组**交集为空** |

### 1.3 与原作的两处强制差异

**(a) 括号分组必须被真正尊重。** 原作严格从左到右求值、无优先级，
导致 `A | B & C` 实际是 `(A | B) & C`，不符合任何主流语言直觉，且**静默出错**。
本作的求值器按嵌套结构递归，`A & (B | C)` 与 `(A & B) | C` 必须给出不同结果。

**(b) 同层混用 `&` 与 `|` → 解析期抛错。**

```
AGE>18 & MNY>5 | INT>8        →  ✗ 解析报错
AGE>18 & (MNY>5 | INT>8)      →  ✓
(AGE>18 & MNY>5) | INT>8      →  ✓
```

内容层宁可多打一对括号，也不接受静默的逻辑错误。

> 注意 (a) 与 (b) 的分工：(b) 是**主要防线**——歧义表达式根本不允许存在，
> 所以运算符优先级的默认值永远不会被用到。
> (a) 保证的是"作者加了括号，求值器就必须照括号来"，这才是原作缺陷的真正修复点。
> 两条都必须有单测覆盖（见 `09-vertical-slice.md` §4.1）。

### 1.4 属性命名空间

| 键 | 类型 | 说明 |
|---|---|---|
| `AGE` | 标量 | 当前年龄 |
| `SEASON` | 标量 | 当前季 1–5（隐藏第六季为 6） |
| `CHR` `INT` `STR` `MNY` `SPR` | 标量 | 五维 |
| `AUD` `HOOK` `HOOKP` | 标量 | 本作特有三轴 |
| `CAST` | 数组 | 人设牌 id |
| `SCAR` | 数组 | 污点牌 id |
| `FLAG` | 数组 | 旗标 |
| `EVT` | 数组 | 已发生事件 id |
| `TAG` | 数组 | 累积语义标签 |
| `TRACK` | 标量 | **主导**轨道 id |
| `TRACKLV` | 标量 | 主导轨道深度 |
| `SCARN` | 标量 | 污点数量（便利量，等价于 `SCAR.length`） |
| `CASTN` | 标量 | 人设数量 |
| `FAMILY` | 标量 | 家庭 id（`11-origin.md`）|
| `SEX` | 标量 | 性别 id。**禁止被任何轨道入口的 `include` 引用** |
| `NPC` | 数组 | 当前在场的 NPC id（`10-npc.md`）|
| `NPCLV` | 标量 | 主导 NPC 的关系阶段 |
| `NPCAX` | 数组 | 形如 `["npc_qishou:3"]`，供精确判定（阶段）|
| `NPCREL` | 数组 | 形如 `["npc_qishou:2"]`，供精确判定（关系轴）|
| `NPCGONE` | 数组 | 已退场的 NPC id |
| `NPCKNOWN` | 数组 | 本局遇到过的 NPC id（在场 ∪ 已退场）|
| `ELINE` | 数组 | 形如 `["el_qishou:2"]`，事件线阶段（`13-eventlines.md`）|

新增属性键必须先登记进这张表，禁止事件里凭空引用未登记的键——
实现层遇未知键**抛错**，不要静默当 0。

## 2. 事件数据结构

```js
{
  id: 'e_s3_zhibo_fanche',
  season: 3,                    // 或 age: [18, 29]
  weight: 10,                   // 加权池权重；decision 事件为 0 时靠门槛进池
  kind: 'decision',             // decision | flavor | chain | death
  noRandom: false,              // true = 只能被 next 指定跳转命中

  include: 'AUD>15 & TRACK=["chouxiang"]',
  exclude: 'EVT?["e_s3_zhibo_fanche"]',

  text: '你在直播里说了句蠢话，切片正在传播。{age} 岁的你盯着涨得飞快的在线人数。',
  drama: 18,
  tropes: ['fanche'],
  tags: ['网络', '失控'],

  options: [
    {
      text: '把话说得更绝一点',
      escalate: true,           // 加码
      drama: 25,
      effect: { AUD: +12, SPR: -2, HOOK: +2 },
      grant: { cast: ['cast_chouxiang'], scar: [], flag: ['f_chuquan'] },
      track: { chouxiang: +1 },
      next: null,
    },
    {
      text: '关掉直播，去洗个碗',
      restraint: true,          // 收手
      drama: 0,
      effect: { AUD: -4, SPR: +1, HOOK: -3 },
      grant: {},
    },
  ],
}
```

### 2.1 字段职责

| 字段 | 说明 |
|---|---|
| `kind` | `decision` 产生选项；`flavor` 只播文本（推进脉冲用）；`chain` 靠 `next` 串接；`death` 死法事件 |
| `weight` | 同 `include` 通过的事件间加权随机。**决策事件的进池靠门槛，不靠低概率** |
| `noRandom` | 抄原作。做长链剧情的前提 |
| `tropes` | 疲劳系数 `F` 与振幅"套路重复"判定用 |
| `tags` | 反讽乘数 `Iro` 用。**死法事件至少 2 个 tag** |
| `escalate` / `restraint` | 真结局判定用。见 `08-true-ending.md` |
| `relation` | `{npcId: delta}`，改变 `NPCAX[npcId].axis`，钳制在 -10…10 |
| `fork` | 事件线分叉数组下标；必须与当前主链阶段的 `forks[].from` 对应 |
| `next` | 链式跳转，实现层递归（抄原作 `doEvent`） |

### 2.2 文本插值

抄原作 `format()`：`{age}` `{money}` `{aud}` `{track}` `{castTop}` 等占位符。
占位符枚举集中在实现层一处，未知占位符原样输出而不是报错（文案容错优先）。

## 3. 事件池组织

```
content/events/
  s1-shijing.js      // 试镜 0-11
  s2-chudao.js       // 出道 12-17
  s3-dangnr.js       // 当红 18-29
  s4-zhongnian.js    // 中年 30-49
  s5-shouwei.js      // 收尾 50-70
  deaths.js          // 死法事件池
  tracks/            // 各轨道专属事件，按轨道分文件
```

抽取流程（每个脉冲）：

```
1. 若当前年是本季预排的决策年 → 从 kind='decision' 且 include 通过的池里加权抽 1
2. 否则从 kind='flavor' 池抽 1；若池空 → 本年无事件，计入压缩推进
3. 事件有 next → 递归连播
```

**决策年是预排的，不是随机的。** 每季的决策点数量固定（SYSTEM §1.3），
开局按 seed 决定落在哪几年。这保证时长可控（Q6）且 seed 可复现（C6）。

## 4. 与原作的核心差异

原作 `life.js` 的 `next()` 里事件是 `weightRandom` 纯抽取，**玩家全程零决策**。
本作把随机让位给状态门槛，因为：

- "我怎么触发的"必须可被讲述，否则玩家无法在截图里炫耀（C6）
- 隐秘轨道要可攻略、可用 seed 分享（SYSTEM §5 第 2 条）

随机仍然存在，但只在**同等资格的事件之间**决定播哪一条，
不决定"你能不能走上某条路"。
