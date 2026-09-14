CREATE TABLE "discord_alert_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"role_mention" text,
	"custom_message" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discord_alert_configs_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "discord_alert_configs" ADD CONSTRAINT "discord_alert_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;