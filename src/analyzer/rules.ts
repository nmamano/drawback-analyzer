import type { Color, DrawbackRule } from "./types";
import { isBackward, isCapture, fileOf, pieceValue, rankOf, sideLabel } from "./rule-helpers";

// Every supported rule traces to the community-sourced (unofficial) catalog. The app
// must never imply official/complete coverage. 1c enriches `sources` per rule.
const COMMUNITY = "community: chess.com 'all drawbacks' thread (unofficial)";

function reason(
  title: string,
  id: string,
  side: Color,
  san: string,
  moveNumber: number,
  detail: string,
): string {
  return `${sideLabel(side)} / ${title} (${id}): ${detail} — ${san} (move ${moveNumber}).`;
}

// ---------------------------------------------------------------------------
// simple-move-forbid
// ---------------------------------------------------------------------------

// Lame Duck: the king cannot move. Eliminated on any move whose piece is the king
// (castling moves the king too, so it counts).
const kingNoMove: DrawbackRule = {
  id: "king-no-move",
  title: "Lame Duck",
  description:
    "Your king cannot move. Eliminated when the side moves its king (including castling, which moves the king).",
  category: "simple-move-forbid",
  status: "supported",
  confidence: "high",
  sources: [COMMUNITY],
  evaluate({ side, plies }) {
    for (const p of plies) {
      if (p.color !== side) continue;
      if (p.move.piece === "k") {
        return {
          moveIndex: p.index,
          reason: reason(this.title, this.id, side, p.san, p.moveNumber, "moved the king"),
        };
      }
    }
    return null;
  },
};

// Forward March: no backward moves. Backward is destination-rank-relative-to-side
// (see isBackward); lateral is allowed; knights count.
const noBackwardMove: DrawbackRule = {
  id: "no-backward-move",
  title: "Forward March",
  description:
    "You cannot move backward. Backward = destination rank behind the origin (White: to-rank < from-rank; Black: to-rank > from-rank). Lateral (same rank) is allowed; every piece counts, knights included.",
  category: "simple-move-forbid",
  status: "supported",
  confidence: "high",
  sources: [COMMUNITY],
  evaluate({ side, plies }) {
    for (const p of plies) {
      if (p.color !== side) continue;
      if (isBackward(side, p.move.from, p.move.to)) {
        return {
          moveIndex: p.index,
          reason: reason(this.title, this.id, side, p.san, p.moveNumber, "moved backward"),
        };
      }
    }
    return null;
  },
};

// Cess: cannot move onto the h-file. Locked semantics: DESTINATION file is 'h'
// (entering the h-file). Moving OUT of the h-file to another file does not eliminate.
const noHFile: DrawbackRule = {
  id: "no-h-file",
  title: "Cess",
  description:
    "You cannot move onto the h-file. Eliminated when a move's DESTINATION square is on the h-file (to-file === 'h'). Moving off the h-file is fine.",
  category: "simple-move-forbid",
  status: "supported",
  confidence: "high",
  sources: [COMMUNITY],
  evaluate({ side, plies }) {
    for (const p of plies) {
      if (p.color !== side) continue;
      if (fileOf(p.move.to) === "h") {
        return {
          moveIndex: p.index,
          reason: reason(this.title, this.id, side, p.san, p.moveNumber, "moved onto the h-file"),
        };
      }
    }
    return null;
  },
};

// Number of the Beast: cannot move onto the 6th rank. Locked semantics: ABSOLUTE
// rank 6 (same for both colors), because the name is literal.
const noSixthRank: DrawbackRule = {
  id: "no-sixth-rank",
  title: "Number of the Beast",
  description:
    "You cannot move onto the 6th rank. Eliminated when a move's destination is absolute rank 6 (same for both colors).",
  category: "simple-move-forbid",
  status: "supported",
  confidence: "medium",
  sources: [COMMUNITY],
  evaluate({ side, plies }) {
    for (const p of plies) {
      if (p.color !== side) continue;
      if (rankOf(p.move.to) === 6) {
        return {
          moveIndex: p.index,
          reason: reason(this.title, this.id, side, p.san, p.moveNumber, "moved onto the 6th rank"),
        };
      }
    }
    return null;
  },
};

// Stop Stalling: no lateral (sideways) moves. Eliminated when destination rank equals
// origin rank (same rank), for any piece.
const noLateralMove: DrawbackRule = {
  id: "no-lateral-move",
  title: "Stop Stalling",
  description:
    "You cannot move laterally (sideways). Eliminated when a move's destination rank equals its origin rank (same rank), for any piece.",
  category: "simple-move-forbid",
  status: "supported",
  confidence: "medium",
  sources: [COMMUNITY],
  evaluate({ side, plies }) {
    for (const p of plies) {
      if (p.color !== side) continue;
      if (rankOf(p.move.to) === rankOf(p.move.from)) {
        return {
          moveIndex: p.index,
          reason: reason(this.title, this.id, side, p.san, p.moveNumber, "moved laterally"),
        };
      }
    }
    return null;
  },
};

