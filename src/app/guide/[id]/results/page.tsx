import { ResultsScreen } from "@/components/study/results-screen";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ResultsScreen guideId={id} />;
}
