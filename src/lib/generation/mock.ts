import type { ObjectiveWithId } from "@/lib/analytics/readiness";
import type { Citation, GeneratedFlashcard, SourceChunk } from "@/lib/types";

import type { GeneratedAssessment } from "./schemas";

export const ASSESSMENT_QUESTION_COUNT = 50;

export type RemediationPackInput = {
  objectiveId: string;
  domain: string;
  objective: string;
  score: number;
};

export type GeneratedRemediationPack = {
  objectiveId: string;
  summary: string;
  lesson: string;
  workedExample: string;
  citations: Citation[];
};

export function buildMockAssessment(
  objectives: ObjectiveWithId[],
  chunks: SourceChunk[],
): GeneratedAssessment {
  const safeObjectives = objectives;
  const questions: GeneratedAssessment["questions"] = Array.from({
    length: ASSESSMENT_QUESTION_COUNT,
  }).map((_, index) => {
    const objective = safeObjectives[index % safeObjectives.length];
    const citation = pickCitation(chunks, index);

    return {
      objectiveId: objective.id,
      prompt: promptFor(objective.objective, index),
      citations: [citation],
      difficulty: index % 3 === 0 ? "easy" : index % 3 === 1 ? "medium" : "hard",
      type: "multiple_choice",
      choices: [
        `A correct statement about ${objective.objective}`,
        "An unrelated Microsoft licensing detail",
        "A deprecated service behavior",
        "A security setting that is not mentioned",
      ],
      answer: `A correct statement about ${objective.objective}`,
    };
  });

  const flashcards: GeneratedFlashcard[] = safeObjectives.map((objective, index) => ({
    objectiveId: objective.id,
    front: `Active recall: ${objective.objective}`,
    back: `State the key facts for ${objective.objective}, then compare with the cited source.`,
    citations: [pickCitation(chunks, index)],
  }));

  return { questions, flashcards };
}

export function buildRemediationPacks(
  _objectives: ObjectiveWithId[],
  weakObjectives: RemediationPackInput[],
  chunks: SourceChunk[],
): GeneratedRemediationPack[] {
  return weakObjectives.map((objective, index) => ({
    objectiveId: objective.objectiveId,
    summary: `You missed ${objective.domain}: ${objective.objective}.`,
    lesson:
      "Re-study the cited Microsoft Learn section, then explain the objective in your own words before looking back.",
    workedExample: `Example prompt: Given a real GitHub scenario, identify where ${objective.objective} applies and justify the next action.`,
    citations: [pickCitation(chunks, index)],
  }));
}

function promptFor(objective: string, index: number): string {
  return `Question ${index + 1}: Which answer best demonstrates this objective: ${objective}?`;
}

function pickCitation(chunks: SourceChunk[], index: number): Citation {
  const chunk = chunks[index % Math.max(chunks.length, 1)];
  if (!chunk) {
    return {
      url: "https://learn.microsoft.com/",
      title: "Microsoft Learn",
      headingPath: ["Microsoft Learn"],
    };
  }

  return {
    url: chunk.url,
    title: chunk.title,
    headingPath: chunk.headingPath.length ? chunk.headingPath : [chunk.title],
  };
}
