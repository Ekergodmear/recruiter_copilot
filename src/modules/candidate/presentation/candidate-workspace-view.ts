import type { CandidateRecord } from "../domain/candidate/candidate-record.js";

/**
 * Field mapping (EPIC-001):
 * - name ← candidate.profile.name
 * - phone / email ← identity (may be empty)
 * - skills / english / experience ← verified knowledge
 * - education / currentTitle / company ← workspace bag (empty until later EPICs)
 * - salary / note ← workspace bag (editable)
 */
export type CandidateWorkspaceView = {
  candidateId: string;
  name: string;
  phone: string;
  email: string;
  currentTitle: string;
  company: string;
  skills: string;
  experience: string;
  education: string;
  english: string;
  salary: string;
  note: string;
  summary: string;
  ready: boolean;
  createdAt: string;
  updatedAt: string;
  uploadedAt: string;
};

export function toCandidateWorkspaceView(record: CandidateRecord): CandidateWorkspaceView {
  const knowledge = record.knowledge;
  return {
    candidateId: record.candidateId,
    name: record.candidate.profile.name,
    phone: record.identity?.phone ?? "",
    email: record.identity?.email ?? "",
    currentTitle: record.workspace.currentTitle,
    company: record.workspace.company,
    skills: knowledge.currentValue("skills"),
    experience: knowledge.currentValue("years_of_experience"),
    education: record.workspace.education,
    english: knowledge.currentValue("english"),
    salary: record.workspace.salary,
    note: record.workspace.note,
    summary: knowledge.currentValue("summary"),
    ready: knowledge.isReady,
    createdAt: record.candidate.createdAt,
    updatedAt: record.workspace.updatedAt || knowledge.uploadedAt,
    uploadedAt: knowledge.uploadedAt,
  };
}

export type UpdateWorkspaceCommand = {
  candidateId: string;
  actorId: string;
  name?: string;
  phone?: string;
  email?: string;
  salary?: string;
  note?: string;
};
