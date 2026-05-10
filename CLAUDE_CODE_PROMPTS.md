# Vertex Terminal — Claude Code Build Playbook

This is your copy-paste guide. Each stage below has one prompt block to feed Claude Code. Run them in order, verify after each one, then move on. Don't paste two stages at once — Claude Code does its best work when you let it finish, you check the result, and you only then hand it the next thing.

---

## How to use this document

1. Open Terminal, `cd` into your project folder, and run `claude`.
2. Copy the entire block under each stage (between the triple backticks) and paste it into Claude Code.
3. Claude Code will propose changes and ask for approval. **Read the file list before approving.** It's fine to say "no, do X instead" — that's the point.
4. When the stage finishes, follow the **Verify** checklist before moving to the next stage.
5. If something errors, paste the **whole error message** back into the same Claude Code session. Don't try to fix it yourself.

A few rules that will save you days:

- **Commit after every stage that works.** Tell Claude Code: `commit this with a message describing what we just did`. If something breaks later, you can roll back.
- **Use `/plan` for anything that touches more than ~5 files.** It makes Claude think before acting.
- **Use `/clear` when the conversation gets confused** (long context, bad turn). You don't lose your code — just the chat history.
- **Don't paraphrase the prompts below.** They're written to give Claude the exact context it needs. Tweak only the parts in `<<angle brackets>>`.

---

## Stage 0 — One-time setup (do this once, before Stage 1)

Open Terminal, then:

```bash
mkdir ~/vertex-terminal
cd ~/vertex-terminal
git init
claude
```

Inside Claude Code, paste:

```
This is a fresh project folder. Before we build anything, do three things:

1. Confirm Docker Desktop is installed and running. If not, tell me what to download and stop.
2. Confirm I have a recent Node.js (>= 20). If not, tell me how to install it for my OS.
3. Create a CLAUDE.md file at the project root with this content:

---
# Vertex Terminal

A Bloomberg-style cross-exchange prediction market terminal. We aggregate odds from Polymarket and Kalshi (more venues later) into one screener, with charts, watchlists, and spread alerts.

## Stack
- Next.js 14+ (App Router) + TypeScript + Tailwind
- Prisma + PostgreSQL (Postgres 16 in Docker for local dev)
- Recharts for charts
- pnpm for package management

## Conventions
- Server components by default; client components only where needed
- All money/probability values use Decimal in DB, number in JS — never float-compare
- Time-series data lives in the Snapshot table, never in client state
- One ingestion script per venue, named scripts/ingest-<venue>.ts
- API routes live under app/api/, kebab-case folder names

## Working style
- Always run `pnpm typecheck` and `pnpm lint` before declaring a stage done
- Commit after each working feature with a clear message
- Owner is non-technical; explain trade-offs in plain English when proposing changes
---

Confirm everything is ready, then stop and wait for me.
```

**Verify:** You should now have a `CLAUDE.md` in the folder. Docker Desktop's whale icon should be running in the menu bar / system tray.

---

## Stage 1 — Scaffold the project

```
Scaffold the Vertex Terminal project.

1. Initialize a Next.js 14+ app in the current directory using TypeScript, Tailwind CSS, App Router, ESLint, src/ directory, and the @/* import alias. Use pnpm.
2. Add Prisma: `pnpm add -D prisma` and `pnpm add @prisma/client`. Run `pnpm prisma init --datasource-provider postgresql`.
3. Create a docker-compose.yml at the root that runs Postgres 16 on port 5432 with:
   - POSTGRES_USER=vertex
   - POSTGRES_PASSWORD=vertex
   - POSTGRES_DB=vertex
   - A named volume so data persists between restarts
4. Set DATABASE_URL in .env to postgresql://vertex:vertex@localhost:5432/vertex?schema=public
5. Add a .env.example mirroring .env with placeholder values, and add .env to .gitignore.
6. Add scripts to package.json: "db:up" → docker compose up -d, "db:down" → docker compose down, "typecheck" → tsc --noEmit.
7. Run `pnpm db:up` to start Postgres, then `pnpm prisma migrate dev --name init` with the empty schema to confirm everything wires up.

Stop and tell me when you've verified the dev server starts (`pnpm dev`) and the migration succeeded.
```

