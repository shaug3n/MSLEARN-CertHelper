import { submitAttempt } from "@/lib/study-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      guideId?: string;
      answers?: Record<string, string | string[]>;
    };
    if (!body.guideId || !body.answers) {
      return Response.json({ error: "Guide ID and answers are required." }, { status: 400 });
    }

    const guide = await submitAttempt(body.guideId, body.answers);
    return Response.json({ guide });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not submit attempt." },
      { status: 500 },
    );
  }
}
