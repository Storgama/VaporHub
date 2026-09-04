DROP INDEX "user_provider_unique_idx";--> statement-breakpoint
ALTER TABLE "oauth_token" ADD COLUMN "account_name" text;--> statement-breakpoint
ALTER TABLE "oauth_token" ADD COLUMN "account_avatar" text;--> statement-breakpoint
CREATE UNIQUE INDEX "user_provider_account_unique_idx" ON "oauth_token" USING btree ("user_id","provider","provider_account_id");