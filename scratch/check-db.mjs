import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.log("NO DATABASE_URL");
  process.exit(1);
}

const sql = neon(dbUrl);

async function check() {
  try {
    const services = await sql`SELECT id, title, published, "order" FROM services`;
    console.log("SERVICES_COUNT:", services.length);
    console.log("SERVICES_DATA:", JSON.stringify(services, null, 2));
  } catch (err) {
    console.error("SQL_ERROR:", err);
  }
}

check();
