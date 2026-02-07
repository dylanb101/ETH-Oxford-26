const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FlightInsurance", function () {
  let flightInsurance;
  let owner;
  let user;
  let signer;
  let flareDataConnector;

  // Mock Flare Data Connector
  const MockFlareDataConnector = {
    requestData: async () => {
      // Return mock AviationStack response
      return ethers.toUtf8Bytes(JSON.stringify({
        data: [{
          flight: { iata: "AA123" },
          departure: { delay: 45, iata: "JFK" },
          arrival: { delay: 45, iata: "LAX" },
          flight_status: "delayed"
        }]
      }));
    },
    getLatestData: async () => {
      return [ethers.toUtf8Bytes(JSON.stringify({ delay: 45 })), Date.now()];
    }
  };

  beforeEach(async function () {
    [owner, user, signer] = await ethers.getSigners();

    // Deploy mock FDC (in production, use actual FDC address)
    const MockFDC = await ethers.getContractFactory("MockFlareDataConnector");
    try {
      flareDataConnector = await MockFDC.deploy();
      await flareDataConnector.waitForDeployment();
    } catch (e) {
      // If mock doesn't exist, use zero address (tests will need adjustment)
      flareDataConnector = { getAddress: () => ethers.ZeroAddress };
    }

    const FlightInsurance = await ethers.getContractFactory("FlightInsurance");
    flightInsurance = await FlightInsurance.deploy(
      signer.address,
      await flareDataConnector.getAddress()
    );
    await flightInsurance.waitForDeployment();
  });

  it("Should deploy with correct signer address", async function () {
    expect(await flightInsurance.signerAddress()).to.equal(signer.address);
  });

  it("Should allow owner to update signer address", async function () {
    const newSigner = (await ethers.getSigners())[3];
    await flightInsurance.connect(owner).setSignerAddress(newSigner.address);
    expect(await flightInsurance.signerAddress()).to.equal(newSigner.address);
  });

  it("Should reject purchase with invalid signature", async function () {
    const flightNumber = "AA123";
    const flightDate = "2024-12-25";
    const premium = ethers.parseEther("10"); // 10 FLR
    const payout = ethers.parseEther("15"); // 15 FLR
    const threshold = 30; // 30 minutes
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours
    const flightId = ethers.id("AA123-2024-12-25");

    // Invalid signature
    const invalidSignature = "0x" + "00".repeat(65);

    await expect(
      flightInsurance.connect(user).purchasePolicy(
        user.address,
        flightNumber,
        flightDate,
        premium,
        payout,
        threshold,
        deadline,
        flightId,
        invalidSignature,
        { value: premium }
      )
    ).to.be.revertedWithCustomError(flightInsurance, "InvalidSignature");
  });

  // Note: Full EIP-712 signature testing would require proper signature generation
  // This is a simplified test structure

  it("Should allow owner to withdraw", async function () {
    // Send some ETH to contract
    await owner.sendTransaction({
      to: await flightInsurance.getAddress(),
      value: ethers.parseEther("1")
    });

    const balanceBefore = await ethers.provider.getBalance(owner.address);
    await flightInsurance.connect(owner).withdraw();
    const balanceAfter = await ethers.provider.getBalance(owner.address);

    expect(balanceAfter).to.be.gt(balanceBefore);
  });

  it("Should return empty array for new user policies", async function () {
    const policies = await flightInsurance.getUserPolicies(user.address);
    expect(policies).to.have.lengthOf(0);
  });
});

