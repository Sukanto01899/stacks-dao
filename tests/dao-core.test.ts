import { describe, expect, it } from "vitest";
import { Cl, cvToValue } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const proposer = accounts.get("wallet_1")!;
const recipient = accounts.get("wallet_2")!;
const voters = Array.from(accounts.values()).slice(0, 10);

const proposalId = Cl.uint(1);
const forChoice = Cl.uint(1);

const buildArgs = (to: string, amount = 1) => [
  Cl.principal(to),
  Cl.uint(amount),
];

describe("dao-core governance", () => {

  it("queues a passing proposal and surfaces execution failures", () => {
    const proposal = simnet.callPublicFn(
      "dao-core-v3",
      "propose",
      buildArgs(recipient, 1),
      proposer
    );
    expect(proposal.result).toBeOk(proposalId);

    voters.forEach((voter) => {
      const vote = simnet.callPublicFn(
        "dao-core-v3",
        "cast-vote",
        [proposalId, forChoice],
        voter
      );
      expect(vote.result).toBeOk(Cl.bool(true));
    });

    const tally = cvToValue(
      simnet.getMapEntry("dao-core-v3", "proposals", Cl.tuple({ id: proposalId }))
    ) as any;
    expect(BigInt(tally.value["for-votes"].value)).toBe(10n);

    simnet.mineEmptyBlocks(1500);

    const execution = simnet.callPublicFn(
      "dao-core-v3",
      "execute",
      [proposalId],
      proposer
    );
    expect(execution.result).toBeErr(Cl.uint(105)); // ERR_TRANSFER_FAILED

    const finalState = cvToValue(
      simnet.getMapEntry("dao-core-v3", "proposals", Cl.tuple({ id: proposalId }))
    ) as any;
    expect(finalState.value.executed.value).toBe(false);
  });

});
