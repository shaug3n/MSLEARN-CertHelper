# MS Certification Helper

Local-first MVP for turning Microsoft Learn certification study guides into practice tests, gap analysis, remediation packs, and SRS flashcards.

## Setup

```bash
npm install
copy .env.example .env
npm run setup
npm run dev
```

Open `http://localhost:3000` and analyze a Microsoft Learn study-guide URL such as:

```text
https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-900
```

`OPENAI_API_KEY` is optional. Without it, the app uses deterministic mocked generation so ingestion, scoring, dashboard, remediation, and SRS can be exercised locally. With a key, the generation adapter calls OpenAI structured outputs and validates citations/objective mappings before storing content.

## Scripts

- `npm run dev` - start Next.js locally.
- `npm run setup` - generate Prisma client and apply SQLite migrations.
- `npm test` - run unit/contract tests.
- `npm run test:e2e` - run the Playwright happy-path UI test.
- `npm run lint` - run ESLint.
- `npm run build` - production build.

## MVP Scope

- Microsoft Learn study-guide ingestion with linked source chunks and citation metadata.
- Mixed practice questions: multiple choice, short answer, code/command entry, and ordered steps.
- Objective-level readiness analytics and weak-objective recommendations.
- Generated remediation packs with cited source links.
- Markdown/code flashcards with SM-2 style `Forgot`, `Hard`, and `Easy` scheduling.

Deferred: user accounts, hosted database, image occlusion, and multi-step scenario diagnostic trees.
