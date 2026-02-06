const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleStorage", function () {
  let simpleStorage;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const SimpleStorage = await ethers.getContractFactory("SimpleStorage");
    simpleStorage = await SimpleStorage.deploy();
    await simpleStorage.waitForDeployment();
  });

  it("Should set and get a value", async function () {
    const testValue = 42;
    
    await expect(simpleStorage.set(testValue))
      .to.emit(simpleStorage, "ValueChanged")
      .withArgs(testValue);

    expect(await simpleStorage.get()).to.equal(testValue);
    expect(await simpleStorage.storedValue()).to.equal(testValue);
  });

  it("Should return 0 initially", async function () {
    expect(await simpleStorage.get()).to.equal(0);
  });
});

