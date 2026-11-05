"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { parseEther, isAddress } from "viem";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import { JURY_ABI } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment } from "@/lib/botchain/deployment";
import { formatJuryError } from "@/lib/errors";
import { assertActiveChain } from "@/lib/useChainWrite";

export default function OpenCasePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: activeBotChain.id });

  const deployment = getDeployment(activeBotChain.id);
  const contractAddress = deployment.address;

  const [respondent, setRespondent] = useState("");
  const [juror1, setJuror1] = useState("");
  const [juror2, setJuror2] = useState("");
  const [juror3, setJuror3] = useState("");
  const [terms, setTerms] = useState("");
  const [stakeEth, setStakeEth] = useState("1.0");
  const [feeEth, setFeeEth] = useState("0.1");
  const [decideDays, setDecideDays] = useState("7");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletClient || !publicClient || !address) return;

    setError(null);
    setLoading(true);

    try {
      if (!isAddress(respondent)) throw new Error("Invalid respondent (Party B) Ethereum address.");
      if (!isAddress(juror1) || !isAddress(juror2) || !isAddress(juror3)) {
        throw new Error("All three juror addresses must be valid Ethereum addresses.");
      }

      const trimmedTerms = terms.trim();
      if (!trimmedTerms) throw new Error("Terms cannot be blank.");
      if (new TextEncoder().encode(trimmedTerms).length > 400) {
        throw new Error("Terms must be 400 bytes or fewer.");
      }

      const parsedStake = parseEther(stakeEth);
      if (parsedStake < parseEther("0.01") || parsedStake > parseEther("100000")) {
        throw new Error("Stake must be between 0.01 and 100,000 BOT.");
      }

      const parsedFee = parseEther(feeEth);
      if (parsedFee > parseEther("1000")) {
        throw new Error("Juror fee cannot exceed 1000 BOT.");
      }

      const decideSecs = Number(decideDays) * 86400;
      if (decideSecs < 86400 || decideSecs > 90 * 86400) {
        throw new Error("Decision window must be between 1 and 90 days.");
      }

      const jurorsArr: [ `0x${string}`, `0x${string}`, `0x${string}` ] = [
        juror1 as `0x${string}`,
        juror2 as `0x${string}`,
        juror3 as `0x${string}`,
      ];

      await assertActiveChain(walletClient);

      const txHash = await walletClient.writeContract({
        address: contractAddress,
        abi: JURY_ABI,
        functionName: "open",
        args: [
          respondent as `0x${string}`,
          jurorsArr,
          trimmedTerms,
          parsedStake,
          parsedFee,
          decideSecs,
        ],
        value: parsedStake + parsedFee,
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const count = await publicClient.readContract({
        address: contractAddress,
        abi: JURY_ABI,
        functionName: "caseCount",
      });

      router.push(`/case/${count.toString()}`);
    } catch (err: unknown) {
      console.error(err);
      setError(formatJuryError(err));
      setLoading(false);
    }
  };

  const totalDeposit = (Number(stakeEth) || 0) + (Number(feeEth) || 0);

  return (
    <PageShell
      title="File a Dispute or Wager"
      subtitle="Establish a new arbitration case with 3 agreed jurors and mutual stakes."
    >
      <div className="max-w-xl mx-auto">
        <Panel
          title="Case Filing Parameters"
          description="Designate counterparty, named jurors, written terms, and staked amounts"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            {/* Respondent / Party B */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="respondent"
                className="text-xs font-sans uppercase font-bold text-[var(--text-primary)]"
              >
                Opposing Party (Party B Wallet)
              </label>
              <input
                id="respondent"
                type="text"
                required
                value={respondent}
                onChange={(e) => setRespondent(e.target.value)}
                placeholder="0x…"
                className="w-full px-3 py-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Three Jurors */}
            <div className="flex flex-col gap-2 p-3 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <span className="text-xs font-sans uppercase font-bold text-[var(--text-primary)]">
                Three Named Jurors (Must be distinct non-parties)
              </span>
              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  required
                  value={juror1}
                  onChange={(e) => setJuror1(e.target.value)}
                  placeholder="Juror 1: 0x…"
                  className="w-full px-3 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-xs font-mono text-[var(--text-primary)]"
                />
                <input
                  type="text"
                  required
                  value={juror2}
                  onChange={(e) => setJuror2(e.target.value)}
                  placeholder="Juror 2: 0x…"
                  className="w-full px-3 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-xs font-mono text-[var(--text-primary)]"
                />
                <input
                  type="text"
                  required
                  value={juror3}
                  onChange={(e) => setJuror3(e.target.value)}
                  placeholder="Juror 3: 0x…"
                  className="w-full px-3 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-xs font-mono text-[var(--text-primary)]"
                />
              </div>
            </div>

            {/* Terms of Case */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="terms"
                className="text-xs font-sans uppercase font-bold text-[var(--text-primary)]"
              >
                Terms of Dispute / Bet (Max 400 bytes)
              </label>
              <textarea
                id="terms"
                required
                maxLength={400}
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="State the terms plainly. What outcome means Party A wins vs Party B wins?"
                className="w-full px-3 py-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-serif text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                {new TextEncoder().encode(terms).length} / 400 bytes
              </span>
            </div>

            {/* Stakes & Fees */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-sans uppercase font-bold text-[var(--text-primary)]">
                  Match Stake (BOT)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max="100000"
                  required
                  value={stakeEth}
                  onChange={(e) => setStakeEth(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-sans uppercase font-bold text-[var(--text-primary)]">
                  Juror Fee (BOT)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="1000"
                  required
                  value={feeEth}
                  onChange={(e) => setFeeEth(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-sans uppercase font-bold text-[var(--text-primary)]">
                  Decide Window (Days)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="90"
                  required
                  value={decideDays}
                  onChange={(e) => setDecideDays(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs font-mono"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded bg-[var(--danger)]/15 border border-[var(--danger)] text-xs text-[var(--danger)]">
                {error}
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                scale="lg"
                disabled={loading || !isConnected}
                className="w-full"
              >
                {loading
                  ? "Opening Case on Chain…"
                  : isConnected
                  ? `Open Case & Escrow ${totalDeposit.toFixed(3)} BOT`
                  : "Connect Wallet to Open Case"}
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </PageShell>
  );
}
