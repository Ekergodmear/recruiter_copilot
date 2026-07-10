import { detectDocument } from "./document-detector.js";
import { getParser } from "./document-parsers.js";
import { applyOcrIfRequired, buildParsedDocument, type OcrEngine } from "./ocr.js";
import {
  extractDeterministicFields,
  identifyKnowledgeGaps,
  mergeDeterministicOverProvider,
} from "./rule-extraction.js";
import type { ResumeProcessingResult } from "./types.js";
import type { KnowledgeExtractionProvider } from "../../providers/interfaces/index.js";
import {
  isEnabled,
  loadFeatureFlagsFile,
  resolveFeatureFlags,
} from "../../shared/feature-flags/index.js";
import { getFeatureFlagsPath } from "../../shared/feature-flags/index.js";

export type ResumeProcessingInput = {
  buffer: Buffer;
  mimeType: string;
  traceId: string;
  correlationId: string;
  workspaceId: string;
  resumeId: string;
  ocrEngine?: OcrEngine;
};

export type ResumeProcessingOptions = {
  knowledgeProvider?: KnowledgeExtractionProvider;
  allowLlm: boolean;
};

export async function processResume(
  input: ResumeProcessingInput,
  options: ResumeProcessingOptions,
): Promise<ResumeProcessingResult> {
  const detection = detectDocument(input.mimeType);
  const parser = getParser(detection.format);
  let rawText = "";

  if (parser) {
    rawText = await parser.parse(input.buffer);
  }

  const { text, ocrApplied } = await applyOcrIfRequired(
    input.buffer,
    detection.requiresOcr,
    input.ocrEngine ?? { extractText: async () => "" },
    rawText,
  );

  const parsed = buildParsedDocument(text, detection.format, ocrApplied, {
    mimeType: input.mimeType,
  });

  const deterministic = extractDeterministicFields(parsed.rawText);
  const knowledgeGaps = identifyKnowledgeGaps(deterministic.fields);

  let llmInvoked = false;
  let providerId: string | undefined;

  const flags = resolveFeatureFlags(loadFeatureFlagsFile(getFeatureFlagsPath()));
  const parsingEnabled = isEnabled(flags, "ai.parsing.enabled") && options.allowLlm;

  if (parsingEnabled && knowledgeGaps.length > 0 && options.knowledgeProvider) {
    const health = options.knowledgeProvider.health();
    if (health.available) {
      const llmResult = await options.knowledgeProvider.completeKnowledge({
        contractId: "KC-001",
        traceId: input.traceId,
        correlationId: input.correlationId,
        workspaceId: input.workspaceId,
        resumeId: input.resumeId,
        rawText: parsed.rawText,
        deterministicFields: deterministic.fields,
        gaps: knowledgeGaps.map((field) => ({
          field,
          reason: "inference_required" as const,
        })),
      });

      mergeDeterministicOverProvider(
        deterministic.fields as Record<string, unknown>,
        llmResult.contractOutputs,
      );

      llmInvoked = true;
      providerId = llmResult.providerId;
    }
  }

  return {
    parsed,
    deterministic,
    knowledgeGaps,
    llmInvoked,
    providerId,
  };
}
