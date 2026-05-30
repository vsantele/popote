ALTER TABLE `participants` ADD `rsvp` text DEFAULT 'going' NOT NULL;--> statement-breakpoint
ALTER TABLE `participants` ADD `extra_guests` integer DEFAULT 0 NOT NULL;