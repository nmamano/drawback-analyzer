# Drawback Analyzer

A training tool for **Drawback Chess** — the variant where each side plays under a
secret "drawback" (a hidden rule that constrains their moves). You enter a game prefix
by clicking moves on a board, and the analyzer shows, for each side, which drawbacks
are **still possible** and which have been **eliminated** — with the exact move and
reason each was ruled out. It's a practice aid for inferring hidden drawbacks during
real games.

## Honest scope

- This tool supports a **clearly-labeled subset** of *known* drawbacks. It does **not**
  claim to be official or complete — it advertises "supports N known drawbacks".
- The drawback definitions are **community-sourced and unofficial** (see
  [`docs/research/drawback-catalog-research.md`](docs/research/drawback-catalog-research.md)).
  The official Drawback Chess glossary is password-gated and is **not** used here.
- Every catalog entry is labeled **supported / partial / unsupported** with a
  **source** and a **confidence** level.
- Drawbacks that can't be inferred from move history alone (hidden-info, per-move
  random, or engine/eval-based) are listed **separately** as partial/unsupported.

## How it works

- **chess.js** is the only legality engine. The analyzer never decides chess legality
  itself.
- After every edit it **replays the whole game from move 1** and tests each drawback
  hypothesis against the entire move history. Many drawbacks are obligation-based
  ("must capture if possible"), so each rule can inspect the **legal move set before**
  the chosen move.
- It is **deterministic, replay-based, and explainable** — a drawback is eliminated the
  instant one of that side's moves is inconsistent with it.

## Develop

```
bun install
bun run dev          # Vite dev server
bun run ci           # prettier + eslint + typecheck (app + tests) + bun test + vite build
bun run gate:e2e     # builds, serves dist on port 39290, drives system Chrome via Playwright
```

The browser gate judges via the `window.__drawback` evidence surface, never the DOM.

## Deploy

Target: a **static** deploy on **Vercel** (free tier), served at
`drawback.nilmamano.com`. The app is a client-only Vite SPA — no server, no network,
no accounts.

### Build config (automated, no credentials)

[`vercel.json`](vercel.json) pins the static build: framework `vite`, build
`vite build`, install `bun install --frozen-lockfile`, output `dist`. `bun run build`
reproduces the deployable artifact locally.

### Human-only credentialed steps — documented, NOT run by the agent

These run as the maintainer's credentials and must be performed/authorized by a human.
The intended path is a **GitHub-connected Vercel project** (auto-deploys on push):

```sh
# 1. Authenticate the Vercel CLI on this machine (one-time).
vercel login                       # or export VERCEL_TOKEN=...

# 2. Create the public GitHub repo and push.
gh repo create nmamano/drawback-analyzer --public --source=. --remote=origin
git push -u origin master

# 3. Link a Vercel project to the repo and deploy.
vercel link                        # connect this repo to a Vercel project
vercel deploy --prod               # first production deploy (free static tier)

# 4. Add the custom domain, then read the EXACT DNS record Vercel shows.
vercel domains add drawback.nilmamano.com
#   -> Vercel prints the record to create at the nilmamano.com DNS provider,
#      typically a CNAME  drawback -> cname.vercel-dns.com  (confirm at add-time).
#      This differs from ludwig.nilmamano.com (which points at Fly).

# 5. After the cert issues, run the env-gated live smoke against the real URL:
DRAWBACK_LIVE_URL=https://drawback.nilmamano.com bun run smoke:live
```

Fallback (no GitHub): `vercel deploy --prod` directly from this directory.

`smoke:live` **fails closed** — it refuses (exit 2, no network) unless
`DRAWBACK_LIVE_URL` is an `https://` URL. It is never part of `ci` or `gate:e2e`.

## Status

In active development via a gated slice loop. See
[`plans/drawback-analyzer-loop.md`](plans/drawback-analyzer-loop.md) for the standing
orders, scope, decisions, and slice plan.

## Stack

Bun · React · Vite · TypeScript · chess.js. Static, client-only — no server, no
networking, no accounts. (Crowdsourced submissions are a deferred, data-only feature.)
