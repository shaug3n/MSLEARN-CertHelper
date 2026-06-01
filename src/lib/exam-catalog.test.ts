import { describe, expect, it } from "vitest";

import { EXAM_TECH_FILTERS, buildStudyGuideUrl, examCatalog } from "./exam-catalog";

describe("examCatalog", () => {
  it("builds Microsoft Learn study-guide URLs from exam codes", () => {
    expect(buildStudyGuideUrl("GH-900")).toBe(
      "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-900",
    );
    expect(buildStudyGuideUrl("SC-200")).toBe(
      "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/sc-200",
    );
  });

  it("maps catalog entries into tech filters by exam prefix", () => {
    const scFilter = EXAM_TECH_FILTERS.find((filter) => filter.prefix === "SC");
    const ghExam = examCatalog.find((exam) => exam.code === "GH-900");

    expect(scFilter?.label).toBe("Security");
    expect(ghExam?.technology).toBe("GitHub");
  });

  it("contains the provided certifications as selectable entries", () => {
    expect(examCatalog.some((exam) => exam.code === "AZ-104")).toBe(true);
    expect(examCatalog.some((exam) => exam.code === "MS-102")).toBe(true);
    expect(examCatalog.some((exam) => exam.code === "PL-900")).toBe(true);
  });
});
