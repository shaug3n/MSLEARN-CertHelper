import { getOrCreateCurrentUser } from "@/lib/auth/session";
import { generateGuideFlashcards } from "@/lib/study-service";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const user = await getOrCreateCurrentUser();
    const guide = await generateGuideFlashcards(user.id, id);
    return Response.json({ guide });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not generate flashcards." },
      { status: 500 },
    );
  }
}
