import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const auditSettings = mysqlTable("audit_settings", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().unique(),
  region: varchar("region", { length: 160 }).notNull().default("Houston, Texas"),
  niche: varchar("niche", { length: 160 }).notNull().default("local businesses"),
  batchSize: int("batchSize").notNull().default(10),
  cadence: varchar("cadence", { length: 80 }).notNull().default("Twice weekly"),
  priceLow: int("priceLow").notNull().default(150),
  priceHigh: int("priceHigh").notNull().default(300),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const auditBatches = mysqlTable("audit_batches", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  region: varchar("region", { length: 160 }).notNull(),
  niche: varchar("niche", { length: 160 }).notNull(),
  source: mysqlEnum("source", ["scheduled", "manual"]).notNull().default("scheduled"),
  status: mysqlEnum("status", ["researching", "ready", "archived"]).notNull().default("ready"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export const businessLeads = mysqlTable("business_leads", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  batchId: int("batchId").notNull(),
  businessName: varchar("businessName", { length: 200 }).notNull(),
  category: varchar("category", { length: 160 }),
  city: varchar("city", { length: 120 }).notNull().default("Houston"),
  websiteUrl: text("websiteUrl"),
  gbpUrl: text("gbpUrl"),
  contactUrl: text("contactUrl"),
  status: mysqlEnum("status", ["new", "review", "approved", "contacted", "won", "archived"]).notNull().default("new"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const auditFindings = mysqlTable("audit_findings", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull().unique(),
  issueType: mysqlEnum("issueType", ["google_business_profile", "link_in_bio", "mobile_checkout", "website_conversion", "other"]).notNull(),
  severity: mysqlEnum("severity", ["high", "medium", "low"]).notNull().default("medium"),
  headline: varchar("headline", { length: 240 }).notNull(),
  evidence: text("evidence").notNull(),
  recommendation: text("recommendation").notNull(),
  estimatedImpact: text("estimatedImpact"),
  sourceUrls: text("sourceUrls"),
  verifiedAt: timestamp("verifiedAt").defaultNow().notNull(),
});

export const outreachDrafts = mysqlTable("outreach_drafts", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull().unique(),
  price: int("price").notNull().default(150),
  subject: varchar("subject", { length: 240 }).notNull(),
  body: text("body").notNull(),
  videoScript: text("videoScript").notNull(),
  paymentCta: text("paymentCta").notNull(),
  status: mysqlEnum("status", ["draft", "approved", "sent", "rejected"]).notNull().default("draft"),
  approvedAt: timestamp("approvedAt"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type AuditSetting = typeof auditSettings.$inferSelect;
export type AuditBatch = typeof auditBatches.$inferSelect;
export type BusinessLead = typeof businessLeads.$inferSelect;
export type AuditFinding = typeof auditFindings.$inferSelect;
export type OutreachDraft = typeof outreachDrafts.$inferSelect;
