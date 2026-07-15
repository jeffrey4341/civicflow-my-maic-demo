import Image from "next/image";
import Link from "next/link";

import { OfficerNav } from "@/components/officer/OfficerNav";
import { ResetButton } from "@/components/officer/ResetButton";

export default function OfficerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium leading-5 text-amber-950" role="note">
        Officer workspace · Synthetic demo data only · Human review and approval remain required
      </aside>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center justify-between gap-4">
            <Link href="/officer" className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2">
              <Image src="/civicflow-mark.svg" alt="" width={36} height={36} priority />
              <span>
                <span className="block font-semibold leading-5 text-slate-950">CivicFlow MY</span>
                <span className="block text-xs leading-4 text-slate-500">Officer workspace</span>
              </span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/m" className="hidden min-h-11 items-center text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline sm:flex">
                Citizen services
              </Link>
              <ResetButton />
            </div>
          </div>
          <div className="overflow-x-auto border-t border-slate-100">
            <OfficerNav />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">{children}</main>
    </div>
  );
}