// ---------------------------------------------------------------------------
// capture-restriction (prohibitions)
// ---------------------------------------------------------------------------

// True Gentleman: cannot capture queens. Eliminated when a move captures a queen.
const noCapturingQueens: DrawbackRule = {
  id: "no-capturing-queens",
  title: "True Gentleman",
  description:
    "You cannot capture queens. Eliminated when a move captures a queen (captured === 'q').",
  category: "capture-restriction",
  status: "supported",
  confidence: "high",
  sources: [COMMUNITY],
  evaluate({ side, plies }) {
    for (const p of plies) {
      if (p.color !== side) continue;
      if (p.move.captured === "q") {
        return {
          moveIndex: p.index,
          reason: reason(this.title, this.id, side, p.san, p.moveNumber, "captured a queen"),
        };
      }
    }
    return null;
  },
};

// Vegan: cannot capture knights. Eliminated when a move captures a knight.
const noCapturingKnights: DrawbackRule = {
  id: "no-capturing-knights",
  title: "Vegan",
  description:
    "You cannot capture knights. Eliminated when a move captures a knight (captured === 'n').",
  category: "capture-restriction",
  status: "supported",
  confidence: "high",
  sources: [COMMUNITY],
  evaluate({ side, plies }) {
    for (const p of plies) {
      if (p.color !== side) continue;
      if (p.move.captured === "n") {
        return {
          moveIndex: p.index,
          reason: reason(this.title, this.id, side, p.san, p.moveNumber, "captured a knight"),
        };
      }
    }
    return null;
  },
};

// Conscientious Objectors: cannot capture with pawns. Eliminated when a pawn makes a
// capture (piece === 'p' and a capture occurs, en passant included).
const noPawnCaptures: DrawbackRule = {
  id: "no-pawn-captures",
  title: "Conscientious Objectors",
  description:
    "You cannot capture with pawns. Eliminated when a pawn makes a capture (piece === 'p' and a capture occurs, en passant included).",
  category: "capture-restriction",
  status: "supported",
  confidence: "medium",
  sources: [COMMUNITY],
  evaluate({ side, plies }) {
    for (const p of plies) {
      if (p.color !== side) continue;
      if (p.move.piece === "p" && isCapture(p.move)) {
        return {
          moveIndex: p.index,
          reason: reason(this.title, this.id, side, p.san, p.moveNumber, "captured with a pawn"),
        };
      }
    }
    return null;
  },
};

// Professional Courtesy: a (non-pawn) piece cannot capture the same piece type.
// Eliminated when a non-pawn move captures a piece of its own type. Pawn-takes-pawn
// is exempt.
const noSelfTypeCapture: DrawbackRule = {
  id: "no-self-type-capture",
  title: "Professional Courtesy",
  description:
    "A (non-pawn) piece cannot capture the same piece type. Eliminated when a non-pawn move captures a piece of its own type (piece === captured, piece !== 'p'). Pawn-takes-pawn is exempt.",
  category: "capture-restriction",
  status: "supported",
  confidence: "high",
  sources: [COMMUNITY],
  evaluate({ side, plies }) {
    for (const p of plies) {
      if (p.color !== side) continue;
      if (p.move.captured && p.move.piece !== "p" && p.move.piece === p.move.captured) {
        return {
          moveIndex: p.index,
          reason: reason(
            this.title,
            this.id,
            side,
            p.san,
            p.moveNumber,
            `a ${p.move.piece} captured a ${p.move.captured}`,
          ),
        };
      }
    }
    return null;
  },
};

// ---------------------------------------------------------------------------
// capture-restriction (obligations — read legalBefore, never recompute legality)
// ---------------------------------------------------------------------------

// Checkers: must capture if able. Eliminated when a capture was legal before the move
// but the chosen move was not a capture.
const mustCaptureIfAble: DrawbackRule = {
  id: "must-capture-if-able",
  title: "Checkers",
  description:
    "You must capture if able. Eliminated when a capture was legal before the move (some legal move was a capture) but the chosen move was not a capture.",
  category: "capture-restriction",
  status: "supported",
  confidence: "high",
  sources: [COMMUNITY],
  evaluate({ side, plies }) {
    for (const p of plies) {
      if (p.color !== side) continue;
      const available = p.legalBefore.find((m) => isCapture(m));
      if (available && !isCapture(p.move)) {
        return {
          moveIndex: p.index,
          reason: reason(
            this.title,
            this.id,
            side,
            p.san,
            p.moveNumber,
            `a capture was legal (e.g. ${available.san}) but played a non-capture`,
          ),
        };
      }
    }
    return null;
  },
};

