import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, UploadCloud } from "lucide-react";
import type { User } from "../../types/domain";
import { HilltroAvatar } from "../../components/HilltroAvatar";
import { storageService } from "../../services/storageService";

const PROFILE_KEY = "hilltro.profile.local";
type ProfileState = User & { about?: string };

export function ProfilePage({ user, onUserChange }: { user: User; onUserChange: (user: User | null) => void }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileState>(() => loadProfile(user));
  const [photoPreview, setPhotoPreview] = useState(profile.profileImageUrl || "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [challenge, setChallenge] = useState("");

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    onUserChange(profile);
  }, [onUserChange, profile]);

  async function uploadPhoto(fileList: FileList | null) {
    const file = [...(fileList || [])].find((item) => item.type.startsWith("image/"));
    if (!file || file.size > 5 * 1024 * 1024) return;
    const upload = await storageService.uploadProfileImage(profile.id, file);
    setPhotoPreview(upload.url);
    setProfile({ ...profile, profileImageUrl: upload.url });
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
        <h1>Manage your account identity.</h1>
        <p>Update the details used inside your Hilltro workspace. Public landlord display still shows first name only.</p>
      </section>
      <section className="profile-settings-layout single-column-profile">
        <article className="card form-grid">
          <div className="profile-photo-row">
            <HilltroAvatar name={profile.firstName} imageUrl={photoPreview} size="xl" />
            <div className="hero-actions">
              <label className="btn primary"><UploadCloud size={17} /> Upload photo<input hidden type="file" accept="image/*" onChange={(event) => uploadPhoto(event.target.files)} /></label>
              {photoPreview && <button className="btn" type="button" onClick={() => { setPhotoPreview(""); setProfile({ ...profile, profileImageUrl: "" }); }}>Delete photo</button>}
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
