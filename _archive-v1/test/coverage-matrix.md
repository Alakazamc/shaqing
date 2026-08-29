# 纵切片自动验收覆盖矩阵

审计日期：2026-08-02

## 1. 初始审计结论（历史快照）

当前 `node test/run-tests.mjs` 的 31 条不是模块 09 所说的 A1–A76 全量验收：

- **显式编号断言：** A1–A14，共 14 条属于纵切片编号；另有 A100–A107、A110–A118 共 17 条补充健壮性/映射断言。
- **间接覆盖：** A25–A33、A36–A42、A44–A58、A59–A60、A62、A64、A66、A73–A76 会在 `validate-content.mjs` 的 `BH.seal()` 中被检查，但没有单独编号、失败定位和测试报告条目。
- **只有运行时被顺手经过：** A15–A24 的部分逻辑在 `tune.mjs`/浏览器流程中会被执行，但没有验收条件或失败阈值。
- **缺失：** A34–A35、A43、A61、A63、A65、A67–A72，以及上述仅间接覆盖项的独立断言尚未进入 `run-tests.mjs`。

因此下一步不是重写已通过的 DSL/计分，而是增加内容封盘测试 suite，并修复 A61/A63 的实现契约空档。

## 1.1 实施后状态（2026-08-02）

上述内容是补齐前的审计快照。补齐 suite、修正 beat 30 字封盘、补上 dev/异常契约后，当前最终状态为：

- **A1–A76：76 通过 / 0 失败，全部进入 `test/run-tests.mjs` 的编号报告。**
- **补充断言：22 通过 / 0 失败**（A100–A107、A110–A123，编号保留原有语义）。
- **内容封盘：** events 152（decision 40 / flavor 60 / death 8 / beat 5）、cast 24、scars 6、talents 12、tracks 14、NPC 2、eventlines 5、endings 7、gacha 12。
- 独立 `validate-content.mjs`、`loopcheck.mjs`、`jobrate.mjs` 均以退出码 0 完成；循环破环收益仍为 72 / 96 / 132。

最终状态逐组见本文 §7；§3 的 E/I/R/M 是补齐前快照，不再代表当前覆盖率。

## 2. 状态定义

| 标记 | 含义 |
|---|---|
| **E** | `run-tests.mjs` 中有与该编号一一对应的显式测试并输出 PASS/FAIL |
| **I** | 被内容封盘或现有脚本间接检查，但不独立计数；不能作为完整验收证据 |
| **R** | 运行流程会经过相关代码，但没有断言/阈值，失败可能仍退出 0 |
| **M** | 当前没有覆盖，或实现与断言要求存在明显空档 |

## 3. A1–A76 逐段矩阵（补齐前审计快照）

