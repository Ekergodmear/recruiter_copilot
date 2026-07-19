import type { CandidateRecord } from "../domain/candidate/candidate-record.js";
import type { EditableFieldName } from "../domain/knowledge/verified-knowledge.js";
import { EDITABLE_FIELDS } from "../domain/knowledge/verified-knowledge.js";
import {
  buildReviewQueue,
  computeReviewPriority,
  reviewPriorityLabel,
  type ReviewPriority,
  type ReviewQueueItem,
} from "../domain/knowledge/review-priority.js";
import {
  formatProvenanceConfidence,
  type KnowledgeProvenance,
  type RevisionEntry,
  type VerificationMethod,
} from "../domain/knowledge/knowledge-provenance.js";

import type { ResumePreviewMetadata } from "../application/resume-preview-service.js";

export type FieldProvenanceView = {
  source: string;
  confidenceLabel: string;
  providerId?: string;
};

export type FieldDiffRow = {
  field: EditableFieldName;
  label: string;
  originalAi: string;
  current: string;
  edited: boolean;
  reviewed: boolean;
  rejected: boolean;
  reviewPriority: ReviewPriority;
  reviewPriorityLabel: string;
  status: "CLAIMED" | "HUMAN_VERIFIED";
  provenance: FieldProvenanceView;
  lastVerifiedBy: string | null;
  lastVerifiedAt: string | null;
  verificationMethod: VerificationMethod | null;
  revisionCount: number;
  ai: string;
  human: string | null;
  display: string;
};

export type DuplicateCandidateView = {
  candidateId: string;
  name: string;
  score: number;
};

export type CandidateReviewView = {
  candidateId: string;
  name: string;
  resumeVersion: number;
  ready: boolean;
  uploadedAt: string;
  readyAt: string | null;
  ttqcMs: number | null;
  aiAcceptanceRate: number;
  humanOverrideRate: number;
  verificationRate: number;
  reviewCompletionRate: number;
  reviewQueue: ReviewQueueItem[];
  resume: ResumePreviewMetadata | null;
  diff: FieldDiffRow[];
  reviewActions: readonly string[];
  overrideReasons: readonly string[];
  /** EPIC-007 — warning only; never blocks workflow */
  possibleDuplicates: DuplicateCandidateView[];
};

const FIELD_LABELS: Record<EditableFieldName, string> = {
  summary: "Summary",
  skills: "Skills",
  english: "English",
  years_of_experience: "Years of Experience",
};

function toProvenanceView(field: { provenance: KnowledgeProvenance }): FieldProvenanceView {
  return {
    source: field.provenance.source,
    confidenceLabel: formatProvenanceConfidence(field.provenance),
    providerId: field.provenance.providerId,
  };
}

function lastHumanRevision(revisions: RevisionEntry[]): string | null {
  const edits = revisions.filter((r) => r.action === "edit");
  return edits.length > 0 ? edits[edits.length - 1]!.value : null;
}

export function toCandidateReviewView(
  record: CandidateRecord,
  resume: ResumePreviewMetadata | null = null,
  possibleDuplicates: DuplicateCandidateView[] = [],
): CandidateReviewView {
  const knowledge = record.knowledge;
  const diff: FieldDiffRow[] = EDITABLE_FIELDS.map((field) => {
    const fieldKnowledge = knowledge.fields[field];
    const current = fieldKnowledge.currentValue;
    const priority = computeReviewPriority(fieldKnowledge);
    return {
      field,
      label: FIELD_LABELS[field],
      originalAi: fieldKnowledge.originalAiValue,
      current,
      edited: fieldKnowledge.edited,
      reviewed: fieldKnowledge.reviewed,
      rejected: fieldKnowledge.rejected,
      reviewPriority: priority,
      reviewPriorityLabel: reviewPriorityLabel(priority),
      status: fieldKnowledge.status,
      provenance: toProvenanceView(fieldKnowledge),
      lastVerifiedBy: fieldKnowledge.lastVerifiedBy,
      lastVerifiedAt: fieldKnowledge.lastVerifiedAt,
      verificationMethod: fieldKnowledge.verificationMethod,
      revisionCount: fieldKnowledge.revisions.length,
      ai: fieldKnowledge.originalAiValue,
      human: fieldKnowledge.edited ? lastHumanRevision(fieldKnowledge.revisions) : null,
      display: current,
    };
  });

  const ttqcMs =
    knowledge.readyAt !== null
      ? new Date(knowledge.readyAt).getTime() - new Date(knowledge.uploadedAt).getTime()
      : null;

  return {
    candidateId: record.candidateId,
    name: record.candidate.profile.name,
    resumeVersion: record.resumeVersion,
    ready: knowledge.isReady,
    uploadedAt: knowledge.uploadedAt,
    readyAt: knowledge.readyAt,
    ttqcMs,
    aiAcceptanceRate: knowledge.acceptanceRate(),
    humanOverrideRate: 1 - knowledge.acceptanceRate(),
    verificationRate: knowledge.verificationRate(),
    reviewCompletionRate: knowledge.reviewCompletionRate(),
    reviewQueue: buildReviewQueue(diff),
    resume,
    diff,
    reviewActions: ["accept", "edit", "reject", "verify"],
    overrideReasons: [
      "Wrong summary",
      "Missing skill",
      "Wrong years",
      "Wrong English",
      "Wrong company",
      "Other",
    ],
    possibleDuplicates,
  };
}
