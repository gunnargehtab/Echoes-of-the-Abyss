/**
 * FNV-1a mixing, shared by the state hash and the ground's own running digest.
 *
 * Small enough to inline anywhere, and kept in one file for the reason a hash
 * wants: two places mixing the same values must mix them the same way, or a
 * digest kept incrementally disagrees with one computed whole.
 */

/** The FNV-1a 32-bit offset basis — the value a fresh digest starts from. */
export const FNV_OFFSET = 0x811c9dc5;

const FNV_PRIME = 0x01000193;

/** Scratch view for reading a double's raw bits without allocating per call. */
const scratch = new Float64Array(1);
const scratchBits = new Uint32Array(scratch.buffer);

export function mixU32(hash: number, value: number): number {
  return Math.imul(hash ^ (value >>> 0), FNV_PRIME) >>> 0;
}

/**
 * Mix a double by its exact bits rather than rounded first. Two runs of the
 * same build must agree bit-for-bit — rounding would mask a real divergence
 * of less than the rounding step, which is exactly the kind that compounds
 * over a twenty-minute match.
 */
export function mixFloat(hash: number, value: number): number {
  scratch[0] = value;
  return mixU32(mixU32(hash, scratchBits[0]!), scratchBits[1]!);
}
