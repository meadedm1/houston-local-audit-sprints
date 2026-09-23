import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  auditBatches,
  auditFindings,
  auditSettings,
  businessLeads,
  InsertUser,
  outreachDrafts,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getOrCreateSettings(ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select().from(auditSettings).where(eq(auditSettings.ownerId, ownerId)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(auditSettings).values({ ownerId });
  const created = await db.select().from(auditSettings).where(eq(auditSettings.ownerId, ownerId)).limit(1);
  return created[0];
}

export async function getSettingsByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.select().from(auditSettings).where(eq(auditSettings.scheduleCronTaskUid, taskUid)).limit(1);
  return result[0];
}

export async function listBatches(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditBatches).where(eq(auditBatches.ownerId, ownerId)).orderBy(desc(auditBatches.createdAt));
}

export async function listLeads(ownerId: number, batchId?: number) {
  const db = await getDb();
  if (!db) return [];
  const where = batchId ? and(eq(businessLeads.ownerId, ownerId), eq(businessLeads.batchId, batchId)) : eq(businessLeads.ownerId, ownerId);
  return db.select().from(businessLeads).where(where).orderBy(desc(businessLeads.createdAt));
}

export async function getLeadDetail(ownerId: number, leadId: number) {
  const db = await getDb();
  if (!db) return null;
  const lead = (await db.select().from(businessLeads).where(and(eq(businessLeads.ownerId, ownerId), eq(businessLeads.id, leadId))).limit(1))[0];
  if (!lead) return null;
  const finding = (await db.select().from(auditFindings).where(eq(auditFindings.leadId, lead.id)).limit(1))[0] ?? null;
  const draft = (await db.select().from(outreachDrafts).where(eq(outreachDrafts.leadId, lead.id)).limit(1))[0] ?? null;
  return { lead, finding, draft };
}

export async function updateDraftStatus(ownerId: number, leadId: number, status: "draft" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const ownedLead = (await db.select({ id: businessLeads.id }).from(businessLeads).where(and(eq(businessLeads.ownerId, ownerId), eq(businessLeads.id, leadId))).limit(1))[0];
  if (!ownedLead) throw new Error("Lead not found");
  await db.update(outreachDrafts).set({ status, approvedAt: status === "approved" ? new Date() : null }).where(eq(outreachDrafts.leadId, leadId));
  if (status === "approved") await db.update(businessLeads).set({ status: "approved" }).where(eq(businessLeads.id, leadId));
  return getLeadDetail(ownerId, leadId);
}

export async function updateSettings(ownerId: number, input: { region: string; niche: string; batchSize: number; cadence: string; priceLow: number; priceHigh: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(auditSettings).set(input).where(eq(auditSettings.ownerId, ownerId));
  return getOrCreateSettings(ownerId);
}

export type IngestLead = {
  businessName: string;
  category?: string;
  city?: string;
  websiteUrl?: string;
  gbpUrl?: string;
  contactUrl?: string;
  issueType: "google_business_profile" | "link_in_bio" | "mobile_checkout" | "website_conversion" | "other";
  severity: "high" | "medium" | "low";
  headline: string;
  evidence: string;
  recommendation: string;
  estimatedImpact?: string;
  sourceUrls?: string[];
  price: number;
  subject: string;
  body: string;
  videoScript: string;
  paymentCta: string;
};

export async function ingestBatch(ownerId: number, input: { region: string; niche: string; source: "scheduled" | "manual"; leads: IngestLead[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const now = new Date();
  const batchInsert = await db.insert(auditBatches).values({ ownerId, region: input.region, niche: input.niche, source: input.source, status: "ready", completedAt: now });
  const batchId = Number(batchInsert[0].insertId);
  for (const item of input.leads.slice(0, 25)) {
    const leadInsert = await db.insert(businessLeads).values({
      ownerId, batchId, businessName: item.businessName, category: item.category ?? null, city: item.city ?? "Houston",
      websiteUrl: item.websiteUrl ?? null, gbpUrl: item.gbpUrl ?? null, contactUrl: item.contactUrl ?? null, status: "new",
    });
    const leadId = Number(leadInsert[0].insertId);
    await db.insert(auditFindings).values({
      leadId, issueType: item.issueType, severity: item.severity, headline: item.headline, evidence: item.evidence,
      recommendation: item.recommendation, estimatedImpact: item.estimatedImpact ?? null,
      sourceUrls: JSON.stringify(item.sourceUrls ?? []), verifiedAt: now,
    });
    await db.insert(outreachDrafts).values({
      leadId, price: item.price, subject: item.subject, body: item.body, videoScript: item.videoScript,
      paymentCta: item.paymentCta, status: "draft",
    });
  }
  return { batchId, count: Math.min(input.leads.length, 25) };
}
