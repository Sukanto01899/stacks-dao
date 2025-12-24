import {
  Cl,
  ClarityType,
  cvToValue,
  deserializeCV,
  serializeCV,
} from "@stacks/transactions";
import { daoContractId, getDaoContractParts } from "./dao";
import { isTestnet } from "./network";

export type DaoProposal = {
  id: bigint;
  proposer: string;
  recipient: string;
  amount: bigint;
  startHeight: bigint;
  endHeight: bigint;
  forVotes: bigint;
  againstVotes: bigint;
  executed: boolean;
  status: "Voting" | "Ready" | "Executed" | "Pending";
  remainingBlocks: bigint;
};

const apiBase = isTestnet
  ? "https://api.testnet.hiro.so"
  : "https://api.hiro.so";

const unwrapOptional = (value: unknown) => {
  if (!value || typeof value !== "object") return null;
  const cv = value as { type: number; value?: unknown };
  if (cv.type === ClarityType.OptionalNone) return null;
  if (cv.type === ClarityType.OptionalSome) return cv.value ?? null;
  return value;
};

const unwrapJsonValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(unwrapJsonValue);
  }
  if (!value || typeof value !== "object") return value;
  const record = value as { type?: string; value?: unknown; success?: boolean };
  if ("type" in record && "value" in record) {
    return unwrapJsonValue(record.value);
  }
  return value;
};

const toBigInt = (value: unknown) => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  return 0n;
};

export const formatMicroStx = (value: bigint) => {
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, "0");
  const trimmed = fraction.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed} STX` : `${whole} STX`;
};

const getTipHeight = async () => {
  const response = await fetch(`${apiBase}/v2/info`);
  if (!response.ok) {
    throw new Error("Failed to fetch chain info.");
  }
  const data = (await response.json()) as { stacks_tip_height: number };
  return BigInt(data.stacks_tip_height);
};

const getNextProposalId = async (address: string, name: string) => {
  const response = await fetch(
    `${apiBase}/v2/data_var/${address}/${name}/next-proposal-id?proof=0`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch next proposal id.");
  }
  const json = (await response.json()) as { data?: string };
  if (!json.data) {
    throw new Error("No data for next proposal id.");
  }
  const cv = deserializeCV(json.data);
  return toBigInt(cvToValue(cv));
};

const getProposalById = async (
  address: string,
  name: string,
  proposalId: bigint
) => {
  const key = Cl.tuple({ id: Cl.uint(proposalId) });
  const keyHex = `0x${serializeCV(key)}`;
  const response = await fetch(
    `${apiBase}/v2/map_entry/${address}/${name}/proposals?proof=0`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(keyHex),
    }
  );
  if (!response.ok) {
    throw new Error("Failed to fetch proposal.");
  }
  const json = (await response.json()) as { data?: string };
  if (!json.data) {
    return null;
  }
  const cv = deserializeCV(json.data);
  const unwrapped = unwrapOptional(cv);
  if (!unwrapped) return null;
  const tupleJson = cvToValue(unwrapped, true) as Record<string, unknown>;
  const tuple = Object.fromEntries(
    Object.entries(tupleJson).map(([key, value]) => [
      key,
      unwrapJsonValue(value),
    ])
  );
  return {
    id: proposalId,
    proposer: String(tuple.proposer ?? ""),
    recipient: String(tuple.recipient ?? ""),
    amount: toBigInt(tuple.amount),
    startHeight: toBigInt(tuple["start-height"]),
    endHeight: toBigInt(tuple["end-height"]),
    forVotes: toBigInt(tuple["for-votes"]),
    againstVotes: toBigInt(tuple["against-votes"]),
    executed: Boolean(tuple.executed),
  };
};

export const listDaoProposals = async () => {
  const parts = getDaoContractParts();
  if (!parts || !daoContractId) {
    return { proposals: [], tipHeight: 0n };
  }

  const [tipHeight, nextProposalId] = await Promise.all([
    getTipHeight(),
    getNextProposalId(parts.address, parts.name),
  ]);

  const proposals: DaoProposal[] = [];
  const last = nextProposalId > 0n ? nextProposalId - 1n : 0n;
  const first = last > 50n ? last - 49n : 1n;

  for (let id = first; id <= last; id += 1n) {
    const entry = await getProposalById(parts.address, parts.name, id);
    if (!entry) continue;
    const remainingBlocks =
      tipHeight < entry.endHeight ? entry.endHeight - tipHeight : 0n;
    let status: DaoProposal["status"] = "Ready";
    if (entry.executed) {
      status = "Executed";
    } else if (tipHeight < entry.startHeight) {
      status = "Pending";
    } else if (tipHeight <= entry.endHeight) {
      status = "Voting";
    }
    proposals.push({
      ...entry,
      status,
      remainingBlocks,
    });
  }

  return {
    proposals: proposals.reverse(),
    tipHeight,
  };
};
