import { networkFromName } from "@stacks/network";
import { appConfig } from "./config";

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

export const networkName = normalizeNetworkName(appConfig.stacksNetwork);
export const isTestnet = networkName !== "mainnet";
export const network = networkFromName(networkName);
