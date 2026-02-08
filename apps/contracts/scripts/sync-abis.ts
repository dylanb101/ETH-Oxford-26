import fs from "fs";
import path from "path";

const contracts = [
  "FlightDelayFactory",
  "FlightDelayPolicy",
  "FlightStatusOracle"
];

const artifactsDir = path.join(__dirname, "../artifacts/contracts");
const outDir = path.join(
  __dirname,
  "../../../frontend/src/abis"
);

fs.mkdirSync(outDir, { recursive: true });

for (const name of contracts) {
  const artifactPath = `${artifactsDir}/${name}.sol/${name}.json`;
  
  if (!fs.existsSync(artifactPath)) {
    console.warn(`⚠️  Artifact not found for ${name}, skipping...`);
    continue;
  }

  const artifact = require(artifactPath);

  fs.writeFileSync(
    `${outDir}/${name}.json`,
    JSON.stringify({ abi: artifact.abi }, null, 2)
  );
  
  console.log(`✅ Synced ${name}.json`);
}

console.log(`\n✨ ABI sync complete! ABIs saved to ${outDir}`);

