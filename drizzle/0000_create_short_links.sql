CREATE TABLE "short_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"short_code" varchar(12) NOT NULL,
	"destination_url" text NOT NULL,
	"management_token_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "short_links_short_code_format" CHECK ("short_links"."short_code" ~ '^[a-z0-9]{6,12}$'),
	CONSTRAINT "short_links_destination_url_protocol" CHECK ("short_links"."destination_url" ~ '^https?://')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "short_links_short_code_unique" ON "short_links" USING btree ("short_code");--> statement-breakpoint
CREATE INDEX "short_links_active_created_at_idx" ON "short_links" USING btree ("deleted_at","created_at");