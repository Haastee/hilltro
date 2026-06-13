import { FormEvent, lazy, Suspense, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CalendarCheck, ChevronLeft, ChevronRight, FileSignature, Maximize2, MessageSquare, Play, ShieldCheck, Star, X } from "lucide-react";
import { propertyService } from "../../app/services";
import type { Property, User } from "../../types/domain";
import { supabase } from "../../utils/supabase";
import { demoProperties, localPropertyById } from "../../data/properties";
import { landlordById } from "../../data/landlordProperties";
import { CalendarField, isValidViewingDateTime, ViewingDateTimePicker } from "../../components/CalendarField";
import { SelectField } from "../../components/SelectField";
import { PropertyCard } from "./PropertyCard";
import { HilltroAvatar, publicLandlordName } from "../../components/HilltroAvatar";
import { similarProperties } from "../../services/locationService";
import { isPropertySaved, saveHome, trackPropertyEngagement } from "../../services/engagementService";
import { propertyGallery, videoEmbedUrl, type GalleryItem } from "../../utils/propertyMedia";
import { landlordTypeForLiveListings } from "../../utils/landlordClassification";
import { depositDisplay, formatRentPcm, isValidMoneyInput } from "../../utils/propertyPricing";

const PropertyMap = lazy(() => import("../../components/map/PropertyMap"));

const PENDING_ACTION_KEY = "hilltro.pending.property.action";
type PendingAction = { propertyId: string; action: "viewing" | "offer" | "message"; viewingDate?: string; viewingTime?: string; message?: string; offer?: Partial<OfferState> };
type OfferState = { moveDate: string; rent: string; occupants: string; relation: string; pets: "No" | "Yes"; petDetails: string; petImage?: string; attachmentImage?: string; endDate: string; notes: string; agreed: boolean };
const initialOffer: OfferState = { moveDate: "", rent: "", occupants: "1", relation: "", pets: "No", petDetails: "", petImage: "", attachmentImage: "", endDate: "", notes: "", agreed: false };

