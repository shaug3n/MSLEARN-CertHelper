export type Citation = {
  url: string;
  title: string;
  headingPath: string[];
};

export type Question = {
  id: string;
  objectiveId: string;
  type: string;
  prompt: string;
  choices: string[] | null;
  citations: Citation[];
  difficulty: string;
};

export type AttemptAnswer = {
  questionId: string;
  objectiveId: string;
  prompt: string;
  choices: string[] | null;
  selectedAnswer: string | string[];
  correctAnswer: string | string[];
  correct: boolean;
  feedback: string;
  citations: Citation[];
  score: number;
  maxScore: number;
};

export type GuideState = {
  id: string;
  url: string;
  title: string;
  examCode: string;
  objectives: Array<{
    id: string;
    domain: string;
    objective: string;
    weightMin?: number;
    weightMax?: number;
  }>;
  sourceChunkCount: number;
  questions: Question[];
  latestAttempt: {
    id: string;
    overallScore: number;
    answers: AttemptAnswer[];
  } | null;
  remediationPacks: Array<{
    id: string;
    objectiveId: string;
    summary: string;
    lesson: string;
    workedExample: string;
    citations: Citation[];
  }>;
  flashcards: Array<{
    id: string;
    objectiveId: string;
    front: string;
    back: string;
    citations: Citation[];
    dueAt: string;
    intervalDays: number;
    easeFactor: number;
    repetitions: number;
  }>;
  readiness: {
    overallScore: number;
    domains: Array<{ domain: string; score: number; correct: number; total: number }>;
    weakObjectives: Array<{
      objectiveId: string;
      domain: string;
      objective: string;
      score: number;
    }>;
    recommendation: string;
  };
};

export type View = "practice" | "results" | "flashcards";
