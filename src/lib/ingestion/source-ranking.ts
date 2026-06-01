import type { ObjectiveWithId } from "@/lib/analytics/readiness";
import type { SourceChunk } from "@/lib/types";

const STOP_WORDS = new Set([
  "and",
  "are",
  "for",
  "how",
  "the",
  "use",
  "using",
  "with",
  "github",
  "describe",
  "identify",
  "explain",
  "recognize",
]);

export function rankSourceChunksForObjectives(
  objectives: ObjectiveWithId[],
  chunks: SourceChunk[],
  options: { maxChunks?: number; chunksPerObjective?: number } = {},
): SourceChunk[] {
  const maxChunks = options.maxChunks ?? 16;
  const chunksPerObjective = options.chunksPerObjective ?? 3;
  const selected = new Map<string, SourceChunk>();

  for (const objective of objectives) {
    const tokens = objectiveTokens(objective);
    const bestForObjective = chunks
      .map((chunk, index) => ({
        chunk,
        index,
        score: scoreChunk(chunk, tokens),
      }))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, chunksPerObjective);

    for (const candidate of bestForObjective) {
      selected.set(chunkKey(candidate.chunk), candidate.chunk);
      if (selected.size >= maxChunks) return Array.from(selected.values());
    }
  }

  if (selected.size < maxChunks) {
    const globalTokens = objectives.flatMap(objectiveTokens);
    for (const candidate of chunks
      .map((chunk, index) => ({ chunk, index, score: scoreChunk(chunk, globalTokens) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)) {
      selected.set(chunkKey(candidate.chunk), candidate.chunk);
      if (selected.size >= maxChunks) break;
    }
  }

  return Array.from(selected.values());
}

function objectiveTokens(objective: ObjectiveWithId): string[] {
  return tokenize(`${objective.domain} ${objective.objective}`);
}

function scoreChunk(chunk: SourceChunk, tokens: string[]): number {
  const title = tokenize(`${chunk.title} ${chunk.headingPath.join(" ")}`);
  const content = tokenize(chunk.content);
  const titleSet = new Set(title);
  const contentSet = new Set(content);

  return tokens.reduce((score, token) => {
    if (titleSet.has(token)) return score + 4;
    if (contentSet.has(token)) return score + 1;
    return score;
  }, sourcePriority(chunk.url));
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function sourcePriority(url: string): number {
  if (url.includes("/training/modules/")) return 2;
  if (url.includes("/training/paths/")) return 1;
  if (new URL(url).hostname === "docs.github.com") return 1;
  return 0;
}

function chunkKey(chunk: SourceChunk): string {
  return `${chunk.url}|${chunk.headingPath.join("/")}|${chunk.content}`;
}
