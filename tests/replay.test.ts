import { test, expect, describe } from "bun:test";
import { replay } from "../src/analyzer";

describe("replay", () => {
  test("replays a legal prefix and round-trips SAN + side-to-move", () => {
    const r = replay(["e4", "e5", "Nf3", "Nc6"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plies.length).toBe(4);
    expect(r.moveHistory).toEqual(["e4", "e5", "Nf3", "Nc6"]);
    expect(r.plies[0].color).toBe("white");
    expect(r.plies[1].color).toBe("black");
    expect(r.plies[0].index).toBe(0);
    expect(r.plies[0].moveNumber).toBe(1);
    expect(r.plies[1].moveNumber).toBe(1);
    expect(r.plies[2].moveNumber).toBe(2);
    expect(r.sideToMove).toBe("white");
  });

  test("records the legal move set BEFORE each move (the obligation surface)", () => {
    const r = replay(["e4", "d5"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const whiteFirst = r.plies[0];
    // 20 legal first moves for White, and e4 is among them.
    expect(whiteFirst.legalBefore.length).toBe(20);
    expect(whiteFirst.legalBefore.some((m) => m.san === "e4")).toBe(true);
    // Before Black's reply, White's e-pawn capture of d5 was NOT yet on the board,
    // but a capture exists for White only on the next ply — assert Black saw d5 legal.
    expect(r.plies[1].legalBefore.some((m) => m.san === "d5")).toBe(true);
  });

  test("returns a typed structured error (not a throw) for an illegal move", () => {
    const r = replay(["Qh5"]); // queen is blocked from h5 on move 1
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.index).toBe(0);
    expect(r.error.san).toBe("Qh5");
    expect(typeof r.error.message).toBe("string");
    expect(r.error.message.length).toBeGreaterThan(0);
  });

  test("the error reports the offending ply index mid-history", () => {
    const r = replay(["e4", "e5", "Ke2", "totally-bogus"]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.index).toBe(3);
    expect(r.error.san).toBe("totally-bogus");
  });
});
