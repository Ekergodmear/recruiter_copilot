const SKILL_NORMALIZATION: Record<
  string,
  { skillId: string; normalizedName: string; category: string }
> = {
  javascript: { skillId: "skill_javascript", normalizedName: "JavaScript", category: "language" },
  typescript: { skillId: "skill_typescript", normalizedName: "TypeScript", category: "language" },
  react: { skillId: "skill_react", normalizedName: "React", category: "frontend" },
  node: { skillId: "skill_node", normalizedName: "Node.js", category: "backend" },
  python: { skillId: "skill_python", normalizedName: "Python", category: "language" },
  java: { skillId: "skill_java", normalizedName: "Java", category: "language" },
  sql: { skillId: "skill_sql", normalizedName: "SQL", category: "database" },
  aws: { skillId: "skill_aws", normalizedName: "AWS", category: "cloud" },
  docker: { skillId: "skill_docker", normalizedName: "Docker", category: "devops" },
  kubernetes: { skillId: "skill_kubernetes", normalizedName: "Kubernetes", category: "devops" },
  git: { skillId: "skill_git", normalizedName: "Git", category: "tooling" },
  agile: { skillId: "skill_agile", normalizedName: "Agile", category: "methodology" },
  communication: {
    skillId: "skill_communication",
    normalizedName: "Communication",
    category: "soft",
  },
};

export type Kc001Output = {
  skills: Array<Record<string, unknown>>;
  contract_id: "KC-001";
  trace_id: string;
  extraction_method: string;
  executed_at: string;
};

export type Kc002Output = {
  english: Record<string, unknown>;
  contract_id: "KC-002";
  trace_id: string;
  extraction_method: string;
  executed_at: string;
};

export type KnowledgeContractContext = {
  traceId: string;
  workspaceId: string;
  candidateId: string;
  resumeId: string;
  executedAt: string;
  extractionMethod: string;
  knowledgeIdPrefix: string;
};

function normalizeSkill(raw: string) {
  const key = raw.toLowerCase();
  return (
    SKILL_NORMALIZATION[key] ?? {
      skillId: `skill_${key.replace(/\s+/g, "_")}`,
      normalizedName: raw,
      category: "unknown",
    }
  );
}

function inferEnglishLevel(rawText: string): string {
  const lower = rawText.toLowerCase();
  if (/ielts\s*7|toeic\s*9|fluent|c2/i.test(lower)) return "C1";
  if (/ielts\s*6|toeic\s*7|upper intermediate|b2/i.test(lower)) return "B2";
  if (/intermediate|b1/i.test(lower)) return "B1";
  return "unknown";
}

export class KnowledgeContractExecutor {
  executeKc001(
    context: KnowledgeContractContext,
    skills: string[],
    confidence = 0.85,
  ): Kc001Output {
    return {
      contract_id: "KC-001",
      trace_id: context.traceId,
      extraction_method: context.extractionMethod,
      executed_at: context.executedAt,
      skills: skills.map((skill, index) => {
        const normalized = normalizeSkill(skill);
        return {
          knowledge_id: `${context.knowledgeIdPrefix}_skill_${index + 1}`,
          knowledge_type: "skill",
          entity_type: "candidate",
          entity_id: context.candidateId,
          workspace_id: context.workspaceId,
          value: {
            skill: normalized.normalizedName,
            skill_id: normalized.skillId,
            normalized_name: normalized.normalizedName,
            category: normalized.category,
            proficiency: "unknown",
          },
          confidence,
          sources: ["Resume"],
          last_updated: context.executedAt,
          version: 1,
          trace_id: context.traceId,
          evidence_ref: context.resumeId,
        };
      }),
    };
  }

  executeKc002(context: KnowledgeContractContext, rawText: string, confidence = 0.7): Kc002Output {
    const level = inferEnglishLevel(rawText);
    return {
      contract_id: "KC-002",
      trace_id: context.traceId,
      extraction_method: context.extractionMethod,
      executed_at: context.executedAt,
      english: {
        knowledge_id: `${context.knowledgeIdPrefix}_english`,
        knowledge_type: "english",
        entity_type: "candidate",
        entity_id: context.candidateId,
        workspace_id: context.workspaceId,
        value: {
          level,
          speaking: "unknown",
          writing: "unknown",
          certifications: [],
        },
        confidence,
        sources: ["Resume"],
        last_updated: context.executedAt,
        version: 1,
        trace_id: context.traceId,
        evidence_ref: context.resumeId,
      },
    };
  }
}
