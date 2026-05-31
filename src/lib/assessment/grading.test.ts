import { describe, expect, it } from "vitest";

import { gradeDeterministicQuestion } from "./grading";

describe("gradeDeterministicQuestion", () => {
  it("grades multiple choice by exact selected choice", () => {
    expect(
      gradeDeterministicQuestion(
        {
          id: "q1",
          type: "multiple_choice",
          answer: "b",
          objectiveId: "obj-1",
          points: 1,
        },
        "b",
      ),
    ).toEqual({
      questionId: "q1",
      objectiveId: "obj-1",
      score: 1,
      maxScore: 1,
      correct: true,
      feedback: "Correct.",
    });
  });

  it("grades ordered steps by full sequence match", () => {
    expect(
      gradeDeterministicQuestion(
        {
          id: "q2",
          type: "ordering",
          answer: ["inspect logs", "identify workflow", "rerun failed job"],
          objectiveId: "obj-2",
          points: 2,
        },
        ["inspect logs", "rerun failed job", "identify workflow"],
      ),
    ).toMatchObject({
      score: 0,
      maxScore: 2,
      correct: false,
    });
  });
});
