import { Elysia, t } from "elysia";
import { scoreRecovery, scoreStrain, scoreSleep } from "../scoring/index.ts";
import type {
  RecoveryInput,
  StrainInput,
  SleepInput,
} from "@recover/shared-types";

// Pure scoring endpoints — no DB. Validation kept light (full schemas in shared-types).
export const scoresRoutes = new Elysia({ prefix: "/scores" })
  .post(
    "/recovery",
    ({ body }) => scoreRecovery(body as unknown as RecoveryInput),
    { body: t.Any() },
  )
  .post(
    "/strain",
    ({ body }) => scoreStrain(body as unknown as StrainInput),
    { body: t.Any() },
  )
  .post(
    "/sleep",
    ({ body }) => scoreSleep(body as unknown as SleepInput),
    { body: t.Any() },
  );
