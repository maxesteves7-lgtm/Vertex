# Vertex — Prediction Market Terminal

## Overview
Vertex is a Bloomberg-style prediction market terminal that aggregates data across exchanges and surfaces it in a power-user, keyboard-driven interface. The goal is to be the single screen a serious prediction-market trader keeps open all day: cross-exchange odds screener, charts, watchlists, and alerts.

## Tech Stack
- **Framework:** Next.js (App Router) with TypeScript
- **Database:** Postgres
- **ORM:** Prisma
- **Frontend:** React + TypeScript (Bloomberg-terminal aesthetic — dense, dark, monospace, keyboard-first)
- **Data sources:** Polymarket and Kalshi public APIs

## Core Features
- **Cross-exchange odds screener:** unified view of equivalent markets across Polymarket and Kalshi, with spread/arb columns
- **Charts:** historical price/probability series per market, with overlays for cross-exchange comparison
- **Watchlists:** user-curated lists of markets, persisted per user
- **Alerts:** threshold-based (price moves, spread widens, volume spikes) with delivery to email/webhook
- **Keyboard navigation:** Bloomberg-style command bar — every action reachable without a mouse

## Data Model (high level)
- `Exchange` — Polymarket, Kalshi
- `Market` — canonical market record, with `ExchangeListing` rows linking to exchange-specific IDs
- `Quote` — time-series snapshots of bid/ask/last per ExchangeListing
- `Watchlist` / `WatchlistItem`
- `Alert` — rule + delivery channel + last-fired timestamp
- `User`

## Coding Preferences
- TypeScript strict mode, no `any` unless justified inline
- Server components by default; client components only when interactivity demands it
- Prisma migrations checked in; no schema changes without a migration
- Keep API route handlers thin — push logic into `lib/` modules that are independently testable
- Prefer SQL views or Prisma `select` projections over hydrating full models for read-heavy screener queries
- Match canonical markets across exchanges via a normalization layer, not ad-hoc string matching

## Out of Scope (for now)
- Order routing / actual trading — Vertex is read-only market data
- Mobile-optimized layouts — desktop-first
- Exchanges beyond Polymarket and Kalshi
