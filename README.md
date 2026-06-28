# Recover

A Whoop-style health app built on **Fitbit Air** data — because the Google Health app's
insights aren't deep enough. Pulls your Air's raw signals, computes daily **Recovery /
Strain / Sleep** scores, and an AI assistant turns them into morning/daytime/evening
health summaries.

**Stack:** Flutter (Android → iOS → web) · Bun + Elysia + Postgres · provider-agnostic AI.

## Quick start
```bash
bun install
cp .env.example .env        # fill in DATABASE_URL + an AI key when ready
bun run db:up               # Postgres via Docker
bun run dev                 # Elysia API on :3000
bun run test                # scoring + route tests

cd app && flutter pub get && flutter run   # Android device/emulator
```

## Docs
- `docs/SPEC.md` — product spec & data-source reality
- `docs/ARCHITECTURE.md` — layers & data model
- `docs/scoring/` — Recovery / Strain / Sleep formulas
- `AGENTS.md` — contributor guide (humans + AI agents) and module boundaries

> Built collaboratively by humans and AI coding agents. Read `AGENTS.md` first.
