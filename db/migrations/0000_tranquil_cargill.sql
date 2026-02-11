CREATE TABLE `bookmarks` (
	`bookmark_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`sake_id` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sake_id`) REFERENCES `sakes`(`sake_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_bookmarks_user` ON `bookmarks` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bookmarks_unique` ON `bookmarks` (`user_id`,`sake_id`);--> statement-breakpoint
CREATE TABLE `breweries` (
	`brewery_id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`map_position_x` real DEFAULT 0 NOT NULL,
	`map_position_y` real DEFAULT 0 NOT NULL,
	`area` text
);
--> statement-breakpoint
CREATE TABLE `brewery_notes` (
	`note_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`brewery_id` integer NOT NULL,
	`comment` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`brewery_id`) REFERENCES `breweries`(`brewery_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_brewery_notes_brewery` ON `brewery_notes` (`brewery_id`);--> statement-breakpoint
CREATE INDEX `idx_brewery_notes_created` ON `brewery_notes` (`created_at`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`review_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`sake_id` integer NOT NULL,
	`rating` integer NOT NULL,
	`tags` text DEFAULT '[]',
	`comment` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sake_id`) REFERENCES `sakes`(`sake_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_sake` ON `reviews` (`sake_id`);--> statement-breakpoint
CREATE INDEX `idx_reviews_user` ON `reviews` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_reviews_created` ON `reviews` (`created_at`);--> statement-breakpoint
CREATE TABLE `sakes` (
	`sake_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brewery_id` integer NOT NULL,
	`name` text NOT NULL,
	`type` text,
	`is_custom` integer DEFAULT false NOT NULL,
	`added_by` text,
	`is_limited` integer DEFAULT false NOT NULL,
	`paid_tasting_price` integer,
	`category` text DEFAULT '清酒',
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`brewery_id`) REFERENCES `breweries`(`brewery_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`added_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sakes_brewery` ON `sakes` (`brewery_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`user_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_name_unique` ON `users` (`name`);