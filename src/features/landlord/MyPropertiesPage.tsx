import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarField } from "../../components/CalendarField";
import { SelectField } from "../../components/SelectField";
import { applicantOffers, interestEvents, managedProperties, propertyViewings, type ManagedProperty } from "../../data/landlordProperties";
import { deletePropertyDraft, loadPropertyDrafts, loadPublishedProperties, type PropertyDraft } from "../../services/propertyStore";
import { currentLandlordId, isDemoLandlordSession } from "../../services/supabaseServices";
import { storageService } from "../../services/storageService";
import { supabase } from "../../utils/supabase";
import { propertyImagesComingSoon } from "../../utils/propertyAssets";

const DRAFT_KEY = "hilltro.property.draft";
const epcRatings = ["", "A", "B", "C", "D", "E", "F", "G"];

const statusClass = {
  LIVE: "live",
  DRAFT: "draft",
  INACTIVE: "inactive"
};

export function MyPropertiesPage({ offerGuidance = false }: { offerGuidance?: boolean }) {
  const [properties, setProperties] = useState<ManagedProperty[]>(import.meta.env.VITE_SUPABASE_URL ? [] : managedProperties);
  const [statusModal, setStatusModal] = useState<ManagedProperty | null>(null);
  const [deactivationMode, setDeactivationMode] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [relistDate, setRelistDate] = useState("");
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<PropertyDraft[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [deleteDraft, setDeleteDraft] = useState<PropertyDraft | null>(null);
  const [mediaModal, setMediaModal] = useState<ManagedProperty | null>(null);
  const [mediaKind, setMediaKind] = useState<"floorplan" | "video">("video");
  const [replaceMediaConfirm, setReplaceMediaConfirm] = useState(false);
  const [pendingMediaFile, setPendingMediaFile] = useState<File | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [complianceModal, setComplianceModal] = useState<ManagedProperty | null>(null);
  const [complianceRating, setComplianceRating] = useState("");
  const [complianceExempt, setComplianceExempt] = useState(false);
  const [complianceBusy, setComplianceBusy] = useState(false);
  const [complianceError, setComplianceError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const sync = async () => {
      const owner = await currentLandlordId();
      setOwnerId(owner);
      if (import.meta.env.VITE_SUPABASE_URL) {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
          if (isDemoLandlordSession()) {
            setProperties(managedProperties);
            setDrafts(loadPropertyDrafts(owner));
            return;
          }
          setProperties([]);
          setDrafts([]);
          return;
        }
        const { data } = await supabase
          .from("properties")
          .select("*, property_photos(public_url), floorplans(public_url), property_videos(public_url, external_url)")
          .or(`landlord_id.eq.${user.user.id},created_by.eq.${user.user.id}`)
          .order("updated_at", { ascending: false });
        setProperties((data || []).map((row: any) => ({
          id: row.id,
          imageUrl: row.property_photos?.[0]?.public_url || propertyImagesComingSoon,
          address: [row.address_line_1, row.address_line_2, row.city, row.postcode].filter(Boolean).join(", "),
          rentPcm: row.rent_pcm || 0,
          type: row.property_type,
          bedrooms: row.bedrooms,
          bathrooms: Number(row.bathrooms || 0),
          status: row.status === "live" ? "LIVE" : row.status === "inactive" ? "INACTIVE" : "DRAFT",
          gallery: (row.property_photos || []).map((photo: { public_url: string }) => photo.public_url),
          floorplanUrl: row.floorplans?.[0]?.public_url,
          completion: { requiredFieldsComplete: Boolean(row.address_line_1 && row.description && row.rent_pcm), photosUploaded: Boolean(row.property_photos?.length), nextIncompleteStep: row.draft_step === 0 ? "address" : row.draft_step === 1 ? "details" : row.draft_step === 3 ? "photos" : "valuation" },
          videoUrl: row.property_videos?.[0]?.public_url || row.property_videos?.[0]?.external_url,
          epcRating: row.compliance?.epcRating || "",
          epcExempt: Boolean(row.compliance?.epcExempt),
          epcCertificateUrl: row.compliance?.epcCertificateUrl || "",
          epcCertificateName: row.compliance?.epcCertificateName || "",
          metrics: { photos: row.property_photos?.length || 0, floorplans: row.floorplans?.length || 0, viewings: 0, offers: 0, messages: 0 }
        })));
        setDrafts(loadPropertyDrafts(owner));
        return;
      }
      const published = loadPublishedProperties().map<ManagedProperty>((property) => ({
        id: property.id,
        imageUrl: property.imageUrl,
        address: property.fullAddress,
        rentPcm: property.rentPcm,
        type: property.type,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        status: "LIVE",
        gallery: [property.imageUrl],
        floorplanUrl: property.floorplanUrl,
        videoUrl: property.videoUrl,
        epcRating: property.epcRating,
        epcExempt: property.epcExempt,
        epcCertificateUrl: property.epcCertificateUrl,
        epcCertificateName: property.epcCertificateName,
        completion: { requiredFieldsComplete: true, photosUploaded: true, nextIncompleteStep: "valuation" },
        metrics: { photos: 1 + (property.imageUrls?.length || 0), floorplans: property.floorplanUrl ? 1 : 0, viewings: 0, offers: 0, messages: 0 }
      }));
      setProperties([...published, ...managedProperties.filter((item) => !published.some((property) => property.id === item.id))]);
      setDrafts(loadPropertyDrafts(owner));
    };
    sync();
    window.addEventListener("hilltro:properties-changed", sync);
    return () => window.removeEventListener("hilltro:properties-changed", sync);
  }, []);

  const offerActionClass = useMemo(() => offerGuidance ? "btn primary" : "btn primary", [offerGuidance]);
  const enrichedProperties = useMemo(() => properties.map((property) => ({
    ...property,
    metrics: {
      ...property.metrics,
      photos: property.gallery.length,
      floorplans: property.floorplanUrl ? 1 : 0,
      viewings: propertyViewings.filter((viewing) => viewing.propertyId === property.id).length,
      offers: applicantOffers.filter((offer) => offer.propertyId === property.id && offer.status === "Pending").length,
      messages: interestEvents.filter((event) => event.propertyId === property.id && (event.type === "Sent Message" || event.type === "Follow-up Message")).length
    }
  })), [properties]);
  const filteredProperties = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return enrichedProperties;
    return enrichedProperties.filter((property) => [property.address, property.type, property.bedrooms, property.bathrooms, property.metrics.floorplans, property.rentPcm].join(" ").toLowerCase().includes(term));
  }, [enrichedProperties, query]);

  function handleStatus(property: ManagedProperty) {
    setStatusModal(property);
    setDeactivationMode(false);
    setDeactivationReason("");
    setRelistDate("");
  }

  function deactivate() {
    if (!statusModal) return;
    if (!deactivationReason) return;
    setProperties(properties.map((item) => item.id === statusModal.id ? { ...item, status: "INACTIVE" } : item));
    setStatusModal(null);
    setDeactivationReason("");
  }

  function openMediaModal(property: ManagedProperty, kind: "floorplan" | "video" = "video") {
    setMediaModal(property);
    setMediaKind(kind);
    setReplaceMediaConfirm(false);
    setPendingMediaFile(null);
    setMediaError("");
  }

  async function applyMedia(file: File) {
    if (!mediaModal) return;
    setMediaBusy(true);
    setMediaError("");
    try {
      const upload = mediaKind === "video" ? await storageService.uploadVideo(file) : await storageService.uploadImage(file);
      const mediaUrl = upload.url;
      if (import.meta.env.VITE_SUPABASE_URL && !isDemoLandlordSession()) {
        if (mediaKind === "video") {
          const { error: deleteError } = await supabase.from("property_videos").delete().eq("property_id", mediaModal.id);
          if (deleteError) throw new Error(deleteError.message);
          const { error: insertError } = await supabase.from("property_videos").insert({ property_id: mediaModal.id, public_url: mediaUrl, storage_path: upload.name, provider: "Uploaded video", thumbnail_url: mediaModal.imageUrl });
          if (insertError) throw new Error(insertError.message);
        } else {
          const { error: deleteError } = await supabase.from("floorplans").delete().eq("property_id", mediaModal.id);
          if (deleteError) throw new Error(deleteError.message);
          const { error: insertError } = await supabase.from("floorplans").insert({ property_id: mediaModal.id, public_url: mediaUrl, storage_path: upload.name });
          if (insertError) throw new Error(insertError.message);
        }
      }
      setProperties((current) => current.map((item) => item.id === mediaModal.id ? mediaKind === "video" ? { ...item, videoUrl: mediaUrl } : { ...item, floorplanUrl: mediaUrl } : item));
      setMediaModal((current) => current ? mediaKind === "video" ? { ...current, videoUrl: mediaUrl } : { ...current, floorplanUrl: mediaUrl } : current);
      setPendingMediaFile(null);
      setReplaceMediaConfirm(false);
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setMediaBusy(false);
    }
  }

  async function deleteManagedMedia() {
    if (!mediaModal) return;
    setMediaBusy(true);
    setMediaError("");
    try {
      if (import.meta.env.VITE_SUPABASE_URL && !isDemoLandlordSession()) {
        const { error } = await supabase.from(mediaKind === "video" ? "property_videos" : "floorplans").delete().eq("property_id", mediaModal.id);
        if (error) throw new Error(error.message);
      }
      setProperties((current) => current.map((item) => item.id === mediaModal.id ? mediaKind === "video" ? { ...item, videoUrl: undefined } : { ...item, floorplanUrl: undefined } : item));
      setMediaModal((current) => current ? mediaKind === "video" ? { ...current, videoUrl: undefined } : { ...current, floorplanUrl: undefined } : current);
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Could not delete media. Please try again.");
    } finally {
      setMediaBusy(false);
    }
  }

  function closeMediaModal() {
    setMediaModal(null);
    setReplaceMediaConfirm(false);
    setPendingMediaFile(null);
    setMediaError("");
  }

  function openComplianceModal(property: ManagedProperty) {
    setComplianceModal(property);
    setComplianceRating(property.epcRating || "");
    setComplianceExempt(Boolean(property.epcExempt));
    setComplianceError("");
  }

  async function saveCompliance(file?: File | null) {
    if (!complianceModal) return;
    setComplianceBusy(true);
    setComplianceError("");
    try {
      const upload = file ? await storageService.uploadImage(file) : null;
      const next = {
        epcRating: complianceRating || null,
        epcExempt: complianceExempt,
        epcCertificateUrl: upload?.url || complianceModal.epcCertificateUrl || null,
        epcCertificateName: upload?.name || complianceModal.epcCertificateName || null
      };
      if (import.meta.env.VITE_SUPABASE_URL && !isDemoLandlordSession()) {
        const { error } = await supabase.from("properties").update({ compliance: next }).eq("id", complianceModal.id);
        if (error) throw new Error(error.message);
      }
      setProperties((current) => current.map((item) => item.id === complianceModal.id ? { ...item, epcRating: next.epcRating || "", epcExempt: next.epcExempt, epcCertificateUrl: next.epcCertificateUrl || "", epcCertificateName: next.epcCertificateName || "" } : item));
      setComplianceModal((current) => current ? { ...current, epcRating: next.epcRating || "", epcExempt: next.epcExempt, epcCertificateUrl: next.epcCertificateUrl || "", epcCertificateName: next.epcCertificateName || "" } : current);
    } catch (error) {
      setComplianceError(error instanceof Error ? error.message : "Could not save compliance documents. Please try again.");
    } finally {
      setComplianceBusy(false);
    }
  }

  async function deleteCompliance() {
    if (!complianceModal) return;
    setComplianceBusy(true);
    setComplianceError("");
    try {
      const next = { epcRating: null, epcExempt: false, epcCertificateUrl: null, epcCertificateName: null };
      if (import.meta.env.VITE_SUPABASE_URL && !isDemoLandlordSession()) {
        const { error } = await supabase.from("properties").update({ compliance: next }).eq("id", complianceModal.id);
        if (error) throw new Error(error.message);
      }
      setProperties((current) => current.map((item) => item.id === complianceModal.id ? { ...item, epcRating: "", epcExempt: false, epcCertificateUrl: "", epcCertificateName: "" } : item));
      setComplianceModal((current) => current ? { ...current, epcRating: "", epcExempt: false, epcCertificateUrl: "", epcCertificateName: "" } : current);
      setComplianceRating("");
      setComplianceExempt(false);
    } catch (error) {
      setComplianceError(error instanceof Error ? error.message : "Could not delete compliance documents. Please try again.");
    } finally {
      setComplianceBusy(false);
    }
  }

  function deleteDraftEverywhere(draft: PropertyDraft) {
    deletePropertyDraft(draft.id);
    if (ownerId) localStorage.removeItem(`${DRAFT_KEY}.${ownerId}`);
    setDrafts(loadPropertyDrafts(ownerId));
    setDeleteDraft(null);
  }

  return (
    <main className="page">
      <section className="hero compact-hero">
        <p className="badge orange">My Properties</p>
        <h1>Manage listings like an operating portfolio.</h1>
        <p>Every status, media count, viewing, offer and message is connected to an action.</p>
        <div className="hero-actions"><Link className="btn primary" to="/landlord/properties/new">Create listing</Link><Link className="btn light" to="/photography">Book photography</Link></div>
      </section>
      {offerGuidance && <section className="results-summary guidance-banner">Select the property for which you would like to review offers.</section>}
      <section className="card management-search-panel">
        <div><p className="eyebrow">Portfolio</p><h2>{enrichedProperties.length} properties</h2><p className="muted">{drafts.length} saved draft{drafts.length === 1 ? "" : "s"} ready to continue.</p></div>
        <label>Search properties<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Address, postcode, bedrooms or bathrooms" /></label>
      </section>

      {drafts.length > 0 && (
        <section className="property-management-list draft-list">
          {drafts.map((draft) => (
            <article className="managed-property card" key={draft.id}>
              <div className="managed-main">
                <div className="managed-title"><span className="status-pill draft">Draft</span><Link className="draft-address-link" to={`/landlord/properties/new?propertyId=${draft.id}&resume=${draft.step}`}><h2>{draft.address}</h2></Link></div>
                <p className="muted">{draft.bedrooms} bed · {draft.bathrooms} bath · updated {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(draft.updatedAt))}</p>
              </div>
              <div className="property-actions">
                <Link className="btn primary" to={`/landlord/properties/new?propertyId=${draft.id}&resume=${draft.step}`}>Finish Listing</Link>
                <button className="btn" type="button" onClick={() => setDeleteDraft(draft)}>Delete Draft</button>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="property-management-list">
        {filteredProperties.map((property) => (
          <article className="managed-property card" key={property.id}>
            <Link className="managed-image" to={`/properties/${property.id}`}><img src={property.imageUrl} alt="" /></Link>
            <div className="managed-main">
              <div className="managed-title">
                <button className={`status-pill ${statusClass[property.status]}`} onClick={() => handleStatus(property)}>{property.status === "LIVE" ? "Live" : property.status === "DRAFT" ? "Draft" : "Inactive"}</button>
                <Link to={`/properties/${property.id}`}><h2>{property.address}</h2></Link>
              </div>
              <p className="muted">£{property.rentPcm.toLocaleString("en-GB")} pcm · {property.type} · {property.bedrooms} bed · {property.bathrooms} bath</p>
              <div className="metric-row interactive">
                <Link to={`/landlord/properties/${property.id}/gallery`}>Photos: <b>{property.metrics.photos}</b></Link>
                {property.metrics.floorplans === 0 && <button className="link-button warning" title="Listings with floorplans typically receive better engagement." type="button" onClick={() => openMediaModal(property, "floorplan")}>Add Floorplan</button>}
                {!property.videoUrl && <button className="link-button warning" type="button" onClick={() => openMediaModal(property, "video")}>Add Video</button>}
                <Link to={`/landlord/properties/${property.id}/viewings`}>Viewings: <b>{property.metrics.viewings}</b></Link>
                <Link to={`/landlord/properties/${property.id}/offers`}>Offers: <b>{property.metrics.offers}</b></Link>
                <Link to={`/messages?property=${property.id}`}>Messages: <b>{property.metrics.messages}</b></Link>
              </div>
            </div>
            <div className="property-actions">
              <Link className="btn" to={`/properties/${property.id}`}>View Listing</Link>
              <Link className="btn" to={`/landlord/properties/new?propertyId=${property.id}&resume=details`}>Edit Property</Link>
              <button className="btn" type="button" onClick={() => openMediaModal(property, "floorplan")}>{property.floorplanUrl ? "Manage Floorplan" : "Add Floorplan"}</button>
              <button className="btn" type="button" onClick={() => openMediaModal(property, "video")}>{property.videoUrl ? "Manage Video" : "Add Video"}</button>
              <button className="btn" type="button" onClick={() => openComplianceModal(property)}>Compliance Documents</button>
              <Link className={offerActionClass} to={`/landlord/properties/${property.id}/offers`}>View Offers</Link>
              <Link className="btn" to={`/landlord/properties/${property.id}/viewings`}>Viewings</Link>
              <Link className="btn" to={`/messages?property=${property.id}`}>View Messages</Link>
            </div>
          </article>
        ))}
      </section>
      {filteredProperties.length === 0 && <section className="card empty-state"><h2>No matching properties.</h2><p className="muted">Try searching by postcode, address, bedroom count or bathroom count.</p></section>}

      {deleteDraft && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="card modal-card form-grid">
            <h2>Delete draft?</h2>
            <p className="muted">Are you sure you want to permanently delete this draft?</p>
            <div className="hero-actions"><button className="btn primary" type="button" onClick={() => deleteDraftEverywhere(deleteDraft)}>Delete Draft</button><button className="btn" type="button" onClick={() => setDeleteDraft(null)}>Cancel</button></div>
          </div>
        </div>
      )}

      {mediaModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="card modal-card form-grid">
            <h2>Manage property {mediaKind === "video" ? "video" : "floorplan"}</h2>
            <p className="muted">{mediaModal.address}</p>
            {((mediaKind === "video" && mediaModal.videoUrl) || (mediaKind === "floorplan" && mediaModal.floorplanUrl)) && !replaceMediaConfirm && <p className="notice">This property already has {mediaKind === "video" ? "a video" : "a floorplan"}.</p>}
            {replaceMediaConfirm ? (
              <div className="form-grid">
                <h3>Replace existing media?</h3>
                <p className="muted">{pendingMediaFile?.name || "Selected media"}</p>
                {mediaError && <p className="notice error">{mediaError}</p>}
                <div className="hero-actions"><button className="btn primary" disabled={mediaBusy || !pendingMediaFile} type="button" onClick={() => pendingMediaFile && applyMedia(pendingMediaFile)}>Replace</button><button className="btn" type="button" onClick={() => { setPendingMediaFile(null); setReplaceMediaConfirm(false); }}>Keep Existing</button><button className="btn" type="button" onClick={closeMediaModal}>Cancel</button></div>
              </div>
            ) : (
              <>
                <div className="dropzone photo-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files?.[0]; if (!file) return; if ((mediaKind === "video" && mediaModal.videoUrl) || (mediaKind === "floorplan" && mediaModal.floorplanUrl)) { setPendingMediaFile(file); setReplaceMediaConfirm(true); } else applyMedia(file); }} onClick={() => document.getElementById("managed-media-upload")?.click()}><div><b>Drag {mediaKind === "video" ? "video" : "floorplan"} here or click to upload</b><p className="muted">{mediaKind === "video" ? "Video files are uploaded as applicant-facing walkthroughs." : "Image or PDF floorplans are accepted."}</p></div><input id="managed-media-upload" type="file" accept={mediaKind === "video" ? "video/*" : "image/*,.pdf"} hidden onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if ((mediaKind === "video" && mediaModal.videoUrl) || (mediaKind === "floorplan" && mediaModal.floorplanUrl)) { setPendingMediaFile(file); setReplaceMediaConfirm(true); } else applyMedia(file); event.target.value = ""; }} /></div>
                {mediaKind === "video" && mediaModal.videoUrl && <video className="media-management-video" src={mediaModal.videoUrl} controls />}
                {mediaKind === "floorplan" && mediaModal.floorplanUrl && (mediaModal.floorplanUrl.toLowerCase().includes(".pdf") ? <a className="btn secondary" href={mediaModal.floorplanUrl} target="_blank" rel="noopener noreferrer">View floorplan</a> : <img className="media-management-video" src={mediaModal.floorplanUrl} alt="Property floorplan" />)}
                {mediaError && <p className="notice error">{mediaError}</p>}
                <div className="hero-actions">{((mediaKind === "video" && mediaModal.videoUrl) || (mediaKind === "floorplan" && mediaModal.floorplanUrl)) && <button className="btn" type="button" disabled={mediaBusy} onClick={deleteManagedMedia}>Delete</button>}<button className="btn" type="button" onClick={closeMediaModal}>Close</button></div>
              </>
            )}
          </div>
        </div>
      )}

      {complianceModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="card modal-card form-grid">
            <h2>Compliance documents</h2>
            <p className="muted">{complianceModal.address}</p>
            <div className="form-grid two">
              <SelectField label="EPC rating" value={complianceRating} onChange={(value) => { setComplianceRating(value); if (value !== "F" && value !== "G") setComplianceExempt(false); }} options={epcRatings.map((rating) => ({ value: rating, label: rating ? `EPC ${rating}` : "Select EPC rating" }))} />
              <label>Replace or add EPC<input type="file" accept="image/*,.pdf" disabled={complianceBusy} onChange={(event) => saveCompliance(event.target.files?.[0] || null)} /></label>
            </div>
            {(complianceRating === "F" || complianceRating === "G") && <label className="checkbox-row"><input type="checkbox" checked={complianceExempt} onChange={(event) => setComplianceExempt(event.target.checked)} /> <span>I declare that this property has a valid EPC exemption.</span></label>}
            {complianceModal.epcCertificateUrl ? <a className="btn secondary" href={complianceModal.epcCertificateUrl} target="_blank" rel="noopener noreferrer">See EPC</a> : complianceModal.epcRating ? <p className="badge">EPC {complianceModal.epcRating}</p> : <p className="notice">No EPC document or rating is currently saved.</p>}
            {complianceError && <p className="notice error">{complianceError}</p>}
            <div className="hero-actions">
              <button className="btn primary" type="button" disabled={complianceBusy || ((complianceRating === "F" || complianceRating === "G") && !complianceExempt)} onClick={() => saveCompliance(null)}>{complianceBusy ? "Saving..." : "Save EPC"}</button>
              {(complianceModal.epcCertificateUrl || complianceModal.epcRating) && <button className="btn" type="button" disabled={complianceBusy} onClick={deleteCompliance}>Delete EPC</button>}
              <button className="btn" type="button" onClick={() => setComplianceModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {statusModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="card modal-card form-grid" onSubmit={(event) => { event.preventDefault(); deactivate(); }} noValidate>
            <h2>Manage Listing Status</h2>
            <p className="muted">{statusModal.address}</p>
            {statusModal.status === "LIVE" && !deactivationMode && (
              <div className="hero-actions"><button className="btn" type="button" onClick={() => setStatusModal(null)}>Keep Live</button><button className="btn primary" type="button" onClick={() => setDeactivationMode(true)}>Deactivate Listing</button></div>
            )}
            {statusModal.status === "DRAFT" && (
              <div className="form-grid"><p className="muted">This draft will resume at the next incomplete step.</p><div className="hero-actions"><button className="btn primary" type="button" onClick={() => navigate(`/landlord/properties/new?propertyId=${statusModal.id}&resume=${statusModal.completion.nextIncompleteStep}`)}>Continue Draft</button><button className="btn" type="button" onClick={() => setStatusModal(null)}>Close</button></div></div>
            )}
            {statusModal.status === "INACTIVE" && (
              <div className="form-grid"><p className="muted">{statusModal.completion.requiredFieldsComplete && statusModal.completion.photosUploaded ? "This listing is complete and can be returned to Live." : "This listing is missing required information before it can go Live."}</p><div className="hero-actions"><button className="btn primary" type="button" onClick={() => statusModal.completion.requiredFieldsComplete && statusModal.completion.photosUploaded ? (setProperties(properties.map((item) => item.id === statusModal.id ? { ...item, status: "LIVE" } : item)), setStatusModal(null)) : navigate(`/landlord/properties/new?propertyId=${statusModal.id}&resume=${statusModal.completion.nextIncompleteStep}&missing=activation`)}>{statusModal.completion.requiredFieldsComplete && statusModal.completion.photosUploaded ? "Reactivate Listing" : "Complete Missing Fields"}</button><button className="btn" type="button" onClick={() => setStatusModal(null)}>Close</button></div></div>
            )}
            {deactivationMode && (
              <>
                <p className="form-note">* Required field</p>
                <SelectField label="Reason *" value={deactivationReason} onChange={setDeactivationReason} options={[
                  { value: "", label: "Choose a reason" },
                  { value: "I have decided not to rent the property", label: "I have decided not to rent the property" },
                  { value: "I found a tenant elsewhere", label: "I found a tenant elsewhere" },
                  { value: "I find Hilltro difficult to use", label: "I find Hilltro difficult to use" },
                  { value: "I may relist later", label: "I may relist later" }
                ]} />
                {deactivationReason === "I found a tenant elsewhere" && <label>What monthly rent did you achieve? (optional)<input type="number" placeholder="Optional" /></label>}
                {deactivationReason === "I may relist later" && <CalendarField label="Relist Date *" value={relistDate} onChange={setRelistDate} min={new Date().toISOString().slice(0, 10)} required />}
                <div className="hero-actions"><button className="btn primary" disabled={!deactivationReason}>Deactivate</button><button className="btn" type="button" onClick={() => setDeactivationMode(false)}>Back</button></div>
              </>
            )}
            {!deactivationMode && statusModal.status === "LIVE" && <button className="btn" type="button" onClick={() => setStatusModal(null)}>Close</button>}
          </form>
        </div>
      )}
    </main>
  );
}
