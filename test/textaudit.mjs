// 平淡度检测：找"无具体名词/无数字/无转折/以你的XX开头直接陈述"的文本
import { loadBH } from './loader.mjs';
const BH = loadBH(undefined, false);
const BAD_PAT = /^你的[^，。！？]{2,12}(很|开始|越来越|变得|一直|总是|永远)/;
const hasNum = t => /[0-9一二三四五六七八九十百千万亿]+(年|块|次|个|岁|页|张|条|顿|双|件|步|楼|站|折|名|%|年)/.test(t);
const hasTurn = t => /[—…但|！？][^。]*$|最后|直到|结果|后来|居然|竟然|偏偏|其实/.test(t);
let flat = [];
for (const e of BH.EVENTS) {
  const t = e.t;
  const isFlat = (BAD_PAT.test(t) && !hasNum(t) && !hasTurn(t)) || (t.startsWith('你的') && !hasNum(t) && !hasTurn(t) && t.length < 28 && !/[「"』]/.test(t));
  if (isFlat) flat.push(e);
}
console.log(`平淡文本: ${flat.length}/${BH.EVENTS.length}`);
flat.slice(0, 50).forEach(e => console.log(`[${e.id}] ${e.t.slice(0, 46)}`));
