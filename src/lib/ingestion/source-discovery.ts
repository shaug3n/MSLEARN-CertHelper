const LEARN_HOST = "learn.microsoft.com";
const EXTERNAL_DOC_HOSTS = new Set(["docs.github.com"]);

export type SourceType = "study-guide" | "learn-path" | "learn-module" | "learn-doc" | "external-doc";

export type SourceLink = {
  title: string;
  url: string;
  sourceType: SourceType;
};

export type SourceCoverage = {
  totalPages: number;
  studyGuides: number;
  learnPaths: number;
  learnModules: number;
  externalDocs: number;
};

export function buildInitialSourceLinks(
  guideUrl: string,
  guideTitle: string,
  links: Array<{ title: string; url: string }>,
): SourceLink[] {
  const sourceLinks: SourceLink[] = [
    { title: guideTitle, url: normalizeUrl(guideUrl), sourceType: "study-guide" },
    ...links
      .map((link) => {
        const sourceType = classifySourceUrl(link.url);
        if (!sourceType) return null;
        return { ...link, url: normalizeUrl(link.url), sourceType };
      })
      .filter((link): link is SourceLink => Boolean(link)),
  ];

  return sourceLinks.filter(uniqueByUrl);
}

export function isAllowedSourceUrl(url: string): boolean {
  return Boolean(classifySourceUrl(url));
}

export function classifySourceUrl(url: string): SourceType | null {
  const parsed = safeUrl(url);
  if (!parsed) return null;

  if (parsed.hostname === LEARN_HOST) {
    if (parsed.pathname.includes("/study-guides/")) return "study-guide";
    if (parsed.pathname.includes("/training/paths/")) return "learn-path";
    if (parsed.pathname.includes("/training/modules/")) return "learn-module";
    return "learn-doc";
  }

  if (EXTERNAL_DOC_HOSTS.has(parsed.hostname)) return "external-doc";
  return null;
}

export function getSourceCoverage(urls: string[]): SourceCoverage {
  const uniqueUrls = Array.from(new Set(urls.map(normalizeUrl)));
  const counts: SourceCoverage = {
    totalPages: uniqueUrls.length,
    studyGuides: 0,
    learnPaths: 0,
    learnModules: 0,
    externalDocs: 0,
  };

  for (const url of uniqueUrls) {
    const sourceType = classifySourceUrl(url);
    if (sourceType === "study-guide") counts.studyGuides += 1;
    if (sourceType === "learn-path") counts.learnPaths += 1;
    if (sourceType === "learn-module") counts.learnModules += 1;
    if (sourceType === "external-doc") counts.externalDocs += 1;
  }

  return counts;
}

export function normalizeUrl(url: string): string {
  return url.split("#")[0];
}

function safeUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function uniqueByUrl(link: SourceLink, index: number, links: SourceLink[]) {
  return links.findIndex((candidate) => candidate.url === link.url) === index;
}
