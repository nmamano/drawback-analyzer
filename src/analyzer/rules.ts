import type { Move } from "chess.js";
import type { CatalogEntry, Color, Elimination, PlyInfo, SupportedRule } from "./types";
import { isSupportedRule } from "./types";
import {
  fileOf,
  isBackward,
  isCapture,
  kingDistance,
  occupiedByColor,
  opponentOf,
  pieceValue,
  rankOf,
  sideLabel,
  squareColor,
} from "./rule-helpers";

// Every supported rule traces to the community-sourced (unofficial) catalog. The app
// must never imply official/complete coverage. 1c enriches `sources` per rule.
const COMMUNITY = "community: chess.com 'all drawbacks' thread (unofficial)";
type Meta = Omit<SupportedRule, "evaluate">;

function reason(meta: Meta, side: Color, san: string, moveNumber: number, detail: string): string {
  return `${sideLabel(side)} / ${meta.title} (${meta.id}): ${detail} — ${san} (move ${moveNumber}).`;
}

// Factory: builds a supported rule whose evaluate CLOSES OVER its own metadata (no
// `this`), so evaluators can be passed around or destructured without breaking reasons.
function rule(
  meta: Meta,
  fn: (ctx: { side: Color; plies: PlyInfo[] }, meta: Meta) => Elimination | null,
): SupportedRule {
  return { ...meta, evaluate: (ctx) => fn(ctx, meta) };
}

// Single-ply predicate rules: eliminate on the first of the side's moves matching pred.
function perMove(
  meta: Meta,
  predicate: (p: PlyInfo, side: Color) => boolean,
  detail: (p: PlyInfo) => string,
): SupportedRule {
  return rule(meta, ({ side, plies }, m) => {
    for (const p of plies) {
      if (p.color !== side) continue;
      if (predicate(p, side)) {
        return { moveIndex: p.index, reason: reason(m, side, p.san, p.moveNumber, detail(p)) };
      }
    }
    return null;
  });
}

// Stateful rules over CONSECUTIVE turns of the same side (opponent moves between).
function consecutiveSidePly(
  meta: Meta,
  violates: (prev: PlyInfo, cur: PlyInfo) => boolean,
  detail: string,
): SupportedRule {
  return rule(meta, ({ side, plies }, m) => {
    let prev: PlyInfo | null = null;
    for (const p of plies) {
      if (p.color !== side) continue;
      if (prev && violates(prev, p)) {
        return { moveIndex: p.index, reason: reason(m, side, p.san, p.moveNumber, detail) };
      }
      prev = p;
    }
    return null;
  });
}

function maxCaptureValue(moves: Move[]): number {
  let max = 0;
  for (const m of moves) if (m.captured) max = Math.max(max, pieceValue(m.captured));
  return max;
}

function isQueenHomeRank(side: Color, square: string): boolean {
  return side === "white" ? rankOf(square) <= 2 : rankOf(square) >= 7;
}

const sup = (m: Omit<Meta, "status">): Meta => ({ ...m, status: "supported" });

// ===========================================================================
// SUPPORTED rules (executable). Append-only; the analyzer fold never changes.
// ===========================================================================

