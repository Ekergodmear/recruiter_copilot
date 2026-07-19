export type JobStatus = "Draft" | "Open" | "Paused" | "Closed" | "Filled";

export const JOB_STATUSES: JobStatus[] = ["Draft", "Open", "Paused", "Closed", "Filled"];

export type EmploymentType = "full_time" | "part_time" | "contract" | "internship" | "other";

export type JobReviewField =
  | "title"
  | "skills"
  | "englishRequirement"
  | "experienceYears"
  | "salary"
  | "responsibilities"
  | "requirements"
  | "benefits";

export const JOB_REVIEW_FIELDS: JobReviewField[] = [
  "title",
  "skills",
  "englishRequirement",
  "experienceYears",
  "salary",
  "responsibilities",
  "requirements",
  "benefits",
];

export type Job = {
  id: string;
  workspaceId: string;
  title: string;
  company: string;
  department: string;
  employmentType: EmploymentType;
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
  status: JobStatus;
  ready: boolean;
  submissionCount: number;
  placementCount: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  rawJdText: string;
};

export type SubmissionStatus =
  | "Submitted"
  | "Client Reviewing"
  | "Interview Scheduled"
  | "Interview Passed"
  | "Interview Failed"
  | "Offer Preparing"
  | "Offer Sent"
  | "Offer Accepted"
  | "Offer Declined"
  | "Placed"
  | "Rejected"
  | "Withdrawn";

export const SUBMISSION_STATUSES: SubmissionStatus[] = [
  "Submitted",
  "Client Reviewing",
  "Interview Scheduled",
  "Interview Passed",
  "Interview Failed",
  "Offer Preparing",
  "Offer Sent",
  "Offer Accepted",
  "Offer Declined",
  "Placed",
  "Rejected",
  "Withdrawn",
];

export type Submission = {
  id: string;
  candidateId: string;
  jobId: string;
  submittedBy: string;
  submittedAt: string;
  status: SubmissionStatus;
  notes: string;
  updatedAt: string;
};
