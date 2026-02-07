import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

import FdcABI from "./abi/FdcVerifier.json" assert { type: "json" };

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// This is a REAL Flare verifier contract, not your interface
const fdcVerifier = new ethers.Contract(
  process.env.FDC_VERIFIER,
  FdcABI,
  provider
);

fdcVerifier.on("AttestationVerified", (requestId, result) => {
  console.log("FDC verified:", requestId, result);

  // 1. Decode flight delay
  // 2. Match to policies
  // 3. Mark policy eligible
});