const supported: SupportedRule[] = [
  // ---- simple-move-forbid ----
  perMove(
    sup({
      id: "king-no-move",
      title: "Lame Duck",
      description:
        "Your king cannot move. Eliminated when the side moves its king (castling moves the king too).",
      category: "simple-move-forbid",
      confidence: "high",
      sources: [COMMUNITY],
    }),
    (p) => p.move.piece === "k",
    () => "moved the king",
  ),
  perMove(
    sup({
      id: "no-backward-move",
      title: "Forward March",
      description:
        "You cannot move backward. Backward = destination rank behind the origin (White to<from, Black to>from). Lateral is allowed; every piece counts, knights included.",
      category: "simple-move-forbid",
      confidence: "high",
      sources: [COMMUNITY],
    }),
    (p, side) => isBackward(side, p.move.from, p.move.to),
    () => "moved backward",
  ),
  perMove(
    sup({
      id: "no-h-file",
      title: "Cess",
      description:
        "You cannot move onto the h-file. Eliminated when a move's DESTINATION square is on the h-file (to-file === 'h'). Moving off the h-file is fine.",
      category: "simple-move-forbid",
      confidence: "high",
      sources: [COMMUNITY],
    }),
    (p) => fileOf(p.move.to) === "h",
    () => "moved onto the h-file",
  ),
  perMove(
    sup({
      id: "no-sixth-rank",
      title: "Number of the Beast",
      description:
        "You cannot move onto the 6th rank (absolute rank 6, both colors). Eliminated when a move's destination rank === 6.",
      category: "simple-move-forbid",
      confidence: "medium",
      sources: [COMMUNITY],
    }),
    (p) => rankOf(p.move.to) === 6,
    () => "moved onto the 6th rank",
  ),
  perMove(
    sup({
      id: "no-lateral-move",
      title: "Stop Stalling",
      description:
        "You cannot move laterally (sideways). Eliminated when a move's destination rank equals its origin rank, for any piece.",
      category: "simple-move-forbid",
      confidence: "medium",
      sources: [COMMUNITY],
    }),
    (p) => rankOf(p.move.to) === rankOf(p.move.from),
    () => "moved laterally",
  ),
  perMove(
    sup({
      id: "no-giving-check",
      title: "Respectful",
      description:
        "You cannot give check. Eliminated when a move leaves the opponent in check (from the post-move position recorded during replay).",
      category: "simple-move-forbid",
      confidence: "medium",
      sources: [COMMUNITY],
    }),
    (p) => p.givesCheck,
    () => "gave check",
  ),
  perMove(
    sup({
      id: "shadow-queen",
      title: "Shadow Queen",
      description:
        "Your queen can only move to dark squares. Eliminated when a queen move's DESTINATION is a light square.",
      category: "simple-move-forbid",
      confidence: "medium",
      sources: [COMMUNITY],
    }),
    (p) => p.move.piece === "q" && squareColor(p.move.to) !== "dark",
    () => "moved the queen to a light square",
  ),
  perMove(
    sup({
      id: "queen-home-ranks-only",
      title: "Stay-at-Home-Mom",
      description:
        "Your queen can only move to your two home ranks (White ranks 1-2, Black ranks 7-8). Eliminated when a queen move's destination is outside its home ranks.",
      category: "simple-move-forbid",
      confidence: "medium",
      sources: [COMMUNITY],
    }),
    (p, side) => p.move.piece === "q" && !isQueenHomeRank(side, p.move.to),
    () => "moved the queen off its home ranks",
  ),
  perMove(
    sup({
      id: "no-social-move-adjacent-enemy",
      title: "Social Distancing",
      description:
        "You cannot make a non-capturing move to a square adjacent (king-distance 1) to an enemy piece. Eliminated when a non-capturing move lands next to any enemy piece in the post-move position.",
      category: "simple-move-forbid",
      confidence: "high",
      sources: [COMMUNITY],
    }),
    (p, side) =>
      !isCapture(p.move) &&
      occupiedByColor(p.fenAfter, opponentOf(side)).some((sq) => kingDistance(p.move.to, sq) === 1),
    () => "made a non-capturing move adjacent to an enemy piece",
  ),

  // ---- capture-restriction (prohibitions) ----
  perMove(
    sup({
      id: "no-capturing-queens",
      title: "True Gentleman",
      description: "You cannot capture queens. Eliminated when a move captures a queen.",
      category: "capture-restriction",
      confidence: "high",
      sources: [COMMUNITY],
    }),
    (p) => p.move.captured === "q",
    () => "captured a queen",
  ),
  perMove(
    sup({
      id: "no-capturing-knights",
      title: "Vegan",
      description: "You cannot capture knights. Eliminated when a move captures a knight.",
      category: "capture-restriction",
      confidence: "high",
      sources: [COMMUNITY],
    }),
    (p) => p.move.captured === "n",
    () => "captured a knight",
  ),
  perMove(
    sup({
      id: "no-pawn-captures",
      title: "Conscientious Objectors",
      description:
        "You cannot capture with pawns. Eliminated when a pawn makes a capture (en passant included).",
      category: "capture-restriction",
      confidence: "medium",
      sources: [COMMUNITY],
    }),
    (p) => p.move.piece === "p" && isCapture(p.move),
    () => "captured with a pawn",
  ),
  perMove(
    sup({
      id: "no-self-type-capture",
      title: "Professional Courtesy",
      description:
        "A (non-pawn) piece cannot capture the same piece type. Eliminated when a non-pawn move captures its own type (piece === captured, piece !== 'p'). Pawn-takes-pawn is exempt.",
      category: "capture-restriction",
      confidence: "high",
      sources: [COMMUNITY],
    }),
    (p) => Boolean(p.move.captured) && p.move.piece !== "p" && p.move.piece === p.move.captured,
    (p) => `a ${p.move.piece} captured a ${p.move.captured}`,
  ),
  perMove(
    sup({
      id: "knights-no-capture",
      title: "Horse Tranquilizer",
      description: "Your knights cannot capture. Eliminated when a knight makes a capture.",
      category: "capture-restriction",
      confidence: "medium",
      sources: [COMMUNITY],
    }),
    (p) => p.move.piece === "n" && isCapture(p.move),
    () => "a knight captured",
  ),
  perMove(
    sup({
      id: "queen-no-capture",
      title: "Trophy Wife",
      description: "Your queen cannot capture. Eliminated when the queen makes a capture.",
      category: "capture-restriction",
      confidence: "medium",
      sources: [COMMUNITY],
    }),
    (p) => p.move.piece === "q" && isCapture(p.move),
    () => "the queen captured",
  ),
  perMove(
    sup({
      id: "no-capturing-higher-value",
      title: "Punching Down",
      description:
        "You cannot capture a piece worth more than the capturing piece. Eliminated when value(captured) > value(capturer).",
      category: "capture-restriction",
      confidence: "medium",
      sources: [COMMUNITY],
    }),
    (p) => Boolean(p.move.captured) && pieceValue(p.move.captured!) > pieceValue(p.move.piece),
    (p) => `a ${p.move.piece} captured a higher-value ${p.move.captured}`,
  ),
  perMove(
    sup({
      id: "no-piece-takes-pawn",
      title: "Elephants Fear Mice",
      description:
        "Your non-pawn pieces cannot capture pawns. Eliminated when a non-pawn move captures a pawn.",
      category: "capture-restriction",
      confidence: "medium",
      sources: [COMMUNITY],
    }),
    (p) => p.move.piece !== "p" && p.move.captured === "p",
    () => "a non-pawn captured a pawn",
  ),
  perMove(
    sup({
      id: "no-adjacent-capture",
      title: "Far Sighted",
      description:
        "Your pieces cannot capture an adjacent (king-distance 1) piece. Eliminated when a capture's from/to are king-distance 1 apart.",
      category: "capture-restriction",
      confidence: "medium",
      sources: [COMMUNITY],
    }),
    (p) => isCapture(p.move) && kingDistance(p.move.from, p.move.to) === 1,
    () => "captured an adjacent (distance-1) piece",
  ),

  // ---- capture-restriction (obligations — read legalBefore only) ----
  perMove(
    sup({
      id: "must-capture-if-able",
      title: "Checkers",
      description:
        "You must capture if able. Eliminated when a capture was legal before the move but a non-capture was played.",
      category: "capture-restriction",
      confidence: "high",
      sources: [COMMUNITY],
    }),
    (p) => p.legalBefore.some((m) => isCapture(m)) && !isCapture(p.move),
    (p) =>
      `a capture was legal (e.g. ${p.legalBefore.find((m) => isCapture(m))?.san}) but played a non-capture`,
  ),
  perMove(
    sup({
      id: "must-capture-pawn",
      title: "Pacman",
      description:
        "If you can capture a pawn, you must capture a pawn. Eliminated when a legal capture of a pawn existed but the chosen move did not capture a pawn.",
      category: "capture-restriction",
      confidence: "high",
      sources: [COMMUNITY],
    }),
    (p) => p.legalBefore.some((m) => m.captured === "p") && p.move.captured !== "p",
    (p) =>
      `a pawn capture was legal (e.g. ${p.legalBefore.find((m) => m.captured === "p")?.san}) but did not capture a pawn`,
  ),
  perMove(
    sup({
      id: "no-lesser-capture",
      title: "Greedy",
      description:
        "When you capture, you must take the highest-value piece available; capturing a lesser piece while a higher-value capture was legal eliminates. CAPTURES-ONLY: it never forces you to capture (see Checkers).",
      category: "capture-restriction",
      confidence: "high",
      sources: [COMMUNITY],
    }),
    (p) =>
      Boolean(p.move.captured) && pieceValue(p.move.captured!) < maxCaptureValue(p.legalBefore),
    (p) =>
      `captured a ${p.move.captured} (value ${pieceValue(p.move.captured!)}) while a higher-value capture (value ${maxCaptureValue(p.legalBefore)}) was legal`,
  ),
  perMove(
    sup({
      id: "must-move-king-if-able",
      title: "Bottled Lightning",
      description:
        "If you can move your king, you must. Eliminated when a king move was legal before the move but a non-king move was played.",
      category: "stateful",
      confidence: "high",
      sources: [COMMUNITY],
    }),
    (p) => p.legalBefore.some((m) => m.piece === "k") && p.move.piece !== "k",
    () => "could move the king but moved another piece",
  ),
  perMove(
    sup({
      id: "must-king-capture-if-able",
      title: "Escort Mission",
      description:
        "If your king can capture, it must. Eliminated when a king capture was legal before the move but the chosen move was not a king capture.",
      category: "stateful",
      confidence: "medium",
      sources: [COMMUNITY],
    }),
    (p) =>
      p.legalBefore.some((m) => m.piece === "k" && isCapture(m)) &&
      !(p.move.piece === "k" && isCapture(p.move)),
    () => "the king could capture but did not",
  ),

  // ---- stateful ----
  consecutiveSidePly(
    sup({
      id: "no-same-piece-twice",
      title: "Truant",
      description:
        "You cannot move the same piece twice in a row. Approximated by board-square continuity: your move's origin equals your previous move's destination. Known limitation: continuity can misidentify after a capture onto that square (confidence medium).",
      category: "stateful",
      confidence: "medium",
      sources: [COMMUNITY],
    }),
    (prev, cur) => cur.move.from === prev.move.to,
    "moved the same piece on two consecutive turns",
  ),
  consecutiveSidePly(
    sup({
      id: "no-same-type-twice",
      title: "Spice of Life",
      description:
        "You cannot move the same piece TYPE twice in a row. Eliminated when your move's piece type equals your previous move's piece type.",
      category: "stateful",
      confidence: "medium",
      sources: [COMMUNITY],
    }),
    (prev, cur) => cur.move.piece === prev.move.piece,
    "moved the same piece type on two consecutive turns",
  ),
  consecutiveSidePly(
    sup({
      id: "no-knight-after-knight",
      title: "Quit Horsing Around",
      description:
        "If you moved a knight last turn, you cannot move a knight this turn. Eliminated when both your previous and current moves are knight moves.",
      category: "stateful",
      confidence: "medium",
      sources: [COMMUNITY],
    }),
    (prev, cur) => prev.move.piece === "n" && cur.move.piece === "n",
    "moved a knight immediately after a knight",
  ),
  consecutiveSidePly(
    sup({
      id: "no-capture-twice",
      title: "Remorseful",
      description:
        "You cannot capture on two consecutive turns. Eliminated when both your previous and current moves are captures.",
      category: "stateful",
      confidence: "medium",
      sources: [COMMUNITY],
    }),
    (prev, cur) => isCapture(prev.move) && isCapture(cur.move),
    "captured on two consecutive turns",
  ),
  rule(
    sup({
      id: "king-moves-once",
      title: "Out of Breath",
      description:
        "You can only move your king once the whole game. Eliminated on the SECOND king move.",
      category: "stateful",
      confidence: "medium",
      sources: [COMMUNITY],
    }),
    ({ side, plies }, m) => {
      let kingMoves = 0;
      for (const p of plies) {
        if (p.color !== side) continue;
        if (p.move.piece === "k") {
          kingMoves++;
          if (kingMoves >= 2) {
            return {
              moveIndex: p.index,
              reason: reason(m, side, p.san, p.moveNumber, "moved the king a second time"),
            };
          }
        }
      }
      return null;
    },
  ),
  rule(
    sup({
      id: "no-recapture",
      title: "Turn the Other Cheek",
      description:
        "You cannot recapture: if the opponent's immediately preceding move was a capture on a square, you cannot capture on that same square in reply.",
      category: "stateful",
      confidence: "high",
      sources: [COMMUNITY],
    }),
    ({ side, plies }, m) => {
      for (const p of plies) {
        if (p.color !== side || !p.move.captured) continue;
        const previous = plies[p.index - 1];
        if (
          previous &&
          previous.color !== side &&
          previous.move.captured &&
          previous.move.to === p.move.to
        ) {
          return {
            moveIndex: p.index,
            reason: reason(
              m,
              side,
              p.san,
              p.moveNumber,
              `recaptured on ${p.move.to} where the opponent just captured`,
            ),
          };
        }
      }
      return null;
    },
  ),
];

