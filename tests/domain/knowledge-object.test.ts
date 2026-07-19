import { describe, expect, it } from "vitest";
import { KnowledgeObject } from "../../src/modules/knowledge/domain/knowledge-object.js";
import { CandidateKnowledgeSet } from "../../src/modules/knowledge/domain/candidate-knowledge-set.js";
import { CONFIDENCE_LADDER } from "../../src/modules/knowledge/domain/types.js";

describe("KnowledgeObject evolution", () => {
  const base = () =>
    KnowledgeObject.createFromImport({
      id: "know_1",
      candidateId: "cand_1",
      workspaceId: "ws_1",
      field: "english",
      originalValue: "B2",
      initialConfidence: CONFIDENCE_LADDER.resume,
      initialSource: "Resume",
      createdAt: "2026-07-10T10:00:00.000Z",
      evidenceId: "evid_1",
    });

  it("preserves originalValue and appends revisions", () => {
    const first = base().applyRevision({
      revisionId: "krev_1",
      actor: "recruiter_a",
      timestamp: "2026-07-10T10:05:00.000Z",
      newValue: "C1",
      reason: "Wrong English",
      source: "Recruiter Review",
      confidence: CONFIDENCE_LADDER.recruiter,
      signalId: "ksig_1",
      signalType: "correct",
    });

    expect(first.originalValue).toBe("B2");
    expect(first.currentValue).toBe("C1");
    expect(first.revisionNumber).toBe(1);
    expect(first.revisions[0]).toMatchObject({
      oldValue: "B2",
      newValue: "C1",
      actor: "recruiter_a",
    });
    expect(first.confidence).toBe(CONFIDENCE_LADDER.recruiter);
    expect(first.confidenceHistory).toHaveLength(2);
    expect(first.signals[0]?.type).toBe("correct");
  });

  it("grows evidence without losing history", () => {
    const withEvidence = base().addEvidence({
      evidence: {
        id: "evid_2",
        source: "Interview",
        confidence: CONFIDENCE_LADDER.interview,
        createdAt: "2026-07-10T11:00:00.000Z",
        note: "Spoke fluently",
      },
      raiseConfidence: true,
    });

    expect(withEvidence.evidence).toHaveLength(2);
    expect(withEvidence.confidence).toBe(CONFIDENCE_LADDER.interview);
    expect(withEvidence.analytics().evidenceCount).toBe(2);
  });
});

describe("CandidateKnowledgeSet timeline", () => {
  it("builds append-only timeline ending at current truth", () => {
    const obj = KnowledgeObject.createFromImport({
      id: "know_1",
      candidateId: "cand_1",
      workspaceId: "ws_1",
      field: "english",
      originalValue: "B2",
      initialConfidence: 0.65,
      initialSource: "Resume",
      createdAt: "2026-07-10T10:00:00.000Z",
      evidenceId: "evid_1",
    }).applyRevision({
      revisionId: "krev_1",
      actor: "recruiter_a",
      timestamp: "2026-07-10T10:05:00.000Z",
      newValue: "C1",
      reason: null,
      source: "Recruiter Review",
      signalId: "ksig_1",
      signalType: "correct",
    });

    const set = CandidateKnowledgeSet.create({
      candidateId: "cand_1",
      workspaceId: "ws_1",
      objects: [obj],
    });

    const timeline = set.buildTimeline();
    expect(timeline[0]?.kind).toBe("original_ai");
    expect(timeline.some((e) => e.kind === "recruiter_edit")).toBe(true);
    expect(timeline[timeline.length - 1]?.kind).toBe("current_truth");
    expect(timeline[timeline.length - 1]?.value).toBe("C1");
  });
});