**Verify:** Visit http://localhost:3000 — you should see the default Next.js page. Run `docker ps` in another terminal and you should see one Postgres container running. Commit: tell Claude `commit this stage as "scaffold"`.

---

## Stage 2 — Define the schema

```
Define the core data model in prisma/schema.prisma.

Models:

enum Venue { POLYMARKET KALSHI }

model Market {
  id             String   @id @default(cuid())
  venue          Venue
  venueMarketId  String
  title          String
  description    String?
  url            String
  category       String?
  closeTime      DateTime?
  status         String   // "open" | "closed" | "resolved"
  outcomesJson   Json     // venue-native outcome array
  lastSeenAt     DateTime
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  legs           MatchLeg[]
  snapshots      Snapshot[]
  @@unique([venue, venueMarketId])
  @@index([category])
  @@index([closeTime])
}

model Match {
  id               String   @id @default(cuid())
  canonicalTitle   String
  canonicalCategory String?
  notes            String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  legs             MatchLeg[]
  snapshots        Snapshot[]
}

model MatchLeg {
  id          String   @id @default(cuid())
  matchId     String
  marketId    String
  outcomeKey  String   // e.g. "YES", or candidate name for multi-outcome
  inverted    Boolean  @default(false)
  match       Match    @relation(fields: [matchId], references: [id], onDelete: Cascade)
  market      Market   @relation(fields: [marketId], references: [id], onDelete: Cascade)
  snapshots   Snapshot[]
  @@unique([matchId, marketId, outcomeKey])
  @@index([matchId])
}

model Snapshot {
  id         String   @id @default(cuid())
  matchId    String
  marketId   String
  legId      String
  takenAt    DateTime
  price      Decimal  @db.Decimal(10, 6)
  bid        Decimal? @db.Decimal(10, 6)
  ask        Decimal? @db.Decimal(10, 6)
  volume24h  Decimal? @db.Decimal(20, 2)
  raw        Json
  match      Match    @relation(fields: [matchId], references: [id], onDelete: Cascade)
  market     Market   @relation(fields: [marketId], references: [id], onDelete: Cascade)
  leg        MatchLeg @relation(fields: [legId], references: [id], onDelete: Cascade)
  @@index([matchId, takenAt])
  @@index([legId, takenAt])
}

Run `pnpm prisma migrate dev --name add_core_schema` and verify the Prisma client regenerates. Then create src/lib/db.ts that exports a singleton PrismaClient (with the global-stash trick to avoid hot-reload issues).

Stop and confirm the migration succeeded.
```

**Verify:** Run `pnpm prisma studio` in another terminal — you should see all four tables (Market, Match, MatchLeg, Snapshot), all empty. Commit: `commit as "core schema"`.

---

## Stage 3 — Polymarket ingestion

```
Build scripts/ingest-polymarket.ts.

Purpose: pull all active markets from Polymarket and upsert them into our Market table.

Endpoint: https://gamma-api.polymarket.com/markets
Query: paginate via `limit=500&offset=N`, filter `closed=false&archived=false&active=true`
Stop when a page returns fewer rows than `limit`.

For each market:
- venue = POLYMARKET
- venueMarketId = the API's `id` field (string)
- title = `question`
- description = `description`
- url = `https://polymarket.com/event/${slug}` (their slug field)
- category = `category`
- closeTime = parse `endDate`
- status = "open"
- outcomesJson = the full `outcomes` array (with current prices, ids, names) — store the venue-native shape, don't normalize yet
- lastSeenAt = now

Use prisma.market.upsert keyed by the @@unique([venue, venueMarketId]) compound.

Add a tsx-based runner: `pnpm add -D tsx` and a script `"ingest:polymarket": "tsx scripts/ingest-polymarket.ts"`.

