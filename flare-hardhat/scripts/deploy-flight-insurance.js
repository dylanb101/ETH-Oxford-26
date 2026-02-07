const hre = require("hardhat");

async function main() {
  console.log("Deploying FlightInsurance contract...");

  // Get signer (backend admin address)
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Get signer address from environment (backend admin)
  // In production, this should be the address that signs quotes
  const signerAddress = process.env.SIGNER_ADDRESS || deployer.address;
  console.log("Signer address (backend admin):", signerAddress);

  // Flare Data Connector address
  // On Flare networks, FDC is deployed at a specific address
  // For Coston2 testnet, use a placeholder or the actual FDC address
  const flareDataConnectorAddress = process.env.FLARE_DATA_CONNECTOR_ADDRESS || 
    "0x0000000000000000000000000000000000000000"; // Placeholder - replace with actual FDC address
  
  console.log("Flare Data Connector address:", flareDataConnectorAddress);

  // Deploy FlightInsurance contract
  const FlightInsurance = await hre.ethers.getContractFactory("FlightInsurance");
  const flightInsurance = await FlightInsurance.deploy(
    signerAddress,
    flareDataConnectorAddress
  );

  await flightInsurance.waitForDeployment();

  const address = await flightInsurance.getAddress();
  console.log("FlightInsurance deployed to:", address);
  console.log("Signer address:", signerAddress);
  console.log("Flare Data Connector:", flareDataConnectorAddress);

  // Verify contract on Flare explorer (if on testnet/mainnet)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await flightInsurance.deploymentTransaction()?.wait(5);

    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [signerAddress, flareDataConnectorAddress],
      });
      console.log("Contract verified on Flare explorer!");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }

  console.log("\n=== Deployment Summary ===");
  console.log("Contract Address:", address);
  console.log("Network:", hre.network.name);
  console.log("Signer Address:", signerAddress);
  console.log("FDC Address:", flareDataConnectorAddress);
  console.log("\nSave these addresses for your frontend/backend integration!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

