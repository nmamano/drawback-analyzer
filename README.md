# Drawback Analyzer

A training tool for **Drawback Chess** — the variant where each side plays under a
secret "drawback" (a hidden rule that constrains their moves). You enter a game prefix
by clicking moves on a board, and the analyzer shows, for each side, which drawbacks
are **still possible** and which have been **eliminated** — with the exact move and
reason each was ruled out. It's a practice aid for inferring hidden drawbacks during
real games.

## Honest scope

- This tool supports a **clearly-labeled subset** of *known* drawbacks. It does **not**
  claim to be official or complete — it advertises "supports N known drawbacks".
- The drawback definitions are **community-sourced and unofficial** (see
  [`docs/research/drawback-catalog-research.md`](docs/research/drawback-catalog-research.md)).
  The official Drawback Chess glossary is password-gated and is **not** used here.
- Every supported drawback is labeled **supported / partial / unsupported** with a
  **source** and a **confidence** level.
- Drawbacks that can't be inferred from move history alone (hidden-info, per-move
  random, or engine/eval-based) are listed **separately** as unsupported.

## How it works

- **chess.js** is the only legality engine. The analyzer never decides chess legality
  itself.
- After every edit it **replays the whole game from move 1** and tests each drawback
  hypothesis against the entire move history. Many drawbacks are obligation-based
  ("must capture if possible"), so each rule can inspect the **legal move set before**
  the chosen move.
- It is **deterministic, replay-based, and explainable** — a drawback is eliminated the
  instant one of that side's moves is inconsistent with it.

## Status

In active development via a gated slice loop. See
[`plans/drawback-analyzer-loop.md`](plans/drawback-analyzer-loop.md) for the standing
orders, scope, decisions, and slice plan.

## Stack

Bun · React · Vite · TypeScript · chess.js. Static, client-only — no server, no
networking, no accounts. (Crowdsourced submissions are a deferred, data-only feature.)
