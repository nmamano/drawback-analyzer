import { test, expect, describe } from "bun:test";
import { analyze } from "../src/analyzer";
import type { Color } from "../src/analyzer";

// Helpers: run analyze and read a side's verdict for a rule id.
function elimination(history: string[], side: Color, id: string) {
  const o = analyze(history);
  if (!o.ok) throw new Error(`replay failed: ${JSON.stringify(o.error)}`);
  return o.result[side].eliminated.find((e) => e.id === id);
}
function isPossible(history: string[], side: Color, id: string): boolean {
  const o = analyze(history);
  if (!o.ok) throw new Error(`replay failed: ${JSON.stringify(o.error)}`);
  return o.result[side].possible.includes(id);
}

describe("start position", () => {
  test("every rule is possible for both sides, nothing eliminated, no false coverage", () => {
    const o = analyze([]);
    expect(o.ok).toBe(true);
    if (!o.ok) return;
    expect(o.result.white.eliminated).toHaveLength(0);
    expect(o.result.black.eliminated).toHaveLength(0);
    expect(o.result.white.possible.length).toBe(14);
    expect(o.result.black.possible.length).toBe(14);
    expect(o.result.unsupported).toEqual([]);
    expect(o.evidence.sideToMove).toBe("white");
  });
});

describe("king-no-move (Lame Duck)", () => {
  test("eliminated when the side moves its king", () => {
    expect(elimination(["e4", "e5", "Ke2"], "white", "king-no-move")?.moveIndex).toBe(2);
  });
  test("possible when the king never moves", () => {
    expect(isPossible(["e4", "e5", "Nf3", "Nc6"], "white", "king-no-move")).toBe(true);
  });
});

describe("no-backward-move (Forward March)", () => {
  test("eliminated on a backward move (knight retreats)", () => {
    expect(elimination(["Nf3", "e5", "Ng1"], "white", "no-backward-move")?.moveIndex).toBe(2);
  });
  test("possible when only forward/lateral moves are played", () => {
    expect(isPossible(["e4", "e5", "Nf3", "Nc6"], "white", "no-backward-move")).toBe(true);
    expect(isPossible(["e4", "e5", "Nf3", "Nc6"], "black", "no-backward-move")).toBe(true);
  });
});

describe("no-h-file (Cess)", () => {
  test("eliminated on a move whose DESTINATION is the h-file", () => {
    expect(elimination(["Nf3", "e5", "Nh4"], "white", "no-h-file")?.moveIndex).toBe(2);
  });
  test("EDGE: moving OFF the h-file does not eliminate (to-file semantics)", () => {
    // Rh1->g1 leaves the h-file; destination file is 'g', so it must NOT eliminate.
    expect(isPossible(["Nf3", "e5", "Rg1"], "white", "no-h-file")).toBe(true);
  });
  test("possible with no h-file activity", () => {
    expect(isPossible(["e4", "e5", "Nf3", "Nc6"], "white", "no-h-file")).toBe(true);
  });
});

describe("no-sixth-rank (Number of the Beast)", () => {
  test("eliminated for White on a destination of absolute rank 6", () => {
    expect(
      elimination(["e4", "d5", "exd5", "Nf6", "d6"], "white", "no-sixth-rank")?.moveIndex,
    ).toBe(4);
  });
  test("EDGE: absolute rank 6 also eliminates Black (Nc6), and not White there", () => {
    expect(elimination(["Nf3", "Nc6"], "black", "no-sixth-rank")?.moveIndex).toBe(1);
    expect(isPossible(["Nf3", "Nc6"], "white", "no-sixth-rank")).toBe(true);
  });
  test("possible with no rank-6 destinations", () => {
    expect(isPossible(["e4", "e5", "Nf3", "Bc5"], "white", "no-sixth-rank")).toBe(true);
    expect(isPossible(["e4", "e5", "Nf3", "Bc5"], "black", "no-sixth-rank")).toBe(true);
  });
});

describe("no-lateral-move (Stop Stalling)", () => {
  test("eliminated on a same-rank move (Rh1->g1)", () => {
    expect(elimination(["Nf3", "e5", "Rg1"], "white", "no-lateral-move")?.moveIndex).toBe(2);
  });
  test("possible when no lateral move is played", () => {
    expect(isPossible(["e4", "e5", "Nf3", "Nc6"], "white", "no-lateral-move")).toBe(true);
  });
});

describe("no-capturing-queens (True Gentleman)", () => {
  test("eliminated when a queen is captured", () => {
    const h = ["e4", "d5", "exd5", "Qxd5", "Nc3", "Nf6", "Nxd5"];
    expect(elimination(h, "white", "no-capturing-queens")?.moveIndex).toBe(6);
    // Black captured only a pawn (Qxd5), so Black is unaffected.
    expect(isPossible(h, "black", "no-capturing-queens")).toBe(true);
  });
  test("possible when no queen is captured", () => {
    expect(isPossible(["e4", "e5", "Nf3", "Nc6"], "white", "no-capturing-queens")).toBe(true);
  });
});

describe("no-capturing-knights (Vegan)", () => {
  test("eliminated when a knight is captured", () => {
    const h = ["e4", "e5", "Nf3", "Nc6", "Bb5", "Nf6", "Bxc6"];
    expect(elimination(h, "white", "no-capturing-knights")?.moveIndex).toBe(6);
  });
  test("possible when no knight is captured", () => {
    expect(isPossible(["e4", "e5", "Nf3", "Nc6"], "white", "no-capturing-knights")).toBe(true);
  });
});

