ALTER TABLE "products" ADD COLUMN "slug" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_unique" ON "products" USING btree ("slug") WHERE "slug" IS NOT NULL;