Run it. Log how many markets were inserted vs updated. Stop and report.
```

**Verify:** Open Prisma Studio, click Market table, you should see hundreds of Polymarket rows with sensible titles. Commit: `commit as "polymarket ingest"`.

---

## Stage 4 — Kalshi ingestion

```
Build scripts/ingest-kalshi.ts. Same shape as Polymarket but for Kalshi.

Endpoint: https://api.elections.kalshi.com/trade-api/v2/markets
Pagination: cursor-based via `?cursor=...&limit=200`. The response includes `cursor` for the next page; stop when it's empty.
Filter to `status=open` (their open markets).

For each market:
- venue = KALSHI
- venueMarketId = `ticker` (their unique string)
- title = `title`
- description = `subtitle` ?? null
- url = `https://kalshi.com/markets/${ticker.toLowerCase()}` (verify this URL pattern by hitting one and seeing if it 200s)
- category = `category`
- closeTime = parse `close_time`
- status = "open"
- outcomesJson = construct `[{ key: "YES", bid: yes_bid/100, ask: yes_ask/100, last: last_price/100 }, { key: "NO", ... }]` — Kalshi prices are in cents, normalize to 0–1
- lastSeenAt = now

Add `"ingest:kalshi": "tsx scripts/ingest-kalshi.ts"` to package.json. Run it. Report counts.
```

**Verify:** Prisma Studio shows Kalshi rows now. Quick sanity check: open one market's URL in a browser and confirm it loads. Commit: `commit as "kalshi ingest"`.

---

## Stage 5 — Manual matching UI

```
Build the manual matching page at /unmatched.

Route: src/app/unmatched/page.tsx (server component)

Layout: two columns side by side, full height.
- Left column header: "Polymarket — unmatched"
- Right column header: "Kalshi — unmatched"
- Each column has a search input that filters by title (client component, debounced)
- Each column shows a scrollable list of markets where the market has no MatchLeg yet
- Each row shows: title (truncated), category pill, close time (relative), current YES price if available

Selection state (client component):
- Click a Polymarket row → it's selected on the left
- Click a Kalshi row → it's selected on the right
- When both sides have a selection, show a "Create match" button at the bottom with:
  - An editable canonical title input (defaulting to the Polymarket title)
  - Two outcome dropdowns (one per side) — for YES/NO markets, default both to "YES"
  - An "invert right side" checkbox (for cases where Polymarket "YES on X" matches Kalshi "NO on X")

Server action: createMatch(canonicalTitle, leftMarketId, leftOutcome, rightMarketId, rightOutcome, invertRight)
- Creates Match
- Creates two MatchLeg rows
- Returns to /unmatched (revalidate the page)

Use Tailwind. Dark theme: bg-zinc-950, mono font for prices (font-mono), zinc-800 borders. Keep it tight — this is a power-user tool, not a marketing page.

