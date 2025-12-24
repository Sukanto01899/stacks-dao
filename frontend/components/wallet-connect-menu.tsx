"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "./wallet-provider";

const walletConnectEnabled = Boolean(
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
);

function StacksOnlyButton() {
  const { handleConnect, handleDisconnect, connecting, address } = useWallet();

  const short = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const onStacksConnect = async () => {
    await handleConnect();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void onStacksConnect()}
        disabled={connecting}
        className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:border-white/40 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {connecting ? "Connecting..." : short ? `Connected ${short}` : "Connect"}
      </button>
      {short ? (
        <button
          type="button"
          onClick={handleDisconnect}
          className="rounded-full border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/70 transition hover:border-white/30 hover:text-white"
        >
          Disconnect
        </button>
      ) : null}
    </div>
  );
}

function WalletMenu() {
  const {
    handleConnect,
    handleWalletConnect,
    handleDisconnect,
    connecting,
    address,
  } = useWallet();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const short = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const onStacksConnect = async () => {
    setOpen(false);
    await handleConnect();
  };

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (event.target instanceof Node && menuRef.current.contains(event.target))
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:border-white/40 hover:bg-white/20"
      >
        {short ? `Connected ${short}` : "Connect wallet"}
      </button>
      {open ? (
        <div className="absolute right-0 mt-3 w-48 rounded-2xl border border-white/10 bg-[#12151b] p-2 text-xs text-white/80 shadow-xl">
          {short ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                handleDisconnect();
              }}
              className="w-full rounded-xl px-3 py-2 text-left transition hover:bg-white/10"
            >
              Disconnect
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void onStacksConnect()}
                className="w-full rounded-xl px-3 py-2 text-left transition hover:bg-white/10"
                disabled={connecting}
              >
                Stacks Connect
              </button>
              <button
                type="button"
                onClick={() => void handleWalletConnect()}
                className="mt-1 w-full rounded-xl px-3 py-2 text-left transition hover:bg-white/10"
                disabled={connecting || !walletConnectEnabled}
              >
                WalletConnect (Stacks)
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function WalletConnectMenu() {
  if (!walletConnectEnabled) {
    return <StacksOnlyButton />;
  }
  return <WalletMenu />;
}
