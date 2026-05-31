import { calculateReadiness, type ObjectiveWithId } from "@/lib/analytics/readiness";
import { gradeDeterministicQuestion } from "@/lib/assessment/grading";
import { prisma } from "@/lib/db";
import { balanceMultipleChoiceAnswerPositions } from "@/lib/generation/choices";
import { generateAssessment } from "@/lib/generation/openai";
import { buildRemediationPacks } from "@/lib/generation/mock";
import { chunkSourcePage, parseStudyGuideHtml } from "@/lib/ingestion/parser";
import { parseJson, stringifyJson } from "@/lib/json";
import { reviewFlashcard, type ReviewRating } from "@/lib/srs/sm2";
import type { Citation, GradedResult, SourceChunk } from "@/lib/types";

const MAX_LINKED_PAGES = 6;

type FetchHtml = (url: string) => Promise<string>;

export type SubmittedAnswers = Record<string, string | string[]>;

export async function analyzeStudyGuide(url: string, fetchHtml = fetchHtmlFromWeb) {
  assertLearnUrl(url);
  const guideHtml = await fetchHtml(url);
  const parsed = parseStudyGuideHtml(url, guideHtml);
  const sourcePages = await loadSourcePages(parsed.links, fetchHtml);
  if (sourcePages.length === 0) {
    sourcePages.push({ url, title: parsed.title, chunks: chunkSourcePage(url, guideHtml) });
  }

  await prisma.studyGuide.deleteMany({ where: { url } });

  const guide = await prisma.studyGuide.create({
    data: {
      url,
      title: parsed.title,
      examCode: parsed.examCode,
      objectives: {
        create: parsed.objectives.map((objective) => ({
          domain: objective.domain,
          text: objective.objective,
          weightMin: objective.weightMin,
          weightMax: objective.weightMax,
        })),
      },
    },
    include: { objectives: true },
  });

  const objectiveInputs: ObjectiveWithId[] = guide.objectives.map((objective) => ({
    id: objective.id,
    domain: objective.domain,
    objective: objective.text,
    weightMin: objective.weightMin ?? undefined,
    weightMax: objective.weightMax ?? undefined,
  }));

  const storedChunks: SourceChunk[] = [];
  for (const page of sourcePages) {
    const storedPage = await prisma.sourcePage.create({
      data: { guideId: guide.id, url: page.url, title: page.title },
    });
    for (const chunk of page.chunks) {
      storedChunks.push(chunk);
      await prisma.sourceChunk.create({
        data: {
          guideId: guide.id,
          sourcePageId: storedPage.id,
          url: chunk.url,
          title: chunk.title,
          headingPathJson: stringifyJson(chunk.headingPath),
          content: chunk.content,
        },
      });
    }
  }

  const assessment = await generateAssessment(objectiveInputs, storedChunks);
  const balancedQuestions = balanceMultipleChoiceAnswerPositions(assessment.questions);
  await prisma.question.createMany({
    data: balancedQuestions.map((question) => ({
      guideId: guide.id,
      objectiveId: question.objectiveId,
      type: question.type,
      prompt: question.prompt,
      choicesJson: stringifyJson("choices" in question ? question.choices : null),
      answerJson: stringifyJson("answer" in question ? question.answer : null),
      expectedAnswer: "expectedAnswer" in question ? question.expectedAnswer : null,
      rubric: "rubric" in question ? question.rubric : null,
      citationsJson: stringifyJson(question.citations),
      difficulty: question.difficulty,
      points: question.type === "ordering" ? 2 : 1,
    })),
  });
  await prisma.flashcard.createMany({
    data: assessment.flashcards.map((card) => ({
      guideId: guide.id,
      objectiveId: card.objectiveId,
      front: card.front,
      back: card.back,
      citationsJson: stringifyJson(card.citations),
    })),
  });

  return getGuideState(guide.id);
}