Add an API route GET /api/matches that returns all matches with their legs and the latest snapshot per leg (this will be empty for now — that's fine, we add snapshots next stage).

Stop when /unmatched renders cleanly with both columns populated.
```

**Verify:** Visit http://localhost:3000/unmatched. You should see two long columns of markets. Pick something obvious (e.g. "2024 Presidential Election" exists on both venues), click both sides, hit Create match, confirm it disappears from the unmatched list. Open Prisma Studio → Match table should have one row. Commit: `commit as "manual matching ui"`.

---

## Stage 6 — Snapshot polling worker

```
Build scripts/poll-snapshots.ts — the time-series collector.

It loops forever. Each tick:
1. Load all Match records with { legs: { include: { market: true } } }
2. Group legs by venue
3. For each Polymarket leg: GET https://gamma-api.polymarket.com/markets/<venueMarketId>, pull current price for the outcome (matched by `outcomes[].name === leg.outcomeKey` or "YES"/"NO" mapping)
4. For each Kalshi leg: GET https://api.elections.kalshi.com/trade-api/v2/markets/<ticker>, pull yes_bid/yes_ask/last_price (divide by 100), and if outcomeKey is "NO", invert (price = 1 - yes_last)
5. If leg.inverted is true, flip price = 1 - price
6. Insert one Snapshot row per leg with takenAt = now, price, bid, ask, volume24h, raw=full venue payload
7. Sleep POLL_INTERVAL_MS (default 10000)

Concurrency: fetch all legs in parallel within a tick using Promise.allSettled. Don't let one failure kill the loop — log and move on.

Add `"poll": "tsx scripts/poll-snapshots.ts"` to package.json.

Run it for ~30 seconds in a separate terminal, stop it, and verify Snapshot has rows. Report row count and a sample.
```

**Verify:** Open Prisma Studio → Snapshot table → you should see 3+ rows per leg (one every 10 seconds). Commit: `commit as "snapshot poller"`.

---

## Stage 7 — Detail page with chart

```
Build the match detail page at /m/[matchId].

API route first: app/api/matches/[id]/route.ts
- GET returns: { match, legs: [{ ...leg, market, snapshots: last 24h }] }
- Order snapshots ascending by takenAt
- Cap at 1000 points per leg (decimate if needed — every Nth point)

Page layout (src/app/m/[matchId]/page.tsx, server component fetches initial data, client component handles refresh):

- Top bar: canonical title (large), category pill, "Closes in 3d 4h" relative time
- Stats row (4 tiles, equal width):
  - Consensus probability — volume-weighted average across legs (weight by volume24h; fallback equal weight)
  - Best venue — the venue closest to consensus
  - Spread — max - min across legs, in pp (percentage points)
  - 24h change — consensus now vs. 24h ago
- Chart (recharts LineChart):
  - X axis = time
  - Y axis = probability (0 to 1, formatted as %)
  - One <Line> per leg, colored: Polymarket = #5B9DFF, Kalshi = #00C853
  - Tooltip shows all venues at the hovered timestamp
  - Background grid in zinc-800
- Per-venue cards row (one card per leg):
  - Venue name + colored dot
  - Current price (large mono)
  - Bid / Ask
  - 24h volume
  - "Open on <venue>" link to market.url
- Spread alert banner — show only if max-min > 0.02:
  - Yellow if > 2pp, red if > 5pp
  - "Buy <low venue> at X, sell <high venue> at Y, ~Z pp arbitrage (before fees)"

Auto-refresh the data every 15s using SWR. `pnpm add swr`.

Style: same dark/mono terminal aesthetic. Tight spacing.
```

**Verify:** Click a match row from /unmatched (you'll need to add a temporary link, or visit /m/<id> manually using the id from Prisma Studio). Chart should show two lines updating as the poller runs. Commit: `commit as "match detail page"`.

---

## Stage 8 — The screener (home page)

```
Build the main screener at /. This is the headline product surface.

Data: GET /api/matches/screener returns rows = [{ matchId, title, category, closeTime, legs: [{ venue, price, change24h, volume24h }], spread, consensus, sparkline: [last 24h prices for consensus, decimated to ~30 points] }]

Page (src/app/page.tsx):
- Header: "Vertex Terminal" wordmark, search box (filters by title client-side), category dropdown, "Watchlist only" toggle, "Refresh" indicator showing "updated 12s ago"
- Single dense table, no card padding, zebra rows in zinc-900/zinc-950:
  - Title (truncated with ellipsis, category pill inline)
  - Polymarket %  (mono, color-coded green/red vs. previous)
  - Kalshi %
  - Spread (mono, yellow if >2pp, red if >5pp, bold)
  - 24h Δ
  - Volume 24h
  - Closes in
  - Sparkline (recharts mini, 80px wide, no axes)
  - Watch (☆ / ★ toggle, persisted to localStorage)
- Sortable columns: click header to sort, click again to reverse. Default sort: spread descending.
- Click a row → router.push(`/m/${matchId}`)
- Auto-refresh every 30s via SWR
- Ticker bar at the bottom: scrolling marquee of largest 24h moves across all matches

Watchlist state: zustand store backed by localStorage (`pnpm add zustand`). Persist matchId list under key "vertex.watchlist".

Performance: virtualize the table if rows > 100 using @tanstack/react-virtual.

Stop when the page is live, sortable, filterable, and refreshes automatically.
```

**Verify:** Visit http://localhost:3000. You should see your matched markets in a tight terminal-style table, with sparklines, spread highlighting, and a working watchlist. Commit: `commit as "screener home"`.

---

## Stage 9 — Polish & deploy

```
Production deploy. I am not technical — walk me through every browser action.

1. Init the repo on GitHub:
   - Use `gh repo create vertex-terminal --private --source=. --remote=origin --push` if the gh CLI is installed
   - If gh isn't installed, give me the manual GitHub UI steps

2. Set up Neon (managed Postgres):
   - Tell me to sign up at neon.tech, create a project named "vertex-terminal", and paste the connection string back to you
   - Once I do, update .env.production with the Neon DATABASE_URL
   - Run `pnpm prisma migrate deploy` against Neon

3. Set up Vercel:
   - Tell me to sign in at vercel.com with GitHub, click "Add New Project", pick the vertex-terminal repo
   - Set framework preset = Next.js
   - Add env var DATABASE_URL = the Neon string
   - Click Deploy
   - Wait for the build, then give me the URL

4. Polling in production:
   - Vercel Cron can't run a long-lived loop. Convert scripts/poll-snapshots.ts into an API route at app/api/cron/poll/route.ts that does ONE poll cycle and returns
   - Add vercel.json with a cron entry hitting /api/cron/poll every minute
   - Add a CRON_SECRET env var and verify the request header in the route

5. Bootstrap production data:
   - Tell me to run `pnpm ingest:polymarket` and `pnpm ingest:kalshi` locally with DATABASE_URL pointed at Neon (one-time, until we wire up an ingest cron later)
   - Then visit /unmatched on the production URL and create a few matches

6. Confirm the production site loads and the screener shows live data.

Pause between each step. Don't rush ahead — I need to do browser actions.
```

**Verify:** You have a public URL. Open it on your phone. The screener loads. Spread highlighting works. Click a match, the detail chart loads. **You now have a deployable prototype.** Commit anything pending, then take a screenshot and post it somewhere — this is the moment a lot of founders skip and shouldn't.

---

## When things break

Three failure modes you'll hit, and how to handle each:

**Build / type errors after a stage.** Don't try to read the error. Copy the entire terminal output and paste it back: `here's the error, fix it`. Claude Code will iterate until it compiles.

**The site loads but the data is wrong.** Open Prisma Studio (`pnpm prisma studio`) and look at the actual rows. Then tell Claude exactly what you see vs. what you expected: `the screener shows 0 spread on every row but in Prisma Studio I see prices of 0.42 and 0.45 — what's the bug?`. Specific evidence beats vague complaints.

**Claude Code starts going in circles.** Use `/clear` to reset the conversation, then re-anchor with `read CLAUDE.md and the current src/app/page.tsx — I want to fix <thing>`. The clear plus the file pointer gives it a fresh, accurate starting point.

---

## What to build next (Stage 10+)

When the prototype is up and you want to start charging:

- **Auth** (Clerk or NextAuth) — gate the watchlist and alerts behind a login
- **Email alerts** — Resend or Postmark; cron job that compares latest snapshot to previous and emails on threshold crossings
- **Stripe** — $20/mo Pro tier (alerts, more history, CSV export); $200/mo Trader (websocket, more venues)
- **Manifold + PredictIt + Smarkets** — copy the Polymarket ingest pattern; the matching UI already supports more than 2 legs as long as your schema doesn't hardcode "left/right"
- **Auto-matcher** — text-similarity (embeddings via OpenAI or local sentence-transformers) to suggest matches in the /unmatched UI, with one-click accept

Don't build any of these until 5 real users are using the v1 prototype daily and asking for them.

---

[View the project folder](computer://C:\Users\Max\OneDrive\Desktop\Pediction market terminal)
