/** Face ID / fingerprint unlock — always a shortcut to the passcode, never a replacement for it. */
import * as LocalAuthentication from 'expo-local-authentication';

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

/**
 * `disableDeviceFallback` keeps a failed/cancelled prompt from handing off to
 * the OS's own device-passcode screen — Orbit's own keypad (already rendered
 * behind this call) is the only fallback, so there's one passcode to reason
 * about, not two.
 */
export async function authenticateWithBiometrics(promptMessage: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      disableDeviceFallback: true,
    });
    return result.success;
  } catch {
    return false;
  }
}
