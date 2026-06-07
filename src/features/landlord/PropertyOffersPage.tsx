import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CalendarField } from "../../components/CalendarField";
import { HilltroAvatar } from "../../components/HilltroAvatar";
import { applicantOffers, interestEvents, managedProperties, type ApplicantOffer } from "../../data/landlordProperties";

type Deal = { applicant: string; rent: number; moveDate: string; status: string; referencing: string; nextSteps: string };

export function PropertyOffersPage() {
  const { propertyId } = useParams();
  const [params, setParams] = useSearchParams();
  const property = managedProperties.find((item) => item.id === propertyId) || managedProperties[0];
  const offers = applicantOffers.filter((offer) => offer.propertyId === property.id);
  const [expanded, setExpanded] = useState(params.get("offer") || offers[0]?.id || "");
  const [expiredModal, setExpiredModal] = useState<ApplicantOffer | null>(null);
  const [declined, setDeclined] = useState<Set<string>>(new Set());
  const [deal, setDeal] = useState<Deal | null>(null);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [counterOffer, setCounterOffer] = useState<ApplicantOffer | null>(null);
  const tab = params.get("tab") || "offers";

  function changeTab(value: string) {
    setParams({ tab: value });
  }

  function acceptOffer(offer: ApplicantOffer) {
    if (new Date(offer.expiresAt).getTime() <= Date.now() || offer.status === "Expired") {
      setExpiredModal(offer);
      return;
    }
    setDeal({ applicant: offer.applicantName, rent: offer.offerAmount, moveDate: offer.moveInDate, status: "Active Deal", referencing: offer.referencingStatus, nextSteps: "Prepare APT, collect deposit and confirm possession checklist." });
    setCelebrationOpen(true);
    setDeclined(new Set(offers.filter((item) => item.id !== offer.id).map((item) => item.id)));
    changeTab("deals");
  }

  function submitCounter(input: { rent: number; moveDate: string; notes: string }) {
    if (!counterOffer) return;
    setDeal({ applicant: counterOffer.applicantName, rent: input.rent, moveDate: input.moveDate, status: "Counter Accepted", referencing: counterOffer.referencingStatus, nextSteps: "Tenant accepted the counter offer. Proceed to APT and deposit collection." });
    setCelebrationOpen(true);
    setDeclined(new Set(offers.filter((item) => item.id !== counterOffer.id).map((item) => item.id)));
    setCounterOffer(null);
    changeTab("deals");
  }

  return (
    <main className="page">
      <section className="offer-property-header card">
        <img src={property.imageUrl} alt="" />
        <div>
          <span className="status-pill live">Live</span>
          <h1>{property.address}</h1>
          <p className="muted">£{property.rentPcm.toLocaleString("en-GB")} pcm · {property.type} · {property.bedrooms} bed</p>
        </div>
        <div className="offer-header-metrics">
          <span><b>{offers.length}</b> active offers</span>
          <span>Only one active deal may exist per property.</span>
          <Link to="/landlord/properties" className="btn">Back to My Properties</Link>
        </div>
      </section>

      <section className="offer-tabs buttons">
        <button className={tab === "offers" ? "active" : ""} onClick={() => changeTab("offers")}>Offers <b>{offers.length}</b></button>
        <button className={tab === "interest" ? "active" : ""} onClick={() => changeTab("interest")}>Interest <b>{interestEvents.filter((item) => item.propertyId === property.id).length}</b></button>
        <button className={tab === "deals" ? "active" : ""} onClick={() => changeTab("deals")}>Deals <b>{deal ? 1 : 0}</b></button>
      </section>

      {tab === "offers" && (
        <section className="offers-layout">
          <div className="offer-stack">
            {offers.map((offer) => (
              <ApplicantCard key={offer.id} offer={offer} propertyRent={property.rentPcm} expanded={expanded === offer.id} declined={declined.has(offer.id)} dealActive={Boolean(deal)} onToggle={() => setExpanded(expanded === offer.id ? "" : offer.id)} onAccept={() => acceptOffer(offer)} onCounter={() => setCounterOffer(offer)} />
            ))}
          </div>
          <aside className="card offer-aside">
            <p><b>Acceptance rules</b></p>
            <p className="muted">Accepting an offer creates the deal, marks the accepted offer successful, declines all other offers and notifies affected applicants. The database model should enforce one active deal per property with a unique property deal record.</p>
            <Countdown expiresAt={offers[0]?.expiresAt} large />
            <button className="btn" onClick={() => setDeclined(new Set(offers.map((offer) => offer.id)))}>Decline All</button>
            <button className="btn primary" onClick={() => changeTab("interest")}>Go to Interest</button>
          </aside>
        </section>
      )}

      {tab === "interest" && <InterestTab propertyId={property.id} />}
      {tab === "deals" && <DealsTab deal={deal} onReviewOffers={() => changeTab("offers")} />}

      {counterOffer && <CounterOfferModal offer={counterOffer} advertisedRent={property.rentPcm} onClose={() => setCounterOffer(null)} onSubmit={submitCounter} />}
      {celebrationOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="card modal-card success-celebration">
            <div className="confetti-field" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <span key={index} />)}</div>
            <span className="badge orange">Deal created</span>
            <h2>New Tenant Secured!</h2>
            <p className="muted">The accepted offer has moved into Deals. You can now progress APT, deposit and possession steps.</p>
            <button className="btn primary" type="button" onClick={() => setCelebrationOpen(false)}>Continue</button>
          </div>
        </div>
      )}
      {expiredModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="card modal-card">
            <h2>This offer has expired.</h2>
            <p className="muted">Please ask the applicant to submit a new offer before accepting.</p>
            <div className="hero-actions"><button className="btn primary" onClick={() => setExpiredModal(null)}>Close</button><Link className="btn" to="/messages">Message applicant</Link></div>
          </div>
        </div>
      )}
    </main>
  );
}

