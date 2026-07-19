import type {
  CandidateInsightsResponse,
  CandidateListItem,
  CandidateReview,
  CandidateWorkspace,
  CandidateWorkspacePatch,
  ImportResult,
  InsightScreen,
  InsightsResponse,
  Job,
  JobListItem,
  JobManualCreate,
  JobMatch,
  JobReview,
  JobSubmission,
  JobWorkspacePatch,
  CandidateJobRelationship,
  RelationshipStatus,
  Offer,
  PipelineActivity,
  PipelineStats,
  SubmissionDetail,
  Interview,
} from "./types";
import type {
  CandidateKnowledgeResponse,
  KnowledgeHistoryResponse,
  KnowledgeObject,
} from "./knowledge-types";

async function parseJson<T>(resPromise: Promise<Response>): Promise<T> {
  const res = await resPromise;
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listCandidates(params?: { ready?: boolean; q?: string; sort?: "updated" | "created" }) {
    const sp = new URLSearchParams();
    if (params?.ready === true) sp.set("ready", "true");
    if (params?.ready === false) sp.set("ready", "false");
    if (params?.q) sp.set("q", params.q);
    if (params?.sort) sp.set("sort", params.sort);
    const qs = sp.toString();
    return parseJson<{ items: CandidateListItem[] }>(
      fetch(`/api/v1/candidates${qs ? `?${qs}` : ""}`),
    );
  },

  getWorkspace(id: string) {
    return parseJson<CandidateWorkspace>(fetch(`/api/v1/candidates/${id}`));
  },

  updateWorkspace(id: string, body: CandidateWorkspacePatch) {
    return parseJson<CandidateWorkspace>(
      fetch(`/api/v1/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  },

  getReview(id: string) {
    return parseJson<CandidateReview>(fetch(`/api/v1/candidates/${id}/review`));
  },

  getInsights(id: string) {
    return this.getCandidateInsights(id, "candidate");
  },

  getCandidateInsights(id: string, screen: InsightScreen = "candidate") {
    const qs = screen ? `?screen=${encodeURIComponent(screen)}` : "";
    return parseJson<CandidateInsightsResponse>(fetch(`/api/v1/candidates/${id}/insights${qs}`));
  },

  getJobInsights(jobId: string) {
    return parseJson<InsightsResponse>(fetch(`/api/v1/jobs/${jobId}/insights`));
  },

  getSubmissionInsights(submissionId: string) {
    return parseJson<InsightsResponse>(fetch(`/api/v1/submissions/${submissionId}/insights`));
  },

  getInterviewInsights(interviewId: string) {
    return parseJson<InsightsResponse>(fetch(`/api/v1/interviews/${interviewId}/insights`));
  },

  trackInsightClick(screen: InsightScreen, insightId: string) {
    return parseJson<{ ok: boolean }>(
      fetch("/api/v1/insights/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screen, insight_id: insightId }),
      }),
    );
  },

  reviewField(
    id: string,
    body: { field: string; action: string; humanValue?: string; reason?: string },
  ) {
    return parseJson<CandidateReview>(
      fetch(`/api/v1/candidates/${id}/knowledge/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  },

  markReady(id: string, reviewMode?: "focus" | "flexible") {
    return parseJson<CandidateReview>(
      fetch(`/api/v1/candidates/${id}/mark-ready`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewMode }),
      }),
    );
  },

  importResume(file: File) {
    const form = new FormData();
    form.append("file", file);
    return parseJson<ImportResult>(
      fetch("/api/v1/candidates/import-resume", { method: "POST", body: form }),
    );
  },

  listJobs(params?: {
    status?: string;
    q?: string;
    company?: string;
    location?: string;
    sort?: "updated" | "created";
  }) {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.q) sp.set("q", params.q);
    if (params?.company) sp.set("company", params.company);
    if (params?.location) sp.set("location", params.location);
    if (params?.sort) sp.set("sort", params.sort);
    const qs = sp.toString();
    return parseJson<{ items: JobListItem[]; total: number }>(
      fetch(`/api/v1/jobs${qs ? `?${qs}` : ""}`),
    );
  },

  createJobManual(body: JobManualCreate) {
    return parseJson<Job>(
      fetch("/api/v1/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  },

  updateJob(id: string, body: JobWorkspacePatch) {
    return parseJson<Job>(
      fetch(`/api/v1/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  },

  createJobFromText(body: { text: string; company?: string }) {
    return parseJson<Job & { reviewUrl: string }>(
      fetch("/api/v1/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  },

  createJobFromFile(file: File, company?: string) {
    const form = new FormData();
    form.append("file", file);
    if (company) form.append("company", company);
    return parseJson<Job & { reviewUrl: string }>(
      fetch("/api/v1/jobs", { method: "POST", body: form }),
    );
  },

  getJob(id: string) {
    return parseJson<Job>(fetch(`/api/v1/jobs/${id}`));
  },

  createRelationship(body: { candidateId: string; jobId: string; status?: RelationshipStatus }) {
    return parseJson<CandidateJobRelationship>(
      fetch("/api/v1/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  },

  updateRelationshipStatus(id: string, status: RelationshipStatus) {
    return parseJson<CandidateJobRelationship>(
      fetch(`/api/v1/relationships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    );
  },

  listCandidateRelationships(candidateId: string) {
    return parseJson<{ items: CandidateJobRelationship[]; total: number }>(
      fetch(`/api/v1/candidates/${candidateId}/relationships`),
    );
  },

  listJobRelationships(jobId: string) {
    return parseJson<{ items: CandidateJobRelationship[]; total: number }>(
      fetch(`/api/v1/jobs/${jobId}/relationships`),
    );
  },

  getJobReview(id: string) {
    return parseJson<JobReview>(fetch(`/api/v1/jobs/${id}/review`));
  },

  reviewJobField(id: string, body: { field: string; action: string; humanValue?: string }) {
    return parseJson<JobReview>(
      fetch(`/api/v1/jobs/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  },

  markJobReady(id: string) {
    return parseJson<Job>(fetch(`/api/v1/jobs/${id}/mark-ready`, { method: "POST" }));
  },

  getJobMatches(id: string) {
    return parseJson<{ items: JobMatch[]; total: number }>(fetch(`/api/v1/jobs/${id}/matches`));
  },

  getJobSubmissions(id: string) {
    return parseJson<{ items: JobSubmission[]; total: number }>(
      fetch(`/api/v1/jobs/${id}/submissions`),
    );
  },

  submitCandidate(jobId: string, body: { candidateId: string; notes?: string }) {
    return parseJson<JobSubmission>(
      fetch(`/api/v1/jobs/${jobId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  },

  getJobPipeline(id: string) {
    return parseJson<PipelineStats>(fetch(`/api/v1/jobs/${id}/pipeline`));
  },

  getJobActivities(id: string) {
    return parseJson<{ items: PipelineActivity[]; total: number }>(
      fetch(`/api/v1/jobs/${id}/activities`),
    );
  },

  listSubmissions(params?: { status?: string; q?: string; jobId?: string; recruiter?: string }) {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.q) sp.set("q", params.q);
    if (params?.jobId) sp.set("jobId", params.jobId);
    if (params?.recruiter) sp.set("recruiter", params.recruiter);
    const qs = sp.toString();
    return parseJson<{ items: JobSubmission[]; total: number }>(
      fetch(`/api/v1/submissions${qs ? `?${qs}` : ""}`),
    );
  },

  getSubmission(id: string) {
    return parseJson<SubmissionDetail>(fetch(`/api/v1/submissions/${id}`));
  },

  updateSubmissionStatus(id: string, body: { status: string; notes?: string }) {
    return parseJson<JobSubmission>(
      fetch(`/api/v1/submissions/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  },

  rejectSubmission(id: string, notes?: string) {
    return parseJson<JobSubmission>(
      fetch(`/api/v1/submissions/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      }),
    );
  },

  withdrawSubmission(id: string, notes?: string) {
    return parseJson<JobSubmission>(
      fetch(`/api/v1/submissions/${id}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      }),
    );
  },

  scheduleInterview(
    submissionId: string,
    body: {
      date: string;
      type?: string;
      interviewer?: string;
      location?: string;
      meetingLink?: string;
      round?: number;
    },
  ) {
    return parseJson<Interview>(
      fetch(`/api/v1/submissions/${submissionId}/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  },

  completeInterview(id: string, body: { decision: string; feedback?: string }) {
    return parseJson<Interview>(
      fetch(`/api/v1/interviews/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  },

  createOffer(
    submissionId: string,
    body: { salary: string; startDate?: string; benefits?: string; notes?: string },
  ) {
    return parseJson<Offer>(
      fetch(`/api/v1/submissions/${submissionId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  },

  updateOfferStatus(id: string, status: string) {
    return parseJson<Offer>(
      fetch(`/api/v1/offers/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    );
  },

  markPlaced(submissionId: string) {
    return parseJson<JobSubmission>(
      fetch(`/api/v1/submissions/${submissionId}/place`, { method: "POST" }),
    );
  },

  getCandidateKnowledge(candidateId: string) {
    return parseJson<CandidateKnowledgeResponse>(fetch(`/api/v1/knowledge/${candidateId}`));
  },

  getKnowledgeHistory(candidateId: string) {
    return parseJson<KnowledgeHistoryResponse>(fetch(`/api/v1/knowledge/${candidateId}/history`));
  },

  patchKnowledge(id: string, body: { newValue: string; reason?: string }) {
    return parseJson<KnowledgeObject>(
      fetch(`/api/v1/knowledge/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  },

  addKnowledgeEvidence(id: string, body: { source: string; confidence: number; note?: string }) {
    return parseJson<KnowledgeObject>(
      fetch(`/api/v1/knowledge/${id}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  },
};
