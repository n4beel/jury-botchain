// lib/jury.ts - Pure reference models and math for Jury (Spec §2, §4)
import { keccak256, toHex } from "viem";

export enum CaseState {
  Offered = 0,
  Active = 1,
  Decided = 2,
  Expired = 3,
  Conceded = 4,
  Cancelled = 5,
}

/**
 * Total deposit required from each party: stake + fee
 */
export function escrowNeeded(stake: bigint, fee: bigint): bigint {
  return stake + fee;
}

export type VerdictResult = "pending" | "partyA" | "partyB";

/**
 * Returns verdict when either side reaches 2 votes.
 */
export function verdict(votesA: number, votesB: number): VerdictResult {
  if (votesA >= 2) return "partyA";
  if (votesB >= 2) return "partyB";
  return "pending";
}

/**
 * Calculates fee share per voting juror and remainder to winner:
 * pool = 2 * fee
 * share = pool / votersCount
 * remainder = pool % votersCount
 */
export function feeShares(fee: bigint, votersCount: number): { share: bigint; remainder: bigint } {
  if (votersCount <= 0) return { share: 0n, remainder: fee * 2n };
  const pool = fee * 2n;
  const count = BigInt(votersCount);
  return {
    share: pool / count,
    remainder: pool % count,
  };
}

/**
 * Computes UTF-8 keccak256 hash of the terms text.
 */
export function termsHash(text: string): `0x${string}` {
  return keccak256(toHex(text));
}

export function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export interface CaseSeat {
  address: string;
  vote: 0 | 1 | 2; // 0 none, 1 for A, 2 for B
  isCurrentUser: boolean;
  canVote: boolean;
}

/**
 * Plain boolean predicate for whether a user can vote.
 * Caution from design review: Keep every "can this seat vote?" check a plain boolean!
 */
export function canUserVote(
  userAddress: string | undefined,
  jurors: string[],
  caseState: number,
  now: bigint,
  decideBy: bigint,
  hasVoted: boolean
): boolean {
  if (!userAddress) return false;
  if (caseState !== CaseState.Active) return false;
  if (now > decideBy) return false;
  if (hasVoted) return false;

  const norm = userAddress.toLowerCase();
  const isJuror = jurors.some((j) => j.toLowerCase() === norm);
  return isJuror;
}
