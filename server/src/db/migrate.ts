import { migrate } from "drizzle-orm/bun-sql/migrator";
import { db } from "./index.ts";

// Applies generated SQL migrations in ./drizzle. Run with: bun run db:migrate
await migrate(db(), { migrationsFolder: "./drizzle" });
console.log("migrations applied");
