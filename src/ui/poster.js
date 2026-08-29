// 杀青海报 Canvas 绘制（emoji + 文字排版，零素材）
window.BH = window.BH || {};
BH.Poster = (function () {
  const TYPE_COLOR = {
    '热血': ['#12294a', '#2b4d8f'], '玄幻': ['#241a3f', '#5b3a8f'], '黑色幽默': ['#2e2410', '#8a6a1f'],
    '文艺': ['#1c1c22', '#4a4a58'], '恐怖': ['#250d10', '#6e1c24'], '偶像': ['#2a1230', '#8a3a7a'],
    '荒诞': ['#12322a', '#2a7a5a'], '现实主义': ['#241d16', '#6e5a3a'], '剧情': ['#1a1a22', '#44445c'],
  };
  function wrap(ctx, text, x, y, maxW, lh, maxLines) {
    const chars = text.split(''); let line = '', lines = [];
    for (const ch of chars) {
      if (ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ch; if (lines.length >= maxLines) { lines[maxLines - 1] += '…'; return lines; } }
      else line += ch;
    }
    if (line) lines.push(line);
    return lines.slice(0, maxLines);
  }
  function drawLines(ctx, text, x, y, maxW, lh, maxLines, color, font) {
    ctx.fillStyle = color; ctx.font = font;
    const lines = wrap(ctx, text, x, y, maxW, lh, maxLines);
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
    return y + lines.length * lh;
  }
  function render(canvas, report, S, meta, rank) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const [c0, c1] = TYPE_COLOR[report.type] || TYPE_COLOR['剧情'];
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, c1); g.addColorStop(0.45, c0); g.addColorStop(1, '#08080c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 颗粒感：随机小点
    ctx.fillStyle = 'rgba(255,255,255,.03)';
    for (let i = 0; i < 90; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);

    // 顶部
    ctx.textAlign = 'left';
    ctx.font = '26px sans-serif'; ctx.fillStyle = '#e8e8ee';
    ctx.fillText('🎬 杀青大吉', 44, 74);
    ctx.font = '20px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.55)';
    const tname = { 'dianjing': '电竞线', 'xiuxian': '修仙线', 'fuhao': '富豪线', 'hegang': '鹤岗线', 'ouxiang': '偶像线', 'guaitan': '怪谈线' };
    const tk = Object.keys(S.tracks).sort((a, b) => S.tracks[b] - S.tracks[a])[0];
    ctx.fillText((tname[tk] ? tname[tk] + ' · ' : '') + report.type + '片', 44, 104);

    // 片名
    ctx.font = '900 58px sans-serif'; ctx.fillStyle = '#fff';
    drawLines(ctx, report.title.main, 44, 200, W - 88, 66, 2, '#fff', '900 58px sans-serif');
    ctx.font = '22px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.66)';
    drawLines(ctx, '——' + report.title.sub, 44, 236, W - 88, 30, 2, 'rgba(255,255,255,.66)', '22px sans-serif');

    // 高光时间线
    let y = 300;
    ctx.font = '700 22px sans-serif'; ctx.fillStyle = '#ffd28a';
    ctx.fillText('▸ 高光时刻', 44, y); y += 20;
    const hl = [];
    const birth = S.lines[0];
    if (birth) hl.push(['🍼', birth.age + '岁 · ' + birth.text]);
    const best = S.lines.filter(l => l.grade >= 2 && !l.death).sort((a, b) => b.grade - a.grade)[0];
    if (best) hl.push(['✨', best.age + '岁 · ' + best.text]);
    const bossLine = S.lines.filter(l => l.boss)[0];
    if (bossLine) hl.push(['★', bossLine.age + '岁 · ' + bossLine.text]);
    const trk = S.lines.filter(l => l.grade >= 2 && l.tags && l.tags.includes(tk)).sort((a, b) => b.age - a.age)[0];
    if (trk && (!best || trk.text !== best.text)) hl.push(['🎞️', trk.age + '岁 · ' + trk.text]);
    const dline = S.lines.filter(l => l.death)[0];
    if (dline) hl.push([S.deathCause.icon || '🪦', dline.age + '岁 · ' + dline.text.replace('✝ ', '')]);
    ctx.font = '19px sans-serif';
    for (const [em, txt] of hl.slice(0, 4)) {
      const lines = wrap(ctx, txt, 0, 0, W - 150, 27, 2);
      ctx.fillStyle = '#ffd28a'; ctx.fillText(em, 44, y + 4);
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      lines.forEach((l, i) => ctx.fillText(l, 82, y + 4 + i * 27));
      y += lines.length * 27 + 10;
    }

    // 经典台词
    y += 12;
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    const qLines = wrap(ctx, report.quote, 0, 0, W - 140, 26, 3);
    ctx.fillRect(44, y - 22, W - 88, qLines.length * 26 + 38);
    ctx.fillStyle = '#ffe19e'; ctx.font = '20px sans-serif';
    ctx.fillText('❝', 56, y + 6);
    qLines.forEach((l, i) => ctx.fillText(l, 84, y + 6 + i * 26));
    y += qLines.length * 26 + 40;

    // 演职员表
    ctx.font = '700 20px sans-serif'; ctx.fillStyle = '#9ec1ff';
    ctx.fillText('▸ 演职员表', 44, y); y += 26;
    ctx.font = '18px sans-serif';
    const cast = S.talents.map(id => { const t = BH.TALENTS.find(x => x.id === id); return t ? t.emoji + t.name : ''; }).filter(Boolean);
    drawLines(ctx, '主演：' + cast.join(' / '), 44, y, W - 88, 26, 2, 'rgba(255,255,255,.85)', '18px sans-serif'); y += 30;
    if (S.traits.length) {
      const tr = S.traits.map(id => { const t = BH.TRAITS.find(x => x.id === id); return t ? t.emoji + t.name : ''; }).filter(Boolean).slice(0, 4);
      drawLines(ctx, '特别出演：' + tr.join(' '), 44, y, W - 88, 26, 1, 'rgba(255,255,255,.6)', '18px sans-serif'); y += 28;
    }

    // 票房构成（填充中段 + 炫耀点）
    y += 16;
    ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(44, y - 8, W - 88, 1);
    y += 26;
    ctx.font = '700 20px sans-serif'; ctx.fillStyle = '#9ec1ff';
    ctx.fillText('▸ 票房构成', 44, y); y += 30;
    ctx.font = '18px sans-serif';
    const rows = [
      ['基础盘（事件密度与质量）', String(report.base)],
      ['× 振幅（人生起落）', '× ' + report.amp],
      ['× 贯彻（轨道与人设）', '× ' + report.deep],
    ];
    for (const [k, v] of rows) {
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillText(k, 44, y);
      ctx.fillStyle = '#ffd98a'; ctx.textAlign = 'right'; ctx.fillText(v, W - 44, y);
      ctx.textAlign = 'left'; y += 27;
    }
    ctx.fillStyle = '#ffe19e'; ctx.font = '700 18px sans-serif';
    ctx.fillText('= 票房 ' + report.box + ' 亿', 44, y); y += 34;
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.font = '15px sans-serif';
    ctx.fillText('这是你杀青的第 ' + ((meta.works || []).length) + ' 部作品' + (report.ironyWhy ? ' · 反讽判定：' + report.ironyWhy : ''), 44, y);

    // 底部数据（跟随内容，保证不与上方重叠，且不贴底太远）
    const by = Math.min(H - 148, Math.max(y + 36, H - 260));
    ctx.font = '900 40px sans-serif'; ctx.fillStyle = '#ffd98a';
    ctx.fillText('票房 ' + report.box + ' 亿', 44, by);
    ctx.font = '700 26px sans-serif'; ctx.fillStyle = '#7fe0a0';
    ctx.fillText('★ ' + report.score.toFixed(1), 44, by + 38);
    ctx.font = '16px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.fillText('超过 ' + Math.min(99, Math.max(1, Math.round((report.score - 2) * 16))) + '% 的观众 · 本周排片第 ' + rank + ' 位', 44, by + 66);

    // 杀青印章（锚定右下）
    ctx.save();
    ctx.translate(W - 108, H - 108); ctx.rotate(-0.22);
    ctx.strokeStyle = 'rgba(232,68,58,.85)'; ctx.lineWidth = 4;
    ctx.strokeRect(-58, -30, 116, 60);
    ctx.fillStyle = 'rgba(232,68,58,.9)'; ctx.font = '900 30px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('杀青', 0, 11);
    ctx.restore();
    ctx.textAlign = 'left';
  }
  function textVersion(report, S, rank) {
    const cast = S.talents.map(id => { const t = BH.TALENTS.find(x => x.id === id); return t ? t.emoji + t.name : ''; }).filter(Boolean).join(' / ');
    const d = S.lines.filter(l => l.death)[0];
    const best = S.lines.filter(l => l.grade >= 2 && !l.death).sort((a, b) => b.grade - a.grade)[0];
    return [
      '🎬 我的人生电影杀青了：' + report.title.full,
      '类型：' + report.type + '片',
      best ? '高光：' + best.age + '岁，' + best.text : '',
      d ? '结局：' + (S.deathCause.icon || '') + ' ' + d.text.replace('✝ ', '') : '',
      '票房 ' + report.box + ' 亿 · 评分 ' + report.score.toFixed(1),
      '主演：' + cast,
      '本周排片第 ' + rank + ' 位，你猜第几位？',
    ].filter(Boolean).join('\n');
  }
  return { render, textVersion };
})();
