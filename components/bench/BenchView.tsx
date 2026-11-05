"use client";

import { useState } from "react";
import { formatAddress, CaseSeat, CaseState } from "@/lib/jury";

interface BenchViewProps {
  partyA: string;
  partyB: string;
  stakeEth: string;
  feeEth: string;
  jurors: CaseSeat[];
  terms: string;
  termsHash: string;
  hashMatches: boolean;
  state: CaseState;
  winner?: "partyA" | "partyB";
}

export default function BenchView({
  partyA,
  partyB,
  stakeEth,
  feeEth,
  jurors,
  terms,
  termsHash,
  hashMatches,
  state,
  winner,
}: BenchViewProps) {
  const [showTable, setShowTable] = useState(false);

  const stateStamps: Record<number, { text: string; colorClass: string }> = {
    [CaseState.Offered]: { text: "OFFERED", colorClass: "text-[var(--warning)] border-[var(--warning)]" },
    [CaseState.Active]: { text: "IN DELIBERATION", colorClass: "text-[var(--accent)] border-[var(--accent)]" },
    [CaseState.Decided]: {
      text: winner === "partyA" ? "DECIDED — FOR A" : "DECIDED — FOR B",
      colorClass: "text-[var(--success)] border-[var(--success)]",
    },
    [CaseState.Conceded]: {
      text: winner === "partyA" ? "CONCEDED TO A" : "CONCEDED TO B",
      colorClass: "text-[var(--accent)] border-[var(--accent)]",
    },
    [CaseState.Expired]: { text: "EXPIRED", colorClass: "text-[var(--danger)] border-[var(--danger)]" },
    [CaseState.Cancelled]: { text: "CANCELLED", colorClass: "text-[var(--text-muted)] border-[var(--text-muted)]" },
  };

  const stamp = stateStamps[state] || stateStamps[CaseState.Active];

  return (
    <div className="flex flex-col gap-5">
      {/* Bench Header controls & Mode Toggle */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-muted)] font-mono">
          3 Named Jurors • 2 Votes Required for Verdict
        </span>
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="font-sans uppercase font-bold tracking-wider text-[var(--accent)] hover:underline cursor-pointer"
          aria-pressed={showTable}
        >
          {showTable ? "View Courtroom Bench" : "View Accessible Table"}
        </button>
      </div>

      {showTable ? (
        /* Accessible Table Equivalent (Spec §8.3) */
        <div className="overflow-x-auto rounded border border-[var(--border-default)] bg-[var(--bg-surface)]">
          <table className="w-full text-left text-xs font-sans">
            <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Seat</th>
                <th className="py-2.5 px-3">Juror Wallet</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Verdict Cast</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
              {jurors.map((j, idx) => (
                <tr key={j.address} className="hover:bg-[var(--bg-elevated)]/40">
                  <td className="py-2 px-3 font-serif font-bold text-[var(--accent)]">
                    Juror #{idx + 1}
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {formatAddress(j.address)}
                    </span>
                    {j.isCurrentUser && (
                      <span className="ml-2 text-[10px] font-sans uppercase px-1.5 py-0.5 rounded bg-[var(--accent)] text-[var(--accent-ink)] font-bold">
                        You
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 font-sans text-[var(--text-muted)]">
                    {j.vote === 0 ? "Awaiting vote" : "Voted"}
                  </td>
                  <td className="py-2 px-3 text-right font-sans">
                    {j.vote === 1 ? (
                      <span className="font-bold text-[var(--success)] bg-[var(--success)]/15 px-2 py-0.5 rounded">
                        FOR PARTY A
                      </span>
                    ) : j.vote === 2 ? (
                      <span className="font-bold text-[var(--accent)] bg-[var(--accent)]/15 px-2 py-0.5 rounded">
                        FOR PARTY B
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)] italic">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Courtroom Bench Archetype (AZ · Bench) */
        <div className="relative rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:p-6 shadow-sm overflow-hidden flex flex-col gap-6">
          {/* Top: 3 Juror Seats in a row on the bench */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-sans uppercase tracking-widest text-[var(--text-muted)] font-bold text-center">
              The Jury Bench
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {jurors.map((j, idx) => (
                <div
                  key={j.address}
                  className={`p-3 rounded border flex flex-col items-center gap-1.5 text-center transition-all ${
                    j.vote !== 0
                      ? "bg-[var(--bg-elevated)] border-[var(--border-strong)]"
                      : "bg-[var(--bg-surface)] border-[var(--border-subtle)]"
                  }`}
                >
                  <span className="font-serif font-bold text-xs text-[var(--accent)]">
                    Seat #{idx + 1}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                    {formatAddress(j.address)}
                  </span>
                  {j.isCurrentUser && (
                    <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[var(--accent)]">
                      (Your Seat)
                    </span>
                  )}
                  <div className="mt-1">
                    {j.vote === 1 ? (
                      <span className="text-[11px] font-sans font-bold uppercase px-2 py-0.5 rounded bg-[var(--success)] text-white">
                        ⚖️ For Party A
                      </span>
                    ) : j.vote === 2 ? (
                      <span className="text-[11px] font-sans font-bold uppercase px-2 py-0.5 rounded bg-[var(--accent)] text-white">
                        ⚖️ For Party B
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        Empty / Deliberating
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Middle: Parties & Document Sheet */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
            {/* Party A Chest */}
            <div className="p-4 rounded border border-[var(--border-default)] bg-[var(--bg-elevated)] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-sans uppercase font-bold text-[var(--text-muted)] tracking-wider">
                  Party A (Petitioner)
                </span>
                <p className="font-mono text-xs font-bold text-[var(--text-primary)] mt-1 truncate">
                  {formatAddress(partyA)}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Locked Stake</span>
                <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
                  {stakeEth} BOT
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] block">
                  + {feeEth} fee
                </span>
              </div>
            </div>

            {/* Document Sheet (Terms with Stamp) */}
            <div className="lg:col-span-2 relative p-5 rounded border-2 border-[var(--border-default)] bg-[var(--bg-surface)] shadow-md flex flex-col justify-between min-h-[160px]">
              {/* Verdict Stamp */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
                <div
                  className={`border-4 border-dashed rounded px-4 py-2 font-serif text-lg sm:text-xl font-bold uppercase tracking-widest rotate-[-10deg] opacity-85 shadow-sm ${stamp.colorClass}`}
                >
                  {stamp.text}
                </div>
              </div>

              {/* Terms Content */}
              <div className="relative z-0">
                <span className="text-[10px] font-sans uppercase font-bold tracking-widest text-[var(--text-muted)] block mb-1">
                  Agreed Terms of Case
                </span>
                <p className="font-serif text-sm text-[var(--text-primary)] italic leading-relaxed whitespace-pre-wrap">
                  &ldquo;{terms || "Terms text unavailable from transaction log."}&rdquo;
                </p>
              </div>

              {/* Hash Verification Line */}
              <div className="relative z-0 mt-4 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono">
                <span className="truncate max-w-[200px] text-[var(--text-muted)]" title={termsHash}>
                  Hash: {termsHash.slice(0, 10)}…{termsHash.slice(-6)}
                </span>
                {hashMatches ? (
                  <span className="text-[var(--success)] font-sans font-semibold">
                    ✓ Verified on-chain
                  </span>
                ) : (
                  <span className="text-[var(--warning)] font-sans font-semibold">
                    ⚠ Hash mismatch
                  </span>
                )}
              </div>
            </div>

            {/* Party B Chest */}
            <div className="p-4 rounded border border-[var(--border-default)] bg-[var(--bg-elevated)] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-sans uppercase font-bold text-[var(--text-muted)] tracking-wider">
                  Party B (Respondent)
                </span>
                <p className="font-mono text-xs font-bold text-[var(--text-primary)] mt-1 truncate">
                  {formatAddress(partyB)}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Locked Stake</span>
                <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
                  {stakeEth} BOT
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] block">
                  + {feeEth} fee
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
