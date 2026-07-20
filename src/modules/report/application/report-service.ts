import type { AuthorizationService } from "../../authorization/application/authorization-service.js";
import type { AnalyticsService } from "../../analytics/application/analytics-service.js";
import type { AuditRepository } from "../../audit/infrastructure/audit-repository.js";
import type { CandidateRepository } from "../../candidate/infrastructure/persistence/candidate-repository.js";
import type { JobRepository } from "../../job/infrastructure/job-repository.js";
import { toCandidateListItem } from "../../candidate/presentation/candidate-list-view.js";
import { rowsToCsv } from "./csv.js";
import type {
  AuditExportQuery,
  CsvExportResult,
  OverviewReport,
  ReportKind,
} from "../domain/types.js";
import { REPORT_KINDS } from "../domain/types.js";

export class ReportServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ReportServiceError";
  }
}

/**
 * EPIC-014 — read-only reporting composition.
 * Projects Analytics / Audit / SoT into overview JSON and CSV exports.
 */
export class ReportService {
  constructor(
    private readonly deps: {
      authorizationService: AuthorizationService;
      analyticsService: AnalyticsService;
      /** Audit store read — AuthZ is report.read (not audit.read). */
      auditRepository: AuditRepository;
      candidateRepository: CandidateRepository;
      jobRepository: JobRepository;
    },
  ) {}

  async getOverview(actorId: string): Promise<OverviewReport> {
    this.requireRead(actorId);
    const snap = await this.deps.analyticsService.getOverview();
    return {
      generatedAt: snap.generatedAt,
      scope: "global",
      counts: { ...snap.counts },
      stageDistribution: snap.stageDistribution.stages
        .slice()
        .sort((a, b) => (a.stage < b.stage ? -1 : a.stage > b.stage ? 1 : 0))
        .map((s) => ({ stage: s.stage, count: s.count })),
      matchScoreBuckets: snap.matchScoreDistribution.buckets.map((b) => ({
        label: b.label,
        count: b.count,
      })),
      sourceCapabilities: [...snap.sourceCapabilities],
    };
  }

  async exportCsv(
    actorId: string,
    kind: string,
    auditQuery: AuditExportQuery = {},
  ): Promise<CsvExportResult> {
    this.requireRead(actorId);
    if (!REPORT_KINDS.includes(kind as ReportKind)) {
      throw new ReportServiceError("INVALID_KIND", `Invalid kind: ${kind}`);
    }
    const k = kind as ReportKind;
    switch (k) {
      case "overview":
        return this.exportOverview(actorId);
      case "audit":
        return this.exportAudit(actorId, auditQuery);
      case "candidates":
        return this.exportCandidates();
      case "jobs":
        return this.exportJobs();
    }
  }

  private requireRead(actorId: string): void {
    const decision = this.deps.authorizationService.authorize(actorId, "report.read");
    if (!decision.allowed) {
      throw new ReportServiceError(decision.code, decision.message);
    }
  }

  private async exportOverview(actorId: string): Promise<CsvExportResult> {
    const overview = await this.getOverview(actorId);
    // Omit generatedAt from CSV body so metric export is deterministic (AC-9).
    const rows: Array<Array<string | number>> = [
      ["candidates", overview.counts.candidates],
      ["jobs", overview.counts.jobs],
      ["relationships", overview.counts.relationships],
    ];
    for (const s of overview.stageDistribution) {
      rows.push([`stage.${s.stage}`, s.count]);
    }
    for (const b of overview.matchScoreBuckets) {
      rows.push([`matchBucket.${b.label}`, b.count]);
    }
    return {
      kind: "overview",
      filename: "report-overview.csv",
      contentType: "text/csv; charset=utf-8",
      body: rowsToCsv(["metric", "value"], rows),
    };
  }

  private async exportAudit(_actorId: string, query: AuditExportQuery): Promise<CsvExportResult> {
    const listed = await this.deps.auditRepository.list(query);
    // Newest-first — same order as Audit Query API.
    const rows = listed.map((a) => [
      a.auditId,
      a.occurredAt,
      a.actorId,
      a.action,
      a.source,
      a.outcome,
      a.summary,
      a.error?.code ?? "",
      a.target.candidateId ?? "",
      a.target.jobId ?? "",
      a.target.relationshipId ?? "",
    ]);
    return {
      kind: "audit",
      filename: "report-audit.csv",
      contentType: "text/csv; charset=utf-8",
      body: rowsToCsv(
        [
          "auditId",
          "occurredAt",
          "actorId",
          "action",
          "source",
          "outcome",
          "summary",
          "errorCode",
          "candidateId",
          "jobId",
          "relationshipId",
        ],
        rows,
      ),
    };
  }

  private async exportCandidates(): Promise<CsvExportResult> {
    const all = await this.deps.candidateRepository.findAll();
    const items = all
      .map(toCandidateListItem)
      .sort((a, b) => (a.candidateId < b.candidateId ? -1 : a.candidateId > b.candidateId ? 1 : 0));
    const rows = items.map((c) => [
      c.candidateId,
      c.name,
      c.skillsPreview,
      c.english,
      c.experience,
      c.ready ? "true" : "false",
      c.email,
    ]);
    return {
      kind: "candidates",
      filename: "report-candidates.csv",
      contentType: "text/csv; charset=utf-8",
      body: rowsToCsv(
        ["candidateId", "name", "skills", "english", "experience", "ready", "email"],
        rows,
      ),
    };
  }

  private async exportJobs(): Promise<CsvExportResult> {
    const all = await this.deps.jobRepository.findAll();
    const items = all
      .filter((j) => !j.deletedAt)
      .slice()
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const rows = items.map((j) => [
      j.id,
      j.title,
      j.company,
      j.status,
      j.skills.join(";"),
      j.salaryMin,
      j.salaryMax,
      j.location,
    ]);
    return {
      kind: "jobs",
      filename: "report-jobs.csv",
      contentType: "text/csv; charset=utf-8",
      body: rowsToCsv(
        ["jobId", "title", "company", "status", "skills", "salaryMin", "salaryMax", "location"],
        rows,
      ),
    };
  }
}
