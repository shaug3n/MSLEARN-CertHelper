import type { ObjectiveWithId } from "@/lib/analytics/readiness";
import { rankSourceChunksForObjectives } from "@/lib/ingestion/source-ranking";
import type { SourceChunk } from "@/lib/types";
import { z } from "zod";

import {
  ASSESSMENT_QUESTION_COUNT,
  buildMockAssessment,
  buildMockFlashcards,
} from "./mock";
import {
  GeneratedAssessmentSchema,
  type GeneratedAssessment,
} from "./schemas";

export { ASSESSMENT_QUESTION_COUNT } from "./mock";

export const OPENAI_ASSESSMENT_SYSTEM_PROMPT =
  "Generate Microsoft certification practice questions. Create exactly 50 multiple-choice practice test questions. Every question must map to one objectiveId and include at least one citation from the provided source chunks. Each question must have four plausible answer choices, exactly one correct answer, and no true/false questions.";
export const OPENAI_FLASHCARDS_SYSTEM_PROMPT =
  "Generate concise, high-value spaced-repetition flashcards for Microsoft certification study. Every flashcard must map to one objectiveId, cite at least one source chunk, and focus on facts worth active recall.";

const MAX_SOURCE_CHUNKS_FOR_OPENAI = 16;
const MAX_SOURCE_CHUNK_CONTENT_LENGTH = 480;
const MAX_OPENAI_OUTPUT_TOKENS = 8000;
const OPENAI_REQUEST_TIMEOUT_MS = 90_000;

export async function generateAssessment(
  objectives: ObjectiveWithId[],
  chunks: SourceChunk[],
): Promise<GeneratedAssessment> {
  if (!process.env.OPENAI_API_KEY) {
    return buildMockAssessment(objectives, chunks);
  }

  const sourceChunks = compactSourceChunks(selectChunksForOpenAi(objectives, chunks));
  const response = await sendOpenAiRequest(buildOpenAiRequestPayload(objectives, chunks));
  if (!response) return buildMockAssessment(objectives, chunks);

  const text = await extractOpenAiText(response);
  if (!text) {
    console.error("OpenAI response did not include structured output text; using fallback.");
    return buildMockAssessment(objectives, chunks);
  }

  try {
    return normalizeOpenAiAssessment(JSON.parse(text), sourceChunks);
  } catch (error) {
    console.error("OpenAI response could not be normalized; using fallback.", error);
    return buildMockAssessment(objectives, chunks);
  }
}

export async function generateFlashcards(
  objectives: ObjectiveWithId[],
  chunks: SourceChunk[],
) {
  if (!process.env.OPENAI_API_KEY) {
    return buildMockFlashcards(objectives, chunks);
  }

  const sourceChunks = compactSourceChunks(selectChunksForOpenAi(objectives, chunks));
  const response = await sendOpenAiRequest(
    buildOpenAiFlashcardRequestPayload(objectives, chunks),
  );
  if (!response) return buildMockFlashcards(objectives, chunks);

  const text = await extractOpenAiText(response);
  if (!text) {
    console.error("OpenAI flashcard response did not include structured output text; using fallback.");
    return buildMockFlashcards(objectives, chunks);
  }

  try {
    const raw = FlashcardResponseSchema.parse(JSON.parse(text));
    return raw.flashcards.map((card) => ({
      objectiveId: card.objectiveId,
      front: card.front,
      back: card.back,
      citations: mapSourceChunkIdsToCitations(card.sourceChunkIds, sourceChunks),
    }));
  } catch (error) {
    console.error("OpenAI flashcards could not be normalized; using fallback.", error);
    return buildMockFlashcards(objectives, chunks);
  }
}

export function normalizeOpenAiAssessment(
  payload: unknown,
  sourceChunks: CompactSourceChunk[],
): GeneratedAssessment {
  const raw = AssessmentQuestionResponseSchema.parse(payload);
  return GeneratedAssessmentSchema.parse({
    questions: raw.questions.map((question) => ({
      type: question.type,
      objectiveId: question.objectiveId,
      prompt: question.prompt,
      choices: question.choices,
      answer: question.answer,
      citations: mapSourceChunkIdsToCitations(question.sourceChunkIds, sourceChunks),
      difficulty: question.difficulty,
    })),
    flashcards: [],
  });
}

