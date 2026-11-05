// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Test.sol";
import "../src/Jury.sol";

contract MaliciousRecipient {
  Jury public immutable target;
  bool public attackWithdraw;
  bool public attackCancel;
  uint256 public attackCaseId;

  constructor(Jury _target) {
    target = _target;
  }

  function setAttackWithdraw(bool _attack) external {
    attackWithdraw = _attack;
  }

  function setAttackCancel(bool _attack, uint256 _cid) external {
    attackCancel = _attack;
    attackCaseId = _cid;
  }

  function triggerWithdraw() external {
    target.withdraw();
  }

  function triggerCancel(uint256 cid) external {
    target.cancel(cid);
  }

  receive() external payable {
    if (attackWithdraw) {
      target.withdraw();
    }
    if (attackCancel) {
      target.cancel(attackCaseId);
    }
  }
}

contract JuryTest is Test {
  Jury public jury;

  address public partyA = address(0x101);
  address public partyB = address(0x102);
  address public juror1 = address(0x201);
  address public juror2 = address(0x202);
  address public juror3 = address(0x203);
  address public outsider = address(0x999);

  uint128 public constant STAKE = 1 ether;
  uint128 public constant FEE = 0.1 ether;
  uint32 public constant DECIDE_SECS = 7 days;
  string public constant TERMS = "Party A bets Party B that Team Alpha wins the finals.";

  function setUp() public {
    jury = new Jury();

    vm.deal(partyA, 100 ether);
    vm.deal(partyB, 100 ether);
    vm.deal(juror1, 100 ether);
    vm.deal(juror2, 100 ether);
    vm.deal(juror3, 100 ether);
    vm.deal(outsider, 100 ether);
  }

  function _defaultJurors() internal view returns (address[3] memory) {
    return [juror1, juror2, juror3];
  }

  function _openCase() internal returns (uint256) {
    vm.prank(partyA);
    return jury.open{value: STAKE + FEE}(
      partyB,
      _defaultJurors(),
      TERMS,
      STAKE,
      FEE,
      DECIDE_SECS
    );
  }

  function _openAndAcceptCase() internal returns (uint256 cid) {
    cid = _openCase();
    vm.prank(partyB);
    jury.accept{value: STAKE + FEE}(cid);
  }

  function test_OpenEscrowsStakePlusFee() public {
    uint256 cid = _openCase();
    Jury.Case memory c = jury.caseOf(cid);
    assertEq(c.a, partyA);
    assertEq(c.b, partyB);
    assertEq(uint8(c.state), uint8(Jury.State.Offered));
    assertEq(c.stake, STAKE);
    assertEq(c.fee, FEE);
    assertEq(address(jury).balance, STAKE + FEE);

    address[3] memory jList = jury.jurorsOf(cid);
    assertEq(jList[0], juror1);
    assertEq(jList[1], juror2);
    assertEq(jList[2], juror3);
  }

  function test_BadPartiesAndJurorsRevert() public {
    // 1. Party B is address(0)
    vm.prank(partyA);
    vm.expectRevert(Jury.BadParty.selector);
    jury.open{value: STAKE + FEE}(address(0), _defaultJurors(), TERMS, STAKE, FEE, DECIDE_SECS);

    // 2. Party B is Party A (self)
    vm.prank(partyA);
    vm.expectRevert(Jury.BadParty.selector);
    jury.open{value: STAKE + FEE}(partyA, _defaultJurors(), TERMS, STAKE, FEE, DECIDE_SECS);

    // 3. Juror is zero address
    vm.prank(partyA);
    vm.expectRevert(Jury.BadJurors.selector);
    jury.open{value: STAKE + FEE}(partyB, [address(0), juror2, juror3], TERMS, STAKE, FEE, DECIDE_SECS);

    // 4. Juror is party A
    vm.prank(partyA);
    vm.expectRevert(Jury.BadJurors.selector);
    jury.open{value: STAKE + FEE}(partyB, [partyA, juror2, juror3], TERMS, STAKE, FEE, DECIDE_SECS);

    // 5. Juror is party B
    vm.prank(partyA);
    vm.expectRevert(Jury.BadJurors.selector);
    jury.open{value: STAKE + FEE}(partyB, [juror1, partyB, juror3], TERMS, STAKE, FEE, DECIDE_SECS);

    // 6. Duplicate jurors
    vm.prank(partyA);
    vm.expectRevert(Jury.BadJurors.selector);
    jury.open{value: STAKE + FEE}(partyB, [juror1, juror1, juror3], TERMS, STAKE, FEE, DECIDE_SECS);

    // 7. Empty terms
    vm.prank(partyA);
    vm.expectRevert(Jury.BadTerms.selector);
    jury.open{value: STAKE + FEE}(partyB, _defaultJurors(), "", STAKE, FEE, DECIDE_SECS);

    // 8. Stake below min
    vm.prank(partyA);
    vm.expectRevert(Jury.BadParams.selector);
    jury.open{value: 0.005 ether + FEE}(partyB, _defaultJurors(), TERMS, 0.005 ether, FEE, DECIDE_SECS);
  }

  function test_AcceptMatchesStake() public {
    uint256 cid = _openCase();

    // Wrong payment fails
    vm.prank(partyB);
    vm.expectRevert(abi.encodeWithSelector(Jury.WrongPayment.selector, STAKE + FEE));
    jury.accept{value: STAKE}(cid);

    // Exact payment succeeds
    vm.prank(partyB);
    jury.accept{value: STAKE + FEE}(cid);

    Jury.Case memory c = jury.caseOf(cid);
    assertEq(uint8(c.state), uint8(Jury.State.Active));
    assertEq(address(jury).balance, (STAKE + FEE) * 2);
  }

  function test_AcceptByStrangerOrLateReverts() public {
    uint256 cid = _openCase();

    // Stranger cannot accept
    vm.prank(outsider);
    vm.expectRevert(Jury.NotParty.selector);
    jury.accept{value: STAKE + FEE}(cid);

    // Past 3 days reverts TooLate
    vm.warp(block.timestamp + 3 days + 1);
    vm.prank(partyB);
    vm.expectRevert(Jury.TooLate.selector);
    jury.accept{value: STAKE + FEE}(cid);
  }

  function test_TwoVotesForADecidesForA() public {
    uint256 cid = _openAndAcceptCase();

    vm.prank(juror1);
    jury.vote(cid, true);

    Jury.Case memory c = jury.caseOf(cid);
    assertEq(uint8(c.state), uint8(Jury.State.Active));
    assertEq(c.votesA, 1);

    // Juror 2 votes for A -> reaches 2 votes -> Decided for A!
    vm.prank(juror2);
    jury.vote(cid, true);

    c = jury.caseOf(cid);
    assertEq(uint8(c.state), uint8(Jury.State.Decided));
    assertEq(c.votesA, 2);

    // Winner gets pot: 2 * STAKE = 2 ether
    assertEq(jury.pending(partyA), 2 ether);

    // Two jurors voted: fee pool = 2 * FEE = 0.2 ether. Split equally: 0.1 ether each
    assertEq(jury.pending(juror1), 0.1 ether);
    assertEq(jury.pending(juror2), 0.1 ether);
    assertEq(jury.pending(juror3), 0); // didn't vote
  }

  function test_TwoVotesForBDecidesForB() public {
    uint256 cid = _openAndAcceptCase();

    vm.prank(juror1);
    jury.vote(cid, false);
    vm.prank(juror3);
    jury.vote(cid, false);

    Jury.Case memory c = jury.caseOf(cid);
    assertEq(uint8(c.state), uint8(Jury.State.Decided));

    // Winner B gets 2 ether
    assertEq(jury.pending(partyB), 2 ether);
    assertEq(jury.pending(juror1), 0.1 ether);
    assertEq(jury.pending(juror3), 0.1 ether);
  }

  function test_SplitVotesThenThirdDecides() public {
    uint256 cid = _openAndAcceptCase();

    vm.prank(juror1);
    jury.vote(cid, true); // 1 for A
    vm.prank(juror2);
    jury.vote(cid, false); // 1 for B

    Jury.Case memory c = jury.caseOf(cid);
    assertEq(uint8(c.state), uint8(Jury.State.Active));
    assertEq(c.votesA, 1);
    assertEq(c.votesB, 1);

    // Juror 3 decides for B
    vm.prank(juror3);
    jury.vote(cid, false);

    // 3 jurors voted! Fee pool = 0.2 ether.
    // 0.2 ether / 3 = 66666666666666666 wei each, remainder 2 wei to winner B
    uint256 expectedShare = uint256(0.2 ether) / 3;
    uint256 rem = uint256(0.2 ether) % 3;

    assertEq(jury.pending(juror1), expectedShare);
    assertEq(jury.pending(juror2), expectedShare);
    assertEq(jury.pending(juror3), expectedShare);
    assertEq(jury.pending(partyB), 2 ether + rem);
  }

  function test_VotesAfterVerdictRevert() public {
    uint256 cid = _openAndAcceptCase();

    vm.prank(juror1);
    jury.vote(cid, true);
    vm.prank(juror2);
    jury.vote(cid, true);

    // Juror 3 tries to vote after decided
    vm.prank(juror3);
    vm.expectRevert(Jury.NotActive.selector);
    jury.vote(cid, true);
  }

  function test_JurorsPaidOnlyIfTheyVoted() public {
    uint256 cid = _openAndAcceptCase();

    vm.prank(juror1);
    jury.vote(cid, true);
    vm.prank(juror2);
    jury.vote(cid, true);

    assertEq(jury.pending(juror3), 0);
  }

  function test_FeeRemainderGoesToWinner() public {
    // Open case with fee = 1 wei. Fee pool = 2 wei.
    // 3 jurors vote -> 2 wei / 3 = 0 each, remainder = 2 wei to winner
    vm.prank(partyA);
    uint256 cid = jury.open{value: STAKE + 1}(partyB, _defaultJurors(), TERMS, STAKE, 1, DECIDE_SECS);
    vm.prank(partyB);
    jury.accept{value: STAKE + 1}(cid);

    vm.prank(juror1);
    jury.vote(cid, true);
    vm.prank(juror2);
    jury.vote(cid, false);
    vm.prank(juror3);
    jury.vote(cid, true);

    assertEq(jury.pending(partyA), 2 * STAKE + 2);
    assertEq(jury.pending(juror1), 0);
    assertEq(jury.pending(juror2), 0);
    assertEq(jury.pending(juror3), 0);
  }

  function test_NonJurorCannotVote() public {
    uint256 cid = _openAndAcceptCase();

    vm.prank(outsider);
    vm.expectRevert(Jury.NotJuror.selector);
    jury.vote(cid, true);

    vm.prank(partyA);
    vm.expectRevert(Jury.NotJuror.selector);
    jury.vote(cid, true);
  }

  function test_ConcedeGivesOtherSidePotAndReturnsFees() public {
    uint256 cid = _openAndAcceptCase();

    // Party B concedes
    vm.prank(partyB);
    jury.concede(cid);

    Jury.Case memory c = jury.caseOf(cid);
    assertEq(uint8(c.state), uint8(Jury.State.Conceded));

    // Winner A gets 2 * STAKE (2 ether) + their fee back (0.1 ether) = 2.1 ether
    assertEq(jury.pending(partyA), 2 ether + FEE);
    // Conceder B gets their fee back (0.1 ether)
    assertEq(jury.pending(partyB), FEE);

    // Jurors get nothing
    assertEq(jury.pending(juror1), 0);
  }

  function test_ExpireWithoutMajorityReturnsEverything() public {
    uint256 cid = _openAndAcceptCase();

    // 1 vote only
    vm.prank(juror1);
    jury.vote(cid, true);

    // Before decideBy expires, expire reverts
    Jury.Case memory c = jury.caseOf(cid);
    vm.expectRevert(abi.encodeWithSelector(Jury.NotExpired.selector, c.decideBy));
    jury.expire(cid);

    // Warp past decideBy
    vm.warp(c.decideBy + 1);

    jury.expire(cid);

    c = jury.caseOf(cid);
    assertEq(uint8(c.state), uint8(Jury.State.Expired));

    // Both get stake + fee back
    assertEq(jury.pending(partyA), STAKE + FEE);
    assertEq(jury.pending(partyB), STAKE + FEE);
  }

  function test_CancelBeforeAcceptRefundsA() public {
    uint256 cid = _openCase();

    uint256 balBefore = partyA.balance;
    vm.prank(partyA);
    jury.cancel(cid);

    Jury.Case memory c = jury.caseOf(cid);
    assertEq(uint8(c.state), uint8(Jury.State.Cancelled));
    assertEq(partyA.balance, balBefore + STAKE + FEE);
  }

  function test_ExpireOfferedRefundsA() public {
    uint256 cid = _openCase();

    Jury.Case memory c = jury.caseOf(cid);
    vm.warp(c.acceptBy + 1);

    jury.expire(cid);
    assertEq(jury.pending(partyA), STAKE + FEE);
  }

  function test_TermsHashMatchesText() public {
    uint256 cid = _openCase();
    Jury.Case memory c = jury.caseOf(cid);
    bytes32 expectedHash = keccak256(bytes(TERMS));
    assertEq(c.termsHash, expectedHash);
  }

  function test_ReentrantCancelBlocked() public {
    MaliciousRecipient attacker = new MaliciousRecipient(jury);
    vm.deal(address(attacker), 10 ether);

    vm.prank(address(attacker));
    uint256 cid = jury.open{value: STAKE + FEE}(partyB, _defaultJurors(), TERMS, STAKE, FEE, DECIDE_SECS);

    attacker.setAttackCancel(true, cid);
    vm.expectRevert(Jury.TransferFailed.selector);
    attacker.triggerCancel(cid);
  }

  function test_ReentrantWithdrawBlocked() public {
    MaliciousRecipient attacker = new MaliciousRecipient(jury);
    vm.deal(address(attacker), 10 ether);

    vm.prank(address(attacker));
    uint256 cid = jury.open{value: STAKE + FEE}(partyB, _defaultJurors(), TERMS, STAKE, FEE, DECIDE_SECS);

    vm.warp(block.timestamp + 4 days);
    jury.expire(cid);

    attacker.setAttackWithdraw(true);
    vm.expectRevert(Jury.TransferFailed.selector);
    attacker.triggerWithdraw();
  }

  function testFuzz_AllPathsConserve(uint8 path, bool vote1, bool vote2, bool vote3) public {
    uint256 cid = _openCase();

    if (path % 4 == 0) {
      // Cancel
      vm.prank(partyA);
      jury.cancel(cid);
    } else if (path % 4 == 1) {
      // Expire offered
      vm.warp(block.timestamp + 4 days);
      jury.expire(cid);
    } else {
      // Accept
      vm.prank(partyB);
      jury.accept{value: STAKE + FEE}(cid);

      if (path % 4 == 2) {
        // Concede
        vm.prank(partyA);
        jury.concede(cid);
      } else {
        // Votes
        vm.prank(juror1);
        jury.vote(cid, vote1);
        vm.prank(juror2);
        jury.vote(cid, vote2);

        Jury.Case memory c = jury.caseOf(cid);
        if (c.state == Jury.State.Active) {
          vm.prank(juror3);
          jury.vote(cid, vote3);
        }
      }
    }

    // Invariant check on contract balance
    uint256 totalPending = jury.pending(partyA) +
      jury.pending(partyB) +
      jury.pending(juror1) +
      jury.pending(juror2) +
      jury.pending(juror3);

    Jury.Case memory finalCase = jury.caseOf(cid);
    uint256 activeEscrow = (finalCase.state == Jury.State.Active)
      ? 2 * (STAKE + FEE)
      : (finalCase.state == Jury.State.Offered)
      ? (STAKE + FEE)
      : 0;

    assertEq(address(jury).balance, totalPending + activeEscrow);
  }

  function test_SpecificMutantKillers() public {
    // 1. Parameter boundary checks
    assertEq(jury.MAX_TERMS_BYTES(), 400);
    assertEq(jury.MIN_STAKE(), 0.01 ether);
    assertEq(jury.MAX_STAKE(), 100_000 ether);
    assertEq(jury.MAX_FEE(), 1000 ether);
    assertEq(jury.ACCEPT_WINDOW(), 3 days);
    assertEq(jury.MIN_DECIDE(), 1 days);
    assertEq(jury.MAX_DECIDE(), 90 days);
    assertEq(jury.MAX_PAGE(), 50);

    // Exact 100_000 ether max stake
    vm.deal(partyA, 300_000 ether);
    vm.prank(partyA);
    jury.open{value: 100_000 ether + FEE}(partyB, _defaultJurors(), TERMS, 100_000 ether, FEE, DECIDE_SECS);

    // Exact 1000 ether max fee
    vm.prank(partyA);
    jury.open{value: STAKE + 1000 ether}(partyB, _defaultJurors(), TERMS, STAKE, 1000 ether, DECIDE_SECS);

    // Fee > 1000 ether reverts
    vm.prank(partyA);
    vm.expectRevert(Jury.BadParams.selector);
    jury.open{value: STAKE + 1001 ether}(partyB, _defaultJurors(), TERMS, STAKE, 1001 ether, DECIDE_SECS);

    // Above max stake reverts
    vm.prank(partyA);
    vm.expectRevert(Jury.BadParams.selector);
    jury.open{value: 100_001 ether + FEE}(partyB, _defaultJurors(), TERMS, 100_001 ether, FEE, DECIDE_SECS);

    // 2. Pagination on latest and byParty
    (uint256[] memory ids, Jury.Case[] memory list) = jury.latest(0, 10);
    assertGt(ids.length, 0);
    assertEq(list.length, ids.length);

    // Offset equal to total returns empty
    (uint256[] memory emptyIds, ) = jury.latest(jury.caseCount(), 10);
    assertEq(emptyIds.length, 0);

    // byParty with offset > 0
    (uint256[] memory pIds, Jury.Case[] memory pList) = jury.byParty(partyA, 1, 1);
    assertEq(pIds.length, 1);
    assertEq(pList.length, 1);
    assertEq(pIds[0], 1);
  }

  // --- Feedback Round 1 Pinning Tests ---

  function test_CaseWithZeroFeeRunsToVerdict() public {
    // Open case with fee = 0
    vm.prank(partyA);
    uint256 cid = jury.open{value: STAKE}(partyB, _defaultJurors(), TERMS, STAKE, 0, DECIDE_SECS);

    vm.prank(partyB);
    jury.accept{value: STAKE}(cid);

    uint256 jur1Before = jury.pending(juror1);
    uint256 jur2Before = jury.pending(juror2);
    uint256 winnerBefore = jury.pending(partyA);

    // Juror 1 and Juror 2 vote A
    vm.prank(juror1);
    jury.vote(cid, true);
    vm.prank(juror2);
    jury.vote(cid, true); // 2 votes reached -> Decided

    Jury.Case memory c = jury.caseOf(cid);
    assertEq(uint8(c.state), uint8(Jury.State.Decided));

    // Winner gets exactly 2 * STAKE pot, 0 extra fee
    assertEq(jury.pending(partyA), winnerBefore + 2 * STAKE);
    // Jurors get 0 extra
    assertEq(jury.pending(juror1), jur1Before);
    assertEq(jury.pending(juror2), jur2Before);
  }

  function test_PagingWithFilterExactIdsInOrder() public {
    address partyC = makeAddr("partyC");
    vm.deal(partyC, 100 ether);

    // Create 5 cases:
    // Case 1: partyA vs partyB
    // Case 2: partyA vs partyC
    // Case 3: partyB vs partyC
    // Case 4: partyA vs partyB
    // Case 5: partyA vs partyC
    vm.prank(partyA);
    jury.open{value: STAKE + FEE}(partyB, _defaultJurors(), TERMS, STAKE, FEE, DECIDE_SECS); // id 1
    vm.prank(partyA);
    jury.open{value: STAKE + FEE}(partyC, _defaultJurors(), TERMS, STAKE, FEE, DECIDE_SECS); // id 2
    vm.prank(partyB);
    jury.open{value: STAKE + FEE}(partyC, _defaultJurors(), TERMS, STAKE, FEE, DECIDE_SECS); // id 3
    vm.prank(partyA);
    jury.open{value: STAKE + FEE}(partyB, _defaultJurors(), TERMS, STAKE, FEE, DECIDE_SECS); // id 4
    vm.prank(partyA);
    jury.open{value: STAKE + FEE}(partyC, _defaultJurors(), TERMS, STAKE, FEE, DECIDE_SECS); // id 5

    // partyA matches: [5, 4, 2, 1] (newest first, total 4 matches)
    // Page with offset = 1, count = 2 -> expected [4, 2]
    (uint256[] memory idsPartyA1, ) = jury.byParty(partyA, 1, 2);
    assertEq(idsPartyA1.length, 2);
    assertEq(idsPartyA1[0], 4);
    assertEq(idsPartyA1[1], 2);

    // Page with offset = 2, count = 3 -> expected [2, 1] (clamped to 2)
    (uint256[] memory idsPartyA2, ) = jury.byParty(partyA, 2, 3);
    assertEq(idsPartyA2.length, 2);
    assertEq(idsPartyA2[0], 2);
    assertEq(idsPartyA2[1], 1);

    // partyC matches: [5, 3, 2] (total 3 matches)
    // Page with offset = 1, count = 2 -> expected [3, 2]
    (uint256[] memory idsPartyC1, ) = jury.byParty(partyC, 1, 2);
    assertEq(idsPartyC1.length, 2);
    assertEq(idsPartyC1[0], 3);
    assertEq(idsPartyC1[1], 2);
  }

  function test_OffsetEqualsTotalReturnsEmpty() public {
    // Ensure there is at least one case
    vm.prank(partyA);
    jury.open{value: STAKE + FEE}(partyB, _defaultJurors(), TERMS, STAKE, FEE, DECIDE_SECS);

    // When offset == total, latest MUST return empty array (0 length)
    uint256 total = jury.caseCount();
    (uint256[] memory emptyLatest, Jury.Case[] memory emptyList) = jury.latest(total, 5);
    assertEq(emptyLatest.length, 0);
    assertEq(emptyList.length, 0);

    // If offset > total was used (mutant >= to >), offset == total would attempt to read total - (offset + 0) = 0!
    // Since total = 1, case 0 does not exist and would return zeroed data with length > 0 instead of 0 length.
  }
}
