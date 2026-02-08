import hre from "hardhat";
import { Wallet, JsonRpcProvider } from "ethers";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function main() {
  try {
    const RPC_URL = process.env.RPC_URL;
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const PAYOUT_ENGINE_ADDRESS = process.env.PAYOUT_ENGINE_ADDRESS;
    const MERKLE_ROOT = process.env.MERKLE_ROOT;

    if (!RPC_URL || !PRIVATE_KEY || !PAYOUT_ENGINE_ADDRESS || !MERKLE_ROOT)
      throw new Error("Missing required environment variables");

    const provider = new JsonRpcProvider(RPC_URL);
    const deployer = new Wallet(PRIVATE_KEY.trim(), provider);
    console.log("Admin wallet:", await deployer.getAddress());

    const payoutEngine = await hre.ethers.getContractAt("PayoutEngine", PAYOUT_ENGINE_ADDRESS, deployer);

    console.log("Setting Merkle root:", MERKLE_ROOT);
    const tx = await payoutEngine.setMerkleRoot(MERKLE_ROOT);
    await tx.wait();
    console.log("✅ Merkle root updated successfully");

  } catch (err) {
    console.error("Failed to set Merkle root:", err);
    process.exit(1);
  }
}

main();
