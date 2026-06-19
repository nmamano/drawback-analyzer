# Drawback Analyzer loop — standing orders + slice handoffs

Re-read this file at the start of every iteration. [why: conversations compact, files do not]

## North star

A static, client-only web app at **drawback.nilmamano.com** where you click out a
Drawback Chess game prefix on a board and two side panels show, per side, which of a
clearly-labeled SUBSET of *N* known "drawbacks" (secret per-side rules) are still
**possible** vs **eliminated**, each elimination annotated with the exact reason and
move. The analyzer is **deterministic, replay-based, explainable**, and grounded on
**chess.js as the ONLY legality engine**. The product is **honest about coverage** —
it advertises "supports N known drawbacks", never official completeness, and labels
every rule supported / partial / unsupported with source + confidence.

What must not be diluted: truthfulness over breadth; chess.js is the sole rules
authority; the analyzer never executes user-submitted code; we never touch the
password-gated official glossary.

## Process per slice

plan -> Game Reviewer PLAN-GATE (review before implementing) -> implement ->
run gates -> Game Reviewer DIFF-GATE (review the diff before commit) -> sign-off ->
ONE focused commit (tick its checkbox in the same commit).

- Reviewer endpoint: agent-1780864878869-eq7t (Game Reviewer, gpt-5.5).
- Driver endpoint (me): agent-1780859223976-0ki7 (Game Maker).
- Every message to the reviewer MUST instruct it to reply by POSTing back to my
  endpoint. A reply only in its own chat never reaches me. Template:
  curl -s -X POST localhost:4000/agents/agent-1780859223976-0ki7/message \
   -H 'Content-Type: application/json' \
   -d '{"text":"...","senderAgentId":"agent-1780864878869-eq7t"}'
- When waiting on the reviewer, end the turn with a ~20-25 min fallback wakeup.
  The reviewer POST is the real wake signal; the wakeup is only a stall guard.
- Commit only on explicit reviewer sign-off. If the reviewer is unresponsive for
  2 fallback cycles, ping Nil.

## Gates per slice

Always-run (cheap, deterministic, every slice — must be green before any commit):

- `bun run ci` (root) = `prettier --check .` + `eslint .` + `tsc --noEmit`
  (root + frontend) + `bun test` + `vite build`.
- Per-rule example tests live inside `bun test`: EVERY supported/partial rule ships
  at least one game where it STAYS possible (negative example) and one where it gets
  ELIMINATED (positive example), asserting the eliminating move index + the reason.
- SAN/replay tests: parsing/replaying a move history through chess.js round-trips.

Gated browser smoke (from slice 1d onward; drives real system Chrome):

- `bun run gate:e2e` (created in 1d). Builds the frontend, serves ONE isolated
  static instance on reserved port 39290, drives headless system Chrome via
  playwright-core (channel:'chrome', args --no-sandbox --disable-dev-shm-usage
  --disable-gpu).
- Judge via the EVIDENCE SURFACE, never the DOM/pixels:
  - client `window.__drawback` = { fen, sideToMove, moveHistory: SAN[],
    white: { possible: id[], eliminated: {id, moveIndex, reason}[] },
    black: { possible: id[], eliminated: {...}[] },
    unsupported: id[] }.
  - 1d check: click out a scripted prefix (e.g. White moves the queen), poll
    `window.__drawback`; assert the relevant White drawback id moved from
    `possible` to `eliminated` with the expected moveIndex/reason, and that an
    unrelated drawback stays in `possible`.
  - Screenshots are evidence artifacts only, never assertions.