export async function getGuideState(guideId: string) {
  const guide = await prisma.studyGuide.findUniqueOrThrow({
    where: { id: guideId },
    include: {
      objectives: true,
      sourceChunks: true,
      questions: true,
      remediationPacks: true,
      flashcards: { orderBy: { dueAt: "asc" } },
      attempts: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { answers: true },
      },
    },
  });

  const objectives = guide.objectives.map((objective) => ({
    id: objective.id,
    domain: objective.domain,
    objective: objective.text,
    weightMin: objective.weightMin ?? undefined,
    weightMax: objective.weightMax ?? undefined,
  }));
  const latestAnswers = guide.attempts[0]?.answers ?? [];
  const answersByQuestionId = new Map(
    latestAnswers.map((answer) => [answer.questionId, answer]),
  );
  const readiness = calculateReadiness(
    objectives,
    latestAnswers.map((answer) => ({
      objectiveId: answer.objectiveId,
      score: answer.score,
      maxScore: answer.maxScore,
    })),
  );

  return {
    id: guide.id,
    url: guide.url,
    title: guide.title,
    examCode: guide.examCode,
    objectives,
    sourceChunkCount: guide.sourceChunks.length,
    questions: guide.questions.map((question) => ({
      id: question.id,
      objectiveId: question.objectiveId,
      type: question.type,
      prompt: question.prompt,
      choices: parseJson<string[] | null>(question.choicesJson, null),
      citations: parseJson<Citation[]>(question.citationsJson, []),
      difficulty: question.difficulty,
    })),
    latestAttempt: guide.attempts[0]
      ? {
          id: guide.attempts[0].id,
          overallScore: guide.attempts[0].overallScore,
          answers: guide.questions.map((question) => {
            const answer = answersByQuestionId.get(question.id);
            return {
              questionId: question.id,
              objectiveId: question.objectiveId,
              prompt: question.prompt,
              choices: parseJson<string[] | null>(question.choicesJson, null),
              selectedAnswer: parseJson<string | string[]>(answer?.answerJson, ""),
              correctAnswer: parseJson<string | string[]>(question.answerJson, ""),
              correct: answer?.correct ?? false,
              feedback: answer?.feedback ?? "Question was not answered.",
              citations: parseJson<Citation[]>(question.citationsJson, []),
              score: answer?.score ?? 0,
              maxScore: answer?.maxScore ?? question.points,
            };
          }),
        }
      : null,
    remediationPacks: guide.remediationPacks.map((pack) => ({
      id: pack.id,
      objectiveId: pack.objectiveId,
      summary: pack.summary,
      lesson: pack.lesson,
      workedExample: pack.workedExample,
      citations: parseJson<Citation[]>(pack.citationsJson, []),
    })),
    flashcards: guide.flashcards.map((card) => ({
      id: card.id,
      objectiveId: card.objectiveId,
      front: card.front,
      back: card.back,
      citations: parseJson<Citation[]>(card.citationsJson, []),
      dueAt: card.dueAt.toISOString(),
      intervalDays: card.intervalDays,
      easeFactor: card.easeFactor,
      repetitions: card.repetitions,
    })),
    readiness,
  };
}

export async function submitAttempt(guideId: string, answers: SubmittedAnswers) {
  const guide = await prisma.studyGuide.findUniqueOrThrow({
    where: { id: guideId },
    include: { objectives: true, questions: true, sourceChunks: true },
  });

  const graded = guide.questions.map((question) =>
    gradeQuestion(
      {
        id: question.id,
        type: question.type,
        objectiveId: question.objectiveId,
        answer: parseJson<string | string[]>(question.answerJson, ""),
        points: question.points,
        expectedAnswer: question.expectedAnswer,
      },
      answers[question.id] ?? "",
    ),
  );
  const overallScore =
    graded.reduce((total, result) => total + result.score, 0) /
    Math.max(graded.reduce((total, result) => total + result.maxScore, 0), 1);

  await prisma.attempt.create({
    data: {
      guideId,
      overallScore: Math.round(overallScore * 100),
      answers: {
        create: graded.map((result) => ({
          questionId: result.questionId,
          objectiveId: result.objectiveId,
          answerJson: stringifyJson(answers[result.questionId] ?? ""),
          score: result.score,
          maxScore: result.maxScore,
          correct: result.correct,
          feedback: result.feedback,
        })),
      },
    },
  });

  const objectives = guide.objectives.map((objective) => ({
    id: objective.id,
    domain: objective.domain,
    objective: objective.text,
  }));
  const readiness = calculateReadiness(objectives, graded);
  const chunks = guide.sourceChunks.map((chunk) => ({
    url: chunk.url,
    title: chunk.title,
    headingPath: parseJson<string[]>(chunk.headingPathJson, [chunk.title]),
    content: chunk.content,
  }));
  const packs = buildRemediationPacks(objectives, readiness.weakObjectives, chunks);
  await prisma.remediationPack.deleteMany({ where: { guideId } });
  await prisma.remediationPack.createMany({
    data: packs.map((pack) => ({
      guideId,
      objectiveId: pack.objectiveId,
      summary: pack.summary,
      lesson: pack.lesson,
      workedExample: pack.workedExample,
      citationsJson: stringifyJson(pack.citations),
    })),
  });

  return getGuideState(guideId);
}

