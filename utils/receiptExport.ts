import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const RECEIPTS_CACHE_DIR = 'shared-receipts';

/**
 * Downloads a (signed) receipt image URL into a local cache file and hands it to the native share
 * sheet — Sharing.shareAsync only accepts a local file:// URI, never a remote http(s) one, so the
 * bytes have to land on disk first. The destination is an explicit `.jpg` File (not a bare
 * Directory) so the share sheet gets a real filename/extension regardless of whether the signed
 * URL's response sends a usable Content-Disposition header.
 */
export async function shareReceiptImage(remoteUrl: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device.');
  }

  const destinationDir = new Directory(Paths.cache, RECEIPTS_CACHE_DIR);
  destinationDir.create({ intermediates: true, idempotent: true });

  const destinationFile = new File(destinationDir, `receipt-${Date.now()}.jpg`);
  const file = await File.downloadFileAsync(remoteUrl, destinationFile, { idempotent: true });

  await Sharing.shareAsync(file.uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg', dialogTitle: 'Share receipt' });
}
