/**
 * Recruiter workspace fields (EPIC-001).
 * Stored inside profileJson — additive, no Prisma schema / TECH change.
 * currentTitle / company / education are display-only in MVP (may be empty).
 */
export type CandidateWorkspace = {
  salary: string;
  note: string;
  currentTitle: string;
  company: string;
  education: string;
  /** Last workspace profile update (ISO). Defaults to uploadedAt when unset. */
  updatedAt: string;
};

export function emptyCandidateWorkspace(updatedAt: string): CandidateWorkspace {
  return {
    salary: "",
    note: "",
    currentTitle: "",
    company: "",
    education: "",
    updatedAt,
  };
}

export function mergeCandidateWorkspace(
  current: CandidateWorkspace,
  patch: Partial<CandidateWorkspace>,
): CandidateWorkspace {
  return {
    salary: patch.salary ?? current.salary,
    note: patch.note ?? current.note,
    currentTitle: patch.currentTitle ?? current.currentTitle,
    company: patch.company ?? current.company,
    education: patch.education ?? current.education,
    updatedAt: patch.updatedAt ?? current.updatedAt,
  };
}
