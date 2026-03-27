CREATE TABLE `episode` (
	`id` text PRIMARY KEY NOT NULL,
	`season_id` text NOT NULL,
	`episode_number` integer NOT NULL,
	`title` text,
	`duration` integer,
	`thumbnail_url` text,
	`s3_key` text,
	`file_size` integer,
	`format` text,
	`original_filename` text,
	FOREIGN KEY (`season_id`) REFERENCES `season`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ingest_failed` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`reason` text,
	`failed_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ingest_seen` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`episode` text NOT NULL,
	`torrent_hash` text,
	`processed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ingest_seen_title_episode` ON `ingest_seen` (`title`,`episode`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`poster_url` text,
	`backdrop_url` text,
	`genres` text,
	`rating` real,
	`year` integer,
	`source` text,
	`external_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media_file` (
	`id` text PRIMARY KEY NOT NULL,
	`media_id` text NOT NULL,
	`s3_key` text NOT NULL,
	`file_size` integer,
	`duration` integer,
	`format` text,
	`original_filename` text,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `season` (
	`id` text PRIMARY KEY NOT NULL,
	`media_id` text NOT NULL,
	`season_number` integer NOT NULL,
	`title` text,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `subtitle` (
	`id` text PRIMARY KEY NOT NULL,
	`media_file_id` text,
	`episode_id` text,
	`language` text NOT NULL,
	`label` text NOT NULL,
	`s3_key` text NOT NULL,
	`format` text NOT NULL,
	FOREIGN KEY (`media_file_id`) REFERENCES `media_file`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `episode`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `watch_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`media_id` text NOT NULL,
	`episode_id` text,
	`position_seconds` real NOT NULL,
	`duration_seconds` real NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`last_watched_at` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `episode`(`id`) ON UPDATE no action ON DELETE cascade
);
