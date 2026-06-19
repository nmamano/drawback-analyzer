import type { Color, PieceSymbol } from "@/lib/chess";
import { PieceGlyph } from "@/components/PieceGlyph";

// Minimal promotion picker: Q/R/B/N. Shown when a pawn move reaches the last rank, so
// the prefix entry never silently auto-queens (underpromotion is representable).
const CHOICES: Array<"q" | "r" | "b" | "n"> = ["q", "r", "b", "n"];

export function PromotionPicker({
  color,
  onPick,
  onCancel,
}: {
  color: Color;
  onPick: (piece: "q" | "r" | "b" | "n") => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-black/40"
      data-testid="promotion-picker"
      onClick={onCancel}
    >
      <div
        className="rounded-2xl border-2 border-border bg-card p-3 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-2 text-center text-xs font-semibold text-muted-foreground">Promote to</p>
        <div className="flex gap-2">
          {CHOICES.map((piece) => (
            <button
              key={piece}
              type="button"
              data-promote={piece}
              onClick={() => onPick(piece)}
              className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-border bg-secondary text-3xl leading-none hover:border-ring"
              aria-label={`Promote to ${piece}`}
            >
              <PieceGlyph type={piece as PieceSymbol} color={color} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
