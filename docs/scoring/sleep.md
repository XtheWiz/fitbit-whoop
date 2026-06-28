# Sleep performance (0–1) + breakdown

> **Our approximation** of Whoop's sleep scoring. Tunable in `server/src/scoring/sleep.ts`.

## Inputs (from a sleep session)
- Stage segments: awake / light / deep (SWS) / REM with durations
- `inBedMs`, `asleepMs`
- `sleepNeedMs` — baseline need (default 8h, adjusted by recent sleep debt + prior-day strain)

## Components
```
duration    = clamp(asleepMs / sleepNeedMs, 0, 1)            # got enough vs. need
efficiency  = asleepMs / inBedMs                              # time actually asleep
restorative = (deepMs + remMs) / asleepMs                     # % restorative stages
consistency = 1 - normalizedDeviation(bedtime, baselineBedtime)  # routine regularity
```

## Performance
```
sleepPerformance = W_DUR*duration + W_EFF*efficiency
                 + W_RES*restorative + W_CON*consistency
```
| const  | value | meaning            |
|--------|-------|--------------------|
| W_DUR  | 0.50  | enough sleep       |
| W_EFF  | 0.20  | quality of time in bed |
| W_RES  | 0.20  | restorative stages |
| W_CON  | 0.10  | schedule regularity|

## Sleep debt
Rolling sum over 14 days of `max(0, sleepNeedMs - asleepMs)`, decayed daily. Increases
tomorrow's `sleepNeedMs`. Reported to the AI assistant for the evening summary.

## Output
```ts
{
  performance: number /*0-1*/,
  stages: { awakeMs, lightMs, deepMs, remMs },
  efficiency: number, durationVsNeed: number, restorative: number, consistency: number,
  sleepDebtMs: number
}
```
