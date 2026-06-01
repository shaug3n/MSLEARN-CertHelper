# MS Certification Helper

MVP for turning Microsoft Learn certification study guides into practice tests, gap analysis, remediation packs, and SRS flashcards. The app is ready for Vercel-style hosting with Postgres persistence and anonymous demo sessions.

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

Set `DATABASE_URL` to a Postgres database before running `npm run setup`. For a free hosted demo, Neon Postgres plus Vercel Hobby is the recommended path. `OPENAI_API_KEY` is optional. Without it, the app uses deterministic mocked generation so ingestion, scoring, dashboard, remediation, and SRS can be exercised. With a key, the generation adapter calls OpenAI structured outputs and validates citations/objective mappings before storing content.

Each browser gets an anonymous httpOnly demo-session cookie. Guides, attempts, remediation, and flashcards are scoped to that session's user record so multiple demo users do not share results.

## Deploy on Vercel

1. Create a free Neon Postgres database.
2. In Vercel, import this GitHub repository.
3. Add environment variables:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
4. Keep the default build command: `npm run build`.
5. Run the initial database migration from a terminal with the production env loaded:

```bash
npm run prisma:deploy
```

## Scripts

- `npm run dev` - start Next.js locally.
- `npm run setup` - generate Prisma client and apply Postgres migrations locally.
- `npm run prisma:deploy` - apply committed migrations to hosted Postgres.
- `npm test` - run unit/contract tests.
- `npm run test:e2e` - run the Playwright happy-path UI test.
- `npm run lint` - run ESLint.
- `npm run build` - production build.

## MVP Scope

- Microsoft Learn study-guide ingestion with linked source chunks and citation metadata.
- 50 multiple-choice practice questions grouped by exam domain.
- Objective-level readiness analytics and weak-objective recommendations.
- Generated remediation packs with cited source links.
- Markdown/code flashcards with SM-2 style `Forgot`, `Hard`, and `Easy` scheduling.
- Anonymous demo sessions for per-user isolation.

Deferred: named login accounts, image occlusion, and multi-step scenario diagnostic trees.
