import { test, expect, describe } from "bun:test";
import { RULES, UNSUPPORTED_IDS } from "../src/analyzer";
import type { DrawbackCategory, DrawbackStatus, Confidence } from "../src/analyzer";

const CATEGORIES: DrawbackCategory[] = [
  "simple-move-forbid",
  "capture-restriction",
  "stateful",
  "board-condition-loss",
  "random-parameter",
];
const STATUSES: DrawbackStatus[] = ["supported", "unsupported", "deferred"];
const CONFIDENCES: Confidence[] = ["high", "medium", "low"];

describe("catalog metadata", () => {
  test("ships 10-15 supported rules (1b target)", () => {
    expect(RULES.length).toBeGreaterThanOrEqual(10);
    expect(RULES.length).toBeLessThanOrEqual(15);
  });

  test("every rule has complete, well-formed metadata", () => {
    for (const r of RULES) {
      expect(r.id, `id for ${r.title}`).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(r.title.length, `title for ${r.id}`).toBeGreaterThan(0);
      expect(r.description.length, `description for ${r.id}`).toBeGreaterThan(0);
      expect(CATEGORIES, `category for ${r.id}`).toContain(r.category);
      expect(STATUSES, `status for ${r.id}`).toContain(r.status);
      expect(CONFIDENCES, `confidence for ${r.id}`).toContain(r.confidence);
      expect(r.sources.length, `sources for ${r.id}`).toBeGreaterThanOrEqual(1);
      expect(typeof r.evaluate, `evaluate for ${r.id}`).toBe("function");
    }
  });

  test("all 1b rules are status=supported", () => {
    for (const r of RULES) expect(r.status).toBe("supported");
  });

  test("rule ids are unique", () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("the retired smoke rule is gone (queen-no-move was not a sourced drawback)", () => {
    expect(RULES.some((r) => r.id === "queen-no-move")).toBe(false);
  });

  test("unsupported list is honest (empty in 1b; populated as catalog data in 1c)", () => {
    expect(UNSUPPORTED_IDS).toEqual([]);
  });
});
