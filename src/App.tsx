import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "@/lib/chess";
import {
  squaresInDisplayOrder,
  piecesFromFen,
  legalTargets,
  needsPromotion,
  checkedKingSquare,
  sanForMove,
} from "@/lib/chess";
import { Board } from "@/components/Board";
import { analyze, CATALOG, SUPPORTED_RULES } from "@/analyzer";
import type { SideAnalysis } from "@/analyzer";
import { publishDrawbackEvidence } from "@/lib/evidence";

const START_FEN = new Chess().fen();
const SQUARES = squaresInDisplayOrder("white");

function ruleTitle(id: string): string {
  return CATALOG.find((e) => e.id === id)?.title ?? id;
}

export function App() {
  const [history, setHistory] = useState<string[]>([]);
  const [selected, setSelected] = useState<Square | null>(null);

  // The whole app is a pure function of the move history: replay + analyze on edit.
  const outcome = useMemo(() => analyze(history), [history]);

  // The UI only ever appends chess.js-legal moves, so analyze() should always
  // succeed; fall back to the start position defensively rather than throwing.
  const fen = outcome.ok ? outcome.evidence.fen : START_FEN;
  const sideToMove = outcome.ok ? outcome.evidence.sideToMove : "white";

  // ONE place that publishes analyzer state to the e2e evidence surface.
  useEffect(() => {
    if (outcome.ok) publishDrawbackEvidence(outcome.evidence);
  }, [outcome]);

  const pieces = useMemo(() => piecesFromFen(fen), [fen]);
  const targets = selected ? legalTargets(fen, selected) : [];
  const checkSquare = checkedKingSquare(fen);
  const lastMoveSquares = useMemo<Square[]>(() => {
    if (!outcome.ok || outcome.plies.length === 0) return [];
    const last = outcome.plies[outcome.plies.length - 1].move;
    return [last.from, last.to];
  }, [outcome]);

  function handleSquareClick(sq: Square) {
    const piece = pieces.get(sq);
    if (selected) {
      if (sq === selected) {
        setSelected(null);
        return;
      }
      // Ask chess.js (the only legality authority) for the SAN of selected -> sq.
      const promotion = needsPromotion(fen, selected, sq) ? "q" : undefined;
      const san = sanForMove(fen, selected, sq, promotion);
      if (san) {
        setHistory((h) => [...h, san]);
        setSelected(null);
        return;
      }
      // Not a legal destination: reselect another own piece, else clear.
      setSelected(piece && piece.color === sideToMove ? sq : null);
      return;
    }
    if (piece && piece.color === sideToMove) setSelected(sq);
  }

  function undo() {
    setHistory((h) => h.slice(0, -1));
    setSelected(null);
  }
  function reset() {
    setHistory([]);
    setSelected(null);
  }

  const analysis = outcome.ok ? outcome.result : null;
  const supportedCount = SUPPORTED_RULES.length;
  const unsupported = outcome.ok ? outcome.evidence.unsupported : [];

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6">
      <header className="mb-5">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Drawback Analyzer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a Drawback Chess game prefix and see which drawbacks are still possible for each
          side. Supports {supportedCount} known drawback{supportedCount === 1 ? "" : "s"}
          {unsupported.length > 0
            ? ` (+${unsupported.length} catalogued as partial/unsupported)`
            : ""}{" "}
          — community-sourced and unofficial; not the full glossary.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(0,520px)_1fr]">
        <SidePanel side="White" analysis={analysis?.white} />

        <div className="order-first lg:order-none">
          <Board
            squares={SQUARES}
            pieces={pieces}
            selected={selected}
            legalTargets={targets}
            lastMoveSquares={lastMoveSquares}
            checkSquare={checkSquare}
            interactive
            onSquareClick={handleSquareClick}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={undo}
              disabled={history.length === 0}
              data-testid="undo"
              className="rounded-lg border-2 border-border bg-card px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={history.length === 0}
              data-testid="reset"
              className="rounded-lg border-2 border-border bg-card px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
            >
              Reset
            </button>
            <span className="text-sm text-muted-foreground" data-testid="side-to-move">
              {sideToMove === "white" ? "White" : "Black"} to move
            </span>
          </div>
          <p
            className="mt-2 font-mono text-[11px] break-all text-muted-foreground"
            data-testid="fen"
          >
            {fen}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {history.length === 0 ? "No moves yet." : `Moves: ${history.join(" ")}`}
          </p>

          {unsupported.length > 0 && (
            <div
              className="mt-3 rounded-xl border-2 border-border bg-card p-3"
              data-testid="unsupported"
            >
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Not inferred from moves ({unsupported.length})
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Partial / unsupported drawbacks — shown for honesty, never eliminated by the
                analyzer.
              </p>
              <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                {unsupported.map((id) => (
                  <li key={id} className="text-xs" data-drawback-id={id}>
                    {ruleTitle(id)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <SidePanel side="Black" analysis={analysis?.black} />
      </div>
    </div>
  );
}

function SidePanel({ side, analysis }: { side: string; analysis: SideAnalysis | undefined }) {
  const testid = side.toLowerCase();
  return (
    <section
      className="rounded-2xl border-2 border-border bg-card p-3"
      data-testid={`panel-${testid}`}
    >
      <h2 className="font-heading text-sm font-bold tracking-wide uppercase">{side}</h2>

      <h3 className="mt-2 text-xs font-semibold text-primary">Possible</h3>
      <ul className="mt-1 space-y-1" data-testid={`possible-${testid}`}>
        {analysis && analysis.possible.length > 0 ? (
          analysis.possible.map((id) => (
            <li key={id} className="text-sm" data-drawback-id={id}>
              {ruleTitle(id)}
            </li>
          ))
        ) : (
          <li className="text-sm text-muted-foreground">—</li>
        )}
      </ul>

      <h3 className="mt-3 text-xs font-semibold text-lose">Eliminated</h3>
      <ul className="mt-1 space-y-1" data-testid={`eliminated-${testid}`}>
        {analysis && analysis.eliminated.length > 0 ? (
          analysis.eliminated.map((e) => (
            <li key={e.id} className="text-sm" data-drawback-id={e.id}>
              <span className="line-through">{ruleTitle(e.id)}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{e.reason}</span>
            </li>
          ))
        ) : (
          <li className="text-sm text-muted-foreground">—</li>
        )}
      </ul>
    </section>
  );
}
