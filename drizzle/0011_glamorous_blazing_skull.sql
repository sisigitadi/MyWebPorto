CREATE TABLE "visitor_hits" (
	"id" text PRIMARY KEY NOT NULL,
	"ip_hash" text NOT NULL,
	"path" text NOT NULL,
	"referrer" text,
	"user_agent" text,
	"browser" text,
	"os" text,
	"device" text,
	"country" text,
	"city" text,
	"is_bot" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "visitor_hits_created_at_idx" ON "visitor_hits" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "visitor_hits_ip_hash_idx" ON "visitor_hits" USING btree ("ip_hash");--> statement-breakpoint
CREATE INDEX "visitor_hits_path_idx" ON "visitor_hits" USING btree ("path");--> statement-breakpoint
CREATE INDEX "visitor_hits_is_bot_idx" ON "visitor_hits" USING btree ("is_bot");