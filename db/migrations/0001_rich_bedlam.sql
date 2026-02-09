CREATE TABLE `bookmarks` (
	`bookmark_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`sake_id` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sake_id`) REFERENCES `sakes`(`sake_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_bookmarks_user` ON `bookmarks` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bookmarks_unique` ON `bookmarks` (`user_id`,`sake_id`);--> statement-breakpoint
ALTER TABLE `sakes` ADD `is_limited` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `sakes` ADD `paid_tasting_price` integer;--> statement-breakpoint
ALTER TABLE `sakes` ADD `category` text DEFAULT '清酒';