export function PropertyDetailPage({ user }: { user: User | null }) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | undefined>();
  const [notice, setNotice] = useState("");
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerStep, setOfferStep] = useState(0);
  const [offer, setOffer] = useState<OfferState>(initialOffer);
  const [viewingDate, setViewingDate] = useState("");
  const [viewingTime, setViewingTime] = useState("");
  const [viewingMessage, setViewingMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveToast, setSaveToast] = useState("");
  const [videoPromptDismissed, setVideoPromptDismissed] = useState(() => Boolean(id && localStorage.getItem(`hilltro.video.prompt.${id}`)));

  useEffect(() => {
    if (!id) return;
    setSaved(Boolean(user && isPropertySaved(id, user.id)));
    setVideoPromptDismissed(Boolean(localStorage.getItem(`hilltro.video.prompt.${id}`)));
    const local = localPropertyById(id);
    if (local) {
      setProperty(local);
      return;
    }
    propertyService.getProperty(id, false).then((item) => setProperty(item || localPropertyById(id))).catch(() => setProperty(localPropertyById(id)));
  }, [id, user]);

  function requestSaveProperty() {
    if (!user) {
      navigate(`/register?next=/properties/${id}`);
      return;
    }
    if (user.role !== "TENANT") {
      setNotice("Create a tenant account to save homes to your shortlist.");
      return;
    }
    if (!property) return;
    if (!saved) saveHome(property.id, user.id);
    setSaved(true);
    setSaveToast("Property saved to Saved Homes");
  }

  useEffect(() => {
    if (!saveToast) return;
    const timer = window.setTimeout(() => setSaveToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [saveToast]);

  useEffect(() => {
    if (!id || !property || !user) return;
    const pending = readPendingAction();
    const action = (params.get("action") as PendingAction["action"] | null) || pending?.action;
    if (!action || pending?.propertyId !== id) return;
    if (pending?.viewingDate) setViewingDate(pending.viewingDate);
    if (pending?.viewingTime) setViewingTime(pending.viewingTime);
    if (pending?.message) setViewingMessage(pending.message);
    if (pending?.offer) setOffer({ ...initialOffer, rent: String(property.rentPcm), ...pending.offer });
    window.history.replaceState(null, "", `/properties/${id}`);
    localStorage.removeItem(PENDING_ACTION_KEY);
    if (action === "offer") {
      setOfferOpen(true);
      setOfferStep(0);
    }
    if (action === "viewing") setNotice("Your viewing details were restored. Press Request viewing to send them.");
    if (action === "message") setNotice("Your message intent was restored. Use Message landlord to continue the conversation.");
  }, [id, params, property, user]);

  async function requestViewing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      savePendingAction({ propertyId: id || "", action: "viewing", viewingDate, viewingTime, message: viewingMessage });
      navigate(`/register?next=/properties/${id}?action=viewing`);
      return;
    }
    if (user.role !== "TENANT") {
      setNotice("Landlord accounts cannot request viewings. Create a tenant account to request a viewing for this property.");
      return;
    }
    if (!viewingDate || !viewingTime || !viewingMessage.trim()) {
      setNotice("Choose a viewing date and time slot, then add a short message before sending the request.");
      return;
    }
    if (!isValidViewingDateTime(viewingDate, viewingTime)) {
      setNotice("Choose a viewing slot at least one hour from now. Past dates and times cannot be requested.");
      return;
    }
    if (import.meta.env.VITE_SUPABASE_URL && property) {
      const { data: row } = await supabase.from("properties_public").select("landlord_id").eq("id", property.id).maybeSingle();
      await supabase.from("viewings").insert({ property_id: property.id, landlord_id: row?.landlord_id, tenant_id: user.id, requested_date: viewingDate, requested_time: viewingTime, message: viewingMessage, status: "requested" });
    }
    setNotice("Viewing request sent. The landlord will see your referencing readiness, never private risk details.");
  }

  function openOfferFlow() {
    const next = { ...initialOffer, rent: String(property?.rentPcm || ""), moveDate: offer.moveDate };
    if (!user) {
      savePendingAction({ propertyId: id || "", action: "offer", offer: next });
      navigate(`/register?next=/properties/${id}?action=offer`);
      return;
    }
    if (user.role !== "TENANT") {
      setNotice("Landlord accounts cannot send tenant offers. Create a tenant account to submit an offer on this property.");
      return;
    }
    setOffer(next);
    setOfferStep(0);
    setOfferOpen(true);
  }

  function messageLandlord() {
    if (!user) {
      savePendingAction({ propertyId: id || "", action: "message" });
      navigate(`/register?next=/properties/${id}?action=message`);
      return;
    }
    if (user.role !== "TENANT") {
      setNotice("Landlord accounts cannot message another landlord as a tenant enquiry. Create a tenant account to enquire about this property.");
      return;
    }
    navigate(`/messages?property=${property?.id}`);
  }

  async function submitOffer() {
    if (!offer.agreed) {
      setNotice("Agree to the Hilltro terms before submitting your offer.");
      return;
    }
    if (import.meta.env.VITE_SUPABASE_URL && property) {
      const { data: row } = await supabase.from("properties_public").select("landlord_id").eq("id", property.id).maybeSingle();
      await supabase.from("offers").insert({ property_id: property.id, landlord_id: row?.landlord_id, tenant_id: user!.id, offer_rent_pcm: Number(offer.rent || property.rentPcm), move_in_date: offer.moveDate || new Date().toISOString().slice(0, 10), occupants: offer.occupants, pets: offer.pets, notes: [offer.notes, offer.pets === "Yes" ? `Pet details: ${offer.petDetails}` : "", offer.attachmentImage ? "Supporting photo attached." : ""].filter(Boolean).join("\n"), status: "submitted" });
    }
    setOfferOpen(false);
    setNotice("Offer submitted. The landlord can review it from My Properties > Offers.");
  }

  if (!property) return <main className="page"><section className="hero"><h1>Property not found.</h1><Link className="btn light" to="/search">Back to search</Link></section></main>;
  const landlord = property.landlordFirstName
    ? {
      id: property.landlordId || "",
      firstName: property.landlordFirstName,
      profilePhotoUrl: property.landlordAvatarUrl,
      landlordType: landlordTypeForLiveListings(property.landlordLiveListingCount || 0)
    }
    : landlordById(property.landlordId);

  return (
    <main className="page">
      <section className="property-detail">
        <div className="property-main-column">
          <PropertyGallery property={property} videoPromptDismissed={videoPromptDismissed} onDismissVideoPrompt={() => {
            localStorage.setItem(`hilltro.video.prompt.${property.id}`, "dismissed");
            setVideoPromptDismissed(true);
          }} />
          <section className="property-info-stack">
            <div className="feature-pill-grid">{propertyFeatures(property).map((feature) => <span className="feature-pill" key={feature}>{feature}</span>)}</div>
            <article className="description-panel"><h2>Description</h2><p>{property.description}</p></article>
            {property.latitude && property.longitude && (
              <article className="property-location-panel">
                <div><p className="eyebrow">Location</p><h2>{property.area}, {property.city}</h2><p className="muted">Approximate location shown. Exact address is protected until viewing approval.</p></div>
                <div className="premium-map real-map compact-property-map">
                  <Suspense fallback={<div className="map-loading">Loading map...</div>}>
                    <PropertyMap properties={[property]} selectedPropertyId={property.id} onSelectProperty={() => undefined} drawing={false} polygon={[]} onPolygonChange={() => undefined} />
                  </Suspense>
                </div>
              </article>
            )}
          </section>
        </div>
        <aside className="card enquiry-card">
          <span className="badge orange">Verified-ready rental</span>
          <div className="property-title-row">
            <h1>{property.title}</h1>
            <button className={`save-property-compact ${saved ? "saved" : ""}`} type="button" aria-pressed={saved} onClick={requestSaveProperty}>
              <Star size={16} fill={saved ? "currentColor" : "none"} />
              <span>{saved ? "Saved" : "Save"}</span>
            </button>
          </div>
          <p className="muted">{property.streetName}, {property.area}, {property.city} {property.postcodeDistrict}</p>
          <Link className="landlord-mini-profile" to={`/landlords/${landlord.id}`}>
            <HilltroAvatar name={publicLandlordName(landlord)} imageUrl={landlord.profilePhotoUrl} />
            <span><b>{publicLandlordName(landlord)}</b><small>{landlord.landlordType}</small></span>
          </Link>
          <h2>{formatRentPcm(property.rentPcm)}</h2>
          <p className="property-deposit">{depositDisplay(property.rentPcm, property.type)}</p>
          <p>{property.bedrooms} bed · {property.bathrooms} bath · {property.furnishingStatus}</p>
          <form className="form-grid" onSubmit={requestViewing} noValidate>
            <p className="form-note">* Required field</p>
            <ViewingDateTimePicker date={viewingDate} time={viewingTime} onDateChange={setViewingDate} onTimeChange={setViewingTime} />
            <label>Message *<textarea name="message" required value={viewingMessage} onChange={(event) => setViewingMessage(event.target.value)} placeholder="Write a short message about yourself and confirm if you have any special requests regarding the property." /></label>
            <p className="form-note">Write a short message about yourself and confirm if you have any special requests regarding the property.</p>
            {notice && <p className="badge orange">{notice}</p>}
            <button className="btn primary"><CalendarCheck size={18} /> Request viewing</button>
            <button className="btn" type="button" onClick={messageLandlord}><MessageSquare size={18} /> Message landlord</button>
            <button className="btn" type="button" onClick={openOfferFlow}><FileSignature size={18} /> Send offer</button>
          </form>
        </aside>
      </section>
      {(property.epcCertificateUrl || property.epcRating || property.epcExempt) && (
        <section className="card epc-public-panel">
          <div>
            <p className="eyebrow">Energy performance</p>
            <h2>Energy compliance</h2>
            {property.epcExempt && <p className="notice">The landlord has declared a valid EPC exemption for this property.</p>}
            {!property.epcCertificateUrl && property.epcRating && <span className="badge">EPC {property.epcRating}</span>}
          </div>
          {property.epcCertificateUrl && <a className="btn secondary" href={property.epcCertificateUrl} target="_blank" rel="noopener noreferrer" download>See EPC</a>}
        </section>
      )}
      {saveToast && <div className="save-toast" role="status"><Star size={16} fill="currentColor" /> {saveToast}</div>}
      {offerOpen && <OfferFlow property={property} offer={offer} setOffer={setOffer} step={offerStep} setStep={setOfferStep} onSubmit={submitOffer} onClose={() => setOfferOpen(false)} />}

      <section className="grid cols-3" style={{ marginTop: 18 }}>
        <article className="card"><ShieldCheck /><h3>Address protected</h3><p className="muted">The exact address is only released after the viewing is approved.</p></article>
        <article className="card"><h3>APT progression</h3><p className="muted">Referencing, offer, deposit and Assured Periodic Tenancy signing all run through Hilltro.</p></article>
      </section>
      <SimilarProperties property={property} />
    </main>
  );
}

