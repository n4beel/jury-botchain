import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, ChildProcess } from "node:child_process";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { JURY_ABI } from "../../lib/botchain/abi";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ANVIL_PORT = 8667;
const RPC_URL = `http://127.0.0.1:${ANVIL_PORT}`;

const localChain = defineChain({
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
});

// Standard Anvil default keys
const KEY_A = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const KEY_B = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const KEY_J1 = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
const KEY_J2 = "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6";
const KEY_J3 = "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a";

describe("Jury Integration Lifecycle (Anvil)", () => {
  let anvilProcess: ChildProcess;
  let contractAddress: `0x${string}`;

  const accountA = privateKeyToAccount(KEY_A);
  const accountB = privateKeyToAccount(KEY_B);
  const accountJ1 = privateKeyToAccount(KEY_J1);
  const accountJ2 = privateKeyToAccount(KEY_J2);
  const accountJ3 = privateKeyToAccount(KEY_J3);

  const publicClient = createPublicClient({
    chain: localChain,
    transport: http(RPC_URL),
  });

  const walletA = createWalletClient({
    account: accountA,
    chain: localChain,
    transport: http(RPC_URL),
  });

  const walletB = createWalletClient({
    account: accountB,
    chain: localChain,
    transport: http(RPC_URL),
  });

  const walletJ1 = createWalletClient({
    account: accountJ1,
    chain: localChain,
    transport: http(RPC_URL),
  });

  const walletJ2 = createWalletClient({
    account: accountJ2,
    chain: localChain,
    transport: http(RPC_URL),
  });

  const walletJ3 = createWalletClient({
    account: accountJ3,
    chain: localChain,
    transport: http(RPC_URL),
  });

  beforeAll(async () => {
    anvilProcess = spawn("anvil", ["--port", String(ANVIL_PORT), "--silent"]);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const bytecodePath = join(
      __dirname,
      "../../contracts/out/Jury.sol/Jury.json"
    );
    const artifact = JSON.parse(readFileSync(bytecodePath, "utf8"));
    const bytecode = artifact.bytecode.object as `0x${string}`;

    const deployTxHash = await walletA.deployContract({
      abi: JURY_ABI,
      bytecode,
    });
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: deployTxHash,
    });
    contractAddress = receipt.contractAddress!;
    expect(contractAddress).toBeDefined();
  });

  afterAll(() => {
    if (anvilProcess) {
      anvilProcess.kill();
    }
  });

  it("executes the full long path: open -> accept -> 2 votes -> decide -> withdraw", async () => {
    const stake = parseEther("1");
    const fee = parseEther("0.1");
    const jurors: [ `0x${string}`, `0x${string}`, `0x${string}` ] = [
      accountJ1.address,
      accountJ2.address,
      accountJ3.address,
    ];
    const terms = "Party A bets Party B that Team Alpha wins the finals.";

    // 1. Party A opens case
    const openTx = await walletA.writeContract({
      address: contractAddress,
      abi: JURY_ABI,
      functionName: "open",
      args: [accountB.address, jurors, terms, stake, fee, 86400],
      value: stake + fee,
    });
    await publicClient.waitForTransactionReceipt({ hash: openTx });

    const caseId = 1n;
    let c = await publicClient.readContract({
      address: contractAddress,
      abi: JURY_ABI,
      functionName: "caseOf",
      args: [caseId],
    });
    expect(c.state).toBe(0); // Offered

    // 2. Party B accepts
    const acceptTx = await walletB.writeContract({
      address: contractAddress,
      abi: JURY_ABI,
      functionName: "accept",
      args: [caseId],
      value: stake + fee,
    });
    await publicClient.waitForTransactionReceipt({ hash: acceptTx });

    c = await publicClient.readContract({
      address: contractAddress,
      abi: JURY_ABI,
      functionName: "caseOf",
      args: [caseId],
    });
    expect(c.state).toBe(1); // Active

    // 3. Juror 1 votes for A
    const v1Tx = await walletJ1.writeContract({
      address: contractAddress,
      abi: JURY_ABI,
      functionName: "vote",
      args: [caseId, true],
    });
    await publicClient.waitForTransactionReceipt({ hash: v1Tx });

    // 4. Juror 2 votes for A -> 2 votes reached, decided!
    const v2Tx = await walletJ2.writeContract({
      address: contractAddress,
      abi: JURY_ABI,
      functionName: "vote",
      args: [caseId, true],
    });
    await publicClient.waitForTransactionReceipt({ hash: v2Tx });

    c = await publicClient.readContract({
      address: contractAddress,
      abi: JURY_ABI,
      functionName: "caseOf",
      args: [caseId],
    });
    expect(c.state).toBe(2); // Decided

    // 5. Party A is winner: gets 2 * stake = 2 BOT
    const pendingA = await publicClient.readContract({
      address: contractAddress,
      abi: JURY_ABI,
      functionName: "pending",
      args: [accountA.address],
    });
    expect(pendingA).toBe(parseEther("2"));

    // Juror 1 & Juror 2 get fee share (0.1 BOT each)
    const pendingJ1 = await publicClient.readContract({
      address: contractAddress,
      abi: JURY_ABI,
      functionName: "pending",
      args: [accountJ1.address],
    });
    expect(pendingJ1).toBe(parseEther("0.1"));

    // Juror 3 didn't vote -> 0
    const pendingJ3 = await publicClient.readContract({
      address: contractAddress,
      abi: JURY_ABI,
      functionName: "pending",
      args: [accountJ3.address],
    });
    expect(pendingJ3).toBe(0n);

    // 6. Party A withdraws
    const wTx = await walletA.writeContract({
      address: contractAddress,
      abi: JURY_ABI,
      functionName: "withdraw",
    });
    await publicClient.waitForTransactionReceipt({ hash: wTx });

    const pendingAAfter = await publicClient.readContract({
      address: contractAddress,
      abi: JURY_ABI,
      functionName: "pending",
      args: [accountA.address],
    });
    expect(pendingAAfter).toBe(0n);
  });
});
