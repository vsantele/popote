CREATE TABLE `event_slots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`label` text(100) NOT NULL,
	`category` text(32),
	`needed_count` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_slots_event_id_idx` ON `event_slots` (`event_id`);--> statement-breakpoint
ALTER TABLE `items` ADD `slot_id` integer REFERENCES event_slots(id);--> statement-breakpoint
CREATE INDEX `items_slot_id_idx` ON `items` (`slot_id`);