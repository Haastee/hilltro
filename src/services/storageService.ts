export type StoredUpload = {
  name: string;
  url: string;
  size: number;
  type: string;
};

export interface StorageService {
  uploadImage(file: File, onProgress?: (progress: number) => void): Promise<StoredUpload>;
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
}

export const storageService = import.meta.env.VITE_SUPABASE_URL ? new SupabaseStorageService() : new LocalStorageService();
