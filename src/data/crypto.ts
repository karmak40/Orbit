/**
 * Field-level encryption for the sensitive strings stored by the repositories
 * — person names/notes and date notes/answers (see `docs/01-analysis.md` §6.3,
 * "notes are the most sensitive data in the app").
 *
 * This is AES-256-CTR (via the pure-JS `aes-js`, so it needs no native crypto
 * module and works identically in Expo Go and on web) plus a keyed SHA-256
 * digest over ciphertext for tamper/corruption detection. It is a pragmatic
 * field-level scheme, not a vetted AEAD construction — there's no formal proof
 * against a determined adversary with local code execution, and the "MAC" is a
 * hash-then-key construction rather than real HMAC. What it does buy: a
 * plaintext person's name or a note never sits as a raw string in the SQLite
 * file or in a backup/export of it, and any bit-corruption is caught on read
 * rather than silently decrypted into garbage.
 *
 * The documented upgrade path (docs/01-analysis.md §8) is full-disk SQLCipher
 * via op-sqlite, which needs a dev client rather than Expo Go — worth doing
 * before a real release, tracked as a follow-up rather than blocking v1.
 */
import * as aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';

import { getDataKey } from '../platform/secureKey';

const VERSION = 'v1';

function hexToBytes(hex: string): Uint8Array {
  return aesjs.utils.hex.toBytes(hex);
}

async function sha256Hex(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

/** Domain-separated subkeys from the one device key, so encrypt and authenticate never share key material. */
async function subkeys(masterKeyHex: string): Promise<{ encKeyHex: string; macKeyHex: string }> {
  const [encKeyHex, macKeyHex] = await Promise.all([
    sha256Hex(`orbit:enc:${masterKeyHex}`),
    sha256Hex(`orbit:mac:${masterKeyHex}`),
  ]);
  return { encKeyHex, macKeyHex };
}

function randomHex(byteLength: number): string {
  const bytes = Crypto.getRandomBytes(byteLength);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Encrypts a UTF-8 string. Returns a self-describing `v1:<ivHex>:<cipherHex>:<tagHex>` payload. */
export async function encryptField(plaintext: string): Promise<string> {
  const masterKeyHex = await getDataKey();
  const { encKeyHex, macKeyHex } = await subkeys(masterKeyHex);

  const ivHex = randomHex(16);
  const cipher = new aesjs.ModeOfOperation.ctr(hexToBytes(encKeyHex), new aesjs.Counter(hexToBytes(ivHex)));
  const cipherBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(plaintext));
  const cipherHex = aesjs.utils.hex.fromBytes(cipherBytes);

  const tagHex = await sha256Hex(`${macKeyHex}:${ivHex}:${cipherHex}`);
  return `${VERSION}:${ivHex}:${cipherHex}:${tagHex}`;
}

/** Reverses `encryptField`. Throws if the payload is malformed or fails its integrity check. */
export async function decryptField(payload: string): Promise<string> {
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('encrypted field: unrecognized payload format');
  }
  const [, ivHex, cipherHex, tagHex] = parts;

  const masterKeyHex = await getDataKey();
  const { encKeyHex, macKeyHex } = await subkeys(masterKeyHex);

  const expectedTag = await sha256Hex(`${macKeyHex}:${ivHex}:${cipherHex}`);
  if (expectedTag !== tagHex) {
    throw new Error('encrypted field: integrity check failed (corrupted or tampered)');
  }

  const decipher = new aesjs.ModeOfOperation.ctr(hexToBytes(encKeyHex), new aesjs.Counter(hexToBytes(ivHex)));
  const plainBytes = decipher.decrypt(hexToBytes(cipherHex));
  return aesjs.utils.utf8.fromBytes(plainBytes);
}

/** Encrypts, but passes `''` through untouched — most optional-note fields are empty. */
export async function encryptOptional(plaintext: string): Promise<string> {
  return plaintext === '' ? '' : encryptField(plaintext);
}

/** Reverses `encryptOptional`. */
export async function decryptOptional(payload: string): Promise<string> {
  return payload === '' ? '' : decryptField(payload);
}
