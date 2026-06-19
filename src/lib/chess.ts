// Client-side chess helpers for the board UI. chess.js is the SINGLE legality
// authority everywhere in this app; these helpers only translate clicks into legal
// SAN and derive what to draw. Nothing here is a second rules engine.

import { Chess } from "chess.js";
import type { Square, PieceSymbol } from "chess.js";

export type { Square, PieceSymbol };

export type Color = "white" | "black";

export function toColor(c: "w" | "b"): Color {
  return c === "w" ? "white" : "black";
}
export function toChessColor(c: Color): "w" | "b" {
  return c === "white" ? "w" : "b";
}

export interface UiPiece {
  type: PieceSymbol;
  color: Color;
}

const FILES = "abcdefgh";

export function fileIndex(square: Square): number {
  return square.charCodeAt(0) - 97;
}
export function rankIndex(square: Square): number {
  return Number(square[1]) - 1;
}
export function isDarkSquare(square: Square): boolean {
  return (fileIndex(square) + rankIndex(square)) % 2 === 0;
}

// 64 squares in display order: white orientation = rank 8 at top, file a at left.
export function squaresInDisplayOrder(orientation: Color): Square[] {
  const ranks = orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = orientation === "white" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const out: Square[] = [];
  for (const r of ranks) {
    for (const f of files) out.push(`${FILES[f]}${r}` as Square);
  }
  return out;
}

// Occupied squares -> piece, derived from a FEN. Presentation only.
export function piecesFromFen(fen: string): Map<Square, UiPiece> {
  const map = new Map<Square, UiPiece>();
  for (const row of new Chess(fen).board()) {
    for (const cell of row) {
      if (cell) map.set(cell.square, { type: cell.type, color: toColor(cell.color) });
    }
  }
  return map;
}

// Legal destinations for the piece on `from` (side to move only), per chess.js.
export function legalTargets(fen: string, from: Square): Square[] {
  try {
    const moves = new Chess(fen).moves({ square: from, verbose: true });
    return [...new Set(moves.map((m) => m.to))];
  } catch {
    return [];
  }
}

// Does from->to require choosing a promotion piece?
export function needsPromotion(fen: string, from: Square, to: Square): boolean {
  try {
    return new Chess(fen)
      .moves({ square: from, verbose: true })
      .some((m) => m.to === to && Boolean(m.promotion));
  } catch {
    return false;
  }
}

// SAN for a from->to (optionally promotion) move, or null if chess.js rejects it.
// chess.js validates; this is how a board click becomes an authoritative SAN.
export function sanForMove(
  fen: string,
  from: Square,
  to: Square,
  promotion?: "q" | "r" | "b" | "n",
): string | null {
  try {
    return new Chess(fen).move({ from, to, promotion }).san;
  } catch {
    return null;
  }
}

// Square of the side-to-move king when it is in check (for a highlight), else null.
export function checkedKingSquare(fen: string): Square | null {
  const chess = new Chess(fen);
  if (!chess.inCheck()) return null;
  const turn = chess.turn();
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.type === "k" && cell.color === turn) return cell.square;
    }
  }
  return null;
}
