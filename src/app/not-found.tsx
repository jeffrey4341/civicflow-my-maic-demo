import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-6 text-center">
      <p className="text-sm font-semibold text-civic-800">404</p>
      <h1 className="mt-2 text-xl font-bold text-slate-800">Not found</h1>
      <p className="mt-1 text-sm text-slate-600">
        That case or page does not exist. Check the tracking code, or start again.
      </p>
      <div className="mt-6 flex gap-3 text-sm">
        <Link href="/m" className="inline-flex min-h-11 items-center rounded-lg bg-civic-700 px-4 font-medium text-white outline-none hover:bg-civic-800 focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2">
          Citizen app
        </Link>
        <Link href="/officer" className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-medium text-slate-700 outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2">
          Officer console
        </Link>
      </div>
    </main>
  );
}
