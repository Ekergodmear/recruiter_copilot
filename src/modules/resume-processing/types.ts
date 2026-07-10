export type DocumentFormat = "pdf" | "docx" | "image" | "unknown";

export type DocumentDetectionResult = {
  format: DocumentFormat;
  mimeType: string;
  requiresOcr: boolean;
};

export type DeterministicFields = {
  candidateName?: string;
  email?: string;
  phone?: string;
  linkedInUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  currentPosition?: string;
  companyNames?: string[];
  employmentDates?: string[];
  education?: string[];
  skills?: string[];
  yearsOfExperience?: number;
  certificates?: string[];
  languages?: string[];
};

export type ParsedDocument = {
  rawText: string;
  format: DocumentFormat;
  ocrApplied: boolean;
  metadata: Record<string, string>;
};

export type RuleExtractionResult = {
  fields: DeterministicFields;
  extractedFieldNames: string[];
};

export type ResumeProcessingResult = {
  parsed: ParsedDocument;
  deterministic: RuleExtractionResult;
  knowledgeGaps: string[];
  llmInvoked: boolean;
  providerId?: string;
};
