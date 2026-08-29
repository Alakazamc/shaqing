/* badhand — 内容加载器
 * 正典：docs/modules/14-content-api.md §2、design.md §2（加载时序）
 *
 *   1 vendor + engine + ui 已由 index.html 同步加载
 *   2 content/manifest.js 已加载 → BH.MANIFEST
 *   3 按 MANIFEST 顺序注入 <script async=false>，保证执行顺序
 *   4 全部 onload 后调用 BH.seal()
 *   5 seal 成功 → 挂载 Vue；失败 → 渲染错误页，不进游戏
 */
(function (g) {
  'use strict';
  var BH = g.BH;
  var doc = g.document;

  function fail(title, detail) {
    var el = doc.getElementById('app');
    el.innerHTML = '';
    var box = doc.createElement('div');
    box.className = 'panel';
    var h = doc.createElement('div');
    h.style.cssText = 'font-weight:700;font-size:18px;color:#e0603f;margin-bottom:10px';
    h.textContent = title;
    var pre = doc.createElement('pre');
    pre.style.cssText =
      'white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.6;' +
      'color:#c9c4d6;margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace';
    pre.textContent = detail;
    box.appendChild(h);
    box.appendChild(pre);
    el.appendChild(box);
  }

  function loadOne(src) {
    return new Promise(function (resolve, reject) {
      var s = doc.createElement('script');
      s.src = src;
      // 动态插入的脚本默认 async；置 false 才保证按插入顺序执行
      s.async = false;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('无法加载 ' + src)); };
      doc.head.appendChild(s);
    });
  }

  function boot() {
    if (!BH || !BH.MANIFEST) {
      fail('内容清单未加载', '缺少 content/manifest.js');
      return;
    }
    var chain = Promise.resolve();
    BH.MANIFEST.forEach(function (f) {
      chain = chain.then(function () { return loadOne(f); });
    });

    chain
      .then(function () {
        BH.props.registerBuiltins();
        BH.seal();
      })
      .then(function () {
        BH.mount();
      })
      .catch(function (e) {
        var msg = e && e.message ? e.message : String(e);
        if (e && e.name === 'ContentError') {
          fail('内容校验失败', msg);
        } else {
          fail('启动失败', msg + '\n\n' + (e && e.stack ? e.stack : ''));
        }
        if (g.console) g.console.error(e);
      });
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
