import { getOrCreateCurrentUser } from "@/lib/auth/session";
import { getGuideState } from "@/lib/study-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const user = await getOrCreateCurrentUser();
    const guide = await getGuideState(user.id, id);
    return Response.json({ guide });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Guide not found." },
      { status: 404 },
    );
  }
}
