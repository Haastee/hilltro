import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ShieldCheck, Landmark, CreditCard } from "lucide-react";
import { propertyService } from "../../app/services";
import type { Property } from "../../types/domain";
import { PropertyCard } from "./PropertyCard";

export function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  useEffect(() => { propertyService.search({}).then((items) => setProperties(items.slice(0, 3))).catch(() => setProperties([])); }, []);
  return (
    <main className="page">
      <section className="hero">
        <p className="badge orange">UK rental operating system</p>
        <h1>Rent in 5 clicks.</h1>
        <p>Search verified homes, complete referencing, book a viewing, submit an offer and sign your Assured Periodic Tenancy inside one secure platform.</p>
        <div className="hero-actions">
          <Link className="btn primary" to="/search">Search properties</Link>
          <Link className="btn light" to="/register">Create account</Link>
        </div>
      </section>

      <section className="grid cols-3">
        {properties.map((property) => <PropertyCard key={property.id} property={property} />)}
        {properties.length === 0 && <article className="card"><h3>No live listings yet.</h3><p className="muted">Published landlord listings will appear here immediately.</p><Link className="btn" to="/search">Open search</Link></article>}
      </section>

      <section className="grid cols-3" style={{ marginTop: 24 }}>
        <article className="card"><ShieldCheck /><h3>Identity verification</h3><p className="muted">Passport, liveness, AML and fraud-check flows are isolated in the verification service layer.</p></article>
        <article className="card"><Landmark /><h3>Open Banking ready</h3><p className="muted">Income and affordability workflows are structured for secure financial verification.</p></article>
        <article className="card"><CreditCard /><h3>Payments prepared</h3><p className="muted">Rent, deposits and payout reconciliation are modeled for Stripe or Airwallex.</p></article>
      </section>
    </main>
  );
}
