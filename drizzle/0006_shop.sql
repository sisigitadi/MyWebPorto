ALTER TABLE "products" ADD COLUMN "compare_price_label" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "price_amount" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "badge" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "stock" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "gallery" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "payment_qr_url" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "payment_bank_info" text;