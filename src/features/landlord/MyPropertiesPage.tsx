import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarField } from "../../components/CalendarField";
import { SelectField } from "../../components/SelectField";
import { applicantOffers, interestEvents, managedProperties, propertyViewings, type ManagedProperty } from "../../data/landlordProperties";
import { deletePropertyDraft, loadPropertyDrafts, loadPublishedProperties, type PropertyDraft } from "../../services/propertyStore";
import { isDemoLandlordSession } from "../../services/supabaseServices";
import { storageService } from "../../services/storageService";
import { supabase } from "../../utils/supabase";
import { assetUrl } from "../../utils/asset";

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
  const [deleteDraft, setDeleteDraft] = useState<PropertyDraft | null>(null);
  const [mediaModal, setMediaModal] = useState<ManagedProperty | null>(null);
  const [replaceVideoConfirm, setReplaceVideoConfirm] = useState(false);
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoError, setVideoError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const sync = async () => {
      if (import.meta.env.VITE_SUPABASE_URL) {
        if (isDemoLandlordSession()) {
          setProperties(managedProperties);
          setDrafts(loadPropertyDrafts());
          return;
        }
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
          setProperties([]);
          return;
        }
        const { data } = await supabase
          .from("properties")
          .select("*, property_photos(public_url), floorplans(public_url), property_videos(public_url, external_url)")
          .eq("landlord_id", user.user.id)
          .order("updated_at", { ascending: false });
        setProperties((data || []).map((row: any) => ({
          id: row.id,
          imageUrl: row.property_photos?.[0]?.public_url || assetUrl("assets/properties/london-apartment-photo.png"),
          address: [row.address_line_1, row.address_line_2, row.city, row.postcode].filter(Boolean).join(", "),
          rentPcm: row.rent_pcm || 0,
          type: row.property_type,
          bedrooms: row.bedrooms,
          bathrooms: row.bathrooms,
          status: row.status === "live" ? "LIVE" : row.status === "inactive" ? "INACTIVE" : "DRAFT",
          gallery: (row.property_photos || []).map((photo: { public_url: string }) => photo.public_url),
          floorplanUrl: row.floorplans?.[0]?.public_url,
          completion: { requiredFieldsComplete: Boolean(row.address_line_1 && row.description && row.rent_pcm), photosUploaded: Boolean(row.property_photos?.length), nextIncompleteStep: row.draft_step === 0 ? "address" : row.draft_step === 1 ? "details" : row.draft_step === 3 ? "photos" : "valuation" },
          videoUrl: row.property_videos?.[0]?.public_url || row.property_videos?.[0]?.external_url,
          metrics: { photos: row.property_photos?.length || 0, floorplans: row.floorplans?.length || 0, viewings: 0, offers: 0, messages: 0 }
        })));
        setDrafts(loadPropertyDrafts());
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
        completion: { requiredFieldsComplete: true, photosUploaded: true, nextIncompleteStep: "valuation" },
        metrics: { photos: 1 + (property.imageUrls?.length || 0), floorplans: property.floorplanUrl ? 1 : 0, viewings: 0, offers: 0, messages: 0 }
      }));
      setProperties([...published, ...managedProperties.filter((item) => !published.some((property) => property.id === item.id))]);
      setDrafts(loadPropertyDrafts());
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

  function openMediaModal(property: ManagedProperty) {
    setMediaModal(property);
    setReplaceVideoConfirm(false);
    setPendingVideoFile(null);
    setVideoError("");
  }

  async function applyVideo(file: File) {
    if (!mediaModal) return;
    setVideoBusy(true);
    setVideoError("");
    try {
      const upload = await storageService.uploadVideo(file);
      const videoUrl = upload.url;
      setProperties((current) => current.map((item) => item.id === mediaModal.id ? { ...item, videoUrl } : item));
      setMediaModal((current) => current ? { ...current, videoUrl } : current);
      setPendingVideoFile(null);
      setReplaceVideoConfirm(false);
    } catch (error) {
      setVideoError(error instanceof Error ? error.message : "Video upload failed. Please try again.");
    } finally {
      setVideoBusy(false);
    }
  }

  function closeMediaModal() {
    setMediaModal(null);
    setReplaceVideoConfirm(false);
    setPendingVideoFile(null);
    setVideoError("");
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
                <div className="managed-title"><span className="status-pill draft">Draft</span><h2>{draft.address}</h2></div>
                <p className="muted">{draft.bedrooms} bed · {draft.bathrooms} bath · updated {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(draft.updatedAt))}</p>
              </div>
              <div className="property-actions">
                <Link className="btn primary" to={`/landlord/properties/new?propertyId=${draft.id}`}>Finish Listing</Link>
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
                {property.metrics.floorplans === 0 && <Link className="warning" title="Listings with floorplans typically receive better engagement." to={`/landlord/properties/${property.id}/floorplan`}>Add Floorplan</Link>}
                {!property.videoUrl && <button className="link-button warning" type="button" onClick={() => openMediaModal(property)}>Add Video</button>}
                <Link to={`/landlord/properties/${property.id}/viewings`}>Viewings: <b>{property.metrics.viewings}</b></Link>
                <Link to={`/landlord/properties/${property.id}/offers`}>Offers: <b>{property.metrics.offers}</b></Link>
                <Link to={`/messages?property=${property.id}`}>Messages: <b>{property.metrics.messages}</b></Link>
              </div>
            </div>
            <div className="property-actions">
              <Link className="btn" to={`/properties/${property.id}`}>View Listing</Link>
              <Link className="btn" to={`/landlord/properties/new?propertyId=${property.id}&resume=details`}>Edit Property</Link>
              <button className="btn" type="button" onClick={() => openMediaModal(property)}>{property.videoUrl ? "Manage Video" : "Add Video"}</button>
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
            <div className="hero-actions"><button className="btn primary" type="button" onClick={() => { deletePropertyDraft(deleteDraft.id); setDrafts(loadPropertyDrafts()); setDeleteDraft(null); }}>Delete Draft</button><button className="btn" type="button" onClick={() => setDeleteDraft(null)}>Cancel</button></div>
          </div>
        </div>
      )}

      {mediaModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="card modal-card form-grid">
            <h2>Manage property video</h2>
            <p className="muted">{mediaModal.address}</p>
            {mediaModal.videoUrl && !replaceVideoConfirm && <p className="notice">This property already has a video.</p>}
            {replaceVideoConfirm ? (
              <div className="form-grid">
                <h3>Would you like to replace the existing video?</h3>
                <p className="muted">{pendingVideoFile?.name || "Selected video"}</p>
                {videoError && <p className="notice error">{videoError}</p>}
                <div className="hero-actions"><button className="btn primary" disabled={videoBusy || !pendingVideoFile} type="button" onClick={() => pendingVideoFile && applyVideo(pendingVideoFile)}>Replace Existing Video</button><button className="btn" type="button" onClick={() => { setPendingVideoFile(null); setReplaceVideoConfirm(false); }}>Keep Existing Video</button><button className="btn" type="button" onClick={closeMediaModal}>Cancel</button></div>
              </div>
            ) : (
              <>
                <label>Upload video<input type="file" accept="video/*" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (mediaModal.videoUrl) { setPendingVideoFile(file); setReplaceVideoConfirm(true); } else applyVideo(file); }} /></label>
                {mediaModal.videoUrl && <video className="media-management-video" src={mediaModal.videoUrl} controls />}
                {videoError && <p className="notice error">{videoError}</p>}
                <div className="hero-actions">{mediaModal.videoUrl && <button className="btn" type="button" onClick={() => { setProperties(properties.map((item) => item.id === mediaModal.id ? { ...item, videoUrl: undefined } : item)); setMediaModal({ ...mediaModal, videoUrl: undefined }); }}>Delete Video</button>}<button className="btn" type="button" onClick={closeMediaModal}>Close</button></div>
              </>
            )}
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
