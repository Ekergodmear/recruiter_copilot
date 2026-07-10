import type {
  KnowledgeProvenance,
  RevisionEntry,
  VerificationMethod,
} from "./knowledge-provenance.js";

export const EDITABLE_FIELDS = ["summary", "skills", "english", "years_of_experience"] as const;

export type EditableFieldName = (typeof EDITABLE_FIELDS)[number];

export type KnowledgeStatusValue = "CLAIMED" | "HUMAN_VERIFIED";

export const OVERRIDE_REASONS = [
  "Wrong summary",
  "Missing skill",
  "Wrong years",
  "Wrong English",
  "Wrong company",
  "Other",
] as const;

export type OverrideReason = (typeof OVERRIDE_REASONS)[number];

export const KNOWLEDGE_REVIEW_ACTIONS = ["accept", "edit", "reject", "verify"] as const;

export type KnowledgeReviewAction = (typeof KNOWLEDGE_REVIEW_ACTIONS)[number];

export type FieldKnowledge = {
  field: EditableFieldName;
  originalAiValue: string;
  currentValue: string;
  revisions: RevisionEntry[];
  edited: boolean;
  reviewed: boolean;
  rejected: boolean;
  status: KnowledgeStatusValue;
  provenance: KnowledgeProvenance;
  lastVerifiedBy: string | null;
  lastVerifiedAt: string | null;
  verificationMethod: VerificationMethod | null;
};

/** @deprecated Use FieldKnowledge */
export type FieldRevision = FieldKnowledge;

export function serializeSkills(skills: { normalizedName: string }[]): string {
  return skills.map((s) => s.normalizedName).join(", ");
}

