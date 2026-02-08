cron.schedule("* * * * *", async () => {
    console.log(`[AttestationWatcher] Tick: ${new Date().toISOString()}`);
    try {
      const pendingPolicies = await db.policies.find({ attestationStatus: "PENDING" });
      for (const policy of pendingPolicies) {
        try {
          const status = await getAttestationStatus(policy.attestationId);
  
          if (status === "FINALIZED") {
            await db.policies.update(policy.policyId, { attestationStatus: "FINALIZED" });
            console.log(`[AttestationWatcher] Policy ${policy.policyId} finalized`);
          } else {
            console.log(`[AttestationWatcher] Policy ${policy.policyId} status: ${status}`);
          }
        } catch (err) {
          console.error(`[AttestationWatcher] Error for policy ${policy.policyId}:`, err);
        }
      }
    } catch (err) {
      console.error("[AttestationWatcher] Cron error:", err);
    }
  });