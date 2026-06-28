# ARCHITECTURE

```
[ Fitbit Air ] --sync--> [ Google Health app ]
        |  Health Connect (Android) / Apple Health (iOS)        <- v1 routes
        v
[ Flutter app ] --raw samples--> [ Bun/Elysia API ] --> [ Postgres ]
                                       |  ^
                           scoring engine | AI assistant (provider-agnostic)
                                       v  |
                       [ Recovery / Strain / Sleep + summaries ]
                                       |
                            [ Flutter web dashboard ]            <- later
```

## Layers
1. **Ingestion** — `HealthSource` interface; concrete sources: `HealthConnectSource`
   (Android), `HealthKitSource` (iOS), `GoogleHealthApiSource` (cloud, future),
   `TakeoutImportSource` (backfill). Normalizes everything to the shared `Sample` schema
   and POSTs to `/ingest`. Per-metric sync cursor stored client-side.
2. **Scoring** — pure functions in `server/src/scoring/` (`recovery`, `strain`, `sleep`).
   No I/O. Inputs/outputs typed in `packages/shared-types`. Persisted with their inputs so
   results are reproducible & explainable.
3. **AI assistant** — `AssistantProvider` interface (`generateSummary`, `chat`). Adapters:
   Claude / Gemini / Local, selected by `AI_PROVIDER` env. Receives structured score JSON,
   never raw sample dumps.
4. **Clients** — Flutter app (Android/iOS) and Flutter web, both Eden-typed clients of the
   same API.

## Data model (Postgres, v0)
- `users(id, profile…)`
- `samples(id, user_id, metric, value, unit, start_ts, end_ts, source)` — raw normalized samples
- `sleep_sessions(id, user_id, start_ts, end_ts, stages_json, …)`
- `scores(id, user_id, day, kind[recovery|strain|sleep], value, inputs_json, created_ts)`
- `summaries(id, user_id, window[morning|midday|evening], day, text, provider, created_ts)`

## Sync model
Cursor-based catch-up: client tracks last `end_ts` per metric, requests newer samples on
app open + background WorkManager job. Server upserts by `(user_id, metric, start_ts)`.

## Why these choices
- **Flutter:** one codebase across all three targets; mature `health` plugin.
- **Bun/Elysia + Eden:** end-to-end types between server and (TS-side) tooling; fast.
- **Interfaces at every seam:** lets Android/iOS/cloud sources and AI providers be added
  additively, and lets multiple AI agents build modules in parallel.
