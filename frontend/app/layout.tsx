import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";
import { SiteHeader } from "@/components/site-header";
import { WalletConnectQrModal } from "@/components/walletconnect-qr-modal";

export const metadata: Metadata = {
  title: "Stacks DAO",
  description: "Token-governed treasury DAO on Stacks chain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#0b0d10] text-white">
        <AppProviders>
          <SiteHeader />
          <WalletConnectQrModal />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
