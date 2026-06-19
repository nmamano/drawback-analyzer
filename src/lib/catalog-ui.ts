// Pure UI helpers derived from the analyzer CATALOG. Kept out of the analyzer (which
// stays unchanged) and import-relative so unit tests resolve without the "@" alias.

import { CATALOG } from "../analyzer";
import type { CatalogEntry, DrawbackCategory, DrawbackStatus } from "../analyzer";

export const CATALOG_BY_ID = new Map(CATALOG.map((e) => [e.id, e]));

export function entryById(id: string): CatalogEntry | undefined {
  return CATALOG_BY_ID.get(id);
}
export function entryTitle(id: string): string {
  return CATALOG_BY_ID.get(id)?.title ?? id;
}

export function entriesByStatus(status: DrawbackStatus): CatalogEntry[] {
  return CATALOG.filter((e) => e.status === status);
}

export const PARTIAL_ENTRIES = entriesByStatus("partial");
export const UNSUPPORTED_ENTRIES = entriesByStatus("unsupported");

const CATEGORY_ORDER: DrawbackCategory[] = [
  "simple-move-forbid",
  "capture-restriction",
  "stateful",
  "board-condition-loss",
  "random-parameter",
];

export const CATEGORY_LABEL: Record<DrawbackCategory, string> = {
  "simple-move-forbid": "Move forbidden",
  "capture-restriction": "Capture restriction",
  stateful: "Stateful (history-dependent)",
  "board-condition-loss": "Board-condition loss",
  "random-parameter": "Random parameter",
};

export const STATUS_LABEL: Record<DrawbackStatus, string> = {
  supported: "Supported",
  partial: "Partial",
  unsupported: "Unsupported",
};

export interface CatalogGroup {
  category: DrawbackCategory;
  label: string;
  entries: CatalogEntry[];
}

export function catalogByCategory(): CatalogGroup[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABEL[category],
    entries: CATALOG.filter((e) => e.category === category),
  })).filter((g) => g.entries.length > 0);
}
