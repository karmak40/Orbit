import { Platform } from 'react-native';

/**
 * Writes `payload` to a JSON file and hands it to the OS share sheet — the
 * only way data ever leaves the device, and only when the user asks for it.
 * Web has no share sheet, so it triggers a normal browser download instead.
 */
export async function exportDataToFile(payload: unknown, filename: string): Promise<void> {
  const json = JSON.stringify(payload, null, 2);

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');

  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(json);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: filename });
  }
}
