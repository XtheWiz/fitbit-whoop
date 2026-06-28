# Strain score (0–21)

> **Our approximation** of Whoop's logarithmic cardiovascular Strain. Tunable in
> `server/src/scoring/strain.ts`.

Strain quantifies cardiovascular load accumulated across the day (and per workout) on a
0–21 scale, where each additional point is harder to earn (logarithmic, like Borg/TRIMP).

## Inputs
- Time series of heart-rate samples (bpm with timestamps) for the period
- `maxHr` — estimated `208 - 0.7*age` (Tanaka), refined from observed max over time
- `restingHr` — from recovery inputs

## Method (TRIMP-style accumulation)
For each HR sample interval `dt` (minutes), compute heart-rate reserve fraction:
```
hrr = (hr - restingHr) / (maxHr - restingHr)          # clamp 0..1
weight = 0.64 * e^(1.92 * hrr)                          # exp weighting (men; tune per user)
trimp += dt * hrr * weight
```
Map cumulative TRIMP to 0–21 logarithmically:
```
strain = 21 * ( ln(1 + a*trimp) / ln(1 + a*TRIMP_MAX) )   # a, TRIMP_MAX tunable constants
```
`TRIMP_MAX` is calibrated so an all-out day ≈ 21 and a rest day ≈ 0–6.

## Outputs
- **Daily strain:** accumulation over the calendar day.
- **Per-workout strain:** same formula over the workout window.
- **Balance:** compare day strain vs. morning recovery to flag over/under-reaching.

```ts
{ value: number /*0-21*/, trimp: number, zoneMinutes: { z1:number,z2:number,z3:number,z4:number,z5:number } }
```

## Notes
- Zone minutes (z1–z5 by %HRR) are reported for the UI even though strain uses continuous HRR.
- If only Active Zone Minutes (summary) are available from Health Connect, fall back to an
  AZM-based estimate and mark `estimated: true` until intraday HR is accessible.
