import axios from "axios";

export async function fetchFlight(flightRef) {
  try {
    // Replace with real API call
    return { isFinal: true, apiUrl: `https://fakeattestation.service/api/${flightRef}` };
  } catch (err) {
    console.error(`[flightService] fetchFlight failed for ${flightRef}:`, err);
    throw err;
  }
}

export async function requestAttestation(attestationUrl) {
  try {
    // Replace with real API call
    // const res = await axios.post(attestationUrl);
    // return res.data.attestationId;
    return `mock-attestation-${Date.now()}`;
  } catch (err) {
    console.error("[flightService] requestAttestation failed:", err);
    throw err;
  }
}
