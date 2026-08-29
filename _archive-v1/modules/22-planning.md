# 模块：季内路线与节目牌（Planning）

> 上位：`docs/SYSTEM.md` §0.3、§1；内容入口：`docs/modules/14-content-api.md`。
> 本模块把“这一季播什么”变成一个低复杂度的路线选择，不另造商店、货币或评分公式。

## 1. 目标与边界

每个决策年可以先选一个编排节点，再从受节点影响的事件池中选择事件后果。节点选择替代原来点击“继续”揭示随机事件的空动作；事件仍然由一次普通点击解决。固定分水岭、入职、晋升、已到期事件线和死亡优先级不受节点改写。

玩家不整理手牌。`DECK` 是本季最多三张节目牌的历史记录，牌被选中后不能手动移除或排序；`CAST` 仍然是被动人设牌。

## 2. 状态契约

```js
DECK: [{ id, track, tags }]
ROUTE: {
  season: 1,
  slot: 0,
  offers: [],       // 当前已展示的 plan id；用于确定性重现
  picked: [],       // 本季已选 plan id 历史
  risk: 0           // low=1 / medium=2 / high=3 的累计值
}
```

`DECK.length <= 3`。季末切换、奖励提交和腰斩续命进入下一季时清空两者；跨季贯彻只由 `TRACK/CAST/TAG/ELINE` 承担。旧状态没有这两个字段时，状态创建和运行时入口按空牌组处理。

## 3. plan 数据

```js
{
  id: 'plan_hot', label: '把这一季做得更响', kind: 'hot',
  season: [2, 3, 4], risk: 'high', audience: 'burst',
  cost: ['HOOK +2', 'SPR -1'],
  track: 'wanghong', tags: ['网络', '失控'],
  poolTags: ['网络', '失控'], lineBias: [],
  gate: 'AGE>=12', hidden: false,
  preview: '网络/失控', effect: { AUD: 3, HOOK: 2, SPR: -1 }
}
```

必填字段是 `label/kind/risk`。`season` 可以是单个季号或季号数组，必须落在 1…5；`risk` 只能是 `low/medium/high`。`track` 若存在必须指向轨道；`tags/poolTags` 必须来自固定 tag 枚举；`lineBias` 必须指向已注册事件线；`gate` 使用既有条件 DSL。

`effect` 是节点选择的即时代价或准备，只能改写 `CHR/INT/STR/MNY/SPR/AUD/HOOK`。它不直接计分。隐藏节点的文本只显示编排动作、风险和“未知信号”等中性预览；真实隐藏轨道名不进入 UI。

## 4. 事件池影响

普通事件仍需满足原有 `season/include/exclude/EVT` 条件，不会因为牌组不匹配而被删除。事件 tags 与 `DECK` tags 有交集时，事件的抽取权重提高；同一 tag 在两张牌上出现记为“合拍”，三张记为“成套”。权重加成有上限，防止一套牌把内容池锁死。

`lineBias` 只提高已到期且条件通过的事件线优先级；它不能绕过 gate，也不能抢占分水岭、职业保底或场景的硬优先级。

## 5. 人设协同

当 `CAST.card.track` 与当前 `DECK` 的轨道相同，结算时显示“合拍·人设”，加入小额筹码与有限加法倍率。节目牌标签与事件 tags 命中时再显示“合拍·节目牌”；两者均不改变年度公式，只是已有 `B/M` 收集器的有限输入。

协同必须可见：分数行要能指出协同来源；不匹配的牌仍照常提供其基础 `addDrama/addMult/xMult` 效果。单次协同倍率上限为小额加法，不开放乘法牌覆盖。

## 6. UI 与可发现性

节点卡固定展示：风险（低/中/高）、收视倾向（稳/波动/爆发）、代价、可能播出和已匹配人设。精确收视、事件权重和未来选项不预览。隐藏节点不展示 `track.name`、`track.id` 或事件线真实名称。

同 seed、同出身、同路线选择序列必须复现节点、候选池和结果；只改节点选择，至少应改变牌组、事件权重或候选事件。节点路线不是道德排序：稳播不必然高分，追热不必然正确。

## 7. 验收

1. `R.list('plans')` 可用，封盘检查所有跨引用。
2. 季内最多三张牌，季末清空，路线选择不增加一个“继续”空菜单。
3. 节点选择能改变事件池权重，当前 `card.track` 匹配时分数行出现可见协同。
4. 固定事件线、分水岭、入职、晋升和场景仍按既有优先级运行。
5. 内容校验、核心测试、loopcheck、职业率、浏览器 file:// smoke test 全部通过。


## 任务 #7 元进度节目牌扩展

节目牌可选地声明局外解锁门槛，不改变原有路线字段：

```js
{
  id: 'plan_archive_x',
  metaUnlock: { type: 'track' | 'npc', id: '...' },
  ...
}
```

`metaUnlock` 只由 `state.META.unlocked` 判断。没有门槛的基础牌照常出现；有门槛的
档案牌只有在对应内容已被抽卡解锁时加入 offers。档案牌仍必须有合法 season、risk、
track、tags/poolTags、lineBias 与 effect，并接受同一套路线校验。它是内容入口，
不是属性奖励；其协同仍由既有 `deckSynergy()` 计算。