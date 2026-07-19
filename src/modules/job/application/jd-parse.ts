import type { Job, JobReviewField } from "../domain/types.js";

const ENGLISH_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "native", "fluent"];

const SKILL_KEYWORDS = [
  "javascript",
  "typescript",
  "react",
  "node",
  "nodejs",
  "python",
  "java",
  "sql",
  "aws",
  "docker",
  "kubernetes",
  "git",
  "agile",
  "vue",
  "angular",
  "go",
  "golang",
  "c#",
  ".net",
  "php",
  "ruby",
  "swift",
  "kotlin",
];

function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function sectionAfter(raw: string, labels: string[]): string {
  const lower = raw.toLowerCase();
  for (const label of labels) {
    const idx = lower.indexOf(label.toLowerCase());
    if (idx < 0) continue;
    const after = raw.slice(idx + label.length).replace(/^[:\s-]+/, "");
    const nextHeader = after.search(/\n\s*[A-Z][A-Za-z ]{2,30}\s*:/);
    return (nextHeader >= 0 ? after.slice(0, nextHeader) : after).trim().slice(0, 2000);
  }
  return "";
}

export type JdParsedFields = {
  title: string;
  company: string;
  location: string;
  skills: string[];
  experienceYears: number | null;
  englishRequirement: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  description: string;
};

export function extractJdFields(rawText: string): JdParsedFields {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const lower = rawText.toLowerCase();

  const title =
    lines.find((l) => /job title|position|role/i.test(l))?.replace(/^[^:]+:\s*/i, "") ??
    lines[0] ??
    "Untitled Job";

  const companyMatch = rawText.match(/(?:company|employer)\s*[:-]\s*(.+)/i);
  const company = companyMatch?.[1]?.trim().split("\n")[0] ?? "";

  const locationMatch = rawText.match(/(?:location|based in|office)\s*[:-]\s*(.+)/i);
  const location = locationMatch?.[1]?.trim().split("\n")[0] ?? "";

  const skills = unique(
    SKILL_KEYWORDS.filter((s) => lower.includes(s)).map((s) =>
      s === "nodejs" ? "Node" : s.charAt(0).toUpperCase() + s.slice(1),
    ),
  );

  const yearsMatch = rawText.match(/(\d{1,2})\+?\s*years?/i);
  const experienceYears = yearsMatch?.[1] ? Number(yearsMatch[1]) : null;

  let englishRequirement = "unknown";
  for (const level of ENGLISH_LEVELS) {
    if (new RegExp(`english[^\\n]{0,40}${level}`, "i").test(rawText) || lower.includes(level)) {
      if (/english/i.test(rawText) || ENGLISH_LEVELS.includes(level)) {
        englishRequirement = level.toUpperCase() === level ? level : level;
        break;
      }
    }
  }
  const engMatch = rawText.match(/english\s*:?\s*(A1|A2|B1|B2|C1|C2|fluent|native)/i);
  if (engMatch?.[1]) englishRequirement = engMatch[1];

  const salaryMatch = rawText.match(
    /(?:salary|compensation|pay)\s*:?\s*(?:USD|VND|\$)?\s*([\d,]+)\s*(?:-|to|–)\s*(?:USD|VND|\$)?\s*([\d,]+)/i,
  );
  const singleSalary = rawText.match(/(?:USD|VND|\$)\s*([\d,]+)/i);
  let salaryMin: number | null = null;
  let salaryMax: number | null = null;
  let currency = "USD";
  if (salaryMatch) {
    salaryMin = Number(salaryMatch[1]!.replace(/,/g, ""));
    salaryMax = Number(salaryMatch[2]!.replace(/,/g, ""));
  } else if (singleSalary) {
    salaryMin = Number(singleSalary[1]!.replace(/,/g, ""));
    salaryMax = salaryMin;
  }
  if (/vnd/i.test(rawText)) currency = "VND";

  const responsibilities = sectionAfter(rawText, [
    "Responsibilities",
    "What you will do",
    "Your role",
  ]);
  const requirements = sectionAfter(rawText, [
    "Requirements",
    "Qualifications",
    "What we look for",
  ]);
  const benefits = sectionAfter(rawText, ["Benefits", "What we offer", "Perks"]);

  return {
    title: title.slice(0, 120),
    company: company.slice(0, 120),
    location: location.slice(0, 120),
    skills,
    experienceYears,
    englishRequirement,
    salaryMin,
    salaryMax,
    currency,
    responsibilities,
    requirements,
    benefits,
    description: rawText.slice(0, 5000),
  };
}

export function jobFieldValue(job: Job, field: JobReviewField): string {
  switch (field) {
    case "title":
      return job.title;
    case "skills":
      return job.skills.join(", ");
    case "englishRequirement":
      return job.englishRequirement;
    case "experienceYears":
      return job.experienceYears == null ? "" : String(job.experienceYears);
    case "salary":
      if (job.salaryMin == null && job.salaryMax == null) return "";
      return `${job.currency} ${job.salaryMin ?? "?"} - ${job.salaryMax ?? "?"}`;
    case "responsibilities":
      return job.responsibilities;
    case "requirements":
      return job.requirements;
    case "benefits":
      return job.benefits;
    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }
}

export function applyJobFieldEdit(
  job: Job,
  field: JobReviewField,
  humanValue: string,
): Partial<Job> {
  switch (field) {
    case "title":
      return { title: humanValue.trim() };
    case "skills":
      return {
        skills: humanValue
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean),
      };
    case "englishRequirement":
      return { englishRequirement: humanValue.trim() };
    case "experienceYears": {
      const n = Number(humanValue.replace(/[^\d.]/g, ""));
      return { experienceYears: Number.isFinite(n) ? n : null };
    }
    case "salary": {
      const nums = [...humanValue.matchAll(/(\d[\d,]*)/g)].map((m) =>
        Number(m[1]!.replace(/,/g, "")),
      );
      const currency = /vnd/i.test(humanValue)
        ? "VND"
        : /usd|\$/i.test(humanValue)
          ? "USD"
          : job.currency;
      return {
        currency,
        salaryMin: nums[0] ?? null,
        salaryMax: nums[1] ?? nums[0] ?? null,
      };
    }
    case "responsibilities":
      return { responsibilities: humanValue };
    case "requirements":
      return { requirements: humanValue };
    case "benefits":
      return { benefits: humanValue };
    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }
}
