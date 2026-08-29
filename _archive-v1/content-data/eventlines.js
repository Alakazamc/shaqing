/* 事件线与分叉
 * 正典：docs/modules/13-eventlines.md
 *
 * A 期 4 条，含 1 条带双分叉（修仙线）。
 * 分叉三条硬规则：分叉链有自己的终点、推进同一轨道深度（增量 > 0）、
 * 至少 1 张专属人设牌。审查问句：走分叉的玩家拿到的是「另一套」还是「更少」？
 */
(function (g) {
  g.BH.define.eventlines([
    // ── 修仙线：带两条分叉（下山）────────────────────────────
    // 「修仙线可以下山」尤其重要：它证明分叉是通用设计，
    // 玩家在这里体验过「岔出去也是一条完整的路」，
    // 之后遇到敏感题材就不会把分叉读成认输。
    {
      id: 'el_xiuxian', name: '后山', track: 'xiuxian',
      stages: 3, minGap: 2, maxGap: 8,
      chain: ['e_el_xx_s1', 'e_el_xx_s2', 'e_el_xx_s3'],
      forks: [
        { from: 1, chain: ['e_el_xx_f1a', 'e_el_xx_f1b'], track: 'xiuxian', depth: 1 },
        { from: 2, chain: ['e_el_xx_f2a', 'e_el_xx_f2b'], track: 'xiuxian', depth: 1 },
      ],
    },

    // ── NPC 关系线：下棋的老头 ──────────────────────────────
    {
      id: 'el_qishou', name: '下棋的老头', track: 'xiuxian',
      stages: 3, minGap: 1, maxGap: 6,
      chain: ['e_el_qs_s1', 'e_el_qs_s2', 'e_el_qs_s3'],
      forks: [
        { from: 2, chain: ['e_el_qs_f2a', 'e_el_qs_f2b'], track: 'xiuxian', depth: 1 },
      ],
    },

    // ── NPC 关系线：网吧那个人 ──────────────────────────────
    {
      id: 'el_wangyou', name: '网吧那个人', track: 'dianjing',
      stages: 3, minGap: 1, maxGap: 6,
      chain: ['e_el_wy_s1', 'e_el_wy_s2', 'e_el_wy_s3'],
      forks: [
        { from: 2, chain: ['e_el_wy_f2a', 'e_el_wy_f2b'], track: 'dianjing', depth: 1 },
      ],
    },

    // ── 平台加码线：唯一带场景的一条（S4 加码/收手场景）──────────
    {
      id: 'el_pingtai', name: '平台', track: 'shushu',
      stages: 2, minGap: 1, maxGap: 10,
      chain: ['e_el_pt_s1', 'e_el_pt_s2'],
      forks: [],
      scenes: {
        2: {
          beats: [
            'e_sc_jm_b1', 'e_sc_jm_b2', 'e_sc_jm_b3',
            'e_sc_jm_b4', 'e_sc_jm_b5',
          ],
          signalRamp: null,
        },
      },
    },
  ], 'content/eventlines.js');
})(typeof globalThis !== 'undefined' ? globalThis : this);
