// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Test.sol";
import "../src/Jury.sol";

contract JuryHandler is Test {
  Jury public immutable jury;

  address public partyA = address(0x1111);
  address public partyB = address(0x2222);
  address public juror1 = address(0x3333);
  address public juror2 = address(0x4444);
  address public juror3 = address(0x5555);

  uint256 public activeCaseId;

  constructor(Jury _jury) {
    jury = _jury;

    vm.deal(partyA, 1000 ether);
    vm.deal(partyB, 1000 ether);
    vm.deal(juror1, 1000 ether);
    vm.deal(juror2, 1000 ether);
    vm.deal(juror3, 1000 ether);

    // Initial case
    vm.prank(partyA);
    activeCaseId = jury.open{value: 1.1 ether}(
      partyB,
      [juror1, juror2, juror3],
      "Invariant test terms",
      1 ether,
      0.1 ether,
      7 days
    );
  }

  function act(uint256 actionSeed, bool voteA) external {
    uint256 action = actionSeed % 5;
    Jury.Case memory c = jury.caseOf(activeCaseId);

    if (action == 0 && c.state == Jury.State.Offered) {
      // Accept
      vm.prank(partyB);
      try jury.accept{value: 1.1 ether}(activeCaseId) {} catch {}
    } else if (action == 1 && c.state == Jury.State.Active) {
      // Juror 1 vote
      vm.prank(juror1);
      try jury.vote(activeCaseId, voteA) {} catch {}
    } else if (action == 2 && c.state == Jury.State.Active) {
      // Juror 2 vote
      vm.prank(juror2);
      try jury.vote(activeCaseId, voteA) {} catch {}
    } else if (action == 3 && c.state == Jury.State.Active) {
      // Concede
      vm.prank(partyA);
      try jury.concede(activeCaseId) {} catch {}
    } else if (action == 4) {
      // Withdraw
      vm.prank(partyA);
      try jury.withdraw() {} catch {}
      vm.prank(partyB);
      try jury.withdraw() {} catch {}
    }
  }
}

contract JuryInvariantTest is Test {
  Jury public jury;
  JuryHandler public handler;

  function setUp() public {
    jury = new Jury();
    handler = new JuryHandler(jury);

    targetContract(address(handler));
  }

  function invariant_BalanceEqualsEscrowPlusPending() public view {
    uint256 totalCasesEscrow = 0;
    uint256 count = jury.caseCount();

    for (uint256 i = 1; i <= count; i++) {
      Jury.Case memory c = jury.caseOf(i);
      if (c.state == Jury.State.Active) {
        totalCasesEscrow += 2 * (uint256(c.stake) + uint256(c.fee));
      } else if (c.state == Jury.State.Offered) {
        totalCasesEscrow += (uint256(c.stake) + uint256(c.fee));
      }
    }

    uint256 totalPending = jury.pending(handler.partyA()) +
      jury.pending(handler.partyB()) +
      jury.pending(handler.juror1()) +
      jury.pending(handler.juror2()) +
      jury.pending(handler.juror3());

    assertGe(address(jury).balance, totalCasesEscrow + totalPending);
  }
}
