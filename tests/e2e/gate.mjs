// Real-browser smoke gate. Drives the SYSTEM Chrome (headless) against a built,
// statically-served build on a reserved port. INTERACTION uses DOM selectors
// (data-square / data-move-index / data-testid / data-demo); every assertion about
// ANALYZER STATE reads a fresh window.__drawback (the evidence surface), never the DOM
// or pixels. Screenshots are artifacts only. Run via `bun run gate:e2e`.

import { chromium } from "playwright-core";

const PORT = 39290; // reserved for the drawback-analyzer e2e app-under-test
const URL = `http://127.0.0.1:${PORT}/`;

let failures = 0;
function check(name, cond, extra) {
  const ok = Boolean(cond);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? ` :: ${extra}` : ""}`);
}

const server = Bun.spawn(
  [
    "node_modules/.bin/vite",
    "preview",
    "--port",
    String(PORT),
    "--strictPort",
    "--host",
    "127.0.0.1",
  ],
  { stdout: "pipe", stderr: "pipe" },
);

async function waitForServer(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(URL);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await Bun.sleep(250);
  }
  return false;
}

let browser;
try {
  if (!(await waitForServer())) throw new Error("preview server did not come up on port " + PORT);

  browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  await page.goto(URL, { waitUntil: "domcontentloaded" });
  // Cold Chrome start + first React mount can be slow; give the evidence surface room.
  await page.waitForFunction(() => Boolean(window.__drawback), null, { timeout: 20000 });

  const read = () => page.evaluate(() => window.__drawback);

  // --- start state ---
  const start = await read();
  check(
    "start: 31 supported possible per side",
    start.white.possible.length === 31 && start.black.possible.length === 31,
    `w=${start.white.possible.length} b=${start.black.possible.length}`,
  );
  check(
    "start: 9 not-evaluated ids",
    start.unsupported.length === 9,
    `n=${start.unsupported.length}`,
  );
  check(
    "start: nothing eliminated yet",
    start.white.eliminated.length === 0 && start.black.eliminated.length === 0,
  );

  // --- play e4 e5 Qh5 via the board, verifying via window.__drawback ---
  async function play(from, to, expectLen) {
    await page.click(`[data-square="${from}"]`);
    await page.click(`[data-square="${to}"]`);
    await page.waitForFunction((n) => window.__drawback.moveHistory.length === n, expectLen, {
      timeout: 5000,
    });
  }
  await play("e2", "e4", 1);
  await play("e7", "e5", 2);
  await play("d1", "h5", 3);

  const afterQ = await read();
  check(
    "Qh5 recorded in history",
    JSON.stringify(afterQ.moveHistory) === JSON.stringify(["e4", "e5", "Qh5"]),
    afterQ.moveHistory.join(","),
  );
  const sq = afterQ.white.eliminated.find((e) => e.id === "shadow-queen");
  check(
    "shadow-queen eliminated for White at moveIndex 2",
    sq && sq.moveIndex === 2,
    sq ? `idx=${sq.moveIndex}` : "missing",
  );
  check(
    "shadow-queen reason names queen + light square",
    sq && /queen/i.test(sq.reason) && /light/i.test(sq.reason),
    sq && sq.reason,
  );
  check(
    "unrelated rule king-no-move still possible (White)",
    afterQ.white.possible.includes("king-no-move"),
  );
  check("shadow-queen still possible for Black", afterQ.black.possible.includes("shadow-queen"));

  // --- partial / unsupported entries are catalogued but never analyzed ---
  const analyzedIds = [
    ...afterQ.white.possible,
    ...afterQ.white.eliminated.map((e) => e.id),
    ...afterQ.black.possible,
    ...afterQ.black.eliminated.map((e) => e.id),
  ];
  check(
    "partial id pawn-battle is not analyzed (in unsupported, not in possible/eliminated)",
    !analyzedIds.includes("pawn-battle") && afterQ.unsupported.includes("pawn-battle"),
  );
  check(
    "unsupported id gambler is not analyzed",
    !analyzedIds.includes("gambler") && afterQ.unsupported.includes("gambler"),
  );

  // --- rewind via the move list back to [e4] ---
  await page.click('[data-move-index="0"]');
  await page.waitForFunction(() => window.__drawback.moveHistory.length === 1, null, {
    timeout: 5000,
  });
  const rewound = await read();
  check(
    "rewind: history truncated to [e4]",
    JSON.stringify(rewound.moveHistory) === JSON.stringify(["e4"]),
    rewound.moveHistory.join(","),
  );
  check(
    "rewind: shadow-queen possible again for White",
    rewound.white.possible.includes("shadow-queen"),
  );

  // --- catalog toggle renders every entry (DOM count vs declared CATALOG.length) ---
  await page.click('[data-testid="tab-catalog"]');
  await page.waitForSelector('[data-testid="catalog-count"]', { timeout: 5000 });
  const counts = await page.evaluate(() => ({
    rendered: document.querySelectorAll("[data-catalog-id]").length,
    declared: Number(document.querySelector('[data-testid="catalog-count"]').textContent),
  }));
  check(
    "catalog renders all entries",
    counts.rendered === counts.declared && counts.declared >= 40,
    `rendered=${counts.rendered} declared=${counts.declared}`,
  );

  check("no uncaught page errors", pageErrors.length === 0, pageErrors.join(" | "));

  await page.screenshot({ path: "tests/e2e/last-run.png" }).catch(() => {});
} catch (e) {
  check("gate run completed without throwing", false, e?.message ?? String(e));
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill();
  await server.exited.catch(() => {}); // release the reserved port before exit (no leak)
}

console.log(failures === 0 ? "GATE_PASS" : `GATE_FAIL(${failures})`);
process.exit(failures === 0 ? 0 : 1);
