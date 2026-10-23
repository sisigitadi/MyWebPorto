import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const isBuild =
  process.env.npm_lifecycle_event === "build" ||
  process.env.NEXT_PHASE === "phase-production-build";

export const isDbConnected = Boolean(
  process.env.DATABASE_URL && process.env.DATABASE_URL.length > 5 && !isBuild
);


const connectionString = process.env.DATABASE_URL || "postgres://dummy:dummy@localhost/dummy";

const client = postgres(connectionString, {
  prepare: false,
  max: 1,
  idle_timeout: 5,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

// Compatibility layer for neon-http .rows format across raw queries
const rawExecute = db.execute.bind(db);
db.execute = (async (...args: Parameters<typeof rawExecute>) => {
  const result = await rawExecute(...args);
  if (Array.isArray(result) && !("rows" in result)) {
    Object.defineProperty(result, "rows", {
      get() {
        return this;
      },
      configurable: true,
      enumerable: false,
    });
  }
  return result;
}) as typeof db.execute;

