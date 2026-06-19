// Small pure helpers shared by the rules. UI-free; depends only on chess.js types.

import type { Move, PieceSymbol } from "chess.js";
import type { Color } from "./types";

// Standard material values. King is 0: it never appears as a `captured` piece in
// legal chess (you cannot capture a king), so its value is irrelevant to Greedy.
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

/**
 * Is from->to a backward move for `color`? Defined by destination rank relative to
 * origin: White backward = to-rank < from-rank; Black backward = to-rank > from-rank.
 * Lateral (same rank) is NOT backward. Applies to every piece, knights included.
 */
export function isBackward(color: Color, from: string, to: string): boolean {
  const delta = rankOf(to) - rankOf(from);
  return color === "white" ? delta < 0 : delta > 0;
}

export function sideLabel(color: Color): string {
  return color === "white" ? "White" : "Black";
}
