export type InsightSeverity = "critical" | "warning" | "info";

export type InsightScreen = "candidate" | "review" | "job" | "submission" | "interview";

export type Insight = {
  id: string;
  category: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  action?: string;
};

/** @deprecated Use Insight */
export type CandidateInsight = Insight;

export type InsightsResponse = {
  insights: Insight[];
  candidateId?: string;
  jobId?: string;
  submissionId?: string;
  interviewId?: string;
};

export type CandidateInsightsResponse = InsightsResponse;

export type CandidateListItem = {
  candidateId: string;
  name: string;
  ready: boolean;
  uploadedAt: string;
  readyAt: string | null;
  skillsPreview: string;
  english: string;
  currentTitle: string;
  company: string;
  experience: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type CandidateWorkspace = {
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

export type CandidateWorkspacePatch = {
  name?: string;
  phone?: string;
  email?: string;
  salary?: string;
  note?: string;
};

export type FieldDiffRow = {
  field: string;
  label: string;
  current: string;
  reviewPriority?: string;
  reviewPriorityLabel?: string;
  reviewed?: boolean;
  provenance?: { source: string; confidenceLabel: string };
};

export type DuplicateCandidate = {
  candidateId: string;
  name: string;
  score: number;
};

export type CandidateReview = {
  candidateId: string;
  name: string;
  ready: boolean;
  uploadedAt: string;
  reviewQueue: { field: string; label: string; priorityLabel: string }[];
  resume: { filename: string; viewerType: string; contentUrl: string } | null;
  diff: FieldDiffRow[];
  possibleDuplicates?: DuplicateCandidate[];
};

export type ImportResult = {
  candidateId: string;
  reviewUrl: string;
};

export type JobListItem = {
  id: string;
  title: string;
  company: string;
  status: string;
  location: string;
  ready: boolean;
  submissionCount: number;
  candidates: number;
  updatedAt: string;
};

export type Job = {
  id: string;
  title: string;
  company: string;
  department: string;
  employmentType: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  experienceYears: number | null;
  englishRequirement: string;
  skills: string[];
  description: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  status: string;
  ready: boolean;
  submissionCount: number;
  placementCount?: number;
  createdAt: string;
  updatedAt: string;
  rawJdText: string;
};

export type JobReview = {
  jobId: string;
  title: string;
  company: string;
  status: string;
  ready: boolean;
  rawJdText: string;
  diff: FieldDiffRow[];
};

export type JobMatch = {
  candidateId: string;
  name: string;
  score: number;
  matchedSkills: string[];
  english: string;
  experienceYears: number | null;
  readyAt: string | null;
};

export type JobSubmission = {
  id: string;
  candidateId: string;
  candidateName?: string;
  jobId: string;
  jobTitle?: string;
  company?: string;
  submittedAt: string;
  updatedAt?: string;
  status: string;
  notes: string;
  submittedBy?: string;
};

export type PipelineStats = {
  jobId: string;
  submitted: number;
  clientReviewing: number;
  interviewing: number;
  offers: number;
  placements: number;
  rejected: number;
  withdrawn: number;
  total: number;
};

export type PipelineActivity = {
  id: string;
  jobId: string;
  submissionId: string | null;
  candidateId: string | null;
  type: string;
  message: string;
  actorId: string;
  createdAt: string;
};

export type Interview = {
  id: string;
  submissionId: string;
  round: number;
  type: string;
  date: string;
  interviewer: string;
  location: string;
  meetingLink: string;
  feedback: string;
  decision: string;
  status: string;
};

export type Offer = {
  id: string;
  submissionId: string;
  salary: string;
  startDate: string;
  benefits: string;
  notes: string;
  status: string;
};

export type SubmissionDetail = {
  submission: JobSubmission;
  job: { id: string; title: string; company: string; status: string } | null;
  candidate: { id: string; name: string; skills: string; english: string } | null;
  interviews: Interview[];
  offers: Offer[];
  activities: PipelineActivity[];
};
