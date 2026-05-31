import * as cheerio from "cheerio";

import type { ParsedObjective, ParsedStudyGuide, SourceChunk } from "@/lib/types";

const LEARN_HOST = "learn.microsoft.com";

export function parseStudyGuideHtml(url: string, html: string): ParsedStudyGuide {
  const $ = cheerio.load(html);
  const title =
    cleanText($("main h1").first().text()) ||
    cleanText($("h1").first().text()) ||
    cleanText($("title").first().text());
  const examCode = title.match(/[A-Z]{2,4}-\d{3}/)?.[0] ?? "UNKNOWN";
  const objectives: ParsedObjective[] = [];

  $("main h2, main h3, main h4, main li").each((_, element) => {
    const tag = element.tagName.toLowerCase();
    if (tag !== "h3") return;

    const heading = cleanText($(element).text());
    if (/skills at a glance/i.test(heading)) return;

    const weighted = heading.match(/^(.*?)\s*\((\d+)[-–](\d+)%\)$/);
    const domain = cleanText(weighted?.[1] ?? heading);
    const weightMin = weighted ? Number(weighted[2]) : undefined;
    const weightMax = weighted ? Number(weighted[3]) : undefined;

    let sibling = $(element).next();
    while (sibling.length > 0 && !["h2", "h3"].includes(sibling[0].tagName?.toLowerCase())) {
      sibling.find("li").each((__, li) => {
        const objective = cleanText($(li).text());
        if (objective) {
          objectives.push({ domain, objective, weightMin, weightMax });
        }
      });
      sibling = sibling.next();
    }
  });

  const links = $("main a")
    .toArray()
    .map((anchor) => {
      const href = $(anchor).attr("href");
      if (!href) return null;
      const absolute = new URL(href, url);
      if (absolute.hostname !== LEARN_HOST) return null;
      return {
        title: cleanText($(anchor).text()) || absolute.pathname.split("/").at(-1) || absolute.href,
        url: absolute.href.split("#")[0],
      };
    })
    .filter((link): link is { title: string; url: string } => Boolean(link))
    .filter(uniqueByUrl);

  return { url, title, examCode, objectives, links };
}

export function chunkSourcePage(
  url: string,
  html: string,
  maxCharacters = 1_400,
): SourceChunk[] {
  const $ = cheerio.load(html);
  const title =
    cleanText($("main h1").first().text()) ||
    cleanText($("h1").first().text()) ||
    cleanText($("title").first().text());
  const headingPath: string[] = [];
  const chunks: SourceChunk[] = [];

  $("main h1, main h2, main h3, main p, main li, article h1, article h2, article h3, article p, article li").each(
    (_, element) => {
      const tag = element.tagName.toLowerCase();
      const text = cleanText($(element).text());
      if (!text) return;

      if (tag === "h1" || tag === "h2" || tag === "h3") {
        const level = Number(tag.slice(1));
        headingPath.splice(level - 1);
        headingPath[level - 1] = text;
        return;
      }

      const path = headingPath.filter(Boolean);
      if (text.length <= maxCharacters) {
        chunks.push({ url, title, headingPath: path, content: text });
        return;
      }

      for (let start = 0; start < text.length; start += maxCharacters) {
        chunks.push({
          url,
          title,
          headingPath: path,
          content: text.slice(start, start + maxCharacters).trim(),
        });
      }
    },
  );

  return chunks;
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueByUrl(
  link: { title: string; url: string },
  index: number,
  links: Array<{ title: string; url: string }>,
): boolean {
  return links.findIndex((candidate) => candidate.url === link.url) === index;
}