| 编号 | 当前状态 | 现有证据 | 缺口/后续任务 |
|---|---|---|---|
| A1–A5 | E | `suites/condition.test.mjs` | 已覆盖 DSL 标量、数组、括号、混用和未知键 |
| A6–A8 | E | `suites/scoring.test.mjs` | 已覆盖年度结算顺序、F、M |
| A9–A14 | E | `suites/scoring.test.mjs` | 已覆盖 Amp/Com/Iro 闸门 |
| A15–A18 | R | `run.js` 季末逻辑；tune 会经过季末 | 缺少四种 verdict、腰斩/注水/第二次腰斩的独立构造断言 |
| A19–A24 | R | `run.js` `checkTrueEnding`/`commitEnding`；tune 有 trueend 策略 | 缺少四条件、三种绕过、rating null/污点不变的独立断言 |
| A25–A33 | I | `seal.validateEvents`/`validateOrphans`；`validate-content` 能通过 | 缺少 9 项逐条断言和可定位报告；需要统一测试 fixture |
| A34–A35 | M | 无 | 缺少同 seed 同选择一致、同 seed 不同选择分化测试 |
| A36–A42 | I | `seal.validateEventlines` | 缺少每条 chain/fork/from/终点授牌/敏感入口的独立断言 |
| A43 | M | `scoring.commitment` 只有通用数学测试 | 缺少等长主链/分叉路径的 Com 不降构造测试 |
| A44–A49 | I | `seal.validateNpcs` | 缺少 NPC 字段、唯一退场、NPC 事件 noRandom/include、在场上限的独立断言；“恰有一个”当前仅靠单字段约定 |
| A50–A53 | I | `seal.validateOrigins`/`validateTracks` | 缺少每个家庭旗标、性格正负、性别汇率和轨道 SEX 禁止的独立断言 |
| A54–A58 | I | `seal.validateGacha` | 缺少 target/scope、T2/T3 恰好覆盖、ending 红线、dupValue 的独立断言；当前 gacha 内容统计为 12 条，但仍需核对 T2/T3 覆盖规则 |
| A59–A60 | I | `seal.validateEventlines` | 缺少每个 beat 的逐条报告和场景键/长度边界断言 |
| A61 | M | `seal.validateEvents` 当前 beat 限制为 60 字 | 契约要求 beat ≤30 字，必须先改校验/内容或同步正典，再加断言 |
| A62 | I | `seal.validateEventlines` 检查 option beat 1–2 | 缺少编号测试 |
| A63 | M | `run.js` 有 `MAX_SCENES_PER_RUN = 4` | 缺少引擎常量不可被内容配置覆盖、运行最多 4 场景的断言 |
| A64 | I | `validateEvents` 检查 restraint 与 escalate 同事件 | 缺少同 beat 语义和“放弃 N”实际值断言 |
| A65 | M | `run.js` 场景结算实现存在 | 缺少 B 累加、M 不变、F/A/R/WLOG 只结算一次的场景 fixture |
| A66 | I | node/browser 都读取 `BH.MANIFEST` 并 import | 缺少清单逐文件、浏览器/node 同源的独立测试输出 |
| A67 | M | registry 注释声称顺序无关 | 缺少打乱清单后 seal 结果相同的隔离加载测试 |
| A68–A70 | M | registry 有重复 id、sealed、condProp 代码 | 缺少重复来源、封盘写入、condProp 新键/冲突的断言 |
| A71–A72 | M | `src/ui/save.js` 已有 migrate/dev key 实现 | 缺少模拟 localStorage、坏档备份、失效 id 保留 material、dev 隔离的测试 |
| A73–A76 | I | `seal._seal.checkNarration/checkInnerThought` 在封盘时运行 | 缺少禁用词、引号豁免、心理活动说教词、灵异正文的独立 fixture |

## 4. 补齐前补充断言（历史快照；最终状态见 §7）

| 编号 | 当前状态 | 位置 |
|---|---|---|
| A100–A104 | E | 条件 DSL 健壮性 |
| A105–A107 | E | 评分映射和水位 |
| A110–A118 | E | 状态层和内置属性 |

这些编号保留，不重编号；新增 A 期 suite 应继续使用模块 09 的 A 编号，报告统计必须同时显示“纵切片 76 条”和“补充断言”两个计数。

## 5. 补齐前实现/契约问题（历史快照）

1. **beat 长度不一致：** `docs/modules/09-vertical-slice.md §4.11` 和 `docs/modules/16-scenes.md` 要求每个 beat ≤30 字，`seal.js` 的通用 `LIMITS.beat` 却是 60；当前场景文案有超过 30 字的条目。先决定以正典为准压缩文案，再把 30 写成单独校验。
2. **场景数上限未被验证：** `run.js` 的常量存在，但没有检查内容无法通过配置绕过，也没有运行 fixture 证明第四场之后不再进入。
3. **A56 尚未落地：** `validateGacha` 检查 target/scope/dupValue，但没有统计 T2/T3 内容项被恰好一个条目覆盖；且当前内容统计为 12 条抽卡条目，需以实际 tier 数据核对。
4. **A45 语义不足：** NPC schema 是单个 `exit` 字段，seal 只检查字段存在和事件存在；新增断言应确保关系线中退场点唯一且与该字段一致。
5. **测试隔离不足：** registry/condition 使用全局 `BH` 和副作用加载；顺序无关、重复注册、封盘冻结需要独立 node 子进程或 reset fixture，不能污染正常内容封盘。

## 6. 下一步映射（补齐前计划；最终状态见 §7）

- **PB-02：** A66–A70，补充加载清单、乱序 seal、重复/冻结/condProp fixture。
- **PB-03：** A15–A24、A34–A35、A43，补充季末/真结局/确定性/分叉 Com 行为测试。
- **PB-04：** A36–A58，补充事件线、NPC、开局四项和抽卡数据断言。
- **PB-05：** A59–A65、精神/异常扩展检查，先修 A61 再测 A65。
- **PB-06：** A71–A72 与存档模拟；A23–A24 的结算显示红线。
- **PB-07：** A25–A33、A73–A76 变成逐项内容/叙述 fixture。
- **PB-08：** 汇总为 76 条显式报告，跑调参与浏览器回归。

