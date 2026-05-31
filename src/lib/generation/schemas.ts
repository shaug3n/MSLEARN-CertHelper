import { z } from "zod";

export const CitationSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  headingPath: z.array(z.string().min(1)).min(1),
});

const QuestionBaseSchema = z.object({
  objectiveId: z.string().min(1),
  prompt: z.string().min(1),
  citations: z.array(CitationSchema).min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export const GeneratedQuestionSchema = z.discriminatedUnion("type", [
  QuestionBaseSchema.extend({
    type: z.literal("multiple_choice"),
    choices: z.array(z.string().min(1)).min(2),
    answer: z.string().min(1),
  }),
  QuestionBaseSchema.extend({
    type: z.literal("short_answer"),
    expectedAnswer: z.string().min(1),
    rubric: z.string().min(1),
  }),
  QuestionBaseSchema.extend({
    type: z.literal("code"),
    expectedAnswer: z.string().min(1),
    rubric: z.string().min(1),
  }),
  QuestionBaseSchema.extend({
    type: z.literal("ordering"),
    choices: z.array(z.string().min(1)).min(2),
    answer: z.array(z.string().min(1)).min(2),
  }),
]);

export const GeneratedFlashcardSchema = z.object({
  objectiveId: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  citations: z.array(CitationSchema).min(1),
});

export const GeneratedAssessmentSchema = z.object({
  questions: z.array(GeneratedQuestionSchema).min(1),
  flashcards: z.array(GeneratedFlashcardSchema),
});

export type GeneratedAssessment = z.infer<typeof GeneratedAssessmentSchema>;
