import { getOrCreateCurrentUser } from "@/lib/auth/session";
import { analyzeStudyGuide } from "@/lib/study-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    if (!body.url) {
      return Response.json({ error: "Study guide URL is required." }, { status: 400 });
    }

    const user = await getOrCreateCurrentUser();
    const guide = await analyzeStudyGuide(user.id, body.url);
    return Response.json({ guide });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not analyze guide." },
      { status: 500 },
    );
  }
}
