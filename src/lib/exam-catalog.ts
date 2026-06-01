export type ExamCatalogEntry = {
  code: string;
  title: string;
  technology: string;
  prefix: string;
  url: string;
};

export const EXAM_TECH_FILTERS = [
  { prefix: "ALL", label: "All" },
  { prefix: "AB", label: "Applied Skills" },
  { prefix: "AI", label: "AI" },
  { prefix: "AZ", label: "Azure" },
  { prefix: "DP", label: "Data" },
  { prefix: "GH", label: "GitHub" },
  { prefix: "MB", label: "Business Apps" },
  { prefix: "MD", label: "Modern Desktop" },
  { prefix: "MS", label: "Microsoft 365" },
  { prefix: "PL", label: "Power Platform" },
  { prefix: "SC", label: "Security" },
] as const;

const prefixToTechnology: Record<string, string> = {
  AB: "Applied Skills",
  AI: "AI",
  AZ: "Azure",
  DP: "Data",
  GH: "GitHub",
  MB: "Business Apps",
  MD: "Modern Desktop",
  MS: "Microsoft 365",
  PL: "Power Platform",
  SC: "Security",
};

const examCodes = [
  "AB-100",
  "AB-410",
  "AB-620",
  "AB-730",
  "AB-731",
  "AB-900",
  "AI-102",
  "AI-103",
  "AI-300",
  "AI-900",
  "AI-901",
  "AZ-104",
  "AZ-120",
  "AZ-140",
  "AZ-204",
  "AZ-305",
  "AZ-400",
  "AZ-500",
  "AZ-700",
  "AZ-800",
  "AZ-801",
  "AZ-900",
  "DP-100",
  "DP-203",
  "DP-300",
  "DP-420",
  "DP-600",
  "DP-700",
  "DP-750",
  "DP-800",
  "DP-900",
  "GH-100",
  "GH-200",
  "GH-300",
  "GH-500",
  "GH-900",
  "MB-210",
  "MB-220",
  "MB-230",
  "MB-240",
  "MB-260",
  "MB-280",
  "MB-310",
  "MB-330",
  "MB-335",
  "MB-500",
  "MB-700",
  "MB-800",
  "MB-820",
  "MD-102",
  "MS-102",
  "MS-700",
  "MS-721",
  "MS-900",
  "PL-200",
  "PL-300",
  "PL-400",
  "PL-500",
  "PL-600",
  "PL-900",
  "SC-100",
  "SC-200",
  "SC-300",
  "SC-401",
  "SC-500",
  "SC-900",
] as const;

export function buildStudyGuideUrl(code: string) {
  return `https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/${code.toLowerCase()}`;
}

export const examCatalog: ExamCatalogEntry[] = examCodes.map((code) => {
  const prefix = code.split("-")[0];
  return {
    code,
    title: `Study guide for Exam ${code}`,
    technology: prefixToTechnology[prefix] ?? "Other",
    prefix,
    url: buildStudyGuideUrl(code),
  };
});
