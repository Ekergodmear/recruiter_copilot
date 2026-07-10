#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { extractDeterministicFields } from "../src/modules/resume-processing/rule-extraction.js";
import { KnowledgeContractExecutor } from "../src/modules/candidate/application/knowledge-contract-executor.js";
import { validateAgainstContract } from "../src/shared/contracts/validator.js";

type Expected = {
  email?: string;
  skills?: string[];
  nameContains?: string;
};

type Manifest = {
  version: string;
  contract_ids: string[];
  samples: Array<{
    id: string;
    input_ref: string;
    expected_ref: string;
  }>;
};

const manifestPath = resolve("evaluation/resume/manifest.json");

function readJsonFile(path: string): unknown {
  const raw = readFileSync(path, "utf-8").replace(/^\uFEFF/, "");
  return JSON.parse(raw) as unknown;
}

const manifest = readJsonFile(manifestPath) as Manifest;

if (!manifest.samples?.length) {
  console.error("eval:resume — no golden samples in manifest");
  process.exit(1);
}

const executor = new KnowledgeContractExecutor();
let failed = 0;

for (const sample of manifest.samples) {
  const textPath = resolve("evaluation/resume", sample.input_ref);
  const expectedPath = resolve("evaluation/resume", sample.expected_ref);
  const text = readFileSync(textPath, "utf-8");
  const expected = readJsonFile(expectedPath) as Expected;

  const extracted = extractDeterministicFields(text);
  const errors: string[] = [];

  if (expected.email && extracted.fields.email !== expected.email) {
    errors.push(`email expected ${expected.email}, got ${extracted.fields.email}`);
  }

  if (expected.nameContains && !extracted.fields.candidateName?.includes(expected.nameContains)) {
    errors.push(`name should contain ${expected.nameContains}`);
  }

  if (expected.skills?.length) {
    for (const skill of expected.skills) {
      if (!extracted.fields.skills?.includes(skill)) {
        errors.push(`missing skill ${skill}`);
      }
    }
  }

  const kc001 = executor.executeKc001(
    {
      traceId: `trace_${sample.id}`,
      workspaceId: "ws_eval",
      candidateId: `candidate_${sample.id}`,
      resumeId: `resume_${sample.id}`,
      executedAt: new Date().toISOString(),
      extractionMethod: "eval",
      knowledgeIdPrefix: `know_${sample.id}`,
    },
    extracted.fields.skills ?? ["communication"],
  );

  const kc002 = executor.executeKc002(
    {
      traceId: `trace_${sample.id}`,
      workspaceId: "ws_eval",
      candidateId: `candidate_${sample.id}`,
      resumeId: `resume_${sample.id}`,
      executedAt: new Date().toISOString(),
      extractionMethod: "eval",
      knowledgeIdPrefix: `know_${sample.id}`,
    },
    text,
  );

  const kc001Valid = validateAgainstContract("KC-001", kc001);
  const kc002Valid = validateAgainstContract("KC-002", kc002);

  if (!kc001Valid.valid) errors.push(...kc001Valid.errors);
  if (!kc002Valid.valid) errors.push(...kc002Valid.errors);

  if (errors.length === 0) {
    console.log(`✓ ${sample.id}`);
  } else {
    failed++;
    console.error(`✗ ${sample.id}`);
    for (const e of errors) console.error(`  - ${e}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
