"use client";

import { useState } from "react";
import Link from "next/link";
import { Cl } from "@stacks/transactions";
import { useWallet } from "@/components/wallet-provider";
import { networkName } from "@/lib/network";
import {
  daoContractId,
  explorerTxUrl,
  getDaoContractParts,
  parsePrincipal,
  stxToMicroStx,
} from "@/lib/dao";

export default function CreateProposalPage() {
  const { address, callContract } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);

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

    const recipientPrincipal = parsePrincipal(recipient);
    if (!recipientPrincipal) {
      setError("Enter a valid recipient principal.");
      return;
    }

    const microAmount = stxToMicroStx(amount);
    if (microAmount === null) {
      setError("Enter an amount in STX (up to 6 decimals).");
      return;
    }

    setSubmitting(true);
    try {
      const response = await callContract({
        contract: daoContractId,
        functionName: "propose",
        functionArgs: [recipientPrincipal, Cl.uint(microAmount)],
        network: networkName,
      });
      const tx = response?.txid ?? null;
      if (!tx) {
        setError("No transaction id returned from wallet.");
      } else {
        setTxid(tx);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit proposal."
      );
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
            Create proposal
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            Draft a treasury transfer
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Submit a proposal on {networkName} to transfer STX from the DAO
            treasury. Requires governance token balance to propose.
          </p>

          <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
            <input
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30"
              placeholder="Recipient (SP... or ST...principal)"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
            />
            <input
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30"
              placeholder="Amount in STX"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-orange-500/90 px-4 py-3 text-center text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit proposal"}
            </button>
          </form>

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
