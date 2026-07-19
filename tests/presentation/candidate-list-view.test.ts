import { describe, expect, it } from "vitest";
import {
  filterCandidateList,
  type CandidateListItem,
} from "../../src/modules/candidate/presentation/candidate-list-view.js";

describe("candidate-list-view", () => {
  it("filters by ready and search query", () => {
    const items: CandidateListItem[] = [
      {
        candidateId: "c1",
        name: "Ann",
        ready: false,
        uploadedAt: "2026-01-01",
        readyAt: null,
        skillsPreview: "React",
        english: "B2",
      },
      {
        candidateId: "c2",
        name: "Bob",
        ready: true,
        uploadedAt: "2026-01-01",
        readyAt: "2026-01-02",
        skillsPreview: "Node",
        english: "C1",
      },
    ];
    expect(filterCandidateList(items, { ready: false })).toHaveLength(1);
    expect(filterCandidateList(items, { ready: true })[0]!.name).toBe("Bob");
    expect(filterCandidateList(items, { q: "react" })).toHaveLength(1);
  });
});
