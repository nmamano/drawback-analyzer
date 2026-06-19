import type { PieceSymbol, Color } from "@/lib/chess";
import { cn } from "@/lib/cn";

// Solid Unicode glyphs for BOTH colors; fill + outline are applied via CSS so white
// pieces stay crisp on dark squares. chess.js piece symbols (p/n/b/r/q/k) key it.
const GLYPH: Record<PieceSymbol, string> = {
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

// Text variation selector (U+FE0E) forces text (not emoji) presentation on iOS.
const TEXT_PRESENTATION = String.fromCharCode(0xfe0e);

export function PieceGlyph({
  type,
  color,
  className,
}: {
  type: PieceSymbol;
  color: Color;
  className?: string;
}) {
  return (
    <span
      className={cn(
        color === "white" ? "text-white" : "text-neutral-900",
        "pointer-coarse:-translate-y-[8%]",
        className,
      )}
      style={{
        WebkitTextStroke:
          color === "white" ? "1.25px rgba(0,0,0,0.7)" : "1px rgba(255,255,255,0.35)",
      }}
    >
      {GLYPH[type] + TEXT_PRESENTATION}
    </span>
  );
}
