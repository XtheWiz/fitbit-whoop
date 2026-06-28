# AGENTS.md — contributor guide (human + AI)

This repo is built collaboratively by humans and AI coding agents (Claude, GLM, Codex).
Read this before making changes. The contracts here are how independent agents avoid
stepping on each other.

## What this is
**Recover** — a Whoop-style health app on top of **Fitbit Air** data.
Pipeline: **device data → ingestion → scoring engine → AI assistant → app/web UI**.

See `docs/SPEC.md` for the product spec and `docs/ARCHITECTURE.md` for the layers.

## Stack
- **App:** Flutter (Android first, then iOS, then web) — `app/`
- **Backend:** Bun + Elysia + Postgres (Drizzle ORM), end-to-end types via Eden — `server/`
- **Shared types:** `packages/shared-types/` (consumed by server; mirrored in Flutter `app/lib/domain/`)
- **AI:** provider-agnostic `AssistantProvider` interface — `server/src/ai/`

## Run / test commands
```bash
bun install                 # install workspace deps (run at repo root)
bun run db:up               # start Postgres in Docker
bun run dev                 # run the Elysia server (server/)
bun run test                # run server unit tests (bun test)
bun run typecheck           # tsc --noEmit on server

# Flutter (from app/)
cd app && flutter pub get
flutter analyze
flutter run                 # on a connected Android device/emulator
```

## Definition of done (every task)
1. `bun run test` passes (server changes).
2. `bun run typecheck` passes (no TS errors).
3. `flutter analyze` clean (app changes).
4. New behavior has at least one test (scoring = fixture test; routes = request test).
5. No secrets committed; use `.env` (see `.env.example`).

## Module boundaries — DO NOT cross these
Agents own modules through **interfaces**, not implementations:

- **Ingestion sources** implement `HealthSource` (`app/lib/data/health_source/`).
  Add a new source (HealthKit, Google Health API, Takeout) without touching scoring.
- **Scoring** lives in `server/src/scoring/` as **pure functions** — no DB, no I/O.
  Inputs/outputs are typed in `packages/shared-types`. Test against fixtures only.
- **AI providers** implement `AssistantProvider` (`server/src/ai/`). The app/server
  depend on the interface; never call a provider SDK directly from a route.
- **Routes** (`server/src/routes/`) orchestrate: read DB → call scoring/AI → respond.
  Keep business logic out of routes.

## Conventions
- TypeScript strict mode; no `any` in committed code.
- Scoring formulas are **our approximations** of Whoop's proprietary algorithm —
  document the formula in `docs/scoring/` and keep weights in named constants.
- Money/time: store timestamps as UTC ISO-8601; do conversions at the edge.
- Commits: imperative mood, scoped (`server: add recovery scorer`).

## When implementing the Claude AI adapter
Consult the `claude-api` skill / docs for current model IDs and params — do not
hardcode model names from memory.
