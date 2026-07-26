/**
 * The single symmetric key that guards everything in `src/data/crypto.ts`.
 *
 * On iOS/Android this lives in the platform keystore via `expo-secure-store`,
 * which is backed by Keychain/Keystore — it never touches JS-visible storage
 * and survives app updates.
 *
 * `expo-secure-store`'s web implementation is a no-op stub (see
 * node_modules/expo-secure-store/**​/*.web.js — every method is undefined).
 * Web is a dev/validation target only (docs/01-analysis.md §8, option D), so
 * here it falls back to `localStorage`, which is NOT secure — visible to any
 * script on the page and to browser devtools. Never treat the web build as
 * carrying the same privacy guarantee as the native app.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY_NAME = 'orbit.dek.v1';

function randomHex(byteLength: number): string {
  const bytes = Crypto.getRandomBytes(byteLength);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function readWeb(): Promise<string | null> {
  try {
    return window.localStorage.getItem(KEY_NAME);
  } catch {
    return null;
  }
}

async function writeWeb(value: string): Promise<void> {
  try {
    window.localStorage.setItem(KEY_NAME, value);
  } catch {
    // localStorage unavailable (e.g. private mode) — key regenerates next call.
  }
}

let cached: string | null = null;

/** Returns the device's 256-bit data-encryption key as a 64-char hex string, creating it on first run. */
export async function getDataKey(): Promise<string> {
  if (cached) return cached;

  const existing =
    Platform.OS === 'web' ? await readWeb() : await SecureStore.getItemAsync(KEY_NAME);
  if (existing) {
    cached = existing;
    return existing;
  }

  const fresh = randomHex(32);
  if (Platform.OS === 'web') {
    await writeWeb(fresh);
  } else {
    await SecureStore.setItemAsync(KEY_NAME, fresh, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  }
  cached = fresh;
  return fresh;
}
