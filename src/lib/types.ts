export type Citation = {
  url: string;
  title: string;
  headingPath: string[];
};

export type ParsedObjective = {
  id?: string;
  domain: string;
  objective: string;
  weightMin?: number;
  weightMax?: number;
};

export type ParsedStudyGuide = {
  url: string;
  title: string;
  examCode: string;
  objectives: ParsedObjective[];
  links: Array<{ title: string; url: string }>;
};

export type SourceChunk = Citation & {
  content: string;
};

export type QuestionType =
  | "multiple_choice"
  | "short_answer"
  | "code"
  | "ordering";

export type Difficulty = "easy" | "medium" | "hard";

export type GeneratedQuestion = {
  type: QuestionType;
  objectiveId: string;
  prompt: string;
  choices?: string[];
  answer?: string | string[];
  expectedAnswer?: string;
  rubric?: string;
  citations: Citation[];
  difficulty: Difficulty;
};

export type GeneratedFlashcard = {
  objectiveId: string;
  front: string;
  back: string;
  citations: Citation[];
};

export type DeterministicQuestion = {
  id: string;
  type: "multiple_choice" | "ordering";
  objectiveId: string;
  answer: string | string[];
  points: number;
};

export type GradedResult = {
  questionId: string;
  objectiveId: string;
  score: number;
  maxScore: number;
  correct: boolean;
  feedback: string;
};
