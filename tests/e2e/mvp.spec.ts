import { expect, test } from "@playwright/test";

const initialGuide = {
  id: "guide-1",
  url: "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-900",
  title: "Study guide for Exam GH-900: GitHub Foundations",
  examCode: "GH-900",
  objectives: [
    { id: "obj-1", domain: "Basics", objective: "Describe repositories" },
    { id: "obj-2", domain: "Actions", objective: "Describe workflows" },
  ],
  sourceChunkCount: 4,
  questions: [
    {
      id: "q1",
      objectiveId: "obj-1",
      type: "multiple_choice",
      prompt: "Which answer best demonstrates this objective: Describe repositories?",
      choices: ["A correct statement about Describe repositories", "A billing detail"],
      citations: [
        {
          url: "https://learn.microsoft.com/en-us/actions",
          title: "GitHub Actions",
          headingPath: ["GitHub Actions"],
        },
      ],
      difficulty: "easy",
    },
    {
      id: "q2",
      objectiveId: "obj-2",
      type: "multiple_choice",
      prompt: "What is a GitHub Actions workflow?",
      choices: ["A configurable automated process", "A billing report"],
      citations: [
        {
          url: "https://learn.microsoft.com/en-us/actions",
          title: "GitHub Actions",
          headingPath: ["GitHub Actions", "Workflows"],
        },
      ],
      difficulty: "medium",
    },
  ],
  remediationPacks: [],
  flashcards: [
    {
      id: "card-1",
      objectiveId: "obj-2",
      front: "Active recall: Describe workflows",
      back: "A workflow is a configurable automated process.",
      citations: [
        {
          url: "https://learn.microsoft.com/en-us/actions",
          title: "GitHub Actions",
          headingPath: ["GitHub Actions", "Workflows"],
        },
      ],
      dueAt: "2026-05-31T12:00:00.000Z",
      intervalDays: 0,
      easeFactor: 2.5,
      repetitions: 0,
    },
  ],
  readiness: {
    overallScore: 0,
    domains: [
      { domain: "Basics", score: 0, correct: 0, total: 0 },
      { domain: "Actions", score: 0, correct: 0, total: 0 },
    ],
    weakObjectives: [],
    recommendation: "No attempt scored yet.",
  },
};

const scoredGuide = {
  ...initialGuide,
  remediationPacks: [
    {
      id: "pack-1",
      objectiveId: "obj-2",
      summary: "You missed Actions: Describe workflows.",
      lesson: "Re-study the cited Microsoft Learn section.",
      workedExample: "Example prompt: identify where workflows apply.",
      citations: initialGuide.questions[1].citations,
    },
  ],
  readiness: {
    overallScore: 50,
    domains: [
      { domain: "Basics", score: 100, correct: 1, total: 1 },
      { domain: "Actions", score: 0, correct: 0, total: 1 },
    ],
    weakObjectives: [
      {
        objectiveId: "obj-2",
        domain: "Actions",
        objective: "Describe workflows",
        score: 0,
      },
    ],
    recommendation: "Focus on Actions before taking the exam.",
  },
};

test("diagnoses gaps, shows remediation, and reviews a flashcard", async ({ page }) => {
  await page.route("**/api/guides", async (route) => {
    await route.fulfill({ json: { guide: initialGuide } });
  });
  await page.route("**/api/attempts", async (route) => {
    await route.fulfill({ json: { guide: scoredGuide } });
  });
  await page.route("**/api/flashcards/card-1/review", async (route) => {
    await route.fulfill({
      json: {
        guide: {
          ...scoredGuide,
          flashcards: [
            {
              ...scoredGuide.flashcards[0],
              intervalDays: 1,
              repetitions: 0,
              dueAt: "2026-06-01T12:00:00.000Z",
            },
          ],
        },
      },
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Analyze guide" }).click();
  await expect(page.getByText("GH-900: Study guide for Exam GH-900")).toBeVisible();

  await page.getByLabel("A correct statement about Describe repositories").check();
  await page.getByLabel("A billing report").check();
  await page.getByRole("button", { name: "Score practice test" }).click();

  await expect(page.getByRole("heading", { name: "Practice Test Results" })).toBeVisible();
  await expect(page.getByText("Retake practice test")).toBeVisible();
  await expect(page.getByText("What is a GitHub Actions workflow?")).not.toBeVisible();
  await expect(page.getByLabel("Practice test score 50%")).toBeVisible();
  await expect(page.getByText("You missed Actions: Describe workflows.")).toBeVisible();

  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(page.getByText("A workflow is a configurable automated process.")).toBeVisible();
  await page.getByRole("button", { name: "Forgot" }).click();
  await expect(page.getByText("interval 1 days")).toBeVisible();
});
