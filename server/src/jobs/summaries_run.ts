import { db, schema } from "../db/index.ts";
import { generateAndStoreSummary } from "../services/summary_service.ts";
import type { SummaryWindow } from "@recover/shared-types";

// Generate morning/midday/evening summaries for all users for a day.
// Run:  bun run summaries:run [YYYY-MM-DD] [morning|midday|evening]
// Cron/launchd example (3x daily): call with the matching window.

const arg = process.argv[2];
const day = arg && /^\d{4}-\d{2}-\d{2}$/.test(arg) ? arg : new Date().toISOString().slice(0, 10);
const windowArg = (process.argv[3] ?? process.argv[2]) as SummaryWindow | undefined;
const windows: SummaryWindow[] =
  windowArg && ["morning", "midday", "evening"].includes(windowArg)
    ? [windowArg]
    : ["morning", "midday", "evening"];

const users = await db().select({ id: schema.users.id, name: schema.users.name }).from(schema.users);
console.log(`generating ${windows.join("/")} for ${users.length} user(s) on ${day}`);

for (const u of users) {
  for (const w of windows) {
    const r = await generateAndStoreSummary(u.id, day, w);
    if ("error" in r) console.log(`  ${u.name ?? u.id} ${w}: skipped (${r.error})`);
    else console.log(`  ${u.name ?? u.id} ${w}: ${r.text.slice(0, 80)}…`);
  }
}
console.log("done");
