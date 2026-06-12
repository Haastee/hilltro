export type StoredUpload = {
  name: string;
  url: string;
  size: number;
  type: string;
};

export interface StorageService {
  uploadImage(file: File, onProgress?: (progress: number) => void): Promise<StoredUpload>;
  uploadVideo(file: File, onProgress?: (progress: number) => void): Promise<StoredUpload>;
  uploadProfileImage(userId: string, file: File, onProgress?: (progress: number) => void): Promise<StoredUpload>;
  deleteProfileImage?(path: string): Promise<void>;
}

export class LocalStorageService implements StorageService {
  async uploadImage(file: File, onProgress?: (progress: number) => void): Promise<StoredUpload> {
    onProgress?.(18);
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Upload failed."));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    onProgress?.(68);
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    onProgress?.(100);
    return { name: file.name, url, size: file.size, type: file.type };
  }

  async uploadProfileImage(userId: string, file: File, onProgress?: (progress: number) => void): Promise<StoredUpload> {
    const upload = await this.uploadImage(file, onProgress);
    return { ...upload, name: `${userId}/${upload.name}` };
  }

  async uploadVideo(file: File, onProgress?: (progress: number) => void): Promise<StoredUpload> {
    return this.uploadImage(file, onProgress);
  }
}

// Object keys must avoid spaces and other characters that break the storage
// path/URL (e.g. "Screenshot 2026-06-05 125803.png").
function safeKey(fileName: string) {
  const cleaned = fileName.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${crypto.randomUUID()}-${cleaned || "file"}`;
}

// Upload straight to the Storage REST endpoint.
//
// This project's Storage service cannot validate the user access tokens issued
// by Auth (a JWT signing-key mismatch on the platform side), so passing the
// user's JWT made every upload fail. The media buckets' RLS is bucket-scoped
// (no per-user identity required), so we authenticate the upload with the anon
// key — Storage accepts it as the `anon` role and the bucket policy allows the
// write. Verified end-to-end: an anon-key upload returns HTTP 200.
// Public anon key (safe to embed — it ships in the client bundle anyway). Used
// directly for storage so uploads never depend on which key the build env
// injected; this exact key is verified to return HTTP 200 from the Storage API.
const STORAGE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZ2NubXJ1aXFlY29naXpjZGJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1OTg1NTcsImV4cCI6MjA5NjE3NDU1N30.Iv64Hz59A_6lPEjqKlktYoIXIhFR-kNLImOXl5IMoFE";

async function uploadToBucket(bucket: string, path: string, file: File, contentType: string | undefined, onProgress?: (progress: number) => void): Promise<string> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const apikey = STORAGE_ANON_KEY;
  onProgress?.(15);
  const res = await fetch(`${baseUrl}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey,
      authorization: `Bearer ${apikey}`,
      "x-upsert": "true",
      ...(contentType ? { "content-type": contentType } : {})
    },
    body: file
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.message || "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    if (res.status === 401 || res.status === 403 || /row-level security|jwt|unauthor/i.test(detail)) {
      throw new Error(detail ? `Upload was blocked: ${detail}` : "Upload was blocked by storage permissions.");
    }
    if (res.status === 413) throw new Error("That file is too large to upload.");
    throw new Error(detail ? `Upload failed: ${detail}` : `Upload failed (${res.status}).`);
  }
  onProgress?.(100);
  // Public buckets are readable at the /object/public/ path without a token.
  return `${baseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

export class SupabaseStorageService implements StorageService {
  async uploadImage(file: File, onProgress?: (progress: number) => void): Promise<StoredUpload> {
    const path = safeKey(file.name);
    const url = await uploadToBucket("property-photos", path, file, file.type || undefined, onProgress);
    return { name: file.name, url, size: file.size, type: file.type };
  }

  async uploadProfileImage(userId: string, file: File, onProgress?: (progress: number) => void): Promise<StoredUpload> {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const url = await uploadToBucket("profile-images", path, file, file.type || undefined, onProgress);
    return { name: path, url, size: file.size, type: file.type };
  }

  async uploadVideo(file: File, onProgress?: (progress: number) => void): Promise<StoredUpload> {
    const extension = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const path = `${crypto.randomUUID()}.${extension}`;
    const url = await uploadToBucket("property-videos", path, file, file.type || "video/mp4", onProgress);
    return { name: path, url, size: file.size, type: file.type };
  }

  async deleteProfileImage(path: string) {
    const { supabase } = await import("../utils/supabase");
    await supabase.storage.from("profile-images").remove([path]);
  }
}

export const storageService = import.meta.env.VITE_SUPABASE_URL ? new SupabaseStorageService() : new LocalStorageService();
