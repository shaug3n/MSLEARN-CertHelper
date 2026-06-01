import { expect, test } from "@playwright/test";

import type { GuideState } from "../../src/components/study/types";

const initialGuide: GuideState = {
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
  latestAttempt: null,
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

const scoredGuide: GuideState = {
  ...initialGuide,
  latestAttempt: {
    id: "attempt-1",
    overallScore: 50,
    answers: [
      {
        questionId: "q1",
        objectiveId: "obj-1",
        prompt: "Which answer best demonstrates this objective: Describe repositories?",
        choices: ["A correct statement about Describe repositories", "A billing detail"],
        selectedAnswer: "A correct statement about Describe repositories",
        correctAnswer: "A correct statement about Describe repositories",
        correct: true,
        feedback: "Correct.",
        citations: initialGuide.questions[0].citations,
        score: 1,
        maxScore: 1,
      },
      {
        questionId: "q2",
        objectiveId: "obj-2",
        prompt: "What is a GitHub Actions workflow?",
        choices: ["A configurable automated process", "A billing report"],
        selectedAnswer: "A billing report",
        correctAnswer: "A configurable automated process",
        correct: false,
        feedback: "Review the cited source and try again.",
        citations: initialGuide.questions[1].citations,
        score: 0,
        maxScore: 1,
      },
    ],
  },
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

test("shows an analysis loading card while the guide is being generated", async ({ page }) => {
  await page.route("**/api/session", async (route) => {
    await route.fulfill({
      json: { user: { id: "user-1", displayName: "Demo user e2e" } },
    });
  });
  await page.route("**/api/guides", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({ json: { guide: initialGuide } });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Analyze guide" }).click();

  await expect(page.getByRole("heading", { name: "Analyzing your study guide" })).toBeVisible();
  await expect(page.getByText("Building your practice workspace")).toBeVisible();
  await expect(page.getByText("Great engineers trust version control")).toBeVisible();

  await expect(page).toHaveURL(/\/guide\/guide-1\/practice$/);
});

test("diagnoses gaps, shows remediation, and reviews a flashcard", async ({ page }) => {
  let currentGuide: GuideState = initialGuide;

  await page.route("**/api/session", async (route) => {
    await route.fulfill({
      json: { user: { id: "user-1", displayName: "Demo user e2e" } },
    });
  });
  await page.route("**/api/guides", async (route) => {
    currentGuide = initialGuide;
    await route.fulfill({ json: { guide: initialGuide } });
  });
  await page.route("**/api/guides/guide-1", async (route) => {
    await route.fulfill({ json: { guide: currentGuide } });
  });
  await page.route("**/api/attempts", async (route) => {
    currentGuide = scoredGuide;
    await route.fulfill({ json: { guide: scoredGuide } });
  });
  await page.route("**/api/flashcards/card-1/review", async (route) => {
    currentGuide = {
      ...scoredGuide,
      flashcards: [
        {
          ...scoredGuide.flashcards[0],
          intervalDays: 1,
          repetitions: 0,
          dueAt: "2026-06-01T12:00:00.000Z",
        },
      ],
    };
    await route.fulfill({
      json: {
        guide: currentGuide,
      },
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Analyze guide" }).click();
  await expect(page).toHaveURL(/\/guide\/guide-1\/practice$/);
  await expect(
    page.getByRole("heading", { name: "Study guide for Exam GH-900: GitHub Foundations" }),
  ).toBeVisible();

  await page.getByLabel("A correct statement about Describe repositories").check();
  await page.getByRole("button", { name: /Actions/ }).click();
  await page.getByLabel("A billing report").check();
  await page.getByRole("button", { name: "Submit test" }).click();

  await expect(page).toHaveURL(/\/guide\/guide-1\/results$/);
  await expect(page.getByRole("heading", { name: "Practice Test Results" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Retake practice test" })).toBeVisible();
  await expect(page.getByText("Correct answer", { exact: true })).toBeVisible();
  await expect(page.getByText("A configurable automated process")).toBeVisible();
  await expect(page.getByText("What is a GitHub Actions workflow?")).toBeVisible();
  await expect(page.getByLabel("Practice test score 50%")).toBeVisible();
  await expect(page.getByText("You missed Actions: Describe workflows.")).toBeVisible();

  await page.getByRole("link", { name: "Study flashcards" }).click();
  await expect(page).toHaveURL(/\/guide\/guide-1\/flashcards$/);
  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(page.getByText("A workflow is a configurable automated process.")).toBeVisible();
  await page.getByRole("button", { name: "Forgot" }).click();
  await expect(page.getByLabel("Active flashcard interval 1 days")).toBeAttached();
});
