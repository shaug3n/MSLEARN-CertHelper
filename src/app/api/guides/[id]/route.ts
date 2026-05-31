import { getGuideState } from "@/lib/study-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const guide = await getGuideState(id);
    return Response.json({ guide });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Guide not found." },
      { status: 404 },
    );
  }
}
