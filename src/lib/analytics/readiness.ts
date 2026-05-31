import type { ParsedObjective } from "@/lib/types";

export type ObjectiveResult = {
  objectiveId: string;
  score: number;
  maxScore: number;
};

export type ObjectiveWithId = ParsedObjective & {
  id: string;
};

export function calculateReadiness(
  objectives: ObjectiveWithId[],
  results: ObjectiveResult[],
) {
  const overallScore = percentage(
    sum(results.map((result) => result.score)),
    sum(results.map((result) => result.maxScore)),
  );

  const domains = Array.from(new Set(objectives.map((objective) => objective.domain))).map(
    (domain) => {
      const domainObjectiveIds = objectives
        .filter((objective) => objective.domain === domain)
        .map((objective) => objective.id);
      const domainResults = results.filter((result) =>
        domainObjectiveIds.includes(result.objectiveId),
      );
      const correct = sum(domainResults.map((result) => result.score));
      const total = sum(domainResults.map((result) => result.maxScore));
      return { domain, score: percentage(correct, total), correct, total };
    },
  );

  const weakObjectives = objectives
    .map((objective) => {
      const objectiveResults = results.filter((result) => result.objectiveId === objective.id);
      return {
        objectiveId: objective.id,
        domain: objective.domain,
        objective: objective.objective,
        score: percentage(
          sum(objectiveResults.map((result) => result.score)),
          sum(objectiveResults.map((result) => result.maxScore)),
        ),
      };
    })
    .filter((objective) => objective.score < 70)
    .sort((left, right) => left.score - right.score);

  const focusDomains = weakObjectives
    .map((objective) => objective.domain)
    .filter((domain, index, domains) => domains.indexOf(domain) === index)
    .slice(0, 2);

  return {
    overallScore,
    domains,
    weakObjectives,
    recommendation:
      focusDomains.length === 0
        ? "Maintain your review cadence and take a final mixed practice test."
        : `Focus on ${joinList(focusDomains)} before taking the exam.`,
  };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function percentage(score: number, total: number): number {
  return total === 0 ? 0 : Math.round((score / total) * 100);
}

function joinList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;
}
