import { describe, expect, it } from "vitest";
import {
  buildReviewQueue,
  computeReviewPriority,
  isMissingKnowledgeValue,
} from "../../src/modules/candidate/domain/knowledge/review-priority.js";
import type { FieldKnowledge } from "../../src/modules/candidate/domain/knowledge/verified-knowledge.js";

function field(
  partial: Partial<FieldKnowledge> & Pick<FieldKnowledge, "currentValue">,
): FieldKnowledge {
  return {
    field: "english",
    originalAiValue: partial.currentValue,
    currentValue: partial.currentValue,
    revisions: [],
    edited: false,
    reviewed: false,
    rejected: false,
    status: "CLAIMED",
    provenance: { source: "Resume", confidence: 0.41 },
    lastVerifiedBy: null,
    lastVerifiedAt: null,
    verificationMethod: "AI",
    ...partial,
  };
}

describe("review priority", () => {
  it("flags missing values as CRITICAL", () => {
    expect(isMissingKnowledgeValue("unknown")).toBe(true);
    expect(computeReviewPriority(field({ currentValue: "unknown" }))).toBe("CRITICAL");
  });

  it("assigns HIGH for low confidence", () => {
    expect(
      computeReviewPriority(
        field({ currentValue: "B2", provenance: { source: "Resume", confidence: 0.41 } }),
      ),
    ).toBe("HIGH");
  });

  it("assigns MEDIUM for medium confidence", () => {
    expect(
      computeReviewPriority(
        field({ currentValue: "Summary text", provenance: { source: "Gemini", confidence: 0.73 } }),
      ),
    ).toBe("MEDIUM");
  });

  it("assigns LOW for high confidence", () => {
    expect(
      computeReviewPriority(
        field({ currentValue: "React", provenance: { source: "Resume", confidence: 0.98 } }),
      ),
    ).toBe("LOW");
  });

  it("assigns LOW for human verified fields", () => {
    expect(
      computeReviewPriority(
        field({ currentValue: "C1", status: "HUMAN_VERIFIED", reviewed: true }),
      ),
    ).toBe("LOW");
  });

  it("builds review queue excluding reviewed and LOW priority", () => {
    const queue = buildReviewQueue([
      {
        field: "english",
        label: "English",
        reviewed: false,
        reviewPriority: "HIGH",
        provenance: { confidenceLabel: "41%" },
      },
      {
        field: "skills",
        label: "Skills",
        reviewed: false,
        reviewPriority: "LOW",
        provenance: { confidenceLabel: "98%" },
      },
      {
        field: "summary",
        label: "Summary",
        reviewed: true,
        reviewPriority: "MEDIUM",
        provenance: { confidenceLabel: "73%" },
      },
    ]);
    expect(queue).toHaveLength(1);
    expect(queue[0]?.field).toBe("english");
  });
});
