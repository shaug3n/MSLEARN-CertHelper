import { FlashcardsScreen } from "@/components/study/flashcards-screen";

export default async function FlashcardsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FlashcardsScreen guideId={id} />;
}
