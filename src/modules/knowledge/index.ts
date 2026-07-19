export { KnowledgeObject } from "./domain/knowledge-object.js";
export { CandidateKnowledgeSet } from "./domain/candidate-knowledge-set.js";
export {
  KnowledgeEvolutionService,
  KnowledgeEvolutionError,
} from "./application/knowledge-evolution-service.js";
export {
  InMemoryKnowledgeRepository,
  type KnowledgeRepository,
} from "./infrastructure/knowledge-repository.js";
export {
  registerKnowledgeRoutes,
  registerInsightRoutes,
  registerCandidateInsightRoutes,
} from "./presentation/knowledge-routes.js";
export {
  CandidateInsightService,
  type CandidateInsight,
  type CandidateInsightKind,
} from "./application/candidate-insight-service.js";
export { InsightEngine } from "./insights/insight-engine.js";
export type {
  Insight,
  InsightSeverity,
  InsightContext,
  InsightScreen,
} from "./insights/insight.js";
export type { InsightProvider } from "./insights/insight-provider.js";
export { KnowledgeInsightProvider } from "./insights/providers/knowledge-insight-provider.js";
export { JobInsightProvider } from "./insights/providers/job-insight-provider.js";
export { SubmissionInsightProvider } from "./insights/providers/submission-insight-provider.js";
export { InterviewInsightProvider } from "./insights/providers/interview-insight-provider.js";
export { PlacementInsightProvider } from "./insights/providers/placement-insight-provider.js";
export type {
  KnowledgeRevision,
  KnowledgeEvidence,
  KnowledgeSignal,
  KnowledgeSignalType,
  KnowledgeObjectSnapshot,
  KnowledgeTimelineEvent,
  ConfidencePoint,
  KnowledgeAnalytics,
} from "./domain/types.js";
export { CONFIDENCE_LADDER, KNOWLEDGE_SIGNAL_TYPES } from "./domain/types.js";
