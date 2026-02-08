import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// --------------------------
// __dirname equivalent in ES modules
// --------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------------
// Ensure backend/data folder exists
// --------------------------
const dataDir = path.join(__dirname, "./data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// --------------------------
// Use SQLite file in backend/data directory
// --------------------------
const dbFile = path.join(dataDir, "policies.db");
const db = new Database(dbFile);

// --------------------------
// Initialize table if not exists
// --------------------------
db.prepare(`
  CREATE TABLE IF NOT EXISTS policies (
    policyId INTEGER PRIMARY KEY,
    userAddress TEXT NOT NULL,
    flightRef TEXT NOT NULL,
    policyStatus TEXT DEFAULT 'ACTIVE',
    attestationId TEXT,
    attestationStatus TEXT,
    merkleProof TEXT,
    payoutAmount REAL
  )
`).run();

// --------------------------
// DB operations
// --------------------------
export default {
  // Insert a new policy
  insert: (policy) => {
    const stmt = db.prepare(`
      INSERT INTO policies
        (policyId, userAddress, flightRef, policyStatus, attestationId, attestationStatus, merkleProof, payoutAmount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      policy.policyId,
      policy.userAddress,
      policy.flightRef,
      policy.policyStatus || "ACTIVE",
      policy.attestationId || null,
      policy.attestationStatus || null,
      policy.merkleProof ? JSON.stringify(policy.merkleProof) : null,
      policy.payoutAmount || 0
    );
  },

  // Update a policy by policyId
  update: (policyId, updates) => {
    const fields = [];
    const values = [];

    for (const key in updates) {
      fields.push(`${key} = ?`);
      // Store Merkle proofs as JSON string
      if (key === "merkleProof" && updates[key]) {
        values.push(JSON.stringify(updates[key]));
      } else {
        values.push(updates[key]);
      }
    }

    const stmt = db.prepare(`UPDATE policies SET ${fields.join(", ")} WHERE policyId = ?`);
    stmt.run(...values, policyId);
  },

  // Get a single policy by policyId
  get: (policyId) => {
    const row = db.prepare(`SELECT * FROM policies WHERE policyId = ?`).get(policyId);
    if (!row) return null;

    // Parse Merkle proof JSON
    if (row.merkleProof) row.merkleProof = JSON.parse(row.merkleProof);
    return row;
  },

  // Find policies by filters (e.g., attestationStatus = 'PENDING')
  find: (filters) => {
    const keys = Object.keys(filters);
    if (!keys.length) return db.prepare(`SELECT * FROM policies`).all();

    const where = keys.map((k) => `${k} = ?`).join(" AND ");
    const values = keys.map((k) => filters[k]);

    const rows = db.prepare(`SELECT * FROM policies WHERE ${where}`).all(...values);

    // Parse Merkle proof JSON
    rows.forEach((r) => {
      if (r.merkleProof) r.merkleProof = JSON.parse(r.merkleProof);
    });

    return rows;
  },
};
