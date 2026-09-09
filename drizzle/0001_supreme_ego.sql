ALTER TABLE "profiles" ADD COLUMN "available_for_hire" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "skills" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "stats" jsonb DEFAULT '[]'::jsonb NOT NULL;