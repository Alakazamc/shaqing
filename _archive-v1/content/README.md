# 内容层架构

> 上位：`docs/SYSTEM.md`、`docs/modules/03-events.md`。

## 1. 为什么不用 xlsx

原作内容存在 `data/zh-cn/*.xlsx`，运行时需要 zip + XML 解析器。
这与 BRIEF C8（`index.html` 双击即跑、无构建步骤、不依赖网络）冲突。

**本作内容用纯 JS 模块导出对象字面量。**
代价是内容作者要碰 `.js` 文件；用两条措施把代价压到最低：

- 一条事件 = 一个对象字面量，格式固定，复制粘贴即可新增
- 条件仍然是**字符串** DSL（`AGE>=18 & MNY>10`），作者不需要写任何逻辑代码

## 2. 文件布局

```
content/
  tags.js            // 语义标签固定枚举（反讽乘数依赖）
  tropes.js          // 戏码枚举（疲劳系数依赖）
  lexicon.js         // 梗词库（镜像 docs/content/lexicon.md）
  talents.js         // 开局天赋
  cast.js            // 人设牌
  scars.js           // 污点牌
  tracks.js          // 轨道定义
  titles.js          // 剧名槽位词表
  reviews.js         // 短评模板
  npcs.js            // NPC 档案（10-npc.md）
  origins.js         // 开局四项：家庭/性别/性格（11-origin.md）
  gacha.js           // 抽卡池（12-gacha.md）
  plans.js           // 季内路线与节目牌（22-planning.md）
  eventlines.js      // 事件线与分叉定义（13-eventlines.md）
  events/
    s1-shijing.js
    s2-chudao.js
    s3-dangnr.js
    s4-zhongnian.js
    s5-shouwei.js
    lines.js
    relationships-*.js
    expansion-life.js
    expansion-career.js
    expansion-anomaly.js
    expansion-echoes.js
    deaths.js
    tracks/
      xiuxian.js
      dianjing.js
      mofa.js
      kehuan.js
      ...
  endings/
    normal.js
    cancelled.js
    stable.js        // 真结局，独立文件独立复核
```

`docs/content/*.md` 是**设计与规范**，`content/*.js` 是**运行时数据**。
两者不自动同步；`lexicon.md` 与 `lexicon.js` 的一致性靠验收检查（见 §5）。

## 3. 三张固定枚举表

这三张表是"内容一多就对不上"的防线，任何事件引用表外的值 → **实现层抛错**。

### 3.1 `tags.js` — 语义标签

反讽乘数 `Iro` 靠 tag 交集判定（`01-scoring.md` §6），所以 tag 必须收敛。
分五组，总量控制在 40 条以内：

| 组 | 例 |
|---|---|
| 场域 | 校园 网络 职场 山野 舞台 家庭 |
| 状态 | 失控 疲惫 亢奋 麻木 破防 |
| 手段 | 表演 投机 苦熬 逃避 献祭 |
| 题材 | 修仙 奇幻 科幻 竞技 饭圈 说唱 赌 |
| 收尾 | 意外 慢性 荒诞 无人知晓 烂尾 |

**死法事件必须至少携带 2 个 tag**，其中至少 1 个来自"收尾"组。

### 3.2 `tropes.js` — 戏码

疲劳系数 `F = 0.6^n` 与振幅的"套路重复"判定都靠它。
粒度要粗，20 条左右：

```
翻车  出圈  塌房  暴富  赔光  背叛  重逢  逃离
拜师  出道  退赛  签约  解约  失联  复出  自毁
被误认  中奖  破产  病倒  投机  下山
```

粗粒度是刻意的：粒度太细，玩家换个说法就绕过疲劳惩罚，反刷分机制失效。

### 3.3 `lexicon.js` — 梗词库

见 `docs/content/lexicon.md`。核心约束（C5）：
**梗绝不写进机制名称、字段名、id**，只出现在可替换的文案槽位。

## 4. 内容配额

纵切片与首发的目标量（首发指"可以拿出去传播"的版本）：

