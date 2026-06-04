import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { managedProperties, propertyViewings, type PropertyViewing } from "../../data/landlordProperties";

export function PropertyViewingsPage() {
  const { propertyId } = useParams();
  const property = managedProperties.find((item) => item.id === propertyId) || managedProperties[0];
  const viewings = propertyViewings.filter((item) => item.propertyId === property.id);
  const [modal, setModal] = useState<{ type: "reschedule" | "cancel"; viewing: PropertyViewing } | null>(null);
  const groups = {
    Upcoming: viewings.filter((item) => item.status === "UPCOMING"),
    Completed: viewings.filter((item) => item.status === "COMPLETED"),
    Cancelled: viewings.filter((item) => item.status === "CANCELLED")
  };

  return (
    <main className="page">
      <section className="hero compact-hero"><p className="badge orange">Property viewings</p><h1>{property.address}</h1><p>Manage upcoming appointments, follow up with completed viewings and keep a clean audit trail.</p></section>
      <section className="viewing-columns">
        {Object.entries(groups).map(([title, items]) => (
          <article className="card viewing-column" key={title}>
            <h2>{title}</h2>
            {items.map((viewing) => <ViewingCard key={viewing.id} viewing={viewing} propertyId={property.id} onModal={setModal} />)}
          </article>
        ))}
      </section>
      {modal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="card modal-card form-grid" onSubmit={(event) => { event.preventDefault(); setModal(null); }}>
            <h2>{modal.type === "reschedule" ? "Draft a reschedule message" : "Draft a cancellation message"}</h2>
            <label>{modal.type === "reschedule" ? "Draft a message to the applicant explaining the proposed new viewing time." : "Draft a message explaining the cancellation."}<textarea defaultValue={modal.type === "reschedule" ? `Hi ${modal.viewing.applicantName}, would you be able to attend a revised viewing time? I can offer a new slot and will confirm once suitable.` : `Hi ${modal.viewing.applicantName}, I need to cancel the current viewing slot. I am sorry for the inconvenience and can offer another time if helpful.`} /></label>
            <div className="hero-actions"><button className="btn primary">Send message</button><button className="btn" type="button" onClick={() => setModal(null)}>Close</button></div>
          </form>
        </div>
      )}
    </main>
  );
}

function ViewingCard({ viewing, propertyId, onModal }: { viewing: PropertyViewing; propertyId: string; onModal: (value: { type: "reschedule" | "cancel"; viewing: PropertyViewing }) => void }) {
  return (
    <div className="viewing-card">
      <h3>{viewing.applicantName}</h3>
      <p className="muted">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(viewing.date))} · {viewing.time}</p>
      <div className="hero-actions">
        <Link className="btn" to={`/messages?property=${propertyId}`}>Contact</Link>
        {viewing.status === "UPCOMING" && <button className="btn" onClick={() => onModal({ type: "reschedule", viewing })}>Reschedule</button>}
        {viewing.status === "UPCOMING" && <button className="btn" onClick={() => onModal({ type: "cancel", viewing })}>Cancel</button>}
        {viewing.status === "COMPLETED" && viewing.offerId && <Link className="btn primary" to={`/landlord/properties/${propertyId}/offers?offer=${viewing.offerId}`}>Review Offer</Link>}
        {viewing.status === "COMPLETED" && viewing.offerId && <span className="badge orange">Offer Submitted</span>}
        {viewing.status === "COMPLETED" && !viewing.offerId && <span className="tooltip" title="Follow up with applicants and ask whether they would like to submit an offer.">Follow up</span>}
      </div>
    </div>
  );
}
