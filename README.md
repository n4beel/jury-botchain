# Jury (Project 67)

Two sides, three named jurors, majority rules.

## Overview
Jury provides an on-chain arbitration docket and peer dispute settlement bench.
Party A files a dispute against Party B specifying contract terms (up to 400 bytes), three distinct named jurors, an escrowed stake, and an optional juror fee.
Party B has a 3-day acceptance window to match the stake and fee.
Once in deliberation, the three jurors cast votes. As soon as two matching votes are cast for either party, the winner is awarded both stakes, while participating jurors equally divide the combined fee pool.

If no consensus is reached before the deadline, all escrowed stakes and fees are refunded to the depositors.

## Archetype
- **Layout Archetype**: **AZ · Bench**
- **Ground / Ink / Accent**: `#B58CF0` / `#190A33` / `#3C1A78`
- **Typography**: Noto Serif Display · Montserrat · Atkinson Hyperlegible Mono

## WCAG Contrast Verification
- Ink (`#190A33`) on Ground (`#B58CF0`): **7.0:1** (Passes AAA)
- Ink (`#190A33`) on Surface (`#FFFFFF`): **18.5:1** (Passes AAA)
- Muted (`#3E2960`) on Surface (`#FFFFFF`): **12.4:1** (Passes AAA)
- Accent Ink (`#FFFFFF`) on Accent (`#3C1A78`): **13.0:1** (Passes AAA)
- Wallet Menu FG (`#190A33`) on Menu BG (`#FFFFFF`): **18.5:1** (Passes AAA)
- Wallet Menu Muted (`#7A7189`) on Menu BG (`#FFFFFF`): **4.6:1** (Passes AA)

## Test Coverage
- **Foundry Unit & Fuzz**: 20 tests pass
- **Invariant Test**: 1 suite (128,000 calls across multiple actors, 0 reverts, balance strictly conserved)
- **Vitest Unit**: 48 tests pass across limits, math, and lint checks
- **Integration**: 5 tests pass against local Anvil node (port 8667)
- **Mutation Kill Rate**: 16 / 25 killed (64%, remaining 9 documented in `contracts/DECISIONS.md`)
