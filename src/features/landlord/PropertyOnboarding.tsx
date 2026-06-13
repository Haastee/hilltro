import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { lookupPostcode, suggestPostcodes } from "../../data/addressLookup";
import { SelectField } from "../../components/SelectField";
import { CalendarField } from "../../components/CalendarField";
import type { PostcodeLookup } from "../../services/postcodesIo";
import { deletePropertyDraft, loadPropertyDrafts, savePropertyDraft, savePublishedProperty } from "../../services/propertyStore";
import { currentLandlordId } from "../../services/supabaseServices";
import { storageService } from "../../services/storageService";
import { supabase } from "../../utils/supabase";
import { propertyImagesComingSoon } from "../../utils/propertyAssets";
import { isSupportedVideoUrl, videoProviderName } from "../../utils/propertyMedia";
import { depositDisplay, formatRentPcm, isValidMoneyInput } from "../../utils/propertyPricing";

const steps = ["Address", "Property Type", "Rooms", "Features", "Description", "Special Features", "Availability", "Valuation", "Photos", "Floorplan", "Video", "Preview"];
const propertyTypes = ["Flat", "Penthouse", "House", "Maisonette", "Detached House", "Semi-Detached House", "Terraced House", "Bungalow", "Shared Property"];
const houseTypes = ["House", "Detached House", "Semi-Detached House", "Terraced House", "Bungalow"];
const floorOptions = ["Basement", "Ground floor", "1st floor", "2nd floor", "3rd floor", "4th floor", "5th floor", "6th floor or higher"];
const floorLevelNumber = (floor: string) => floor === "Basement" ? -1 : floor === "Ground floor" ? 0 : floor.startsWith("6th") ? 6 : parseInt(floor, 10) || 0;
const bedroomOptions = ["0", "1", "2", "3", "4", "5", "5+"];
const bathroomOptions = ["0", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5+"];
const receptionOptions = ["0", "1", "2", "3", "4", "5+"];
const epcRatings = ["A", "B", "C", "D", "E", "F", "G"];
const outsideOptions = ["Garden", "Terrace", "Patio", "Balcony", "Roof Terrace"];
const parkingOptions = ["No Parking", "On Street", "Resident Permit Available", "Off Street Parking", "Off-Street Parking (Separate Charge)", "Garage", "Underground Parking", "Allocated Space"];
const furnishingOptions = ["Furnished", "Part Furnished", "Unfurnished", "Flexible", "Open To Discussion"];
// Balcony, Roof Terrace and Parking are intentionally NOT here — they live in
// Outside Space (Balcony/Roof Terrace) and the dedicated Parking field, so they
// must never be duplicated as Special Features.
const specialFeatureOptions = ["Concierge", "Lift", "Great Views", "Gym", "Residents Lounge", "Communal Garden", "Air Conditioning", "EV Charging", "Swimming Pool"];

type UploadedPhoto = { id: string; name: string; url: string; progress: number; error?: boolean; errorMessage?: string };
const DRAFT_KEY = "hilltro.property.draft";

export function PropertyOnboarding() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const resumeStep = params.get("resume");
  // `resume` accepts either a named key (legacy deep-links) or an exact numeric
  // step so a draft can reopen precisely where the user left off.
  const namedResume: Record<string, number> = { address: 0, details: 1, rooms: 2, features: 3, description: 4, special: 5, availability: 6, valuation: 7, photos: 8, floorplan: 9, video: 10, preview: 11 };
  const numericResume = resumeStep !== null && /^\d+$/.test(resumeStep) ? Number(resumeStep) : null;
  const initialStep = numericResume !== null ? numericResume : (resumeStep ? namedResume[resumeStep] ?? 0 : 0);
  const [step, setStep] = useState(initialStep);
  // Owner of this draft — keeps the in-progress draft scoped to the signed-in
  // account so it never appears in another landlord's portfolio.
  const [landlordId, setLandlordId] = useState("");
  useEffect(() => {
    let alive = true;
    currentLandlordId().then((id) => alive && setLandlordId(id));
    return () => {
      alive = false;
    };
  }, []);
  const [postcode, setPostcode] = useState("");
  const [postcodeData, setPostcodeData] = useState<PostcodeLookup | null>(null);
  const [postcodeSuggestions, setPostcodeSuggestions] = useState<string[]>([]);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [town, setTown] = useState("");
  // Nothing is pre-filled — every required attribute must be deliberately
  // chosen by the landlord.
  const [details, setDetails] = useState({
    bedrooms: "",
    bathrooms: "",
    receptions: "",
    outsideSpace: "",
    outsideTypes: [] as string[],
    parking: "",
    furnishing: "",
    propertyType: "",
    floor: "",
    hasLift: "",
    description: ""
  });
  const [specialFeatures, setSpecialFeatures] = useState<string[]>([]);
  const [rent, setRent] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [floorplan, setFloorplan] = useState<UploadedPhoto | null>(null);
  const [videoTour, setVideoTour] = useState<UploadedPhoto | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoError, setVideoError] = useState("");
  const [epcRating, setEpcRating] = useState("");
  const [epcExempt, setEpcExempt] = useState(false);
  const [epcCertificate, setEpcCertificate] = useState<UploadedPhoto | null>(null);
  const [epcError, setEpcError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [noGas, setNoGas] = useState(false);
  const [missing, setMissing] = useState<Set<string>>(new Set(params.get("missing") ? ["photos"] : []));
  const [publishError, setPublishError] = useState("");
  const [publishing, setPublishing] = useState(false);
  // When the landlord opens "Add Property" and an unfinished draft exists, we
  // ask what to do (Continue / Create New / Cancel) instead of silently dropping
  // them into the old draft. `ready` gates the autosave so we never overwrite
  // the existing draft before they decide.
  const [draftPrompt, setDraftPrompt] = useState<{ address: string } | null>(null);
  const [resumeChoice, setResumeChoice] = useState<"auto" | "continue" | "new">(params.get("propertyId") || params.get("resume") ? "continue" : "auto");
  const [ready, setReady] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progress = ((step + 1) / steps.length) * 100;
  const recommendedRent = useMemo(() => estimateRent(details, postcodeData), [details, postcodeData]);
  const draftId = params.get("propertyId") || "local-draft";
  const needsFloor = !houseTypes.includes(details.propertyType);
  const floorNeedsLift = needsFloor && floorLevelNumber(details.floor) >= 2;
  const selectedBedrooms = bedroomCount(details.bedrooms);
  const selectedReceptions = countValue(details.receptions);
  const successfulPhotos = photos.filter((photo) => photo.url && !photo.error);
  const epcNeedsExemption = epcRating === "F" || epcRating === "G";

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
    // Wait until we know who is signed in, then restore only THIS account's
    // in-progress draft (never another user's autosave on the same browser).
    if (!landlordId) return;
    if (resumeChoice === "new") {
      setReady(true);
      return;
    }
    const draftKey = `${DRAFT_KEY}.${landlordId}`;
    const draft = JSON.parse(localStorage.getItem(draftKey) || "null");
    const hasContent = Boolean(draft && (draft.addressLine1 || draft.postcode || draft.details?.propertyType || draft.rent));
    const hasSavedDraftSummary = loadPropertyDrafts(landlordId).some((item) => item.id === draftId);
    if (hasContent && !hasSavedDraftSummary && draftId === "local-draft") {
      localStorage.removeItem(draftKey);
      setReady(true);
      return;
    }
    const explicit = Boolean(params.get("propertyId") || params.get("resume"));
    // Came in via "Add Property" with an unfinished draft → ask, don't auto-load.
    if (resumeChoice === "auto" && hasContent && !explicit) {
      setDraftPrompt({ address: [draft.addressLine1, draft.town, draft.postcode].filter(Boolean).join(", ") || "Unfinished listing" });
      return;
    }
    if (draft) {
      if (draft.step !== undefined && !params.get("resume")) setStep(draft.step);
      setPostcode(draft.postcode || "");
      setAddressLine1(draft.addressLine1 || "");
      setAddressLine2(draft.addressLine2 || "");
      setBuildingName(draft.buildingName || "");
      setTown(draft.town || "");
      // Merge over the full default shape so a partial/legacy draft can never
      // leave required keys (e.g. outsideTypes) undefined and crash the render.
      if (draft.details) setDetails((prev) => ({ ...prev, ...draft.details, outsideTypes: draft.details.outsideTypes ?? prev.outsideTypes }));
      if (draft.specialFeatures) setSpecialFeatures(draft.specialFeatures);
      setRent(draft.rent || "");
      setAvailableFrom(draft.availableFrom || "");
      if (draft.photos) setPhotos(draft.photos);
      if (draft.floorplan) setFloorplan(draft.floorplan);
      if (draft.videoTour) setVideoTour(draft.videoTour);
      if (draft.videoUrl) setVideoUrl(draft.videoUrl);
      setEpcRating(draft.epcRating || "");
      setEpcExempt(Boolean(draft.epcExempt));
      if (draft.epcCertificate) setEpcCertificate(draft.epcCertificate);
    }
    setReady(true);
  }, [params, landlordId, resumeChoice]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!landlordId || !ready) return;
      const payload = { step, postcode, addressLine1, addressLine2, buildingName, town, details, specialFeatures, rent, availableFrom, photos, floorplan, videoTour, videoUrl, epcRating, epcExempt, epcCertificate };
      localStorage.setItem(`${DRAFT_KEY}.${landlordId}`, JSON.stringify(payload));
      savePropertyDraft({
        id: draftId,
        ownerId: landlordId,
        title: `${town || "Draft"} ${details.propertyType}`,
        address: [addressLine1 && addressLine2 ? `${addressLine1} ${addressLine2}` : addressLine1 || addressLine2, buildingName, town, postcode].filter(Boolean).join(", ") || "Address pending",
        postcode,
        bedrooms: details.bedrooms,
        bathrooms: details.bathrooms,
        rent,
        step,
        updatedAt: new Date().toISOString(),
        payload
      });
    }, 500);
    return () => window.clearTimeout(id);
  }, [addressLine1, addressLine2, availableFrom, buildingName, details, draftId, epcCertificate, epcExempt, epcRating, floorplan, landlordId, photos, postcode, ready, rent, specialFeatures, step, town, videoTour, videoUrl]);

  function toggleOutside(value: string) {
    const selected = details.outsideTypes.includes(value)
      ? details.outsideTypes.filter((item) => item !== value)
      : [...details.outsideTypes, value];
    setDetails({ ...details, outsideTypes: selected });
  }

  function toggleSpecialFeature(value: string) {
    setSpecialFeatures((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function writeWithAi() {
    const location = postcodeData ? `${postcodeData.admin_district || town}, ${postcodeData.region || postcodeData.country}` : "a validated UK postcode";
    setDetails({
      ...details,
      description: `A polished ${details.bedrooms}-bedroom ${details.propertyType.toLowerCase()} in ${location}, presented for tenants who want a secure, transparent rental journey. The home offers ${details.bathrooms} bathroom(s), ${details.receptions} reception room(s), ${details.furnishing.toLowerCase()} furnishing and ${details.parking.toLowerCase()}. Managed through Hilltro with verified enquiries, APT progression and secure payment workflows.`
    });
  }

  async function choosePostcode(value: string) {
    setPostcode(value.toUpperCase());
    const result = await lookupPostcode(value);
    setPostcodeData(result);
    if (result?.admin_district) setTown(result.admin_district);
  }

  async function addFiles(fileList: FileList | File[]) {
    const entries = [...fileList].filter((file) => file.type.startsWith("image/")).map((file) => ({ file, id: crypto.randomUUID() }));
    if (!entries.length) return;
    // Add every selected photo as a placeholder immediately, then upload them in
    // parallel so multi-select feels fast and each preview/progress updates live.
    setPhotos((current) => [...current, ...entries.map(({ file, id }) => ({ id, name: file.name, url: "", progress: 5 }))]);
    await Promise.all(entries.map(async ({ file, id }) => {
      try {
        const uploaded = await storageService.uploadImage(file, (progress) => setPhotos((current) => current.map((item) => item.id === id ? { ...item, progress } : item)));
        setPhotos((current) => current.map((item) => item.id === id ? { ...item, url: uploaded.url, name: uploaded.name, progress: 100, error: false } : item));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed.";
        console.error("Photo upload failed:", message);
        setPhotos((current) => current.map((item) => item.id === id ? { ...item, progress: 0, error: true, errorMessage: message } : item));
      }
    }));
  }

  async function addFloorplan(fileList: FileList | File[]) {
    const file = [...fileList].find((item) => item.type.startsWith("image/") || item.type === "application/pdf");
    if (!file) return;
    const id = crypto.randomUUID();
    setFloorplan({ id, name: file.name, url: "", progress: 5 });
    const uploaded = await storageService.uploadImage(file, (progress) => setFloorplan((current) => current?.id === id ? { ...current, progress } : current));
    setFloorplan({ id, name: uploaded.name, url: uploaded.url, progress: 100 });
  }

  async function addVideo(fileList: FileList | File[]) {
    const file = [...fileList].find((item) => item.type.startsWith("video/"));
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) {
      setVideoError("Video files must be under 200MB. Use a hosted video link for larger walkthroughs.");
      return;
    }
    const id = crypto.randomUUID();
    setVideoError("");
    setVideoTour({ id, name: file.name, url: "", progress: 5 });
    const uploaded = await storageService.uploadVideo(file, (progress) => setVideoTour((current) => current?.id === id ? { ...current, progress } : current));
    setVideoTour({ id, name: uploaded.name, url: uploaded.url, progress: 100 });
  }

  async function addEpcCertificate(fileList: FileList | File[]) {
    const file = [...fileList].find((item) => item.type.startsWith("image/") || item.type === "application/pdf");
    if (!file) {
      setEpcError("Choose a PDF or image EPC certificate.");
      return;
    }
    setEpcError("");
    const id = crypto.randomUUID();
    setEpcCertificate({ id, name: file.name, url: "", progress: 5 });
    try {
      const uploaded = await storageService.uploadImage(file, (progress) => setEpcCertificate((current) => current?.id === id ? { ...current, progress } : current));
      setEpcCertificate({ id, name: uploaded.name, url: uploaded.url, progress: 100 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "EPC upload failed.";
      setEpcError(message);
      setEpcCertificate({ id, name: file.name, url: "", progress: 0, error: true, errorMessage: message });
    }
  }

  function updateVideoUrl(value: string) {
    setVideoUrl(value);
    if (!value.trim()) {
      setVideoError("");
      return;
    }
    setVideoError(isSupportedVideoUrl(value) ? "" : "Use a supported provider such as YouTube, Vimeo, Wistia, Loom or SproutVideo.");
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
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      const id = photos[index]?.id || crypto.randomUUID();
      setPhotos((current) => current.map((item, position) => position === index ? { ...item, url: "", progress: 5, error: false } : item));
      try {
        const uploaded = await storageService.uploadImage(file, (progress) => setPhotos((current) => current.map((item, position) => position === index ? { ...item, progress } : item)));
        setPhotos((current) => current.map((item, position) => position === index ? { id, name: uploaded.name, url: uploaded.url, progress: 100, error: false } : item));
      } catch {
        setPhotos((current) => current.map((item, position) => position === index ? { ...item, progress: 0, error: true } : item));
      }
    };
    input.click();
  }

  function missingForStep(targetStep: number) {
    const missingFields = new Set<string>();
    if (targetStep === 0) {
      if (!postcode.trim()) missingFields.add("postcode");
      if (!postcodeData) missingFields.add("postcodeLookup");
      if (!addressLine1.trim()) missingFields.add("addressLine1");
      if (!town.trim()) missingFields.add("town");
    }
    if (targetStep === 1) {
      if (!details.propertyType) missingFields.add("propertyType");
      if (details.propertyType && needsFloor && !details.floor) missingFields.add("floor");
    }
    if (targetStep === 2) {
      if (!details.bedrooms) missingFields.add("bedrooms");
      if (!details.bathrooms) missingFields.add("bathrooms");
      if (details.receptions === "" || Number(details.receptions) < 0) missingFields.add("receptions");
      if (selectedBedrooms >= 1 && selectedReceptions < 1) missingFields.add("receptionsBedroomRule");
    }
    if (targetStep === 3) {
      if (!details.furnishing) missingFields.add("furnishing");
      if (!details.parking) missingFields.add("parking");
      if (!details.outsideSpace) missingFields.add("outsideSpace");
      if (details.outsideSpace === "Yes" && details.outsideTypes.length === 0) missingFields.add("outsideTypes");
    }
    if (targetStep === 4 && !details.description.trim()) missingFields.add("description");
    if (targetStep === 6 && !availableFrom) missingFields.add("availableFrom");
    if (targetStep === 7 && !isValidMoneyInput(rent)) missingFields.add("rent");
    if (targetStep === 4) {
      if (!epcRating && !epcCertificate?.url) missingFields.add("epc");
      if (epcNeedsExemption && !epcExempt) missingFields.add("epcExempt");
    }
    if (targetStep === 8 && successfulPhotos.length < 1) missingFields.add("photos");
    if (targetStep === 10 && videoUrl.trim() && !isSupportedVideoUrl(videoUrl)) missingFields.add("videoUrl");
    return missingFields;
  }

  function validateCurrentStep() {
    const nextMissing = missingForStep(step);
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
          bedrooms: bedroomCount(details.bedrooms),
          bathrooms: bathroomCount(details.bathrooms),
          receptions: countValue(details.receptions),
          outside_space: details.outsideTypes,
          parking: details.parking,
          furnishing: details.furnishing,
          description: details.description,
          floor_level: needsFloor ? (details.floor || null) : null,
          has_lift: floorNeedsLift && details.hasLift ? details.hasLift === "Yes" : null,
          available_from: availableFrom || null,
          compliance: compliancePayload(epcRating, epcExempt, epcCertificate),
          rent_pcm: Number(rent || 0),
          status: "draft",
          draft_step: step,
          draft_payload: { postcode, addressLine1, addressLine2, buildingName, town, details, specialFeatures, rent, availableFrom, photos, floorplan, videoTour, videoUrl, epcRating, epcExempt, epcCertificate }
        });
      }
    }
    localStorage.setItem(`${DRAFT_KEY}.${landlordId}`, JSON.stringify({ step, postcode, addressLine1, addressLine2, buildingName, town, details, specialFeatures, rent, availableFrom, photos, floorplan, videoTour, videoUrl, epcRating, epcExempt, epcCertificate }));
    savePropertyDraft({
      id: draftId,
      ownerId: landlordId,
      title: `${town || "Draft"} ${details.propertyType}`,
      address: [addressLine1, addressLine2, town, postcode].filter(Boolean).join(", ") || "Address pending",
      postcode,
      bedrooms: details.bedrooms,
      bathrooms: details.bathrooms,
      rent,
      step,
      updatedAt: new Date().toISOString(),
      payload: { step, postcode, addressLine1, addressLine2, buildingName, town, details, specialFeatures, rent, availableFrom, photos, floorplan, videoTour, videoUrl, epcRating, epcExempt, epcCertificate }
    });
  }

  async function saveAndFinishLater() {
    await saveDraft();
    // Client-side navigation keeps the auth session intact (a full reload could
    // momentarily lose it and bounce to /login).
    navigate("/landlord/properties");
  }

  function continueDraft() {
    setDraftPrompt(null);
    setResumeChoice("continue");
  }

  function createNewProperty() {
    if (landlordId) localStorage.removeItem(`${DRAFT_KEY}.${landlordId}`);
    deletePropertyDraft(draftId);
    setDraftPrompt(null);
    setResumeChoice("new");
  }

  async function publishListing() {
    setPublishError("");
    // Validate the whole form. If anything required is missing, jump to that
    // step and highlight it — never block on an invisible error.
    for (let candidate = 0; candidate < steps.length; candidate += 1) {
      const missingFields = missingForStep(candidate);
      if (missingFields.size) {
        setStep(candidate);
        setMissing(missingFields);
        panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    setMissing(new Set());
    setPublishing(true);
    try {
      await runPublish();
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "Could not publish the listing. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  async function runPublish() {
    const property = {
      id: params.get("propertyId") || `published-${crypto.randomUUID()}`,
      title: `${town || "Verified"} ${details.propertyType}`,
      streetName: addressLine1,
      area: town || postcodeData?.admin_district || "Area",
      city: town || postcodeData?.admin_district || "London",
      postcodeDistrict: postcode.trim().split(/\s+/)[0] || "W8",
      fullAddress: [addressLine1, addressLine2, town, postcode].filter(Boolean).join(", "),
      postcode,
      type: details.propertyType,
      bedrooms: bedroomCount(details.bedrooms),
      bathrooms: bathroomCount(details.bathrooms),
      rentPcm: Number(rent || recommendedRent),
      availableFrom: availableFrom || new Date().toISOString().slice(0, 10),
      furnishingStatus: details.furnishing,
      description: details.description,
      features: [...specialFeatures, ...details.outsideTypes],
      imageUrl: successfulPhotos[0]?.url || propertyImagesComingSoon,
      imageUrls: successfulPhotos.map((photo) => photo.url),
      floorplanUrl: floorplan?.url || undefined,
      videoUrl: videoUrl.trim() || videoTour?.url || undefined,
      videoProvider: videoUrl.trim() ? videoProviderName(videoUrl) : videoTour ? "Uploaded video" : undefined,
      videoThumbnailUrl: successfulPhotos[0]?.url || undefined,
      epcRating: epcRating || undefined,
      epcExempt,
      epcCertificateUrl: epcCertificate?.url || undefined,
      epcCertificateName: epcCertificate?.name || undefined,
      status: "LIVE" as const,
      verifiedEnquiriesOnly: true
    };
    if (import.meta.env.VITE_SUPABASE_URL) {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) {
        throw new Error("Your session has expired. Please log out and back in, then publish again.");
      }
      const { data, error } = await supabase.from("properties").upsert({
        id: params.get("propertyId") || undefined,
        landlord_id: uid,
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
        receptions: countValue(details.receptions),
        outside_space: [...new Set([...details.outsideTypes, ...specialFeatures])],
        parking: details.parking,
        furnishing: details.furnishing,
        description: details.description,
        floor_level: needsFloor ? (details.floor || null) : null,
        has_lift: floorNeedsLift && details.hasLift ? details.hasLift === "Yes" : null,
        available_from: availableFrom || null,
        compliance: compliancePayload(epcRating, epcExempt, epcCertificate),
        rent_pcm: property.rentPcm,
        status: "live",
        draft_step: steps.length - 1,
        draft_payload: {}
      }).select("id").single();
      if (error) throw new Error(error.message);
      if (data?.id) {
        await supabase.from("property_photos").delete().eq("property_id", data.id);
        if (successfulPhotos.length) await supabase.from("property_photos").insert(successfulPhotos.map((photo, index) => ({ property_id: data.id, public_url: photo.url, storage_path: photo.name, sort_order: index })));
        await supabase.from("floorplans").delete().eq("property_id", data.id);
        if (floorplan?.url) await supabase.from("floorplans").insert({ property_id: data.id, public_url: floorplan.url, storage_path: floorplan.name });
        await supabase.from("property_videos").delete().eq("property_id", data.id);
        if (videoTour || videoUrl.trim()) {
          await supabase.from("property_videos").insert({
            property_id: data.id,
            public_url: videoTour?.url || null,
            storage_path: videoTour?.name || null,
            external_url: videoUrl.trim() || null,
            provider: videoUrl.trim() ? videoProviderName(videoUrl) : "Uploaded video",
            thumbnail_url: successfulPhotos[0]?.url || null
          });
        }
        localStorage.removeItem(`${DRAFT_KEY}.${landlordId}`);
        deletePropertyDraft(draftId);
        navigate(`/properties/${data.id}`);
        return;
      }
    }
    savePublishedProperty(property);
    localStorage.removeItem(`${DRAFT_KEY}.${landlordId}`);
    deletePropertyDraft(draftId);
    navigate(`/properties/${property.id}`);
  }

  return (
    <main className="page">
      {draftPrompt && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="card modal-card form-grid">
            <h2>You already have an unfinished listing</h2>
            <p className="muted">Draft: <b>{draftPrompt.address}</b></p>
            <p className="muted">Continue where you left off, or start a brand-new property.</p>
            <div className="hero-actions">
              <button className="btn primary" type="button" onClick={continueDraft}>Continue Draft</button>
              <button className="btn" type="button" onClick={createNewProperty}>Create New Property</button>
              <button className="btn ghost" type="button" onClick={() => navigate("/landlord/properties")}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <section className="hero compact-hero">
        <p className="badge orange">Create listing</p>
        <h1>List a property through a guided premium flow.</h1>
        <p>Step {step + 1} of {steps.length} — a quick, guided flow, one simple step at a time.</p>
        <div className="progress"><span style={{ width: `${progress}%` }} /></div>
      </section>
      <section className="workflow">
        <aside className="card step-list">
          {steps.map((label, index) => <div key={label} className={`step ${index === step ? "current" : ""}`}>{index + 1}. {label}</div>)}
        </aside>
        <article
          className="card onboarding-panel"
          ref={panelRef}
          onKeyDown={(event) => {
            const tagName = (event.target as HTMLElement).tagName;
            if (event.key !== "Enter" || tagName === "TEXTAREA" || tagName === "BUTTON") return;
            event.preventDefault();
            if (step < steps.length - 1) continueFlow();
            else publishListing();
          }}
        >
          {missing.size > 0 && <p className="notice error">Complete the highlighted fields before continuing. Each item is needed to publish or reactivate the property safely.</p>}
          {step === 0 && (
            <div className="form-grid">
              <h2>Address lookup</h2>
              <p className="form-note">* Required field</p>
              <label className={`autocomplete-wrap ${missing.has("postcode") ? "required-missing" : ""}`}>Postcode *
                <input value={postcode} onChange={(event) => { setPostcode(event.target.value.toUpperCase()); setPostcodeData(null); }} placeholder="W8 1AA" />
                {missing.has("postcode") && <small>Postcode is required so Hilltro can verify location, valuation and address options.</small>}
                {missing.has("postcodeLookup") && <small>Select a valid postcode result before continuing.</small>}
                {postcodeSuggestions.length > 0 && !postcodeData && (
                  <div className="autocomplete-menu">
                    {postcodeSuggestions.map((item) => <button type="button" key={item} onMouseDown={() => choosePostcode(item)}><strong>{item}</strong><span>Postcode</span></button>)}
                  </div>
                )}
              </label>
              {postcodeData && <p className="badge">Valid postcode: {postcodeData.admin_district || postcodeData.region || postcodeData.country}</p>}
              <label className={missing.has("addressLine1") ? "required-missing" : ""}>Address Line 1 *
                <input value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)} placeholder="Flat 5, 21 Well Road" />
                <small>Flat number, building number/name, street. Example: Apartment 12, Hill House, Market Street.</small>
                {missing.has("addressLine1") && <small>Address Line 1 is required for verification.</small>}
              </label>
              <label>Address Line 2 (optional)
                <input value={addressLine2} onChange={(event) => setAddressLine2(event.target.value)} placeholder="Building name, block or floor" />
                <small>Additional address information if applicable. Example: Building name, block, floor.</small>
              </label>
              <label className={missing.has("town") ? "required-missing" : ""}>City/town *<input value={town} onChange={(event) => setTown(event.target.value)} />{missing.has("town") && <small>City or town is required for listing display and valuation guidance.</small>}</label>
              <p className="form-hint"><ShieldCheck size={14} /> Your exact address is never shown publicly.</p>
            </div>
          )}

          {step === 1 && (
            <div className="form-grid">
              <h2>Property type</h2>
              <p className="form-note">* Required field</p>
              <div className={missing.has("propertyType") ? "required-missing" : ""}>
                <SelectField label="Property Type *" value={details.propertyType} onChange={(value) => {
                  const isHouse = houseTypes.includes(value);
                  setDetails({ ...details, propertyType: value, floor: isHouse ? "" : details.floor, hasLift: isHouse ? "" : details.hasLift });
                  if (!isHouse) setSpecialFeatures((current) => current.filter((feature) => feature !== "Lift"));
                }} options={[{ value: "", label: "Select property type" }, ...propertyTypes.map((item) => ({ value: item, label: item }))]} />
                {missing.has("propertyType") && <small>Select the property type.</small>}
              </div>
              {details.propertyType && needsFloor && (
                <div className={missing.has("floor") ? "required-missing" : ""}>
                  <SelectField label="Which floor is it on? *" value={details.floor} onChange={(value) => setDetails({ ...details, floor: value, hasLift: floorLevelNumber(value) >= 2 ? details.hasLift : "" })} options={[{ value: "", label: "Select a floor" }, ...floorOptions.map((item) => ({ value: item, label: item }))]} />
                  {missing.has("floor") && <small>Select which floor the property is on.</small>}
                </div>
              )}
              {floorNeedsLift && (
                <SelectField label="Is there a lift? (optional)" value={details.hasLift} onChange={(value) => setDetails({ ...details, hasLift: value })} options={[{ value: "", label: "Prefer not to say" }, { value: "Yes", label: "Yes" }, { value: "No", label: "No" }]} />
              )}
            </div>
          )}

          {step === 2 && (
            <div className="form-grid">
              <h2>Rooms</h2>
              <p className="form-note">* Required field</p>
              <div className="form-grid two">
                <div className={missing.has("bedrooms") ? "required-missing" : ""}>
                  <SelectField label="Bedrooms *" value={details.bedrooms} onChange={(value) => setDetails({ ...details, bedrooms: value })} options={[{ value: "", label: "Select bedrooms" }, ...bedroomOptions.map((item) => ({ value: item, label: item === "0" ? "0 (Studio)" : item }))]} />
                  {missing.has("bedrooms") && <small>Select the number of bedrooms.</small>}
                </div>
                <div className={missing.has("bathrooms") ? "required-missing" : ""}>
                  <SelectField label="Bathrooms *" value={details.bathrooms} onChange={(value) => setDetails({ ...details, bathrooms: value })} options={[{ value: "", label: "Select bathrooms" }, ...bathroomOptions.map((item) => ({ value: item, label: item === "5+" ? "5+" : item }))]} />
                  {missing.has("bathrooms") && <small>Select the number of bathrooms. Half values include a WC.</small>}
                </div>
                <div className={missing.has("receptions") || missing.has("receptionsBedroomRule") ? "required-missing" : ""}>
                  <SelectField label="Living rooms *" value={details.receptions} onChange={(value) => setDetails({ ...details, receptions: value })} options={[{ value: "", label: "Select living rooms" }, ...receptionOptions.map((item) => ({ value: item, label: item }))]} />
                  {missing.has("receptions") && <small>Select the number of living rooms.</small>}
                  {missing.has("receptionsBedroomRule") && <small>Properties with one or more bedrooms require at least one living room.</small>}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-grid">
              <h2>Features</h2>
              <p className="form-note">* Required field</p>
              <div className="form-grid two">
                <div className={missing.has("furnishing") ? "required-missing" : ""}>
                  <SelectField label="Furnishing *" value={details.furnishing} onChange={(value) => setDetails({ ...details, furnishing: value })} options={[{ value: "", label: "Select furnishing" }, ...furnishingOptions.map((item) => ({ value: item, label: item }))]} />
                  {missing.has("furnishing") && <small>Select the furnishing status.</small>}
                </div>
                <div className={missing.has("parking") ? "required-missing" : ""}>
                  <SelectField label="Parking *" value={details.parking} onChange={(value) => setDetails({ ...details, parking: value })} options={[{ value: "", label: "Select parking" }, ...parkingOptions.map((item) => ({ value: item, label: item }))]} />
                  {missing.has("parking") && <small>Select the parking option.</small>}
                </div>
              </div>
              <div className={missing.has("outsideSpace") ? "required-missing" : ""}>
                <SelectField label="Outside Space *" value={details.outsideSpace} onChange={(value) => setDetails({ ...details, outsideSpace: value, outsideTypes: value === "Yes" ? details.outsideTypes : [] })} options={[{ value: "", label: "Select an option" }, { value: "No", label: "No" }, { value: "Yes", label: "Yes" }]} />
                {missing.has("outsideSpace") && <small>Let applicants know if there is outside space.</small>}
              </div>
              {details.outsideSpace === "Yes" && <div className={missing.has("outsideTypes") ? "required-missing" : ""}><div className="choice-grid">{outsideOptions.map((item) => <button type="button" className={`choice ${details.outsideTypes.includes(item) ? "selected" : ""}`} key={item} onClick={() => toggleOutside(item)}>{item}</button>)}</div>{missing.has("outsideTypes") && <small>Select at least one outside space type so applicants understand the usable amenity.</small>}</div>}
            </div>
          )}

          {step === 4 && (
            <div className="form-grid">
              <h2>Description</h2>
              <p className="form-note">* Required field</p>
              <label className={missing.has("description") ? "required-missing" : ""}>Property Description *<textarea required value={details.description} onChange={(event) => setDetails({ ...details, description: event.target.value })} />{missing.has("description") && <small>A description helps applicants understand condition, layout and tenancy readiness.</small>}</label>
              <button className="btn" type="button" onClick={writeWithAi}>Write With AI</button>
              <section className="compliance-box">
                <div>
                  <h3>Compliance documents</h3>
                  <p className="muted">Providing compliance documentation helps ensure a smoother tenancy experience and may reduce delays during move-in.</p>
                </div>
                <label className="checkbox-row stable-checkbox"><input type="checkbox" checked={noGas} onChange={(event) => setNoGas(event.target.checked)} /> <span>I confirm there is no gas supply at this property.</span></label>
                <div className="compliance-upload-grid">
                  <label className={noGas ? "is-disabled" : ""}>Gas Safety Certificate (optional)<input type="file" disabled={noGas} />{noGas && <small>No gas supply confirmed.</small>}</label>
                  <label>EICR (optional)<input type="file" /></label>
                </div>
                <div className={`epc-fieldset ${missing.has("epc") || missing.has("epcExempt") ? "required-missing" : ""}`}>
                  <div>
                    <h3>EPC</h3>
                    <p className="muted">Upload the EPC certificate or select the rating only.</p>
                  </div>
                  <label>Upload EPC certificate<input type="file" accept="image/*,.pdf" onChange={(event) => event.target.files && addEpcCertificate(event.target.files)} /></label>
                  {epcCertificate && <article className={`photo-preview single-media-preview ${epcCertificate.error ? "has-error" : ""}`}>{epcCertificate.url ? <a className="btn secondary" href={epcCertificate.url} target="_blank" rel="noopener noreferrer">View EPC</a> : <div className="photo-uploading">{epcCertificate.error ? "Upload failed" : "Uploading..."}</div>}<b>{epcCertificate.name}</b>{epcCertificate.progress < 100 && !epcCertificate.error && <div className="upload-progress"><span style={{ width: `${epcCertificate.progress}%` }} /></div>}<button className="btn" type="button" onClick={() => setEpcCertificate(null)}>Remove EPC</button></article>}
                  <SelectField label="EPC rating" value={epcRating} onChange={(value) => { setEpcRating(value); if (value !== "F" && value !== "G") setEpcExempt(false); }} options={[{ value: "", label: "Select EPC rating" }, ...epcRatings.map((item) => ({ value: item, label: item }))]} />
                  {missing.has("epc") && <small>Upload an EPC certificate or select an EPC rating.</small>}
                  {epcNeedsExemption && <p className="notice error">Properties with an EPC rating below E generally cannot be let unless an exemption applies.</p>}
                  {epcNeedsExemption && <label className="checkbox-row"><input type="checkbox" checked={epcExempt} onChange={(event) => setEpcExempt(event.target.checked)} /> <span>I declare that this property has a valid EPC exemption.</span></label>}
                  {missing.has("epcExempt") && <small>An EPC exemption declaration is required for F or G ratings.</small>}
                  {epcError && <p className="notice error">{epcError}</p>}
                </div>
              </section>
            </div>
          )}

          {step === 5 && (
            <div className="form-grid">
              <h2>Special Features</h2>
              <p className="muted">Optional. Select the details that make this home stand out.</p>
              <div className="feature-choice-grid">
                {specialFeatureOptions.filter((feature) => feature !== "Lift" || houseTypes.includes(details.propertyType)).map((feature) => <button type="button" className={`feature-choice ${specialFeatures.includes(feature) ? "selected" : ""}`} key={feature} onClick={() => toggleSpecialFeature(feature)}>{feature}</button>)}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="form-grid">
              <h2>Availability</h2>
              <p className="form-note">* Required field</p>
              <p className="muted">When is the property available for a tenant to move in?</p>
              <div className={missing.has("availableFrom") ? "required-missing" : ""}>
                <CalendarField label="Available from *" value={availableFrom} onChange={setAvailableFrom} min={new Date().toISOString().slice(0, 10)} required />
                {missing.has("availableFrom") && <small>Choose the date the property becomes available.</small>}
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="valuation-card">
              <span className="badge orange">Rental valuation</span>
              <h2>Recommended Monthly Rent</h2>
              <p>Based on similar properties in your area we estimate a monthly rent of <b>£{recommendedRent.toLocaleString("en-GB")}</b>.</p>
              <div className={`valuation-rent ${missing.has("rent") ? "required-missing" : ""}`}>
                <label htmlFor="valuation-rent-input">Your monthly rent *</label>
                <div className="rent-input-group">
                <input id="valuation-rent-input" type="number" inputMode="decimal" min="0" step="0.01" value={rent} onChange={(event) => setRent(event.target.value)} placeholder={String(recommendedRent)} />
                  <button type="button" className="btn primary rent-estimate-btn" onClick={() => setRent(String(recommendedRent))}>Use Hilltro estimate</button>
                </div>
                {missing.has("rent") && <small>Enter a valid monthly rent with up to two decimal places, or use the Hilltro recommendation.</small>}
              </div>
            </div>
          )}

          {step === 8 && <div className="form-grid"><h2>Photos</h2><div className={`dropzone photo-drop ${dragging ? "dragging" : ""} ${missing.has("photos") ? "required-missing" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}><div><b>Drag photos here or click to upload</b><p className="muted">Upload at least four images where possible: main image, bedroom, kitchen/bathroom/exterior and another supporting angle.</p>{missing.has("photos") && <small>Upload at least one photo before activation.</small>}</div><input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(event) => event.target.files && addFiles(event.target.files)} /></div><div className="photo-preview-grid">{photos.map((photo, index) => <article className={`photo-preview ${photo.error ? "has-error" : ""}`} key={photo.id}>{photo.url ? <img src={photo.url} alt="" /> : <div className="photo-uploading">{photo.error ? "Upload failed" : "Uploading…"}</div>}<b>{index + 1}. {photo.name}</b>{!photo.error && photo.progress < 100 && <div className="upload-progress"><span style={{ width: `${photo.progress}%` }} /></div>}{photo.error && <small className="photo-error-text">{photo.errorMessage || "Upload failed — use Replace to try again."}</small>}<div className="hero-actions"><button className="btn" onClick={() => reorderPhoto(index, -1)}>Up</button><button className="btn" onClick={() => reorderPhoto(index, 1)}>Down</button><button className="btn" onClick={() => replacePhoto(index)}>Replace</button><button className="btn" onClick={() => setPhotos(photos.filter((item) => item.id !== photo.id))}>Remove</button></div></article>)}</div><Link className="btn" to="/photography">Don't have professional photos? Book Photography with Hilltro</Link></div>}
          {step === 9 && <div className="form-grid"><h2>Upload Floorplan</h2><p className="muted">Optional but encouraged. The floorplan appears as the final gallery image.</p><div className="dropzone photo-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFloorplan(event.dataTransfer.files); }} onClick={() => document.getElementById("floorplan-upload")?.click()}><div><b>Drag floorplan here or click to upload</b><p className="muted">Image or PDF accepted. You can replace it later.</p></div><input id="floorplan-upload" type="file" accept="image/*,.pdf" hidden onChange={(event) => event.target.files && addFloorplan(event.target.files)} /></div>{floorplan && <article className="photo-preview single-media-preview"><img src={floorplan.url} alt="" /><b>{floorplan.name}</b><div className="upload-progress"><span style={{ width: `${floorplan.progress}%` }} /></div><button className="btn" type="button" onClick={() => setFloorplan(null)}>Remove floorplan</button></article>}</div>}
          {step === 10 && <div className="form-grid"><h2>Upload Property Video</h2><p className="muted">Properties with video tours typically let faster. Upload a short vertical walkthrough or provide a supported video link.</p><div className="dropzone photo-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addVideo(event.dataTransfer.files); }} onClick={() => document.getElementById("video-upload")?.click()}><div><b>Drag video here or click to upload</b><p className="muted">Maximum upload size 200MB. YouTube, Vimeo and reputable hosted links are supported.</p></div><input id="video-upload" type="file" accept="video/*" hidden onChange={(event) => event.target.files && addVideo(event.target.files)} /></div><label className={missing.has("videoUrl") ? "required-missing" : ""}>External video link (optional)<input value={videoUrl} onChange={(event) => updateVideoUrl(event.target.value)} placeholder="https://youtu.be/..." />{(videoError || missing.has("videoUrl")) && <small>{videoError || "Use a supported video URL before continuing."}</small>}</label>{videoTour && <article className="photo-preview single-media-preview"><video src={videoTour.url} controls /><b>{videoTour.name}</b><div className="upload-progress"><span style={{ width: `${videoTour.progress}%` }} /></div><button className="btn" type="button" onClick={() => setVideoTour(null)}>Remove video</button></article>}</div>}
          {step === 11 && <div className="listing-preview-panel"><div><h2>Preview listing</h2><p className="muted">Review photos, address privacy, rental price, description and property summary before publishing.</p></div><section className="listing-preview-summary"><div><span className="label">Display address</span><b>{[addressLine1, town].filter(Boolean).join(", ") || "Address pending"}</b></div><div><span className="label">Monthly rent</span><b>{formatRentPcm(Number(rent || recommendedRent))}</b></div><div><span className="label">Deposit</span><b>{depositDisplay(Number(rent || recommendedRent), details.propertyType).replace("Deposit: ", "")}</b></div><div><span className="label">Property</span><b>{details.bedrooms} bed · {details.propertyType}{needsFloor && details.floor ? ` · ${details.floor}` : ""}{floorNeedsLift && details.hasLift ? ` · ${details.hasLift === "Yes" ? "Lift" : "No lift"}` : ""}</b></div>{availableFrom && <div><span className="label">Available</span><b>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(availableFrom))}</b></div>}</section><div className="hero-actions preview-badges">{floorplan && <p className="badge">Floorplan attached</p>}{(videoUrl || videoTour) && <p className="badge orange">Video tour attached</p>}{epcCertificate?.url ? <p className="badge">EPC document attached</p> : epcRating && <p className="badge">EPC {epcRating}</p>}</div>{specialFeatures.length > 0 && <div className="feature-pill-grid compact">{specialFeatures.map((feature) => <span className="feature-pill" key={feature}>{feature}</span>)}</div>}{photos.filter((photo) => photo.url).length > 0 ? <div className="photo-preview-grid preview-photo-grid">{photos.filter((photo) => photo.url).map((photo) => <article className="photo-preview" key={photo.id}><img src={photo.url} alt="" /></article>)}</div> : <p className="notice error">No photos added yet — go back to the Photos step and add at least one.</p>}{publishError && <p className="notice error">{publishError}</p>}<button className="btn primary" disabled={publishing} onClick={publishListing}>{publishing ? "Publishing..." : "Publish Listing"}</button></div>}
          <div className="hero-actions" style={{ marginTop: 24 }}>
            <button className="btn" disabled={step === 0} onClick={() => { setMissing(new Set()); setStep(step - 1); }}>Back</button>
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
  const bedrooms = bedroomCount(details.bedrooms || "1");
  const typeBoost = details.propertyType.includes("Detached") ? 650 : details.propertyType === "Penthouse" ? 900 : details.propertyType.includes("House") ? 420 : details.propertyType === "Maisonette" ? 240 : 0;
  const amenityBoost = (bathroomCount(details.bathrooms || "1") - 1) * 180 + (details.outsideSpace === "Yes" ? 180 : 0) + (details.parking === "No Parking" ? 0 : 160);
  return Math.round((cityBase + bedrooms * 430 + typeBoost + amenityBoost) / 25) * 25;
}

function bedroomCount(value: string) {
  if (value === "Studio" || value === "0") return 0;
  if (value === "5+") return 5;
  return Number(value || 0);
}

function bathroomCount(value: string) {
  if (value === "5+") return 5;
  return Number(value || 0);
}

function countValue(value: string) {
  if (value === "5+") return 5;
  return Number(value || 0);
}

function compliancePayload(epcRating: string, epcExempt: boolean, epcCertificate: UploadedPhoto | null) {
  return {
    epcRating: epcRating || null,
    epcExempt,
    epcCertificateUrl: epcCertificate?.url || null,
    epcCertificateName: epcCertificate?.name || null
  };
}
