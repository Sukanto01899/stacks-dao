import { Cl } from "@stacks/transactions";
import { isTestnet } from "./network";
import { appConfig } from "./config";

const normalizeContractId = (value: string) => value.trim();

export const daoContractId = normalizeContractId(
  appConfig.contracts.daoCore ?? ""
);

export const isValidContractId = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes(" ")) return false;
  const parts = trimmed.split(".");
  if (parts.length !== 2) return false;
  const [address, name] = parts;
  return Boolean(address && name);
};

export const getDaoContractParts = () => {
  if (!daoContractId || !isValidContractId(daoContractId)) return null;
  const [address, name] = daoContractId.split(".");
  if (!address || !name) return null;
  return { address, name };
};

export const parsePrincipal = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes(".")) {
    const [address, name] = trimmed.split(".");
    if (!address || !name) return null;
    return Cl.contractPrincipal(address, name);
  }
  return Cl.standardPrincipal(trimmed);
};

export const parseUint = (value: string) => {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return BigInt(trimmed);
};

export const stxToMicroStx = (value: string) => {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{0,6})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  const paddedFraction = (fraction + "000000").slice(0, 6);
  return BigInt(whole) * 1_000_000n + BigInt(paddedFraction);
};

export const explorerTxUrl = (txid: string) =>
  isTestnet
    ? `https://explorer.hiro.so/txid/${txid}?chain=testnet`
    : `https://explorer.hiro.so/txid/${txid}`;
