CREATE TABLE "sync_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(8) NOT NULL,
	"device_id" varchar(100) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sync_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE INDEX "sync_codes_code_idx" ON "sync_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "sync_codes_device_id_idx" ON "sync_codes" USING btree ("device_id");