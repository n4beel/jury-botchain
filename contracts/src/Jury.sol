// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title Jury
 * @notice Two parties with a disagreement stake equal amounts and agree on terms and 3 named jurors.
 * Each juror votes for party A or party B. As soon as 2 jurors agree, the winner takes the pot (2 * stake),
 * and the voting jurors split the fee pool (2 * fee). If no consensus is reached before the deadline,
 * all stakes and fees are refunded.
 */
contract Jury {
  // --- Constants (Spec §2.1) ---
  uint256 public constant MAX_TERMS_BYTES = 400;
  uint128 public constant MIN_STAKE = 0.01 ether;
  uint128 public constant MAX_STAKE = 100_000 ether;
  uint128 public constant MAX_FEE = 1000 ether;
  uint64 public constant ACCEPT_WINDOW = 3 days;
  uint32 public constant MIN_DECIDE = 1 days;
  uint32 public constant MAX_DECIDE = 90 days;
  uint256 public constant MAX_PAGE = 50;

  enum State {
    Offered,
    Active,
    Decided,
    Expired,
    Conceded,
    Cancelled
  }

  struct Case {
    address a;
    address b;
    uint64 acceptBy;
    uint64 decideBy;
    uint32 decideSecs;
    State state;
    uint128 stake;
    uint128 fee;
    bytes32 termsHash;
    uint32 termsBlock;
    uint8 votesA;
    uint8 votesB;
  }

  mapping(uint256 => Case) private _cases;
  mapping(uint256 => address[3]) private _jurors;
  mapping(uint256 => mapping(address => uint8)) private _voted; // 0 none, 1 for A, 2 for B
  mapping(address => uint256) public pending;
  uint256 public caseCount;

  // --- Reentrancy Guard ---
  uint8 private _reentrancyLocked;

  modifier nonReentrant() {
    if (_reentrancyLocked != 0) revert ReentrancyGuardReentrantCall();
    _reentrancyLocked = 1;
    _;
    _reentrancyLocked = 0;
  }

  // --- Errors (Spec §2.2, §4) ---
  error BadParty();
  error BadJurors();
  error BadTerms();
  error BadParams();
  error WrongPayment(uint128 expected);
  error NoSuchCase();
  error NotParty();
  error TooLate();
  error NotOffered();
  error NotJuror();
  error NotVoting();
  error AlreadyVoted();
  error NotActive();
  error NotExpired(uint64 decideBy);
  error NothingToWithdraw();
  error TransferFailed();
  error ReentrancyGuardReentrantCall();

  // --- Events (Spec §2.2) ---
  event Opened(
    uint256 indexed id,
    address indexed a,
    address indexed b,
    address[3] jurors,
    string terms,
    bytes32 termsHash,
    uint128 stake,
    uint128 fee,
    uint64 acceptBy
  );
  event Accepted(uint256 indexed id, uint64 decideBy);
  event Cancelled(uint256 indexed id);
  event Voted(uint256 indexed id, address indexed juror, bool forA);
  event Decided(uint256 indexed id, address indexed winner, uint256 pot, uint8 jurorsPaid);
  event Conceded(uint256 indexed id, address indexed by, address indexed winner);
  event Expired(uint256 indexed id);
  event Withdrawn(address indexed to, uint256 amount);

  // --- External Functions (Spec §2.2) ---

  function _validateJurors(address b, address[3] calldata jurors) internal view {
    for (uint256 i = 0; i < 3; i++) {
      address j = jurors[i];
      if (j == address(0) || j == msg.sender || j == b) revert BadJurors();
    }
    if (jurors[0] == jurors[1] || jurors[0] == jurors[2] || jurors[1] == jurors[2]) {
      revert BadJurors();
    }
  }

  /**
   * @notice Open a new case naming counterparty B, 3 distinct jurors, terms, stake, juror fee, and decideSecs.
   */
  function open(
    address b,
    address[3] calldata jurors,
    string calldata terms,
    uint128 stake,
    uint128 fee,
    uint32 decideSecs
  ) external payable nonReentrant returns (uint256 id) {
    if (b == address(0) || b == msg.sender) revert BadParty();
    _validateJurors(b, jurors);

    if (bytes(terms).length == 0 || bytes(terms).length > MAX_TERMS_BYTES) revert BadTerms();
    if (stake < MIN_STAKE || stake > MAX_STAKE) revert BadParams();
    if (fee > MAX_FEE || decideSecs < MIN_DECIDE || decideSecs > MAX_DECIDE) revert BadParams();

    if (msg.value != stake + fee) revert WrongPayment(stake + fee);

    id = ++caseCount;
    bytes32 termsHash = keccak256(bytes(terms));

    {
      Case storage c = _cases[id];
      c.a = msg.sender;
      c.b = b;
      c.acceptBy = uint64(block.timestamp) + ACCEPT_WINDOW;
      c.decideSecs = decideSecs;
      c.state = State.Offered;
      c.stake = stake;
      c.fee = fee;
      c.termsHash = termsHash;
      c.termsBlock = uint32(block.number);
      _jurors[id] = jurors;
    }

    emit Opened(id, msg.sender, b, jurors, terms, termsHash, stake, fee, uint64(block.timestamp) + ACCEPT_WINDOW);
  }

  /**
   * @notice Counterparty B accepts the case and matches the stake + fee.
   */
  function accept(uint256 id) external payable nonReentrant {
    if (id == 0 || id > caseCount) revert NoSuchCase();
    Case storage c = _cases[id];
    if (msg.sender != c.b) revert NotParty();
    if (c.state != State.Offered) revert NotOffered();
    if (block.timestamp > c.acceptBy) revert TooLate();

    uint128 expectedPay = c.stake + c.fee;
    if (msg.value != expectedPay) revert WrongPayment(expectedPay);

    c.state = State.Active;
    uint64 decideBy = uint64(block.timestamp) + c.decideSecs;
    c.decideBy = decideBy;

    emit Accepted(id, decideBy);
  }

  /**
   * @notice Party A can cancel the case anytime before B accepts.
   */
  function cancel(uint256 id) external nonReentrant {
    if (id == 0 || id > caseCount) revert NoSuchCase();
    Case storage c = _cases[id];
    if (msg.sender != c.a) revert NotParty();
    if (c.state != State.Offered) revert NotOffered();

    c.state = State.Cancelled;
    uint256 refund = uint256(c.stake) + uint256(c.fee);

    // Push caller's own money; nonReentrant
    (bool ok, ) = msg.sender.call{value: refund}("");
    if (!ok) revert TransferFailed();

    emit Cancelled(id);
  }

  /**
   * @notice Juror votes for party A (true) or party B (false).
   * Once a side reaches 2 votes, the case is decided immediately.
   */
  function vote(uint256 id, bool forA) external nonReentrant {
    if (id == 0 || id > caseCount) revert NoSuchCase();
    Case storage c = _cases[id];
    if (c.state != State.Active) revert NotActive();
    if (block.timestamp > c.decideBy) revert NotVoting();

    address[3] storage jList = _jurors[id];
    bool isJuror = (msg.sender == jList[0] || msg.sender == jList[1] || msg.sender == jList[2]);
    if (!isJuror) revert NotJuror();

    if (_voted[id][msg.sender] != 0) revert AlreadyVoted();

    uint8 voteVal = forA ? 1 : 2;
    _voted[id][msg.sender] = voteVal;

    if (forA) {
      c.votesA += 1;
    } else {
      c.votesB += 1;
    }

    emit Voted(id, msg.sender, forA);

    // Check if 2 votes reached
    if (c.votesA == 2 || c.votesB == 2) {
      c.state = State.Decided;
      address winner = (c.votesA == 2) ? c.a : c.b;
      uint256 pot = uint256(c.stake) * 2;
      pending[winner] += pot;

      // Fee pool = 2 * fee, split equally among jurors who have voted so far (remainder to winner)
      uint256 feePool = uint256(c.fee) * 2;
      uint8 votersCount = c.votesA + c.votesB; // will be 2 or 3

      if (votersCount > 0 && feePool > 0) {
        uint256 share = feePool / votersCount;
        uint256 rem = feePool % votersCount;

        for (uint256 i = 0; i < 3; i++) {
          address jur = jList[i];
          if (_voted[id][jur] != 0) {
            pending[jur] += share;
          }
        }
        if (rem > 0) {
          pending[winner] += rem;
        }
      }

      emit Decided(id, winner, pot, votersCount);
    }
  }

  /**
   * @notice Either party concedes. The other party takes the pot (2 * stake).
   * Both fees return to their respective payers.
   */
  function concede(uint256 id) external nonReentrant {
    if (id == 0 || id > caseCount) revert NoSuchCase();
    Case storage c = _cases[id];
    if (c.state != State.Active) revert NotActive();
    if (msg.sender != c.a && msg.sender != c.b) revert NotParty();

    c.state = State.Conceded;
    address winner = (msg.sender == c.a) ? c.b : c.a;

    // Winner gets both stakes
    pending[winner] += uint256(c.stake) * 2;

    // Both fees return to payers
    pending[c.a] += c.fee;
    pending[c.b] += c.fee;

    emit Conceded(id, msg.sender, winner);
  }

  /**
   * @notice Expire an active case past decideBy without a verdict, or an offered case past acceptBy.
   * All stakes and fees return to their payers via pending balances.
   */
  function expire(uint256 id) external nonReentrant {
    if (id == 0 || id > caseCount) revert NoSuchCase();
    Case storage c = _cases[id];

    if (c.state == State.Offered) {
      if (block.timestamp <= c.acceptBy) revert NotExpired(c.acceptBy);
      c.state = State.Expired;
      pending[c.a] += uint256(c.stake) + uint256(c.fee);
      emit Expired(id);
    } else if (c.state == State.Active) {
      if (block.timestamp <= c.decideBy) revert NotExpired(c.decideBy);
      c.state = State.Expired;
      pending[c.a] += uint256(c.stake) + uint256(c.fee);
      pending[c.b] += uint256(c.stake) + uint256(c.fee);
      emit Expired(id);
    } else {
      revert NotActive();
    }
  }

  /**
   * @notice Pull payment: withdraw accrued pending balance.
   */
  function withdraw() external nonReentrant {
    uint256 amount = pending[msg.sender];
    if (amount == 0) revert NothingToWithdraw();

    pending[msg.sender] = 0;

    (bool ok, ) = msg.sender.call{value: amount}("");
    if (!ok) revert TransferFailed();

    emit Withdrawn(msg.sender, amount);
  }

  // --- Views (Spec §2.2) ---

  function caseOf(uint256 id) external view returns (Case memory) {
    if (id == 0 || id > caseCount) revert NoSuchCase();
    return _cases[id];
  }

  function jurorsOf(uint256 id) external view returns (address[3] memory) {
    if (id == 0 || id > caseCount) revert NoSuchCase();
    return _jurors[id];
  }

  function votedBy(uint256 id, address who) external view returns (uint8) {
    return _voted[id][who];
  }

  function latest(uint256 offset, uint256 count)
    external
    view
    returns (uint256[] memory ids, Case[] memory list)
  {
    uint256 total = caseCount;
    if (offset >= total) {
      return (new uint256[](0), new Case[](0));
    }
    if (count > MAX_PAGE) count = MAX_PAGE;
    if (offset + count > total) {
      count = total - offset;
    }

    ids = new uint256[](count);
    list = new Case[](count);

    for (uint256 i = 0; i < count; i++) {
      uint256 cId = total - (offset + i);
      ids[i] = cId;
      list[i] = _cases[cId];
    }
  }

  function byParty(address addr, uint256 offset, uint256 count)
    external
    view
    returns (uint256[] memory ids, Case[] memory list)
  {
    uint256 total = caseCount;
    if (count > MAX_PAGE) count = MAX_PAGE;

    // Collect matches
    uint256[] memory tempIds = new uint256[](total);
    uint256 matched = 0;

    for (uint256 i = total; i > 0; i--) {
      Case storage c = _cases[i];
      if (c.a == addr || c.b == addr) {
        tempIds[matched++] = i;
      }
    }

    if (offset >= matched) {
      return (new uint256[](0), new Case[](0));
    }

    uint256 take = count;
    if (offset + take > matched) {
      take = matched - offset;
    }

    ids = new uint256[](take);
    list = new Case[](take);

    for (uint256 i = 0; i < take; i++) {
      uint256 cId = tempIds[offset + i];
      ids[i] = cId;
      list[i] = _cases[cId];
    }
  }
}