export function parseSkills(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export type FieldImportMeta = {
  provenance: KnowledgeProvenance;
};

export class VerifiedKnowledge {
  private constructor(
    readonly fields: Record<EditableFieldName, FieldKnowledge>,
    readonly uploadedAt: string,
    readonly readyAt: string | null,
    readonly importTraceId: string,
  ) {}

  static fromImport(params: {
    summary: string;
    skills: { normalizedName: string; confidence?: number }[];
    englishLevel: string;
    yearsOfExperience: number | undefined;
    uploadedAt: string;
    importTraceId: string;
    summaryProvenance: KnowledgeProvenance;
    englishProvenance: KnowledgeProvenance;
    skillsProvenance: KnowledgeProvenance;
    yearsProvenance: KnowledgeProvenance;
  }): VerifiedKnowledge {
    const years =
      params.yearsOfExperience !== undefined ? String(params.yearsOfExperience) : "unknown";

    const fields = {
      summary: createClaimedField("summary", params.summary, params.summaryProvenance),
      skills: createClaimedField("skills", serializeSkills(params.skills), params.skillsProvenance),
      english: createClaimedField("english", params.englishLevel, params.englishProvenance),
      years_of_experience: createClaimedField("years_of_experience", years, params.yearsProvenance),
    };

    return new VerifiedKnowledge(fields, params.uploadedAt, null, params.importTraceId);
  }

  get isReady(): boolean {
    return this.readyAt !== null;
  }

  applyEdit(params: {
    field: EditableFieldName;
    humanValue: string;
    editedBy: string;
    editedAt: string;
    reason?: string | null;
  }): {
    knowledge: VerifiedKnowledge;
    field: FieldKnowledge;
    changed: boolean;
    revision: RevisionEntry;
  } {
    const current = this.fields[params.field];
    const revision: RevisionEntry = {
      value: params.humanValue,
      actorId: params.editedBy,
      recordedAt: params.editedAt,
      reason: params.reason ?? null,
      action: "edit",
    };

    const updated: FieldKnowledge = {
      ...current,
      currentValue: params.humanValue,
      revisions: [...current.revisions, revision],
      edited: params.humanValue !== current.originalAiValue,
      reviewed: true,
      rejected: false,
      status: "HUMAN_VERIFIED",
      lastVerifiedBy: params.editedBy,
      lastVerifiedAt: params.editedAt,
      verificationMethod: "Human",
      provenance: { source: "Recruiter Review" },
    };

    return {
      knowledge: this.withFields({ ...this.fields, [params.field]: updated }),
      field: updated,
      changed: params.humanValue !== current.currentValue,
      revision,
    };
  }

  applyReview(params: {
    field: EditableFieldName;
    action: KnowledgeReviewAction;
    actorId: string;
    recordedAt: string;
    humanValue?: string;
    reason?: string | null;
  }): {
    knowledge: VerifiedKnowledge;
    field: FieldKnowledge;
    revision: RevisionEntry;
    changed: boolean;
  } {
    switch (params.action) {
      case "accept":
        return this.applyAccept(params);
      case "edit": {
        const editResult = this.applyEdit({
          field: params.field,
          humanValue: params.humanValue ?? this.fields[params.field].currentValue,
          editedBy: params.actorId,
          editedAt: params.recordedAt,
          reason: params.reason,
        });
        return {
          knowledge: editResult.knowledge,
          field: editResult.field,
          revision: editResult.revision,
          changed: editResult.changed,
        };
      }
      case "reject":
        return this.applyReject(params);
      case "verify":
        return this.applyVerify(params);
    }
  }

  private applyAccept(params: {
    field: EditableFieldName;
    actorId: string;
    recordedAt: string;
    reason?: string | null;
  }) {
    const current = this.fields[params.field];
    const revision: RevisionEntry = {
      value: current.currentValue,
      actorId: params.actorId,
      recordedAt: params.recordedAt,
      reason: params.reason ?? null,
      action: "accept",
    };

    const updated: FieldKnowledge = {
      ...current,
      revisions: [...current.revisions, revision],
      reviewed: true,
      rejected: false,
      status: "HUMAN_VERIFIED",
      lastVerifiedBy: params.actorId,
      lastVerifiedAt: params.recordedAt,
      verificationMethod: "Human",
    };

    return {
      knowledge: this.withFields({ ...this.fields, [params.field]: updated }),
      field: updated,
      revision,
      changed: false,
    };
  }

  private applyReject(params: {
    field: EditableFieldName;
    actorId: string;
    recordedAt: string;
    reason?: string | null;
  }) {
    const current = this.fields[params.field];
    const revision: RevisionEntry = {
      value: current.currentValue,
      actorId: params.actorId,
      recordedAt: params.recordedAt,
      reason: params.reason ?? null,
      action: "reject",
    };

    const updated: FieldKnowledge = {
      ...current,
      revisions: [...current.revisions, revision],
      reviewed: true,
      rejected: true,
      status: "HUMAN_VERIFIED",
      lastVerifiedBy: params.actorId,
      lastVerifiedAt: params.recordedAt,
      verificationMethod: "Human",
    };

    return {
      knowledge: this.withFields({ ...this.fields, [params.field]: updated }),
      field: updated,
      revision,
      changed: false,
    };
  }

  private applyVerify(params: {
    field: EditableFieldName;
    actorId: string;
    recordedAt: string;
    reason?: string | null;
  }) {
    const result = this.verifyField({
      field: params.field,
      verifiedBy: params.actorId,
      verifiedAt: params.recordedAt,
      countsAsReviewed: true,
    });

    const revision =
      result.field.revisions[result.field.revisions.length - 1] ??
      ({
        value: result.field.currentValue,
        actorId: params.actorId,
        recordedAt: params.recordedAt,
        reason: params.reason ?? null,
        action: "verify",
      } satisfies RevisionEntry);

    return {
      knowledge: result.knowledge,
      field: result.field,
      revision,
      changed: result.newlyVerified,
    };
  }

  verifyField(params: {
    field: EditableFieldName;
    verifiedBy: string;
    verifiedAt: string;
    countsAsReviewed?: boolean;
  }): {
    knowledge: VerifiedKnowledge;
    field: FieldKnowledge;
    newlyVerified: boolean;
  } {
    const current = this.fields[params.field];
    if (current.status === "HUMAN_VERIFIED") {
      return { knowledge: this, field: current, newlyVerified: false };
    }

    const revision: RevisionEntry = {
      value: current.currentValue,
      actorId: params.verifiedBy,
      recordedAt: params.verifiedAt,
      action: "verify",
    };

    const updated: FieldKnowledge = {
      ...current,
      revisions: [...current.revisions, revision],
      reviewed: params.countsAsReviewed ?? false,
      rejected: false,
      status: "HUMAN_VERIFIED",
      lastVerifiedBy: params.verifiedBy,
      lastVerifiedAt: params.verifiedAt,
      verificationMethod: "Human",
    };

    return {
      knowledge: this.withFields({ ...this.fields, [params.field]: updated }),
      field: updated,
      newlyVerified: true,
    };
  }

  verifyAllUnverified(verifiedBy: string, verifiedAt: string): VerifiedKnowledge {
    return EDITABLE_FIELDS.reduce<VerifiedKnowledge>((knowledge, field) => {
      return knowledge.verifyField({ field, verifiedBy, verifiedAt }).knowledge;
    }, this);
  }

  markReady(readyAt: string, verifiedBy: string): VerifiedKnowledge {
    const verified = this.verifyAllUnverified(verifiedBy, readyAt);
    return new VerifiedKnowledge(
      verified.fields,
      verified.uploadedAt,
      readyAt,
      verified.importTraceId,
    );
  }

  currentValue(field: EditableFieldName): string {
    return this.fields[field].currentValue;
  }

  editedFieldCount(): number {
    return EDITABLE_FIELDS.filter((f) => this.fields[f].edited).length;
  }

  verifiedFieldCount(): number {
    return EDITABLE_FIELDS.filter((f) => this.fields[f].status === "HUMAN_VERIFIED").length;
  }

  totalEditableFields(): number {
    return EDITABLE_FIELDS.length;
  }

  acceptanceRate(): number {
    const total = this.totalEditableFields();
    const accepted = total - this.editedFieldCount();
    return total === 0 ? 1 : accepted / total;
  }

  reviewedFieldCount(): number {
    return EDITABLE_FIELDS.filter((f) => this.fields[f].reviewed).length;
  }

  verificationRate(): number {
    const total = this.totalEditableFields();
    const verified = this.verifiedFieldCount();
    return total === 0 ? 1 : verified / total;
  }

  reviewCompletionRate(): number {
    const total = this.totalEditableFields();
    const reviewed = this.reviewedFieldCount();
    return total === 0 ? 1 : reviewed / total;
  }

  private withFields(fields: Record<EditableFieldName, FieldKnowledge>): VerifiedKnowledge {
    return new VerifiedKnowledge(fields, this.uploadedAt, this.readyAt, this.importTraceId);
  }
}

function createClaimedField(
  field: EditableFieldName,
  originalAiValue: string,
  provenance: KnowledgeProvenance,
): FieldKnowledge {
  return {
    field,
    originalAiValue,
    currentValue: originalAiValue,
    revisions: [],
    edited: false,
    reviewed: false,
    rejected: false,
    status: "CLAIMED",
    provenance,
    lastVerifiedBy: null,
    lastVerifiedAt: null,
    verificationMethod: "AI",
  };
}

export function computeAiAcceptanceRate(editedCount: number, totalFields: number): number {
  if (totalFields <= 0) return 1;
  return Math.max(0, Math.min(1, (totalFields - editedCount) / totalFields));
}

export function computeReviewCompletionRate(reviewedCount: number, totalFields: number): number {
  if (totalFields <= 0) return 1;
  return Math.max(0, Math.min(1, reviewedCount / totalFields));
}

export function computeVerificationRate(verifiedCount: number, totalFields: number): number {
  if (totalFields <= 0) return 1;
  return Math.max(0, Math.min(1, verifiedCount / totalFields));
}
