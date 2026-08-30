CREATE TABLE "stream_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text DEFAULT 'twitch' NOT NULL,
	"provider_stream_id" text NOT NULL,
	"title" text NOT NULL,
	"game_name" text,
	"peak_viewers" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stream_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"viewer_count" integer NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ALTER COLUMN "expires_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "stream_sessions" ADD CONSTRAINT "stream_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_metrics" ADD CONSTRAINT "stream_metrics_session_id_stream_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."stream_sessions"("id") ON DELETE cascade ON UPDATE no action;