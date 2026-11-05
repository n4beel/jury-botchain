"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { formatEther, parseAbiItem } from "viem";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import BenchView from "@/components/bench/BenchView";
import { JURY_ABI } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment } from "@/lib/botchain/deployment";
import { formatJuryError } from "@/lib/errors";
import {
  CaseState,
  CaseSeat,
  termsHash as computeTermsHash,
  formatAddress,
} from "@/lib/jury";
import { assertActiveChain } from "@/lib/useChainWrite";

interface CaseDetails {
  id: bigint;
  a: string;
  b: string;
  acceptBy: bigint;
  decideBy: bigint;
  decideSecs: number;
  state: CaseState;
  stake: bigint;
  fee: bigint;
  termsHash: `0x${string}`;
  termsBlock: number;
  votesA: number;
  votesB: number;
  jurors: string[];
  jurorVotes: number[];
  termsText: string;
  termsTextFound: boolean;
}

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const caseId = BigInt(resolvedParams.id);

  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const deployment = getDeployment(activeBotChain.id);
  const contractAddress = deployment.address;
  const isDeployed = contractAddress !== "0x0000000000000000000000000000000000000000";

  const publicClient = usePublicClient({ chainId: activeBotChain.id });

  const [details, setDetails] = useState<CaseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTransacting, setIsTransacting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txSuccessMsg, setTxSuccessMsg] = useState<string | null>(null);
  const [currentTimeSec, setCurrentTimeSec] = useState<bigint>(
    BigInt(Math.floor(Date.now() / 1000))
  );

  // Keep a local timer tick for deadline checks
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeSec(BigInt(Math.floor(Date.now() / 1000)));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  async function loadCaseData() {
    if (!publicClient || !isDeployed) {
      setLoading(false);
      return;
    }

    try {
      setErrorMsg(null);
      const [cData, jurorAddrs] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: JURY_ABI,
          functionName: "caseOf",
          args: [caseId],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: JURY_ABI,
          functionName: "jurorsOf",
          args: [caseId],
        }),
      ]);

      const votes = await Promise.all(
        jurorAddrs.map((j) =>
          publicClient.readContract({
            address: contractAddress,
            abi: JURY_ABI,
            functionName: "votedBy",
            args: [caseId, j],
          })
        )
      );

      // Attempt to retrieve terms text from Opened event
      let termsText = "";
      let found = false;
      try {
        const fromBlock = BigInt(cData.termsBlock);
        const toBlock = fromBlock;
        const logs = await publicClient.getLogs({
          address: contractAddress,
          event: parseAbiItem(
            "event Opened(uint256 indexed id, address indexed a, address indexed b, address[3] jurors, string terms, bytes32 termsHash, uint128 stake, uint128 fee, uint64 acceptBy)"
          ),
          args: { id: caseId },
          fromBlock,
          toBlock,
        });

        if (logs.length > 0 && logs[0].args.terms) {
          termsText = logs[0].args.terms;
          found = true;
        }
      } catch (logErr) {
        console.warn("Could not query Opened event logs at block:", cData.termsBlock, logErr);
      }

      setDetails({
        id: caseId,
        a: cData.a,
        b: cData.b,
        acceptBy: cData.acceptBy,
        decideBy: cData.decideBy,
        decideSecs: cData.decideSecs,
        state: cData.state as CaseState,
        stake: cData.stake,
        fee: cData.fee,
        termsHash: cData.termsHash,
        termsBlock: cData.termsBlock,
        votesA: cData.votesA,
        votesB: cData.votesB,
        jurors: [...jurorAddrs],
        jurorVotes: votes.map((v) => Number(v)),
        termsText,
        termsTextFound: found,
      });
      setLoading(false);
    } catch (err: any) {
      console.error("Failed to load case detail:", err);
      setErrorMsg(formatJuryError(err));
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractAddress, caseId]);

  if (loading) {
    return (
      <PageShell
        title={`Case #${caseId.toString()}`}
        subtitle="Reading dispute and juror benches from BotChain…"
      >
        <Panel>
          <div className="py-12 text-center text-sm font-mono text-[var(--text-muted)] animate-pulse">
            Reading bench and deliberation record…
          </div>
        </Panel>
      </PageShell>
    );
  }

  if (!details || details.a === "0x0000000000000000000000000000000000000000") {
    return (
      <PageShell
        title={`Case #${caseId.toString()}`}
        subtitle="Case not found in the court records."
      >
        <Panel>
          <div className="py-12 text-center flex flex-col items-center gap-3">
            <p className="text-sm text-[var(--text-muted)]">
              This case ID does not exist on the current contract.
            </p>
            <Link href="/">
              <Button scale="sm">Return to Docket</Button>
            </Link>
          </div>
        </Panel>
      </PageShell>
    );
  }

  const callerAddr = address?.toLowerCase();
  const isPartyA = callerAddr === details.a.toLowerCase();
  const isPartyB = callerAddr === details.b.toLowerCase();
  const jurorIndex = details.jurors.findIndex((j) => j.toLowerCase() === callerAddr);
  const isJuror = jurorIndex !== -1;
  const jurorHasVoted = isJuror && details.jurorVotes[jurorIndex] !== 0;

  // Exact boolean predicates for actions
  const canAccept: boolean =
    isPartyB &&
    details.state === CaseState.Offered &&
    currentTimeSec <= details.acceptBy;

  const canCancel: boolean =
    isPartyA &&
    details.state === CaseState.Offered;

  const canVote: boolean =
    isJuror &&
    !jurorHasVoted &&
    details.state === CaseState.Active &&
    currentTimeSec <= details.decideBy;

  const canConcede: boolean =
    (isPartyA || isPartyB) &&
    details.state === CaseState.Active;

  const canExpire: boolean =
    (details.state === CaseState.Offered && currentTimeSec > details.acceptBy) ||
    (details.state === CaseState.Active && currentTimeSec > details.decideBy);

  // Computed terms verification
  const computedHash = details.termsTextFound
    ? computeTermsHash(details.termsText)
    : "";
  const hashMatches =
    details.termsTextFound &&
    computedHash.toLowerCase() === details.termsHash.toLowerCase();

  const seats: CaseSeat[] = details.jurors.map((addr, i) => {
    const isThisUser = Boolean(callerAddr && addr.toLowerCase() === callerAddr);
    const hasVoted = details.jurorVotes[i] !== 0;
    const seatCanVote = isThisUser && !hasVoted && details.state === CaseState.Active && currentTimeSec <= details.decideBy;
    return {
      address: addr,
      vote: details.jurorVotes[i] as 0 | 1 | 2,
      isCurrentUser: isThisUser,
      canVote: seatCanVote,
    };
  });

  const winner: "partyA" | "partyB" | undefined =
    details.votesA >= 2 ? "partyA" : details.votesB >= 2 ? "partyB" : undefined;

  const requiredEscrow = details.stake + details.fee;

  // Transaction runner
  async function executeTx(
    fnName: "accept" | "cancel" | "vote" | "concede" | "expire",
    args: any[],
    value?: bigint,
    successText?: string
  ) {
    if (!walletClient || !publicClient) {
      setErrorMsg("Please connect your wallet first.");
      return;
    }
    setErrorMsg(null);
    setTxSuccessMsg(null);
    setIsTransacting(true);

    try {
      await assertActiveChain(walletClient);
      const hash = await (walletClient.writeContract as any)({
        address: contractAddress,
        abi: JURY_ABI,
        functionName: fnName,
        args,
        value,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("Transaction reverted on chain.");
      }

      setTxSuccessMsg(successText || "Transaction succeeded!");
      await loadCaseData();
    } catch (err: any) {
      console.error(`Error during ${fnName}:`, err);
      setErrorMsg(formatJuryError(err));
    } finally {
      setIsTransacting(false);
    }
  }

  return (
    <PageShell
      title={`Arbitration Bench • Case #${caseId.toString()}`}
      subtitle="Two sides, three named jurors, majority rules."
    >
      <div className="flex flex-col gap-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-mono text-[var(--accent)] hover:underline flex items-center gap-1"
          >
            ← Back to Court Docket
          </Link>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            Block terms recorded: #{details.termsBlock}
          </span>
        </div>

        {/* Success / Status alerts */}
        {txSuccessMsg && (
          <div className="p-3 bg-[var(--success)]/15 border border-[var(--success)] text-[var(--success)] text-xs rounded font-sans">
            {txSuccessMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-3 bg-[var(--danger)]/15 border border-[var(--danger)] text-[var(--danger)] text-xs rounded font-sans">
            {errorMsg}
          </div>
        )}

        {/* Warning if terms hash cannot be verified from block log */}
        {!details.termsTextFound && (
          <div className="p-3 bg-[var(--warning)]/15 border border-[var(--warning)] text-xs rounded font-sans text-[var(--text-primary)]">
            <span className="font-bold text-[var(--warning)] block mb-1">
              Notice: Terms text log unavailable
            </span>
            The full terms string could not be extracted directly from the initial event block.
            The on-chain terms hash is <code>{details.termsHash}</code>. You can retry reading:
            <button
              type="button"
              onClick={loadCaseData}
              className="ml-2 font-bold underline text-[var(--accent)] cursor-pointer"
            >
              Retry fetch
            </button>
          </div>
        )}

        {/* The Courtroom Bench View (Visual + Table toggle) */}
        <BenchView
          partyA={details.a}
          partyB={details.b}
          stakeEth={formatEther(details.stake)}
          feeEth={formatEther(details.fee)}
          jurors={seats}
          terms={details.termsTextFound ? details.termsText : "Terms text pending log read."}
          termsHash={details.termsHash}
          hashMatches={hashMatches}
          state={details.state}
          winner={winner}
        />

        {/* Action Panel for Parties and Jurors */}
        <Panel>
          <div className="flex flex-col gap-4">
            <h3 className="font-serif text-base font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2 uppercase tracking-wide">
              Case Operations & Deliberation
            </h3>

            {/* State: OFFERED */}
            {details.state === CaseState.Offered && (
              <div className="flex flex-col gap-3 font-sans text-xs">
                <div className="p-3 bg-[var(--bg-elevated)] rounded border border-[var(--border-subtle)]">
                  <p className="font-semibold text-[var(--text-primary)]">
                    Dispute Offered to Counterparty
                  </p>
                  <p className="text-[var(--text-muted)] mt-1">
                    Acceptance window closes in{" "}
                    {currentTimeSec < details.acceptBy
                      ? `${Number(details.acceptBy - currentTimeSec)} seconds`
                      : "0 seconds (Expired)"}
                    . Party B must deposit exactly {formatEther(requiredEscrow)} BOT ({formatEther(details.stake)} stake + {formatEther(details.fee)} juror fee).
                  </p>
                </div>

                {/* Counterparty Accept Form (Spec §3.4) */}
                {isPartyB && (
                  <div className="flex flex-col gap-2 p-3 border border-[var(--accent)] bg-[var(--bg-surface)] rounded">
                    <p className="font-bold text-[var(--accent)]">
                      You are Party B (Respondent)
                    </p>
                    <p className="text-[var(--text-muted)]">
                      Match {formatEther(details.stake)} BOT plus a {formatEther(details.fee)} BOT juror fee. You get nothing back if you lose.
                    </p>
                    <Button
                      scale="md"
                      disabled={!canAccept || isTransacting}
                      onClick={() =>
                        executeTx(
                          "accept",
                          [caseId],
                          requiredEscrow,
                          "Case accepted! The dispute is now active in deliberation."
                        )
                      }
                    >
                      {isTransacting ? "Confirming..." : `Accept Case & Deposit ${formatEther(requiredEscrow)} BOT`}
                    </Button>
                  </div>
                )}

                {/* Creator Cancel button */}
                {isPartyA && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[var(--text-muted)]">
                      As Party A, you may withdraw your offer before B accepts.
                    </span>
                    <Button
                      scale="sm"
                      intent="outline"
                      disabled={!canCancel || isTransacting}
                      onClick={() =>
                        executeTx(
                          "cancel",
                          [caseId],
                          undefined,
                          "Case cancelled. Your escrow has been refunded to your wallet."
                        )
                      }
                    >
                      {isTransacting ? "Cancelling..." : "Cancel Offer & Refund Stake"}
                    </Button>
                  </div>
                )}

                {/* Expire offer if deadline passed */}
                {currentTimeSec > details.acceptBy && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[var(--danger)]">
                      The 3-day acceptance window has expired.
                    </span>
                    <Button
                      scale="sm"
                      disabled={isTransacting}
                      onClick={() =>
                        executeTx(
                          "expire",
                          [caseId],
                          undefined,
                          "Offer expired. Stake has been refunded."
                        )
                      }
                    >
                      Expire Offer & Refund Party A
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* State: ACTIVE */}
            {details.state === CaseState.Active && (
              <div className="flex flex-col gap-4 font-sans text-xs">
                <div className="p-3 bg-[var(--bg-elevated)] rounded border border-[var(--border-subtle)] flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-bold text-[var(--accent)] block">
                      Case In Active Deliberation
                    </span>
                    <span className="text-[var(--text-muted)]">
                      Decide deadline:{" "}
                      {currentTimeSec < details.decideBy
                        ? `${Number(details.decideBy - currentTimeSec)} seconds remaining`
                        : "Decision period has ended"}
                    </span>
                  </div>
                  <div className="font-mono text-sm font-bold text-[var(--text-primary)]">
                    Score: {details.votesA} for A — {details.votesB} for B
                  </div>
                </div>

                {/* Juror Voting actions */}
                {isJuror && (
                  <div className="p-4 border-2 border-[var(--accent)] bg-[var(--bg-overlay)] rounded flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-sm text-[var(--accent)] uppercase">
                        Juror Ballot
                      </span>
                      <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                        Seat #{jurorIndex + 1}
                      </span>
                    </div>

                    {jurorHasVoted ? (
                      <p className="text-[var(--success)] font-medium">
                        ✓ You have already cast your vote in this dispute ({details.jurorVotes[jurorIndex] === 1 ? "For Party A" : "For Party B"}).
                      </p>
                    ) : (
                      <>
                        <p className="text-[var(--text-primary)]">
                          Cast your official vote based on the contract terms sheet. The first party to receive 2 votes wins the entire staked pot ({formatEther(details.stake * 2n)} BOT).
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <Button
                            scale="md"
                            disabled={!canVote || isTransacting}
                            onClick={() =>
                              executeTx(
                                "vote",
                                [caseId, true],
                                undefined,
                                "Your vote for Party A was recorded!"
                              )
                            }
                          >
                            Vote for Party A ({formatAddress(details.a)})
                          </Button>
                          <Button
                            scale="md"
                            disabled={!canVote || isTransacting}
                            onClick={() =>
                              executeTx(
                                "vote",
                                [caseId, false],
                                undefined,
                                "Your vote for Party B was recorded!"
                              )
                            }
                          >
                            Vote for Party B ({formatAddress(details.b)})
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Concede action for parties */}
                {(isPartyA || isPartyB) && (
                  <div className="flex items-center justify-between p-3 border border-[var(--border-default)] rounded bg-[var(--bg-surface)] flex-wrap gap-2">
                    <span className="text-[var(--text-muted)]">
                      Want to concede this dispute? The opposing side takes the stake pot immediately. Both fees return to payers.
                    </span>
                    <Button
                      scale="sm"
                      intent="outline"
                      disabled={!canConcede || isTransacting}
                      onClick={() =>
                        executeTx(
                          "concede",
                          [caseId],
                          undefined,
                          "You conceded. The pot was awarded to the opposing party."
                        )
                      }
                    >
                      Concede Dispute
                    </Button>
                  </div>
                )}

                {/* Expire if deliberation timed out without majority */}
                {currentTimeSec > details.decideBy && (
                  <div className="flex items-center justify-between p-3 bg-[var(--danger)]/10 border border-[var(--danger)] rounded">
                    <span className="text-[var(--danger)] font-medium">
                      Deliberation time limit reached without a 2-vote majority verdict.
                    </span>
                    <Button
                      scale="sm"
                      disabled={!canExpire || isTransacting}
                      onClick={() =>
                        executeTx(
                          "expire",
                          [caseId],
                          undefined,
                          "Case expired! Stakes and fees refunded."
                        )
                      }
                    >
                      Expire & Refund Stakes
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Terminal States */}
            {details.state === CaseState.Decided && (
              <div className="p-4 bg-[var(--success)]/10 border border-[var(--success)] text-[var(--success)] rounded font-sans text-xs">
                <span className="font-bold text-sm block mb-1">
                  Dispute Decided — Majority Rules
                </span>
                The jury reached a decisive 2-vote majority for Party {winner === "partyA" ? "A" : "B"}.
                Winner received the {formatEther(details.stake * 2n)} BOT stake pot.
                Juror fees ({formatEther(details.fee * 2n)} BOT) have been disbursed to voting jurors.
                Any participant with funds may withdraw them under <Link href="/me" className="underline font-bold">My Caseload</Link>.
              </div>
            )}

            {details.state === CaseState.Conceded && (
              <div className="p-4 bg-[var(--accent)]/10 border border-[var(--accent)] text-[var(--accent)] rounded font-sans text-xs">
                <span className="font-bold text-sm block mb-1">
                  Dispute Conceded
                </span>
                One of the parties conceded during deliberation. Opposing party was awarded the {formatEther(details.stake * 2n)} BOT stake pot.
                All juror fees have been refunded back to their respective payers.
              </div>
            )}

            {details.state === CaseState.Expired && (
              <div className="p-4 bg-[var(--danger)]/10 border border-[var(--danger)] text-[var(--danger)] rounded font-sans text-xs">
                <span className="font-bold text-sm block mb-1">
                  Case Expired
                </span>
                The deadline passed without resolution. All deposited stakes and juror fees have been refunded back to their original payers.
              </div>
            )}

            {details.state === CaseState.Cancelled && (
              <div className="p-4 bg-[var(--text-muted)]/10 border border-[var(--border-default)] text-[var(--text-muted)] rounded font-sans text-xs">
                <span className="font-bold text-sm block mb-1">
                  Offer Cancelled
                </span>
                Party A revoked the dispute offer before Party B accepted it. Escrow was directly refunded.
              </div>
            )}
          </div>
        </Panel>

        {/* Limits & Disclaimer box (Spec §1) */}
        <div className="p-4 border border-[var(--border-subtle)] rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] text-xs font-sans">
          <span className="font-serif font-bold text-[var(--text-primary)] block mb-1 uppercase tracking-wide">
            What a verdict is
          </span>
          <ul className="list-disc pl-4 space-y-1">
            <li>It only moves the stakes. It is not law.</li>
            <li>The jurors are the people A named and B accepted. They can be wrong, and the chain cannot tell.</li>
            <li>If two jurors never agree, everything is returned.</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
