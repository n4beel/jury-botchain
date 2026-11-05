# Architecture & Design Decisions: Jury

## 1. Decentralized Three-Juror Escrow & Majority Verdict
- **Decision**: In `Jury.sol`, cases require two parties (initiator $A$ and respondent $B$) who each deposit an identical `stake` plus an agreed juror `fee`. The dispute is heard by a bench of exactly 3 predetermined distinct jurors. A verdict is reached as soon as 2 jurors agree (majority of 3), awarding the $2 \times \text{stake}$ pot to the winner.
- **Rationale**: A fixed 3-member bench ensures unambiguous resolution (no ties possible among 3 binary votes) without centralized admin or owner oversight.

## 2. Juror Compensation and Remainder Distribution
- **Decision**:
  - The total juror fee pool equals $2 \times \text{fee}$ (funded equally by $A$ and $B$).
  - When decided, the fee is divided equally among the jurors who cast a vote ($2$ or $3$).
  - Any division remainder (`rem = feePool % votersCount`) is credited to the winning party.
  - If a case expires before a 2-vote majority is reached, or is conceded, unspent stakes and fees are refunded/returned appropriately.
- **Rationale**: Jurors are compensated only if they actively participated before a verdict was determined, discouraging inactive seats while avoiding stuck wei.

## 3. Pull-Payment Escrow Pattern
- **Decision**: All payouts (verdict pot, juror fees, expired case refunds, and cancellation refunds) are credited to `pending[address]`. Beneficiaries retrieve funds at their convenience using `withdraw()`.
- **Rationale**: Strictly satisfies Checks-Effects-Interactions and prevents griefing/DoS attacks where a party's reverting fallback function attempts to freeze dispute execution or juror reward distribution.

## 4. Mutation Testing & Equivalent Mutants (18 of 25 killed; 7 genuinely equivalent survivors)
When tested against 25 pseudo-random mutations using `scripts/mutation-check.py jury`:
1. `Jury.sol:123`, `Jury.sol:196`, `Jury.sol:276` (`nonReentrant` removed from `open()`, `vote()`, `expire()`):
   - `open()` accepts `msg.value` and creates storage entries without making any external calls.
   - `vote()` writes state transitions and updates `pending` mappings with zero external calls.
   - `expire()` updates case state to `State.Expired` and updates `pending` credits before returning with zero external calls.
   - Because no external calls or transfers occur during execution, reentrancy is structurally impossible, making `nonReentrant` an in-depth defensive safeguard.
2. `Jury.sol:230` (`if (votersCount > 0 && feePool > 0)`):
   - Mutants: `votersCount > 0 || feePool > 0`, `votersCount >= 0 && feePool > 0`, and `votersCount > 0 && feePool >= 0`.
   - Line 220 checks `if (c.votesA == 2 || c.votesB == 2)`. Because each juror votes only once, `votersCount = c.votesA + c.votesB` is strictly either 2 or 3 at line 230; it can never be zero.
   - When `feePool == 0` (zero-fee cases, as pinned by `test_CaseWithZeroFeeRunsToVerdict`), `votersCount > 0 && feePool >= 0` enters the branch where `share = 0` and `rem = 0`. It loops over jurors and adds `0` to `pending[jur]`, which is a no-op identity transformation that neither alters storage balances nor emits extraneous events.
3. `Jury.sol:333` (`latest` pagination `if (offset >= total)` mutated to `>`):
   - Genuinely equivalent: when `offset == total`, `offset >= total` returns empty array. If mutated to `offset > total`, the function proceeds to line 337: `if (offset + count > total) count = total - offset = total - total = 0`. It then allocates `new uint256[](0)` and returns an empty array. Both branches return an identical empty array on every possible input.
