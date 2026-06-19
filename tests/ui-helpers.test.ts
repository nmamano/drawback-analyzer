import { test, expect, describe } from "bun:test";
import { needsPromotion, sanForMove } from "../src/lib/chess";
import {
  PARTIAL_ENTRIES,
  UNSUPPORTED_ENTRIES,
  entryById,
  entryTitle,
  catalogByCategory,
} from "../src/lib/catalog-ui";
import { DEMOS } from "../src/lib/demos";
import { CATALOG, analyze } from "../src/analyzer";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
// White pawn on e7 promotes on e8; lone kings keep it a legal, unambiguous position.
const PROMO_FEN = "k7/4P3/8/8/8/8/8/4K3 w - - 0 1";

describe("promotion path (no silent auto-queen)", () => {
  test("needsPromotion is true when a pawn reaches the last rank", () => {
    expect(needsPromotion(PROMO_FEN, "e7", "e8")).toBe(true);
  });
  test("needsPromotion is false for an ordinary move", () => {
    expect(needsPromotion(START_FEN, "e2", "e4")).toBe(false);
  });
  test("sanForMove can represent each promotion piece (underpromotion included)", () => {
    expect(sanForMove(PROMO_FEN, "e7", "e8", "q")).toContain("=Q");
    expect(sanForMove(PROMO_FEN, "e7", "e8", "r")).toContain("=R");
    expect(sanForMove(PROMO_FEN, "e7", "e8", "b")).toContain("=B");
    expect(sanForMove(PROMO_FEN, "e7", "e8", "n")).toContain("=N");
  });
});

describe("catalog-ui helpers", () => {
  test("status buckets match the 1c catalog (5 partial, 4 unsupported)", () => {
    expect(PARTIAL_ENTRIES.length).toBe(5);
    expect(UNSUPPORTED_ENTRIES.length).toBe(4);
  });
  test("entryById / entryTitle resolve, with a safe fallback", () => {
    expect(entryById("king-no-move")?.title).toBe("Lame Duck");
    expect(entryTitle("king-no-move")).toBe("Lame Duck");
    expect(entryTitle("does-not-exist")).toBe("does-not-exist");
  });
  test("catalogByCategory covers every catalog entry exactly once", () => {
    const total = catalogByCategory().reduce((n, g) => n + g.entries.length, 0);
    expect(total).toBe(CATALOG.length);
  });
});

describe("demo games", () => {
  test("each demo is a legal prefix that eliminates at least 3 drawbacks", () => {
    for (const d of DEMOS) {
      const o = analyze(d.moves);
      expect(o.ok, `demo ${d.id} should replay legally`).toBe(true);
      if (!o.ok) continue;
      const eliminations = o.result.white.eliminated.length + o.result.black.eliminated.length;
      expect(eliminations, `demo ${d.id} eliminations`).toBeGreaterThanOrEqual(3);
    }
  });
});