function ApplicantCard({ offer, propertyRent, expanded, declined, dealActive, onToggle, onAccept, onCounter }: { offer: ApplicantOffer; propertyRent: number; expanded: boolean; declined: boolean; dealActive: boolean; onToggle: () => void; onAccept: () => void; onCounter: () => void }) {
  return (
    <article className={`applicant-card card ${expanded ? "expanded" : ""}`}>
      <button className="applicant-summary expandable" onClick={onToggle}>
        <HilltroAvatar name={offer.applicantName} />
        <div><h2>{offer.applicantName}</h2><p className="muted">{offer.employmentSector}</p></div>
        <div><span className="label">Offer</span><b>£{offer.offerAmount.toLocaleString("en-GB")}</b></div>
        <div><span className="label">Move-in</span><b>{formatDate(offer.moveInDate)}</b></div>
        <div><span className="label">Risk</span><b>{offer.riskGrade}</b></div>
        <div><span className="label">Affordability</span><b>Up to £{offer.affordabilityPcm.toLocaleString("en-GB")} pcm</b></div>
        <span className={`status-pill ${declined ? "inactive" : offer.verificationStatus === "Verified" ? "live" : "draft"}`}>{declined ? "Declined" : offer.verificationStatus}</span>
        <span className={`expand-icon ${expanded ? "open" : ""}`}>⌄</span>
      </button>
      <div className="risk-meter" aria-label={`Risk grade ${offer.riskGrade}`}><span style={{ width: offer.riskGrade === "A" ? "82%" : offer.riskGrade === "B" ? "62%" : "38%" }} /></div>
      <div className="applicant-actions">
        <button className="btn primary" onClick={onAccept} disabled={declined || dealActive}>{dealActive && !declined ? "Deal Exists" : "Accept Offer"}</button>
        <button className="btn" onClick={onCounter} disabled={declined || dealActive}>Counter Offer</button>
        <Link className="btn" to="/messages">Contact Applicant</Link>
        <Countdown expiresAt={offer.expiresAt} />
        <button className="link-button">Extend Offer Window</button>
      </div>
      {expanded && <div className="applicant-detail"><Detail title="Employment Sector" value={offer.employmentSector} /><Detail title="Affordability Assessment" value={offer.affordabilityAssessment} /><Detail title="Referencing Status" value={offer.referencingStatus} /><Detail title="Address History Summary" value={offer.addressHistorySummary} /><Detail title="Offer Notes" value={offer.offerNotes} /><Detail title="Move Date" value={formatDate(offer.moveInDate)} /><Detail title="Viewing History" value={offer.viewingHistory} /><Detail title="Referencing Summary" value={offer.tenantPassportSummary} /><Detail title="Counter Offer Rule" value={propertyRent < 8333 ? "Counter rent cannot exceed advertised rent for this property." : "High-value exception applies; counter rent may exceed asking rent."} /></div>}
    </article>
  );
}

