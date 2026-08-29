/* 普通结局与腰斩结局
 * 正典：docs/modules/05-chapter.md、docs/content/authoring.md §2
 */
(function (g) {
  g.BH.define.endings([
    { id: 'end_normal', text: '就这样。', trueEnding: false, tags: [] },

    { id: 'end_lanwei', trueEnding: false, tags: ['烂尾'],
      text: '第二次被砍之后就没有第三季了。平台把页面下架，评论区还开着三个月。' },

    // 注水续命（腰斩后强行续订）——烂剧的手法，本身是笑点
    { id: 'end_revive_chuanyue', trueEnding: false, tags: ['烂尾'],
      text: '你醒过来，发现自己回到了三年前。编剧说这叫重启。' },
    { id: 'end_revive_shiyi', trueEnding: false, tags: ['烂尾'],
      text: '你忘了上一季发生的事。观众也忘了。' },
    // 「其实」是叙述层禁用词。放进制作方的嘴里就合规了，而且更好笑
    { id: 'end_revive_shuangbao', trueEnding: false, tags: ['烂尾'],
      text: '制作方说「你其实有个哥哥」。他现在是主角。' },
    { id: 'end_revive_meng', trueEnding: false, tags: ['烂尾'],
      text: '上一季不算了。制作方发了一条道歉声明，用的是同一个模板。' },
  ], 'content/endings/normal.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
