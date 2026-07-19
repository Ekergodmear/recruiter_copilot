import type { CandidateRecord as CandidateRecordRow } from "@prisma/client";
import { Candidate } from "../../../../modules/candidate/domain/candidate/candidate.js";
import { CandidateId } from "../../../../modules/candidate/domain/candidate/candidate-id.js";
import { CandidateProfile } from "../../../../modules/candidate/domain/candidate/candidate-profile.js";
import {
  CandidateStatus,
  type CandidateStatusValue,
} from "../../../../modules/candidate/domain/candidate/candidate-status.js";
import { CandidateRecord } from "../../../../modules/candidate/domain/candidate/candidate-record.js";
import {
  VerifiedKnowledge,
  type EditableFieldName,
  type FieldKnowledge,
} from "../../../../modules/candidate/domain/knowledge/verified-knowledge.js";
import type { CandidateIdentity } from "../../../../modules/candidate/domain/identity/types.js";

type ProfileJson = {
  name: string;
  summary: string;
  skills: { skillId: string; normalizedName: string; confidence: number }[];
  englishLevel: string;
};

type KnowledgeJson = {
  fields: Record<EditableFieldName, FieldKnowledge>;
  uploadedAt: string;
  readyAt: string | null;
  importTraceId: string;
};

export function candidateRecordToRow(record: CandidateRecord): {
  id: string;
  workspaceId: string;
  resumeId: string;
  resumeVersion: number;
  status: string;
  name: string;
  createdAt: string;
  uploadedAt: string;
  profileJson: string;
  knowledgeJson: string;
  identityJson: string | null;
} {
  const profile: ProfileJson = {
    name: record.candidate.profile.name,
    summary: record.candidate.profile.summary,
    skills: record.candidate.profile.skills.map((s) => ({
      skillId: s.skillId,
      normalizedName: s.normalizedName,
      confidence: s.confidence,
    })),
    englishLevel: record.candidate.profile.englishLevel,
  };
  const knowledge: KnowledgeJson = {
    fields: record.knowledge.fields,
    uploadedAt: record.knowledge.uploadedAt,
    readyAt: record.knowledge.readyAt,
    importTraceId: record.knowledge.importTraceId,
  };
  return {
    id: record.candidateId,
    workspaceId: record.candidate.workspaceId,
    resumeId: record.resumeId,
    resumeVersion: record.resumeVersion,
    status: record.candidate.status.toString(),
    name: record.candidate.profile.name,
    createdAt: record.candidate.createdAt,
    uploadedAt: record.knowledge.uploadedAt,
    profileJson: JSON.stringify(profile),
    knowledgeJson: JSON.stringify(knowledge),
    identityJson: record.identity ? JSON.stringify(record.identity) : null,
  };
}

export function rowToCandidateRecord(row: CandidateRecordRow): CandidateRecord {
  const profileData = JSON.parse(row.profileJson) as ProfileJson;
  const knowledgeData = JSON.parse(row.knowledgeJson) as KnowledgeJson;
  const identity = row.identityJson ? (JSON.parse(row.identityJson) as CandidateIdentity) : null;

  const profile = CandidateProfile.create({
    name: profileData.name,
    summary: profileData.summary,
    skills: profileData.skills,
    englishLevel: profileData.englishLevel,
  });

  const candidate = Candidate.restore({
    id: CandidateId.create(row.id),
    workspaceId: row.workspaceId,
    status: CandidateStatus.from(row.status as CandidateStatusValue),
    profile,
    createdAt: row.createdAt,
  });

  const knowledge = VerifiedKnowledge.restore({
    fields: knowledgeData.fields,
    uploadedAt: knowledgeData.uploadedAt,
    readyAt: knowledgeData.readyAt,
    importTraceId: knowledgeData.importTraceId,
  });

  return CandidateRecord.create({
    candidate,
    knowledge,
    resumeVersion: row.resumeVersion,
    resumeId: row.resumeId,
    identity,
  });
}