export function buildOpenAiRequestPayload(
  objectives: ObjectiveWithId[],
  chunks: SourceChunk[],
) {
  const sourceChunks = compactSourceChunks(selectChunksForOpenAi(objectives, chunks));
  return {
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    max_output_tokens: MAX_OPENAI_OUTPUT_TOKENS,
    input: [
      {
        role: "system",
        content: OPENAI_ASSESSMENT_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: JSON.stringify({
          questionCount: ASSESSMENT_QUESTION_COUNT,
          objectives,
          sourceChunks,
          requiredQuestionTypes: ["multiple_choice"],
          distribution:
            "Spread questions across all objectives. If there are fewer than 50 objectives, create multiple distinct questions per objective.",
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "generated_assessment_questions",
        strict: true,
        schema: buildOpenAiResponseSchema(),
      },
    },
  };
}

export function buildOpenAiFlashcardRequestPayload(
  objectives: ObjectiveWithId[],
  chunks: SourceChunk[],
) {
  const sourceChunks = compactSourceChunks(selectChunksForOpenAi(objectives, chunks));
  return {
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    max_output_tokens: 4000,
    input: [
      {
        role: "system",
        content: OPENAI_FLASHCARDS_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: JSON.stringify({
          objectiveCount: objectives.length,
          objectives,
          sourceChunks,
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "generated_flashcards",
        strict: true,
        schema: buildFlashcardResponseSchema(),
      },
    },
  };
}

function compactSourceChunks(chunks: SourceChunk[]) {
  return chunks.slice(0, MAX_SOURCE_CHUNKS_FOR_OPENAI).map((chunk, index) => ({
    id: `chunk-${index + 1}`,
    ...chunk,
    content: chunk.content.slice(0, MAX_SOURCE_CHUNK_CONTENT_LENGTH).trim(),
  }));
}

function selectChunksForOpenAi(objectives: ObjectiveWithId[], chunks: SourceChunk[]) {
  return rankSourceChunksForObjectives(objectives, chunks, {
    maxChunks: MAX_SOURCE_CHUNKS_FOR_OPENAI,
    chunksPerObjective: 3,
  });
}

type CompactSourceChunk = {
  id: string;
  url: string;
  title: string;
  headingPath: string[];
  content: string;
};

function mapSourceChunkIdsToCitations(
  sourceChunkIds: string[],
  sourceChunks: CompactSourceChunk[],
) {
  const chunkMap = new Map(sourceChunks.map((chunk) => [chunk.id, chunk] as const));
  const citations = sourceChunkIds
    .map((id) => chunkMap.get(id))
    .filter((chunk): chunk is CompactSourceChunk => Boolean(chunk))
    .map(({ url, title, headingPath }) => ({ url, title, headingPath }));

  if (citations.length === 0) {
    throw new Error("OpenAI response referenced source chunks that were not provided.");
  }

  return citations;
}

async function sendOpenAiRequest(payload: unknown) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_REQUEST_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("OpenAI generation timed out; falling back to deterministic output.");
      return null;
    }
    console.error("OpenAI request failed; falling back to deterministic output.", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const responseText = await response.text();
    if (response.status >= 500 || response.status === 429) {
      console.error(
        `OpenAI returned ${response.status}; falling back to deterministic output.`,
        responseText,
      );
      return null;
    }
    throw new Error(`OpenAI generation failed: ${response.status} ${responseText}`);
  }

  return response;
}

async function extractOpenAiText(response: Response) {
  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string | { value?: string } }> }>;
  };

  return (
    payload.output_text ??
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((item) => (typeof item.text === "string" ? item.text : item.text?.value))
      .find((text): text is string => Boolean(text))
  );
}

export function buildOpenAiResponseSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["questions"],
    properties: {
      questions: {
        type: "array",
        minItems: ASSESSMENT_QUESTION_COUNT,
        maxItems: ASSESSMENT_QUESTION_COUNT,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "type",
            "objectiveId",
            "prompt",
            "choices",
            "answer",
            "sourceChunkIds",
            "difficulty",
          ],
          properties: {
            type: { enum: ["multiple_choice"] },
            objectiveId: { type: "string" },
            prompt: { type: "string" },
            choices: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: { type: "string" },
            },
            answer: { type: "string" },
            sourceChunkIds: {
              type: "array",
              minItems: 1,
              items: { type: "string" },
            },
            difficulty: { enum: ["easy", "medium", "hard"] },
          },
        },
      },
    },
  };
}

function buildFlashcardResponseSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["flashcards"],
    properties: {
      flashcards: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["objectiveId", "front", "back", "sourceChunkIds"],
          properties: {
            objectiveId: { type: "string" },
            front: { type: "string" },
            back: { type: "string" },
            sourceChunkIds: {
              type: "array",
              minItems: 1,
              items: { type: "string" },
            },
          },
        },
      },
    },
  };
}

const OpenAiQuestionSchema = z.object({
  type: z.enum(["multiple_choice"]),
  objectiveId: z.string().min(1),
  prompt: z.string().min(1),
  choices: z.array(z.string()),
  answer: z.string(),
  sourceChunkIds: z.array(z.string().min(1)).min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

const AssessmentQuestionResponseSchema = z.object({
  questions: z.array(OpenAiQuestionSchema).min(1),
});

const FlashcardResponseSchema = z.object({
  flashcards: z.array(
    z.object({
      objectiveId: z.string().min(1),
      front: z.string().min(1),
      back: z.string().min(1),
      sourceChunkIds: z.array(z.string().min(1)).min(1),
    }),
  ),
});
