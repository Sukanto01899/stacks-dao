"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Cl } from "@stacks/transactions";
import { useWallet } from "@/components/wallet-provider";
import { daoContractId, explorerTxUrl } from "@/lib/dao";
import {
  formatGovernanceToken,
  formatMicroStx,
  getDaoProposal,
} from "@/lib/dao-client";
import { networkName } from "@/lib/network";

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address, callContract } = useWallet();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [proposal, setProposal] = useState<
    Awaited<ReturnType<typeof getDaoProposal>>["proposal"]
  >(null);

  const proposalId = useMemo(() => {
    if (!id || !/^\d+$/.test(id)) return null;
    return BigInt(id);
  }, [id]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (proposalId === null) {
        setError("Invalid proposal id.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { proposal: fetched } = await getDaoProposal(proposalId, {
          voter: address ?? undefined,
        });
        if (!active) return;
        if (!fetched) {
          setError("Proposal not found.");
          setProposal(null);
        } else {
          setProposal(fetched);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load proposal.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [proposalId, address]);

  const onExecute = async () => {
    if (!proposal || proposalId === null) return;
    setError(null);
    setTxid(null);

    if (!address) {
      setError("Connect a Stacks wallet first.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await callContract({
        contract: daoContractId,
        functionName: "execute",
        functionArgs: [Cl.uint(proposalId)],
        network: networkName,
      });
      const nextTxid = response?.txid ?? null;
      if (!nextTxid) {
        setError("No transaction id returned from wallet");
      } else {
        setTxid(nextTxid);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute proposal");
    } finally {
      setSubmitting(false);
    }
  };

  const totalVotes = proposal
    ? proposal.forVotes + proposal.againstVotes + proposal.abstainVotes
    : 0n;
  const supportPct =
    proposal && totalVotes > 0n
      ? Number((proposal.forVotes * 100n) / totalVotes)
      : 0;

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-16 text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-white/30"
          >
            Back
          </Link>
          {proposalId !== null ? (
            <Link
              href={`/vote?id=${proposalId.toString()}`}
              className="rounded-full border border-orange-400/40 px-4 py-2 text-xs uppercase tracking-[0.3em] text-orange-200 transition hover:border-orange-300/70"
            >
              Vote
            </Link>
          ) : null}
        </div>

        <div className="glass-panel rounded-3xl p-8">
          {loading ? (
            <p className="text-sm text-white/60">Loading proposal...</p>
          ) : error ? (
            <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : proposal ? (
            <>
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">
                Proposal {proposal.id.toString()}
              </p>
              <h1 className="mt-3 text-3xl font-semibold">Treasury transfer</h1>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                    Recipient
                  </p>
                  <p className="mt-2 text-sm text-white/85 break-all">{proposal.recipient}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                    Amount
                  </p>
                  <p className="mt-2 text-sm text-white/85">
                    {proposal.kind === "ft-transfer"
                      ? formatGovernanceToken(proposal.amount)
                      : formatMicroStx(proposal.amount)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Status</p>
                  <p className="mt-2 text-sm text-white/85">{proposal.status}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                    Remaining blocks
                  </p>
                  <p className="mt-2 text-sm text-white/85">
                    {proposal.remainingBlocks.toString()}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Tally</p>
                <p className="mt-2 text-sm text-white/85">
                  For: {formatMicroStx(proposal.forVotes)} | Against:{" "}
                  {formatMicroStx(proposal.againstVotes)} | Support: {supportPct}%
                </p>
                <p className="mt-1 text-xs text-white/60">
                  Quorum: {formatMicroStx(proposal.quorum)} | Execute window:{" "}
                  {proposal.executeAfter.toString()} - {proposal.executeBefore.toString()}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onExecute}
                  disabled={submitting || proposal.status !== "Ready"}
                  className="rounded-2xl bg-orange-500/90 px-4 py-3 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Execute proposal"}
                </button>
                <Link
                  href={`/vote?id=${proposal.id.toString()}`}
                  className="rounded-2xl border border-white/20 px-4 py-3 text-sm text-white/80 transition hover:border-white/40"
                >
                  Vote on proposal
                </Link>
              </div>
            </>
          ) : null}

          {txid ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              Transaction submitted.{" "}
              <Link
                href={explorerTxUrl(txid)}
                className="underline decoration-emerald-300/60 underline-offset-4"
              >
                View on explorer
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