function CounterOfferModal({ offer, advertisedRent, onClose, onSubmit }: { offer: ApplicantOffer; advertisedRent: number; onClose: () => void; onSubmit: (input: { rent: number; moveDate: string; notes: string }) => void }) {
  const [rent, setRent] = useState(offer.offerAmount);
  const [moveDate, setMoveDate] = useState(offer.moveInDate);
  const [notes, setNotes] = useState("");
  const overLimit = advertisedRent < 8333 && rent > advertisedRent;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="card modal-card form-grid" onSubmit={(event) => { event.preventDefault(); if (!overLimit) onSubmit({ rent, moveDate, notes }); }} noValidate>
        <h2>Counter Offer</h2>
        <p className="muted">Adjust rent, move-in date and notes before sending to {offer.applicantName}.</p>
        <p className="form-note">* Required field</p>
        <CalendarField label="Proposed Move-In Date *" value={moveDate} onChange={setMoveDate} required />
        <label className={overLimit ? "required-missing" : ""}>Proposed Rent *<input type="number" required value={rent} onChange={(event) => setRent(Number(event.target.value))} />{overLimit && <small>For properties below £8,333 pcm, counter offer rent may not exceed the advertised rent of £{advertisedRent.toLocaleString("en-GB")}.</small>}</label>
        <label>Notes (optional)<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Explain the proposed change to the applicant." /></label>
        <div className="hero-actions"><button className="btn primary" disabled={overLimit}>Send Counter Offer</button><button className="btn" type="button" onClick={onClose}>Cancel</button></div>
      </form>
    </div>
  );
}

function InterestTab({ propertyId }: { propertyId: string }) {
  const events = interestEvents.filter((item) => item.propertyId === propertyId);
  return <section className="grid cols-2">{events.map((event) => <article className="card" key={event.id}><span className="badge orange">{event.type}</span><h3>{event.applicantName}</h3><p className="muted">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.occurredAt))}</p><p>{event.summary}</p><Link className="btn" to={`/messages?property=${propertyId}`}>Contact</Link></article>)}</section>;
}

function DealsTab({ deal, onReviewOffers }: { deal: Deal | null; onReviewOffers: () => void }) {
  if (!deal) return <section className="card empty-state"><h2>There is currently no active deal for this property.</h2><button className="btn primary" onClick={onReviewOffers}>Review Offers</button></section>;
  return <section className="card deal-card"><span className="badge orange">{deal.status}</span><h2>{deal.applicant}</h2><p><b>Agreed Rent:</b> £{deal.rent.toLocaleString("en-GB")} pcm</p><p><b>Agreed Move Date:</b> {formatDate(deal.moveDate)}</p><p><b>Referencing Status:</b> {deal.referencing}</p><p><b>Next Steps:</b> {deal.nextSteps}</p><Link className="btn primary" to="/messages">Message applicant</Link></section>;
}

function Countdown({ expiresAt, large = false }: { expiresAt?: string; large?: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  const text = useMemo(() => {
    if (!expiresAt) return "No active timer";
    const remaining = new Date(expiresAt).getTime() - now;
    if (remaining <= 0) return "Expired";
    const minutes = Math.floor(remaining / 60000);
    const hours = Math.floor(minutes / 60);
    return hours >= 1 ? `${hours} Hours Remaining` : `${Math.max(1, minutes)} Minutes Remaining`;
  }, [expiresAt, now]);
  return <span className={`countdown ${large ? "large" : ""}`}>{text}</span>;
}

function Detail({ title, value }: { title: string; value: string }) { return <div><span className="label">{title}</span><p>{value}</p></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }
