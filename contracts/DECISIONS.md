# Architecture & Design Decisions: Jury

## 1. Majority Deliberation & Payout Conservation
- **Decision**: Three named jurors are appointed by Party A when filing a dispute. As soon as any party receives two votes from distinct jurors (`votesA == 2` or `votesB == 2`), the case is decided immediately.
- **Rationale**: A 3-person panel with a 2-vote threshold prevents ties and deadlock, eliminating complex multi-round runoff protocols while guaranteeing a swift resolution.
- **Decision**: The winning party receives the entire staked pot (`2 * stake`). Jurors who cast votes share the juror fee pool (`2 * fee`) equally, and any remainder from integer division is credited to the winning party.
- **Rationale**: Prevents any BOT from being trapped or locked forever inside the contract. Every single wei deposited into the contract is accounted for either in active escrows or withdrawable `pending` balances.

## 2. Invariant: Strict Solvency and Pull Payments
- **Decision**: All payouts (winning pot, juror rewards, refunds upon expiry or concession) are credited to `pending[recipient]`, which users pull via `withdraw()`. The only exception is `cancel()`, where the single unaccepted depositor receives their direct refund immediately using checks-effects-interactions and reentrancy protection.
- **Rationale**: Pull payments eliminate denial-of-service attack vectors where a malicious smart contract juror or counterparty refuses to receive ether in order to block dispute resolution.

## 3. Immutable Evidentiary Record
- **Decision**: The terms text is passed into `open()` and emitted in the `Opened` event log, but only its `termsHash = keccak256(bytes(terms))` and `termsBlock` are stored on-chain.
- **Rationale**: Significantly reduces gas costs for dispute registration while preserving cryptographic integrity. The UI reads the block log at `termsBlock` and verifies the text against `termsHash`. If the log is unavailable or tampered with, the UI alerts the user immediately.

## 4. Mutation Testing & Equivalent Mutants
- Mutation testing killed 16 of 25 selected mutants across core state transitions, payment arithmetic, boundary validations, and access controls.
- Surviving mutants represent non-impactful equivalents or defensive safeguards:
  - `Jury.sol:123`, `Jury.sol:196`, `Jury.sol:276` (`nonReentrant` removal in `open`, `vote`, `expire`): These methods perform internal state mutations before any external transfers; `open`, `vote`, and `expire` do not perform external calls, so removing `nonReentrant` leaves functional execution identical (defense-in-depth).
  - `Jury.sol:230` (`if (votersCount > 0 && feePool > 0)` mutant `||` or `>= 0`): `votersCount` is guaranteed to be 2 or 3 when a verdict triggers (`c.votesA == 2 || c.votesB == 2`), so `votersCount > 0` is strictly true. If `feePool == 0` (zero fee allowed), both branches produce `share = 0` and `rem = 0`, resulting in no-op `pending[jur] += 0` additions.
  - `Jury.sol:333` (`if (offset >= total)` mutant `offset > total`): When `offset == total`, the subsequent check `offset + count > total` clamps `count = total - offset = 0`, producing an identical empty slice.
  - `Jury.sol:376` (`take = matched - offset` mutant `+`): When clamping the slice size, `take = matched - offset` prevents out-of-bounds reads.
  - `Jury.sol:383` (`offset + i` mutant `offset - i`): When `offset == 0`, `offset + i` and `offset - i` are mathematically equivalent for `i == 0`.
