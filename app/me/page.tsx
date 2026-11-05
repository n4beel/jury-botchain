"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { formatEther } from "viem";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import { JURY_ABI } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment } from "@/lib/botchain/deployment";
import { formatJuryError } from "@/lib/errors";
import { formatAddress, CaseState } from "@/lib/jury";
import { assertActiveChain } from "@/lib/useChainWrite";

interface MyCase {
  id: bigint;
  partyA: string;
  partyB: string;
  stake: bigint;
  fee: bigint;
  state: CaseState;
  role: "Party A" | "Party B" | "Juror";
  hasVoted?: boolean;
}

export default function MyCasesPage() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const deployment = getDeployment(activeBotChain.id);
  const contractAddress = deployment.address;
  const isDeployed = contractAddress !== "0x0000000000000000000000000000000000000000";

  const publicClient = usePublicClient({ chainId: activeBotChain.id });

  const [pendingBalance, setPendingBalance] = useState<bigint>(0n);
  const [cases, setCases] = useState<MyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  async function loadUserData() {
    if (!publicClient || !isDeployed || !address) {
      setLoading(false);
      return;
    }

    try {
      setWithdrawError(null);
      // Read pending balance
      const bal = await publicClient.readContract({
        address: contractAddress,
        abi: JURY_ABI,
        functionName: "pending",
        args: [address],
      });
      setPendingBalance(bal);

      // Read total cases
      const count = await publicClient.readContract({
        address: contractAddress,
        abi: JURY_ABI,
        functionName: "caseCount",
      });

      const total = Number(count);
      const userCases: MyCase[] = [];
      const callerNorm = address.toLowerCase();

      for (let i = total; i >= 1; i--) {
        const cId = BigInt(i);
        const [cData, jurorAddrs] = await Promise.all([
          publicClient.readContract({
            address: contractAddress,
            abi: JURY_ABI,
            functionName: "caseOf",
            args: [cId],
          }),
          publicClient.readContract({
            address: contractAddress,
            abi: JURY_ABI,
            functionName: "jurorsOf",
            args: [cId],
          }),
        ]);

        const isA = cData.a.toLowerCase() === callerNorm;
        const isB = cData.b.toLowerCase() === callerNorm;
        const isJuror = jurorAddrs.some((j) => j.toLowerCase() === callerNorm);

        if (isA || isB || isJuror) {
          let hasVoted = false;
          if (isJuror) {
            const v = await publicClient.readContract({
              address: contractAddress,
              abi: JURY_ABI,
              functionName: "votedBy",
              args: [cId, address],
            });
            hasVoted = Number(v) !== 0;
          }

          userCases.push({
            id: cId,
            partyA: cData.a,
            partyB: cData.b,
            stake: cData.stake,
            fee: cData.fee,
            state: cData.state as CaseState,
            role: isA ? "Party A" : isB ? "Party B" : "Juror",
            hasVoted,
          });
        }
      }

      setCases(userCases);
      setLoading(false);
    } catch (err: any) {
      console.error("Failed to load user cases:", err);
      setWithdrawError(formatJuryError(err));
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractAddress, address]);

  async function handleWithdraw() {
    if (!walletClient || !publicClient) {
      setWithdrawError("Please connect your wallet first.");
      return;
    }
    setWithdrawSuccess(null);
    setWithdrawError(null);
    setIsWithdrawing(true);

    try {
      await assertActiveChain(walletClient);
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: JURY_ABI,
        functionName: "withdraw",
        args: [],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("Withdraw transaction reverted on chain.");
      }

      setWithdrawSuccess("Funds successfully withdrawn to your wallet!");
      await loadUserData();
    } catch (err: any) {
      console.error("Failed to withdraw:", err);
      setWithdrawError(formatJuryError(err));
    } finally {
      setIsWithdrawing(false);
    }
  }

  const stateLabels = ["Offered", "Active", "Decided", "Expired", "Conceded", "Cancelled"];

  return (
    <PageShell
      title="My Docket & Caseload"
      subtitle="Your participation as a disputing party or juror, and your pending payouts."
    >
      <div className="flex flex-col gap-6">
        {/* Alerts */}
        {withdrawSuccess && (
          <div className="p-3 bg-[var(--success)]/15 border border-[var(--success)] text-[var(--success)] text-xs rounded font-sans">
            {withdrawSuccess}
          </div>
        )}
        {withdrawError && (
          <div className="p-3 bg-[var(--danger)]/15 border border-[var(--danger)] text-[var(--danger)] text-xs rounded font-sans">
            {withdrawError}
          </div>
        )}

        {/* Pending Payout / Escrow Balance Panel */}
        <Panel>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="text-xs uppercase font-serif tracking-wider text-[var(--text-muted)] block font-bold">
                Available Pull Payouts
              </span>
              <div className="mt-1 font-mono text-2xl font-black text-[var(--accent)]">
                {formatEther(pendingBalance)} <span className="text-sm font-normal text-[var(--text-primary)]">BOT</span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)] font-sans">
                Earnings from jury services, won dispute pots, or refunded escrows.
              </p>
            </div>

            <div>
              <Button
                scale="md"
                disabled={pendingBalance === 0n || isWithdrawing}
                onClick={handleWithdraw}
              >
                {isWithdrawing ? "Withdrawing..." : "Withdraw Funds"}
              </Button>
            </div>
          </div>
        </Panel>

        {/* Caseload Summary */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Your Caseload
            </h2>
            <Link href="/open">
              <Button scale="sm">＋ Open New Dispute</Button>
            </Link>
          </div>

          {!address ? (
            <Panel>
              <div className="py-8 text-center text-xs text-[var(--text-muted)] font-sans">
                Connect your wallet to inspect your cases and pending pull payouts.
              </div>
            </Panel>
          ) : loading ? (
            <Panel>
              <div className="py-8 text-center text-xs font-mono text-[var(--text-muted)] animate-pulse">
                Loading your arbitration docket…
              </div>
            </Panel>
          ) : cases.length === 0 ? (
            <Panel>
              <div className="py-8 text-center flex flex-col items-center gap-3">
                <p className="text-xs text-[var(--text-muted)] font-sans">
                  You are not named as a party or a juror on any recorded cases.
                </p>
                <Link href="/open">
                  <Button scale="sm">File a Dispute Case</Button>
                </Link>
              </div>
            </Panel>
          ) : (
            <div className="rounded border border-[var(--border-default)] bg-[var(--bg-surface)] divide-y divide-[var(--border-subtle)] overflow-hidden">
              {cases.map((c) => (
                <Link
                  key={c.id.toString()}
                  href={`/case/${c.id.toString()}`}
                  className="group no-underline block hover:bg-[var(--bg-elevated)] transition-colors p-4"
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-[var(--accent)]">
                        #{c.id.toString()}
                      </span>
                      <div>
                        <div className="font-sans text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                          <span>{formatAddress(c.partyA)}</span>
                          <span className="text-[var(--text-muted)] font-normal">vs</span>
                          <span>{formatAddress(c.partyB)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-sans font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--accent)] text-[var(--accent-ink)]">
                            Role: {c.role}
                          </span>
                          {c.role === "Juror" && (
                            <span
                              className={`text-[10px] font-sans font-medium px-1.5 py-0.5 rounded ${
                                c.hasVoted
                                  ? "bg-[var(--success)]/15 text-[var(--success)]"
                                  : "bg-[var(--warning)]/15 text-[var(--warning)]"
                              }`}
                            >
                              {c.hasVoted ? "Voted" : "Ballot Pending"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right font-mono">
                        <span className="font-bold text-[var(--text-primary)]">
                          {formatEther(c.stake)} BOT
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] block">
                          + {formatEther(c.fee)} fee
                        </span>
                      </div>
                      <span
                        className={`font-serif uppercase text-[10px] px-2 py-0.5 border font-bold ${
                          c.state === CaseState.Active
                            ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-overlay)]"
                            : c.state === CaseState.Decided
                            ? "border-[var(--success)] text-[var(--success)]"
                            : c.state === CaseState.Expired
                            ? "border-[var(--danger)] text-[var(--danger)]"
                            : "border-[var(--border-default)] text-[var(--text-muted)]"
                        }`}
                      >
                        {stateLabels[c.state]}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
