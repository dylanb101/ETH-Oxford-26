import hre from "hardhat";
import { Wallet, JsonRpcProvider } from "ethers";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function main() {
  const RPC_URL = process.env.RPC_URL;
  if (!RPC_URL) throw new Error("RPC_URL missing");

  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY missing");

  const C2FLR_ADDRESS = process.env.C2FLR_ADDRESS;
  if (!C2FLR_ADDRESS || !C2FLR_ADDRESS.startsWith("0x"))
    throw new Error("C2FLR_ADDRESS missing or invalid");

  const provider = new JsonRpcProvider(RPC_URL);
  const deployer = new Wallet(PRIVATE_KEY.trim(), provider);
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer address:", deployerAddress);

  await hre.run("compile");

  const PayoutEngineArtifact = await hre.artifacts.readArtifact("PayoutEngine");
  const PayoutEngineFactory = new hre.ethers.ContractFactory(
    PayoutEngineArtifact.abi,
    PayoutEngineArtifact.bytecode,
    deployer
  );

  const payoutEngine = await PayoutEngineFactory.deploy(C2FLR_ADDRESS);
  await payoutEngine.waitForDeployment();
  console.log("PayoutEngine deployed at:", payoutEngine.target);

  const InsuranceArtifact = await hre.artifacts.readArtifact("FlightInsuranceFDC");
  const InsuranceFactory = new hre.ethers.ContractFactory(
    InsuranceArtifact.abi,
    InsuranceArtifact.bytecode,
    deployer
  );

  const insurance = await InsuranceFactory.deploy(payoutEngine.target);
  await insurance.waitForDeployment();
  console.log("FlightInsuranceFDC deployed at:", insurance.target);

  console.log("✅ Stage 0 deployment complete!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
