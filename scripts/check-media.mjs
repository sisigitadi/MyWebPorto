import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  console.log("No DATABASE_URL configured");
  process.exit(0);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
try {
  const rows = await sql`SELECT id, name, mime, size, created_at FROM media`;
  console.log("Existing media rows count:", rows.length);
  for (const r of rows) {
    console.log(`- ${r.id} | ${r.name} | ${r.mime} | ${(r.size / 1024).toFixed(1)} KB`);
  }
} catch (err) {
  console.error("Query error:", err.message);
} finally {
  await sql.end();
}

