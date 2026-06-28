import {
  pgTable,
  uuid,
  text,
  doublePrecision,
  timestamp,
  jsonb,
  date,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  age: integer("age"),
  goals: jsonb("goals").$type<string[]>().default([]),
  createdTs: timestamp("created_ts", { withTimezone: true }).defaultNow().notNull(),
});

export const samples = pgTable(
  "samples",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    metric: text("metric").notNull(),
    value: doublePrecision("value").notNull(),
    unit: text("unit").notNull(),
    startTs: timestamp("start_ts", { withTimezone: true }).notNull(),
    endTs: timestamp("end_ts", { withTimezone: true }).notNull(),
    source: text("source").notNull(),
  },
  (t) => ({
    // upsert key for cursor-based sync (user + metric + start)
    uq: uniqueIndex("samples_user_metric_start_uq").on(t.userId, t.metric, t.startTs),
    byUserMetric: index("samples_user_metric_idx").on(t.userId, t.metric, t.startTs),
  }),
);

export const sleepSessions = pgTable("sleep_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  startTs: timestamp("start_ts", { withTimezone: true }).notNull(),
  endTs: timestamp("end_ts", { withTimezone: true }).notNull(),
  stages: jsonb("stages").notNull(), // SleepStageSegment[]
});

export const scores = pgTable(
  "scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    day: date("day").notNull(),
    kind: text("kind").notNull(), // recovery | strain | sleep
    value: doublePrecision("value").notNull(),
    inputs: jsonb("inputs").notNull(),
    createdTs: timestamp("created_ts", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uq: uniqueIndex("scores_user_day_kind_uq").on(t.userId, t.day, t.kind),
  }),
);

export const summaries = pgTable("summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  day: date("day").notNull(),
  window: text("window").notNull(), // morning | midday | evening
  text: text("text").notNull(),
  provider: text("provider").notNull(),
  createdTs: timestamp("created_ts", { withTimezone: true }).defaultNow().notNull(),
});
