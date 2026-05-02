CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(200) NOT NULL,
	`date` integer NOT NULL,
	`location` text(500),
	`description` text,
	`host_name` text(100) NOT NULL,
	`host_device_id` text(100) NOT NULL,
	`share_code` text(8) NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_share_code_unique` ON `events` (`share_code`);--> statement-breakpoint
CREATE INDEX `events_share_code_idx` ON `events` (`share_code`);--> statement-breakpoint
CREATE INDEX `events_host_device_id_idx` ON `events` (`host_device_id`);--> statement-breakpoint
CREATE INDEX `events_date_idx` ON `events` (`date`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`participant_id` integer NOT NULL,
	`name` text(100) NOT NULL,
	`category` text(32) NOT NULL,
	`quantity` text(32),
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `items_event_id_idx` ON `items` (`event_id`);--> statement-breakpoint
CREATE INDEX `items_participant_id_idx` ON `items` (`participant_id`);--> statement-breakpoint
CREATE INDEX `items_category_idx` ON `items` (`category`);--> statement-breakpoint
CREATE TABLE `participants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`name` text(100) NOT NULL,
	`device_id` text(100) NOT NULL,
	`is_host` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `participants_event_device_idx` ON `participants` (`event_id`,`device_id`);--> statement-breakpoint
CREATE INDEX `participants_device_id_idx` ON `participants` (`device_id`);--> statement-breakpoint
CREATE TABLE `sync_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text(8) NOT NULL,
	`device_id` text(100) NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sync_codes_code_unique` ON `sync_codes` (`code`);--> statement-breakpoint
CREATE INDEX `sync_codes_code_idx` ON `sync_codes` (`code`);--> statement-breakpoint
CREATE INDEX `sync_codes_device_id_idx` ON `sync_codes` (`device_id`);