"use client";

import {
  connect,
  disconnect,
  getLocalStorage,
  isConnected,
  request,
} from "@stacks/connect";
import type { ClarityValue } from "@stacks/transactions";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  disconnectWalletConnect,
  getWalletConnectChainId,
  getSession,
  startWalletConnect,
  walletConnectCallContract,
} from "@/lib/walletconnect";

type WalletContextValue = {
  address: string | null;
  walletType: "stacks-connect" | "walletconnect" | null;
  handleConnect: () => Promise<void>;
  handleWalletConnect: () => Promise<void>;
  handleDisconnect: () => void;
  walletConnectUri: string | null;
  clearWalletConnectUri: () => void;
  callContract: (params: {
    contract: string;
    functionName: string;
    functionArgs: ClarityValue[];
    network?: string;
  }) => Promise<{ txid?: string }>;
  connecting: boolean;
};

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<
    "stacks-connect" | "walletconnect" | null
  >(null);
  const [walletConnectTopic, setWalletConnectTopic] = useState<string | null>(
    null
  );
  const [walletConnectUri, setWalletConnectUri] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      if (isConnected()) {
        const cache = getLocalStorage();
        const stored =
          cache?.addresses?.stx?.[0]?.address ||
          cache?.addresses?.btc?.[0]?.address ||
          null;
        if (stored) {
          setAddress(stored);
          setWalletType("stacks-connect");
          return;
        }
      }

      const saved = localStorage.getItem("walletconnect.session");
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved) as {
          topic?: string;
          address?: string;
        };
        if (!parsed.topic || !parsed.address) return;
        await getSession(parsed.topic);
        setAddress(parsed.address);
        setWalletType("walletconnect");
        setWalletConnectTopic(parsed.topic);
      } catch {
        localStorage.removeItem("walletconnect.session");
      }
    };

    void hydrate();
  }, []);

  const handleConnect = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      if (walletType === "walletconnect" && walletConnectTopic) {
        await disconnectWalletConnect(walletConnectTopic);
        localStorage.removeItem("walletconnect.session");
        setWalletConnectTopic(null);
      }
      const response = await connect({
        forceWalletSelect: true,
      });
      const addresses = (response as { addresses?: any })?.addresses;
      const stxAddress =
        addresses?.stx?.[0]?.address || addresses?.[0]?.address || null;
      setAddress(stxAddress);
      setWalletType(stxAddress ? "stacks-connect" : null);
    } finally {
      setConnecting(false);
    }
  }, [connecting, walletType, walletConnectTopic]);

  const handleWalletConnect = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      if (walletType === "stacks-connect") {
        disconnect();
      }
      const { client, uri, approval } = await startWalletConnect();
      if (uri) {
        setWalletConnectUri(uri);
      }
      const session = await approval();
      setWalletConnectUri(null);

      const response = (await client.request({
        topic: session.topic,
        chainId: getWalletConnectChainId(),
        request: {
          method: "stx_getAddresses",
          params: {},
        },
      })) as {
        addresses?: Array<{ symbol?: string; address?: string }>;
      };

      const addresses = response?.addresses ?? [];
      const stx =
        addresses.find((entry) => entry.symbol === "STX") ?? addresses[0];
      if (!stx?.address) {
        throw new Error("No STX address returned from WalletConnect.");
      }

      const sessionData = {
        topic: session.topic,
        address: stx.address,
      };

      setAddress(sessionData.address);
      setWalletType("walletconnect");
      setWalletConnectTopic(sessionData.topic);
      localStorage.setItem(
        "walletconnect.session",
        JSON.stringify(sessionData)
      );
    } finally {
      setConnecting(false);
    }
  }, [connecting, walletType]);

  const handleDisconnect = useCallback(() => {
    if (walletType === "walletconnect" && walletConnectTopic) {
      void disconnectWalletConnect(walletConnectTopic);
      localStorage.removeItem("walletconnect.session");
      setWalletConnectTopic(null);
      setWalletConnectUri(null);
    } else {
      disconnect();
    }
    setAddress(null);
    setWalletType(null);
    setConnecting(false);
  }, [walletType, walletConnectTopic]);

  const clearWalletConnectUri = useCallback(() => {
    setWalletConnectUri(null);
  }, []);

  const callContract = useCallback(
    async ({
      contract,
      functionName,
      functionArgs,
      network,
    }: {
      contract: string;
      functionName: string;
      functionArgs: ClarityValue[];
      network?: string;
    }) => {
      if (walletType === "walletconnect" && walletConnectTopic) {
        return await walletConnectCallContract({
          topic: walletConnectTopic,
          contract,
          functionName,
          functionArgs,
        });
      }

      const typedContract = contract as `${string}.${string}`;
      return (await request("stx_callContract", {
        contract: typedContract,
        functionName,
        functionArgs,
        network,
      })) as { txid?: string };
    },
    [walletType, walletConnectTopic]
  );

  const value = useMemo(
    () => ({
      address,
      walletType,
      handleConnect,
      handleWalletConnect,
      handleDisconnect,
      walletConnectUri,
      clearWalletConnectUri,
      callContract,
      connecting,
    }),
    [
      address,
      walletType,
      connecting,
      handleConnect,
      handleWalletConnect,
      handleDisconnect,
      walletConnectUri,
      clearWalletConnectUri,
      callContract,
    ]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
