import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { z } from "zod";
import { analyzeGoogleProfileForLead } from "./profileAnalysis";

const settingsInput = z.object({
  region: z.string().min(2).max(160),
  niche: z.string().min(2).max(160),
  batchSize: z.number().int().min(5).max(25),
  cadence: z.string().min(2).max(80),
  priceLow: z.number().int().min(50).max(1000),
  priceHigh: z.number().int().min(50).max(2000),
});

const leadInput = z.object({
  businessName: z.string(), category: z.string().optional(), city: z.string().optional(),
  websiteUrl: z.string().optional(), gbpUrl: z.string().optional(), contactUrl: z.string().optional(),
  issueType: z.enum(["google_business_profile", "link_in_bio", "mobile_checkout", "website_conversion", "other"]),
  severity: z.enum(["high", "medium", "low"]), headline: z.string(), evidence: z.string(), recommendation: z.string(),
  estimatedImpact: z.string().optional(), sourceUrls: z.array(z.string()).optional(), price: z.number().int(),
  subject: z.string(), body: z.string(), videoScript: z.string(), paymentCta: z.string(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  workspace: router({
    getSettings: protectedProcedure.query(({ ctx }) => db.getOrCreateSettings(ctx.user.id)),
    updateSettings: protectedProcedure.input(settingsInput).mutation(({ ctx, input }) => db.updateSettings(ctx.user.id, input)),
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const [settings, batches, leads] = await Promise.all([
        db.getOrCreateSettings(ctx.user.id),
        db.listBatches(ctx.user.id),
        db.listLeads(ctx.user.id),
      ]);
      const ready = leads.filter(lead => lead.status === "new" || lead.status === "review").length;
      const approved = leads.filter(lead => lead.status === "approved").length;
      return { settings, batches, leads, metrics: { totalLeads: leads.length, ready, approved, batches: batches.length } };
    }),
    batches: protectedProcedure.query(({ ctx }) => db.listBatches(ctx.user.id)),
    leads: protectedProcedure.input(z.object({ batchId: z.number().int().positive().optional() }).optional()).query(({ ctx, input }) => db.listLeads(ctx.user.id, input?.batchId)),
    leadDetail: protectedProcedure.input(z.object({ leadId: z.number().int().positive() })).query(({ ctx, input }) => db.getLeadDetail(ctx.user.id, input.leadId)),
    setDraftStatus: protectedProcedure.input(z.object({ leadId: z.number().int().positive(), status: z.enum(["draft", "approved", "rejected"]) })).mutation(({ ctx, input }) => db.updateDraftStatus(ctx.user.id, input.leadId, input.status)),
    analyzeGoogleProfile: protectedProcedure.input(z.object({ leadId: z.number().int().positive() })).mutation(({ ctx, input }) => analyzeGoogleProfileForLead(ctx.user.id, input.leadId)),
    ingestManualBatch: protectedProcedure.input(z.object({ region: z.string(), niche: z.string(), leads: z.array(leadInput).min(1).max(25) })).mutation(async ({ ctx, input }) => {
      const result = await db.ingestBatch(ctx.user.id, { ...input, source: "manual" });
      const analysisResults = await Promise.allSettled(result.leadIds.map(leadId => analyzeGoogleProfileForLead(ctx.user.id, leadId)));
      return { ...result, analyzed: analysisResults.filter(item => item.status === "fulfilled").length };
    }),
  }),
});

export type AppRouter = typeof appRouter;
