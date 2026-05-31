import { PracticeScreen } from "@/components/study/practice-screen";

export default async function PracticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PracticeScreen guideId={id} />;
}
