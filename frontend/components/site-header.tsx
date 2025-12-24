"use client";

import Link from "next/link";
import { WalletConnectMenu } from "./wallet-connect-menu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0b0d10]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.3em]">
          Stacks DAO
        </Link>
        <nav className="flex items-center gap-6 text-xs uppercase tracking-[0.3em] text-white/70">
          <Link href="/vote" className="transition hover:text-white">
            Vote
          </Link>
          <Link href="/create-proposal" className="transition hover:text-white">
            Create proposal
          </Link>
        </nav>
        <WalletConnectMenu />
      </div>
    </header>
  );
}
