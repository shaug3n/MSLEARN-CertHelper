import { describe, expect, it } from "vitest";

import type { ObjectiveWithId } from "@/lib/analytics/readiness";
import type { SourceChunk } from "@/lib/types";

import { rankSourceChunksForObjectives } from "./source-ranking";

const objectives: ObjectiveWithId[] = [
  {
    id: "obj-actions",
    domain: "Automation and AI tools",
    objective: "Describe the purpose and capabilities of GitHub Actions",
  },
  {
    id: "obj-projects",
    domain: "Project Tracking and organization",
    objective: "Describe GitHub Projects and layout options",
  },
];

const chunks: SourceChunk[] = [
  {
    url: "https://learn.microsoft.com/en-us/training/modules/manage-work-github-projects/",
    title: "Manage your work with GitHub Projects",
    headingPath: ["GitHub Projects", "Layouts"],
    content: "GitHub Projects support table, board, and roadmap layouts for tracking work.",
  },
  {
    url: "https://learn.microsoft.com/en-us/training/modules/code-with-github-codespaces/",
    title: "Code with GitHub Codespaces",
    headingPath: ["Codespaces"],
    content: "Codespaces provides cloud-hosted development environments.",
  },
  {
    url: "https://docs.github.com/en/actions",
    title: "GitHub Actions documentation",
    headingPath: ["GitHub Actions"],
    content: "GitHub Actions automates build, test, and deployment workflows.",
  },
];

describe("rankSourceChunksForObjectives", () => {
  it("selects objective-relevant chunks instead of taking the first chunks globally", () => {
    const selected = rankSourceChunksForObjectives(objectives, chunks, {
      maxChunks: 2,
      chunksPerObjective: 1,
    });

    expect(selected.map((chunk) => chunk.url)).toEqual([
      "https://docs.github.com/en/actions",
      "https://learn.microsoft.com/en-us/training/modules/manage-work-github-projects/",
    ]);
  });
});
