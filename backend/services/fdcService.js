export async function fetchFdcProof(attestationId) {
    try {
      // Replace with real API call
      return { proofData: `mock-proof-for-${attestationId}` };
    } catch (err) {
      console.error(`[fdcService] Failed for ${attestationId}:`, err);
      throw err;
    }
  }
  