// ---- random-parameter family: Crenellations(color) as two sub-hypotheses ----
// Demonstrates the sub-hypothesis pattern cheaply (2 entries). Larger families
// (Comfort Zone over 64 squares) are deferred for catalog/UI cost.
const crenellations: SupportedRule[] = (["light", "dark"] as const).map((color) =>
  perMove(
    sup({
      id: `crenellations-${color}`,
      title: `Crenellations (${color})`,
      description: `Your pawns can only move to ${color} squares. Eliminated when a pawn move's destination is not a ${color} square. (Random-parameter family: the hidden colour is a sub-hypothesis.)`,
      category: "random-parameter",
      confidence: "high",
      sources: [COMMUNITY],
    }),
    (p) => p.move.piece === "p" && squareColor(p.move.to) !== color,
    () => `moved a pawn to a non-${color} square`,
  ),
);

// ===========================================================================
// DATA-ONLY entries (partial / unsupported). No `evaluate` — never run, never in
// possible/eliminated. They appear in the catalog and in window.__drawback.unsupported.
// ===========================================================================

const dataOnly: CatalogEntry[] = [
  // partial: known + cataloged, executable logic deferred (lose-conditions need
  // board-state assertions, or piece identity we don't fully track yet).
  {
    id: "crossing-the-rubicon",
    title: "Crossing the Rubicon",
    description:
      "Once one of your pieces crosses to the opponent's half, it cannot return. Needs reliable piece-identity tracking (board-square continuity is too weak); deferred.",
    category: "stateful",
    status: "partial",
    confidence: "medium",
    sources: [COMMUNITY],
  },
  {
    id: "pawn-battle",
    title: "Pawn Battle",
    description:
      "You lose if you ever have fewer pawns than the opponent. A board-state lose-condition (not a move filter); executable check deferred past 1c.",
    category: "board-condition-loss",
    status: "partial",
    confidence: "high",
    sources: [COMMUNITY],
  },
  {
    id: "three-check",
    title: "Three Check",
    description:
      "You lose if you are checked three times. A board-state lose-condition; executable check deferred past 1c.",
    category: "board-condition-loss",
    status: "partial",
    confidence: "high",
    sources: [COMMUNITY],
  },
  {
    id: "king-of-the-hill",
    title: "King of the Hill",
    description:
      "You lose if you start a turn with no piece on the central four squares (after move 1). Lose-condition; deferred.",
    category: "board-condition-loss",
    status: "partial",
    confidence: "medium",
    sources: [COMMUNITY],
  },
  {
    id: "tower-defense",
    title: "Tower Defense",
    description:
      "You cannot move your rooks and you lose if you lose all your rooks. The move-forbid half is trivial but the lose-condition is a board-state assertion; deferred as partial.",
    category: "board-condition-loss",
    status: "partial",
    confidence: "high",
    sources: [COMMUNITY],
  },
  // unsupported: not inferable from move history alone (per-move RNG).
  {
    id: "gambler",
    title: "Gambler",
    description:
      "You cannot move a specific piece type, re-randomized every move. The forbidden type changes each turn unobservably — not inferable from history.",
    category: "random-parameter",
    status: "unsupported",
    confidence: "medium",
    sources: [COMMUNITY],
  },
  {
    id: "hand-and-brainless",
    title: "Hand and Brainless",
    description:
      "You must move a specific piece type, re-randomized every move. Per-move RNG — not inferable from history.",
    category: "random-parameter",
    status: "unsupported",
    confidence: "medium",
    sources: [COMMUNITY],
  },
  {
    id: "obsession",
    title: "Obsession",
    description:
      "Each turn a random square is chosen; if you can move there you must. Per-turn RNG — not inferable from history.",
    category: "random-parameter",
    status: "unsupported",
    confidence: "medium",
    sources: [COMMUNITY],
  },
  {
    id: "unlucky",
    title: "Unlucky",
    description:
      "You cannot move to half the squares, re-randomized every move. Per-move RNG — not inferable from history.",
    category: "random-parameter",
    status: "unsupported",
    confidence: "medium",
    sources: [COMMUNITY],
  },
];

/** The full catalog: supported (executable) + data-only (partial/unsupported). */
export const CATALOG: CatalogEntry[] = [...supported, ...crenellations, ...dataOnly];

/** Entries the analyzer actually folds (those with an evaluate). */
export const SUPPORTED_RULES: SupportedRule[] = CATALOG.filter(isSupportedRule);

/** Catalog ids NOT evaluated by the analyzer (partial + unsupported), surfaced
 *  separately so the app never implies it covers the full glossary. */
export const UNSUPPORTED_IDS: string[] = CATALOG.filter((e) => !isSupportedRule(e)).map(
  (e) => e.id,
);
