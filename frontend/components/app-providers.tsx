"use client";

import { WalletProvider } from "@/components/wallet-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
