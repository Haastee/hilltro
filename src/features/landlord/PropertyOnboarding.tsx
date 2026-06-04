import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { lookupPostcode, suggestPostcodes } from "../../data/addressLookup";
import type { PostcodeLookup } from "../../services/postcodesIo";
import { savePublishedProperty } from "../../services/propertyStore";
import { storageService } from "../../services/storageService";
import { supabase } from "../../utils/supabase";
import { assetUrl } from "../../utils/asset";

const steps = ["Address", "Property Details", "Valuation", "Photos", "Preview"];
const propertyTypes = ["Flat", "Penthouse", "House", "Maisonette", "Detached House", "Semi-Detached House", "Terraced House", "Bungalow"];
const outsideOptions = ["Garden", "Terrace", "Patio", "Balcony", "Roof Terrace"];
const parkingOptions = ["No Parking", "On Street", "Resident Permit Available", "Off Street Parking", "Garage", "Underground Parking", "Allocated Space"];
const furnishingOptions = ["Furnished", "Part Furnished", "Unfurnished", "Flexible", "Open To Discussion"];

type UploadedPhoto = { id: string; name: string; url: string; progress: number };
const DRAFT_KEY = "haaste.property.draft";

export function PropertyOnboarding() {
  const [params] = useSearchParams();
  const resumeStep = params.get("resume");
  const initialStep = resumeStep === "details" ? 1 : resumeStep === "valuation" ? 2 : resumeStep === "photos" ? 3 : 0;
  const [step, setStep] = useState(initialStep);
  const [postcode, setPostcode] = useState("");
  const [postcodeData, setPostcodeData] = useState<PostcodeLookup | null>(null);
  const [postcodeSuggestions, setPostcodeSuggestions] = useState<string[]>([]);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [town, setTown] = useState("");
  const [details, setDetails] = useState({
    bedrooms: "2",
    bathrooms: "1",
    receptions: "1",
    outsideSpace: "No",
    outsideTypes: [] as string[],
    parking: "No Parking",
    furnishing: "Furnished",
    propertyType: "Flat",
    description: ""
  });
  const [rent, setRent] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>(params.get("missing") === "activation" ? [] : [
    { id: "seed-photo", name: "primary-photo.png", url: assetUrl("assets/london-apartment-photo.png"), progress: 100 }
  ]);
  const [dragging, setDragging] = useState(false);
  const [noGas, setNoGas] = useState(false);
  const [missing, setMissing] = useState<Set<string>>(new Set(params.get("missing") ? ["photos"] : []));
  const panelRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progress = ((step + 1) / steps.length) * 100;
  const recommendedRent = useMemo(() => estimateRent(details, postcodeData), [details, postcodeData]);

  useEffect(() => {
    let alive = true;
    const id = window.setTimeout(() => {
      suggestPostcodes(postcode).then((items) => alive && setPostcodeSuggestions(items));
    }, 160);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [postcode]);

  useEffect(() => {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (!draft) return;
    if (draft.step !== undefined && !params.get("resume")) setStep(draft.step);
    setPostcode(draft.postcode || "");
    setAddressLine1(draft.addressLine1 || "");
    setAddressLine2(draft.addressLine2 || "");
    setTown(draft.town || "");
    if (draft.details) setDetails(draft.details);
    setRent(draft.rent || "");
    if (draft.photos) setPhotos(draft.photos);
  }, [params]);

  function toggleOutside(value: string) {
    const selected = details.outsideTypes.includes(value)
      ? details.outsideTypes.filter((item) => item !== value)
      : [...details.outsideTypes, value];
    setDetails({ ...details, outsideTypes: selected });
  }

  function writeWithAi() {
    const location = postcodeData ? `${postcodeData.admin_district || town}, ${postcodeData.region || postcodeData.country}` : "a validated UK postcode";
    setDetails({
      ...details,
      description: `A polished ${details.bedrooms}-bedroom ${details.propertyType.toLowerCase()} in ${location}, presented for tenants who want a secure, transparent rental journey. The home offers ${details.bathrooms} bathroom(s), ${details.receptions} reception room(s), ${details.furnishing.toLowerCase()} furnishing and ${details.parking.toLowerCase()}. Managed through Haaste with verified enquiries, APT progression and secure payment workflows.`
    });
  }

  async function choosePostcode(value: string) {
    setPostcode(value.toUpperCase());
    const result = await lookupPostcode(value);
    setPostcodeData(result);
    if (result?.admin_district) setTown(result.admin_district);
  }

  async function addFiles(fileList: FileList | File[]) {
    const files = [...fileList].filter((file) => file.type.startsWith("image/"));
    for (const file of files) {
      const id = crypto.randomUUID();
      setPhotos((current) => [...current, { id, name: file.name, url: "", progress: 5 }]);
      const uploaded = await storageService.uploadImage(file, (progress) => setPhotos((current) => current.map((item) => item.id === id ? { ...item, progress } : item)));
      setPhotos((current) => current.map((item) => item.id === id ? { ...item, url: uploaded.url, name: uploaded.name, progress: 100 } : item));
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function reorderPhoto(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    setPhotos(next);
  }

  function replacePhoto(index: number) {
    const next = [...photos];
    next[index] = { id: crypto.randomUUID(), name: "replacement-photo.png", url: assetUrl("assets/riverside-suite.png"), progress: 100 };
    setPhotos(next);
  }

  function validateCurrentStep() {
    const nextMissing = new Set<string>();
    if (step === 0) {
      if (!postcode.trim()) nextMissing.add("postcode");
      if (!postcodeData) nextMissing.add("postcodeLookup");
      if (!addressLine1.trim()) nextMissing.add("address");
      if (!town.trim()) nextMissing.add("town");
    }
    if (step === 1) {
      if (!details.bathrooms || Number(details.bathrooms) < 1) nextMissing.add("bathrooms");
      if (details.outsideSpace === "Yes" && details.outsideTypes.length === 0) nextMissing.add("outsideTypes");
      if (!details.description.trim()) nextMissing.add("description");
    }
    if (step === 2 && !rent) nextMissing.add("rent");
    if (step === 3 && photos.length < 1) nextMissing.add("photos");
    setMissing(nextMissing);
    if (nextMissing.size) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return false;
    }
    return true;
  }

  function continueFlow() {
    if (!validateCurrentStep()) return;
    setStep(Math.min(steps.length - 1, step + 1));
  }

  async function saveDraft() {
    if (import.meta.env.VITE_SUPABASE_URL) {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        await supabase.from("properties").upsert({
          id: params.get("propertyId") || undefined,
          landlord_id: user.user.id,
          title: `${town || "Draft"} ${details.propertyType}`,
          address_line_1: addressLine1 || "Address pending",
          address_line_2: addressLine2 || null,
          city: town || postcodeData?.admin_district || "Unknown",
          postcode: postcode || "Unknown",
          postcode_district: postcode.trim().split(/\s+/)[0] || "Unknown",
          latitude: postcodeData?.latitude || null,
          longitude: postcodeData?.longitude || null,
          property_type: details.propertyType,
          bedrooms: details.bedrooms === "Studio" ? 1 : details.bedrooms === "5+" ? 5 : Number(details.bedrooms),
          bathrooms: Number(details.bathrooms),
          receptions: Number(details.receptions),
          outside_space: details.outsideTypes,
          parking: details.parking,
          furnishing: details.furnishing,
          description: details.description,
          rent_pcm: Number(rent || 0),
          status: "draft",
          draft_step: step,
          draft_payload: { postcode, addressLine1, addressLine2, town, details, rent, photos }
        });
      }
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, postcode, addressLine1, addressLine2, town, details, rent, photos }));
  }

  async function saveAndFinishLater() {
    await saveDraft();
    window.location.href = "/landlord/properties";
  }

  async function publishListing() {
    if (!validateCurrentStep()) return;
    const property = {
      id: params.get("propertyId") || `published-${crypto.randomUUID()}`,
      title: `${town || "Verified"} ${details.propertyType}`,
      streetName: addressLine2 || addressLine1,
      area: town || postcodeData?.admin_district || "Area",
      city: town || postcodeData?.admin_district || "London",
      postcodeDistrict: postcode.trim().split(/\s+/)[0] || "W8",
      fullAddress: [addressLine1, addressLine2, town, postcode].filter(Boolean).join(", "),
      postcode,
      type: details.propertyType,
      bedrooms: details.bedrooms === "Studio" ? 1 : details.bedrooms === "5+" ? 5 : Number(details.bedrooms),
      bathrooms: Number(details.bathrooms),
      rentPcm: Number(rent || recommendedRent),
      availableFrom: new Date().toISOString().slice(0, 10),
      furnishingStatus: details.furnishing,
      description: details.description,
      imageUrl: photos[0]?.url || assetUrl("assets/london-apartment-photo.png"),
      status: "LIVE" as const,
      verifiedEnquiriesOnly: true
    };
    if (import.meta.env.VITE_SUPABASE_URL) {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setMissing(new Set(["auth"]));
        return;
      }
      const { data, error } = await supabase.from("properties").upsert({
        id: params.get("propertyId") || undefined,
        landlord_id: user.user.id,
        title: property.title,
        address_line_1: addressLine1,
        address_line_2: addressLine2 || null,
        city: town || postcodeData?.admin_district || "Unknown",
        postcode,
        postcode_district: property.postcodeDistrict,
        latitude: postcodeData?.latitude || null,
        longitude: postcodeData?.longitude || null,
        property_type: details.propertyType,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        receptions: Number(details.receptions),
        outside_space: details.outsideTypes,
        parking: details.parking,
        furnishing: details.furnishing,
        description: details.description,
        rent_pcm: property.rentPcm,
        status: "live",
        draft_step: steps.length - 1,
        draft_payload: {}
      }).select("id").single();
      if (error) throw new Error(error.message);
      if (data?.id) {
        await supabase.from("property_photos").delete().eq("property_id", data.id);
        await supabase.from("property_photos").insert(photos.map((photo, index) => ({ property_id: data.id, public_url: photo.url, storage_path: photo.name, sort_order: index })));
        localStorage.removeItem(DRAFT_KEY);
        window.location.href = `/properties/${data.id}`;
        return;
      }
    }
    savePublishedProperty(property);
    localStorage.removeItem(DRAFT_KEY);
    window.location.href = `/properties/${property.id}`;
  }

  return (
    <main className="page">
      <section className="hero compact-hero">
        <p className="badge orange">Create listing</p>
        <h1>List a property through a guided premium flow.</h1>
        <p>Step {step + 1} of {steps.length}. Address first, details second, rental guidance before pricing.</p>
        <div className="progress"><span style={{ width: `${progress}%` }} /></div>
      </section>
      <section className="workflow">
        <aside className="card step-list">
          {steps.map((label, index) => <div key={label} className={`step ${index === step ? "current" : ""}`}>{index + 1}. {label}</div>)}
        </aside>
        <article className="card onboarding-panel" ref={panelRef}>
          {missing.size > 0 && <p className="notice error">Complete the highlighted fields before continuing. Each item is needed to publish or reactivate the property safely.</p>}
          {step === 0 && (
            <div className="form-grid">
              <h2>Address lookup</h2>
              <p className="form-note">* Required field</p>
              <label className={`autocomplete-wrap ${missing.has("postcode") ? "required-missing" : ""}`}>Postcode *
                <input value={postcode} onChange={(event) => { setPostcode(event.target.value.toUpperCase()); setPostcodeData(null); }} placeholder="W8 1AA" />
                {missing.has("postcode") && <small>Postcode is required so Haaste can verify location, valuation and address options.</small>}
                {missing.has("postcodeLookup") && <small>Select a valid postcode result before continuing.</small>}
                {postcodeSuggestions.length > 0 && !postcodeData && (
                  <div className="autocomplete-menu">
                    {postcodeSuggestions.map((item) => <button type="button" key={item} onMouseDown={() => choosePostcode(item)}><strong>{item}</strong><span>Postcode</span></button>)}
                  </div>
                )}
              </label>
              {postcodeData && <p className="badge">Valid postcode: {postcodeData.admin_district || postcodeData.region || postcodeData.country}</p>}
              <label className={missing.has("address") ? "required-missing" : ""}>Address line 1 *
                <input value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)} placeholder="Flat and building number" />
                {missing.has("address") && <small>Enter the exact property address here.</small>}
              </label>
              <label>Address line 2 (optional)<input value={addressLine2} onChange={(event) => setAddressLine2(event.target.value)} placeholder="Street or building name" /></label>
              <label className={missing.has("town") ? "required-missing" : ""}>Town or borough *<input value={town} onChange={(event) => setTown(event.target.value)} />{missing.has("town") && <small>Town or borough is required for listing display and valuation guidance.</small>}</label>
            </div>
          )}

          {step === 1 && (
            <div className="form-grid">
              <h2>Property details</h2>
              <p className="form-note">* Required field</p>
              <div className="form-grid two">
                <label>Bedrooms *<select value={details.bedrooms} onChange={(event) => setDetails({ ...details, bedrooms: event.target.value })}><option>Studio</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>5+</option></select></label>
                <label className={missing.has("bathrooms") ? "required-missing" : ""}>Bathrooms *<input type="number" min="1" value={details.bathrooms} onChange={(event) => setDetails({ ...details, bathrooms: event.target.value })} />{missing.has("bathrooms") && <small>Bathroom count is required for valuation and listing quality.</small>}</label>
                <label>Reception Rooms *<input type="number" min="0" value={details.receptions} onChange={(event) => setDetails({ ...details, receptions: event.target.value })} /></label>
                <label>Property Type *<select value={details.propertyType} onChange={(event) => setDetails({ ...details, propertyType: event.target.value })}>{propertyTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Parking *<select value={details.parking} onChange={(event) => setDetails({ ...details, parking: event.target.value })}>{parkingOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Furnishing *<select value={details.furnishing} onChange={(event) => setDetails({ ...details, furnishing: event.target.value })}>{furnishingOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>
              <label>Outside Space *<select value={details.outsideSpace} onChange={(event) => setDetails({ ...details, outsideSpace: event.target.value, outsideTypes: event.target.value === "Yes" ? details.outsideTypes : [] })}><option>No</option><option>Yes</option></select></label>
              {details.outsideSpace === "Yes" && <div className={missing.has("outsideTypes") ? "required-missing" : ""}><div className="choice-grid">{outsideOptions.map((item) => <button type="button" className={`choice ${details.outsideTypes.includes(item) ? "selected" : ""}`} key={item} onClick={() => toggleOutside(item)}>{item}</button>)}</div>{missing.has("outsideTypes") && <small>Select at least one outside space type so applicants understand the usable amenity.</small>}</div>}
              <label className={missing.has("description") ? "required-missing" : ""}>Property Description *<textarea required value={details.description} onChange={(event) => setDetails({ ...details, description: event.target.value })} />{missing.has("description") && <small>A description helps applicants understand condition, layout and tenancy readiness.</small>}</label>
              <button className="btn" type="button" onClick={writeWithAi}>Write With AI</button>
              <section className="compliance-box">
                <h3>Compliance documents</h3>
                <p className="muted">Providing compliance documentation helps ensure a smoother tenancy experience and may reduce delays during move-in.</p>
                <label className="checkbox-row"><input type="checkbox" checked={noGas} onChange={(event) => setNoGas(event.target.checked)} /> <span>I confirm there is no gas supply at this property.</span></label>
                <div className="form-grid two">
                  {!noGas && <label>Gas Safety Certificate (optional)<input type="file" /></label>}
                  <label>EPC (optional)<input type="file" /></label>
                  <label>EICR (optional)<input type="file" /></label>
                </div>
              </section>
            </div>
          )}

          {step === 2 && (
            <div className="valuation-card">
              <span className="badge orange">Rental valuation</span>
              <h2>Recommended Monthly Rent</h2>
              <p>Based on similar properties in your area we estimate a monthly rent of <b>£{recommendedRent.toLocaleString("en-GB")}</b>.</p>
              <div className="form-grid two">
                <label className={missing.has("rent") ? "required-missing" : ""}>Your monthly rent *<input type="number" value={rent} onChange={(event) => setRent(event.target.value)} placeholder={String(recommendedRent)} />{missing.has("rent") && <small>Confirm your asking rent or use the Haaste recommendation.</small>}</label>
                <button className="btn primary" onClick={() => setRent(String(recommendedRent))}>Try Haaste recommended price</button>
              </div>
            </div>
          )}

          {step === 3 && <div className="form-grid"><h2>Photos</h2><div className={`dropzone photo-drop ${dragging ? "dragging" : ""} ${missing.has("photos") ? "required-missing" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}><div><b>Drag photos here or click to upload</b><p className="muted">Upload multiple images, then reorder, remove or replace them before publishing.</p>{missing.has("photos") && <small>Upload at least one photo before activation.</small>}</div><input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(event) => event.target.files && addFiles(event.target.files)} /></div><div className="photo-preview-grid">{photos.map((photo, index) => <article className="photo-preview" key={photo.id}><img src={photo.url} alt="" /><b>{index + 1}. {photo.name}</b><div className="upload-progress"><span style={{ width: `${photo.progress}%` }} /></div><div className="hero-actions"><button className="btn" onClick={() => reorderPhoto(index, -1)}>Up</button><button className="btn" onClick={() => reorderPhoto(index, 1)}>Down</button><button className="btn" onClick={() => replacePhoto(index)}>Replace</button><button className="btn" onClick={() => setPhotos(photos.filter((item) => item.id !== photo.id))}>Remove</button></div></article>)}</div><Link className="btn" to="/photography">Don't have professional photos? Book Photography with Haaste</Link></div>}
          {step === 4 && <div><h2>Preview listing</h2><p className="muted">Review photos, address privacy, rental price, description and property summary before publishing.</p><p><b>{addressLine1 ? `${addressLine1}, ${town}` : "Address pending"}</b></p><p>£{(rent || recommendedRent).toLocaleString()} pcm · {details.bedrooms} bed · {details.propertyType}</p><button className="btn primary" onClick={publishListing}>Publish Listing</button></div>}
          <div className="hero-actions" style={{ marginTop: 24 }}>
            <button className="btn" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
            {step < steps.length - 1 && <button className="btn primary" onClick={continueFlow}>Continue</button>}
            <button className="btn" onClick={saveAndFinishLater}>Save and Finish Later</button>
          </div>
        </article>
      </section>
    </main>
  );
}

function estimateRent(details: { bedrooms: string; bathrooms: string; propertyType: string; outsideSpace: string; parking: string }, address: PostcodeLookup | null) {
  const baseByCity: Record<string, number> = { London: 1800, Manchester: 1050, Birmingham: 950, Liverpool: 850, Leeds: 900, Edinburgh: 1150, Glasgow: 950, Cardiff: 900, Belfast: 825 };
  const cityBase = baseByCity[address?.admin_district || "London"] || 1000;
  const bedrooms = details.bedrooms === "Studio" ? 0 : details.bedrooms === "5+" ? 5 : Number(details.bedrooms || 1);
  const typeBoost = details.propertyType.includes("Detached") ? 650 : details.propertyType === "Penthouse" ? 900 : details.propertyType.includes("House") ? 420 : details.propertyType === "Maisonette" ? 240 : 0;
  const amenityBoost = (Number(details.bathrooms || 1) - 1) * 180 + (details.outsideSpace === "Yes" ? 180 : 0) + (details.parking === "No Parking" ? 0 : 160);
  return Math.round((cityBase + bedrooms * 430 + typeBoost + amenityBoost) / 25) * 25;
}
