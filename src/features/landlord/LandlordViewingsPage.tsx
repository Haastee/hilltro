import { useState } from "react";
import { Link } from "react-router-dom";
import { applicantById, managedProperties, propertyViewings } from "../../data/landlordProperties";
import { HilltroAvatar } from "../../components/HilltroAvatar";

export function LandlordViewingsPage() {
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [decline, setDecline] = useState<ReturnType<typeof buildViewingRows>[number] | null>(null);
  const [declineError, setDeclineError] = useState("");
  const [tab, setTab] = useState<"viewings" | "requests">("viewings");
  const rows = buildViewingRows();
  const viewings = rows.filter((viewing) => ["UPCOMING", "COMPLETED", "CANCELLED"].includes(accepted[viewing.id] ? "UPCOMING" : viewing.status));
  const requests = rows.filter((viewing) => accepted[viewing.id] || ["PENDING", "DECLINED", "RESCHEDULE_REQUESTED"].includes(viewing.status));
  return (
    <main className="page">
      <section className="hero compact-hero"><p className="badge orange">Viewings</p><h1>Viewings and requests.</h1><p>Separate confirmed viewing activity from pending applicant requests.</p></section>
      <section className="offer-tabs buttons">
        <button className={tab === "viewings" ? "active" : ""} onClick={() => setTab("viewings")}>Viewings <b>{viewings.length}</b></button>
        <button className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>Viewing Requests <b>{requests.length}</b></button>
      </section>
      <section className="property-management-list">
        {(tab === "viewings" ? viewings : requests).map((viewing) => (
          <article className="card viewing-request" key={viewing.id}>
            <div className="viewing-request-heading"><HilltroAvatar name={viewing.applicantName} imageUrl={applicantById(viewing.applicantId)?.profileImageUrl} /><p><Link className="strong-link" to={`/landlord/applicants/${viewing.applicantId}?property=${viewing.propertyId}`}>{viewing.applicantName}</Link> {tab === "requests" ? "would like to view" : "is linked to"} <Link className="strong-link" to={`/properties/${viewing.propertyId}`}>{viewing.property.address}</Link> on {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(new Date(viewing.date))} at {viewing.time}</p></div>
            <span className={`status-pill ${accepted[viewing.id] || viewing.status === "UPCOMING" ? "live" : viewing.status === "COMPLETED" ? "live" : viewing.status === "PENDING" ? "draft" : "inactive"}`}>{accepted[viewing.id] ? "ACCEPTED" : viewing.status}</span>
            {accepted[viewing.id] ? (
              <div className="success-state"><strong>✓ Viewing added to your diary</strong><span>{viewing.applicantName}</span><span>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(viewing.date))} · {viewing.time}</span></div>
            ) : (
              <div className="hero-actions"><button className="btn primary" onClick={() => setAccepted({ ...accepted, [viewing.id]: true })}>Accept</button><button className="btn" onClick={() => { setDecline(viewing); setDeclineError(""); }}>Decline Viewing</button><Link className="btn" to={`/messages?applicant=${viewing.applicantId}&property=${viewing.propertyId}`}>Message</Link></div>
            )}
          </article>
        ))}
      </section>
      {(tab === "viewings" ? viewings : requests).length === 0 && <section className="card empty-state"><h2>No {tab === "viewings" ? "viewings" : "viewing requests"} in this queue.</h2></section>}
      {decline && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form
            className="card modal-card form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              if (!String(form.get("time")).trim() && !String(form.get("reason")).trim()) {
                setDeclineError("Suggest a different time or provide a reason before submitting.");
                return;
              }
              setDecline(null);
            }}
            noValidate
          >
            <h2>Decline Viewing Request</h2>
            <label>Suggest a different time<textarea name="time" placeholder="Offer one or two alternative viewing slots." /></label>
            <label>Provide a reason<textarea name="reason" placeholder="Explain why this viewing cannot go ahead." /></label>
            {declineError && <p className="notice error">{declineError}</p>}
            <div className="hero-actions"><button className="btn primary">Submit response</button><button className="btn" type="button" onClick={() => setDecline(null)}>Cancel</button></div>
          </form>
        </div>
      )}
    </main>
  );
}

function buildViewingRows() {
  return propertyViewings.map((viewing) => ({ ...viewing, property: managedProperties.find((property) => property.id === viewing.propertyId) || managedProperties[0] }));
}
