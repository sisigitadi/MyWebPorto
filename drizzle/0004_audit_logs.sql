-- 0004_audit_logs: tabel blog articles, kolom drift (products.cta_url,
-- projects.summary, testimonials.rating), dan tabel audit log admin.
-- Catatan: file ini pernah dipangkas manual terlalu agresif hingga DROP
-- pembuatan tabel articles beserta kolom drift; DDL dipulihkan agar rantai
-- migrasi 0000..0007 dapat di-replay dari nol (db:migrate di DB baru).
CREATE TABLE "articles" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"title_en" text,
	"summary" text,
	"summary_en" text,
	"content" text NOT NULL,
	"content_en" text,
	"image_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "articles_published_idx" ON "articles" USING btree ("published");--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cta_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "summary_en" text;--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN "rating" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
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
