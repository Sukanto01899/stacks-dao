import { describe, expect, it } from "vitest";
import { Cl, cvToValue } from "@stacks/transactions";

const contract = "dao-core-v4";
const accounts = simnet.getAccounts();
const proposer = accounts.get("wallet_1")!;
const recipient = accounts.get("wallet_2")!;

const proposalId = Cl.uint(1);

const getProposal = () => {
  const entry = simnet.getMapEntry(
    contract,
    "proposals",
    Cl.tuple({ id: proposalId })
  );
  return cvToValue(entry) as any;
};

const getStxBalance = (principal: string) => {
  const assets = simnet.getAssetsMap();
  const stxBalances = assets.get("STX");
  return stxBalances?.get(principal) ?? 0n;
};

describe("dao-core-v4 governance", () => {
  it("blocks lock/unlock during active proposals and rejects zero locks", () => {
    const zeroLock = simnet.callPublicFn(
      contract,
      "lock-stx",
      [Cl.uint(0)],
      proposer
    );
    expect(zeroLock.result).toBeErr(Cl.uint(110)); // ERR_INVALID_AMOUNT

    const lock = simnet.callPublicFn(
      contract,
      "lock-stx",
      [Cl.uint(1_000_000)],
      proposer
    );
    expect(lock.result).toBeOk(Cl.bool(true));

    const propose = simnet.callPublicFn(
      contract,
      "propose",
      [Cl.principal(recipient), Cl.uint(1)],
      proposer
    );
    expect(propose.result).toBeOk(proposalId);

    const lockDuring = simnet.callPublicFn(
      contract,
      "lock-stx",
      [Cl.uint(1)],
      proposer
    );
    expect(lockDuring.result).toBeErr(Cl.uint(107)); // ERR_ACTIVE_PROPOSAL

    const unlockDuring = simnet.callPublicFn(
      contract,
      "unlock-stx",
      [Cl.uint(1)],
      proposer
    );
    expect(unlockDuring.result).toBeErr(Cl.uint(107)); // ERR_ACTIVE_PROPOSAL
  });

  it("requires locked power to propose and validates vote choice", () => {
    const proposeNoPower = simnet.callPublicFn(
      contract,
      "propose",
      [Cl.principal(recipient), Cl.uint(1)],
      proposer
    );
    expect(proposeNoPower.result).toBeErr(Cl.uint(106)); // ERR_INSUFFICIENT_POWER

    simnet.callPublicFn(contract, "lock-stx", [Cl.uint(1_000_000)], proposer);

    const propose = simnet.callPublicFn(
      contract,
      "propose",
      [Cl.principal(recipient), Cl.uint(1)],
      proposer
    );
    expect(propose.result).toBeOk(proposalId);

    const invalidChoice = simnet.callPublicFn(
      contract,
      "cast-vote",
      [proposalId, Cl.uint(2)],
      proposer
    );
    expect(invalidChoice.result).toBeErr(Cl.uint(108)); // ERR_INVALID_CHOICE
  });

  it("enforces timelock before execution", () => {
    simnet.callPublicFn(contract, "lock-stx", [Cl.uint(1_000_000)], proposer);

    const propose = simnet.callPublicFn(
      contract,
      "propose",
      [Cl.principal(recipient), Cl.uint(1)],
      proposer
    );
    expect(propose.result).toBeOk(proposalId);

    const vote = simnet.callPublicFn(
      contract,
      "cast-vote",
      [proposalId, Cl.uint(1)],
      proposer
    );
    expect(vote.result).toBeOk(Cl.bool(true));

    const earlyExecution = simnet.callPublicFn(
      contract,
      "execute",
      [proposalId],
      proposer
    );
    expect(earlyExecution.result).toBeErr(Cl.uint(109)); // ERR_TIMELOCK

    const proposal = getProposal();
    const executeAfter = BigInt(proposal.value["execute-after"].value);
    const currentHeight = BigInt(simnet.blockHeight);
    const blocksToMine = executeAfter > currentHeight ? Number(executeAfter - currentHeight) : 0;
    if (blocksToMine > 0) simnet.mineEmptyBlocks(blocksToMine);

    const execution = simnet.callPublicFn(contract, "execute", [proposalId], proposer);
    expect(execution.result).toBeOk(Cl.bool(true));
  });

  it("rejects execution after the timelock window", () => {
    simnet.callPublicFn(contract, "lock-stx", [Cl.uint(1_000_000)], proposer);

    const propose = simnet.callPublicFn(
      contract,
      "propose",
      [Cl.principal(recipient), Cl.uint(1)],
      proposer
    );
    expect(propose.result).toBeOk(proposalId);

    simnet.callPublicFn(
      contract,
      "cast-vote",
      [proposalId, Cl.uint(1)],
      proposer
    );

    const proposal = getProposal();
    const executeBefore = BigInt(proposal.value["execute-before"].value);
    const currentHeight = BigInt(simnet.blockHeight);
    const blocksToMine = executeBefore >= currentHeight
      ? Number(executeBefore - currentHeight + 1n)
      : 0;
    if (blocksToMine > 0) simnet.mineEmptyBlocks(blocksToMine);

    const execution = simnet.callPublicFn(contract, "execute", [proposalId], proposer);
    expect(execution.result).toBeErr(Cl.uint(101)); // ERR_VOTING_CLOSED
  });

  it("executes from treasury and transfers STX", () => {
    const contractPrincipal = `${simnet.deployer}.${contract}`;
    const amount = 1_000_000;

    simnet.callPublicFn(contract, "lock-stx", [Cl.uint(2_000_000)], proposer);

    const recipientBefore = getStxBalance(recipient);
    const contractBefore = getStxBalance(contractPrincipal);

    const propose = simnet.callPublicFn(
      contract,
      "propose",
      [Cl.principal(recipient), Cl.uint(amount)],
      proposer
    );
    expect(propose.result).toBeOk(proposalId);

    simnet.callPublicFn(
      contract,
      "cast-vote",
      [proposalId, Cl.uint(1)],
      proposer
    );

    const proposal = getProposal();
    const executeAfter = BigInt(proposal.value["execute-after"].value);
    const currentHeight = BigInt(simnet.blockHeight);
    const blocksToMine = executeAfter > currentHeight ? Number(executeAfter - currentHeight) : 0;
    if (blocksToMine > 0) simnet.mineEmptyBlocks(blocksToMine);

    const execution = simnet.callPublicFn(contract, "execute", [proposalId], proposer);
    expect(execution.result).toBeOk(Cl.bool(true));

    const recipientAfter = getStxBalance(recipient);
    const contractAfter = getStxBalance(contractPrincipal);

    expect(recipientAfter - recipientBefore).toBe(BigInt(amount));
    expect(contractBefore - contractAfter).toBe(BigInt(amount));
  });
});
