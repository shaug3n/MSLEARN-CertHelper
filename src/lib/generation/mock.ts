import type { ObjectiveWithId } from "@/lib/analytics/readiness";
import type { Citation, GeneratedFlashcard, SourceChunk } from "@/lib/types";

import type { GeneratedAssessment } from "./schemas";

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
  const safeObjectives = objectives.slice(0, 8);
  const questions: GeneratedAssessment["questions"] = safeObjectives.map((objective, index) => {
    const citation = pickCitation(chunks, index);
    const base = {
      objectiveId: objective.id,
      prompt: promptFor(objective.objective),
      citations: [citation],
      difficulty: index % 3 === 0 ? "easy" : index % 3 === 1 ? "medium" : "hard",
    } satisfies Pick<
      GeneratedAssessment["questions"][number],
      "objectiveId" | "prompt" | "citations" | "difficulty"
    >;

    if (index % 4 === 0) {
      return {
        ...base,
        type: "multiple_choice",
        choices: [
          `A correct statement about ${objective.objective}`,
          "An unrelated Microsoft licensing detail",
          "A deprecated service behavior",
          "A security setting that is not mentioned",
        ],
        answer: `A correct statement about ${objective.objective}`,
      };
    }

    if (index % 4 === 1) {
      return {
        ...base,
        type: "short_answer",
        expectedAnswer: `Explain ${objective.objective} using the cited Microsoft Learn source.`,
        rubric: "Full credit requires a correct definition plus one concrete scenario.",
      };
    }

    if (index % 4 === 2) {
      return {
        ...base,
        type: "code",
        expectedAnswer: "Use the exact command or configuration shape from the cited source.",
        rubric: "Full credit requires correct syntax and correct purpose.",
      };
    }

    return {
      ...base,
      type: "ordering",
      choices: ["Identify the requirement", "Choose the matching feature", "Validate the outcome"],
      answer: ["Identify the requirement", "Choose the matching feature", "Validate the outcome"],
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

function promptFor(objective: string): string {
  return `Which answer best demonstrates this objective: ${objective}?`;
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
