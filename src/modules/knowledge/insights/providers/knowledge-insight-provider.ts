import type { EditableFieldName } from "../../../candidate/domain/knowledge/verified-knowledge.js";
import type { KnowledgeRepository } from "../../infrastructure/knowledge-repository.js";
import { createInsight, type Insight, type InsightContext } from "../insight.js";
import type { InsightProvider } from "../insight-provider.js";

const FIELD_LABEL: Record<EditableFieldName, string> = {
  summary: "Summary",
  skills: "Skills",
  english: "English level",
  years_of_experience: "Years of experience",
};

/** Field corrections / volatility from Knowledge Objects. */
export class KnowledgeInsightProvider implements InsightProvider {
  readonly name = "knowledge";

  constructor(private readonly knowledgeRepository: KnowledgeRepository) {}

  async provide(context: InsightContext): Promise<Insight[]> {
    const candidateId = candidateIdFrom(context);
    if (!candidateId) return [];

    const set = await this.knowledgeRepository.findByCandidateId(candidateId);
    if (!set) return [];

    const insights: Insight[] = [];
    let seq = 0;
    const nextId = () => `insight_knowledge_${candidateId}_${seq++}`;

    for (const obj of set.objects) {
      const corrections = obj.revisions.filter((r) => r.oldValue !== r.newValue);
      const label = FIELD_LABEL[obj.field];
      if (corrections.length >= 2) {
        insights.push(
          createInsight(
            {
              category: "knowledge_volatility",
              severity: "warning",
              title: `${label} is unstable`,
              description: `${label} changed ${corrections.length} times — AI may still be uncertain here.`,
            },
            nextId,
          ),
        );
      } else if (corrections.length === 1) {
        const severity = obj.field === "english" ? "warning" : "info";
        insights.push(
          createInsight(
            {
              category: "knowledge_correction",
              severity,
              title: `${label} was corrected`,
              description:
                obj.field === "english"
                  ? "English level was manually corrected."
                  : `${label} was corrected by recruiter.`,
            },
            nextId,
          ),
        );
      }
    }

    return insights;
  }
}

function candidateIdFrom(context: InsightContext): string | null {
  if (context.type === "candidate") return context.candidateId;
  return null;
}
