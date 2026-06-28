import type { Baseline, RecoveryInput, RecoveryResult } from "@recover/shared-types";

// Weights from docs/scoring/recovery.md (must sum to 1).
export const W_HRV = 0.5;
export const W_RHR = 0.2;
export const W_RR = 0.1;
export const W_SLEEP = 0.2;

export const LOGISTIC_K = 1.0;
const MIN_BASELINE_DAYS = 14;

const logistic = (x: number) => 1 / (1 + Math.exp(-x));

/** z-score, guarding against zero/absent SD. */
function z(value: number, b: Baseline, lowerIsBetter = false): number {
  const sd = b.sd > 1e-9 ? b.sd : Math.max(1e-9, Math.abs(b.mean) * 0.1);
  const raw = (value - b.mean) / sd;
  return lowerIsBetter ? -raw : raw;
}

/** Recovery 0–100 with driver breakdown. Pure. See docs/scoring/recovery.md. */
export function scoreRecovery(input: RecoveryInput): RecoveryResult {
  const subHrv = logistic(LOGISTIC_K * z(input.hrvMs, input.hrvBaseline));
  const subRhr = logistic(LOGISTIC_K * z(input.restingHr, input.rhrBaseline, true));
  // Respiratory rate: stability — deviation in either direction is worse.
  const rrZ = -Math.abs(input.respiratoryRate - input.rrBaseline.mean) /
    (input.rrBaseline.sd > 1e-9 ? input.rrBaseline.sd : 1);
  const subRr = logistic(LOGISTIC_K * rrZ);
  const subSleep = Math.max(0, Math.min(1, input.sleepPerformance));

  const drivers = {
    hrv: W_HRV * subHrv,
    rhr: W_RHR * subRhr,
    rr: W_RR * subRr,
    sleep: W_SLEEP * subSleep,
  };

  const value = 100 * (drivers.hrv + drivers.rhr + drivers.rr + drivers.sleep);

  const provisional =
    Math.min(
      input.hrvBaseline.days,
      input.rhrBaseline.days,
      input.rrBaseline.days,
    ) < MIN_BASELINE_DAYS;

  return { value, provisional, drivers };
}
