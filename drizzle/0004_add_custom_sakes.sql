ALTER TABLE `sakes` ADD `is_custom` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `sakes` ADD `added_by` text REFERENCES user(id);