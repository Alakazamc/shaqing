// Node 加载器：把 content + engine 装进伪 window
import fs from 'node:fs';
import path from 'node:path';

export function loadBH(root = path.resolve(import.meta.dirname, '..'), inject = true) {
  const win = { BH: {} };
  const files = [
    'src/engine/engine.js',
    'content/talents.js', 'content/fillers.js', 'content/crises.js', 'content/decades.js',
    'content/traits.js', 'content/bosses.js', 'content/tracks.js', 'content/deaths.js', 'content/deaths2.js',
    'content/events-child.js', 'content/events-teen.js', 'content/events-young.js',
    'content/events-mid.js', 'content/events-late.js', 'content/events-rare.js', 'content/events-extra.js', 'content/tracks2.js', 'content/events-more1.js', 'content/events-more2.js', 'content/events-more3.js', 'content/events-more4.js', 'content/events-more5.js', 'content/events-more6.js', 'content/arcs-boss.js', 'content/arcs-love.js', 'content/arcs-life.js', 'content/arcs-misc.js', 'content/arcs-echo.js', 'content/events-fill1.js', 'content/events-fill2.js', 'content/titles.js', 'content/misc.js',
  ];
  for (const f of files) {
    const code = fs.readFileSync(path.join(root, f), 'utf8');
    try { new Function('window', 'BH', code)(win, win.BH); }
    catch (e) { throw new Error(`加载失败 ${f}: ${e.message}`); }
  }
  if (inject) win.BH.injectTracks();
  return win.BH;
}
