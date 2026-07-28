/**
 * Storage and verification for the app's own 4-digit passcode — the fallback
 * that gates `Lock` when Face ID is off, unavailable, or fails. Only a salted
 * hash is ever persisted (in the platform keystore via `expo-secure-store`,
 * same as `secureKey.ts`), never the raw digits.
 *
 * `expo-secure-store`'s web build is a literal empty stub (every method is
 * `undefined`) — calling it directly throws. Same web-only fallback as
 * `secureKey.ts`: `localStorage`, clearly insecure, dev/validation target only.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PASSCODE_KEY = 'orbit.passcode.v1';
/** Not a secret by itself — just keeps the stored hash from being a bare, lookup-table-friendly SHA-256(pin). */
const PEPPER = 'orbit.passcode.pepper.v1';

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${PEPPER}:${pin}`);
}

async function readStored(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return window.localStorage.getItem(PASSCODE_KEY);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(PASSCODE_KEY);
}

async function writeStored(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.setItem(PASSCODE_KEY, value);
    } catch {
      // localStorage unavailable (e.g. private mode) — passcode won't persist across reloads.
    }
    return;
  }
  await SecureStore.setItemAsync(PASSCODE_KEY, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED });
}

export async function hasPasscode(): Promise<boolean> {
  return (await readStored()) != null;
}

export async function setPasscode(pin: string): Promise<void> {
  await writeStored(await hashPin(pin));
}

export async function verifyPasscode(pin: string): Promise<boolean> {
  const stored = await readStored();
  if (!stored) return false;
  return (await hashPin(pin)) === stored;
}

export async function clearPasscode(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.removeItem(PASSCODE_KEY);
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.deleteItemAsync(PASSCODE_KEY);
}
