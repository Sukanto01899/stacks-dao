import {
  Cl,
  ClarityType,
  cvToValue,
  deserializeCV,
  serializeCV,
  type ClarityValue,
} from "@stacks/transactions";
import { daoContractId, getDaoContractParts } from "./dao";
import { isTestnet } from "./network";

export type DaoProposal = {
  id: bigint;
  proposer: string;
  recipient: string;
  amount: bigint;
  kind: string;
  token?: string | null;
  startHeight: bigint;
  endHeight: bigint;
  eta: bigint;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  queued: boolean;
  executed: boolean;
  cancelled: boolean;
  quorum: bigint;
  threshold: bigint;
  status:
    | "Pending"
    | "Voting"
    | "Queued"
    | "Ready"
    | "Executed"
    | "Cancelled"
    | "Failed";
  remainingBlocks: bigint;
  voted?: boolean;
  voteChoice?: "for" | "against" | "abstain";
};

const apiBase = isTestnet
  ? "https://api.testnet.hiro.so"
  : "https://api.hiro.so";

const unwrapOptional = (value: unknown) => {
  if (!value || typeof value !== "object") return null;
  const cv = value as { type?: ClarityType; value?: unknown };
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

const principalFromString = (value: string) => {
  if (value.includes(".")) {
    const [address, name] = value.split(".");
    return Cl.contractPrincipal(address, name);
  }
  return Cl.standardPrincipal(value);
};

export const formatMicroStx = (value: bigint) => {
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, "0");
  const trimmed = fraction.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed} STX` : `${whole} STX`;
};

export const formatGovernanceToken = (value: bigint) => {
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, "0");
  const trimmed = fraction.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed} DAO` : `${whole} DAO`;
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
  const tupleJson = cvToValue(
    unwrapped as ClarityValue,
    true
  ) as Record<string, unknown>;
  const tuple = Object.fromEntries(
    Object.entries(tupleJson).map(([key, value]) => [
      key,
      unwrapJsonValue(value),
    ])
  );
  const payload = (tuple.payload ?? {}) as Record<string, unknown>;
  const payloadNormalized = Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, unwrapJsonValue(value)])
  );
  const recipient =
    payloadNormalized.recipient ?? tuple.recipient ?? "";
  const amount = payloadNormalized.amount ?? tuple.amount ?? 0;
  const kind = payloadNormalized.kind ?? "stx-transfer";
  return {
    id: proposalId,
    proposer: String(tuple.proposer ?? ""),
    recipient: String(recipient),
    amount: toBigInt(amount),
    kind: String(kind),
    token: payloadNormalized.token ? String(payloadNormalized.token) : null,
    startHeight: toBigInt(tuple["start-height"]),
    endHeight: toBigInt(tuple["end-height"]),
    eta: tuple.eta ? toBigInt(tuple.eta) : 0n,
    forVotes: toBigInt(tuple["for-votes"]),
    againstVotes: toBigInt(tuple["against-votes"]),
    abstainVotes: tuple["abstain-votes"] ? toBigInt(tuple["abstain-votes"]) : 0n,
    queued: Boolean(tuple.queued),
    executed: Boolean(tuple.executed),
    cancelled: Boolean(tuple.cancelled),
    quorum: tuple.quorum ? toBigInt(tuple.quorum) : 0n,
    threshold: tuple.threshold ? toBigInt(tuple.threshold) : 0n,
  };
};

const getReceiptById = async (
  address: string,
  name: string,
  proposalId: bigint,
  voter: string
) => {
  const key = Cl.tuple({
    id: Cl.uint(proposalId),
    voter: principalFromString(voter),
  });
  const keyHex = `0x${serializeCV(key)}`;
  const response = await fetch(
    `${apiBase}/v2/map_entry/${address}/${name}/receipts?proof=0`,
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
    return null;
  }
  const json = (await response.json()) as { data?: string };
  if (!json.data) {
    return null;
  }
  const cv = deserializeCV(json.data);
  const unwrapped = unwrapOptional(cv);
  if (!unwrapped) return null;
  const tupleJson = cvToValue(
    unwrapped as ClarityValue,
    true
  ) as Record<string, unknown>;
  const tuple = Object.fromEntries(
    Object.entries(tupleJson).map(([key, value]) => [
      key,
      unwrapJsonValue(value),
    ])
  );
  const choice = toBigInt(tuple.choice);
  return {
    choice,
    weight: toBigInt(tuple.weight),
  };
};

export const listDaoProposals = async (options?: { voter?: string }) => {
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
    const participation =
      entry.forVotes + entry.againstVotes + entry.abstainVotes;
    const passed =
      participation >= entry.quorum && entry.forVotes > entry.againstVotes;
    let status: DaoProposal["status"] = "Ready";
    let remainingBlocks = 0n;

    if (entry.cancelled) {
      status = "Cancelled";
    } else if (entry.executed) {
      status = "Executed";
    } else if (tipHeight < entry.startHeight) {
      status = "Pending";
      remainingBlocks = entry.startHeight - tipHeight;
    } else if (tipHeight <= entry.endHeight) {
      status = "Voting";
      remainingBlocks = entry.endHeight - tipHeight;
    } else if (entry.queued) {
      if (tipHeight < entry.eta) {
        status = "Queued";
        remainingBlocks = entry.eta - tipHeight;
      } else {
        status = "Ready";
      }
    } else if (!passed) {
      status = "Failed";
    }
    const receipt = options?.voter
      ? await getReceiptById(parts.address, parts.name, id, options.voter)
      : null;

    proposals.push({
      ...entry,
      status,
      remainingBlocks,
      voted: Boolean(receipt),
      voteChoice:
        receipt?.choice === 1n
          ? "for"
          : receipt?.choice === 2n
            ? "abstain"
            : receipt
              ? "against"
              : undefined,
    });
  }

  return {
    proposals: proposals.reverse(),
    tipHeight,
  };
};
