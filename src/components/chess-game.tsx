"use client";

import type { Move, Square } from "chess.js";
import { Chess } from "chess.js";
import { ChessBoard } from "@/components/chess-board";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type GameResponse = {
  gameId: string;
  move: string | null;
  status: string;
};

type ChessGameProps = {
  apiUrl?: string;
  gameId: string;
  playerColor: "w" | "b";
  initialEngineMove?: string | null;
};

export function ChessGame({
  apiUrl,
  gameId,
  playerColor,
  initialEngineMove,
}: ChessGameProps) {
  const chessRef = useRef(new Chess());
  const chess = chessRef.current;

  const normalizedApiUrl = (apiUrl ?? "").replace(/\/$/, "");
  const [, setFenKey] = useState(chess.fen());
  const [gameStatus, setGameStatus] = useState<string>("in_progress");
  const [error, setError] = useState<string | null>(
    normalizedApiUrl ? null : "API_URL is not set.",
  );
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [availableTargets, setAvailableTargets] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(
    null,
  );
  const [history, setHistory] = useState<string[]>([]);

  const board = chess.board();

  const syncBoardState = useCallback(() => {
    setFenKey(chess.fen());
    const verboseHistory = chess.history({ verbose: true }) as Move[];
    if (verboseHistory.length === 0) {
      setLastMove(null);
    } else {
      const latest = verboseHistory[verboseHistory.length - 1];
      setLastMove({ from: latest.from as Square, to: latest.to as Square });
    }
    setHistory(chess.history());
  }, [chess]);

  const createMoveToken = (move: Move) =>
    `${move.from}${move.to}${move.promotion ?? ""}`;

  const applyEngineMove = useCallback(
    (notation: string) => {
      const from = notation.slice(0, 2) as Square;
      const to = notation.slice(2, 4) as Square;
      const promotion =
        notation.length === 5
          ? (notation[4] as "q" | "r" | "b" | "n")
          : undefined;

      const engineMove = chess.move({ from, to, promotion });

      if (!engineMove) {
        setError("Failed to apply engine move. Please refresh the page.");
        return;
      }

      syncBoardState();
    },
    [chess, syncBoardState],
  );

  useEffect(() => {
    chess.reset();
    setSelectedSquare(null);
    setAvailableTargets([]);
    setLastMove(null);
    setHistory([]);
    setGameStatus("in_progress");

    if (!gameId) {
      setError("Game is not ready.");
      return;
    }

    if (!normalizedApiUrl) {
      setError("API_URL is not set.");
      return;
    }

    if (playerColor === "b" && initialEngineMove) {
      applyEngineMove(initialEngineMove);
      return;
    }

    syncBoardState();
  }, [
    chess,
    gameId,
    playerColor,
    initialEngineMove,
    normalizedApiUrl,
    applyEngineMove,
    syncBoardState,
  ]);

  const sendMoveToServer = async (move: Move) => {
    if (!gameId || !normalizedApiUrl) {
      setError("Game is not ready. Start a new one.");
      return;
    }

    setIsSubmittingMove(true);
    setError(null);

    const moveToken = createMoveToken(move);

    try {
      const response = await fetch(
        `${normalizedApiUrl}/api/v1/games/${gameId}/move`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ move: moveToken }),
        },
      );

      if (!response.ok) {
        throw new Error("The move was rejected by the server.");
      }

      const payload: GameResponse = await response.json();
      setGameStatus(payload.status ?? "in_progress");

      if (payload.move) {
        applyEngineMove(payload.move);
      }
    } catch (err) {
      chess.undo();
      syncBoardState();
      setError(err instanceof Error ? err.message : "Unable to submit move.");
    } finally {
      setIsSubmittingMove(false);
    }
  };

  const handleSquareClick = (square: Square) => {
    if (
      !gameId ||
      gameStatus !== "in_progress" ||
      chess.turn() !== playerColor ||
      isSubmittingMove
    ) {
      return;
    }

    const piece = chess.get(square);

    if (piece && piece.color === playerColor) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setAvailableTargets([]);
      } else {
        setSelectedSquare(square);
        const moves = chess.moves({ square, verbose: true }) as Move[];
        setAvailableTargets(moves.map((m) => m.to as Square));
      }
      return;
    }

    if (!selectedSquare) {
      return;
    }

    const tentativeMove = chess.move({
      from: selectedSquare,
      to: square,
      promotion: "q",
    });

    if (!tentativeMove) {
      return;
    }

    setSelectedSquare(null);
    setAvailableTargets([]);
    syncBoardState();
    void sendMoveToServer(tentativeMove);
  };

  const movePairs = useMemo(() => {
    const pairs: { moveNumber: number; white: string; black?: string }[] = [];
    for (let i = 0; i < history.length; i += 2) {
      pairs.push({
        moveNumber: i / 2 + 1,
        white: history[i],
        black: history[i + 1],
      });
    }
    return pairs;
  }, [history]);

  const sideLabel = playerColor === "w" ? "White" : "Black";
  const isPlayerTurn =
    chess.turn() === playerColor && gameStatus === "in_progress";
  const statusLabel =
    gameStatus === "in_progress"
      ? "In progress"
      : gameStatus.replaceAll("_", " ");
  const turnMessage =
    gameStatus === "in_progress"
      ? isSubmittingMove
        ? "Engine is thinking…"
        : isPlayerTurn
          ? "Your move."
          : "Engine to move."
      : "Game finished. Head back home to start a new battle.";

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-slate-950 text-slate-100">
      <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-6 overflow-hidden px-4 py-4 lg:grid lg:grid-cols-[auto_minmax(320px,1fr)] lg:items-stretch lg:gap-8 lg:px-8 lg:py-6">
        <section className="flex w-full min-h-0 flex-none items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/70 p-3 shadow-2xl shadow-emerald-900/40 sm:p-5 lg:h-full">
          <ChessBoard
            boardState={board}
            perspective={playerColor}
            selectedSquare={selectedSquare}
            availableTargets={availableTargets}
            lastMove={lastMove}
            onSquareClick={handleSquareClick}
            isSubmittingMove={isSubmittingMove}
            disabled={!gameId || gameStatus !== "in_progress"}
          />
        </section>

        <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 lg:min-h-[0]">
          <div className="space-y-3 border-b border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
            <p className="text-xs uppercase tracking-[0.5em] text-emerald-300">
              Game #{gameId}
            </p>
            <h1 className="text-2xl font-semibold text-white">
              {sideLabel} vs Engine
            </h1>
            <div className="grid gap-2">
              <p>
                Status:{" "}
                <span className="font-semibold text-emerald-300">
                  {statusLabel}
                </span>
              </p>
              <p>{turnMessage}</p>
              {error && <p className="text-red-400">{error}</p>}
              {!normalizedApiUrl && (
                <p className="text-amber-300">
                  API URL missing. Check your environment configuration.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden p-6 min-h-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Move list</h2>
              <span className="text-xs uppercase tracking-[0.4em] text-emerald-300">
                {sideLabel}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              All moves in standard notation.
            </p>
            <div className="mt-4 flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
              {movePairs.length === 0 ? (
                <p className="text-center text-sm text-slate-500">
                  No moves yet.
                </p>
              ) : (
                <ol className="space-y-2 text-sm">
                  {movePairs.map((entry) => (
                    <li
                      key={entry.moveNumber}
                      className="flex items-center justify-between rounded-xl bg-slate-900/60 px-4 py-2"
                    >
                      <span className="font-semibold text-emerald-300">
                        {entry.moveNumber}.
                      </span>
                      <span className="flex flex-1 justify-between gap-4 pl-4 font-mono text-slate-100">
                        <span className="text-white">{entry.white}</span>
                        <span className="text-slate-300">
                          {entry.black ?? "…"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ChessGame;
