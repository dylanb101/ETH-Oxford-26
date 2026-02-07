const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts...");

  const SimpleStorage = await hre.ethers.getContractFactory("SimpleStorage");
  const simpleStorage = await SimpleStorage.deploy();

  const PayoutEngine = await hre.ethers.getContractFactory("PayoutEngine");
  const payoutEngine = await PayoutEngine.deploy();

  await simpleStorage.waitForDeployment();
  await payoutEngine.waitForDeployment();

  const address = await simpleStorage.getAddress();
  const payoutEngineAddress = await payoutEngine.getAddress();
  console.log("SimpleStorage deployed to:", address);
  console.log("PayoutEngine deployed to:", payoutEngineAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

