/* 一次性脚本：给所有 restraint 选项补足养心（SPR +1~+2）
 * 正典：docs/modules/21-spirit.md §5.2
 *
 * 初版的问题是只有耗没有养——高桥段选项几乎都扣 SPR，
 * 恢复途径几乎不存在，于是所有构筑最终都滑向崩溃带，敏锐带形同不存在。
 *
 * 修正后收手是唯一稳定的养心途径，这同时强化了 C7：
 * 想走修仙/魔法的玩家必须学会收手，而收手正是真结局的必要条件。
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dirs = ['content/events', 'content/events/tracks'];
let touched = 0;
let files = [];
for (const d of dirs) {
  try {
    for (const f of readdirSync(d)) {
      if (f.endsWith('.js')) files.push(join(d, f));
    }
  } catch (e) { /* 目录可能不存在 */ }
}

for (const f of files) {
  let src = readFileSync(f, 'utf8');
  const before = src;

  // 匹配 restraint: true 之后紧跟的 effect 对象，检查有没有 SPR
  src = src.replace(
    /(restraint:\s*true[^}]*?effect:\s*\{)([^}]*)(\})/g,
    (m, head, body, tail) => {
      if (/\bSPR\s*:/.test(body)) return m;           // 已有 SPR，不动
      const sep = body.trim().length ? ', ' : ' ';
      return head + body.replace(/\s*$/, '') + sep + 'SPR: 1 ' + tail;
    }
  );

  if (src !== before) {
    writeFileSync(f, src, 'utf8');
    touched++;
    console.log('ok   ' + f);
  }
}
console.log('共修改 ' + touched + ' 个文件');
