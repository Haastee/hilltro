import { useState } from "react";
import { Link } from "react-router-dom";
import { managedProperties, propertyViewings } from "../../data/landlordProperties";

export function LandlordViewingsPage() {
  const [handled, setHandled] = useState<Record<string, string>>({});
  const rows = propertyViewings.map((viewing) => ({ ...viewing, property: managedProperties.find((property) => property.id === viewing.propertyId) || managedProperties[0] }));
  return (
    <main className="page">
      <section className="hero compact-hero"><p className="badge orange">Viewings</p><h1>All viewing requests.</h1><p>Accept, decline or message tenants from one operational queue.</p></section>
      <section className="property-management-list">
        {rows.map((viewing) => (
          <article className="card viewing-request" key={viewing.id}>
            <p><Link className="strong-link" to={`/messages?tenant=${encodeURIComponent(viewing.applicantName)}&property=${viewing.propertyId}`}>{viewing.applicantName}</Link> would like to view <Link className="strong-link" to={`/properties/${viewing.propertyId}`}>{viewing.property.address}</Link> on {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(new Date(viewing.date))} at {viewing.time}</p>
            <div className="hero-actions"><button className="btn primary" onClick={() => setHandled({ ...handled, [viewing.id]: "Accepted" })}>Accept</button><button className="btn" onClick={() => setHandled({ ...handled, [viewing.id]: "Declined" })}>Decline</button><Link className="btn" to={`/messages?tenant=${encodeURIComponent(viewing.applicantName)}&property=${viewing.propertyId}`}>Message</Link>{handled[viewing.id] && <span className="badge orange">{handled[viewing.id]}</span>}</div>
          </article>
        ))}
      </section>
    </main>
  );
}
