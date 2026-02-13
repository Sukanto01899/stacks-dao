"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Cl } from "@stacks/transactions";
import { useWallet } from "@/components/wallet-provider";
import { networkName } from "@/lib/network";
import {
  daoContractId,
  explorerTxUrl,
  getDaoContractParts,
  parseUint,
} from "@/lib/dao";
import {
  formatGovernanceToken,
  formatMicroStx,
  listDaoProposals,
} from "@/lib/dao-client";

const choiceMap = {
  for: 1n,
  against: 0n,
} as const;

function VotePageContent() {
  const { address, callContract } = useWallet();
  const searchParams = useSearchParams();
  const [proposalId, setProposalId] = useState("");
  const [proposals, setProposals] = useState<
    Awaited<ReturnType<typeof listDaoProposals>>["proposals"]
  >([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [choice, setChoice] = useState<"for" | "against">("for");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setProposalId(id);
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoadingProposals(true);
      setProposalError(null);
      try {
        const { proposals: fetched } = await listDaoProposals({
          voter: address ?? undefined,
        });
        if (active) {
          setProposals(fetched);
        }
      } catch (err) {
        if (active) {
          setProposalError(
            err instanceof Error ? err.message : "Failed to load proposals.",
          );
        }
      } finally {
        if (active) {
          setLoadingProposals(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [address]);

  const selectedProposal = proposals.find(
    (proposal) => proposal.id.toString() === proposalId,
  );

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setTxid(null);

    if (!address) {
      setError("Connect a Stacks wallet first.");
      return;
    }

    if (!daoContractId) {
      setError("DAO contract is missing from config.");
      return;
    }

    const id = parseUint(proposalId);
    if (id === null) {
      setError("Enter a valid proposal id.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await callContract({
        contract: daoContractId,
        functionName: "cast-vote",
        functionArgs: [Cl.uint(id), Cl.uint(choiceMap[choice])],
        network: networkName,
      });
      const tx = response?.txid ?? null;
      if (!tx) {
        setError("No transaction id returned from wallet");
      } else {
        setTxid(tx);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cast vote");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-16 text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-white/30"
          >
            Back
          </Link>
        </div>

        <div className="glass-panel rounded-3xl p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">
            Vote
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Cast your DAO vote</h1>
          <p className="mt-2 text-sm text-white/60">
            Vote on {networkName} proposals. Votes are weighted by your current
            STX balance.
          </p>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">
              Select a proposal
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {loadingProposals ? (
                <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">
                  Loading proposals...
                </div>
              ) : proposalError ? (
                <div className="col-span-full rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                  {proposalError}
                </div>
              ) : proposals.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">
                  No proposals yet.{" "}
                  <Link
                    href="/create-proposal"
                    className="underline decoration-white/30 underline-offset-4"
                  >
                    Create one
                  </Link>
                  .
                </div>
              ) : (
                proposals.map((proposal) => (
                  <button
                    key={proposal.id.toString()}
                    type="button"
                    onClick={() => setProposalId(proposal.id.toString())}
                    className={`rounded-2xl border px-4 py-3 text-left text-xs transition ${
                      proposalId === proposal.id.toString()
                        ? "border-orange-400/60 bg-orange-400/10 text-white"
                        : "border-white/10 bg-white/5 text-white/60 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="block text-[10px] uppercase tracking-[0.2em] text-white/50">
                        Proposal {proposal.id.toString()}
                      </span>
                      {proposal.voted ? (
                        <span className="rounded-full border border-emerald-400/40 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-emerald-200">
                          Voted
                        </span>
                      ) : null}
                    </div>
                    <span className="mt-2 block text-sm text-white/80">
                      {proposal.kind === "ft-transfer"
                        ? formatGovernanceToken(proposal.amount)
                        : formatMicroStx(proposal.amount)}
                    </span>
                    <span className="mt-1 block text-[11px] uppercase tracking-[0.2em] text-white/40">
                      {proposal.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/50">
                Proposal id
              </label>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30"
                placeholder="e.g. 1"
                value={proposalId}
                onChange={(event) => setProposalId(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setChoice("for")}
                className={`rounded-2xl border px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  choice === "for"
                    ? "border-emerald-400/60 bg-emerald-400/20 text-emerald-100"
                    : "border-white/10 bg-white/5 text-white/60 hover:border-white/30"
                }`}
              >
                Vote for
              </button>
              <button
                type="button"
                onClick={() => setChoice("against")}
                className={`rounded-2xl border px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  choice === "against"
                    ? "border-rose-400/60 bg-rose-400/20 text-rose-100"
                    : "border-white/10 bg-white/5 text-white/60 hover:border-white/30"
                }`}
              >
                Vote against
              </button>
            </div>
            <button
              type="submit"
              disabled={submitting || selectedProposal?.voted}
              className="rounded-2xl bg-orange-500/90 px-4 py-3 text-center text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit vote"}
            </button>
          </form>

          {selectedProposal?.voted ? (
            <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              You already voted on this proposal.
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          {txid ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              Submitted.{" "}
              <Link
                href={explorerTxUrl(txid)}
                className="underline decoration-emerald-300/60 underline-offset-4"
              >
                View on explorer
              </Link>
            </div>
          ) : null}

          <p className="mt-6 text-xs uppercase tracking-[0.28em] text-white/40">
            Contract: {daoContractId || "Not set"}
          </p>
        </div>
      </div>
    </main>
  );
}

export default function VotePage() {
  return (
    <Suspense
      fallback={
        <main className="relative min-h-screen overflow-hidden px-6 py-16 text-white">
          <div className="mx-auto flex max-w-3xl flex-col gap-8">
            <div className="glass-panel rounded-3xl p-8">
              <p className="text-sm text-white/60">Loading vote page...</p>
            </div>
          </div>
        </main>
      }
    >
      <VotePageContent />
    </Suspense>
  );
}
