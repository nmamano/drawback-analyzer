import { test, expect, describe } from "bun:test";
import { analyze } from "../src/analyzer";
import type { Color } from "../src/analyzer";

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

describe("must-move-king-if-able (Bottled Lightning)", () => {
  test("eliminated when the king could move but another piece moved", () => {
    expect(elimination(["e4", "e5", "Nf3"], "white", "must-move-king-if-able")?.moveIndex).toBe(2);
  });
  test("possible when the king is never able to move", () => {
    expect(isPossible(["Nf3", "e5", "Nc3", "d5"], "white", "must-move-king-if-able")).toBe(true);
  });
});

describe("must-king-capture-if-able (Escort Mission)", () => {
  test("eliminated when the king could capture but a non-king-capture was played", () => {
    const h = ["e4", "e5", "Ke2", "Qg5", "Kf3", "Qg4", "Ke3"];
    expect(elimination(h, "white", "must-king-capture-if-able")?.moveIndex).toBe(6);
  });
  test("possible when the king never has a capture", () => {
    expect(isPossible(["e4", "e5", "Nf3", "Nc6"], "white", "must-king-capture-if-able")).toBe(true);
  });
});

describe("shadow-queen (Shadow Queen)", () => {
  test("eliminated when the queen moves to a light square", () => {
    expect(elimination(["e4", "e5", "Qh5"], "white", "shadow-queen")?.moveIndex).toBe(2);
  });
  test("possible when the queen never moves to a light square", () => {
    expect(isPossible(["e4", "e5", "Nf3", "Nc6"], "white", "shadow-queen")).toBe(true);
  });
});

describe("queen-home-ranks-only (Stay-at-Home-Mom)", () => {
  test("eliminated when the queen leaves its home ranks", () => {
    expect(elimination(["e4", "e5", "Qh5"], "white", "queen-home-ranks-only")?.moveIndex).toBe(2);
  });
  test("possible when the queen stays on its home ranks (Qe2)", () => {
    expect(isPossible(["e4", "e5", "Qe2"], "white", "queen-home-ranks-only")).toBe(true);
  });
});

describe("no-giving-check (Respectful)", () => {
  test("eliminated when a move gives check", () => {
    expect(elimination(["e4", "f5", "Qh5"], "white", "no-giving-check")?.moveIndex).toBe(2);
  });
  test("possible when no check is given", () => {
    expect(isPossible(["e4", "e5", "Nf3", "Nc6"], "white", "no-giving-check")).toBe(true);
  });
});

describe("knights-no-capture (Horse Tranquilizer)", () => {
  test("eliminated when a knight captures", () => {
    expect(elimination(["Nf3", "e5", "Nxe5"], "white", "knights-no-capture")?.moveIndex).toBe(2);
  });
  test("possible when knights make no captures", () => {
    expect(isPossible(["e4", "e5", "Nf3", "Nc6"], "white", "knights-no-capture")).toBe(true);
  });
});

describe("queen-no-capture (Trophy Wife)", () => {
  test("eliminated when the queen captures", () => {
    expect(
      elimination(["e4", "e5", "Qh5", "Nc6", "Qxe5"], "white", "queen-no-capture")?.moveIndex,
    ).toBe(4);
  });
  test("possible when the queen makes no captures", () => {
    expect(isPossible(["e4", "e5", "Nf3", "Nc6"], "white", "queen-no-capture")).toBe(true);
  });
});

describe("no-capturing-higher-value (Punching Down)", () => {
  test("eliminated when a lower-value piece captures a higher-value one (N takes Q)", () => {
    const h = ["e4", "d5", "exd5", "Qxd5", "Nc3", "Nf6", "Nxd5"];
    expect(elimination(h, "white", "no-capturing-higher-value")?.moveIndex).toBe(6);
  });
  test("EDGE: capturing equal value (pawn takes pawn) does not eliminate", () => {
    expect(isPossible(["e4", "d5", "exd5"], "white", "no-capturing-higher-value")).toBe(true);
  });
});

