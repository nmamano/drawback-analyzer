import { test, expect, describe } from "bun:test";
import {
  CATALOG,
  SUPPORTED_RULES,
  UNSUPPORTED_IDS,
  analyze,
  isSupportedRule,
} from "../src/analyzer";
import type { DrawbackCategory, DrawbackStatus, Confidence } from "../src/analyzer";

const CATEGORIES: DrawbackCategory[] = [
  "simple-move-forbid",
  "capture-restriction",
  "stateful",
  "board-condition-loss",
  "random-parameter",
];
const STATUSES: DrawbackStatus[] = ["supported", "unsupported", "partial"];
const CONFIDENCES: Confidence[] = ["high", "medium", "low"];

describe("catalog shape", () => {
  test("ships ~30 supported executable rules (1c target 28-32)", () => {
    expect(SUPPORTED_RULES.length).toBeGreaterThanOrEqual(28);
    expect(SUPPORTED_RULES.length).toBeLessThanOrEqual(32);
  });

  test("CATALOG partitions cleanly into supported + non-supported", () => {
    expect(SUPPORTED_RULES).toEqual(CATALOG.filter(isSupportedRule));
    expect(UNSUPPORTED_IDS).toEqual(CATALOG.filter((e) => !isSupportedRule(e)).map((e) => e.id));
    expect(SUPPORTED_RULES.length + UNSUPPORTED_IDS.length).toBe(CATALOG.length);
  });

  test("every catalog entry has complete, well-formed metadata", () => {
    for (const e of CATALOG) {
      expect(e.id, `id for ${e.title}`).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(e.title.length, `title for ${e.id}`).toBeGreaterThan(0);
      expect(e.description.length, `description for ${e.id}`).toBeGreaterThan(0);
      expect(CATEGORIES, `category for ${e.id}`).toContain(e.category);
      expect(STATUSES, `status for ${e.id}`).toContain(e.status);
      expect(CONFIDENCES, `confidence for ${e.id}`).toContain(e.confidence);
      expect(e.sources.length, `sources for ${e.id}`).toBeGreaterThanOrEqual(1);
    }
  });

  test("supported entries have evaluate + status supported; data-only entries do not", () => {
    for (const e of CATALOG) {
      if (isSupportedRule(e)) {
        expect(e.status).toBe("supported");
        expect(typeof e.evaluate).toBe("function");
      } else {
        expect(["partial", "unsupported"]).toContain(e.status);
        expect(e.evaluate).toBeUndefined();
      }
    }
  });

  test("rule ids are unique", () => {
    const ids = CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("the retired smoke rule queen-no-move is absent", () => {
    expect(CATALOG.some((e) => e.id === "queen-no-move")).toBe(false);
  });

  test("UNSUPPORTED_IDS includes at least one partial AND one unsupported, no supported", () => {
    const byId = new Map(CATALOG.map((e) => [e.id, e]));
    const statuses = UNSUPPORTED_IDS.map((id) => byId.get(id)?.status);
    expect(statuses).toContain("partial");
    expect(statuses).toContain("unsupported");
    const supportedIds = new Set(SUPPORTED_RULES.map((r) => r.id));
    for (const id of UNSUPPORTED_IDS) expect(supportedIds.has(id)).toBe(false);
  });
});

describe("analyzer folds ONLY supported entries", () => {
  const supportedIds = new Set(SUPPORTED_RULES.map((r) => r.id));

  test("possible + eliminated ids are all supported; evidence.unsupported mirrors data-only", () => {
    for (const h of [[], ["e4", "e5", "Qh5"], ["Nf3", "Nc6", "Nc3", "Nd4", "Nxd4"]]) {
      const o = analyze(h);
      expect(o.ok).toBe(true);
      if (!o.ok) continue;
      for (const side of ["white", "black"] as const) {
        for (const id of o.result[side].possible) expect(supportedIds.has(id)).toBe(true);
        for (const e of o.result[side].eliminated) expect(supportedIds.has(e.id)).toBe(true);
      }
      expect(o.evidence.unsupported).toEqual(UNSUPPORTED_IDS);
    }
  });

  test("a known partial id and a known unsupported id are catalogued, not evaluated", () => {
    const partial = CATALOG.find((e) => e.id === "pawn-battle");
    const unsupported = CATALOG.find((e) => e.id === "gambler");
    expect(partial?.status).toBe("partial");
    expect(unsupported?.status).toBe("unsupported");
    expect(partial?.evaluate).toBeUndefined();
    expect(unsupported?.evaluate).toBeUndefined();
    expect(UNSUPPORTED_IDS).toContain("pawn-battle");
    expect(UNSUPPORTED_IDS).toContain("gambler");

    // They must never appear in possible/eliminated, even on a long game.
    const o = analyze(["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Bxc6", "dxc6", "Nxe5"]);
    expect(o.ok).toBe(true);
    if (!o.ok) return;
    for (const side of ["white", "black"] as const) {
      const ids = [...o.result[side].possible, ...o.result[side].eliminated.map((e) => e.id)];
      expect(ids).not.toContain("pawn-battle");
      expect(ids).not.toContain("gambler");
    }
  });
});
