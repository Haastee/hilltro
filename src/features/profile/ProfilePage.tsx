import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, UploadCloud } from "lucide-react";
import type { User } from "../../types/domain";
import { HilltroAvatar } from "../../components/HilltroAvatar";
import { storageService } from "../../services/storageService";
import { supabase, hasSupabaseConfig } from "../../utils/supabase";

const PROFILE_KEY = "hilltro.profile.local";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
type ProfileState = User & { about?: string };

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export function ProfilePage({ user, onUserChange }: { user: User; onUserChange: (user: User | null) => void }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileState>(() => loadProfile(user));
  const [photoPreview, setPhotoPreview] = useState(profile.profileImageUrl || "");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoStatus, setPhotoStatus] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [challenge, setChallenge] = useState("");

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    onUserChange(profile);
  }, [onUserChange, profile]);

  async function persistProfileImageUrl(url: string | null) {
    // Persist to Supabase for a real signed-in user; demo/local sessions keep
    // the value in localStorage only (handled by the profile effect above).
    if (!hasSupabaseConfig) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const { error } = await supabase.from("profiles").update({ profile_image_url: url }).eq("id", profile.id);
    if (error) throw new Error(error.message);
  }

  async function uploadPhoto(fileList: FileList | null) {
    setPhotoError("");
    setPhotoStatus("");
    const file = [...(fileList || [])].find((item) => item.type.startsWith("image/"));
    if (!file) {
      setPhotoError("Choose an image file (JPG or PNG).");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("That image is larger than 5MB. Please choose a smaller file.");
      return;
    }
    setPhotoBusy(true);
    try {
      const signedIn = hasSupabaseConfig && Boolean((await supabase.auth.getSession()).data.session);
      // Real session → store in Supabase Storage + profiles row. Demo/local
      // session has no Supabase auth, so keep a local copy that still persists.
      const url = signedIn ? (await storageService.uploadProfileImage(profile.id, file)).url : await readAsDataUrl(file);
      await persistProfileImageUrl(url);
      setPhotoPreview(url);
      setProfile({ ...profile, profileImageUrl: url });
      setPhotoStatus("Profile photo updated.");
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function deletePhoto() {
    setPhotoError("");
    setPhotoStatus("");
    setPhotoBusy(true);
    try {
      await persistProfileImageUrl(null);
      setPhotoPreview("");
      setProfile({ ...profile, profileImageUrl: "" });
      setPhotoStatus("Profile photo removed.");
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Could not remove the photo. Please try again.");
    } finally {
      setPhotoBusy(false);
    }
  }

  function deleteAccount() {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("hilltro.")) localStorage.removeItem(key);
    }
    onUserChange(null);
    navigate("/");
  }

  return (
    <main className="page">
      <section className="hero compact-hero">
        <p className="badge orange">My Profile</p>
        <h1>Make it yours.</h1>
        <p>Edit your name, add a profile picture and share a little about yourself — your hobbies or what makes you, you. Publicly, only your first name is ever shown.</p>
      </section>
      <section className="profile-settings-layout single-column-profile">
        <article className="card form-grid">
          <div className="profile-photo-row">
            <HilltroAvatar name={profile.firstName} imageUrl={photoPreview} size="xl" />
            <div className="profile-photo-controls">
              <div className="hero-actions">
                <label className={`btn primary ${photoBusy ? "is-disabled" : ""}`}><UploadCloud size={17} /> {photoBusy ? "Uploading…" : photoPreview ? "Replace photo" : "Upload photo"}<input hidden type="file" accept="image/*" disabled={photoBusy} onChange={(event) => { uploadPhoto(event.target.files); event.target.value = ""; }} /></label>
                {photoPreview && <button className="btn" type="button" disabled={photoBusy} onClick={deletePhoto}><Trash2 size={16} /> Delete photo</button>}
              </div>
              {photoError && <p className="notice error photo-feedback">{photoError}</p>}
              {!photoError && photoStatus && <p className="notice success photo-feedback">{photoStatus}</p>}
            </div>
          </div>
          <p className="form-note">* Required field</p>
          <div className="form-grid two">
            <label>First name *<input value={profile.firstName} onChange={(event) => setProfile({ ...profile, firstName: event.target.value })} /></label>
            <label>Middle name (optional)<input value={profile.middleName || ""} onChange={(event) => setProfile({ ...profile, middleName: event.target.value })} /></label>
            <label>Last name *<input value={profile.lastName} onChange={(event) => setProfile({ ...profile, lastName: event.target.value })} /></label>
            <label>Phone number (optional)<input value={profile.phone || ""} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label>
          </div>
          <label>Tell us about yourself (optional)<textarea maxLength={280} value={profile.about || ""} onChange={(event) => setProfile({ ...profile, about: event.target.value })} placeholder="Born and raised Londoner, mum of 2 and a cat lover." /></label>
          <p className="form-note">{(profile.about || "").length}/280 characters</p>
        </article>
        <aside className="danger-zone subtle-danger-zone">
          <Trash2 />
          <h2>Danger Zone</h2>
          <p className="muted">Deleting your account removes your profile, messages, offers, viewings, saved searches, properties and uploaded media from this local workspace.</p>
          <button className="destructive-text-button" type="button" onClick={() => setDeleteOpen(true)}>Delete My Account</button>
        </aside>
      </section>
      {deleteOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="card modal-card form-grid">
            <h2>Delete account permanently?</h2>
            <p className="muted">This action cannot be undone. Your local Hilltro account data and workspace records will be removed.</p>
            <label className="checkbox-row"><input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} /><span>I understand this action cannot be undone.</span></label>
            <label>Verification challenge: 7 + 3 = ?<input value={challenge} onChange={(event) => setChallenge(event.target.value)} /></label>
            <div className="hero-actions"><button className="btn primary" disabled={!understood || challenge.trim() !== "10"} onClick={deleteAccount}>Delete Account</button><button className="btn" onClick={() => setDeleteOpen(false)}>Cancel</button></div>
          </div>
        </div>
      )}
    </main>
  );
}

function loadProfile(user: User): ProfileState {
  try {
    const stored = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null") as User | null;
    if (stored?.id === user.id) return stored;
  } catch {
    // Keep current authenticated user if local profile data is malformed.
  }
  return user;
}
