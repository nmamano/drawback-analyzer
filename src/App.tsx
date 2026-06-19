import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
import { PromotionPicker } from "@/components/PromotionPicker";
import { CatalogPage } from "@/components/CatalogPage";
import { analyze, SUPPORTED_RULES } from "@/analyzer";
import type { Color, SideAnalysis } from "@/analyzer";
import { publishDrawbackEvidence } from "@/lib/evidence";
import { entryById, entryTitle, PARTIAL_ENTRIES, UNSUPPORTED_ENTRIES } from "@/lib/catalog-ui";
import { DEMOS } from "@/lib/demos";
import { cn } from "@/lib/cn";

const START_FEN = new Chess().fen();
const SQUARES = squaresInDisplayOrder("white");

type View = "analyzer" | "catalog";
type Pending = { from: Square; to: Square };

export function App() {
  const [view, setView] = useState<View>("analyzer");
  const [history, setHistory] = useState<string[]>([]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  // The whole app is a pure function of the move history: replay + analyze on edit.
  const outcome = useMemo(() => analyze(history), [history]);
  const fen = outcome.ok ? outcome.evidence.fen : START_FEN;
  const sideToMove: Color = outcome.ok ? outcome.evidence.sideToMove : "white";

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

  function commitMove(san: string) {
    setHistory((h) => [...h, san]);
    setSelected(null);
    setPending(null);
  }

  function handleSquareClick(sq: Square) {
    if (pending) return; // resolve the open promotion first
    const piece = pieces.get(sq);
    if (selected) {
      if (sq === selected) {
        setSelected(null);
        return;
      }
      // A pawn reaching the last rank opens the picker — never auto-queen silently.
      if (needsPromotion(fen, selected, sq)) {
        setPending({ from: selected, to: sq });
        return;
      }
      const san = sanForMove(fen, selected, sq);
      if (san) {
        commitMove(san);
        return;
      }
      setSelected(piece && piece.color === sideToMove ? sq : null);
      return;
    }
    if (piece && piece.color === sideToMove) setSelected(sq);
  }

  function choosePromotion(p: "q" | "r" | "b" | "n") {
    if (!pending) return;
    const san = sanForMove(fen, pending.from, pending.to, p);
    if (san) commitMove(san);
    else {
      setPending(null);
      setSelected(null);
    }
  }

  function undo() {
    setHistory((h) => h.slice(0, -1));
    setSelected(null);
    setPending(null);
  }
  function reset() {
    setHistory([]);
    setSelected(null);
    setPending(null);
  }
  function rewindTo(plyIndex: number) {
    setHistory((h) => h.slice(0, plyIndex + 1));
    setSelected(null);
    setPending(null);
  }
  function loadDemo(moves: string[]) {
    setHistory(moves);
    setSelected(null);
    setPending(null);
    setView("analyzer");
  }

  const analysis = outcome.ok ? outcome.result : null;

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-3 py-5 sm:px-4 sm:py-6">
      <header className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-heading text-xl font-extrabold tracking-tight sm:text-2xl">
            Drawback Analyzer
          </h1>
          <nav className="flex gap-1 rounded-lg border-2 border-border bg-card p-0.5">
            <TabButton
              active={view === "analyzer"}
              testid="tab-analyzer"
              onClick={() => setView("analyzer")}
            >
              Analyzer
            </TabButton>
            <TabButton
              active={view === "catalog"}
              testid="tab-catalog"
              onClick={() => setView("catalog")}
            >
              Catalog
            </TabButton>
          </nav>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Click out a Drawback Chess prefix; see which drawbacks remain possible per side. Supports{" "}
          {SUPPORTED_RULES.length} known drawbacks ({PARTIAL_ENTRIES.length} partial,{" "}
          {UNSUPPORTED_ENTRIES.length} unsupported) — community-sourced and unofficial; not the full
          glossary.
        </p>
      </header>

      {view === "catalog" ? (
        <CatalogPage />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(0,480px)_1fr]">
            <SidePanel side="White" analysis={analysis?.white} />

            <div className="order-first lg:order-none">
              <div className="relative">
                <Board
                  squares={SQUARES}
                  pieces={pieces}
                  selected={selected}
                  legalTargets={targets}
                  lastMoveSquares={lastMoveSquares}
                  checkSquare={checkSquare}
                  interactive={!pending}
                  onSquareClick={handleSquareClick}
                />
                {pending && (
                  <PromotionPicker
                    color={sideToMove}
                    onPick={choosePromotion}
                    onCancel={() => {
                      setPending(null);
                      setSelected(null);
                    }}
                  />
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={undo}
                  disabled={history.length === 0}
                  data-testid="undo"
                  className={controlClass}
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={reset}
                  disabled={history.length === 0}
                  data-testid="reset"
                  className={controlClass}
                >
                  Reset
                </button>
                <span className="text-sm text-muted-foreground" data-testid="side-to-move">
                  {sideToMove === "white" ? "White" : "Black"} to move
                </span>
              </div>

              <MoveList history={history} onRewind={rewindTo} />

              <p
                className="mt-2 font-mono text-[11px] break-all text-muted-foreground"
                data-testid="fen"
              >
                {fen}
              </p>

              <div className="mt-3">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Try a demo
                </h3>
                <div className="mt-1 flex flex-col gap-1">
                  {DEMOS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => loadDemo(d.moves)}
                      data-demo={d.id}
                      className="rounded-lg border-2 border-border bg-card px-3 py-1.5 text-left text-xs hover:border-ring"
                    >
                      <span className="font-semibold">{d.label}</span>
                      <span className="mt-0.5 block text-muted-foreground">{d.note}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <SidePanel side="Black" analysis={analysis?.black} />
          </div>

          <NotEvaluatedBuckets />
        </>
      )}
    </div>
  );
}

const controlClass =
  "rounded-lg border-2 border-border bg-card px-3 py-1.5 text-sm font-semibold disabled:opacity-40";

function TabButton({
  active,
  testid,
  onClick,
  children,
}: {
  active: boolean;
  testid: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1 text-sm font-semibold",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function MoveList({
  history,
  onRewind,
}: {
  history: string[];
  onRewind: (plyIndex: number) => void;
}) {
  if (history.length === 0) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        No moves yet — click a piece, then its destination.
      </p>
    );
  }
  return (
    <div className="mt-2" data-testid="move-list">
      <p className="text-xs text-muted-foreground">Moves (click one to rewind):</p>
      <ol className="mt-1 flex flex-wrap gap-1">
        {history.map((san, i) => (
          <li key={i}>
            <button
              type="button"
              data-move-index={i}
              onClick={() => onRewind(i)}
              className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-xs hover:border-ring"
            >
              {i % 2 === 0 ? `${i / 2 + 1}.` : ""}
              {san}
            </button>
          </li>
        ))}
      </ol>
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
      <ul className="mt-1 max-h-64 space-y-0.5 overflow-y-auto" data-testid={`possible-${testid}`}>
        {analysis && analysis.possible.length > 0 ? (
          analysis.possible.map((id) => (
            <li
              key={id}
              className="flex items-baseline justify-between gap-2 text-sm"
              data-drawback-id={id}
            >
              <span>{entryTitle(id)}</span>
              <span className="text-[10px] text-muted-foreground">{entryById(id)?.confidence}</span>
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
              <span className="line-through">{entryTitle(e.id)}</span>
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

// Global, shown once: partial and unsupported drawbacks the analyzer does NOT evaluate.
// Split into distinct buckets so partial work isn't read as impossible-to-analyze.
function NotEvaluatedBuckets() {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Bucket
        title="Partial — known, not yet evaluated"
        testid="bucket-partial"
        note="Cataloged (e.g. lose-conditions) but the analyzer does not infer them yet."
        ids={PARTIAL_ENTRIES.map((e) => e.id)}
      />
      <Bucket
        title="Unsupported — not inferable from moves"
        testid="bucket-unsupported"
        note="Hidden-info or per-move random; cannot be inferred from a move history."
        ids={UNSUPPORTED_ENTRIES.map((e) => e.id)}
      />
    </div>
  );
}

function Bucket({
  title,
  testid,
  note,
  ids,
}: {
  title: string;
  testid: string;
  note: string;
  ids: string[];
}) {
  return (
    <section className="rounded-2xl border-2 border-border bg-card p-3" data-testid={testid}>
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{note}</p>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
        {ids.map((id) => (
          <li key={id} className="text-xs" data-drawback-id={id}>
            {entryTitle(id)}
          </li>
        ))}
      </ul>
    </section>
  );
}
