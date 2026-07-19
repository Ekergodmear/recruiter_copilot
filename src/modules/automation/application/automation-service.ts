import type { Clock } from "../../../shared/clock/index.js";
import type { IdGenerator } from "../../../shared/id-generator/index.js";
import type { AuthorizationService } from "../../authorization/application/authorization-service.js";
import type { NotificationService } from "../../notification/application/notification-service.js";
import {
  RelationshipService,
  RelationshipServiceError,
} from "../../relationship/application/relationship-service.js";
import type { RelationshipRepository } from "../../relationship/infrastructure/relationship-repository.js";
import type { ActionResult, AutomationActionType } from "../domain/types.js";
import type { ActionResultRepository } from "../infrastructure/action-result-repository.js";
import { draftFingerprint, type EmailSendAdapter } from "../infrastructure/email-send-adapter.js";

export class AutomationServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AutomationServiceError";
  }
}

type AuthParams = {
  actorId?: string;
  confirmed?: boolean;
};

/**
 * EPIC-008 — controlled execution over existing capabilities.
 * Does not invent Workflow/Matching rules. Does not author outreach drafts.
 */
export class AutomationService {
  constructor(
    private readonly deps: {
      clock: Clock;
      idGenerator: IdGenerator;
      relationshipService: RelationshipService;
      relationshipRepository: RelationshipRepository;
      actionResultRepository: ActionResultRepository;
      emailSendAdapter: EmailSendAdapter;
      /** EPIC-009 — no local role matrix; policy via AuthorizationService. */
      authorizationService: AuthorizationService;
      /** EPIC-010 — fan-out automation.completed only; never owned by Notifications. */
      notificationService?: NotificationService;
    },
  ) {}

  async stageMove(params: {
    relationshipId: string;
    targetStage: string;
    actorId?: string;
    confirmed?: boolean;
  }): Promise<ActionResult> {
    const actorId = this.requireAuth(params);
    this.requirePermission(actorId);
    const before = await this.deps.relationshipRepository.findById(params.relationshipId);
    if (!before) {
      return this.fail("stage_move", actorId, "NOT_FOUND", "Relationship not found", {
        relationshipId: params.relationshipId,
        stage: params.targetStage,
      });
    }

    try {
      const historyLenBefore = before.stageHistory.length;
      const after = await this.deps.relationshipService.moveStage({
        id: params.relationshipId,
        stage: params.targetStage,
        actorId,
      });
      const noop =
        after.currentStage === before.currentStage &&
        after.stageHistory.length === historyLenBefore;
      return this.ok(
        "stage_move",
        actorId,
        {
          relationshipId: after.id,
          candidateId: after.candidateId,
          jobId: after.jobId,
          stage: after.currentStage,
        },
        noop,
      );
    } catch (err) {
      return this.fromRelationshipError("stage_move", actorId, err, {
        relationshipId: params.relationshipId,
        stage: params.targetStage,
      });
    }
  }

  async sendOutreach(params: {
    relationshipId: string;
    draftBody: string;
    to?: string;
    subject?: string;
    actorId?: string;
    confirmed?: boolean;
  }): Promise<ActionResult> {
    const actorId = this.requireAuth(params);
    this.requirePermission(actorId);
    const draft = params.draftBody?.trim() ?? "";
    if (!draft) {
      return this.fail("send_outreach", actorId, "DRAFT_REQUIRED", "draftBody is required", {
        relationshipId: params.relationshipId,
      });
    }

    const rel = await this.deps.relationshipRepository.findById(params.relationshipId);
    if (!rel) {
      return this.fail("send_outreach", actorId, "NOT_FOUND", "Relationship not found", {
        relationshipId: params.relationshipId,
      });
    }

    const fp = draftFingerprint(draft);
    const prior = await this.deps.actionResultRepository.findSuccessfulSend(rel.id, fp);
    if (prior) {
      return this.fail(
        "send_outreach",
        actorId,
        "ALREADY_SENT",
        "Same draft was already sent for this relationship",
        {
          relationshipId: rel.id,
          candidateId: rel.candidateId,
          jobId: rel.jobId,
          draftFingerprint: fp,
        },
      );
    }

    try {
      const outcome = await this.deps.emailSendAdapter.send({
        to: params.to?.trim() || "candidate@example.com",
        subject: params.subject?.trim() || "Opportunity",
        body: draft,
        candidateId: rel.candidateId,
        jobId: rel.jobId,
        relationshipId: rel.id,
        actorId,
      });
      return this.ok("send_outreach", actorId, {
        relationshipId: rel.id,
        candidateId: rel.candidateId,
        jobId: rel.jobId,
        draftFingerprint: outcome.draftFingerprint,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Send failed";
      return this.fail("send_outreach", actorId, "SEND_FAILED", message, {
        relationshipId: rel.id,
        draftFingerprint: fp,
      });
    }
  }

  async assign(params: {
    relationshipId: string;
    assigneeId: string;
    actorId?: string;
    confirmed?: boolean;
  }): Promise<ActionResult> {
    const actorId = this.requireAuth(params);
    this.requirePermission(actorId);
    try {
      const { relationship, changed } = await this.deps.relationshipService.assign({
        id: params.relationshipId,
        assigneeId: params.assigneeId,
        actorId,
      });
      return this.ok(
        "assign",
        actorId,
        {
          relationshipId: relationship.id,
          candidateId: relationship.candidateId,
          jobId: relationship.jobId,
          assigneeId: relationship.assigneeId ?? undefined,
        },
        !changed,
      );
    } catch (err) {
      return this.fromRelationshipError("assign", actorId, err, {
        relationshipId: params.relationshipId,
        assigneeId: params.assigneeId,
      });
    }
  }

  private requireAuth(params: AuthParams): string {
    if (params.confirmed !== true) {
      throw new AutomationServiceError(
        "CONFIRMATION_REQUIRED",
        "confirmed: true is required before execution",
      );
    }
    const actorId = params.actorId?.trim() ?? "";
    if (!actorId) {
      throw new AutomationServiceError("UNAUTHORIZED", "actorId is required");
    }
    return actorId;
  }

  private requirePermission(actorId: string): void {
    const decision = this.deps.authorizationService.authorize(actorId, "automation.execute");
    if (!decision.allowed) {
      throw new AutomationServiceError(decision.code, decision.message);
    }
  }

  private async ok(
    actionType: AutomationActionType,
    actorId: string,
    target: ActionResult["target"],
    noop = false,
  ): Promise<ActionResult> {
    const result: ActionResult = {
      actionId: this.deps.idGenerator.generateId("action"),
      actionType,
      actorId,
      executedAt: this.deps.clock.nowIso(),
      success: true,
      error: null,
      target,
      noop,
    };
    await this.deps.actionResultRepository.append(result);
    await this.deps.notificationService?.onAutomationCompleted(result);
    return result;
  }

  private async fail(
    actionType: AutomationActionType,
    actorId: string,
    code: string,
    message: string,
    target: ActionResult["target"],
  ): Promise<ActionResult> {
    const result: ActionResult = {
      actionId: this.deps.idGenerator.generateId("action"),
      actionType,
      actorId,
      executedAt: this.deps.clock.nowIso(),
      success: false,
      error: { code, message },
      target,
    };
    await this.deps.actionResultRepository.append(result);
    return result;
  }

  private async fromRelationshipError(
    actionType: AutomationActionType,
    actorId: string,
    err: unknown,
    target: ActionResult["target"],
  ): Promise<ActionResult> {
    if (err instanceof RelationshipServiceError) {
      return this.fail(actionType, actorId, err.code, err.message, target);
    }
    throw err;
  }
}
