import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export const isDbConnected = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.length > 5);

const sql = neon(process.env.DATABASE_URL || "postgres://dummy:dummy@localhost/dummy");

export const db = drizzle(sql, { schema });
