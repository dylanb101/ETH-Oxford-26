export async function getAttestationStatus(attestationId) {
    try {
      // Replace with real API call
      return "FINALIZED"; // For testing
    } catch (err) {
      console.error(`[attestationService] Failed for ${attestationId}:`, err);
      throw err;
    }
  }
  