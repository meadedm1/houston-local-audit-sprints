import type { Request, Response } from "express";
import { z } from "zod";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { analyzeGoogleProfileForLead } from "./profileAnalysis";

export const leadSchema = z.object({
  businessName: z.string().min(1).max(200),
  category: z.string().max(160).optional(),
  city: z.string().max(120).optional(),
  websiteUrl: z.string().url().optional(),
  gbpUrl: z.string().url().optional(),
  contactUrl: z.string().url().optional(),
  issueType: z.enum(["google_business_profile", "link_in_bio", "mobile_checkout", "website_conversion", "other"]),
  severity: z.enum(["high", "medium", "low"]),
  headline: z.string().min(10).max(240),
  evidence: z.string().min(20),
  recommendation: z.string().min(20),
  estimatedImpact: z.string().optional(),
  sourceUrls: z.array(z.string().url()).max(10).optional(),
  price: z.number().int().min(50).max(2000),
  subject: z.string().min(3).max(240),
  body: z.string().min(30),
  videoScript: z.string().min(60),
  paymentCta: z.string().min(10),
});

export const batchSchema = z.object({
  region: z.string().min(2).max(160),
  niche: z.string().min(2).max(160),
  leads: z.array(leadSchema).min(1).max(25),
});

export async function ingestAuditBatch(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const settings = await db.getSettingsByTaskUid(user.taskUid);
    if (!settings) return res.json({ ok: true, skipped: "orphan" });
    const parsed = batchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid-payload", issues: parsed.error.issues });
    const result = await db.ingestBatch(settings.ownerId, { ...parsed.data, source: "scheduled" });
    const analysisResults = await Promise.allSettled(result.leadIds.map(leadId => analyzeGoogleProfileForLead(settings.ownerId, leadId)));
    const analyzed = analysisResults.filter(item => item.status === "fulfilled").length;
    const analysisFailures = analysisResults.filter(item => item.status === "rejected").map(item => item.reason instanceof Error ? item.reason.message : String(item.reason));
    res.json({ ok: true, ...result, analyzed, analysisFailures });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Scheduled audit] failed", error);
    res.status(500).json({ error: message, context: { url: req.originalUrl }, timestamp: new Date().toISOString() });
  }
}