describe("no-piece-takes-pawn (Elephants Fear Mice)", () => {
  test("eliminated when a non-pawn captures a pawn", () => {
    expect(elimination(["Nf3", "e5", "Nxe5"], "white", "no-piece-takes-pawn")?.moveIndex).toBe(2);
  });
  test("EDGE: pawn capturing a pawn does not eliminate (capturer is a pawn)", () => {
    expect(isPossible(["e4", "d5", "exd5"], "white", "no-piece-takes-pawn")).toBe(true);
  });
});

describe("no-adjacent-capture (Far Sighted)", () => {
  test("eliminated on a distance-1 capture (pawn takes adjacent)", () => {
    expect(elimination(["e4", "d5", "exd5"], "white", "no-adjacent-capture")?.moveIndex).toBe(2);
  });
  test("possible when a capture is distance > 1 (knight capture)", () => {
    expect(isPossible(["Nf3", "e5", "Nxe5"], "white", "no-adjacent-capture")).toBe(true);
  });
});

describe("no-social-move-adjacent-enemy (Social Distancing)", () => {
  test("eliminated on a non-capturing move adjacent to an enemy piece", () => {
    expect(
      elimination(["e4", "Nf6", "e5"], "white", "no-social-move-adjacent-enemy")?.moveIndex,
    ).toBe(2);
  });
  test("possible when non-captures stay clear of enemy pieces", () => {
    expect(isPossible(["e4", "e5", "Nf3", "Nc6"], "white", "no-social-move-adjacent-enemy")).toBe(
      true,
    );
  });
});

describe("no-same-type-twice (Spice of Life)", () => {
  test("eliminated on the same piece TYPE two turns in a row (N then N)", () => {
    expect(elimination(["Nf3", "e5", "Nc3"], "white", "no-same-type-twice")?.moveIndex).toBe(2);
  });
  test("possible when consecutive moves are different types (N then pawn)", () => {
    expect(isPossible(["Nf3", "e5", "e4"], "white", "no-same-type-twice")).toBe(true);
  });
});

describe("no-knight-after-knight (Quit Horsing Around)", () => {
  test("eliminated on knight immediately after a knight", () => {
    expect(elimination(["Nf3", "e5", "Nc3"], "white", "no-knight-after-knight")?.moveIndex).toBe(2);
  });
  test("possible when a non-knight separates knight moves", () => {
    expect(isPossible(["Nf3", "e5", "e4"], "white", "no-knight-after-knight")).toBe(true);
  });
});

describe("no-capture-twice (Remorseful)", () => {
  test("eliminated on captures on two consecutive own turns", () => {
    expect(
      elimination(["e4", "d5", "exd5", "e6", "dxe6"], "white", "no-capture-twice")?.moveIndex,
    ).toBe(4);
  });
  test("possible when a non-capture separates captures", () => {
    expect(isPossible(["e4", "d5", "exd5", "Nf6", "Nc3"], "white", "no-capture-twice")).toBe(true);
  });
});

describe("king-moves-once (Out of Breath)", () => {
  test("eliminated on the SECOND king move", () => {
    expect(
      elimination(["e4", "e5", "Ke2", "Nc6", "Ke1"], "white", "king-moves-once")?.moveIndex,
    ).toBe(4);
  });
  test("possible when the king moves at most once", () => {
    expect(isPossible(["e4", "e5", "Ke2", "Nc6", "Nf3"], "white", "king-moves-once")).toBe(true);
  });
});

describe("Crenellations(color) random-parameter family", () => {
  test("a light-square pawn move (e4) eliminates the DARK sub-hypothesis, keeps LIGHT", () => {
    expect(elimination(["e4"], "white", "crenellations-dark")?.moveIndex).toBe(0);
    expect(isPossible(["e4"], "white", "crenellations-light")).toBe(true);
  });
  test("a dark-square pawn move (d4) eliminates the LIGHT sub-hypothesis, keeps DARK", () => {
    expect(elimination(["d4"], "white", "crenellations-light")?.moveIndex).toBe(0);
    expect(isPossible(["d4"], "white", "crenellations-dark")).toBe(true);
  });
  test("a non-pawn move triggers neither sub-hypothesis", () => {
    expect(isPossible(["Nf3"], "white", "crenellations-light")).toBe(true);
    expect(isPossible(["Nf3"], "white", "crenellations-dark")).toBe(true);
  });
});
