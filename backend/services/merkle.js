import { keccak256, toUtf8Bytes } from "ethers";
import { MerkleTree } from "merkletreejs";

export function buildMerkleTree(policies) {
  try {
    const leaves = policies.map(
      (p) => keccak256(toUtf8Bytes(p.userAddress.toLowerCase() + p.policyId + p.payoutAmount))
    );

    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const root = tree.getHexRoot();

    const proofs = {};
    policies.forEach((p, idx) => {
      proofs[p.policyId] = tree.getHexProof(leaves[idx]);
    });

    return { root, proofs };
  } catch (err) {
    console.error("[merkle] Failed to build tree:", err);
    throw err;
  }
}
