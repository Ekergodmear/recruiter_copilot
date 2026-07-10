import { describe, expect, it } from "vitest";
import { VerifiedKnowledge } from "../../src/modules/candidate/domain/knowledge/verified-knowledge.js";

const resumeProvenance = { source: "Resume" as const, confidence: 0.9 };
const geminiProvenance = { source: "Gemini" as const, confidence: 0.82, providerId: "gemini" };

describe("VerifiedKnowledge", () => {
  const base = () =>
    VerifiedKnowledge.fromImport({
      summary: "AI summary",
      skills: [{ normalizedName: "React" }, { normalizedName: "Node" }],
      englishLevel: "B2",
      yearsOfExperience: 5,
      uploadedAt: "2026-07-09T10:00:00.000Z",
      importTraceId: "trace_import_1",
      summaryProvenance: geminiProvenance,
      skillsProvenance: resumeProvenance,
      englishProvenance: resumeProvenance,
      yearsProvenance: resumeProvenance,
    });

  it("starts with CLAIMED fields and 100% acceptance", () => {
    const knowledge = base();
    expect(knowledge.fields.english.originalAiValue).toBe("B2");
    expect(knowledge.fields.english.status).toBe("CLAIMED");
    expect(knowledge.acceptanceRate()).toBe(1);
    expect(knowledge.verificationRate()).toBe(0);
    expect(knowledge.editedFieldCount()).toBe(0);
  });

  it("preserves original AI and appends revision history on edit", () => {
    let knowledge = base();
    const first = knowledge.applyEdit({
      field: "english",
      humanValue: "C1",
      editedBy: "recruiter_a",
      editedAt: "2026-07-09T10:05:00.000Z",
      reason: "Wrong English",
    });

    expect(first.changed).toBe(true);
    expect(first.field.originalAiValue).toBe("B2");
    expect(first.field.currentValue).toBe("C1");
    expect(first.field.revisions).toHaveLength(1);
    expect(first.field.provenance.source).toBe("Recruiter Review");

    const second = first.knowledge.applyEdit({
      field: "english",
      humanValue: "B2",
      editedBy: "recruiter_b",
      editedAt: "2026-07-09T10:06:00.000Z",
    });

    expect(second.field.revisions).toHaveLength(2);
    expect(second.field.currentValue).toBe("B2");
    expect(second.field.edited).toBe(false);

    const third = second.knowledge.applyEdit({
      field: "english",
      humanValue: "C1",
      editedBy: "recruiter_c",
      editedAt: "2026-07-09T10:07:00.000Z",
    });

    knowledge = third.knowledge;
    expect(knowledge.fields.english.revisions).toHaveLength(3);
    expect(knowledge.fields.english.currentValue).toBe("C1");
    expect(knowledge.fields.english.originalAiValue).toBe("B2");
    expect(knowledge.acceptanceRate()).toBe(0.75);
  });

  it("tracks acceptance when human confirms AI value", () => {
    const { knowledge } = base().applyEdit({
      field: "english",
      humanValue: "B2",
      editedBy: "recruiter_alpha",
      editedAt: "2026-07-09T10:05:00.000Z",
    });

    expect(knowledge.fields.english.status).toBe("HUMAN_VERIFIED");
    expect(knowledge.fields.english.edited).toBe(false);
    expect(knowledge.acceptanceRate()).toBe(1);
    expect(knowledge.verificationRate()).toBe(0.25);
    expect(knowledge.reviewCompletionRate()).toBe(0.25);
  });

  it("verifies fields without changing current value", () => {
    const { knowledge } = base().verifyField({
      field: "english",
      verifiedBy: "recruiter_alpha",
      verifiedAt: "2026-07-09T10:05:00.000Z",
    });

    expect(knowledge.fields.english.status).toBe("HUMAN_VERIFIED");
    expect(knowledge.fields.english.currentValue).toBe("B2");
    expect(knowledge.fields.english.revisions).toHaveLength(1);
    expect(knowledge.fields.english.revisions[0]?.action).toBe("verify");
    expect(knowledge.verificationRate()).toBe(0.25);
  });

  it("tracks accept and reject review actions", () => {
    const base = VerifiedKnowledge.fromImport({
      summary: "AI summary",
      skills: [{ normalizedName: "React" }],
      englishLevel: "B2",
      yearsOfExperience: 5,
      uploadedAt: "2026-07-09T10:00:00.000Z",
      importTraceId: "trace_import_1",
      summaryProvenance: { source: "Gemini", confidence: 0.82 },
      skillsProvenance: { source: "Resume", confidence: 0.98 },
      englishProvenance: { source: "Resume", confidence: 0.41 },
      yearsProvenance: { source: "Resume", confidence: 0.9 },
    });

    const accepted = base.applyReview({
      field: "skills",
      action: "accept",
      actorId: "recruiter_alpha",
      recordedAt: "2026-07-09T10:01:00.000Z",
    });
    expect(accepted.field.reviewed).toBe(true);
    expect(accepted.revision.action).toBe("accept");

    const rejected = accepted.knowledge.applyReview({
      field: "english",
      action: "reject",
      actorId: "recruiter_alpha",
      recordedAt: "2026-07-09T10:02:00.000Z",
      reason: "Wrong English",
    });
    expect(rejected.field.rejected).toBe(true);
    expect(rejected.knowledge.reviewCompletionRate()).toBe(0.5);
  });

  it("marks ready by verifying all remaining fields without counting auto-verify as reviewed", () => {
    const knowledge = base().markReady("2026-07-09T10:10:00.000Z", "recruiter_alpha");
    expect(knowledge.isReady).toBe(true);
    expect(knowledge.verificationRate()).toBe(1);
    expect(knowledge.reviewCompletionRate()).toBe(0);
  });
});
