import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { managedProperties, type ManagedProperty } from "../../data/landlordProperties";
import { loadPublishedProperties } from "../../services/propertyStore";
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
  const navigate = useNavigate();

  useEffect(() => {
    const sync = async () => {
      if (import.meta.env.VITE_SUPABASE_URL) {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
          setProperties([]);
          return;
        }
        const { data } = await supabase
          .from("properties")
          .select("*, property_photos(public_url), floorplans(public_url)")
          .eq("landlord_id", user.user.id)
          .order("updated_at", { ascending: false });
        setProperties((data || []).map((row: any) => ({
          id: row.id,
          imageUrl: row.property_photos?.[0]?.public_url || assetUrl("assets/london-apartment-photo.png"),
          address: [row.address_line_1, row.address_line_2, row.city, row.postcode].filter(Boolean).join(", "),
          rentPcm: row.rent_pcm || 0,
          type: row.property_type,
          bedrooms: row.bedrooms,
          status: row.status === "live" ? "LIVE" : row.status === "inactive" ? "INACTIVE" : "DRAFT",
          gallery: (row.property_photos || []).map((photo: { public_url: string }) => photo.public_url),
          floorplanUrl: row.floorplans?.[0]?.public_url,
          completion: { requiredFieldsComplete: Boolean(row.address_line_1 && row.description && row.rent_pcm), photosUploaded: Boolean(row.property_photos?.length), nextIncompleteStep: row.draft_step === 0 ? "address" : row.draft_step === 1 ? "details" : row.draft_step === 3 ? "photos" : "valuation" },
          metrics: { photos: row.property_photos?.length || 0, floorplans: row.floorplans?.length || 0, viewings: 0, offers: 0, messages: 0 }
        })));
        return;
      }
      const published = loadPublishedProperties().map<ManagedProperty>((property) => ({
        id: property.id,
        imageUrl: property.imageUrl,
        address: property.fullAddress,
        rentPcm: property.rentPcm,
        type: property.type,
        bedrooms: property.bedrooms,
        status: "LIVE",
        gallery: [property.imageUrl],
        floorplanUrl: undefined,
        completion: { requiredFieldsComplete: true, photosUploaded: true, nextIncompleteStep: "valuation" },
        metrics: { photos: 1, floorplans: 0, viewings: 0, offers: 0, messages: 0 }
      }));
      setProperties([...published, ...managedProperties.filter((item) => !published.some((property) => property.id === item.id))]);
    };
    sync();
    window.addEventListener("haaste:properties-changed", sync);
    return () => window.removeEventListener("haaste:properties-changed", sync);
  }, []);

  const offerActionClass = useMemo(() => offerGuidance ? "btn primary pulse-action" : "btn primary", [offerGuidance]);

  function handleStatus(property: ManagedProperty) {
    setStatusModal(property);
    setDeactivationMode(false);
    setDeactivationReason("");
  }

  function deactivate() {
    if (!statusModal) return;
    setProperties(properties.map((item) => item.id === statusModal.id ? { ...item, status: "INACTIVE" } : item));
    setStatusModal(null);
    setDeactivationReason("");
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

      <section className="property-management-list">
        {properties.map((property) => (
          <article className="managed-property card" key={property.id}>
            <Link className="managed-image" to={`/properties/${property.id}`}><img src={property.imageUrl} alt="" /></Link>
            <div className="managed-main">
              <div className="managed-title">
                <button className={`status-pill ${statusClass[property.status]}`} onClick={() => handleStatus(property)}>{property.status === "LIVE" ? "Live" : property.status === "DRAFT" ? "Draft" : "Inactive"}</button>
                <Link to={`/properties/${property.id}`}><h2>{property.address}</h2></Link>
              </div>
              <p className="muted">£{property.rentPcm.toLocaleString("en-GB")} pcm · {property.type} · {property.bedrooms} bed</p>
              <div className="metric-row interactive">
                <Link to={`/landlord/properties/${property.id}/gallery`}>Photos: <b>{property.metrics.photos}</b></Link>
                <Link className={property.metrics.floorplans === 0 ? "warning" : ""} title={property.metrics.floorplans === 0 ? "Listings with floorplans typically receive better engagement." : "Open floorplan viewer"} to={`/landlord/properties/${property.id}/floorplan`}>{property.metrics.floorplans === 0 ? "Upload a floorplan" : <>Floorplans: <b>{property.metrics.floorplans}</b></>}</Link>
                <Link to={`/landlord/properties/${property.id}/viewings`}>Viewings: <b>{property.metrics.viewings}</b></Link>
                <Link to={`/landlord/properties/${property.id}/offers`}>Offers: <b>{property.metrics.offers}</b></Link>
                <Link to={`/messages?property=${property.id}`}>Messages: <b>{property.metrics.messages}</b></Link>
              </div>
            </div>
            <div className="property-actions">
              <Link className="btn" to={`/properties/${property.id}`}>View Listing</Link>
              <Link className="btn" to={`/landlord/properties/new?propertyId=${property.id}&resume=details`}>Edit Property</Link>
              <Link className={offerActionClass} to={`/landlord/properties/${property.id}/offers`}>View Offers</Link>
              <Link className="btn" to={`/landlord/properties/${property.id}/viewings`}>Viewings</Link>
              <Link className="btn" to={`/messages?property=${property.id}`}>View Messages</Link>
            </div>
          </article>
        ))}
      </section>

      {statusModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="card modal-card form-grid" onSubmit={(event) => { event.preventDefault(); deactivate(); }}>
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
                <label>Reason *
                  <select value={deactivationReason} onChange={(event) => setDeactivationReason(event.target.value)} required>
                    <option value="">Choose a reason</option>
                    <option>I have decided not to rent the property</option>
                    <option>I found a tenant elsewhere</option>
                    <option>I find Haaste difficult to use</option>
                    <option>I may relist later</option>
                  </select>
                </label>
                {deactivationReason === "I found a tenant elsewhere" && <label>What monthly rent did you achieve? (optional)<input type="number" placeholder="Optional" /></label>}
                {deactivationReason === "I may relist later" && <label>Relist Date *<input type="date" min="2026-06-03" required /></label>}
                <div className="hero-actions"><button className="btn primary">Deactivate</button><button className="btn" type="button" onClick={() => setDeactivationMode(false)}>Back</button></div>
              </>
            )}
            {!deactivationMode && statusModal.status === "LIVE" && <button className="btn" type="button" onClick={() => setStatusModal(null)}>Close</button>}
          </form>
        </div>
      )}
    </main>
  );
}
