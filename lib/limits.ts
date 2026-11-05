// lib/limits.ts - Constants mirrored from contracts/src/Jury.sol
import { parseEther } from "viem";

export const MAX_TERMS_BYTES = 400;
export const MIN_STAKE = parseEther("0.01");
export const MAX_STAKE = parseEther("100000");
export const MAX_FEE = parseEther("1000");
export const ACCEPT_WINDOW = 259200; // 3 days in seconds (3 * 86400)
export const MIN_DECIDE = 86400; // 1 day in seconds
export const MAX_DECIDE = 7776000; // 90 days in seconds
export const MAX_PAGE = 50;
