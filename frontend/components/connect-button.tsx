"use client";

import { useState } from "react";
import { useWallet } from "./wallet-provider";

export function ConnectButton() {
  const { address, handleConnect, handleDisconnect, connecting } = useWallet();
  const [busy, setBusy] = useState(false);

  const short = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const onClick = async () => {
    if (busy || connecting) return;
    try {
      setBusy(true);
      if (address) {
        handleDisconnect();
      } else {
        await handleConnect();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={onClick}
      className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/20"
      disabled={busy || connecting}
    >
      {busy || connecting
        ? "..."
        : address
          ? `Disconnect ${short}`
          : "Connect Stacks wallet"}
    </button>
  );
}