// Pacman: if you can capture a pawn, you must capture a pawn. Eliminated when a legal
// capture whose target is a pawn existed but the chosen move did not capture a pawn.
const mustCapturePawn: DrawbackRule = {
  id: "must-capture-pawn",
  title: "Pacman",
  description:
    "If you can capture a pawn, you must capture a pawn. Eliminated when a legal capture of a pawn existed (some legal move had captured === 'p') but the chosen move did not capture a pawn (captured !== 'p').",
  category: "capture-restriction",
  status: "supported",
  confidence: "high",
  sources: [COMMUNITY],
  evaluate({ side, plies }) {
    for (const p of plies) {
      if (p.color !== side) continue;
      const pawnCapture = p.legalBefore.find((m) => m.captured === "p");
      if (pawnCapture && p.move.captured !== "p") {
        return {
          moveIndex: p.index,
          reason: reason(
            this.title,
            this.id,
            side,
            p.san,
            p.moveNumber,
            `a pawn capture was legal (e.g. ${pawnCapture.san}) but did not capture a pawn`,
          ),
        };
      }
    }
    return null;
  },
};

// Greedy: when you capture, you must take the highest-value piece available. Eliminated
// when the chosen capture's target is worth less than the best available capture.
// CAPTURES-ONLY: a non-capturing move never eliminates Greedy (that is Checkers).
const noLesserCapture: DrawbackRule = {
  id: "no-lesser-capture",
  title: "Greedy",
  description:
    "When you capture, you must take the highest-value piece available; capturing a lesser piece while a higher-value capture is legal eliminates. CAPTURES-ONLY: this never forces you to capture (see Checkers for that).",
  category: "capture-restriction",
  status: "supported",
  confidence: "high",
  sources: [COMMUNITY],
  evaluate({ side, plies }) {
    for (const p of plies) {
      if (p.color !== side) continue;
      if (!p.move.captured) continue; // captures-only
      let maxAvailable = 0;
      for (const m of p.legalBefore) {
        if (m.captured) maxAvailable = Math.max(maxAvailable, pieceValue(m.captured));
      }
      if (pieceValue(p.move.captured) < maxAvailable) {
        return {
          moveIndex: p.index,
          reason: reason(
            this.title,
            this.id,
            side,
            p.san,
            p.moveNumber,
            `captured a ${p.move.captured} (value ${pieceValue(p.move.captured)}) while a higher-value capture (value ${maxAvailable}) was legal`,
          ),
        };
      }
    }
    return null;
  },
};

// ---------------------------------------------------------------------------
// stateful
// ---------------------------------------------------------------------------

// Truant: cannot move the same piece twice in a row (on consecutive turns of your
// own). Approximated from replay history by BOARD-SQUARE CONTINUITY: the piece you
// moved last turn now sits on your previous move's destination, so moving from that
// square again eliminates. KNOWN LIMITATION: square-continuity can misidentify if the
// opponent captured on that square or a different friendly piece later occupies it —
// acceptable approximation for 1b (confidence: medium).
const noSamePieceTwice: DrawbackRule = {
  id: "no-same-piece-twice",
  title: "Truant",
  description:
    "You cannot move the same piece twice in a row (consecutive turns of your own). Approximated by board-square continuity from replay history: if your move's origin equals your previous move's destination, the same piece moved again. Known limitation: square continuity can misidentify after a capture onto that square; acceptable for 1b.",
  category: "stateful",
  status: "supported",
  confidence: "medium",
  sources: [COMMUNITY],
  evaluate({ side, plies }) {
    let previousDestination: string | null = null;
    for (const p of plies) {
      if (p.color !== side) continue;
      if (previousDestination !== null && p.move.from === previousDestination) {
        return {
          moveIndex: p.index,
          reason: reason(
            this.title,
            this.id,
            side,
            p.san,
            p.moveNumber,
            "moved the same piece on two consecutive turns",
          ),
        };
      }
      previousDestination = p.move.to;
    }
    return null;
  },
};

// Turn the Other Cheek: cannot recapture. Eliminated when your move captures on the
// exact square the opponent captured on with their immediately preceding move.
const noRecapture: DrawbackRule = {
  id: "no-recapture",
  title: "Turn the Other Cheek",
  description:
    "You cannot recapture: if the opponent's immediately preceding move was a capture on a square, you cannot capture on that same square in reply. Eliminated when your capture's destination equals the square the opponent just captured on.",
  category: "stateful",
  status: "supported",
  confidence: "high",
  sources: [COMMUNITY],
  evaluate({ side, plies }) {
    for (const p of plies) {
      if (p.color !== side) continue;
      if (!p.move.captured) continue;
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
            this.title,
            this.id,
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
};

/** The supported drawback catalog. Append-only across slices; the analyzer fold is
 *  fixed. 1c expands this toward 30+ entries with enriched sources/confidence. */
export const RULES: DrawbackRule[] = [
  kingNoMove,
  noBackwardMove,
  noHFile,
  noSixthRank,
  noLateralMove,
  noCapturingQueens,
  noCapturingKnights,
  noPawnCaptures,
  noSelfTypeCapture,
  mustCaptureIfAble,
  mustCapturePawn,
  noLesserCapture,
  noSamePieceTwice,
  noRecapture,
];

/**
 * Drawbacks that exist but are NOT inferable from move history alone (hidden-info,
 * per-move random, or engine/eval-based). Surfaced separately so the app never
 * implies it covers the full glossary. Populated as catalog entries in 1c.
 */
export const UNSUPPORTED_IDS: string[] = [];