describe("no-pawn-captures (Conscientious Objectors)", () => {
  test("eliminated when a pawn captures", () => {
    expect(elimination(["e4", "d5", "exd5"], "white", "no-pawn-captures")?.moveIndex).toBe(2);
  });
  test("possible when pawns make no captures", () => {
    expect(isPossible(["e4", "e5", "Nf3", "Nc6"], "white", "no-pawn-captures")).toBe(true);
  });
});

describe("no-self-type-capture (Professional Courtesy)", () => {
  test("eliminated when a knight captures a knight", () => {
    expect(
      elimination(["Nf3", "Nc6", "e4", "Nd4", "Nxd4"], "white", "no-self-type-capture")?.moveIndex,
    ).toBe(4);
  });
  test("EDGE: pawn-takes-pawn is exempt", () => {
    expect(isPossible(["e4", "d5", "exd5"], "white", "no-self-type-capture")).toBe(true);
  });
  test("possible with no same-type capture", () => {
    expect(isPossible(["e4", "e5", "Nf3", "Nc6"], "white", "no-self-type-capture")).toBe(true);
  });
});

describe("must-capture-if-able (Checkers)", () => {
  test("eliminated when a capture was legal but a non-capture was played", () => {
    expect(elimination(["e4", "d5", "Nf3"], "white", "must-capture-if-able")?.moveIndex).toBe(2);
  });
  test("possible when no capture was ever available at the side's turn", () => {
    expect(isPossible(["e4", "e5", "Nf3", "Nc6"], "white", "must-capture-if-able")).toBe(true);
  });
});

describe("must-capture-pawn (Pacman)", () => {
  test("eliminated when a pawn-capture was legal but no pawn was captured", () => {
    expect(elimination(["e4", "d5", "Nf3"], "white", "must-capture-pawn")?.moveIndex).toBe(2);
  });
  test("EDGE: only a NON-pawn capture available -> not triggered (target-pawn semantics)", () => {
    // No pawn has made contact, so the ONLY legal capture is Nf3xd4 (a knight).
    // Declining with e3 must NOT eliminate Pacman (no pawn was capturable)...
    const h = ["Nf3", "Nc6", "Nc3", "Nd4", "e3"];
    expect(isPossible(h, "white", "must-capture-pawn")).toBe(true);
    // ...but Checkers IS eliminated there (a capture was available, declined).
    expect(elimination(h, "white", "must-capture-if-able")?.moveIndex).toBe(4);
  });
  test("possible when no pawn capture is ever available", () => {
    expect(isPossible(["e4", "e5", "Nf3", "Nc6"], "white", "must-capture-pawn")).toBe(true);
  });
});

describe("no-lesser-capture (Greedy)", () => {
  test("eliminated when a lesser capture is taken while a higher-value one was legal", () => {
    // 3.exd6 e.p. grabs a pawn (1) while exf6 (knight, 3) was legal.
    const h = ["e4", "Nf6", "e5", "d5", "exd6"];
    expect(elimination(h, "white", "no-lesser-capture")?.moveIndex).toBe(4);
  });
  test("EDGE: captures-only — declining a capture never eliminates Greedy (that's Checkers)", () => {
    expect(isPossible(["e4", "d5", "Nf3"], "white", "no-lesser-capture")).toBe(true);
  });
  test("possible when the highest-value available capture is taken", () => {
    expect(isPossible(["e4", "d5", "exd5"], "white", "no-lesser-capture")).toBe(true);
  });
});

describe("no-same-piece-twice (Truant)", () => {
  test("eliminated when the same piece moves on consecutive own turns", () => {
    expect(elimination(["Nf3", "e5", "Ng5"], "white", "no-same-piece-twice")?.moveIndex).toBe(2);
  });
  test("possible when a DIFFERENT piece moves on the next own turn", () => {
    expect(isPossible(["Nf3", "e5", "Nc3"], "white", "no-same-piece-twice")).toBe(true);
  });
  test("EDGE: moving the same piece NON-consecutively (another own move between) is fine", () => {
    expect(isPossible(["Nf3", "e5", "e4", "d6", "Ng5"], "white", "no-same-piece-twice")).toBe(true);
  });
});

describe("no-recapture (Turn the Other Cheek)", () => {
  test("eliminated when capturing on the square the opponent just captured on", () => {
    expect(elimination(["e4", "d5", "exd5", "Qxd5"], "black", "no-recapture")?.moveIndex).toBe(3);
  });
  test("possible for a capture that is not an immediate recapture", () => {
    expect(isPossible(["e4", "e5", "Nf3", "Nc6", "Nxe5"], "white", "no-recapture")).toBe(true);
  });
});

describe("reason strings", () => {
  test("name the side, rule title+id, SAN, and the violated condition", () => {
    const e = elimination(["e4", "d5", "Nf3"], "white", "must-capture-if-able");
    expect(e?.reason).toContain("White");
    expect(e?.reason).toContain("Checkers");
    expect(e?.reason).toContain("must-capture-if-able");
    expect(e?.reason).toContain("Nf3");
  });
});
