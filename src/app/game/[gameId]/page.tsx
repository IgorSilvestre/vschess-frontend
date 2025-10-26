import Link from "next/link";
import ChessGame from "@/components/chess-game";

type GamePageProps = {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ side?: string; initialMove?: string }>;
};

export default async function GamePage({
  params,
  searchParams,
}: GamePageProps) {
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";
  const [{ gameId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const normalizedSide =
    resolvedSearchParams.side === "black"
      ? "b"
      : resolvedSearchParams.side === "white"
        ? "w"
        : null;

  if (!normalizedSide) {
    return (
      <div className="flex h-screen max-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center text-slate-100">
        <p className="text-lg font-semibold">Missing side selection</p>
        <p className="text-sm text-slate-400">
          We could not determine whether you are playing as White or Black.
          Start a new game from the home page.
        </p>
        <Link
          href="/"
          className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-emerald-950"
        >
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen max-h-screen min-h-0 flex-col overflow-hidden bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
        <Link
          href="/"
          className="rounded-full border border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/10"
        >
          ← Quit to Home
        </Link>
        <div className="text-sm text-slate-400">Game #{gameId}</div>
      </header>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ChessGame
          apiUrl={apiUrl}
          gameId={gameId}
          playerColor={normalizedSide}
          initialEngineMove={resolvedSearchParams.initialMove ?? null}
        />
      </div>
    </div>
  );
}
