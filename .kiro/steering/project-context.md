---
inclusion: always
---

# Badhand project context

This file migrates Claude Code session
`7ed01cb9-814f-49d7-b889-7c30f9e62e9c`, shown as “我觉得可以做一个隐藏最好结局是稳定的好日子”.

## Current state

- Project root: `D:\badhand`
- Canonical design brief: `docs/BRIEF.md`
- Reference clone: `ref/lifeRestart`
- The project is still design-first. The session did not deliver a finished playable build.
- Read the brief before adding mechanisms. Put each accepted mechanism into the layered design documents before implementing it.

## Product direction

- The original CCTAN/brick-breaker core was dropped because aiming does not carry the semantic chain of choice, consequence and later choice.
- The game combines Life Restart's event writing, Balatro-like passive multiplier synergies, Slay-the-Spire-like route choices and roguelike meta progression.
- Interaction must remain extremely simple: click the next year, then choose from two or three options. Depth belongs in content, state and scoring—not input complexity.
- A life is framed as a TV series and the score as ratings. Boring success and boring misery both score poorly; drama comes from amplitude, commitment and irony.
- Personas behave like passive jokers. A year is a hand, and a life chapter is a boss/ratings checkpoint.
- Distribution is a first-class requirement: each run should create a screenshot-worthy story; settlement resembles a Douban-style title page; shareable seeds are expected.
- Use current subculture-specific Chinese memes by route rather than generic stale memes. Keep meme text in a replaceable lexicon with audience and expiry-risk metadata.
- Fantasy, cultivation, esports, idol, rap, wealth, lottery and sensitive contemporary themes should appear as discoverable hidden tracks and use restrained wording where needed.

## Hidden true ending

“稳定的好日子” is the hidden best ending, but it is not the highest score.

The player must first experience real rises and falls, then repeatedly refuse escalation at the most profitable moments. Ratings fall, viewers complain and the show is cancelled; the game presents an ordinary Tuesday and, for the only time, refuses to judge it. This exits the scoring framework instead of preaching that an ordinary life is morally superior.

## Technical constraints

- No generated image assets; emoji is the visual asset layer.
- Use a locally vendored Vue 3 global build with no build step.
- The finished game should open from `index.html` without npm installation, bundling or network access.
- Visual quality must come from CSS, typography, motion and composition rather than pasted art.

## Suggested continuation order

1. Complete the system/spec document and content architecture.
2. Define routes, persona/joker interactions, event dependencies, scoring equations, anti-farming rules and meta progression.
3. Create `docs/content/lexicon.md` with audience and expiry-risk fields.
4. Define the playable vertical slice and acceptance tests.
5. Only then implement the browser build and verify it end to end.

## Migration archive

- Sanitized transcript:
  `C:\Users\Alakazam\.kiro\migrations\claude-code\2026-08-02\no-folder-sessions\transcripts\stable-good-days.md`
- Full raw JSONL:
  `C:\Users\Alakazam\.kiro\migrations\claude-code\2026-08-02\no-folder-sessions\raw\stable-good-days\7ed01cb9-814f-49d7-b889-7c30f9e62e9c.jsonl`

The raw JSONL is archival evidence and is not automatically loaded into model context.
