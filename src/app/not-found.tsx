import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-6 text-center">
      <p className="text-5xl">🔎</p>
      <h1 className="mt-4 text-xl font-bold text-slate-800">Not found</h1>
      <p className="mt-1 text-sm text-slate-500">
        That case or page does not exist. Check the tracking code, or start again.
      </p>
      <div className="mt-6 flex gap-3 text-sm">
        <Link href="/m" className="rounded-lg bg-civic-600 px-4 py-2 font-medium text-white hover:bg-civic-700">
          Citizen app
        </Link>
        <Link href="/officer" className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-600 hover:bg-white">
          Officer console
        </Link>
      </div>
    </main>
  );
}
