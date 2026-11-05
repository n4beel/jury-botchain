import { describe, it, expect } from "vitest";
import {
  escrowNeeded,
  verdict,
  feeShares,
  termsHash,
  formatAddress,
  canUserVote,
  CaseState,
} from "../jury";
import { parseEther, keccak256, toHex } from "viem";

describe("Jury Domain & Reference Models (Spec §4)", () => {
  it("escrowNeeded adds stake and fee", () => {
    expect(escrowNeeded(parseEther("1"), parseEther("0.1"))).toBe(parseEther("1.1"));
    expect(escrowNeeded(parseEther("100"), 0n)).toBe(parseEther("100"));
  });

  it("verdict detects majority when either side reaches 2 votes", () => {
    // 0-0 -> pending
    expect(verdict(0, 0)).toBe("pending");
    // 1-0 -> pending
    expect(verdict(1, 0)).toBe("pending");
    // 1-1 -> pending (tie)
    expect(verdict(1, 1)).toBe("pending");
    // 2-0 -> partyA
    expect(verdict(2, 0)).toBe("partyA");
    // 2-1 -> partyA
    expect(verdict(2, 1)).toBe("partyA");
    // 0-2 -> partyB
    expect(verdict(0, 2)).toBe("partyB");
    // 1-2 -> partyB
    expect(verdict(1, 2)).toBe("partyB");
  });

  it("feeShares calculates fee distribution and remainder", () => {
    const fee = parseEther("0.1"); // total pool = 0.2 ether = 200000000000000000 wei

    // 2 voters -> 0.1 ether each, remainder 0
    expect(feeShares(fee, 2)).toEqual({
      share: parseEther("0.1"),
      remainder: 0n,
    });

    // 3 voters -> 66666666666666666 wei each, remainder 2 wei
    expect(feeShares(fee, 3)).toEqual({
      share: (parseEther("0.2")) / 3n,
      remainder: (parseEther("0.2")) % 3n,
    });

    // 0 voters -> 0 share, entire pool remainder
    expect(feeShares(fee, 0)).toEqual({
      share: 0n,
      remainder: parseEther("0.2"),
    });
  });

  it("termsHash matches keccak256(toHex(text))", () => {
    const terms = "Alpha wins the race on Saturday.";
    const hash = termsHash(terms);
    expect(hash).toBe(keccak256(toHex(terms)));
  });

  it("canUserVote is a strict boolean predicate covering ties and stranger seats", () => {
    const jurors = [
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222",
      "0x3333333333333333333333333333333333333333",
    ];

    const now = 500n;
    const decideBy = 1000n;

    // Juror 1 can vote when active and not voted
    expect(canUserVote(jurors[0], jurors, CaseState.Active, now, decideBy, false)).toBe(true);

    // Juror 1 cannot vote if already voted
    expect(canUserVote(jurors[0], jurors, CaseState.Active, now, decideBy, true)).toBe(false);

    // Stranger cannot vote
    expect(
      canUserVote("0x9999999999999999999999999999999999999999", jurors, CaseState.Active, now, decideBy, false)
    ).toBe(false);

    // Undefined user cannot vote
    expect(canUserVote(undefined, jurors, CaseState.Active, now, decideBy, false)).toBe(false);

    // Not active case
    expect(canUserVote(jurors[0], jurors, CaseState.Offered, now, decideBy, false)).toBe(false);
    expect(canUserVote(jurors[0], jurors, CaseState.Decided, now, decideBy, false)).toBe(false);

    // Past deadline
    expect(canUserVote(jurors[0], jurors, CaseState.Active, 1001n, decideBy, false)).toBe(false);
  });

  it("formatAddress shortens addresses", () => {
    expect(formatAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
  });
});
