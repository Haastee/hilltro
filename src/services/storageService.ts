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

// Storage uploads are authenticated writes guarded by RLS (auth.uid() must be
// set). supabase-js resolves the bearer token per request via auth.getSession(),
// but on a fresh page load the session is restored asynchronously — if an upload
// fires before that completes, getSession() returns null, the request falls back
// to the anon key, and the storage INSERT is rejected ("new row violates
// row-level security policy for table objects"). Awaiting an authenticated
// session here guarantees the token is hydrated before the upload, and surfaces
// a clear error if the user genuinely is not signed in.
async function requireSession() {
  const { supabase } = await import("../utils/supabase");
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  if (!data.session) {
    throw new Error("You need to be signed in to upload files. Please log in and try again.");
  }
  return supabase;
}

// Object keys must avoid spaces and other characters that break the storage
// path/URL (e.g. "Screenshot 2026-06-05 125803.png").
function safeKey(fileName: string) {
  const cleaned = fileName.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${crypto.randomUUID()}-${cleaned || "file"}`;
}

export class SupabaseStorageService implements StorageService {
  async uploadImage(file: File, onProgress?: (progress: number) => void): Promise<StoredUpload> {
    const supabase = await requireSession();
    onProgress?.(18);
    const path = safeKey(file.name);
    const { error } = await supabase.storage.from("property-photos").upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (error) throw new Error(error.message);
    onProgress?.(82);
    const { data } = supabase.storage.from("property-photos").getPublicUrl(path);
    onProgress?.(100);
    return { name: file.name, url: data.publicUrl, size: file.size, type: file.type };
  }

  async uploadProfileImage(userId: string, file: File, onProgress?: (progress: number) => void): Promise<StoredUpload> {
    const supabase = await requireSession();
    onProgress?.(18);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    // The public URL is stored directly on profiles.profile_image_url by the
    // caller — there is no separate profile_images table.
    const { error } = await supabase.storage.from("profile-images").upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (error) throw new Error(error.message);
    onProgress?.(82);
    const { data } = supabase.storage.from("profile-images").getPublicUrl(path);
    onProgress?.(100);
    return { name: path, url: data.publicUrl, size: file.size, type: file.type };
  }

  async uploadVideo(file: File, onProgress?: (progress: number) => void): Promise<StoredUpload> {
    const supabase = await requireSession();
    onProgress?.(18);
    const extension = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const path = `${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("property-videos").upload(path, file, { upsert: true, contentType: file.type || "video/mp4" });
    if (error) throw new Error(error.message);
    onProgress?.(82);
    const { data } = supabase.storage.from("property-videos").getPublicUrl(path);
    onProgress?.(100);
    return { name: path, url: data.publicUrl, size: file.size, type: file.type };
  }

  async deleteProfileImage(path: string) {
    const supabase = await requireSession();
    await supabase.storage.from("profile-images").remove([path]);
  }
}

export const storageService = import.meta.env.VITE_SUPABASE_URL ? new SupabaseStorageService() : new LocalStorageService();
