import express from "express";
import cors from "cors";
import cron from "node-cron";
import dotenv from "dotenv";
import db from "./db.js";
import { fetchFlight, requestAttestation } from "./services/flightService.js";
import { getAttestationStatus } from "./services/attestationService.js";
import { buildMerkleTree } from "./services/merkle.js";
import { fetchFdcProof } from "./services/fdcService.js";
import { Contract, Wallet, JsonRpcProvider } from "ethers";

// Import ABIs from Hardhat artifacts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Replace with the path found by `find` above
const payoutEngineAbiPath = path.join(__dirname, "../apps/contracts/artifacts/contracts/PayoutEngine.sol/PayoutEngine.json");
const insuranceAbiPath = path.join(__dirname, "../apps/contracts/artifacts/contracts/FlightInsurance.sol/FlightInsuranceFDC.json");

const payoutEngineAbi = JSON.parse(fs.readFileSync(payoutEngineAbiPath, "utf8"));
const insuranceAbi = JSON.parse(fs.readFileSync(insuranceAbiPath, "utf8"));



dotenv.config({ path: ".env" });

const app = express();

// CORS configuration
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());

// Home page initial return data
app.post('/api/flight/info', async (req, res) => {
  try {
    const { flightNumber, flightDate } = req.body;
    res.json({
      flightNumer:flightNumber,
      flightDate:flightDate
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- Step 3: Register policy ----------
app.post("/api/policies", async (req, res) => {
  try {
    const { policyId, userAddress, flightRef, payoutAmount } = req.body;
    if (!policyId || !userAddress || !flightRef || !payoutAmount)
      return res.status(400).json({ error: "Missing fields" });

    db.insert({ policyId, userAddress, flightRef, payoutAmount });
    console.log(`[API] Policy ${policyId} registered`);
    res.status(201).json({ success: true, policyId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- Step 4: FlightWatcher ----------
cron.schedule("* * * * *", async () => {
  try {
    const policies = db.find({ policyStatus: "ACTIVE", attestationId: null });
    for (const p of policies) {
      const flight = await fetchFlight(p.flightRef);
      if (flight.isFinal) {
        const attestationId = await requestAttestation(flight.apiUrl);
        db.update(p.policyId, { attestationId, attestationStatus: "PENDING" });
        console.log(`[FlightWatcher] Requested attestation for policy ${p.policyId}`);
      }
    }
  } catch (err) {
    console.error("[FlightWatcher]", err);
  }
});

// ---------- Step 5: AttestationWatcher ----------
cron.schedule("* * * * *", async () => {
  try {
    const pending = db.find({ attestationStatus: "PENDING" });
    for (const p of pending) {
      const status = await getAttestationStatus(p.attestationId);
      if (status === "FINALIZED") {
        db.update(p.policyId, { attestationStatus: "FINALIZED" });
        console.log(`[AttestationWatcher] Policy ${p.policyId} finalized`);
      }
    }
  } catch (err) {
    console.error("[AttestationWatcher]", err);
  }
});

// ---------- Step 7: Generate Merkle ----------
app.post("/api/merkle/update", async (req, res) => {
  try {
    const eligible = db.find({ attestationStatus: "FINALIZED" });
    if (!eligible.length) return res.json({ message: "No policies to update" });

    const { root, proofs } = buildMerkleTree(eligible);
    console.log(`[MerkleUpdater] Root: ${root}`);

    const provider = new JsonRpcProvider(process.env.RPC_URL);
    const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

    // Create payoutEngine contract instance using ABI + address
    const payoutEngine = new Contract(
      process.env.PAYOUT_ENGINE_ADDRESS,
      payoutEngineAbi.abi,
      wallet
    );

    await payoutEngine.setMerkleRoot(root);
    console.log("[MerkleUpdater] Root set on-chain");

    for (const p of eligible) db.update(p.policyId, { merkleProof: proofs[p.policyId] });

    res.json({ success: true, root });
  } catch (err) {
    console.error("[MerkleUpdater]", err);
    res.status(500).json({ error: "Merkle update failed" });
  }
});

// ---------- Step 8-9: Verify policy ----------
app.post("/api/verify-policy", async (req, res) => {
  try {
    const { policyId } = req.body;
    if (!policyId) return res.status(400).json({ error: "policyId required" });

    const policy = db.get(policyId);
    if (!policy) return res.status(404).json({ error: "Policy not found" });
    if (!policy.merkleProof) return res.status(400).json({ error: "Merkle proof missing" });

    const proof = await fetchFdcProof(policy.attestationId);

    const provider = new JsonRpcProvider(process.env.RPC_URL);
    const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

    // Create insurance contract instance using ABI + address
    const insurance = new Contract(
      process.env.INSURANCE_ADDRESS,
      insuranceAbi.abi,
      wallet
    );

    const tx = await insurance.resolvePolicy(policyId, proof, policy.merkleProof);
    await tx.wait();

    console.log(`[VerifyPolicy] Policy ${policyId} resolved on-chain`);
    res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    console.error("[VerifyPolicy]", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

// ---------- Start server ----------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
