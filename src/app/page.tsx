import ChessGame from "@/components/chess-game";

export default function Home() {
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";

  return <ChessGame apiUrl={apiUrl} />;
}
