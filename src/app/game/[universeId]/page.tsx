import { GameClient } from "@/components/game/GameClient";

type GamePageParams = {
  universeId: string;
};

type GamePageProps = {
  params: Promise<GamePageParams>;
};

export default async function GamePage({ params }: GamePageProps) {
  const { universeId } = await params;

  return <GameClient universeId={universeId} />;
}
