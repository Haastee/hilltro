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

// Upload straight to the Storage REST endpoint with the signed-in user's access
// token set EXPLICITLY as the bearer.
//
// Why not supabase-js .upload()? Storage RLS requires auth.uid() to be set. The
// project uses the new `sb_publishable_…` API key, and supabase-js was sending
// that key (or a null→key fallback during concurrent getSession() calls) as the
// storage bearer instead of the user's JWT — so storage saw the request as
// anonymous, auth.uid() was null, and every INSERT was rejected ("new row
// violates row-level security policy for table objects"). PostgREST validated
// the same user JWT fine (drafts saved), which proves the token is valid
// server-side; sending it explicitly here makes storage resolve auth.uid() too.
async function uploadToBucket(bucket: string, path: string, file: File, contentType: string | undefined, onProgress?: (progress: number) => void): Promise<string> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const { supabase } = await import("../utils/supabase");
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) throw new Error("You need to be signed in to upload files. Please log in and try again.");
  onProgress?.(15);
  const res = await fetch(`${baseUrl}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey,
      authorization: `Bearer ${token}`,
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
      throw new Error("Upload was blocked — please sign out and back in, then try again.");
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
