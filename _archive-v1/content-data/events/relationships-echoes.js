/* 合租室友的跨年回响：只靠 EVT 门槛进入通用 echo 池 */
(function (g) {
  g.BH.define.events([
    {
      id: 'e_echo_lan_bill', season: 4, kind: 'echo', weight: 10,
      include: 'EVT?["e_rel_lan_s4"] & AGE>=30',
      text: '物业把一张旧账单发到群里。最后一项是两个人合买的灯泡，' +
        '数量写着 12，收货地址已经改过三次。',
      drama: 22, tropes: ['chongfeng'], tags: ['家庭', '网络'],
    },
    {
      id: 'e_echo_lan_box', season: 5, kind: 'echo', weight: 8,
      include: 'EVT?["e_rel_lan_f2b"] & AGE>=32',
      text: '你整理旧箱子时翻出一张写着“厨房”的纸。背面是新的门牌号，' +
        '中间两位被水泡开，剩下的数字刚好够寄一封信。',
      drama: 24, tropes: ['shilian'], tags: ['家庭', '无人知晓'],
    },
    {
      id: 'e_echo_lan_reunion', season: 5, kind: 'echo', weight: 9,
      include: 'EVT?["e_rel_lan_reunion"] & AGE>=35',
      text: '你在抽屉里找到那张旧租约。续租栏没有签名，' +
        '医院的自动售货机小票夹在最后一页。',
      drama: 26, tropes: ['chongfeng'], tags: ['家庭', '网络'],
    },
  ], 'content/events/relationships-echoes.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
