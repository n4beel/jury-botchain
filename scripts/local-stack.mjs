import { spawn } from "node:child_process";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { JURY_ABI } from "../lib/botchain/abi.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = 8767;
const RPC_URL = `http://127.0.0.1:${PORT}`;

// Anvil dev keys
const KEY_A = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const KEY_B = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const KEY_J1 = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
const KEY_J2 = "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6";
const KEY_J3 = "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a";

async function main() {
  console.log(`Starting local Anvil node on port ${PORT}...`);
  const anvil = spawn("anvil", ["--port", String(PORT)]);

  process.on("exit", () => anvil.kill());
  process.on("SIGINT", () => {
    anvil.kill();
    process.exit();
  });

  await new Promise((r) => setTimeout(r, 2000));

  const accA = privateKeyToAccount(KEY_A);
  const accB = privateKeyToAccount(KEY_B);
  const accJ1 = privateKeyToAccount(KEY_J1);
  const accJ2 = privateKeyToAccount(KEY_J2);
  const accJ3 = privateKeyToAccount(KEY_J3);

  const publicClient = createPublicClient({ transport: http(RPC_URL) });
  const walletA = createWalletClient({ account: accA, transport: http(RPC_URL) });
  const walletB = createWalletClient({ account: accB, transport: http(RPC_URL) });
  const walletJ1 = createWalletClient({ account: accJ1, transport: http(RPC_URL) });
  const walletJ2 = createWalletClient({ account: accJ2, transport: http(RPC_URL) });

  const artifactPath = join(process.cwd(), "contracts/out/Jury.sol/Jury.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
  const bytecode = artifact.bytecode.object;

  console.log("Deploying Jury contract...");
  const deployHash = await walletA.deployContract({
    abi: JURY_ABI,
    bytecode,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  const contractAddress = receipt.contractAddress;
  console.log(`Deployed Jury to: ${contractAddress}`);

  try {
    writeFileSync(
      join(process.cwd(), "deployments/localhost.json"),
      JSON.stringify({ address: contractAddress, deployedAt: Date.now() }, null, 2)
    );
  } catch {}

  const stake = parseEther("1");
  const fee = parseEther("0.1");
  const jurors: [ `0x${string}`, `0x${string}`, `0x${string}` ] = [
    accJ1.address,
    accJ2.address,
    accJ3.address,
  ];

  console.log("Seeding scenarios per Spec §5...");

  // Case 1: Offered
  await walletA.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "open",
    args: [accB.address, jurors, "Wager on championship match winner.", stake, fee, 86400 * 7],
    value: stake + fee,
  });

  // Case 2: Active with no votes
  const o2 = await walletA.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "open",
    args: [accB.address, jurors, "Freelance website milestone delivery dispute.", stake, fee, 86400 * 7],
    value: stake + fee,
  });
  await publicClient.waitForTransactionReceipt({ hash: o2 });
  await walletB.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "accept",
    args: [2n],
    value: stake + fee,
  });

  // Case 3: Active with one vote (J1 votes for A)
  const o3 = await walletA.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "open",
    args: [accB.address, jurors, "Equipment damage security deposit repayment.", stake, fee, 86400 * 7],
    value: stake + fee,
  });
  await publicClient.waitForTransactionReceipt({ hash: o3 });
  await walletB.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "accept",
    args: [3n],
    value: stake + fee,
  });
  await walletJ1.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "vote",
    args: [3n, true],
  });

  // Case 4: Decided for A
  const o4 = await walletA.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "open",
    args: [accB.address, jurors, "Code audit completion verification.", stake, fee, 86400 * 7],
    value: stake + fee,
  });
  await publicClient.waitForTransactionReceipt({ hash: o4 });
  await walletB.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "accept",
    args: [4n],
    value: stake + fee,
  });
  await walletJ1.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "vote",
    args: [4n, true],
  });
  await walletJ2.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "vote",
    args: [4n, true],
  });

  // Case 5: Decided for B
  const o5 = await walletA.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "open",
    args: [accB.address, jurors, "Server uptime SLA violation claim.", stake, fee, 86400 * 7],
    value: stake + fee,
  });
  await publicClient.waitForTransactionReceipt({ hash: o5 });
  await walletB.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "accept",
    args: [5n],
    value: stake + fee,
  });
  await walletJ1.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "vote",
    args: [5n, false],
  });
  await walletJ2.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "vote",
    args: [5n, false],
  });

  // Case 6: Conceded
  const o6 = await walletA.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "open",
    args: [accB.address, jurors, "Friendly chess rematch wager.", stake, fee, 86400 * 7],
    value: stake + fee,
  });
  await publicClient.waitForTransactionReceipt({ hash: o6 });
  await walletB.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "accept",
    args: [6n],
    value: stake + fee,
  });
  await walletB.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "concede",
    args: [6n],
  });

  // Case 7: Expired
  const o7 = await walletA.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "open",
    args: [accB.address, jurors, "Expired deliberation bet.", stake, fee, 86400],
    value: stake + fee,
  });
  await publicClient.waitForTransactionReceipt({ hash: o7 });
  await walletB.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "accept",
    args: [7n],
    value: stake + fee,
  });
  await (publicClient.request as any)({
    method: "evm_increaseTime",
    params: [86400 + 10],
  });
  await (publicClient.request as any)({ method: "evm_mine", params: [] });
  await walletA.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "expire",
    args: [7n],
  });

  // Case 8: Cancelled
  const o8 = await walletA.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "open",
    args: [accB.address, jurors, "Withdrawn claim before acceptance.", stake, fee, 86400],
    value: stake + fee,
  });
  await publicClient.waitForTransactionReceipt({ hash: o8 });
  await walletA.writeContract({
    address: contractAddress,
    abi: JURY_ABI,
    functionName: "cancel",
    args: [8n],
  });

  console.log("Seeding complete! Local stack running on port", PORT);
}

main().catch(console.error);
