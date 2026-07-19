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
  employmentType: string;
  source: string;
  ready: boolean;
  submissionCount: number;
  candidates: number;
  createdAt: string;
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
  source: string;
  notes: string;
};

export type JobManualCreate = {
  title: string;
  company: string;
  location?: string;
  employmentType?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  status?: string;
  notes?: string;
  description?: string;
  requirements?: string;
  benefits?: string;
};

export type JobWorkspacePatch = {
  title?: string;
  company?: string;
  location?: string;
  employmentType?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  status?: string;
  notes?: string;
};

/** EPIC-003 subset — still accepted on create/PATCH for compatibility. */
export type RelationshipStatus = "Sourced" | "Applied" | "Screening";

/** EPIC-004 default workflow stages. */
export type WorkflowStage =
  | "Sourced"
  | "Applied"
  | "Screening"
  | "Technical Interview"
  | "Hiring Manager Interview"
  | "Offer"
  | "Hired"
  | "Rejected"
  | "Withdrawn";

export const WORKFLOW_STAGES: WorkflowStage[] = [
  "Sourced",
  "Applied",
  "Screening",
  "Technical Interview",
  "Hiring Manager Interview",
  "Offer",
  "Hired",
  "Rejected",
  "Withdrawn",
];

export type StageHistoryEntry = {
  previousStage: WorkflowStage | null;
  newStage: WorkflowStage;
  changedAt: string;
};

export type CandidateJobRelationship = {
  id: string;
  candidateId: string;
  jobId: string;
  /** EPIC-003 alias — equals currentStage */
  status: WorkflowStage;
  currentStage: WorkflowStage;
  stageHistory: StageHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  /** EPIC-008 — assigned recruiter identity */
  assigneeId: string | null;
  jobTitle?: string;
  jobCompany?: string;
  jobStatus?: string | null;
  candidateName?: string;
};

/** EPIC-008 — Automation Action Result (attributable execution). */
export type ActionResult = {
  actionId: string;
  actionType: "stage_move" | "send_outreach" | "assign";
  actorId: string;
  executedAt: string;
  success: boolean;
  error: { code: string; message: string } | null;
  target: Record<string, string | undefined>;
  noop?: boolean;
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

export type MatchingResult = {
  candidateId: string;
  jobId: string;
  evidence: {
    matchedSkills: string[];
    missingSkills: string[];
    skillsDimensionScore: number;
    experience: {
      requiredYears: number | null;
      actualYears: number | null;
      status: string;
      dimensionScore: number;
    };
    english: {
      required: string;
      actual: string;
      status: string;
      dimensionScore: number;
    };
    salary: {
      expectedSalary: number | null;
      jobSalaryMin: number | null;
      jobSalaryMax: number | null;
      currency: string;
      status: string;
      dimensionScore: number;
    };
  };
  weights: {
    skills: number;
    experience: number;
    english: number;
    salary: number;
  };
  scoreBreakdown: {
    skills: number;
    experience: number;
    english: number;
    salary: number;
  };
  overallMatchScore: number;
  computedAt: string;
};

/** EPIC-006 — Copilot Transparency: evidence (platform) vs aiSuggestion (LLM). */
export type CopilotResponse = {
  action: string;
  evidence: Record<string, unknown>;
  aiSuggestion: string;
  matchingResult?: MatchingResult;
  providerId: string;
  generatedAt: string;
};

/** EPIC-007 — Analytics read snapshot (traceable aggregates). */
export type AnalyticsSnapshot = {
  scope: "global" | "job";
  jobId: string | null;
  generatedAt: string;
  sourceCapabilities: string[];
  counts: { candidates: number; jobs: number; relationships: number };
  stageDistribution: {
    stages: Array<{ stage: WorkflowStage; count: number; relationshipIds: string[] }>;
    total: number;
  };
  funnel: {
    transitions: Array<{
      from: WorkflowStage | null;
      to: WorkflowStage;
      count: number;
      relationshipIds: string[];
    }>;
    conversions: Array<{
      from: WorkflowStage;
      to: WorkflowStage;
      reachedFrom: number;
      movedTo: number;
      rate: number | null;
      relationshipIdsReachedFrom: string[];
      relationshipIdsMovedTo: string[];
    }>;
  };
  matchScoreDistribution: {
    buckets: Array<{
      label: string;
      min: number;
      max: number;
      count: number;
      items: Array<{
        relationshipId: string;
        candidateId: string;
        jobId: string;
        overallMatchScore: number;
        computedAt: string;
      }>;
    }>;
    totalComputed: number;
    source: "matching_on_demand";
  };
  timeToStage: {
    byStage: Array<{
      stage: WorkflowStage;
      sampleSize: number;
      averageDays: number | null;
      medianDays: number | null;
      relationshipIds: string[];
    }>;
  };
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
