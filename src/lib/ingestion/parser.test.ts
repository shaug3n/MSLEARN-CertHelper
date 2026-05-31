import { describe, expect, it } from "vitest";

import { chunkSourcePage, parseStudyGuideHtml } from "./parser";

const guideHtml = `
  <html>
    <head><title>Study guide for Exam GH-900: GitHub Foundations</title></head>
    <body>
      <main>
        <h1>Study guide for Exam GH-900: GitHub Foundations</h1>
        <h2>Skills measured</h2>
        <h3>Describe GitHub basics (30-35%)</h3>
        <ul>
          <li>Describe repositories</li>
          <li>Describe issues and pull requests</li>
        </ul>
        <h3>Describe GitHub Actions (20-25%)</h3>
        <ul>
          <li>Describe workflows and jobs</li>
        </ul>
        <a href="/en-us/actions/learn-github-actions/understanding-github-actions">GitHub Actions docs</a>
      </main>
    </body>
  </html>
`;

const sourceHtml = `
  <html>
    <head><title>Understanding GitHub Actions</title></head>
    <body>
      <main>
        <h1>Understanding GitHub Actions</h1>
        <p>GitHub Actions is a continuous integration and continuous delivery platform.</p>
        <h2>Workflows</h2>
        <p>A workflow is a configurable automated process that runs one or more jobs.</p>
        <h3>Jobs</h3>
        <p>A job is a set of steps in a workflow that execute on the same runner.</p>
      </main>
    </body>
  </html>
`;

describe("parseStudyGuideHtml", () => {
  it("extracts exam metadata, weighted objectives, and Learn links", () => {
    const guide = parseStudyGuideHtml(
      "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-900",
      guideHtml,
    );

    expect(guide.examCode).toBe("GH-900");
    expect(guide.title).toBe("Study guide for Exam GH-900: GitHub Foundations");
    expect(guide.objectives).toEqual([
      {
        domain: "Describe GitHub basics",
        objective: "Describe repositories",
        weightMin: 30,
        weightMax: 35,
      },
      {
        domain: "Describe GitHub basics",
        objective: "Describe issues and pull requests",
        weightMin: 30,
        weightMax: 35,
      },
      {
        domain: "Describe GitHub Actions",
        objective: "Describe workflows and jobs",
        weightMin: 20,
        weightMax: 25,
      },
    ]);
    expect(guide.links).toEqual([
      {
        title: "GitHub Actions docs",
        url: "https://learn.microsoft.com/en-us/actions/learn-github-actions/understanding-github-actions",
      },
    ]);
  });
});

describe("chunkSourcePage", () => {
  it("keeps citation metadata with heading paths", () => {
    const chunks = chunkSourcePage(
      "https://learn.microsoft.com/en-us/actions/learn-github-actions/understanding-github-actions",
      sourceHtml,
      120,
    );

    expect(chunks).toEqual([
      {
        url: "https://learn.microsoft.com/en-us/actions/learn-github-actions/understanding-github-actions",
        title: "Understanding GitHub Actions",
        headingPath: ["Understanding GitHub Actions"],
        content:
          "GitHub Actions is a continuous integration and continuous delivery platform.",
      },
      {
        url: "https://learn.microsoft.com/en-us/actions/learn-github-actions/understanding-github-actions",
        title: "Understanding GitHub Actions",
        headingPath: ["Understanding GitHub Actions", "Workflows"],
        content:
          "A workflow is a configurable automated process that runs one or more jobs.",
      },
      {
        url: "https://learn.microsoft.com/en-us/actions/learn-github-actions/understanding-github-actions",
        title: "Understanding GitHub Actions",
        headingPath: ["Understanding GitHub Actions", "Workflows", "Jobs"],
        content:
          "A job is a set of steps in a workflow that execute on the same runner.",
      },
    ]);
  });
});
