import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BadgeCheck, Check, Pencil, ShieldCheck, IdCard, ScanFace, Smartphone, AlertCircle } from "lucide-react";
import type { User } from "../../types/domain";
import { supabase } from "../../utils/supabase";
import { sanitizeName, nameError, isValidUKPostcode } from "../../utils/validation";
import { DateOfBirthField, isAtLeast18 } from "../../components/DateOfBirthField";
import { SelectField } from "../../components/SelectField";
import {
  getIdentityVerification, startIdentityVerification, subscribeIdentityVerification,
  getReferencingApplication, saveReferencingApplication, totalHistoryMonths,
  type IdentityStatus, type IdentityVerification, type ReferencingAddress,
} from "../../services/identityService";

type Step = "details" | "address" | "identity";
const STEP_ORDER: Step[] = ["details", "address", "identity"];
const STEP_LABELS: Record<Step, string> = { details: "Personal details", address: "Address history", identity: "Identity verification" };
const DURATIONS = [{ value: "6", label: "6 months" }, { value: "12", label: "12 months" }, { value: "24", label: "24 months" }, { value: "36", label: "36+ months" }];
const REQUIRED_MONTHS = 36;

function emptyAddress(): ReferencingAddress {
  return { line1: "", line2: "", postcode: "", country: "United Kingdom", international: false };
}

function identityMeta(status: IdentityStatus): { label: string; tone: "grey" | "amber" | "green" | "red" } {
  switch (status) {
    case "approved": return { label: "Verified", tone: "green" };
    case "review": return { label: "Under Review", tone: "amber" };
    case "declined": return { label: "Failed", tone: "red" };
    case "in_progress": return { label: "In Progress", tone: "amber" };
    default: return { label: "Pending", tone: "grey" };
  }
}

