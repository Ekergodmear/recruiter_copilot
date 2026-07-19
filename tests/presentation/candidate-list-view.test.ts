import { describe, expect, it } from "vitest";
import {
  filterCandidateList,
  sortCandidateList,
  type CandidateListItem,
} from "../../src/modules/candidate/presentation/candidate-list-view.js";

function item(
  partial: Partial<CandidateListItem> & Pick<CandidateListItem, "candidateId" | "name">,
): CandidateListItem {
  return {
    ready: false,
    uploadedAt: "2026-01-01T00:00:00.000Z",
    readyAt: null,
    skillsPreview: "",
    english: "",
    currentTitle: "",
    company: "",
    experience: "",
    email: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("candidate-list-view", () => {
  it("filters by ready and search query (name/email)", () => {
    const items: CandidateListItem[] = [
      item({
        candidateId: "c1",
        name: "Ann",
        ready: false,
        skillsPreview: "React",
        english: "B2",
        email: "ann@example.com",
      }),
      item({
        candidateId: "c2",
        name: "Bob",
        ready: true,
        readyAt: "2026-01-02",
        skillsPreview: "Node",
        english: "C1",
        email: "bob@example.com",
      }),
    ];
    expect(filterCandidateList(items, { ready: false })).toHaveLength(1);
    expect(filterCandidateList(items, { ready: true })[0]!.name).toBe("Bob");
    expect(filterCandidateList(items, { q: "ann@" })).toHaveLength(1);
    expect(filterCandidateList(items, { q: "bob" })).toHaveLength(1);
    // skills are not a search dimension for EPIC-001
    expect(filterCandidateList(items, { q: "react" })).toHaveLength(0);
  });

  it("sorts by updated and created", () => {
    const items = [
      item({
        candidateId: "c1",
        name: "Old",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-03T00:00:00.000Z",
      }),
      item({
        candidateId: "c2",
        name: "New",
        createdAt: "2026-01-02T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      }),
    ];
    expect(sortCandidateList(items, "updated")[0]!.name).toBe("Old");
    expect(sortCandidateList(items, "created")[0]!.name).toBe("New");
  });
});
