import type { CandidateRecord } from "../domain/candidate/candidate-record.js";

export type CandidateListSort = "updated" | "created";

export type CandidateListItem = {
  candidateId: string;
  name: string;
  ready: boolean;
  uploadedAt: string;
  readyAt: string | null;
  skillsPreview: string;
  english: string;
  /** EPIC-001 list columns — may be empty when not on profile */
  currentTitle: string;
  company: string;
  experience: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export function toCandidateListItem(record: CandidateRecord): CandidateListItem {
  const knowledge = record.knowledge;
  return {
    candidateId: record.candidateId,
    name: record.candidate.profile.name,
    ready: knowledge.isReady,
    uploadedAt: knowledge.uploadedAt,
    readyAt: knowledge.readyAt,
    skillsPreview: knowledge.currentValue("skills").slice(0, 80),
    english: knowledge.currentValue("english"),
    currentTitle: record.workspace.currentTitle,
    company: record.workspace.company,
    experience: knowledge.currentValue("years_of_experience"),
    email: record.identity?.email ?? "",
    createdAt: record.candidate.createdAt,
    updatedAt: record.workspace.updatedAt || knowledge.uploadedAt,
  };
}

export function filterCandidateList(
  items: CandidateListItem[],
  params: { ready?: boolean; q?: string },
): CandidateListItem[] {
  let result = items;
  if (params.ready === true) {
    result = result.filter((i) => i.ready);
  } else if (params.ready === false) {
    result = result.filter((i) => !i.ready);
  }
  const q = params.q?.trim().toLowerCase();
  if (q) {
    // EPIC-001: search by name and email (not semantic)
    result = result.filter(
      (i) => i.name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q),
    );
  }
  return result;
}

export function sortCandidateList(
  items: CandidateListItem[],
  sort: CandidateListSort = "updated",
): CandidateListItem[] {
  const key = sort === "created" ? "createdAt" : "updatedAt";
  return [...items].sort((a, b) => new Date(b[key]).getTime() - new Date(a[key]).getTime());
}
