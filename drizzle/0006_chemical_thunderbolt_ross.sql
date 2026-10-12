PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`sake_id` integer NOT NULL,
	`rating` real NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`comment` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sake_id`) REFERENCES `sakes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_reviews`("id", "user_id", "sake_id", "rating", "tags", "comment", "created_at", "updated_at") SELECT "id", "user_id", "sake_id", "rating", "tags", "comment", "created_at", "updated_at" FROM `reviews`;--> statement-breakpoint
DROP TABLE `reviews`;--> statement-breakpoint
ALTER TABLE `__new_reviews` RENAME TO `reviews`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_user_id_sake_id_unique` ON `reviews` (`user_id`,`sake_id`);--> statement-breakpoint
CREATE INDEX `reviews_sake_id_idx` ON `reviews` (`sake_id`);--> statement-breakpoint
CREATE INDEX `reviews_created_at_id_idx` ON `reviews` (`created_at`,`id`);