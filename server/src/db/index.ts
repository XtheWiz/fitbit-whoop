import { drizzle } from "drizzle-orm/bun-sql";
import { SQL } from "bun";
import * as schema from "./schema.ts";

const url = process.env.DATABASE_URL ?? "postgres://recover:recover@localhost:5432/recover";

// Lazily created so the server/tests load without a live DB.
let _db: ReturnType<typeof drizzle> | null = null;

export function db() {
  if (!_db) {
    const client = new SQL(url);
    _db = drizzle({ client, schema });
  }
  return _db;
}

export { schema };
