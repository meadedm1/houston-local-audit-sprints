import { describe, expect, it } from "vitest";
import { batchSchema, leadSchema } from "./scheduled";

const validLead = {
  businessName: "Cypress Wellness Studio",
  category: "wellness studio",
  city: "Houston",
  websiteUrl: "https://example.com",
  issueType: "website_conversion" as const,
  severity: "high" as const,
  headline: "The primary booking button disappears below the first mobile screen",
  evidence: "On the public mobile page, the first clear booking CTA is below the fold and the hero has no tap target.",
  recommendation: "Move one booking CTA into the first mobile viewport and repeat it after the service proof section.",
  estimatedImpact: "Fewer mobile visitors will have to hunt for the next step.",
  sourceUrls: ["https://example.com/services"],
  price: 200,
  subject: "One mobile conversion leak I spotted at Cypress Wellness",
  body: "I recorded a short audit showing one fixable issue on your mobile experience.",
  videoScript: "Open with the public page, show the first viewport, explain the friction, and close with the 48-hour fix offer.",
  paymentCta: "If useful, I can fix this within 48 hours for $200.",
};

describe("scheduled audit payload", () => {
  it("accepts a verified lead with an evidence-backed draft", () => {
    const result = leadSchema.safeParse(validLead);
    expect(result.success).toBe(true);
  });

  it("accepts a batch containing multiple comparable leads", () => {
    const result = batchSchema.safeParse({
      region: "Houston, Texas",
      niche: "local businesses",
      leads: [validLead, { ...validLead, businessName: "Heights Auto Care" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects unverifiable records without a concrete finding", () => {
    const result = batchSchema.safeParse({
      region: "Houston, Texas",
      niche: "local businesses",
      leads: [{ businessName: "Unknown", issueType: "other", severity: "low" }],
    });
    expect(result.success).toBe(false);
  });
});
