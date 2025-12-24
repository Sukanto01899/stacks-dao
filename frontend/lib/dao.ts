import { Cl } from "@stacks/transactions";
import { isTestnet } from "./network";

export const daoContractId = process.env.NEXT_PUBLIC_DAO_CONTRACT ?? "";

export const getDaoContractParts = () => {
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
