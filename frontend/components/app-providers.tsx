"use client";

import { AppKitProvider } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { sepolia } from "@reown/appkit/networks";
import { WalletProvider } from "@/components/wallet-provider";

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const networks = [sepolia] as const;
const metadata = {
  name: "Stacks DAO",
  description: "Treasury governance on Stacks with wallet-driven voting.",
  url: appUrl,
  icons: ["https://appkit-demo.reown.com/favicon.ico"],
};

 const wagmiAdapter = projectId
   ? new WagmiAdapter({
       projectId,
       networks,
     })
   : null;

 export function AppProviders({ children }: { children: React.ReactNode }) {
   if (!projectId || !wagmiAdapter) {
     return <WalletProvider>{children}</WalletProvider>;
   }

   return (
     <AppKitProvider
       adapters={[wagmiAdapter]}
       networks={networks}
       projectId={projectId}
       metadata={metadata}
       themeMode="dark"
       themeVariables={{
         "--w3m-accent": "#f97316",
         "--w3m-border-radius-master": "999px",
         "--w3m-font-family": "Space Grotesk, ui-sans-serif, system-ui",
       }}
     >
       <WalletProvider>{children}</WalletProvider>
     </AppKitProvider>
   );
 }
