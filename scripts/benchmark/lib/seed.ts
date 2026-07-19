import { Candidate } from "../../../src/modules/candidate/domain/candidate/candidate.js";
import { CandidateId } from "../../../src/modules/candidate/domain/candidate/candidate-id.js";
import { CandidateProfile } from "../../../src/modules/candidate/domain/candidate/candidate-profile.js";
import { CandidateRecord } from "../../../src/modules/candidate/domain/candidate/candidate-record.js";
import { VerifiedKnowledge } from "../../../src/modules/candidate/domain/knowledge/verified-knowledge.js";
import { EDITABLE_FIELDS } from "../../../src/modules/candidate/domain/knowledge/verified-knowledge.js";
import { Resume } from "../../../src/modules/candidate/domain/resume/resume.js";
import { ResumeId } from "../../../src/modules/candidate/domain/resume/resume-id.js";
import { ResumeMetadata } from "../../../src/modules/candidate/domain/resume/resume-metadata.js";
import { ResumeVersion } from "../../../src/modules/candidate/domain/resume/resume-version.js";
import { CandidateKnowledgeSet } from "../../../src/modules/knowledge/domain/candidate-knowledge-set.js";
import { KnowledgeObject } from "../../../src/modules/knowledge/domain/knowledge-object.js";
import type { AppDependencies } from "../../../src/app/server.js";
import type { Job } from "../../../src/modules/job/domain/types.js";

const nowIso = () => new Date().toISOString();

function makeReadyKnowledge(id: string, uploadedAt: string): VerifiedKnowledge {
  return VerifiedKnowledge.fromImport({
    summary: `Engineer ${id}`,
    skills: [
      { normalizedName: "TypeScript", confidence: 0.9 },
      { normalizedName: "React", confidence: 0.9 },
      { normalizedName: "Node", confidence: 0.85 },
    ],
    englishLevel: "B2",
    yearsOfExperience: 5,
    uploadedAt,
    importTraceId: `trace_${id}`,
    summaryProvenance: { source: "Resume", confidence: 0.8 },
    skillsProvenance: { source: "Resume", confidence: 0.8 },
    englishProvenance: { source: "Resume", confidence: 0.8 },
    yearsProvenance: { source: "Resume", confidence: 0.8 },
  }).markReady(uploadedAt, "recruiter_bench");
}

/**
 * Seed N ready candidates + resumes + knowledge sets (no import pipeline).
 * Used for insight / verify:data scale benchmarks.
 */
export async function seedCandidateDataset(
  deps: AppDependencies,
  count: number,
  workspaceId: string,
): Promise<string[]> {
  const repos = deps.repositories;
  const ids: string[] = [];
  const uploadedAt = nowIso();

  for (let i = 0; i < count; i++) {
    const candidateId = `candidate_bench_${String(i).padStart(6, "0")}`;
    const resumeId = `resume_bench_${String(i).padStart(6, "0")}`;
    const knowledge = makeReadyKnowledge(candidateId, uploadedAt);

    const candidate = Candidate.create({
      id: CandidateId.create(candidateId),
      workspaceId,
      profile: CandidateProfile.create({
        name: `Bench Candidate ${i}`,
        summary: knowledge.currentValue("summary"),
        skills: [],
        englishLevel: "B2",
      }),
      createdAt: uploadedAt,
    });

    const record = CandidateRecord.create({
      candidate,
      knowledge,
      resumeVersion: 1,
      resumeId,
    });

    const resume = Resume.create({
      id: ResumeId.create(resumeId),
      candidateId,
      workspaceId,
      version: ResumeVersion.initial(),
      storageRef: `${workspaceId}/${resumeId}/bench.docx`,
      metadata: ResumeMetadata.create({
        filename: `bench-${i}.docx`,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileSizeBytes: 2048,
        sourceType: "manual_upload",
        uploadedAt,
      }),
    });

    const objects = EDITABLE_FIELDS.map((field) => {
      const fk = knowledge.fields[field];
      return KnowledgeObject.createFromImport({
        id: `know_${candidateId}_${field}`,
        candidateId,
        workspaceId,
        field,
        originalValue: fk.originalAiValue,
        currentValue: fk.currentValue,
        initialConfidence: fk.provenance.confidence ?? 0.8,
        initialSource: fk.provenance.source,
        createdAt: uploadedAt,
        evidenceId: `evid_${candidateId}_${field}`,
      });
    });

    const set = CandidateKnowledgeSet.create({
      candidateId,
      workspaceId,
      objects,
    });

    await repos.resumeRepository.save(resume);
    await repos.candidateRepository.save(record);
    await repos.knowledgeRepository.save(set);
    ids.push(candidateId);
  }

  return ids;
}

export async function seedBenchmarkJob(
  deps: AppDependencies,
  workspaceId: string,
  jobId = "job_bench_main",
): Promise<Job> {
  const now = nowIso();
  const job: Job = {
    id: jobId,
    workspaceId,
    title: "Senior Software Engineer",
    company: "Bench Co",
    department: "Eng",
    employmentType: "full_time",
    location: "Remote",
    salaryMin: null,
    salaryMax: null,
    currency: "USD",
    experienceYears: 3,
    englishRequirement: "B2",
    skills: ["React", "TypeScript", "Node"],
    description: "Benchmark job",
    responsibilities: "",
    requirements: "",
    benefits: "",
    status: "Open",
    ready: true,
    submissionCount: 0,
    placementCount: 0,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: "recruiter_bench",
    rawJdText: "Senior Software Engineer TypeScript React Node",
  };
  await deps.repositories.jobRepository.save(job);
  return job;
}