export async function reviewDueFlashcard(flashcardId: string, rating: ReviewRating) {
  const card = await prisma.flashcard.findUniqueOrThrow({ where: { id: flashcardId } });
  const next = reviewFlashcard(
    {
      intervalDays: card.intervalDays,
      easeFactor: card.easeFactor,
      repetitions: card.repetitions,
    },
    rating,
  );

  await prisma.flashcard.update({
    where: { id: flashcardId },
    data: {
      intervalDays: next.intervalDays,
      easeFactor: next.easeFactor,
      repetitions: next.repetitions,
      dueAt: next.dueAt,
      reviews: {
        create: {
          rating,
          previousIntervalDays: card.intervalDays,
          nextIntervalDays: next.intervalDays,
        },
      },
    },
  });

  return getGuideState(card.guideId);
}

async function loadSourcePages(
  links: Array<{ title: string; url: string }>,
  fetchHtml: FetchHtml,
) {
  const pages: Array<{ title: string; url: string; chunks: SourceChunk[] }> = [];

  for (const link of links.slice(0, MAX_LINKED_PAGES)) {
    try {
      const html = await fetchHtml(link.url);
      const chunks = chunkSourcePage(link.url, html);
      if (chunks.length > 0) {
        pages.push({ title: chunks[0].title || link.title, url: link.url, chunks });
      }
    } catch {
      continue;
    }
  }

  return pages;
}

async function fetchHtmlFromWeb(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "MS Certification Helper MVP" },
  });
  if (!response.ok) {
    throw new Error(`Could not fetch ${url}: ${response.status}`);
  }
  return response.text();
}

function assertLearnUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.hostname !== "learn.microsoft.com") {
    throw new Error("Only learn.microsoft.com study-guide URLs are supported in the MVP.");
  }
}

function gradeQuestion(
  question: {
    id: string;
    type: string;
    objectiveId: string;
    answer: string | string[];
    points: number;
    expectedAnswer?: string | null;
  },
  answer: string | string[],
): GradedResult {
  if (question.type === "multiple_choice" || question.type === "ordering") {
    return gradeDeterministicQuestion(
      {
        id: question.id,
        type: question.type,
        objectiveId: question.objectiveId,
        answer: question.answer,
        points: question.points,
      },
      answer,
    );
  }

  const answerText = Array.isArray(answer) ? answer.join(" ") : answer;
  const expectedTokens = (question.expectedAnswer ?? "")
    .toLowerCase()
    .split(/\W+/)
    .filter((token) => token.length > 4);
  const matches = expectedTokens.filter((token) => answerText.toLowerCase().includes(token));
  const score = expectedTokens.length === 0 ? 0 : matches.length / expectedTokens.length;
  const normalizedScore = score >= 0.45 ? question.points : 0;

  return {
    questionId: question.id,
    objectiveId: question.objectiveId,
    score: normalizedScore,
    maxScore: question.points,
    correct: normalizedScore === question.points,
    feedback:
      normalizedScore === question.points
        ? "Answer covers the expected concepts."
        : "Add more precise detail from the cited Microsoft Learn source.",
  };
}
