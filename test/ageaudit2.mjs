// 严格版：只抓真正跨语境的错位
import { loadBH } from './loader.mjs';
const BH = loadBH(undefined, false);
let bad = 0;
const check = (e, re, lo, hi, why) => {
  if (re.test(e.t) && (e.a[0] < lo || e.a[1] > hi)) { console.log(`✗ [${e.id}] a=[${e.a}] 需[${lo},${hi}] (${why}) :: ${e.t.slice(0, 40)}`); bad++; return true; }
  return false;
};
for (const e of BH.EVENTS) {
  if (check(e, /高考|高三|班主任|校服|晚自习|教室|教导主任|月考|补习班/, 13, 20, '校园')) continue;
  if (check(e, /大学|宿舍|室友|社团|辅导员|毕业论文|食堂阿姨/, 17, 26, '大学')) continue;
  if (check(e, /公司|同事|领导|加班|周报|工位|部门|老板|裁员|入职|离职|年终奖|项目|出差|实习生|述职/, 19, 68, '职场')) continue;
  if (check(e, /你的孩子|家长会|辅导作业|亲子运动会|开家长/, 24, 72, '养育')) continue;
  if (check(e, /幼儿园/, 3, 7, '幼年')) continue;
  if (check(e, /退休|返聘|老年大学|广场舞/, 50, 88, '老年')) continue;
}
console.log(`\n真错位: ${bad}`);
