CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`transfer_id` text NOT NULL,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`mime` text,
	`uploaded` integer DEFAULT 0 NOT NULL,
	`complete` integer DEFAULT false NOT NULL,
	`downloads` integer DEFAULT 0 NOT NULL,
	`last_download_at` integer,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`transfer_id`) REFERENCES `transfers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `files_transfer_idx` ON `files` (`transfer_id`);--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`message` text,
	`status` text DEFAULT 'uploading' NOT NULL,
	`total_size` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
