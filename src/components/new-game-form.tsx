"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type GameResponse = {
  gameId: string;
  move: string | null;
  status: string;
};

type NewGameFormProps = {
  apiUrl?: string;
};

const SIDES = [
  { label: "White", value: "white", description: "Moves first" },
  { label: "Black", value: "black", description: "Moves second" },
] as const;

export function NewGameForm({ apiUrl }: NewGameFormProps) {
  const router = useRouter();
  const normalizedApiUrl = useMemo(
    () => (apiUrl ?? "").replace(/\/$/, ""),
    [apiUrl],
  );
  const [selectedSide, setSelectedSide] =
    useState<(typeof SIDES)[number]["value"]>("white");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(
    normalizedApiUrl ? null : "API_URL is not set.",
  );

  const handleStart = async () => {
    if (!normalizedApiUrl) {
      setError("API_URL is not configured. Update your environment settings.");
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch(`${normalizedApiUrl}/api/v1/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side: selectedSide }),
      });

      if (!response.ok) {
        throw new Error("Unable to start a game. Is the API running?");
      }

      const payload: GameResponse = await response.json();
      const params = new URLSearchParams({ side: selectedSide });
      if (payload.move) {
        params.set("initialMove", payload.move);
      }

      router.push(`/game/${payload.gameId}?${params.toString()}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create a new game.",
      );
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-slate-100 shadow-2xl shadow-emerald-900/40">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">
          Start
        </p>
        <h1 className="text-4xl font-semibold text-white">
          Create a VS Chess match
        </h1>
        <p className="text-base text-slate-400">
          Choose your preferred side and spin up a new game. We will redirect
          you to the board once the match is ready.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Pick a side
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {SIDES.map((side) => {
            const isActive = selectedSide === side.value;
            return (
              <button
                key={side.value}
                type="button"
                onClick={() => setSelectedSide(side.value)}
                className={[
                  "flex flex-1 flex-col rounded-2xl border px-4 py-4 text-left transition-colors",
                  isActive
                    ? "border-emerald-400 bg-emerald-400/10 text-emerald-100"
                    : "border-slate-800 bg-slate-900 text-slate-200 hover:border-emerald-400/60",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="text-lg font-semibold">{side.label}</span>
                <span className="text-sm text-slate-400">
                  {side.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleStart}
        disabled={isStarting}
        className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-emerald-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isStarting
          ? "Creating game..."
          : `Start as ${selectedSide === "white" ? "White" : "Black"}`}
      </button>
    </div>
  );
}

export default NewGameForm;
