import { describe, expect, it } from "vitest";
import { parseIntent } from "../../web/src/assistant/intent.js";

describe("D10 language-agnostic parseIntent", () => {
  const searchUtterances = [
    "Tìm Senior Java ở HCM dưới 60 triệu",
    "Tìm ứng viên Java senior lương dưới 60M",
    "Có ai Java HCM khoảng 50-60 triệu không?",
    "Find Senior Java in HCM under 60M",
    "Senior Java HCM <60M",
    "java hcm 60m",
    "Java HCM salary under 60m",
  ];

  it.each(searchUtterances)("maps to SEARCH_CANDIDATE: %s", (utterance) => {
    const p = parseIntent(utterance);
    expect(p.intent).toBe("SEARCH_CANDIDATE");
    expect(p.mode).toBe("Ask");
    expect(p.patternId).toBe("P-ASK-FIND");
    expect(p.search.skills).toContain("Java");
    if (/hcm/i.test(utterance)) {
      expect(p.search.location).toBe("HCM");
    }
    expect(p.search.salaryMaxM).toBeGreaterThanOrEqual(50);
    expect(p.filterLabels.length).toBeGreaterThan(0);
  });

  it("parses multiline natural JD brief as SEARCH_CANDIDATE", () => {
    const p = parseIntent(
      "Khách cần React lead.\nHCM.\nHybrid.\nTiếng Anh khá.\nKhoảng 70 triệu.\nCó ai không?",
    );
    expect(p.intent).toBe("SEARCH_CANDIDATE");
    expect(p.search.skills).toContain("React");
    expect(p.search.location).toBe("HCM");
    expect(p.search.workModel).toBe("hybrid");
    expect(p.search.salaryMaxM).toBe(70);
    expect(p.search.english).toMatch(/B2/);
  });

  it("parses shorthand react remote", () => {
    const p = parseIntent("react remote");
    expect(p.intent).toBe("SEARCH_CANDIDATE");
    expect(p.search.skills).toContain("React");
    expect(p.search.workModel).toBe("remote");
  });

  it("parses urgent golang", () => {
    const p = parseIntent("cần gấp golang");
    expect(p.intent).toBe("SEARCH_CANDIDATE");
    expect(p.search.skills).toContain("Golang");
    expect(p.search.priority).toBe("high");
  });

  const reviewUtterances = [
    "Review CV này",
    "Đánh giá CV này",
    "Xem CV này giúp tôi",
    "CV này ổn không?",
    "Review resume",
    "Analyze this CV",
    "Score this resume",
  ];

  it.each(reviewUtterances)("maps to ANALYZE_CV: %s", (utterance) => {
    const p = parseIntent(utterance);
    expect(p.intent).toBe("ANALYZE_CV");
    expect(p.mode).toBe("Analyze");
  });

  const matchUtterances = [
    "JD này có ai phù hợp không?",
    "Tìm người cho job này",
    "Match JD này",
    "Có CV nào hợp không?",
    "Find candidates for this JD",
  ];

  it.each(matchUtterances)("maps to MATCH_JOB: %s", (utterance) => {
    const p = parseIntent(utterance);
    expect(p.intent).toBe("MATCH_JOB");
  });

  it("maps create job to CREATE_JOB Act", () => {
    const p = parseIntent("Create Backend Job from this JD");
    expect(p.intent).toBe("CREATE_JOB");
    expect(p.mode).toBe("Act");
  });

  it("maps ingest workflow to Mixed", () => {
    const p = parseIntent("CV này được khách gửi. Review giúp. Nếu hợp thì tạo Candidate luôn.");
    expect(p.intent).toBe("INGEST_CV_WORKFLOW");
    expect(p.mode).toBe("Mixed");
  });
});
