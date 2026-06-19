import { test, expect, describe } from "bun:test";
import { analyze } from "../src/analyzer";

const SMOKE = "queen-no-move";

describe("smoke rule: queen-no-move (queen cannot move)", () => {
  test("stays possible for BOTH sides when no queen has moved", () => {
    const o = analyze(["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"]);
    expect(o.ok).toBe(true);
    if (!o.ok) return;
    expect(o.result.white.possible).toContain(SMOKE);
    expect(o.result.black.possible).toContain(SMOKE);
    expect(o.result.white.eliminated).toHaveLength(0);
    expect(o.result.black.eliminated).toHaveLength(0);
  });

  test("ELIMINATED for the side that moves its queen, with 0-based ply moveIndex + reason", () => {
    const o = analyze(["e4", "e5", "Qh5"]); // White's queen moves at ply 2
    expect(o.ok).toBe(true);
    if (!o.ok) return;

    expect(o.result.white.possible).not.toContain(SMOKE);
    const elim = o.result.white.eliminated.find((e) => e.id === SMOKE);
    expect(elim).toBeDefined();
    expect(elim?.moveIndex).toBe(2); // 0-based ply index (e4=0, e5=1, Qh5=2)
    expect(elim?.reason.toLowerCase()).toContain("queen");

    // Black has not moved its queen, so the hypothesis is still alive for Black.
    expect(o.result.black.possible).toContain(SMOKE);
    expect(o.result.black.eliminated).toHaveLength(0);
  });

  test("eliminates on the FIRST violating move, not a later one", () => {
    const o = analyze(["d4", "d5", "Qd3", "Nc6", "Qf5"]); // White queen first moves at ply 2
    expect(o.ok).toBe(true);
    if (!o.ok) return;
    const elim = o.result.white.eliminated.find((e) => e.id === SMOKE);
    expect(elim?.moveIndex).toBe(2);
  });

  test("evidence surface mirrors the analysis and declares no false coverage", () => {
    const o = analyze(["e4", "e5", "Qh5"]);
    expect(o.ok).toBe(true);
    if (!o.ok) return;
    expect(o.evidence.unsupported).toEqual([]); // honest: nothing claimed beyond support
    expect(o.evidence.moveHistory).toEqual(["e4", "e5", "Qh5"]);
    expect(o.evidence.sideToMove).toBe("black");
    expect(o.evidence.white.eliminated[0]?.id).toBe(SMOKE);
    expect(o.evidence.black.possible).toContain(SMOKE);
  });
});
