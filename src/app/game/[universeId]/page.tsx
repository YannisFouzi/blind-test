import { GameClient } from "@/features/game-ui/components/GameClient";

type GamePageProps = {
  params: Promise<{ universeId: string }>;
};

export default async function GamePage({ params }: GamePageProps) {
  const { universeId } = await params;

  return <GameClient universeId={universeId} />;
}
