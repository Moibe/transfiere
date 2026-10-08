CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#ff2d75' NOT NULL,
	`logo_mime` text,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_slug_unique` ON `clients` (`slug`);--> statement-breakpoint
ALTER TABLE `transfers` ADD `client_id` text REFERENCES clients(id);--> statement-breakpoint
CREATE INDEX `transfers_client_idx` ON `transfers` (`client_id`);