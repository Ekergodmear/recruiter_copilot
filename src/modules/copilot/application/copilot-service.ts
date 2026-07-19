import type { Clock } from "../../../shared/clock/index.js";
import type { IdGenerator } from "../../../shared/id-generator/index.js";
import type { ProviderRegistry } from "../../../providers/registry.js";
import { CandidateId } from "../../candidate/domain/candidate/candidate-id.js";
import type { CandidateRepository } from "../../candidate/infrastructure/persistence/candidate-repository.js";
import type { JobRepository } from "../../job/infrastructure/job-repository.js";
import type { MatchingService } from "../../matching/application/matching-service.js";
import type { RelationshipRepository } from "../../relationship/infrastructure/relationship-repository.js";
import type { CopilotAction, CopilotResponse } from "../domain/types.js";
import {
  buildCandidateSummaryContext,
  buildExplainMatchContext,
  buildInterviewQuestionsContext,
  buildJobSummaryContext,
  buildOutreachContext,
} from "./copilot-prompts.js";

export class CopilotServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CopilotServiceError";
  }
}

/**
 * Read-only Copilot — consumes Matching / Candidate / Job / Relationship.
 * Never mutates domain. Never recalculates Match Score.
 */
export class CopilotService {
  constructor(
    private readonly deps: {
      clock: Clock;
      idGenerator: IdGenerator;
      providerRegistry: ProviderRegistry;
      matchingService: MatchingService;
      candidateRepository: CandidateRepository;
      jobRepository: JobRepository;
      relationshipRepository: RelationshipRepository;
      workspaceId: string;
    },
  ) {}

  async explainMatch(params: { candidateId: string; jobId: string }): Promise<CopilotResponse> {
    const matchingResult = await this.deps.matchingService.match(params);
    const evidence = {
      overallMatchScore: matchingResult.overallMatchScore,
      matchedSkills: matchingResult.evidence.matchedSkills,
      missingSkills: matchingResult.evidence.missingSkills,
      experience: matchingResult.evidence.experience,
      english: matchingResult.evidence.english,
      salary: matchingResult.evidence.salary,
      scoreBreakdown: matchingResult.scoreBreakdown,
      weights: matchingResult.weights,
      source: "Matching Intelligence (EPIC-005)",
    };
    const { suggestion, providerId } = await this.askReasoning(
      "explain-match",
      buildExplainMatchContext(matchingResult),
    );
    return this.response("explain-match", evidence, suggestion, providerId, matchingResult);
  }

  async summarizeCandidate(params: { candidateId: string }): Promise<CopilotResponse> {
    const record = await this.deps.candidateRepository.findById(
      CandidateId.create(params.candidateId),
    );
    if (!record) {
      throw new CopilotServiceError("CANDIDATE_NOT_FOUND", "Candidate not found");
    }
    const evidence = {
      candidateId: record.candidateId,
      name: record.candidate.profile.name,
      skills: record.knowledge.currentValue("skills"),
      english: record.knowledge.currentValue("english"),
      experience: record.knowledge.currentValue("years_of_experience"),
      summary: record.knowledge.currentValue("summary"),
      salary: record.workspace.salary,
      currentTitle: record.workspace.currentTitle,
      company: record.workspace.company,
      source: "Candidate Intelligence (EPIC-001)",
    };
    const { suggestion, providerId } = await this.askReasoning(
      "summarize-candidate",
      buildCandidateSummaryContext(evidence),
    );
    return this.response("summarize-candidate", evidence, suggestion, providerId);
  }

  async summarizeJob(params: { jobId: string }): Promise<CopilotResponse> {
    const job = await this.deps.jobRepository.findById(params.jobId);
    if (!job || job.deletedAt) {
      throw new CopilotServiceError("JOB_NOT_FOUND", "Job not found");
    }
    const evidence = {
      jobId: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      skills: job.skills,
      experienceYears: job.experienceYears,
      englishRequirement: job.englishRequirement,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      currency: job.currency,
      requirements: job.requirements,
      description: job.description,
      source: "Job Intelligence (EPIC-002)",
    };
    const { suggestion, providerId } = await this.askReasoning(
      "summarize-job",
      buildJobSummaryContext(evidence),
    );
    return this.response("summarize-job", evidence, suggestion, providerId);
  }

  async draftOutreach(params: { candidateId: string; jobId: string }): Promise<CopilotResponse> {
    const record = await this.deps.candidateRepository.findById(
      CandidateId.create(params.candidateId),
    );
    if (!record) {
      throw new CopilotServiceError("CANDIDATE_NOT_FOUND", "Candidate not found");
    }
    const job = await this.deps.jobRepository.findById(params.jobId);
    if (!job || job.deletedAt) {
      throw new CopilotServiceError("JOB_NOT_FOUND", "Job not found");
    }
    const relationship = await this.deps.relationshipRepository.findByCandidateAndJob(
      params.candidateId,
      params.jobId,
    );
    const evidence = {
      candidateName: record.candidate.profile.name,
      candidateSkills: record.knowledge.currentValue("skills"),
      jobTitle: job.title,
      jobCompany: job.company,
      relationshipStage: relationship?.currentStage ?? null,
      source: "Candidate + Job (+ Relationship stage if present)",
      note: "Draft only — Copilot does not send email",
    };
    const { suggestion, providerId } = await this.askReasoning(
      "draft-outreach",
      buildOutreachContext(evidence),
    );
    return this.response("draft-outreach", evidence, suggestion, providerId);
  }

