# Recovery score (0–100)

> **Our approximation** of Whoop's proprietary Recovery. Not medical. Weights are tunable
> constants in `server/src/scoring/recovery.ts`.

Recovery answers "how ready is the body today?" computed each morning from last night's
sleep physiology, each metric compared to the user's **own 30-day rolling baseline**.

## Inputs (from last main sleep)
- `hrvMs` — nightly HRV (RMSSD), weighted toward slow-wave & late-night sleep
- `restingHr` — resting HR during sleep
- `respiratoryRate` — breaths/min during sleep
- `sleepPerformance` — 0–1, from `sleep.md`
- Baselines: 30-day mean & SD for HRV, RHR, respiratory rate

## Method
For each physiological metric compute a z-score vs. baseline, then map to a 0–1 sub-score
via a logistic curve. Direction matters:
- HRV: **higher is better** → `z = (hrv - mean) / sd`
- RHR: **lower is better** → `z = (mean - rhr) / sd`
- Respiratory rate: **stability** → `z = -abs(rr - mean) / sd`

```
sub(metric) = logistic(k * z)         # k ≈ 1.0, logistic(x) = 1/(1+e^-x)
recovery = 100 * ( W_HRV*sub(hrv)
                 + W_RHR*sub(rhr)
                 + W_RR *sub(rr)
                 + W_SLEEP*sleepPerformance )
```

## Default weights (must sum to 1)
| const     | value | rationale                          |
|-----------|-------|------------------------------------|
| W_HRV     | 0.50  | primary autonomic recovery signal  |
| W_RHR     | 0.20  | cardiovascular load/illness signal |
| W_RR      | 0.10  | stable; deviations flag stress/illness |
| W_SLEEP   | 0.20  | restorative opportunity            |

## Output
```ts
{ value: number /*0-100*/, drivers: { hrv: number, rhr: number, rr: number, sleep: number } }
```
`drivers` are the weighted contributions, surfaced in the UI and fed to the AI assistant.

## Cold start
< 14 days of baseline → mark `provisional: true`, widen SD, lean on population priors.
Seed baselines from Takeout backfill when available.
