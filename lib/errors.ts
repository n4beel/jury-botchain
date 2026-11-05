// lib/errors.ts - User-facing error decoders for Jury (Spec §4)

export function formatJuryError(err: unknown): string {
  if (!err) return "An unknown error occurred.";
  const message = (err as Error).message || String(err);

  if (message.includes("User rejected") || message.includes("User denied")) {
    return "Transaction was cancelled in wallet.";
  }

  if (message.includes("ConnectorChainMismatchError")) {
    return "Your wallet is connected to the wrong network. Please switch to the correct network.";
  }

  if (message.includes("BadJurors")) {
    return "Pick three different people who are not you or the other side.";
  }

  if (message.includes("TooLate")) {
    return "The offer has expired.";
  }

  if (message.includes("NotVoting")) {
    return "Voting is closed for this case.";
  }

  if (message.includes("NotJuror")) {
    return "You are not a designated juror for this case.";
  }

  if (message.includes("NotParty")) {
    return "Only the designated counterparties can perform this action.";
  }

  if (message.includes("AlreadyVoted")) {
    return "You have already cast your juror vote on this case.";
  }

  if (message.includes("NotOffered")) {
    return "This case is no longer offered.";
  }

  if (message.includes("NotActive")) {
    return "This case is not currently active.";
  }

  if (message.includes("NotExpired")) {
    return "The deadline has not yet elapsed.";
  }

  if (message.includes("BadParty")) {
    return "Invalid counterparty address specified.";
  }

  if (message.includes("BadTerms")) {
    return "Terms must be between 1 and 400 bytes.";
  }

  if (message.includes("BadParams")) {
    return "Invalid parameters provided. Check stake (min 0.01 BOT), fee, or decision period.";
  }

  if (message.includes("WrongPayment")) {
    return "Payment does not match the exact stake + juror fee required.";
  }

  if (message.includes("NothingToWithdraw")) {
    return "No pending balance available to withdraw.";
  }

  return message.slice(0, 160);
}
