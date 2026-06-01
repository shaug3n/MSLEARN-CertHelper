import { describe, expect, it } from "vitest";

import {
  buildInitialSourceLinks,
  getSourceCoverage,
  isAllowedSourceUrl,
} from "./source-discovery";

describe("source discovery", () => {
  it("keeps study guide, Learn paths, Learn docs, and docs.github.com links only", () => {
    const links = buildInitialSourceLinks(
      "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-900",
      "Study guide for Exam GH-900",
      [
        {
          title: "GitHub Foundations Part 1",
          url: "https://learn.microsoft.com/en-us/training/paths/github-foundations/",
        },
        {
          title: "GitHub Actions docs",
          url: "https://docs.github.com/en/actions",
        },
        {
          title: "Ignored",
          url: "https://example.com/not-allowed",
        },
        {
          title: "GitHub Foundations Part 1 duplicate",
          url: "https://learn.microsoft.com/en-us/training/paths/github-foundations/",
        },
      ],
    );

    expect(links).toEqual([
      {
        title: "Study guide for Exam GH-900",
        url: "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-900",
        sourceType: "study-guide",
      },
      {
        title: "GitHub Foundations Part 1",
        url: "https://learn.microsoft.com/en-us/training/paths/github-foundations/",
        sourceType: "learn-path",
      },
      {
        title: "GitHub Actions docs",
        url: "https://docs.github.com/en/actions",
        sourceType: "external-doc",
      },
    ]);
  });

  it("rejects unsupported source hosts", () => {
    expect(isAllowedSourceUrl("https://docs.github.com/en/actions")).toBe(true);
    expect(isAllowedSourceUrl("https://learn.microsoft.com/en-us/training/modules/intro-to-git/")).toBe(
      true,
    );
    expect(isAllowedSourceUrl("https://example.com/actions")).toBe(false);
  });

  it("calculates source coverage from stored source page URLs", () => {
    expect(
      getSourceCoverage([
        "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-900",
        "https://learn.microsoft.com/en-us/training/paths/github-foundations/",
        "https://learn.microsoft.com/en-us/training/modules/intro-to-git/",
        "https://docs.github.com/en/actions",
      ]),
    ).toEqual({
      totalPages: 4,
      studyGuides: 1,
      learnPaths: 1,
      learnModules: 1,
      externalDocs: 1,
    });
  });
});
