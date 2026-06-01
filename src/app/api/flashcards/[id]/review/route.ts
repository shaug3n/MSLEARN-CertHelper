import { getOrCreateCurrentUser } from "@/lib/auth/session";
import { reviewDueFlashcard } from "@/lib/study-service";
import type { ReviewRating } from "@/lib/srs/sm2";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const body = (await _request.json()) as { rating?: ReviewRating };
    const { id } = await context.params;
    if (!body.rating || !["forgot", "hard", "easy"].includes(body.rating)) {
      return Response.json({ error: "Rating must be forgot, hard, or easy." }, { status: 400 });
    }

    const user = await getOrCreateCurrentUser();
    const guide = await reviewDueFlashcard(user.id, id, body.rating);
    return Response.json({ guide });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not review flashcard." },
      { status: 500 },
    );
  }
}
