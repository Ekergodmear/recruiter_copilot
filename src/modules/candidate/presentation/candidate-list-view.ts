import type { CandidateRecord } from "../domain/candidate/candidate-record.js";

export type CandidateListItem = {
  candidateId: string;
  name: string;
  ready: boolean;
  uploadedAt: string;
  readyAt: string | null;
  skillsPreview: string;
  english: string;
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
    result = result.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.skillsPreview.toLowerCase().includes(q) ||
        i.english.toLowerCase().includes(q),
    );
  }
  return result;
}
