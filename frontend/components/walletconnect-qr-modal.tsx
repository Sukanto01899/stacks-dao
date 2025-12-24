"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useWallet } from "./wallet-provider";

export function WalletConnectQrModal() {
  const { walletConnectUri, clearWalletConnectUri } = useWallet();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!walletConnectUri) {
      setQrDataUrl(null);
      return;
    }
    let active = true;
    const load = async () => {
      const url = await QRCode.toDataURL(walletConnectUri, {
        margin: 1,
        width: 260,
        color: {
          dark: "#ffffff",
          light: "#0b0d10",
        },
      });
      if (active) {
        setQrDataUrl(url);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [walletConnectUri]);

  if (!walletConnectUri) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#101319] p-6 text-white shadow-2xl">
        <h2 className="text-lg font-semibold">WalletConnect</h2>
        <p className="mt-2 text-sm text-white/60">
          Scan with Leather or Xverse to connect.
        </p>
        <div className="mt-5 flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="WalletConnect QR code" />
          ) : (
            <span className="text-xs text-white/60">Generating QR...</span>
          )}
        </div>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(walletConnectUri).catch(() => {});
            }}
            className="flex-1 rounded-2xl border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/80 transition hover:border-white/30"
          >
            Copy URI
          </button>
          <button
            type="button"
            onClick={clearWalletConnectUri}
            className="flex-1 rounded-2xl bg-orange-500/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-orange-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
