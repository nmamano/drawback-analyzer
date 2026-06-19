// Small pure helpers shared by the rules. UI-free; depends only on chess.js types and
// plain FEN/string parsing (never a second legality engine).

import type { Move, PieceSymbol } from "chess.js";
import type { Color } from "./types";

// Standard material values. King is 0: it never appears as a `captured` piece in
// legal chess (you cannot capture a king), so its value is irrelevant to value rules.
export const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export function pieceValue(sym: PieceSymbol): number {
  return PIECE_VALUE[sym] ?? 0;
}

/** A move is a capture iff chess.js recorded a captured piece (covers en passant). */
export function isCapture(m: Move): boolean {
  return Boolean(m.captured);
}

export function fileOf(square: string): string {
  return square[0];
}
export function rankOf(square: string): number {
  return Number(square[1]);
}
export function fileIndex(square: string): number {
  return square.charCodeAt(0) - 97; // 'a' -> 0
}

/**
 * Is from->to a backward move for `color`? Destination rank relative to origin:
 * White backward = to-rank < from-rank; Black backward = to-rank > from-rank.
 * Lateral (same rank) is NOT backward. Applies to every piece, knights included.
 */
export function isBackward(color: Color, from: string, to: string): boolean {
  const delta = rankOf(to) - rankOf(from);
  return color === "white" ? delta < 0 : delta > 0;
}

/** King-distance (Chebyshev): max(|file delta|, |rank delta|). Adjacent === 1. */
export function kingDistance(a: string, b: string): number {
  return Math.max(Math.abs(fileIndex(a) - fileIndex(b)), Math.abs(rankOf(a) - rankOf(b)));
}

/** Square color, matching the board renderer: dark when (fileIndex + rankIndex) even. */
export function squareColor(square: string): "light" | "dark" {
  return (fileIndex(square) + (rankOf(square) - 1)) % 2 === 0 ? "dark" : "light";
}

export function opponentOf(color: Color): Color {
  return color === "white" ? "black" : "white";
}

export function sideLabel(color: Color): string {
  return color === "white" ? "White" : "Black";
}

/**
 * Squares occupied by `color` in a FEN, by plain placement-field parsing (no chess.js
 * instance, no legality). Used for "adjacent to an enemy piece" style rules.
 */
export function occupiedByColor(fen: string, color: Color): string[] {
  const placement = fen.split(" ")[0];
  const rows = placement.split("/"); // rank 8 first
  const out: string[] = [];
  for (let r = 0; r < rows.length; r++) {
    const rank = 8 - r;
    let file = 0;
    for (const ch of rows[r]) {
      if (ch >= "1" && ch <= "9") {
        file += Number(ch);
        continue;
      }
      const pieceColor: Color = ch === ch.toUpperCase() ? "white" : "black";
      if (pieceColor === color) out.push(`${"abcdefgh"[file]}${rank}`);
      file++;
    }
  }
  return out;
}
