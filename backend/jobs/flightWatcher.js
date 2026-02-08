cron.schedule("* * * * *", async () => {
    console.log(`[FlightWatcher] Tick: ${new Date().toISOString()}`);
    try {
      const policies = await db.policies.find({ policyStatus: "ACTIVE", attestationId: null });
      for (const policy of policies) {
        try {
          const flight = await fetchFlight(policy.flightRef);
          if (!flight) throw new Error("Flight not found");
  
          if (flight.isFinal) {
            const attestationId = await requestAttestation(flight.apiUrl);
            await db.policies.update(policy.policyId, {
              attestationId,
              attestationStatus: "PENDING",
            });
            console.log(`[FlightWatcher] Requested attestation for policy ${policy.policyId}`);
          }
        } catch (err) {
          console.error(`[FlightWatcher] Error processing policy ${policy.policyId}:`, err);
        }
      }
    } catch (err) {
      console.error("[FlightWatcher] Cron error:", err);
    }
  });