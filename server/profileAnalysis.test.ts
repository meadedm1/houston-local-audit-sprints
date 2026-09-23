import { describe, expect, it } from "vitest";
import { googleProfileAnalysisSchema } from "./profileAnalysis";

function validate(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.summary === "string" && Array.isArray(record.missingInfo) && record.missingInfo.every(item => typeof item === "string") && ["high", "medium", "low"].includes(String(record.priority)) && typeof record.recommendedFix === "string";
}

describe("Google Profile AI analysis contract", () => {
  it("requires a conservative structured gap analysis", () => {
    expect(validate({ summary: "Hours are not clear in the available evidence.", missingInfo: ["Hours"], priority: "medium", recommendedFix: "Confirm and publish regular hours." })).toBe(true);
  });

  it("rejects a prose-only model response", () => {
    expect(validate("The profile looks incomplete.")).toBe(false);
    expect(googleProfileAnalysisSchema.required).toEqual(["summary", "missingInfo", "priority", "recommendedFix"]);
  });
});
