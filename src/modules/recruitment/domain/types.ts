export type ActivityType =
  | "job_created"
  | "candidate_submitted"
  | "status_changed"
  | "interview_scheduled"
  | "interview_completed"
  | "offer_created"
  | "offer_sent"
  | "offer_accepted"
  | "offer_declined"
  | "placement"
  | "rejected"
  | "withdrawn"
  | "note";

export type PipelineActivity = {
  id: string;
  jobId: string;
  submissionId: string | null;
  candidateId: string | null;
  type: ActivityType;
  message: string;
  actorId: string;
  createdAt: string;
};

export type InterviewDecision = "Pending" | "Passed" | "Failed" | "Cancelled";

export type Interview = {
  id: string;
  submissionId: string;
  jobId: string;
  candidateId: string;
  round: number;
  type: string;
  date: string;
  interviewer: string;
  location: string;
  meetingLink: string;
  feedback: string;
  decision: InterviewDecision;
  status: "Scheduled" | "Completed" | "Cancelled";
  createdAt: string;
  createdBy: string;
};

export type OfferStatus = "Draft" | "Sent" | "Accepted" | "Declined" | "Expired";

export type Offer = {
  id: string;
  submissionId: string;
  jobId: string;
  candidateId: string;
  salary: string;
  startDate: string;
  benefits: string;
  notes: string;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};