export function ReferencingPage({ user, onUserChange }: { user: User; onUserChange: (user: User | null) => void }) {
  const [params, setParams] = useSearchParams();
  const returning = params.get("identity") === "return";

  const [identity, setIdentity] = useState<IdentityVerification>({ status: "none", diditSessionId: null, sessionUrl: null, reviewedAt: null, updatedAt: null });
  const [step, setStep] = useState<Step>(returning ? "identity" : "details");
  const [loaded, setLoaded] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [middleName, setMiddleName] = useState(user.middleName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [dob, setDob] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState("");

  const [addresses, setAddresses] = useState<ReferencingAddress[]>([emptyAddress()]);
  const [idBusy, setIdBusy] = useState(false);
  const [idError, setIdError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([getIdentityVerification(), getReferencingApplication()]).then(([iv, app]) => {
      if (!alive) return;
      setIdentity(iv);
      if (app) {
        setDob(app.dateOfBirth || "");
        if (app.addresses?.length) setAddresses(app.addresses);
      }
      setLoaded(true);
    });
    const unsub = subscribeIdentityVerification(user.id, (iv) => setIdentity(iv));
    return () => { alive = false; unsub(); };
  }, [user.id]);

  const dobError = Boolean(dob) && !isAtLeast18(dob);
  const meta = identityMeta(identity.status);

  const current = addresses[0];
  const bypass = Boolean(current?.international);
  const totalMonths = totalHistoryMonths(addresses);
  const needsMore = !bypass && totalMonths < REQUIRED_MONTHS;

  useEffect(() => {
    if (!loaded || !needsMore) return;
    const last = addresses[addresses.length - 1];
    const lastUsable = addresses.length === 1
      ? Boolean(current?.durationMonths)
      : Boolean(last?.line1?.trim() && (last?.international || last?.moveIn));
    if (lastUsable) setAddresses((prev) => [...prev, emptyAddress()]);
  }, [loaded, needsMore, addresses, current]);

  const detailsComplete = Boolean(firstName.trim() && lastName.trim() && dob && !dobError);
  const addressComplete = useMemo(() => {
    if (!current?.line1.trim()) return false;
    if (current.international) return true;
    if (!isValidUKPostcode(current.postcode || "")) return false;
    if (!current.durationMonths) return false;
    if (totalMonths < REQUIRED_MONTHS) return false;
    return addresses.slice(1).every((a) => a.international ? a.line1.trim() : (a.line1.trim() && a.moveIn));
  }, [addresses, current, totalMonths]);
  const identityComplete = identity.status === "approved";

  const completeMap: Record<Step, boolean> = { details: detailsComplete, address: addressComplete, identity: identityComplete };
  const referencingStarted = identity.status !== "none" || Boolean(dob) || addresses.some((a) => a.line1.trim());
  const canVerify = detailsComplete && addressComplete;

  function persist(status?: string) {
    saveReferencingApplication(user.id, { dateOfBirth: dob || null, addresses, status }).catch(() => { /* non-fatal */ });
  }

  async function saveName() {
    const fn = sanitizeName(firstName), mn = sanitizeName(middleName), ln = sanitizeName(lastName);
    if (nameError(fn, "first name") || nameError(ln, "last name")) { setNameMsg("Enter your name as it appears on your passport."); return; }
    setNameBusy(true); setNameMsg("");
    const full = [fn, mn, ln].filter(Boolean).join(" ");
    try {
      const { error } = await supabase.from("profiles").update({ first_name: fn, middle_name: mn || null, last_name: ln, name: full }).eq("id", user.id);
      if (error) throw error;
      await supabase.auth.updateUser({ data: { first_name: fn, middle_name: mn || null, last_name: ln, name: full } });
      onUserChange({ ...user, firstName: fn, middleName: mn, lastName: ln, name: full });
      setEditingName(false);
    } catch {
      setNameMsg("We couldn't update your name. Please try again.");
    } finally {
      setNameBusy(false);
    }
  }

  function updateAddress(index: number, patch: Partial<ReferencingAddress>) {
    setAddresses((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  // Resume an already-created session (e.g. user started then navigated back)
  // by reusing its Didit URL — this avoids spending another monthly check.
  function resumeVerification() {
    setIdError("");
    if (identity.sessionUrl) { setIdBusy(true); window.location.href = identity.sessionUrl; return; }
    launchIdentity();
  }

  async function launchIdentity() {
    setIdError("");
    if (!canVerify) { setIdError("Please complete the highlighted steps first."); return; }
    setIdBusy(true);
    try {
      persist("in_progress");
      const callback = `${window.location.origin}${window.location.pathname}?identity=return`;
      const { url } = await startIdentityVerification(callback);
      window.location.href = url;
    } catch (e) {
      setIdError(e instanceof Error ? e.message : "Could not start verification.");
      setIdBusy(false);
    }
  }

  function goTo(next: Step) {
    if (step === "details") persist();
    if (step === "address") persist();
    setStep(next);
  }

  return (
    <main className="page">
      <section className="hero compact-hero">
        <p className="badge orange">Referencing</p>
        <h1>Let's confirm a few details.</h1>
        <p>Complete referencing once and reuse it across Hilltro. Your information is kept private.</p>
      </section>

      <aside className="ref-mobile-hint" role="note">
        <span className="ref-mobile-hint-icon"><Smartphone size={18} /></span>
        <p><b>A mobile device is recommended.</b></p>
      </aside>

      <section className="workflow ref-workflow">
        {/* LEFT — clickable step tabs with completion / needs-attention state */}
        <aside className="step-list ref-step-list" aria-label="Referencing steps">
          {STEP_ORDER.map((s, i) => {
            const isCurrent = step === s;
            const done = completeMap[s];
            const attention = !done && STEP_ORDER.indexOf(step) > i; // skipped a required earlier step
            return (
              <button key={s} type="button" className={`step ref-step-item ${isCurrent ? "current" : ""} ${done ? "done" : ""} ${attention ? "attention" : ""}`} onClick={() => setStep(s)}>
                <span className="ref-step-index">{done ? <Check size={14} /> : attention ? <AlertCircle size={14} /> : i + 1}</span>
                <span className="ref-step-text"><b>{STEP_LABELS[s]}</b><small>{done ? "Complete" : attention ? "Needs attention" : isCurrent ? "In progress" : "Not started"}</small></span>
              </button>
            );
          })}

          <div className="ref-status-aside">
            <StatusRow label="Identity" chip={meta.label} tone={meta.tone} />
            <StatusRow label="Affordability" chip="Pending" tone="grey" />
            <StatusRow label="Credit" chip="Pending" tone="grey" />
            <StatusRow label="Referencing" chip={referencingStarted ? "In Progress" : "Not Started"} tone={referencingStarted ? "amber" : "grey"} />
          </div>
        </aside>

        {/* MIDDLE — the active step */}
        <article className="card ref-flow">
          {step === "details" && (
            <div className="form-grid">
              <h2>Personal details</h2>
              {!editingName ? (
                <div className="ref-name-display">
                  <div>
                    <b>{[user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ") || "Add your name"}</b>
                    <small className="field-subhint">As it appears on your passport.</small>
                  </div>
                  <button type="button" className="btn" onClick={() => { setFirstName(user.firstName); setMiddleName(user.middleName || ""); setLastName(user.lastName); setEditingName(true); }}><Pencil size={15} /> Edit</button>
                </div>
              ) : (
                <div className="form-grid">
                  <div className="form-grid two">
                    <label>First name *<input value={firstName} onChange={(e) => setFirstName(sanitizeName(e.target.value))} /></label>
                    <label>Middle name (optional)<input value={middleName} onChange={(e) => setMiddleName(sanitizeName(e.target.value))} /></label>
                  </div>
                  <label>Last name *<input value={lastName} onChange={(e) => setLastName(sanitizeName(e.target.value))} /></label>
                  <p className="field-subhint">As it appears on your passport.</p>
                  <div className="hero-actions">
                    <button type="button" className="btn primary" disabled={nameBusy} onClick={saveName}>{nameBusy ? "Saving…" : "Save name"}</button>
                    <button type="button" className="btn" disabled={nameBusy} onClick={() => { setEditingName(false); setNameMsg(""); }}>Cancel</button>
                  </div>
                  {nameMsg && <p className="notice error">{nameMsg}</p>}
                </div>
              )}

              <DateOfBirthField value={dob} onChange={setDob} />
              {dobError && <p className="notice error">You must be at least 18 years old to use Hilltro.</p>}

              <div className="hero-actions ref-flow-actions">
                <button type="button" className="btn primary" disabled={!detailsComplete} onClick={() => goTo("address")}>Continue</button>
              </div>
            </div>
          )}

          {step === "address" && (
            <div className="form-grid">
              <h2>Address history</h2>
              <p className="field-subhint">We need three years of address history. Your information is safe.</p>

              <AddressBlock title="Current address" address={current} onChange={(p) => updateAddress(0, p)} isCurrent />
              {!bypass && (
                <label className="ref-duration">How long have you lived here? *
                  <select value={current?.durationMonths || ""} onChange={(e) => updateAddress(0, { durationMonths: Number(e.target.value) })}>
                    <option value="" disabled>Select</option>
                    {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </label>
              )}
              {!bypass && needsMore && (
                <p className="notice">We need {REQUIRED_MONTHS - totalMonths} more month{REQUIRED_MONTHS - totalMonths === 1 ? "" : "s"} — please add your previous address.</p>
              )}
              {addresses.slice(1).map((addr, i) => (
                <AddressBlock key={i + 1} title={`Previous address ${i + 1}`} address={addr} onChange={(p) => updateAddress(i + 1, p)} withDates />
              ))}

              <div className="hero-actions ref-flow-actions">
                <button type="button" className="btn" onClick={() => goTo("details")}>Back</button>
                <button type="button" className="btn primary" disabled={!addressComplete} onClick={() => goTo("identity")}>Continue</button>
              </div>
            </div>
          )}

          {step === "identity" && (
            <div className="ref-identity-screen">
              {!canVerify && identity.status === "none" ? (
                <div className="ref-gap-note">
                  <AlertCircle size={20} />
                  <div>
                    <b>A couple of steps need finishing first</b>
                    <p className="muted">Complete {[!detailsComplete && "Personal details", !addressComplete && "Address history"].filter(Boolean).join(" and ")} before verifying your identity.</p>
                  </div>
                </div>
              ) : identity.status === "approved" ? (
                <div className="ref-identity-result green"><BadgeCheck size={40} /><h2>Identity verified</h2><p className="muted">Thank you — your identity has been confirmed.</p></div>
              ) : identity.status === "review" ? (
                <div className="ref-identity-result amber"><ShieldCheck size={40} /><h2>We're reviewing your documents</h2><p className="muted">This updates automatically — no need to refresh.</p></div>
              ) : identity.status === "declined" ? (
                <div className="ref-identity-result red"><ShieldCheck size={40} /><h2>We couldn't verify your identity</h2><p className="muted">Something didn't match. Try again with a clear photo of your document.</p><button type="button" className="btn primary" disabled={idBusy} onClick={launchIdentity}>{idBusy ? "Starting…" : "Try again"}</button></div>
              ) : returning && (identity.status === "pending" || identity.status === "in_progress") ? (
                <div className="ref-identity-result amber">
                  <ShieldCheck size={40} />
                  <h2>Verification in progress</h2>
                  <p className="muted">We're checking your documents — this page updates automatically when it's done.</p>
                  <button type="button" className="btn" disabled={idBusy} onClick={resumeVerification}>{idBusy ? "Opening…" : "Didn't finish? Continue verification"}</button>
                </div>
              ) : identity.status === "pending" || identity.status === "in_progress" ? (
                <div className="ref-identity-result">
                  <span className="ref-identity-badge"><ScanFace size={22} /></span>
                  <h2>Continue your verification</h2>
                  <p className="muted">You started identity verification but haven't finished yet. Pick up where you left off.</p>
                  <div className="hero-actions ref-flow-actions">
                    <button type="button" className="btn" onClick={() => setStep("address")}>Back</button>
                    <button type="button" className="btn primary" disabled={idBusy} onClick={resumeVerification}>{idBusy ? "Opening…" : "Continue verification"}</button>
                  </div>
                </div>
              ) : (
                <div className="form-grid">
                  <div className="ref-identity-intro">
                    <span className="ref-identity-badge"><ScanFace size={22} /></span>
                    <h2>Verify your identity</h2>
                    <p className="muted">Upload a valid document and take a quick selfie. It only takes a minute.</p>
                  </div>
                  <ul className="id-doc-list">
                    <li><IdCard size={18} /> Passport</li>
                    <li><IdCard size={18} /> Driving Licence</li>
                    <li><IdCard size={18} /> National ID Card</li>
                  </ul>
                  <p className="ref-identity-reassure"><ShieldCheck size={16} /> Identity checks help protect landlords and tenants across Hilltro.</p>
                  <div className="hero-actions ref-flow-actions">
                    <button type="button" className="btn" onClick={() => setStep("address")}>Back</button>
                    <button type="button" className="btn primary" disabled={idBusy || !canVerify} onClick={launchIdentity}>{idBusy ? "Starting…" : "Start verification"}</button>
                  </div>
                </div>
              )}
              {idError && <p className="notice error">{idError}</p>}
              {returning && <button type="button" className="link-button ref-clear-return" onClick={() => setParams({})}>Back to referencing</button>}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

function StatusRow({ label, chip, tone }: { label: string; chip: string; tone: "grey" | "amber" | "green" | "red" }) {
  return (
    <div className="ref-status-row">
      <span>{label}</span>
      <span className={`status-chip ${tone}`}>{tone === "green" && <Check size={12} />} {chip}</span>
    </div>
  );
}

function AddressBlock({ title, address, onChange, isCurrent, withDates }: {
  title: string;
  address: ReferencingAddress | undefined;
  onChange: (patch: Partial<ReferencingAddress>) => void;
  isCurrent?: boolean;
  withDates?: boolean;
}) {
  const a = address || emptyAddress();
  const postcodeInvalid = isCurrent && !a.international && Boolean(a.postcode) && !isValidUKPostcode(a.postcode || "");
  return (
    <div className="address-block">
      <h3>{title}</h3>
      <label>Address Line 1 *<input value={a.line1} onChange={(e) => onChange({ line1: e.target.value })} /></label>
      <label>Address Line 2 (optional)<input value={a.line2 || ""} onChange={(e) => onChange({ line2: e.target.value })} /></label>
      <div className="form-grid two">
        {!a.international && (
          <label className={postcodeInvalid ? "required-missing" : ""}>Postcode {isCurrent ? "*" : ""}<input value={a.postcode || ""} onChange={(e) => onChange({ postcode: e.target.value })} />{postcodeInvalid && <small>Enter a valid UK postcode.</small>}</label>
        )}
        <label>Country<input value={a.country} onChange={(e) => onChange({ country: e.target.value })} /></label>
      </div>
      {withDates && (
        <div className="form-grid two">
          <label>Move in date *<input type="date" value={a.moveIn || ""} onChange={(e) => onChange({ moveIn: e.target.value })} /></label>
          <label>Move out date<input type="date" value={a.moveOut || ""} onChange={(e) => onChange({ moveOut: e.target.value })} /></label>
        </div>
      )}
      <label className="intl-check"><input type="checkbox" checked={a.international} onChange={(e) => onChange({ international: e.target.checked, postcode: e.target.checked ? "" : a.postcode })} /> This address is outside the United Kingdom</label>
    </div>
  );
}
