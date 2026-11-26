/**
 * The secret a match's contact and mark handles are keyed by (#1959).
 *
 * A handle is an opaque identifier for one thing one slot has heard, and the
 * order handles were minted in is exactly what it must hide: a scattered ping
 * mints its phantoms before the pass mints its true returns
 * (docs/systems-echo.md §3), so a client that can read mint order back sorts
 * the lies off the front. The handle is therefore a keyed permutation of a
 * per-slot counter, and the key is the whole of the secret.
 *
 * It used to be the 32-bit match seed. That fits a known-plaintext search: a
 * client's first handles are minted at small indices, so the one seed under
 * which eight held handles all invert below 64 is the true seed, and all 2^32
 * took about 80 s of one core (docs/threat-model.md TM-001). The key is now
 * its own 128 bits, and the round function is AES under it rather than an
 * integer mix, so a search has to guess the key rather than a seed.
 *
 * Server-only, and deliberately not in `@echoes/shared`: `node:crypto` does not
 * exist in the client, and nothing in the client mints or inverts a handle.
 */
import { createCipheriv, createHash, randomBytes, type Cipher } from 'node:crypto';

/** 128 bits, the floor TM-001 sets. */
export const HANDLE_KEY_BYTES = 16;
const HANDLE_KEY_PATTERN = /^[0-9a-f]{32}$/;

/**
 * The handle space. Two 15-bit halves, so a handle is at most 2^30 + 1: the
 * range the old permutation published, kept so nothing that stores a handle
 * learns a new width.
 */
const HALF_BITS = 15;
const HALF_MASK = 0x7fff;
const INDEX_MASK = 0x3fffffff;
/**
 * Ten rounds, as NIST SP 800-38G's FF1 runs over a small domain. A balanced
 * Feistel on 15-bit halves is distinguishable from a random permutation after
 * about 2^(15/2) queries at four rounds, and a long match issues one slot
 * thousands of handles. Ten AES blocks per minted handle is microseconds, paid
 * once per contact, not per pass.
 */
const ROUNDS = 10;
/** Separates the two handle spaces, so a slot's nth mark and nth contact differ. */
const CONTACT_TAG = 1;
const MARK_TAG = 2;

/** A fresh key for a match nobody chose a seed for. */
export function randomHandleKey(): string {
  return randomBytes(HANDLE_KEY_BYTES).toString('hex');
}

/**
 * The key a match with a fixed seed is played under.
 *
 * A seed somebody named — the balance harness, a test, a bug report — is not
 * a secret, and that match is expected to come back identical, handles and the
 * contact order they sort into included. So its key follows from the seed. A
 * live room never names a seed (`MatchRoom`), so a live match never gets one
 * of these.
 */
export function handleKeyForSeed(seed: number): string {
  return createHash('sha256')
    .update(`echoes-handle-key:${seed >>> 0}`)
    .digest('hex')
    .slice(0, HANDLE_KEY_BYTES * 2);
}

export function isHandleKey(value: unknown): value is string {
  return typeof value === 'string' && HANDLE_KEY_PATTERN.test(value);
}

/**
 * The keyed permutation both handle spaces are drawn from.
 *
 * A *permutation* rather than a hash, so distinct indices give distinct
 * handles with no collision check anywhere: one counter issues handles for
 * real contacts and phantoms alike and still promises a client every handle is
 * distinct. Deterministic in the key, so a replay that records the key mints
 * the identical handles.
 */
export class HandleCipher {
  private readonly cipher: Cipher;
  private readonly block = Buffer.alloc(16);

  constructor(key: string) {
    if (!isHandleKey(key)) {
      throw new Error(`a handle key is ${HANDLE_KEY_BYTES * 2} lower-case hex digits`);
    }
    // ECB over single blocks, each a distinct input: the mode's weakness is
    // equal blocks encrypting equal, and no two blocks here are equal.
    this.cipher = createCipheriv('aes-128-ecb', Buffer.from(key, 'hex'), null);
    this.cipher.setAutoPadding(false);
  }

  /** The handle a slot's `index`-th minted contact is published under. */
  contact(slot: number, index: number): number {
    return this.permute(CONTACT_TAG, slot, index);
  }

  /** The handle a slot's `index`-th heard Echo mark is published under (#1292). */
  mark(slot: number, index: number): number {
    return this.permute(MARK_TAG, slot, index);
  }

  private permute(tag: number, slot: number, index: number): number {
    const n = index & INDEX_MASK;
    let left = (n >>> HALF_BITS) & HALF_MASK;
    let right = n & HALF_MASK;
    for (let round = 0; round < ROUNDS; round++) {
      const next = left ^ this.round(tag, slot, round, right);
      left = right;
      right = next;
    }
    // +1 so a handle is never 0, which every caller that stores one in a map
    // keyed by truthiness would read as "no handle".
    return ((left << HALF_BITS) | right) + 1;
  }

  private round(tag: number, slot: number, round: number, right: number): number {
    const block = this.block;
    block.fill(0);
    block[0] = tag;
    block[1] = round;
    block.writeInt32BE(slot | 0, 2);
    block.writeUInt32BE(right >>> 0, 6);
    return this.cipher.update(block).readUInt32BE(0) & HALF_MASK;
  }
}
