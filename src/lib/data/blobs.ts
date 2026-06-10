import { ensureLocalDataReady, localDb } from "./store";

/**
 * Browser-local evidence file storage.
 *
 * Files are stored as Blob records in IndexedDB. Generated object URLs are
 * temporary browser handles and callers should revoke them after use.
 */

export async function storeEvidenceBlob(path: string, file: File): Promise<void> {
  await ensureLocalDataReady();
  await localDb.evidence_blobs.put({
    path,
    blob: file,
    contentType: file.type || "application/octet-stream",
    fileName: file.name,
    created_at: new Date().toISOString(),
  });
}

export async function getEvidenceBlobObjectUrl(path: string): Promise<string | null> {
  await ensureLocalDataReady();
  const stored = await localDb.evidence_blobs.get(path);
  if (!stored) return null;
  const blob =
    stored.blob instanceof Blob
      ? stored.blob
      : new Blob([stored.blob], { type: stored.contentType || "application/octet-stream" });
  return URL.createObjectURL(blob);
}

export async function removeEvidenceBlobs(paths: string[]) {
  await ensureLocalDataReady();
  await localDb.evidence_blobs.bulkDelete(paths);
}