  async suggestInterviewQuestions(params: {
    candidateId: string;
    jobId: string;
  }): Promise<CopilotResponse> {
    const matchingResult = await this.deps.matchingService.match(params);
    const job = await this.deps.jobRepository.findById(params.jobId);
    if (!job || job.deletedAt) {
      throw new CopilotServiceError("JOB_NOT_FOUND", "Job not found");
    }
    const evidence = {
      overallMatchScore: matchingResult.overallMatchScore,
      missingSkills: matchingResult.evidence.missingSkills,
      matchedSkills: matchingResult.evidence.matchedSkills,
      jobTitle: job.title,
      jobRequirements: job.requirements,
      jobSkills: job.skills,
      source: "Matching Evidence + Job requirements",
      note: "Questions are suggestions — Copilot does not score the candidate",
    };
    const { suggestion, providerId } = await this.askReasoning(
      "suggest-interview-questions",
      buildInterviewQuestionsContext(evidence),
    );
    return this.response(
      "suggest-interview-questions",
      evidence,
      suggestion,
      providerId,
      matchingResult,
    );
  }

  private async askReasoning(
    task: string,
    context: Record<string, unknown>,
  ): Promise<{ suggestion: string; providerId: string }> {
    const provider = this.deps.providerRegistry.getReasoningProvider();
    const health = provider.health();
    if (!health.available) {
      throw new CopilotServiceError(
        "PROVIDER_UNAVAILABLE",
        health.reason ?? "Reasoning provider unavailable",
      );
    }
    const out = await provider.reason({
      traceId: this.deps.idGenerator.generateId("trace"),
      workspaceId: this.deps.workspaceId,
      task,
      context,
    });
    const suggestion = extractSuggestion(out.result, task, context);
    return { suggestion, providerId: out.providerId };
  }

  private response(
    action: CopilotAction,
    evidence: Record<string, unknown>,
    aiSuggestion: string,
    providerId: string,
    matchingResult?: CopilotResponse["matchingResult"],
  ): CopilotResponse {
    return {
      action,
      evidence,
      aiSuggestion,
      matchingResult,
      providerId,
      generatedAt: this.deps.clock.nowIso(),
    };
  }
}

function extractSuggestion(
  result: Record<string, unknown>,
  task: string,
  context: Record<string, unknown>,
): string {
  if (typeof result.suggestion === "string" && result.suggestion.trim()) {
    return result.suggestion;
  }
  if (typeof result.text === "string" && result.text.trim()) {
    return result.text;
  }
  // Fallback narrative for stubs that only echo task — still via provider result
  return buildFallbackSuggestion(task, context);
}

function buildFallbackSuggestion(task: string, context: Record<string, unknown>): string {
  switch (task) {
    case "explain-match":
      return [
        `Overall Match Score ${String(context.overallMatchScore)} comes from Matching Intelligence.`,
        `Matched skills: ${stringifyList(context.matchedSkills)}.`,
        `Missing skills: ${stringifyList(context.missingSkills)}.`,
        "This narrative is an AI suggestion; the score and evidence above are platform facts.",
      ].join(" ");
    case "summarize-candidate":
      return `Briefing: ${String(context.name ?? "Candidate")} — skills ${String(context.skills ?? "n/a")}, English ${String(context.english ?? "n/a")}, experience ${String(context.experience ?? "n/a")}.`;
    case "summarize-job":
      return `Role brief: ${String(context.title ?? "Job")} at ${String(context.company ?? "Company")}. Skills: ${stringifyList(context.skills)}.`;
    case "draft-outreach":
      return [
        `Subject: Opportunity — ${String(context.jobTitle ?? "Role")} at ${String(context.jobCompany ?? "our company")}`,
        "",
        `Hi ${String(context.candidateName ?? "there")},`,
        "",
        `I came across your profile and wanted to share an opening for ${String(context.jobTitle ?? "this role")} at ${String(context.jobCompany ?? "our company")}.`,
        "",
        "Would you be open to a brief conversation?",
        "",
        "Best regards",
      ].join("\n");
    case "suggest-interview-questions": {
      const missing = Array.isArray(context.missingSkills)
        ? (context.missingSkills as string[])
        : [];
      if (missing.length === 0) {
        return "1. Walk me through a recent project most relevant to this role.\n2. How do you approach learning new tools on the job?";
      }
      return missing
        .slice(0, 5)
        .map((s, i) => `${i + 1}. Tell me about your experience with ${s}.`)
        .join("\n");
    }
    default:
      return `AI suggestion for task "${task}".`;
  }
}

function stringifyList(value: unknown): string {
  if (Array.isArray(value)) return value.length ? value.map(String).join(", ") : "(none)";
  if (typeof value === "string") return value || "(none)";
  return "(none)";
}
