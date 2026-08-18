import { decode } from 'base64-arraybuffer';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { supabase } from '@/utils/supabase';

const RECEIPTS_BUCKET = 'receipts';
// Long enough to comfortably view and share the image, short enough that a leaked link is useless
// by the time anyone could do anything with it.
const SIGNED_URL_TTL_SECONDS = 60 * 10;

// Same web/native split ocrService uses to read a captured photo: on web the camera/picker hand
// back a `blob:` URL that expo-file-system's `File` can't open, so it goes through fetch + FileReader
// instead of the native file read.
async function readImageAsBase64(imageUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const blob = await fetch(imageUri).then((response) => response.blob());
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read image blob.'));
      reader.onloadend = () => {
        // readAsDataURL yields "data:image/jpeg;base64,AAAA..." — Supabase wants just the payload.
        const dataUrl = reader.result as string;
        resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
      };
      reader.readAsDataURL(blob);
    });
  }
  return new File(imageUri).base64();
}

/**
 * Reads a captured receipt off disk and uploads it to the "receipts" Supabase Storage bucket,
 * returning its storage object path (not a public URL — the bucket is private, gated by an
 * `auth.uid() = owner_id` RLS policy, so `getPublicUrl()` would hand back a URL that 403s when
 * opened). Callers that need to actually display the image should exchange this path for a
 * short-lived link via `supabase.storage.from('receipts').createSignedUrl(path, ttlSeconds)` —
 * storing a signed URL itself would just go stale once it expires.
 *
 * Throws on any failure (missing bucket, network error, no authenticated user) — the scan-confirm
 * flow relies on this to reject before it ever calls insertTransaction, so a transaction row is
 * never created for a receipt image that didn't actually make it to storage.
 */
export async function uploadReceiptImage(imageUri: string): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated Supabase user — cannot upload a receipt.');
  }

  const base64Data = await readImageAsBase64(imageUri);
  // Namespaced under the uploader's user id: keeps receipts organized per user, and Storage still
  // stamps `owner_id` from the request's JWT independently, which is what the RLS policy checks.
  // Timestamp + random suffix avoids collisions between two receipts captured in the same
  // millisecond (e.g. rapid manual retries after a failed save).
  const filePath = `${user.id}/${Date.now()}-${Math.floor(Math.random() * 1_000_000)}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(filePath, decode(base64Data), { contentType: 'image/jpeg' });

  if (uploadError) {
    throw uploadError;
  }

  return filePath;
}

/**
 * Exchanges a stored receipt's object path for a short-lived signed URL that can actually be
 * fetched/displayed — the bare object path 403s on its own since the bucket is private. Throws on
 * failure (object deleted, no active session, network error); callers are responsible for handling
 * that as a "couldn't load this receipt" state rather than crashing the viewer.
 */
export async function getReceiptImageUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(RECEIPTS_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    throw error ?? new Error('Failed to create a signed URL for this receipt.');
  }
  return data.signedUrl;
}
