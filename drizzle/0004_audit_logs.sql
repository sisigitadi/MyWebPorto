-- 0004_audit_logs: tabel audit log admin (additive, tanpa mengubah tabel lain).
-- Catatan: file hasil `drizzle-kit generate` yang memuat ulang seluruh drift
-- historis (articles, products.slug duplikat 0003 manual) dipangkas manual agar
-- aman di-apply di DB yang sudah menjalankan 0000-0002 + 0003_product_slugs.sql.
-- Jalankan via `npm run db:push` (schema sync) atau `drizzle-kit migrate`.
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"actor" text,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");
