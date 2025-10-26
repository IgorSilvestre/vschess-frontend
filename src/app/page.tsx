import NewGameForm from "@/components/new-game-form";

export default function Home() {
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:flex-row">
        <div className="flex-1">
          <NewGameForm apiUrl={apiUrl} />
        </div>
      </div>
    </main>
  );
}
