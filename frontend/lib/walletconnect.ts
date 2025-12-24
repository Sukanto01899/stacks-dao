"use client";

import SignClient from "@walletconnect/sign-client";
import { cvToString, type ClarityValue } from "@stacks/transactions";
import { networkName } from "./network";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const metadata = {
  name: "Stacks DAO",
  description: "Stacks DAO WalletConnect session",
  url: appUrl,
  icons: ["https://appkit-demo.reown.com/favicon.ico"],
};

const stacksChainId =
  networkName === "testnet" ? "stacks:2147483649" : "stacks:2147483648";

let signClient: SignClient | null = null;

const requiredMethods = [
  "stx_getAddresses",
  "stx_transferStx",
  "stx_signTransaction",
  "stx_signMessage",
  "stx_signStructuredMessage",
  "stx_callContract",
];

export const getWalletConnectClient = async () => {
  if (!projectId) {
    throw new Error("Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.");
  }
  if (!signClient) {
    signClient = await SignClient.init({
      projectId,
      metadata,
    });
  }
  return signClient;
};

export const getWalletConnectChainId = () => stacksChainId;

export const startWalletConnect = async () => {
  const client = await getWalletConnectClient();
  const { uri, approval } = await client.connect({
    requiredNamespaces: {
      stacks: {
        methods: requiredMethods,
        chains: [stacksChainId],
        events: [],
      },
    },
  });

  return { client, uri, approval };
};

export const disconnectWalletConnect = async (topic: string) => {
  const client = await getWalletConnectClient();
  await client.disconnect({
    topic,
    reason: {
      code: 6000,
      message: "User disconnected",
    },
  });
};

export const getSession = async (topic: string) => {
  const client = await getWalletConnectClient();
  return client.session.get(topic);
};

export const walletConnectCallContract = async ({
  topic,
  contract,
  functionName,
  functionArgs,
}: {
  topic: string;
  contract: string;
  functionName: string;
  functionArgs: ClarityValue[];
}) => {
  const client = await getWalletConnectClient();
  const args = functionArgs.map((arg) => cvToString(arg, "hex"));

  return (await client.request({
    topic,
    chainId: stacksChainId,
    request: {
      method: "stx_callContract",
      params: {
        contract,
        functionName,
        functionArgs: args,
      },
    },
  })) as { txid?: string };
};
