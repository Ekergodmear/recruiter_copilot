import type { Clock } from "../../../shared/clock/index.js";
import type { IdGenerator } from "../../../shared/id-generator/index.js";
import type { AuthorizationService } from "../../authorization/application/authorization-service.js";
import type { AuditRepository } from "../infrastructure/audit-repository.js";
import type {
  AuditListQuery,
  AuditOutcome,
  AuditRecord,
  AuditSource,
  AuditTarget,
} from "../domain/types.js";

export class AuditServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuditServiceError";
  }
}

export type RecordAuditInput = {
  actorId: string;
  action: string;
  source: AuditSource;
  outcome: AuditOutcome;
  target?: AuditTarget;
  summary: string;
  error?: { code: string; message: string } | null;
  correlation?: { actionId?: string } | null;
  occurredAt?: string;
};

/**
 * EPIC-012 — central append-only recorder.
 * Producers call record(); clients only query via list/get (AuthZ audit.read).
 */
export class AuditService {
  constructor(
    private readonly deps: {
      clock: Clock;
      idGenerator: IdGenerator;
      repository: AuditRepository;
      authorizationService: AuthorizationService;
    },
  ) {}

  /** Internal producer entry — no public free-form client write API. */
  async record(input: RecordAuditInput): Promise<AuditRecord> {
    const actorId = input.actorId?.trim() ?? "";
    if (!actorId) {
      throw new AuditServiceError("INVALID_ACTOR", "actorId is required for audit");
    }
    const action = input.action?.trim() ?? "";
    if (!action) {
      throw new AuditServiceError("INVALID_ACTION", "action is required for audit");
    }
    const record: AuditRecord = {
      auditId: this.deps.idGenerator.generateId("audit"),
      occurredAt: input.occurredAt ?? this.deps.clock.nowIso(),
      actorId,
      action,
      source: input.source,
      outcome: input.outcome,
      target: input.target ?? {},
      summary: input.summary,
      error: input.error ?? null,
      correlation: input.correlation ?? null,
    };
    await this.deps.repository.append(record);
    return record;
  }

  async getById(auditId: string, readerActorId: string): Promise<AuditRecord> {
    this.requireRead(readerActorId);
    const found = await this.deps.repository.findById(auditId);
    if (!found) throw new AuditServiceError("NOT_FOUND", "Audit record not found");
    return found;
  }

  async list(
    readerActorId: string,
    query: AuditListQuery = {},
  ): Promise<{ items: AuditRecord[]; total: number }> {
    this.requireRead(readerActorId);
    const items = await this.deps.repository.list(query);
    return { items, total: items.length };
  }

  private requireRead(actorId: string): void {
    const decision = this.deps.authorizationService.authorize(actorId, "audit.read");
    if (!decision.allowed) {
      throw new AuditServiceError(decision.code, decision.message);
    }
  }
}
