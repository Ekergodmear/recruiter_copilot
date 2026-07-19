import { describe, expect, it } from "vitest";
import { formatIntegrityReport, runVerifyData } from "../../scripts/verify-data.js";
import type { DataIntegrityReport } from "../../src/modules/operations/founder-readiness/types.js";

describe("verify:data CLI", () => {
  it("returns exit-ready report with no errors on empty workspace", async () => {
    const report = await runVerifyData();
    expect(report.errorCount).toBe(0);
    const text = formatIntegrityReport(report);
    expect(text).toContain("✔ Candidates");
    expect(text).toContain("Errors: 0");
  });

  it("formats warnings distinctly", () => {
    const report: DataIntegrityReport = {
      sections: [
        {
          name: "Duplicate Fingerprints",
          ok: true,
          warnings: 2,
          errors: 0,
          notes: ["Fingerprint a shared by 2 candidates"],
        },
      ],
      findings: [],
      errorCount: 0,
      warningCount: 2,
    };
    const text = formatIntegrityReport(report);
    expect(text).toContain("⚠ Duplicate Fingerprints");
    expect(text).toContain("Warnings: 2");
  });
});
