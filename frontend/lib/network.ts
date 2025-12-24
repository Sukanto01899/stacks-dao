import { networkFromName } from "@stacks/network";

type StacksNetworkName = "mainnet" | "testnet" | "devnet" | "mocknet";

const normalizeNetworkName = (value: string): StacksNetworkName => {
  const name = value.toLowerCase();
  if (
    name === "mainnet" ||
    name === "testnet" ||
    name === "devnet" ||
    name === "mocknet"
  ) {
    return name;
  }
  return "testnet";
};

export const networkName = normalizeNetworkName(
  process.env.NEXT_PUBLIC_STACKS_NETWORK ?? "testnet"
);
export const isTestnet = networkName !== "mainnet";
export const network = networkFromName(networkName);
