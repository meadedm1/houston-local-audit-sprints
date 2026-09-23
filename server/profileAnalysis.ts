import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";

export const googleProfileAnalysisSchema = {
  type: "object",
  properties: {
    summary: { type: "string", description: "A concise evidence-based profile analysis." },
    missingInfo: { type: "array", items: { type: "string" }, description: "Specific missing, unclear, or unverified fields." },
    priority: { type: "string", enum: ["high", "medium", "low"] },
    recommendedFix: { type: "string", description: "The most valuable next action for this profile." },
  },
  required: ["summary", "missingInfo", "priority", "recommendedFix"],
  additionalProperties: false,
} as const;

type ProfileAnalysis = {
  summary: string;
  missingInfo: string[];
  priority: "high" | "medium" | "low";
  recommendedFix: string;
};

async function readPublicProfileSnapshot(url: string) {
  try {
    const profileUrl = new URL(url);
    const isGoogleHost = profileUrl.hostname === "google.com" || profileUrl.hostname.endsWith(".google.com") || profileUrl.hostname.endsWith("googleusercontent.com");
    if (!isGoogleHost) return "The profile URL is not a supported Google-hosted page.";
    const response = await fetch(profileUrl, { signal: AbortSignal.timeout(10000), headers: { "user-agent": "Mozilla/5.0 (compatible; SprintboardAudit/1.0)" } });
    const html = await response.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 14000);
  } catch {
    return "The profile page could not be fetched; rely only on the stored evidence and URL.";
  }
}

export async function analyzeGoogleProfileForLead(ownerId: number, leadId: number) {
  const detail = await db.getLeadDetail(ownerId, leadId);
  if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
  if (!detail.lead.gbpUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "This lead does not have a Google Business Profile URL yet." });

  const profileSnapshot = await readPublicProfileSnapshot(detail.lead.gbpUrl);
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You analyze public Google Business Profile evidence for a local-business micro-audit. Be conservative: never claim a field is missing unless the snapshot or stored evidence supports it. If the page is dynamic or unavailable, say that verification is incomplete and recommend a manual check. Focus on practical customer-facing fields: business name, primary category, address/service area, hours, phone, website, booking/order link, photos, reviews, attributes, and description. Return only the requested JSON." },
      { role: "user", content: `Business: ${detail.lead.businessName}\nGoogle Business Profile URL: ${detail.lead.gbpUrl}\nStored audit evidence: ${detail.finding?.evidence ?? "None"}\nExisting recommendation: ${detail.finding?.recommendation ?? "None"}\nFetched public profile snapshot: ${profileSnapshot}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "google_profile_gap_analysis",
        strict: true,
        schema: googleProfileAnalysisSchema,
      },
    },
    max_tokens: 900,
  });
  const content = response.choices[0]?.message?.content;
  const raw = Array.isArray(content) ? content.map(part => part.type === "text" ? part.text : "").join("\n") : content;
  if (!raw) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The AI analysis returned no result." });
  let analysis: ProfileAnalysis;
  try {
    analysis = JSON.parse(raw) as ProfileAnalysis;
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The AI analysis returned invalid structured data." });
  }
  if (!analysis.summary || !Array.isArray(analysis.missingInfo) || !analysis.recommendedFix || !["high", "medium", "low"].includes(analysis.priority)) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The AI analysis did not match the required structure." });
  }
  return db.saveProfileAnalysis(ownerId, leadId, analysis);
}
