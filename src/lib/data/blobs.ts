/**
 * Browser-local evidence file storage (base64 in localStorage).
 * Keeps uploaded artefacts viewable without cloud object storage.
 */

const STORAGE_KEY = "core7.evidence.blobs.v1";

type StoredBlob = {
  data: string;
  contentType: string;
  fileName: string;
};

function load(): Record<string, StoredBlob> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredBlob>) : {};
  } catch {
    return {};
  }
}

function save(blobs: Record<string, StoredBlob>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blobs));
  } catch {
    /* quota exceeded — caller surfaces upload error */
  }
}

export async function storeEvidenceBlob(path: string, file: File): Promise<void> {
  const data = await readAsDataUrl(file);
  const base64 = data.split(",")[1] ?? "";
  const blobs = load();
  blobs[path] = { data: base64, contentType: file.type || "application/octet-stream", fileName: file.name };
  save(blobs);
}

export function getEvidenceBlobUrl(path: string): string | null {
  const blob = load()[path];
  if (!blob) return null;
  return `data:${blob.contentType};base64,${blob.data}`;
}

export function removeEvidenceBlobs(paths: string[]) {
  const blobs = load();
  for (const path of paths) delete blobs[path];
  save(blobs);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