Deploy gate (slice 1f ONLY; gated on Nil's authorization — see rails 2 & 3):

- A scripted Vercel deploy + public smoke (build succeeds, app + assets load over
  HTTPS). Vercel free static tier; expected spend $0.

No quota/money/LLM gates exist. There is no chess engine, no network, no AI in the
analyzer. "Stockfish / eval / AI-based" drawbacks are LISTED as unsupported, never
executed. If any paid layer is ever added it must hard-refuse without an explicit
env opt-in and document the burn in its header.

Reserved ports: 39290 = e2e static app-under-test. Dev default is Vite's 5173.
Never reuse or clobber a live/dev instance; each test instance is isolated.

## Standing rails (prohibitions, verbatim)

1. NEVER modify, stage, commit, push, or otherwise touch round-trip-chess
   (~/nil/round-trip-chess) or ludwig-chess (~/nil/ludwig-chess), their repos, apps,
   or domains. They are READ-ONLY references. drawback-analyzer is a fully separate
   sibling repo at ~/nil/drawback-analyzer.
2. NEVER create the GitHub repo, push to any remote, create the Vercel project,
   deploy, or change DNS unless explicitly pre-authorized by Nil (it runs as Nil's
   credentials). Nil pre-authorized create/push/deploy/Vercel for slice 1f on
   2026-06-18 on the free static tier ($0). The DNS record at the nilmamano.com
   provider is a parked-for-Nil step handed over as instructions.
3. Budget is $0. Vercel free/static tier only. If any step would cost money, STOP and
   ask Nil. No paid services or APIs.
4. v1 is client-only / static. No server, no networking in the analyzer core.
   (Crowdsourcing slice 1e is DEFERRED out of v1.)
5. chess.js is the ONLY legality authority. The analyzer is replay-based,
   deterministic, and explainable — never a second rules engine. It never decides
   move legality itself; it only inspects chess.js's legal move set and the chosen
   move.
6. Never claim official or complete coverage. Always surface "supports N known
   drawbacks". Label every rule supported / partial / unsupported with source +
   confidence. NEVER scrape, log into, or bypass the password-gated official Drawback
   Chess glossary. Use community / publicly-observed sources only.
7. Crowdsourced drawbacks (when ever built) are DATA ONLY — never arbitrary
   executable code. Maintainers convert submissions into rules + tests.
8. Never weaken, skip, or comment-out a gate to make it pass. Fix it in-slice or
   queue it as a parked decision. A bug a gate finds gets a regression test at the
   right layer in the SAME slice.
9. One slice at a time. Never start slice N+1 before slice N is committed on the
   reviewer's explicit sign-off.

## Decision protocol

- Assistant ALONE: file layout, rule encodings, test design, internal naming, UI/UX
  details, which deterministic rules to implement.
- Decide WITH reviewer (plan-gate + diff-gate): slice scope, the DrawbackRule
  interface & elimination semantics, the catalog labeling scheme, gate definitions.
- HUMAN-ONLY (queue as "parked-for-Nil", never decided in the loop): repo / project /
  domain names, making the repo public, GitHub/Vercel creation, any push/deploy, the
  DNS record, any spend, relaxing a rail, the final "what counts as a legitimate
  drawback source" policy if contested, whether 1e ships.
- If hard-blocked on a human-only item: queue it, work what is unblocked. If fully
  blocked: stop the loop cleanly and leave a summary.

## Stop conditions

- Completion: slices 1a-1d committed (and 1f if Nil authorizes the deploy that turn).
- Rate limits / API exhaustion.
- 3 consecutive gate failures on the SAME slice with no path forward -> queue it +
  stop.
- Reviewer unresponsive for 2 fallback cycles -> ping Nil.
- Nil says stop. (No hard wall-clock cutoff set; Nil may add one.)

## Slice plan

- [x] 1a  Scaffold (Bun/React/Vite/TS) + chess.js replay shell: enter a prefix,
          render the position + side-to-move, ONE tiny smoke drawback rule.
          COMMITTED — see git log (reviewer-signed plan-gate + diff-gate).
- [x] 1b  Core engine: DrawbackRule interface + hypothesis/result/elimination types +
          replay-based analysis + 10-15 deterministic rules with positive/negative
          tests. COMMITTED — 14 sourced rules, reviewer-signed both gates.
- [ ] 1c  Real MVP catalog: expand to a useful honest subset (target 30+ if
          legitimately sourceable), mark supported/partial/unsupported + source +
          confidence, strong positive & negative example tests per rule.
- [ ] 1d  Product UI: click move entry/editing, possible/eliminated/unsupported
          panels per side, explanation trail ("eliminated on move 7 because White
          moved a queen"), catalog page, demo games, mobile-usable. Adds gate:e2e.
- [ ] 1f  Deploy to Vercel static + DNS instructions for drawback.nilmamano.com.
          GATED on Nil's authorization (rails 2, 3) and Vercel CLI auth.

## Deferred / parked

Do-not-pick-up in v1:
- 1e Crowdsourcing/admin submit form (data-only, no exec code). Design the catalog
  data model so it is easy to add later, but DO NOT build the form/queue/backend.
- SAN/PGN text import (click entry is the core for v1).
- A constrained rule DSL (revisit only if hand-coding rules proves painful).

Queued human-only decisions (parked-for-Nil):
- [PARKED-FOR-NIL] Before 1f: Vercel CLI on auntie is NOT authenticated (device-login
  flow). Nil must `vercel login` or provide a VERCEL_TOKEN before the deploy gate runs.
- [PARKED-FOR-NIL] At 1f: the DNS record for drawback.nilmamano.com (Vercel custom
  domain — A 76.76.21.21 and/or a CNAME to cname.vercel-dns.com; exact values to be
  read from the Vercel dashboard at deploy time). Handed over as instructions matching
  the ludwig.nilmamano.com pattern.
- [RESOLVED 2026-06-18] Public-source research found a rich list — no need to ask Nil
  for sources. A community Chess.com "all drawbacks" thread enumerates 179 drawbacks
  (~118 deterministically checkable, ~22 random-parameter, ~13 unsupported), with ~25
  corroborated verbatim across independent pages. Captured in
  docs/research/drawback-catalog-research.md. The official glossary stays off-limits.
  Catalog policy: label "community-sourced, unofficial"; confidence high (corroborated)
  vs medium (single-source); spot-check convoluted stateful definitions before trusting
  exact mechanics (Yugioh, Eye of Sauron, Shapeshifter, Reconnaissance, Quicksand).

Off-limits forever: the password-gated official Drawback Chess glossary.

## Resources

- Repo: ~/nil/drawback-analyzer (this repo). Sibling, separate from ludwig/round-trip.
- Reuse from Ludwig (COPY, do not import across repos): `frontend/src/components/
  Board.tsx` is a DUMB pure renderer — props in (squares, piece map, decoration sets),
  raw square clicks out, ZERO chess rules. Also PieceGlyph, cn, the Vite/TS/eslint/
  prettier config shape, and the `bun run ci` + `gate:e2e` + `window.__*` evidence-
  surface pattern.
- chess.js ^1.4.0 is the legality engine. Key primitives (probe-verified):
  - `new Chess()` / `game.move(san|obj)` replays a history.
  - `game.moves({ verbose: true })` BEFORE a move = the legal move set the side had;
    each verbose move has `.flags` ('c' capture, 'e' en passant, 'b'/'q'/'k' etc.),
    `.piece`, `.from`, `.to`, `.captured`, `.promotion`. This is how obligation
    drawbacks ("must capture if possible", "must capture with a knight") are checked:
    inspect the legal set before the chosen move, compare to what was played.
  - A move's own verbose result tells you piece identity / capture-ness for stateful
    rules ("can't move the same piece twice", piece-type tracking, level-up order).
- Evidence surface for e2e: `window.__drawback` (shape above). Assert against this and
  fresh reads, never the DOM text or pixels.
- Source data: docs/research/drawback-catalog-research.md — the community-sourced
  (unofficial) catalog of 179 drawbacks with category, deterministic-checkability, and
  confidence. This is the SUBSET seed for 1b/1c. Official glossary is off-limits.

## Elimination semantics (LOCKED with Nil 2026-06-18)

- Replay-based: after every edit, replay the whole history from move 1.
- A drawback hypothesis is held for a SIDE. It stays POSSIBLE only if EVERY move that
  side has played is CONSISTENT with the drawback. It is ELIMINATED the instant one of
  that side's moves violates it.
- Prohibition drawbacks (e.g. "queen can't move"): violated if the side made a move the
  drawback forbids.
- Obligation drawbacks (e.g. "must capture if possible"): the rule inspects the legal
  move set BEFORE the chosen move; violated if a required option existed (a capture was
  legal) but the side chose otherwise.
- Random-parameter drawbacks (e.g. Comfort Zone(D4)) expand into independent
  sub-hypotheses, one per plausible parameter value; the catalog shows the family with
  its surviving parameterizations.
- Pure functions of the move history. No randomness, clocks, or network.
- A rule may also report "not-yet-constrained" (no move of that side has tested it yet)
  distinct from "possible" if useful for UI honesty.

## Phase-2 tooling readiness (probed 2026-06-18, all green)

- Runtime: bun 1.3.11, node v24.14.0 (auntie).
- chess.js 1.4.0: replay + obligation primitive (legal-set-before-move, capture-
  available detection, piece identity) probed green.
- playwright-core 1.61.0 + system Google Chrome 145.0.7632.159: launched headless
  (channel 'chrome', --no-sandbox --disable-dev-shm-usage --disable-gpu), navigated
  about:blank, read navigator.userAgent (HeadlessChrome/145). Green.
- Static/unit/build toolchain mirrors Ludwig's green stack (prettier ^3.4.2, eslint
  ^9.39.1, typescript ^5.7.2, typescript-eslint ^8.48.0); validated end-to-end by the
  gated `bun run ci` in slice 1a.
- vercel CLI 50.37.3 present but NOT authenticated (parked-for-Nil before 1f).

---

## SLICE-1a PICKUP — authored now

Baseline: the commit that adds this standing-orders file (first commit of the repo).

Goal: a runnable scaffold that replays a Drawback Chess game prefix through chess.js
and renders it, with ONE trivial smoke drawback rule wired end to end — proving the
replay -> analyze -> display pipeline before any real rule logic.

Scope (smallest end-to-end tracer):
- Bun + React + Vite + TypeScript project. Root `package.json` with the same scripts
  shape as Ludwig: `dev`, `build`, `test`, `format`, `format:check`, `lint`,
  `typecheck`, `ci`. Prettier + eslint + tsconfig (root + frontend) configured so
  `bun run ci` is green on an essentially empty project.
- `shared/` (or `src/analyzer/`) pure-TS module: a `replay(history)` that returns the
  chess.js game / positions, and a minimal analyzer entry point.
- A minimal move-entry sufficient to drive the analyzer (click on the board to make
  legal moves for whichever side is to move, plus an undo/back). Full editing UX is
  1d — keep this deliberately minimal but real.
- Render: the board (lifted dumb Board.tsx), current FEN/position, side-to-move.
- ONE smoke drawback rule, e.g. "White never moves the queen" — shown possible until
  White moves the queen, then eliminated with a reason. Just to exercise the pipeline.
- Expose `window.__drawback` (even if mostly stub) so 1d's e2e has a surface to grow.
- A couple of tests: a replay/SAN round-trip test and a smoke-rule elimination test
  (positive + negative).

Load-bearing mechanics / traps:
- COPY Board.tsx (and its small deps) from Ludwig; do NOT import across repos and do
  NOT touch the Ludwig repo. Strip eval-bar / networking bits — this app is local and
  has no server.
- chess.js is the ONLY legality source. The board's click handler proposes a move;
  chess.js validates it. The analyzer never invents legality.
- Keep the analyzer a PURE function of the move history (no React state inside it) so
  it is trivially testable and the same code path serves UI and tests.
- `bun run ci` must be green at the end (prettier-formatted, lint-clean, types clean,
  tests pass, build succeeds). Format before sending the diff (Ludwig lost a gate cycle
  to an unformatted gate script).

Acceptance criteria:
- `bun run ci` green.
- Clicking out a few moves replays correctly; side-to-move and position update.
- The smoke rule eliminates exactly when White moves the queen and stays possible
  otherwise, with a human-readable reason; covered by a positive + negative test.

Decide-with-reviewer (raise in the 1a plan-gate):
- Exact directory layout (single `frontend/` app + `shared/` analyzer, vs a flatter
  `src/`). Lean: a Vite React app with a pure `src/analyzer/` module the UI imports.
- The shape of `window.__drawback` (lock it now so 1d's e2e is stable).
- Whether the smoke rule already uses the real (draft) DrawbackRule interface or a
  throwaway — prefer a tiny real interface so 1b extends rather than rewrites.

Locked (do not relitigate): chess.js as sole legality; static/client-only; honesty
rails; copy-not-import Board.tsx; one focused commit on sign-off.

Resources: see Resources + Elimination-semantics sections above; Ludwig at
~/nil/ludwig-chess for the config/Board/evidence-surface patterns.

## SLICE-1b PICKUP — authored after 1a committed (c4e1522)

### What slice 1a taught (fold-in)
- The pipeline works: replay() → analyze() → window.__drawback, all green under
  `bun run ci`. The DrawbackRule contract `evaluate({side, plies}) -> Elimination |
  null` proved to be a clean 1b extension point — DO NOT change the fold; ADD rules.
- chess.js verbose Move fields available per ply: `color, from, to, piece, captured?,
  promotion?, flags, san`. `flags` includes 'c' (capture), 'e' (en passant), 'b' (2-sq
  pawn), 'k'/'q' (castle), 'p' (promotion). `legalBefore` is the full verbose legal set
  the side had BEFORE its move — this is the obligation surface (must-capture etc.).
- Reviewer non-blocking notes (carry forward):
  1. UI prefix entry auto-queens promotions. Fine for 1a; the prefix-entry path must be
     able to represent UNDERPROMOTION before any promotion-sensitive rule or demo in
     1d. (None of 1b's planned rules are promotion-sensitive, so this is a 1d task.)
  2. Keep rule ids GENERIC (side-agnostic, e.g. queen-no-move), evaluated per side —
     better for the per-side model. Keep this convention.
- App falls back to start position if analyze() errors; UI only ever appends legal SAN.

### Goal
Formalize the core engine and ship 10-15 deterministic, sourced rules with strong
positive (eliminated) + negative (stays-possible) tests — spanning prohibition,
capture-restriction (incl. OBLIGATION), and stateful categories.

### Scope
- Keep the existing types; ADD lightweight metadata to DrawbackRule so 1c/1d need no
  refactor: `category` (simple-move-forbid | capture-restriction | stateful |
  board-condition-loss | random-parameter), `status` ('supported' for all of 1b),
  `confidence` ('high' | 'medium' | 'low'), `sources` (string[] URLs/labels). Decide
  exact field names with reviewer.
- Small pure `rule-helpers.ts` (UI-free): pieceValue, isCapture, isBackward(color,
  from, to), sameSquare, sidePlies, opponentPrevPly(plies, index). Rules stay tiny.
- Implement ~14 rules (final list decided in plan-gate), e.g.:
  - move-forbid: Lame Duck (king can't move), Forward March (no backward), Cess (no
    h-file), Number of the Beast (no 6th rank), Stop Stalling (no lateral).
  - capture-restriction (prohibition): True Gentleman (no capturing queens), Vegan (no
    capturing knights), Conscientious Objectors (no pawn captures), Professional
    Courtesy (non-pawn can't capture same type).
  - capture OBLIGATION (uses legalBefore): Checkers (must capture if able), Pacman (if a
    pawn capture is available, must capture a pawn), Greedy (no capture when a
    higher-value capture was available).
  - stateful: Truant (no moving the same piece twice in a row — current.from ===
    this side's previous ply .to), Turn the Other Cheek (no recapture — can't capture on
    the square the opponent just captured on).
- Replace/keep the 1a smoke rule: fold queen-no-move into the real catalog OR drop it
  once real rules exist (decide in plan-gate; leaning: keep it, recategorized).
- Each rule: 1+ positive and 1+ negative example test asserting the elimination ply
  index + reason (and that unrelated rules stay possible).

### Load-bearing mechanics / traps
- Obligation rules MUST read `legalBefore`, not recompute legality. "Must capture if
  able" = legalBefore has a capture (flag 'c'/'e') AND the chosen move is not a capture.
- Greedy needs a value map and compares chosen.captured value vs the max-value capture
  available in legalBefore. Only constrains CAPTURING moves.
- Truant: "same piece" is identified by current.from === the side's previous ply's `to`
  (the piece now sitting where it last landed). "In a row" = the side's consecutive
  plies (opponent moves between). Castling/promotion edge cases — note in tests.
- Turn the Other Cheek: opponent's immediately preceding ply (plies[index-1]); recapture
  = chosen.captured AND chosen.to === that ply's `to` AND that ply was itself a capture.
- Forward March / Stop Stalling: rank/file deltas; lateral = same rank, different file
  (NOT backward); knights can move backward too.
- Determinism: rules are pure functions of plies. No chess.js re-derivation of legality
  beyond what replay already captured.

### Acceptance criteria
- `bun run ci` green (format, lint, types app+test, all tests, build).
- 10-15 rules, each with passing positive + negative tests; obligation + stateful
  categories represented and tested.
- Metadata fields present and populated (category/status/confidence/sources) — even if
  the catalog UI/page comes in 1c/1d.
- No rule re-implements legality; all lean on chess.js-derived ply data.

### Decide-with-reviewer (raise in 1b plan-gate)
- The exact rule list + count (target 14).
- DrawbackRule metadata field names/shape (category/status/confidence/sources).
- Keep vs drop the 1a smoke rule.
- How to encode `sources` minimally now (e.g. a label like "community: chess.com all-
  drawbacks thread" + confidence) so 1c just adds more.

### Locked (do not relitigate)
chess.js sole legality; analyzer UI-free + pure; the evaluate() fold contract; generic
side-agnostic rule ids; honest labeling (community-sourced, unofficial); one focused
commit on sign-off.

### Resources
docs/research/drawback-catalog-research.md (the sourced subset + confidence), the
Elimination-semantics and Resources sections above, src/analyzer/* from 1a.

## SLICE-1c..1f PICKUP — authored after the previous slice commits
(folding in what the previous slice taught)