| 内容 | 纵切片 | 首发 |
|---|---|---|
| 事件（decision） | 24 | 120 |
| 事件（flavor） | 30 | 200 |
| 死法事件 | 8 | 40 |
| 人设牌 | 18 | 70 |
| 污点牌 | 5 | 15 |
| 开局天赋 | 12 | 50 |
| 轨道 | 4（2 明 2 隐） | 23 |
| 梗词条 | 40 | 200 |
| NPC | 2 | 30–40 |
| 事件线 | 4（含 1 条带双分叉） | 30 |
| 家庭 / 性格项 | 各 3（只 T1） | 各 20（T1–T3） |
| 抽卡池条目 | 12 | 覆盖以上全部 |

事件文案的质量是整个项目最难的部分，也是唯一无法用工程手段替代的部分。
配额只是下限，`authoring.md` 的基调判定才是准入门槛。

## 5. 一致性验收检查

纵切片起就必须有的自动检查（不通过即视为构建失败）：

1. 所有事件的 `tags` / `tropes` 值都在枚举表内
2. 所有 `include` / `exclude` 条件能通过 DSL 解析，且不含未加括号的混用
3. 所有 `grant` 引用的 cast / scar / flag / track id 存在
4. 所有 `next` 指向的事件存在，且目标事件 `noRandom === true`
5. 每条死法事件 ≥ 2 个 tag，且含 ≥1 个"收尾"组 tag
6. 每个 `decision` 事件有 2–3 个选项
7. `lexicon.js` 的词条 id 与 `lexicon.md` 表格一一对应
8. 每条 `restraint` 选项所在事件必须同时存在一个 `escalate` 选项
   （否则"放弃了多少分"无从计算）
9. 无孤儿事件：每个 `noRandom` 事件至少被一个 `next` 或事件线 `chain` 指向
10. 每条 `lexicon` 词条都填写 `audience`、`expiryRisk`、`replaceable`、`reviewStatus`，且待核词不进入核心叙述

### 5.1 新增系统的检查

对应断言编号见 `modules/09-vertical-slice.md` §4.7–§4.11。

**场景**（`16-scenes.md` §10）：`scenes[stage].beats` 内事件存在、
`kind === 'beat'`、`noRandom === true`；`beats` 长度 3–6；
每个 beat 文本 ≤ 30 字；带 `options` 的节拍 1–2 个；
`scenes` 键落在 `1…stages`；任一局可能遇到的场景数 ≤ 4；
带 `restraint` 的节拍必须与其 `escalate` 选项**同节拍**。

**事件线**（`13-eventlines.md` §7）：`chain` 事件存在且 `noRandom`；
每条 `forks[].chain` 非空且终点无 `next`；`from` 在 `1…stages-1`；
主链与每条分叉终点各授予 ≥1 张人设牌；**每条分叉的轨道深度增量 > 0**；
敏感题材事件线 `name === null` 且入口 `include` 不引用任何属性键。

**NPC**（`10-npc.md` §9）：`eventline` 存在；退场事件唯一；
全部 NPC 事件 `noRandom`；`include` 引用 `NPC` 或 `NPCAX`；
`bio` / `voice` / `never` 非空；同时在场上限 ≤ 5。

**关系纵切片**（`23-relationships.md`）：选项 `relation` 只能引用已登记 NPC 且 delta 有限；
事件线的 `missEvent` / `reunion.event` 必须存在、`noRandom` 且有状态门槛；每个 fork 必须由对应阶段选项引用；
至少一条 `echo` 通过 `EVT` 回指关系节点。

**开局四项**（`11-origin.md` §10）：家庭旗标被引用；
性格项正负字段齐备；观众汇率两性别各有 ≥1 项 < 1.0；
**无轨道入口 `include` 引用 `SEX`**。

**抽卡**（`12-gacha.md` §8）：`target` 存在；`scopes` 在枚举内；
T2/T3 各被恰好一条覆盖；**池内无 `type: 'ending'`**；`dupValue > 0`。

**路线编排**（`22-planning.md`）：每个节点有合法 `season` 覆盖、`risk`、`track`、`tags` / `poolTags`；`lineBias` 必须指向已有事件线；`gate` 能通过 DSL 解析；`effect` 只能改写 `CHR/INT/STR/MNY/SPR/AUD/HOOK`。

**叙述层禁用词**（`authoring.md` §8.1）：扫描全部叙述层文本字段，
命中三组禁用词即失败；引号内内容豁免；心理活动内部仍检查"说教连接"组。
