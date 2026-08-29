/* 戏码枚举
 * 正典：docs/content/README.md §3.2
 * 疲劳系数 F 与振幅的"套路重复"判定都靠它。
 * 粒度刻意做粗：太细的话玩家换个说法就能绕过疲劳惩罚。
 */
(function (g) {
  g.BH.define.tropes([
    'fanche',    // 翻车
    'chuquan',   // 出圈
    'tafang',    // 塌房
    'baofu',     // 暴富
    'peiguang',  // 赔光
    'beipan',    // 背叛
    'chongfeng', // 重逢
    'taoli',     // 逃离
    'baishi',    // 拜师
    'chudao',    // 出道
    'tuisai',    // 退赛
    'qianyue',   // 签约
    'shilian',   // 失联
    'fuchu',     // 复出
    'zihui',     // 自毁
    'beiwuren',  // 被误认
    'zhongjiang',// 中奖
    'pochan',    // 破产
    'bingdao',   // 病倒
    'toji',      // 投机
    'xiashan',   // 下山
  ]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
