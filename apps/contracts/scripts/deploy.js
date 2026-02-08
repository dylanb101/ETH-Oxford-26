import hre from "hardhat";
import { Wallet, JsonRpcProvider } from "ethers";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("Deploying FlightDelayFactory...");

  // 1️⃣ Connect to Flare testnet
  const provider = new JsonRpcProvider("https://coston2-api.flare.network/ext/C/rpc");

  // 2️⃣ Create deployer wallet
  const deployer = new Wallet(process.env.PRIVATE_KEY.trim(), provider);
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer address:", deployerAddress);

  // 3️⃣ Compile contracts
  await hre.run("compile");

  // 4️⃣ Read artifact
  const FactoryArtifact = await hre.artifacts.readArtifact("FlightDelayFactory");

  // 5️⃣ Create ContractFactory with signer
  const Factory = new hre.ethers.ContractFactory(
    FactoryArtifact.abi,
    FactoryArtifact.bytecode,
    deployer
  );

  // 6️⃣ Deploy with constructor argument (_oracle)
  const factory = await Factory.deploy(deployerAddress); // <-- pass oracle here
  await factory.waitForDeployment(); // ethers v6

  console.log("FlightDelayFactory deployed at:", factory.target);
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

