import { useRef, useState, type DragEvent } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";

export function ProfilePhotoUpload({ file, previewUrl, onChange, onSkip }: { file?: File | null; previewUrl?: string; onChange: (file: File | null) => void; onSkip?: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  function setImage(next: File | null) {
    if (next && !next.type.startsWith("image/")) return;
    onChange(next);
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    setImage(event.dataTransfer.files[0] || null);
  }

  return (
    <div className="profile-upload-step">
      <div
        className={`profile-upload-dropzone ${dragging ? "dragging" : ""} ${previewUrl ? "has-preview" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Selected profile preview" />
        ) : (
          <div className="profile-upload-placeholder">
            <Camera size={28} />
            <strong>Upload a profile picture (optional)</strong>
            <span>Add a profile picture so landlords and tenants can recognise you more easily.</span>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(event) => setImage(event.target.files?.[0] || null)} />
      </div>
      <div className="hero-actions">
        <button className="btn primary" type="button" onClick={() => inputRef.current?.click()}><ImagePlus size={18} /> {file ? "Replace photo" : "Upload photo"}</button>
        {file && <button className="btn secondary" type="button" onClick={() => setImage(null)}><Trash2 size={18} /> Remove</button>}
        <button className="btn tertiary" type="button" onClick={onSkip}>Skip for now</button>
      </div>
    </div>
  );
}
