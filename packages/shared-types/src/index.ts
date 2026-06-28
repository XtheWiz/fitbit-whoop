// Shared domain types — the contract between ingestion, scoring, AI, and clients.
// Mirror these in the Flutter app (app/lib/domain/) when they change.

/** Canonical metric identifiers normalized across Health Connect / HealthKit / cloud. */
export type Metric =
  | "heart_rate"
  | "hrv_rmssd"
  | "resting_heart_rate"
  | "respiratory_rate"
  | "spo2"
  | "steps"
  | "active_energy"
  | "active_zone_minutes"
  | "skin_temperature";

export type IngestSource =
  | "health_connect"
  | "health_kit"
  | "google_health_api"
  | "takeout";

/** A single normalized observation. start_ts === end_ts for instantaneous samples. */
export interface Sample {
  metric: Metric;
  value: number;
  unit: string;
  startTs: string; // UTC ISO-8601
  endTs: string; // UTC ISO-8601
  source: IngestSource;
}

export type SleepStage = "awake" | "light" | "deep" | "rem";

export interface SleepStageSegment {
  stage: SleepStage;
  startTs: string;
  endTs: string;
}

export interface SleepSession {
  startTs: string;
  endTs: string;
  segments: SleepStageSegment[];
}

// ---- Scoring inputs/outputs (see docs/scoring/) ----

export interface Baseline {
  mean: number;
  sd: number;
  days: number; // sample window actually available
}

export interface RecoveryInput {
  hrvMs: number;
  restingHr: number;
  respiratoryRate: number;
  sleepPerformance: number; // 0..1, from SleepResult
  hrvBaseline: Baseline;
  rhrBaseline: Baseline;
  rrBaseline: Baseline;
}

export interface RecoveryResult {
  value: number; // 0..100
  provisional: boolean;
  drivers: { hrv: number; rhr: number; rr: number; sleep: number };
}

export interface HrSample {
  bpm: number;
  ts: string;
}

export interface StrainInput {
  samples: HrSample[];
  maxHr: number;
  restingHr: number;
}

export interface StrainResult {
  value: number; // 0..21
  trimp: number;
  estimated: boolean;
  zoneMinutes: { z1: number; z2: number; z3: number; z4: number; z5: number };
}

export interface SleepInput {
  session: SleepSession;
  sleepNeedMs: number;
  baselineBedtimeMinutes: number; // minutes past midnight, for consistency
}

export interface SleepResult {
  performance: number; // 0..1
  stages: { awakeMs: number; lightMs: number; deepMs: number; remMs: number };
  efficiency: number;
  durationVsNeed: number;
  restorative: number;
  consistency: number;
  sleepDebtMs: number;
}

export type ScoreKind = "recovery" | "strain" | "sleep";
export type SummaryWindow = "morning" | "midday" | "evening";
