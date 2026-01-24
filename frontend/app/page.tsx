"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isTestnet, networkName } from "@/lib/network";
import { useWallet } from "@/components/wallet-provider";
import {
  formatGovernanceToken,
  formatMicroStx,
  listDaoProposals,
} from "@/lib/dao-client";

const explorerBase = isTestnet
  ? "https://explorer.hiro.so/?chain=testnet"
  : "https://explorer.hiro.so/";
const faucetUrl = "https://explorer.hiro.so/faucet?chain=testnet";

export default function Home() {
  const { address } = useWallet();
  const [proposals, setProposals] = useState<
    Awaited<ReturnType<typeof listDaoProposals>>["proposals"]
  >([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [proposalError, setProposalError] = useState<string | null>(null);

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
            err instanceof Error ? err.message : "Failed to load proposals."
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

  const shortAddress = (value: string) =>
    value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "—";
  const activeProposals = proposals.filter(
    (proposal) => proposal.status === "Voting"
  ).length;
  const stats = [
    { label: "Treasury balance", value: "1.84M STX" },
    { label: "Active proposals", value: String(activeProposals) },
    { label: "Voters this epoch", value: "412" },
    { label: "Quorum target", value: "1 STX" },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-16 text-white">
      <div
        className="pointer-events-none absolute -left-32 top-12 h-72 w-72 rounded-full bg-orange-500/30 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-[-120px] top-[20%] h-80 w-80 rounded-full bg-amber-400/20 blur-[140px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-[-180px] left-[25%] h-96 w-96 rounded-full bg-rose-500/10 blur-[160px]"
        aria-hidden="true"
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-14">
        <header className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <p className="text-xs uppercase tracking-[0.45em] text-orange-200/70">
              Stacks DAO
            </p>
            <h1 className="font-serif text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
              Vote with your STX.
              <br />
              Move the treasury forward.
            </h1>
            <p className="max-w-xl text-base text-white/70 sm:text-lg">
              A lightweight governance portal for treasury proposals, weighted
              by STX balance. Connect your wallet, back the best ideas, and ship
              on-chain transfers when quorum hits.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/vote"
                className="glow-ring rounded-full bg-orange-500/90 px-6 py-3 text-sm font-semibold text-black transition hover:bg-orange-400"
              >
                Explore proposals
              </Link>
              <span className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/70">
                {networkName}
              </span>
              <div className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/60">
                Epoch 24
              </div>
            </div>
          </div>

          <div className="glass-panel animate-fade rounded-3xl p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">
              Network overview
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Live stats</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4"
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-white/60">
              <span className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/50">
                Network: {networkName}
              </span>
              <Link
                href={explorerBase}
                className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.2em] transition hover:border-white/30"
              >
                Explorer
              </Link>
              {isTestnet ? (
                <Link
                  href={faucetUrl}
                  className="rounded-full border border-emerald-400/40 px-3 py-1 uppercase tracking-[0.2em] text-emerald-200 transition hover:border-emerald-400/70"
                >
                  Testnet faucet
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Active proposals
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Treasury flight deck
                </h2>
              </div>
              <button className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/70 transition hover:border-white/30">
                View all
              </button>
            </div>
            <div className="mt-6 grid gap-4">
              {loadingProposals ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
                  Loading on-chain proposals...
                </div>
              ) : proposalError ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">
                  {proposalError}
                </div>
              ) : proposals.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
                  No proposals yet.{" "}
                  <Link
                    href="/create-proposal"
                    className="underline decoration-white/30 underline-offset-4"
                  >
                    Create the first one
                  </Link>
                  .
                </div>
              ) : (
                proposals.map((proposal) => {
                  const total =
                    proposal.forVotes +
                    proposal.againstVotes +
                    proposal.abstainVotes;
                  const support =
                    total > 0n
                      ? Number((proposal.forVotes * 100n) / total)
                      : 0;
                  const endsLabel =
                    proposal.status === "Voting" || proposal.status === "Queued"
                      ? `${proposal.remainingBlocks} blocks`
                      : proposal.status;

                  return (
                    <div
                      key={proposal.id.toString()}
                      className="rounded-2xl border border-white/10 bg-white/5 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.3em] text-orange-200/70">
                          Proposal {proposal.id.toString()}
                        </p>
                        <div className="flex items-center gap-2">
                          {proposal.voted ? (
                            <span className="rounded-full border border-emerald-400/40 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-emerald-200">
                              Voted
                            </span>
                          ) : null}
                          <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-white/60">
                            {proposal.status}
                          </span>
                        </div>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold">
                        Treasury transfer
                      </h3>
                      <div className="mt-4 grid gap-3 text-xs text-white/60 sm:grid-cols-3">
                        <div>
                          <p className="uppercase tracking-[0.2em]">Recipient</p>
                          <p className="mt-1 text-white/80">
                            {shortAddress(proposal.recipient)}
                          </p>
                        </div>
                        <div>
                          <p className="uppercase tracking-[0.2em]">Amount</p>
                          <p className="mt-1 text-white/80">
                            {proposal.kind === "ft-transfer"
                              ? formatGovernanceToken(proposal.amount)
                              : formatMicroStx(proposal.amount)}
                          </p>
                        </div>
                        <div>
                          <p className="uppercase tracking-[0.2em]">Ends</p>
                          <p className="mt-1 text-white/80">{endsLabel}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs text-white/60">
                        <span>
                          Support: {support}% (
                          {proposal.kind === "ft-transfer"
                            ? formatGovernanceToken(proposal.forVotes)
                            : formatMicroStx(proposal.forVotes)}
                          )
                        </span>
                        {proposal.voted ? (
                          <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/40">
                            Already voted
                          </span>
                        ) : (
                          <Link
                            href={`/vote?id=${proposal.id.toString()}`}
                            className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/70 transition hover:border-white/30"
                          >
                            Vote
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="glass-panel rounded-3xl p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                Create proposal
              </p>
              <h3 className="mt-2 text-xl font-semibold">Draft new motion</h3>
              <div className="mt-4 grid gap-3">
                <input
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30"
                  placeholder="Recipient address"
                />
                <input
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30"
                  placeholder="Amount in STX"
                />
                <Link
                  href="/create-proposal"
                  className="rounded-2xl bg-orange-500/90 px-4 py-3 text-center text-sm font-semibold text-black transition hover:bg-orange-400"
                >
                  Submit proposal
                </Link>
              </div>
              <p className="mt-3 text-xs text-white/50">
                Requires at least 1 STX to propose.
              </p>
            </div>

            <div className="glass-panel rounded-3xl p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                Vote
              </p>
              <h3 className="mt-2 text-xl font-semibold">Cast your vote</h3>
              <div className="mt-4 grid gap-3">
                <input
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30"
                  placeholder="Proposal id"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/vote"
                    className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-3 text-center text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
                  >
                    Vote For
                  </Link>
                  <Link
                    href="/vote"
                    className="rounded-2xl border border-rose-400/40 bg-rose-400/10 px-3 py-3 text-center text-xs font-semibold text-rose-200 transition hover:bg-rose-400/20"
                  >
                    Vote Against
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              Governance flow
            </p>
            <h3 className="mt-2 text-2xl font-semibold">
              From proposal to execution
            </h3>
            <p className="mt-3 max-w-xl text-sm text-white/60">
              Proposals open for 1,440 blocks. Votes are weighted by live STX
              balance, and execution happens once quorum is reached and voting
              closes. Keep an eye on the window to execute transfers on time.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                "Propose with 1 STX",
                "Vote once per proposal",
                "Execute after voting closes",
              ].map((step) => (
                <div
                  key={step}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs uppercase tracking-[0.2em] text-white/70"
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              Broadcasts
            </p>
            <h3 className="mt-2 text-2xl font-semibold">Latest updates</h3>
            <div className="mt-4 space-y-4 text-sm text-white/60">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                Treasury vote recap is live. Proposal #02 moves to queue in 3
                hours.
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                Execution window opens for #01 once votes close. Prepare the
                transfer signer.
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                New AppKit flow enables WalletConnect + embedded wallets.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
