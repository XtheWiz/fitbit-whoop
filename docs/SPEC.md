# SPEC — Recover

A personal, Whoop-style health app built on **Fitbit Air** data, because the Google
Health app's insights are too shallow. Reproduces Recovery / Strain / Sleep scoring and
adds an AI assistant that writes morning / daytime / evening health summaries.

## Goals
1. Pull the raw signals the Air records and store them in our own database.
2. Compute daily **Recovery (0–100)**, **Strain (0–21)**, and **Sleep performance**.
3. Generate natural-language **morning / daytime / evening** summaries + a chat assistant.
4. Cross-platform: **Android → iOS → web**, one Flutter codebase + one Bun/Elysia API.

## Non-goals (v1)
- Replacing the Air's firmware or on-device coaching.
- Real-time streaming (sync is cursor-based catch-up, not live).
- Medical-grade diagnosis. Scores are wellness estimates, clearly labeled.

## Personas
- **Owner (primary):** wants deeper, trustworthy daily guidance than Google Health gives.

## Data source reality (as of 2026-06)
- **Legacy Fitbit Web API sunsets Sept 2026 — not used.**
- **Android (v1):** Health Connect, read on-device via Flutter `health` pkg (no approval).
- **iOS (later):** Apple Health / HealthKit, same package.
- **Cloud (future):** Google Health API (OAuth2, restricted scopes, needs review).
- **Backfill:** Google Takeout export to seed 30-day baselines.

## Metrics ingested
heart rate, HRV (RMSSD/SDNN), resting heart rate, respiratory rate, SpO2,
sleep stages (awake/light/deep/REM), steps, active energy, active zone minutes,
skin/body temperature (if exposed). Availability via Health Connect is verified
empirically in Phase 2 — some may be summary-only.

## Core user flows
1. **Onboard:** grant Health Connect permissions → optional Takeout backfill → baselines seed.
2. **Morning:** open app → Recovery score + sleep breakdown + AI "how to train today".
3. **Day:** Strain accrues from HR; midday AI pacing note.
4. **Evening:** AI wind-down + recommended sleep target.
5. **Anytime:** chat with the assistant about trends ("why is my recovery low?").

## Acceptance criteria (end-to-end, Phase 5)
- Real Air samples land in Postgres after a sync.
- Recovery/Strain/Sleep match hand-computed fixtures.
- AI summary cites the day's actual score drivers.
- Swapping `AI_PROVIDER` changes the summary author with no code change.

## Phasing
See the approved plan. Phase order: foundations → Android ingestion → sleep+recovery →
strain → AI assistant → trends/journal → iOS → web → (optional) Google Health API.
