"use client";

import type { Move, Square } from "chess.js";
import { Chess } from "chess.js";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";

type GameResponse = {
  gameId: string;
  move: string | null;
  status: string;
};

type ChessGameProps = {
  apiUrl?: string;
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

const PIECE_IMAGES: Record<
  string,
  {
    src: string;
    alt: string;
  }
> = {
  wp: { src: "/pieces/classic/classic-white-pawn.png", alt: "White pawn" },
  bp: { src: "/pieces/classic/classic-black-pawn.png", alt: "Black pawn" },
  wn: { src: "/pieces/classic/classic-white-knight.png", alt: "White knight" },
  bn: { src: "/pieces/classic/classic-black-knight.png", alt: "Black knight" },
  wb: { src: "/pieces/classic/classic-white-bishop.png", alt: "White bishop" },
  bb: { src: "/pieces/classic/classic-black-bishop.png", alt: "Black bishop" },
  wr: { src: "/pieces/classic/classic-white-rook.png", alt: "White rook" },
  br: { src: "/pieces/classic/classic-black-rook.png", alt: "Black rook" },
  wq: { src: "/pieces/classic/classic-white-queen.png", alt: "White queen" },
  bq: { src: "/pieces/classic/classic-black-queen.png", alt: "Black queen" },
  wk: { src: "/pieces/classic/classic-white-king.png", alt: "White king" },
  bk: { src: "/pieces/classic/classic-black-king.png", alt: "Black king" },
};

const DEFAULT_STATUS = "Choose your side and tap “Start a new game”.";

export function ChessGame({ apiUrl }: ChessGameProps) {
  const chessRef = useRef(new Chess());
  const chess = chessRef.current;

  const normalizedApiUrl = (apiUrl ?? "").replace(/\/$/, "");
  const [, setFenKey] = useState(chess.fen());
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<string>(DEFAULT_STATUS);
  const [error, setError] = useState<string | null>(
    normalizedApiUrl ? null : "API_URL is not set.",
  );
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [availableTargets, setAvailableTargets] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(
    null,
  );
  const [history, setHistory] = useState<string[]>([]);
  const [playerColor, setPlayerColor] = useState<"w" | "b">("w");

  const board = chess.board();

  const syncBoardState = () => {
    setFenKey(chess.fen());
    const verboseHistory = chess.history({ verbose: true }) as Move[];
    if (verboseHistory.length === 0) {
      setLastMove(null);
    } else {
      const latest = verboseHistory[verboseHistory.length - 1];
      setLastMove({ from: latest.from as Square, to: latest.to as Square });
    }
    setHistory(chess.history());
  };

  const startNewGame = async () => {
    if (!normalizedApiUrl) {
      setError("API_URL is not configured. Add it to your .env file.");
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      const sidePayload = playerColor === "w" ? "white" : "black";
      const response = await fetch(`${normalizedApiUrl}/api/v1/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side: sidePayload }),
      });

      if (!response.ok) {
        throw new Error("Unable to start a new game. Is the API running?");
      }

      const payload: GameResponse = await response.json();

      chess.reset();
      syncBoardState();
      setGameId(payload.gameId);
      setGameStatus(payload.status ?? "in_progress");
      setSelectedSquare(null);
      setAvailableTargets([]);

      if (payload.move) {
        applyEngineMove(payload.move);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create a new game.",
      );
    } finally {
      setIsStarting(false);
    }
  };

  const createMoveToken = (move: Move) =>
    `${move.from}${move.to}${move.promotion ?? ""}`;

  const applyEngineMove = (notation: string) => {
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
  };

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

  const indices = Array.from({ length: 8 }, (_, idx) => idx);
  const rowOrder = playerColor === "w" ? indices : [...indices].reverse();
  const columnOrder = playerColor === "w" ? indices : [...indices].reverse();

  const squares = rowOrder.flatMap((rowIdx, displayRowIndex) =>
    columnOrder.map((colIdx, displayColumnIndex) => {
      const rank = 8 - displayRowIndex;
      const file = FILES[displayColumnIndex];
      const squareName = `${file}${rank}` as Square;
      const isLight = (displayRowIndex + displayColumnIndex) % 2 === 0;
      const square = board[rowIdx][colIdx];
      const pieceKey = square ? `${square.color}${square.type}` : null;
      const pieceAsset = pieceKey ? PIECE_IMAGES[pieceKey] : null;
      const isHighlighted = availableTargets.includes(squareName);
      const isSelected = selectedSquare === squareName;
      const isLastMoveSquare =
        lastMove !== null &&
        (lastMove.from === squareName || lastMove.to === squareName);

      const baseColor = isLight ? "bg-emerald-200" : "bg-emerald-700";
      const highlightColor = isHighlighted ? "ring-4 ring-yellow-400" : "";
      const selectedColor = isSelected
        ? "outline outline-4 outline-blue-400"
        : "";
      const lastMoveColor = isLastMoveSquare
        ? "bg-amber-200 text-slate-900"
        : "";

      return (
        <button
          key={squareName}
          type="button"
          onClick={() => handleSquareClick(squareName)}
          className={[
            "flex aspect-square h-full w-full items-center justify-center text-3xl transition-all duration-150",
            baseColor,
            highlightColor,
            selectedColor,
            lastMoveColor,
            isSubmittingMove ? "cursor-wait" : "cursor-pointer",
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={!gameId || gameStatus !== "in_progress"}
        >
          {pieceAsset ? (
            <Image
              src={pieceAsset.src}
              alt={pieceAsset.alt}
              width={64}
              height={64}
              className="h-12 w-12 select-none"
              draggable={false}
              priority={pieceKey?.startsWith("w") ?? false}
            />
          ) : null}
        </button>
      );
    }),
  );

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

  return (
    <div className="min-h-screen bg-slate-950 py-10 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 lg:flex-row">
        <section className="flex flex-1 flex-col rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-emerald-900/40">
          <div className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">
              Play
            </p>
            <h1 className="text-3xl font-semibold text-white">VS Chess</h1>
            <p className="text-sm text-slate-400">
              Choose your color, start a match, and play moves on the board.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Your Side
            </p>
            <div className="flex flex-wrap gap-3">
              {(["w", "b"] as const).map((color) => {
                const isActive = playerColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setPlayerColor(color)}
                    disabled={isStarting}
                    className={[
                      "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "border-emerald-400 bg-emerald-400/10 text-emerald-200"
                        : "border-slate-700 text-slate-300 hover:border-emerald-400/60 hover:text-emerald-200",
                      isStarting ? "cursor-not-allowed opacity-60" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span
                      className={[
                        "h-3 w-3 rounded-full border",
                        color === "w"
                          ? "border-slate-200 bg-slate-50"
                          : "border-slate-900 bg-slate-900",
                      ].join(" ")}
                    />
                    {color === "w" ? "White (moves first)" : "Black"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={startNewGame}
              disabled={isStarting || !normalizedApiUrl}
              className={[
                "rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-wide",
                "bg-emerald-400 text-emerald-950 transition-colors",
                "hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {isStarting ? "Starting..." : "Start a new game"}
            </button>
            {isSubmittingMove && (
              <span className="rounded-full border border-slate-700 px-4 py-3 text-xs uppercase tracking-wide text-slate-300">
                Waiting for engine...
              </span>
            )}
          </div>

          <div className="mt-6 aspect-square w-full max-w-[520px] self-center rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="grid h-full w-full grid-cols-8 grid-rows-8 gap-1 rounded-xl bg-slate-900/40 p-2">
              {squares}
            </div>
          </div>

          <div className="mt-6 space-y-2 text-sm">
            <p className="font-mono text-emerald-300">
              Game ID: {gameId ?? "—"}{" "}
              {normalizedApiUrl ? "" : "(API_URL missing)"}
            </p>
            <p className="text-slate-300">
              Playing as:{" "}
              <span className="font-semibold text-emerald-300">
                {sideLabel}
              </span>
            </p>
            <p className="text-slate-300">
              {gameId
                ? isPlayerTurn
                  ? "Your move."
                  : "Engine to move."
                : DEFAULT_STATUS}
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        </section>

        <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/50 p-8">
          <h2 className="text-xl font-semibold text-white">Moves</h2>
          <p className="text-sm text-slate-400">
            Track both sides of the game in standard notation.
          </p>
          <div className="mt-6 max-h-[520px] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
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
        </section>
      </div>
    </div>
  );
}

export default ChessGame;
