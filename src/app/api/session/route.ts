import { getOrCreateCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getOrCreateCurrentUser();
    return Response.json({ user });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not create session." },
      { status: 500 },
    );
  }
}
