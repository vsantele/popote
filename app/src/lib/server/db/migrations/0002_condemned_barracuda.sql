ALTER TABLE "items" ALTER COLUMN "event_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "participant_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "event_id" SET DATA TYPE integer;