function PropertyGallery({ property, videoPromptDismissed, onDismissVideoPrompt }: { property: Property; videoPromptDismissed: boolean; onDismissVideoPrompt: () => void }) {
  const gallery = propertyGallery(property);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const active = gallery[activeIndex] || gallery[0];
  const hasVideo = gallery.some((item) => item.kind === "video");

  useEffect(() => {
    trackPropertyEngagement(property.id, "property_view", { source: "property_page" });
  }, [property.id]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
      if (event.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function move(direction: -1 | 1) {
    setActiveIndex((current) => {
      const next = (current + direction + gallery.length) % gallery.length;
      trackPropertyEngagement(property.id, gallery[next].kind === "video" ? "video_view" : "gallery_view", { source: "property_page_gallery", index: next + 1, kind: gallery[next].kind });
      if (gallery[next].kind === "video") {
        localStorage.setItem(`hilltro.video.prompt.${property.id}`, "watched");
        onDismissVideoPrompt();
      }
      return next;
    });
  }

  function select(index: number) {
    setActiveIndex(index);
    trackPropertyEngagement(property.id, gallery[index].kind === "video" ? "video_view" : "gallery_view", { source: "property_page_thumbnail", index: index + 1, kind: gallery[index].kind });
    if (gallery[index].kind === "video") {
      localStorage.setItem(`hilltro.video.prompt.${property.id}`, "watched");
      onDismissVideoPrompt();
    }
  }

  const viewer = (
    <div
      className="property-gallery-viewer"
      onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
      onTouchEnd={(event) => {
        if (touchStart === null) return;
        const delta = event.changedTouches[0].clientX - touchStart;
        if (Math.abs(delta) > 36) move(delta > 0 ? -1 : 1);
        setTouchStart(null);
      }}
    >
      {renderGalleryItem(active, property.title)}
      <span className="gallery-counter">{activeIndex + 1} / {gallery.length}</span>
      <div className="property-gallery-controls">
        <button type="button" aria-label="Previous image" onClick={() => move(-1)}><ChevronLeft size={20} /></button>
        <button type="button" aria-label="Next image" onClick={() => move(1)}><ChevronRight size={20} /></button>
      </div>
      <button className="gallery-fullscreen-trigger" type="button" aria-label="Open fullscreen gallery" onClick={() => setFullscreen(true)}><Maximize2 size={18} /></button>
      {hasVideo && !videoPromptDismissed && active.kind !== "video" && (
        <div className="video-tour-prompt">
          <button type="button" onClick={() => select(gallery.findIndex((item) => item.kind === "video"))}><Play size={16} /> Watch Property Walkthrough</button>
          <button type="button" aria-label="Dismiss video prompt" onClick={onDismissVideoPrompt}><X size={15} /></button>
        </div>
      )}
    </div>
  );

  return (
    <div className="property-media property-gallery">
      {viewer}
      <div className="property-gallery-thumbs" aria-label="Property gallery thumbnails">
        {gallery.map((item, index) => (
          <button type="button" className={`${index === activeIndex ? "active" : ""} ${item.kind === "video" ? "video-gallery-thumb" : ""}`} key={item.id} onClick={() => select(index)}>
            <img src={item.thumbnailUrl} alt="" />
            {item.kind === "video" && <span><Play size={13} /> Video</span>}
            {item.kind === "floorplan" && <span>Floorplan</span>}
          </button>
        ))}
      </div>
      {fullscreen && (
        <div className="gallery-fullscreen" role="dialog" aria-modal="true">
          <button className="gallery-close" aria-label="Close fullscreen gallery" onClick={() => setFullscreen(false)}><X size={24} /></button>
          {viewer}
          <div className="property-gallery-thumbs fullscreen-thumbs">
            {gallery.map((item, index) => <button type="button" className={`${index === activeIndex ? "active" : ""} ${item.kind === "video" ? "video-gallery-thumb" : ""}`} key={item.id} onClick={() => select(index)}><img src={item.thumbnailUrl} alt="" />{item.kind === "video" && <span><Play size={13} /> Video</span>}</button>)}
          </div>
        </div>
      )}
    </div>
  );
}

function renderGalleryItem(item: GalleryItem, alt: string) {
  if (item.kind === "video") {
    if (/\.(mp4|webm|mov)(\?|#|$)/i.test(item.url)) {
      return <video src={item.url} title={item.title} controls muted playsInline preload="metadata" />;
    }
    return <iframe src={videoEmbedUrl(item.url)} title={item.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
  }
  return <img src={item.url} alt={item.kind === "floorplan" ? "Property floorplan" : alt} />;
}

function OfferFlow({ property, offer, setOffer, step, setStep, onSubmit, onClose }: { property: Property; offer: OfferState; setOffer: (value: OfferState) => void; step: number; setStep: (value: number) => void; onSubmit: () => void; onClose: () => void }) {
  const needsEndDate = property.rentPcm > 8333;
  function imageUpload(field: "petImage" | "attachmentImage") {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const file = [...(event.target.files || [])].find((item) => item.type.startsWith("image/"));
      if (!file || file.size > 8 * 1024 * 1024) return;
      setOffer({ ...offer, [field]: URL.createObjectURL(file) });
    };
  }
  const screens = [
    { title: "When would you like to move in?", body: <CalendarField label="Move-in date *" value={offer.moveDate} onChange={(moveDate) => setOffer({ ...offer, moveDate })} required />, valid: Boolean(offer.moveDate) },
    { title: "What rent would you like to offer?", body: <label>Offer amount *<input type="number" min="0" step="0.01" value={offer.rent} onChange={(event) => setOffer({ ...offer, rent: event.target.value })} /></label>, valid: isValidMoneyInput(offer.rent) },
    { title: "Who will live at the property?", body: <div className="form-grid two"><label>Occupants *<input type="number" min="1" value={offer.occupants} onChange={(event) => setOffer({ ...offer, occupants: event.target.value })} /></label><label>Relation *<input value={offer.relation} onChange={(event) => setOffer({ ...offer, relation: event.target.value })} placeholder="Single, couple, family, sharers" /></label></div>, valid: Boolean(offer.occupants && offer.relation) },
    { title: "Do you have pets?", body: <div className="form-grid"><SelectField label="Pets *" value={offer.pets} onChange={(pets) => setOffer({ ...offer, pets: pets as "Yes" | "No", petDetails: pets === "No" ? "" : offer.petDetails })} options={[{ value: "No", label: "No" }, { value: "Yes", label: "Yes" }]} />{offer.pets === "Yes" && <><label>Pet Details *<textarea value={offer.petDetails} onChange={(event) => setOffer({ ...offer, petDetails: event.target.value })} placeholder="Please describe pet type, breed, size and age." /></label><label>Pet photo (optional)<input type="file" accept="image/*" onChange={imageUpload("petImage")} /></label>{offer.petImage && <img className="offer-upload-preview" src={offer.petImage} alt="Pet preview" />}</>}</div>, valid: offer.pets === "No" || Boolean(offer.petDetails.trim()) },
    ...(needsEndDate ? [{ title: "When should the tenancy end?", body: <CalendarField label="Tenancy end date *" value={offer.endDate} onChange={(endDate) => setOffer({ ...offer, endDate })} required />, valid: Boolean(offer.endDate) }] : []),
    { title: "Add a note for the landlord.", body: <label>Notes (optional)<textarea value={offer.notes} onChange={(event) => setOffer({ ...offer, notes: event.target.value })} placeholder="List any requests you may have and tell the landlord a little more about yourself." /></label>, valid: true },
    { title: "Add supporting photos.", body: <div className="form-grid"><p className="muted">Optional. Add an image if it helps explain references, supporting information or additional context.</p><label>Supporting Photos (Optional)<input type="file" accept="image/*" onChange={imageUpload("attachmentImage")} /></label>{offer.attachmentImage && <img className="offer-upload-preview" src={offer.attachmentImage} alt="Supporting attachment preview" />}</div>, valid: true },
    { title: "Review and agree.", body: <div className="form-grid"><div className="offer-review-summary"><span>Offer rent</span><b>{formatRentPcm(Number(offer.rent || property.rentPcm))}</b><span>Deposit</span><b>{depositDisplay(Number(offer.rent || property.rentPcm), property.type).replace("Deposit: ", "")}</b></div><label className="checkbox-row"><input type="checkbox" checked={offer.agreed} onChange={(event) => setOffer({ ...offer, agreed: event.target.checked })} /> <span>I agree to the Hilltro <Link to="/privacy">Privacy Policy</Link>, <Link to="/terms">Terms & Conditions</Link> and <Link to="/offer-terms">Offer Terms</Link>.</span></label></div>, valid: offer.agreed }
  ];
  const current = screens[step];
  function next() {
    if (!current.valid) return;
    setStep(Math.min(screens.length - 1, step + 1));
  }
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div
        className="card modal-card form-grid offer-flow-card"
        onKeyDown={(event) => {
          const tagName = (event.target as HTMLElement).tagName;
          if (event.key !== "Enter" || tagName === "TEXTAREA" || tagName === "BUTTON" || tagName === "A") return;
          event.preventDefault();
          if (step < screens.length - 1) next();
          else if (current.valid) onSubmit();
        }}
      >
        <p className="form-note">Step {step + 1} of {screens.length}</p>
        <h2>{current.title}</h2>
        {current.body}
        <div className="auth-progress"><span style={{ width: `${((step + 1) / screens.length) * 100}%` }} /></div>
        <div className="hero-actions">
          {step > 0 && <button className="btn" type="button" onClick={() => setStep(step - 1)}>Back</button>}
          {step < screens.length - 1 ? <button className="btn primary" type="button" onClick={next} disabled={!current.valid}>Continue</button> : <button className="btn primary" type="button" onClick={onSubmit} disabled={!current.valid}>Submit Offer</button>}
          <button className="btn" type="button" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function propertyFeatures(property: Property) {
  const areaSqm = property.bedrooms >= 4 ? "151 sqm" : property.bedrooms >= 3 ? "118 sqm" : property.bedrooms === 2 ? "82 sqm" : "48 sqm";
  return [
    `${property.bedrooms} ${property.bedrooms === 1 ? "Bedroom" : "Bedrooms"}`,
    `${property.bathrooms} ${property.bathrooms === 1 ? "Bathroom" : "Bathrooms"}`,
    ...(property.floorLevel ? [property.floorLevel] : []),
    ...(property.hasLift ? ["Lift"] : []),
    areaSqm,
    `Move in: ${availabilityLabel(property.availableFrom)}`,
    property.furnishingStatus,
    ...(property.features || []),
    ...(property.type.includes("Penthouse") ? ["Great Views", "Lift"] : []),
    ...(property.rentPcm > 7000 ? ["Concierge"] : []),
    "Pet Friendly"
  ].slice(0, 10);
}

function availabilityLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!value || Number.isNaN(date.getTime()) || date <= today) return "Now";
  return `${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(date)} or later`;
}

function SimilarProperties({ property }: { property: Property }) {
  const similar = similarProperties(property, demoProperties);
  if (!similar.length) return null;
  return (
    <section className="similar-section">
      <div className="section-heading"><p className="eyebrow">Similar Properties</p><h2>Homes in the same range.</h2></div>
      <div className="similar-carousel">{similar.map((item) => <PropertyCard key={item.id} property={item} />)}</div>
    </section>
  );
}

function savePendingAction(action: PendingAction) {
  localStorage.setItem(PENDING_ACTION_KEY, JSON.stringify(action));
}

function readPendingAction(): PendingAction | null {
  try {
    return JSON.parse(localStorage.getItem(PENDING_ACTION_KEY) || "null") as PendingAction | null;
  } catch {
    return null;
  }
}
