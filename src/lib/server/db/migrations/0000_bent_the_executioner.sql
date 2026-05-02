CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"location" varchar(500),
	"description" text,
	"host_name" varchar(100) NOT NULL,
	"host_device_id" varchar(100) NOT NULL,
	"share_code" varchar(8) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_share_code_unique" UNIQUE("share_code")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" serial NOT NULL,
	"participant_id" serial NOT NULL,
	"name" varchar(100) NOT NULL,
	"category" varchar(32) NOT NULL,
	"quantity" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" serial NOT NULL,
	"name" varchar(100) NOT NULL,
	"device_id" varchar(100) NOT NULL,
	"is_host" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_share_code_idx" ON "events" USING btree ("share_code");--> statement-breakpoint
CREATE INDEX "events_host_device_id_idx" ON "events" USING btree ("host_device_id");--> statement-breakpoint
CREATE INDEX "events_date_idx" ON "events" USING btree ("date");--> statement-breakpoint
CREATE INDEX "items_event_id_idx" ON "items" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "items_participant_id_idx" ON "items" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "items_category_idx" ON "items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "participants_event_device_idx" ON "participants" USING btree ("event_id","device_id");--> statement-breakpoint
CREATE INDEX "participants_device_id_idx" ON "participants" USING btree ("device_id");