import { Chess } from "chess.js";
import type { PlyInfo, ReplayResult } from "./types";

// Local color helper keeps the analyzer free of any UI imports.
function toColor(c: "w" | "b"): "white" | "black" {
  return c === "w" ? "white" : "black";
}

/**
 * Replay a SAN history from the start through chess.js, recording for each ply the
 * position + legal move set BEFORE the move (the obligation surface) and the move
 * actually played. Returns a typed structured error for illegal/unrecognized input
 * instead of letting a raw chess.js throw escape into UI state.
 */
export function replay(history: string[]): ReplayResult {
  const game = new Chess();
  const plies: PlyInfo[] = [];

  for (let i = 0; i < history.length; i++) {
    const san = history[i];
    const fenBefore = game.fen();
    const legalBefore = game.moves({ verbose: true });
    const color = toColor(game.turn());

    try {
      const move = game.move(san);
      plies.push({
        index: i,
        moveNumber: Math.floor(i / 2) + 1,
        color,
        fenBefore,
        legalBefore,
        move,
        san: move.san,
      });
    } catch (e) {
      return {
        ok: false,
        error: {
          index: i,
          san,
          message: e instanceof Error ? e.message : `Illegal or unrecognized move: ${san}`,
        },
      };
    }
  }

  return {
    ok: true,
    plies,
    fen: game.fen(),
    sideToMove: toColor(game.turn()),
    moveHistory: plies.map((p) => p.san),
  };
}
