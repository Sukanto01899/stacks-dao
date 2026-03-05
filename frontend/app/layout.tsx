import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";
import { SiteHeader } from "@/components/site-header";
import { WalletConnectQrModal } from "@/components/walletconnect-qr-modal";

export const metadata: Metadata = {
  title: "Stacks DAO",
  description: "Token-governed treasury DAO on Stacks chain",
  other: {
    "talentapp:project_verification":
      "c10afd5a36ab15a431c7083d2da03990702afc6f9d385f3e16ec0523d5424ba0923d35e3a517a035830830e722ed2ca9d2c43069de772deca273356d74d3cd2f",
  },
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
