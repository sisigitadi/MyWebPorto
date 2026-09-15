ALTER TABLE "products" ADD COLUMN "purchase_type" text DEFAULT 'whatsapp' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "custom_whatsapp" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "custom_button_label" text;