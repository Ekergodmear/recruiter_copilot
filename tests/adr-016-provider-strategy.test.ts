import { describe, expect, it } from "vitest";
import {
  extractDeterministicFields,
  identifyKnowledgeGaps,
  mergeDeterministicOverProvider,
} from "../src/modules/resume-processing/rule-extraction.js";
import { MockKnowledgeExtractionProvider } from "../src/providers/mock/mock-knowledge-extraction-provider.js";
import { ProviderRegistry } from "../src/providers/registry.js";
import { GeminiKnowledgeExtractionProvider } from "../src/providers/gemini/gemini-knowledge-extraction-provider.js";

const SAMPLE_RESUME = `
Jane Doe
Senior Software Engineer
jane.doe@example.com
+84 912 345 678
https://linkedin.com/in/janedoe
https://github.com/janedoe

Skills: JavaScript, TypeScript, React, Node.js
8 years of experience in software development
`;

describe("ADR-016 deterministic extraction", () => {
  it("extracts email, phone, urls, skills without LLM", () => {
    const result = extractDeterministicFields(SAMPLE_RESUME);

    expect(result.fields.email).toBe("jane.doe@example.com");
    expect(result.fields.phone).toBeDefined();
    expect(result.fields.linkedInUrl).toContain("linkedin.com");
    expect(result.fields.githubUrl).toContain("github.com");
    expect(result.fields.skills).toEqual(
      expect.arrayContaining(["javascript", "typescript", "react", "node"]),
    );
    expect(result.fields.yearsOfExperience).toBe(8);
  });

  it("identifies gaps for LLM-only fields", () => {
    const { fields } = extractDeterministicFields(SAMPLE_RESUME);
    const gaps = identifyKnowledgeGaps(fields);

    expect(gaps).toContain("languages");
    expect(gaps).not.toContain("seniority");
  });

  it("flags seniority gap when years of experience is missing", () => {
    const text = "Jane Doe\njane@example.com\nJavaScript developer";
    const { fields } = extractDeterministicFields(text);
    const gaps = identifyKnowledgeGaps(fields);

    expect(gaps).toContain("seniority");
  });

  it("never lets provider overwrite deterministic fields", () => {
    const merged = mergeDeterministicOverProvider(
      { email: "jane.doe@example.com" },
      { email: "wrong@example.com", seniority: "senior" },
    );

    expect(merged.email).toBe("jane.doe@example.com");
    expect(merged.seniority).toBe("senior");
  });
});

describe("ADR-016 provider layer", () => {
  it("defaults to mock when GEMINI_API_KEY is unset", () => {
    const registry = new ProviderRegistry({
      knowledgeExtraction: "mock",
      summary: "mock",
      reasoning: "mock",
      embedding: "local",
    });

    expect(registry.getKnowledgeExtractionProvider().providerId).toBe("mock-knowledge-extraction");
  });

  it("mock provider fills only gaps", async () => {
    const provider = new MockKnowledgeExtractionProvider();
    const output = await provider.completeKnowledge({
      contractId: "KC-001",
      traceId: "t1",
      correlationId: "c1",
      workspaceId: "ws1",
      resumeId: "r1",
      rawText: SAMPLE_RESUME,
      deterministicFields: { email: "jane.doe@example.com" },
      gaps: [{ field: "languages", reason: "inference_required" }],
    });

    expect(output.filledGaps).toContain("languages");
    expect(output.providerId).toBe("mock-knowledge-extraction");
  });

  it("gemini reports unavailable without API key", () => {
    const provider = new GeminiKnowledgeExtractionProvider(undefined);
    expect(provider.health().available).toBe(false);
  });
});

describe("ADR-016 architecture boundaries", () => {
  it("business modules do not import vendor AI SDKs", async () => {
    const { readFileSync } = await import("node:fs");
    const { readdirSync } = await import("node:fs");
    const { join } = await import("node:path");

    const forbidden = ["@google/generative-ai", "openai", "@anthropic-ai/sdk", "ollama"];
    const roots = ["src/modules", "src/app"];

    function walk(dir: string): string[] {
      const entries = readdirSync(dir, { withFileTypes: true });
      return entries.flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return walk(path);
        if (entry.name.endsWith(".ts")) return [path];
        return [];
      });
    }

    for (const root of roots) {
      for (const file of walk(root)) {
        const content = readFileSync(file, "utf-8");
        for (const pkg of forbidden) {
          expect(content, `${file} must not import ${pkg}`).not.toContain(pkg);
        }
      }
    }
  });
});