## 7. 最终实施后报告（2026-08-02）

本节是当前实现的验收结果；它覆盖并取代 §3 的补齐前 E/I/R/M 快照。

### 7.1 A1–A76 显式编号结果

| 编号范围 | 测试入口 | 结果 |
|---|---|---|
| A1–A14 | `test/suites/condition.test.mjs`、`scoring.test.mjs` | 14 / 14 PASS |
| A15–A24、A34–A35、A43 | `test/suites/runtime.test.mjs` | 13 / 13 PASS |
| A25–A33、A36–A42、A44–A58 | `test/suites/content.test.mjs` | 33 / 33 PASS |
| A59–A65 | `test/suites/scene.test.mjs` | 7 / 7 PASS |
| A66–A72 | `test/suites/contracts.test.mjs` | 7 / 7 PASS |
| A73–A76 | `test/suites/narrative.test.mjs` | 4 / 4 PASS |
| **合计 A1–A76** | `node test/run-tests.mjs` | **76 / 76 PASS，0 FAIL** |

编号范围的数量按断言编号展开计算：A15–A24 为 10 条，A34–A35 为 2 条，A43 为 1 条；A25–A33 为 9 条、A36–A42 为 7 条、A44–A58 为 15 条。

### 7.2 补充断言结果

| 编号范围 | 覆盖内容 | 结果 |
|---|---|---|
| A100–A107 | 条件 DSL 健壮性、评分映射和水位 | 8 / 8 PASS |
| A110–A123 | 状态层、内置属性、精神指数和异常轨道 | 14 / 14 PASS |
| **补充合计** | 不计入 A1–A76 | **22 / 22 PASS，0 FAIL** |

`run-tests.mjs` 最终汇总：**98 通过 / 0 失败 / 共 98**；其中纵切片 **76/76**，补充断言 **22/22**。

### 7.3 当前封盘内容计数

| 内容表 | 数量 | 细分/备注 |
|---|---:|---|
| events | 152 | decision 40 / flavor 60 / death 8 / beat 5 |
| cast | 24 | 人设牌 |
| scars | 6 | 污点牌 |
| talents | 12 | 开局天赋 |
| tracks | 14 | 轨道 |
| npcs | 2 | NPC |
| eventlines | 5 | 事件线 |
| endings | 7 | 结局 |
| gacha | 12 | 抽卡条目 |

### 7.4 独立校验结果

| 命令 | 结果 | 关键输出 |
|---|---|---|
| `node test/validate-content.mjs` | PASS | 内容校验通过；计数见 §7.3 |
| `node test/loopcheck.mjs` | PASS | age 34 循环第 4 轮破环；收益 1→72、3→96、6→132 |
| `node test/jobrate.mjs` | PASS | random 职业率 93.0%、换职率 51.0%；greedy 分别 96.5%、96.5% |

### 7.5 PB-08 自动化结果（2026-08-02）

| 检查 | 结果 |
|---|---|
| `node test/tune.mjs --runs 1000 --strategy random --seed TUNE00` | 评分中位数 3.6；腰斩 76.6%；真结局 1.3%；脉冲 57；性别极差 0.30 |
| `node test/tune.mjs --runs 200 --strategy greedy --seed TUNE00` | 评分中位数 5.0；腰斩 6.5%；真结局 0%；脉冲 59；性别极差 0.20 |
| T-contribution / T-eventline / T-duration / T-pulse | 已由 `tune.mjs` 输出并回填 `docs/SYSTEM.md §8` |
| `node test/browser-check.mjs` | **11 通过 / 0 失败**；file://、无网络、可到结算 |

T-duration 是固定 2.5 秒/脉冲的可复现预算代理，不替代人工手机计时。当前 A 期内容实际只有 1 个可触发场景，
因此每局 3–4 场景的内容目标尚未完成；引擎 ≤4 场景上限和 A63 已通过。

### 7.6 A 期与 B 期边界

- A 期已完成：契约、引擎、五季完整结算、内容静态校验、调参脚本、file:// 浏览器闸门。
- 尚未自动/人工完成：真实手机时长、M1–M18 人工视觉检查、每局 3–4 场景的首发内容量、独立跨性别事件线的贡献对比。
- Canvas 分享卡、图鉴 UI、完整抽卡保底、Canvas/粒子系统和更多首发内容继续归 PB-09 B 期。
