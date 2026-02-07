# How to Find Flare Data Connector (FDC) Address

## Quick Answer

**For Coston2 Testnet (Chain ID: 114):**
- Check the official Flare Developer Portal: https://dev.flare.network
- Look for "Flare Data Connector" or "FDC" documentation
- Network-specific addresses are usually listed in the FDC setup guides

**For Flare Mainnet (Chain ID: 14):**
- Same process - check Flare documentation for mainnet FDC address

---

## Method 1: Official Flare Documentation

### Step 1: Visit Flare Developer Portal
Go to: **https://dev.flare.network**

### Step 2: Navigate to FDC Documentation
Look for:
- "Flare Data Connector" section
- "FDC" guides or tutorials
- "External Data" or "Oracle" documentation

### Step 3: Find Network-Specific Addresses
The documentation should list addresses like:
```
Coston2 Testnet FDC: 0x...
Flare Mainnet FDC: 0x...
```

---

## Method 2: Check Flare GitHub Repositories

1. Visit: **https://github.com/flare-foundation**
2. Look for FDC-related repositories
3. Check `deployments/` or `addresses/` directories
4. Look for network configuration files

---

## Method 3: Query the Network Directly

You can query the network using web3 to find FDC contracts:

```javascript
// Using ethers.js
const provider = new ethers.JsonRpcProvider("https://coston2-api.flare.network/ext/C/rpc");

// FDC contracts are often registered in a registry
// Check Flare's contract registry or state connector contracts
```

---

## Method 4: Use Flare Explorer

1. Go to Flare Block Explorer for your network:
   - Coston2: https://coston2-explorer.flare.network
   - Flare Mainnet: https://flare-explorer.flare.network

2. Search for "FlareDataConnector" or "FDC"
3. Look for verified contracts

---

## Method 5: Check Hardhat/Foundry Starter Kits

Flare provides starter kits that may include FDC addresses:

1. Visit: https://dev.flare.network/network/guides/hardhat-foundry-starter-kit
2. Check example projects for FDC addresses
3. Look at deployment scripts

---

## Method 6: For Testing - Use a Mock/Placeholder

**If you can't find the FDC address immediately**, you can:

### Option A: Deploy a Mock FDC Contract
Create a simple mock contract that implements the FDC interface for testing:

```solidity
// contracts/mocks/MockFlareDataConnector.sol
contract MockFlareDataConnector is IFlareDataConnector {
    function requestData(...) external returns (bytes memory) {
        // Mock implementation
    }
}
```

### Option B: Use Zero Address (Temporary)
For initial testing, you can use `0x0000000000000000000000000000000000000000` and update later.

**⚠️ Warning**: Don't use zero address in production!

---

## Network-Specific Addresses (Reference)

### Coston2 Testnet (Chain ID: 114)
```
// Check Flare documentation for actual address
FLARE_DATA_CONNECTOR_ADDRESS=0x...  // To be filled from docs
```

### Flare Mainnet (Chain ID: 14)
```
// Check Flare documentation for actual address
FLARE_DATA_CONNECTOR_ADDRESS=0x...  // To be filled from docs
```

---

## How to Verify an FDC Address

Once you have a potential address:

1. **Check on Block Explorer**:
   - Visit the network's block explorer
   - Paste the address
   - Verify it's a contract (not EOA)
   - Check if it has the expected functions

2. **Query the Contract**:
   ```javascript
   const fdc = await ethers.getContractAt("IFlareDataConnector", address);
   // Try calling a view function to verify it's the right contract
   ```

3. **Check Contract Code**:
   - Verify the contract implements `requestData()` function
   - Check it matches the FDC interface

---

## Current Implementation in Your Project

In your `deploy-flight-insurance.js`, the FDC address is loaded from environment:

```javascript
const flareDataConnectorAddress = process.env.FLARE_DATA_CONNECTOR_ADDRESS || 
    "0x0000000000000000000000000000000000000000"; // Placeholder
```

**To use it:**
1. Find the FDC address using methods above
2. Add to your `.env` file:
   ```env
   FLARE_DATA_CONNECTOR_ADDRESS=0x...actual_address_here
   ```
3. Redeploy your contract

---

## Alternative: Direct API Integration (Without FDC)

If FDC is not available or you want to test without it, you can:

1. **Backend Verification**: Have your backend verify flight data
2. **Oracle Pattern**: Use a trusted oracle service
3. **Manual Verification**: Allow manual verification with admin approval

This would require modifying your contract to accept verified data from your backend instead of using FDC directly.

---

## Recommended Approach for Your Project

1. **For Development/Testing**:
   - Use a mock FDC contract or placeholder
   - Test the contract logic without FDC integration
   - Verify flight data through your backend API

2. **For Production**:
   - Find the official FDC address from Flare documentation
   - Verify it on the block explorer
   - Update your deployment script with the correct address

---

## Useful Links

- **Flare Developer Portal**: https://dev.flare.network
- **Flare Documentation**: https://docs.flare.network
- **Flare GitHub**: https://github.com/flare-foundation
- **Coston2 Explorer**: https://coston2-explorer.flare.network
- **Flare Mainnet Explorer**: https://flare-explorer.flare.network

---

## Quick Checklist

- [ ] Check Flare Developer Portal for FDC documentation
- [ ] Look for network-specific addresses in docs
- [ ] Verify address on block explorer
- [ ] Test contract with FDC address
- [ ] Update `.env` file with correct address
- [ ] Redeploy contract if needed

---

## Still Can't Find It?

If you can't find the FDC address:

1. **Ask on Flare Discord/Forums**: Community can help
2. **Contact Flare Support**: They can provide official addresses
3. **Use Mock for Now**: Develop with a mock, update later
4. **Check Recent Deployments**: Look for recent FDC deployments on explorer

---

**Note**: FDC addresses may change or be updated. Always verify you're using the latest address for your target network.

