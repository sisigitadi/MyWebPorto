/**
 * Gate Keamanan Database: Row-Level Security (RLS) & Isolasi Hak Akses Supabase
 *
 * Menguji mitigasi kerentanan rls_disabled_in_public (Supabase Security Advisory):
 * 1. Unit test (offline): memastikan seluruh tabel di `src/db/schema.ts` mengaktifkan `.enableRLS()`.
 * 2. Static migration audit: memastikan skrip migrasi mencakup seluruh tabel dan mencabut privilege anon.
 * 3. Live database audit (saat DATABASE_URL terisi): memastikan 100% tabel di schema 'public'
 *    memiliki rowsecurity = true di PostgreSQL dan role 'anon' tidak dapat mengakses data privat.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import * as schema from "@/db/schema";

dotenv.config({ path: ".env.local" });

const EXPECTED_TABLES = [
  "articles",
  "audit_logs",
  "customers",
  "media",
  "orders",
  "products",
  "profiles",
  "projects",
  "services",
  "settings",
  "settings_history",
  "testimonials",
  "visitor_hits",
] as const;

describe("Database RLS Schema Definitions (Offline Gate)", () => {
  it("seluruh 13 tabel di schema.ts memiliki Symbol(drizzle:EnableRLS)", () => {
    const tableKeys = [
      "articles",
      "auditLogs",
      "customers",
      "media",
      "orders",
      "products",
      "profiles",
      "projects",
      "services",
      "settings",
      "settingsHistory",
      "testimonials",
      "visitorHits",
    ] as const;

    for (const key of tableKeys) {
      const table = (schema as Record<string, unknown>)[key];
      expect(table, `Tabel '${key}' harus terdefinisi di schema.ts`).toBeDefined();

      const symbols = Object.getOwnPropertySymbols(table);
      const hasEnableRls = symbols.some((s) => s.toString().includes("drizzle:EnableRLS"));
      expect(
        hasEnableRls,
        `Tabel '${key}' harus memanggil .enableRLS() pada deklarasi pgTable`
      ).toBe(true);
    }
  });

  it("file migrasi 0013_enable_rls.sql mengaktifkan RLS dan mencabut privilege anon", () => {
    const migrationPath = path.resolve(process.cwd(), "drizzle", "0013_enable_rls.sql");
    const content = readFileSync(migrationPath, "utf8");

    for (const tableName of EXPECTED_TABLES) {
      expect(
        content.includes(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`),
        `Migrasi 0013 harus memuat perintah ENABLE ROW LEVEL SECURITY untuk "${tableName}"`
      ).toBe(true);
    }

    expect(
      content.includes("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;"),
      "Migrasi harus mencabut seluruh hak akses tabel publik dari role anon dan authenticated"
    ).toBe(true);
  });
});

describe.skipIf(!process.env.DATABASE_URL || process.env.DATABASE_URL.length <= 5)(
  "Database RLS & Access Isolation — Live Database Gate",
  () => {
    it("100% tabel di schema 'public' memiliki rowsecurity = true", async () => {
      const postgres = (await import("postgres")).default;
      const sql = postgres(process.env.DATABASE_URL!);

      try {
        const rows = await sql<{ tablename: string; rowsecurity: boolean }[]>`
          SELECT tablename, rowsecurity
          FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY tablename;
        `;

        expect(rows.length).toBeGreaterThanOrEqual(EXPECTED_TABLES.length);

        const insecure = rows.filter((r) => !r.rowsecurity);
        expect(
          insecure,
          `Terdapat tabel publik tanpa Row-Level Security aktif: ${insecure.map((t) => t.tablename).join(", ")}`
        ).toEqual([]);
      } finally {
        await sql.end();
      }
    });

    it("role 'anon' tidak memiliki akses baca/tulis langsung ke tabel privat", async () => {
      const postgres = (await import("postgres")).default;
      const sql = postgres(process.env.DATABASE_URL!);

      try {
        // Simulasi transaksi sebagai role anon (persis seperti permintaan dari PostgREST publik)
        let blockedCount = 0;
        const sensitiveTables = ["customers", "orders", "settings", "audit_logs"];

        for (const tableName of sensitiveTables) {
          try {
            await sql.begin(async (tx) => {
              await tx`SET LOCAL ROLE anon;`;
              const res = await tx.unsafe(`SELECT count(*)::int as count FROM "${tableName}";`);
              if (res[0].count === 0) {
                // RLS memblokir seluruh baris sehingga mengembalikan 0 baris
                blockedCount += 1;
              }
            });
          } catch (err: unknown) {
            const msg = (err as Error).message.toLowerCase();
            if (msg.includes("permission denied")) {
              blockedCount += 1;
            }
          }
        }

        expect(
          blockedCount,
          "Semua tabel sensitif harus memblokir akses langsung dari role 'anon'"
        ).toBe(sensitiveTables.length);
      } finally {
        await sql.end();
      }
    });
  }
);
