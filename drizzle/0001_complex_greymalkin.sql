CREATE TABLE `audit_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`region` varchar(160) NOT NULL,
	`niche` varchar(160) NOT NULL,
	`source` enum('scheduled','manual') NOT NULL DEFAULT 'scheduled',
	`status` enum('researching','ready','archived') NOT NULL DEFAULT 'ready',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `audit_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_findings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`issueType` enum('google_business_profile','link_in_bio','mobile_checkout','website_conversion','other') NOT NULL,
	`severity` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`headline` varchar(240) NOT NULL,
	`evidence` text NOT NULL,
	`recommendation` text NOT NULL,
	`estimatedImpact` text,
	`sourceUrls` text,
	`verifiedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_findings_id` PRIMARY KEY(`id`),
	CONSTRAINT `audit_findings_leadId_unique` UNIQUE(`leadId`)
);
--> statement-breakpoint
CREATE TABLE `audit_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`region` varchar(160) NOT NULL DEFAULT 'Houston, Texas',
	`niche` varchar(160) NOT NULL DEFAULT 'local businesses',
	`batchSize` int NOT NULL DEFAULT 10,
	`cadence` varchar(80) NOT NULL DEFAULT 'Twice weekly',
	`priceLow` int NOT NULL DEFAULT 150,
	`priceHigh` int NOT NULL DEFAULT 300,
	`scheduleCronTaskUid` varchar(65),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `audit_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `audit_settings_ownerId_unique` UNIQUE(`ownerId`)
);
--> statement-breakpoint
CREATE TABLE `business_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`batchId` int NOT NULL,
	`businessName` varchar(200) NOT NULL,
	`category` varchar(160),
	`city` varchar(120) NOT NULL DEFAULT 'Houston',
	`websiteUrl` text,
	`gbpUrl` text,
	`contactUrl` text,
	`status` enum('new','review','approved','contacted','won','archived') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `outreach_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`price` int NOT NULL DEFAULT 150,
	`subject` varchar(240) NOT NULL,
	`body` text NOT NULL,
	`videoScript` text NOT NULL,
	`paymentCta` text NOT NULL,
	`status` enum('draft','approved','sent','rejected') NOT NULL DEFAULT 'draft',
	`approvedAt` timestamp,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `outreach_drafts_id` PRIMARY KEY(`id`),
	CONSTRAINT `outreach_drafts_leadId_unique` UNIQUE(`leadId`)
);
