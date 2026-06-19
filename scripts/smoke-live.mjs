// ENV-GATED live smoke. Fails CLOSED without DRAWBACK_LIVE_URL — it NEVER defaults to
// localhost or a guessed production URL. With the env set (and https://), it drives the
// system Chrome (same pattern as tests/e2e/gate.mjs) against the live deployment and
// asserts the app mounts, window.__drawback is present + sane, key assets load (no 4xx/
// 5xx), and there are no uncaught page errors. Run: `bun run smoke:live`.
//
// Exit codes: 2 = refused (not configured) — no network touched; 1 = ran and failed;
// 0 = SMOKE_PASS.

import { chromium } from "playwright-core";

const liveUrl = process.env.DRAWBACK_LIVE_URL;
if (!liveUrl) {
  console.error(
    "smoke:live REFUSED — set DRAWBACK_LIVE_URL to the live HTTPS deployment URL. " +
      "There is no default (no localhost, no guessed production URL).",
  );
  process.exit(2);
}
if (!liveUrl.startsWith("https://")) {
  console.error(
    `smoke:live REFUSED — DRAWBACK_LIVE_URL must be an https:// URL (got: ${liveUrl}).`,
  );
  process.exit(2);
}

let failures = 0;
function check(name, cond, extra) {
  const ok = Boolean(cond);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? ` :: ${extra}` : ""}`);
}

let browser;
try {
  browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  const failedAssets = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failedAssets.push(`${r.status()} ${r.url()}`);
  });

  const resp = await page.goto(liveUrl, { waitUntil: "domcontentloaded" });
  check(
    "root document served over HTTPS with 2xx",
    resp && resp.ok() && resp.url().startsWith("https://"),
    resp ? String(resp.status()) : "no response",
  );

  await page.waitForFunction(() => Boolean(window.__drawback), null, { timeout: 20000 });
  const ev = await page.evaluate(() => window.__drawback);
  check("window.__drawback present", Boolean(ev));
  check(
    "start state sane (31 possible per side, nothing eliminated)",
    ev &&
      ev.white.possible.length === 31 &&
      ev.black.possible.length === 31 &&
      ev.white.eliminated.length === 0,
    ev ? `w=${ev.white.possible.length} b=${ev.black.possible.length}` : "none",
  );
  const mounted = await page.evaluate(
    () => (document.getElementById("root")?.childElementCount ?? 0) > 0,
  );
  check("app mounted (#root has content)", mounted);
  check(
    "no failing asset requests (no 4xx/5xx)",
    failedAssets.length === 0,
    failedAssets.join(" | "),
  );
  check("no uncaught page errors", pageErrors.length === 0, pageErrors.join(" | "));
} catch (e) {
  check("smoke completed without throwing", false, e?.message ?? String(e));
} finally {
  if (browser)
    await browser.close().catch(() => {
      /* ignore close errors */
    });
}

console.log(failures === 0 ? "SMOKE_PASS" : `SMOKE_FAIL(${failures})`);
process.exit(failures === 0 ? 0 : 1);
