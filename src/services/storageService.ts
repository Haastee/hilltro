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

export class SupabaseStorageService implements StorageService {
  async uploadImage(file: File, onProgress?: (progress: number) => void): Promise<StoredUpload> {
    const { supabase } = await import("../utils/supabase");
    onProgress?.(18);
    const path = `${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("property-photos").upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    onProgress?.(82);
    const { data } = supabase.storage.from("property-photos").getPublicUrl(path);
    onProgress?.(100);
    return { name: file.name, url: data.publicUrl, size: file.size, type: file.type };
  }

  async uploadProfileImage(userId: string, file: File, onProgress?: (progress: number) => void): Promise<StoredUpload> {
    const { supabase } = await import("../utils/supabase");
    onProgress?.(18);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("profile-images").upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    onProgress?.(82);
    const { data } = supabase.storage.from("profile-images").getPublicUrl(path);
    await supabase.from("profile_images").insert({ user_id: userId, image_url: data.publicUrl, storage_path: path });
    onProgress?.(100);
    return { name: path, url: data.publicUrl, size: file.size, type: file.type };
  }

  async uploadVideo(file: File, onProgress?: (progress: number) => void): Promise<StoredUpload> {
    const { supabase } = await import("../utils/supabase");
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
    const { supabase } = await import("../utils/supabase");
    await supabase.storage.from("profile-images").remove([path]);
    await supabase.from("profile_images").delete().eq("storage_path", path);
  }
}

export const storageService = import.meta.env.VITE_SUPABASE_URL ? new SupabaseStorageService() : new LocalStorageService();
