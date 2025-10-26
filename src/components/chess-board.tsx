"use client";

import Image from "next/image";
import type { PieceSymbol, Square } from "chess.js";

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

type BoardPiece = {
  type: PieceSymbol;
  color: "w" | "b";
};

export type BoardState = (BoardPiece | null)[][];

type ChessBoardProps = {
  boardState: BoardState;
  perspective: "w" | "b";
  selectedSquare: Square | null;
  availableTargets: Square[];
  lastMove: { from: Square; to: Square } | null;
  onSquareClick: (square: Square) => void;
  isSubmittingMove: boolean;
  disabled: boolean;
};

export function ChessBoard({
  boardState,
  perspective,
  selectedSquare,
  availableTargets,
  lastMove,
  onSquareClick,
  isSubmittingMove,
  disabled,
}: ChessBoardProps) {
  const baseIndices = [0, 1, 2, 3, 4, 5, 6, 7];
  const rowOrder =
    perspective === "w" ? baseIndices : [...baseIndices].reverse();
  const columnOrder =
    perspective === "w" ? baseIndices : [...baseIndices].reverse();

  const renderedSquares = rowOrder.flatMap((rowIdx, displayRowIndex) =>
    columnOrder.map((colIdx, displayColumnIndex) => {
      const rank = 8 - displayRowIndex;
      const file = FILES[displayColumnIndex];
      const squareName = `${file}${rank}` as Square;
      const isLight = (displayRowIndex + displayColumnIndex) % 2 === 0;
      const square = boardState[rowIdx][colIdx];
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
          onClick={() => onSquareClick(squareName)}
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
          disabled={disabled}
        >
          {pieceAsset ? (
            <div className="relative h-[75%] w-[75%] min-h-0 min-w-0">
              <Image
                src={pieceAsset.src}
                alt={pieceAsset.alt}
                fill
                sizes="(max-width: 640px) 9vw, (max-width: 1024px) 5vw, 64px"
                className="select-none object-contain"
                draggable={false}
                priority={pieceKey?.startsWith("w") ?? false}
              />
            </div>
          ) : null}
        </button>
      );
    }),
  );

  return (
    <div className="flex h-full w-full items-center justify-center min-h-0">
      <div className="aspect-square h-full max-h-full w-full max-w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-2 sm:p-4">
        <div className="grid h-full w-full grid-cols-8 grid-rows-8 gap-0.5 rounded-xl bg-slate-900/40 p-1 sm:gap-1 sm:p-2">
          {renderedSquares}
        </div>
      </div>
    </div>
  );
}

export default ChessBoard;
