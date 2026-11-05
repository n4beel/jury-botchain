"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { formatEther } from "viem";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import { JURY_ABI } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment } from "@/lib/botchain/deployment";
import { formatAddress, CaseState } from "@/lib/jury";

interface CaseSummary {
  id: bigint;
  partyA: string;
  partyB: string;
  stake: bigint;
  fee: bigint;
  state: number;
  votesA: number;
  votesB: number;
  userRole?: string;
}

export default function HomePage() {
  const { address } = useAccount();
  const deployment = getDeployment(activeBotChain.id);
  const contractAddress = deployment.address;
  const isDeployed = contractAddress !== "0x0000000000000000000000000000000000000000";

  const publicClient = usePublicClient({ chainId: activeBotChain.id });

  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicClient || !isDeployed) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadCases() {
      try {
        const count = await publicClient!.readContract({
          address: contractAddress,
          abi: JURY_ABI,
          functionName: "caseCount",
        });

        const total = Number(count);
        if (total === 0) {
          if (isMounted) {
            setCases([]);
            setLoading(false);
          }
          return;
        }

        const list: CaseSummary[] = [];
        const limit = Math.min(total, 40);

        for (let i = total; i > total - limit; i--) {
          const cId = BigInt(i);
          const [cData, jurors] = await Promise.all([
            publicClient!.readContract({
              address: contractAddress,
              abi: JURY_ABI,
              functionName: "caseOf",
              args: [cId],
            }),
            publicClient!.readContract({
              address: contractAddress,
              abi: JURY_ABI,
              functionName: "jurorsOf",
              args: [cId],
            }),
          ]);

          let role: string | undefined;
          if (address) {
            const norm = address.toLowerCase();
            if (cData.a.toLowerCase() === norm) role = "Party A";
            else if (cData.b.toLowerCase() === norm) role = "Party B";
            else if (jurors.some((j) => j.toLowerCase() === norm)) role = "Juror";
          }

          list.push({
            id: cId,
            partyA: cData.a,
            partyB: cData.b,
            stake: cData.stake,
            fee: cData.fee,
            state: cData.state,
            votesA: cData.votesA,
            votesB: cData.votesB,
            userRole: role,
          });
        }

        if (isMounted) {
          // Sort: user's cases first, then others
          list.sort((a, b) => {
            if (Boolean(a.userRole) === Boolean(b.userRole)) return Number(b.id - a.id);
            return a.userRole ? -1 : 1;
          });
          setCases(list);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load cases:", err);
        if (isMounted) setLoading(false);
      }
    }

    loadCases();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractAddress, address]);

  const stateLabels = ["Offered", "Active", "Decided", "Expired", "Conceded", "Cancelled"];

  return (
    <PageShell
      title="Public Arbitration Docket"
      subtitle="Two sides, three named jurors, majority rules."
    >
      <div className="flex flex-col gap-6">
        {/* Limits & Capabilities Panel (Spec §1, §3.4) */}
        <Panel
          variant="raised"
          title="What a verdict is"
          description="Limits of on-chain arbitration, juror selection, and deadlocks"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans text-[var(--text-muted)]">
            <div className="flex flex-col gap-1.5 p-3 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <span className="font-serif font-bold text-[var(--accent)] uppercase tracking-wider">
                Moves Stakes Only
              </span>
              <p>
                It only moves the stakes. It is not law. The smart contract cannot enforce off-chain injunctions or contracts.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 p-3 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <span className="font-serif font-bold text-[var(--accent)] uppercase tracking-wider">
                Named Peer Jurors
              </span>
              <p>
                The jurors are the people A named and B accepted. They can be wrong, and the chain cannot tell or detect bribes.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 p-3 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <span className="font-serif font-bold text-[var(--accent)] uppercase tracking-wider">
                Majority or Refund
              </span>
              <p>
                If two jurors never agree by the deadline, everything is returned. Inactive jurors forfeit their share of the juror fee.
              </p>
            </div>
          </div>
        </Panel>

        {/* Docket Listing */}
        {loading ? (
          <Panel>
            <div className="py-12 text-center text-sm font-mono text-[var(--text-muted)] animate-pulse">
              Reading cases from the arbitration docket…
            </div>
          </Panel>
        ) : !isDeployed ? (
          <Panel>
            <div className="py-12 text-center text-sm text-[var(--warning)] font-sans">
              Jury contract is not yet deployed on this network.
            </div>
          </Panel>
        ) : cases.length === 0 ? (
          <Panel>
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <p className="text-sm text-[var(--text-muted)] font-sans">
                The arbitration docket is currently empty.
              </p>
              <Link href="/open">
                <Button scale="md">Open the First Case</Button>
              </Link>
            </div>
          </Panel>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-[var(--text-primary)] uppercase tracking-wider">
                The Court Docket
              </h2>
              <Link href="/open">
                <Button scale="sm">＋ File New Case</Button>
              </Link>
            </div>

            {/* Courtroom Docket: Rows of case numbers with parties, state and stake (Spec §3.1) */}
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
                        {c.userRole && (
                          <span className="inline-block mt-1 text-[10px] font-sans font-bold uppercase px-1.5 py-0.2 rounded bg-[var(--accent)] text-[var(--accent-ink)]">
                            Your Role: {c.userRole}
                          </span>
                        )}
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
          </div>
        )}
      </div>
    </PageShell>
  );
}
