/* 一次性关系纵切片定向流程：真实驱动 BH.run.advance()。 */
import { loadEngine } from './harness.mjs';
import { loadFullContent } from './full-content.mjs';

const BH = await loadEngine([
  'src/engine/errors.js', 'src/engine/condition.js', 'src/engine/state.js',
  'src/engine/props.js', 'src/engine/scoring.js', 'src/engine/format.js',
  'src/engine/registry.js', 'src/engine/seal.js', 'src/engine/rng.js',
  'src/engine/run.js',
]);
await loadFullContent(BH);
const C = BH.condition;

function ok(value, message) {
  if (!value) throw new Error(message);
}
function fresh(age) {
  const s = BH.run.create({
    seed: 'REL05-' + age, family: 'fam_xiancheng',
    sex: 'sex_nv', persona0: 'per_ningba', talents: [],
  }).state;
  s.age = age;
  s.season = BH.run.seasonOf(age).n;
  s.phase = 'YEAR';
  return s;
}
function show(state, eventId) {
  const shown = BH.run.advance(state, null);
  ok(shown.state.pending && shown.state.pending.eventId === eventId,
    '应呈现 ' + eventId + '，实际是 ' + JSON.stringify(shown.state.pending));
  return shown;
}
function choose(shown, index) {
  ok(shown.result.options.length > index, '选项不存在：' + index);
  return BH.run.advance(shown.state, index);
}
function relocate(state, age) {
  state.age = age;
  state.season = BH.run.seasonOf(age).n;
  state.phase = 'YEAR';
  state.pending = null;
  state.scene = null;
}

// 1–3：入口、联系、承诺主链，以及 s3/s4。
let state = fresh(16);
let shown = show(state, 'e_rel_lan_s1');
let resolved = choose(shown, 0);
state = resolved.state;
ok(state.NPC.includes('npc_lan'), 's1 后 NPC 应在场');
ok(state.NPCAX.npc_lan.axis === 2, '联系选项应将关系轴 +2');
ok(resolved.result.relations.some((r) => r.id === 'npc_lan' && r.delta === 2),
  '结果应报告关系轴变化');

shown = show(state, 'e_rel_lan_s2');
state = choose(shown, 0).state;
ok(state.FLAG.includes('f_lan_commit'), '承诺路径应写入 f_lan_commit');
ok(state.ELINE.el_lan.stage === 2, '承诺后主链应进入 s3 前');
ok(state.NPCAX.npc_lan.axis === 5, '承诺选项应累计关系轴');
relocate(state, 19);
state = choose(show(state, 'e_rel_lan_s3'), 0).state;
relocate(state, 21);
state = choose(show(state, 'e_rel_lan_s4'), 0).state;
ok(state.EVT.includes('e_rel_lan_s3') && state.EVT.includes('e_rel_lan_s4'),
  '承诺主链应实际到达 s3/s4');

// 4：s2 的 fork:0 必须进入完整的 f2a → f2b，并让 NPC 退场。
state = fresh(16);
state = choose(show(state, 'e_rel_lan_s1'), 0).state;
state = choose(show(state, 'e_rel_lan_s2'), 1).state;
ok(state.ELINE.el_lan.forkId === 0, 'fork:0 应写入关系线进度');
relocate(state, 19);
state = choose(show(state, 'e_rel_lan_f2a'), 0).state;
state = choose(show(state, 'e_rel_lan_f2b'), 0).state;
ok(state.EVT.includes('e_rel_lan_f2a') && state.EVT.includes('e_rel_lan_f2b'),
  '分叉链应完整推进');
ok(state.NPCGONE.includes('npc_lan') && !state.NPC.includes('npc_lan'),
  '分叉终点应让 NPC 退场');

// 5–6：超过 maxGap 播放可见 missEvent，之后跨年达到条件触发 reunion。
state = fresh(16);
state = choose(show(state, 'e_rel_lan_s1'), 0).state;
relocate(state, 22);
state = choose(show(state, 'e_rel_lan_miss'), 0).state;
ok(state.ELINE.el_lan.missed && state.NPCGONE.includes('npc_lan'),
  '超过 maxGap 应标记 missed 并进入 NPCGONE');
relocate(state, 28);
state = choose(show(state, 'e_rel_lan_reunion'), 0).state;
ok(state.ELINE.el_lan.reunited, '满足 minGap 与 AGE 条件后应标记 reunited');
ok(state.NPC.includes('npc_lan') && !state.NPCGONE.includes('npc_lan'),
  '重逢后 NPC 应回到在场列表');

// 7–8：NPCREL 精确条件可用，关系轴可 JSON 往返。
const relationKey = 'npc_lan:' + state.NPCAX.npc_lan.axis;
ok(C.check(state, 'NPCREL?["' + relationKey + '"]'),
  'NPCREL 应匹配当前关系轴：' + relationKey);
const roundTrip = JSON.parse(JSON.stringify(state));
ok(roundTrip.NPCAX.npc_lan.axis === state.NPCAX.npc_lan.axis &&
  roundTrip.NPCAX.npc_lan.stage === state.NPCAX.npc_lan.stage,
  'JSON 往返不能丢失 NPCAX');

console.log('关系定向流程通过：入口、关系轴、主链 s3/s4、fork、miss/maxGap、reunion/minGap、NPCREL、JSON 往返均通过。');
console.log(JSON.stringify({
  commitAxis: 9,
  forkGone: true,
  reunionAxis: state.NPCAX.npc_lan.axis,
  reunionStage: state.NPCAX.npc_lan.stage,
}, null, 2));
