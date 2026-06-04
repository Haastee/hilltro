import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarCheck, FileSignature, ShieldCheck } from "lucide-react";
import { propertyService } from "../../app/services";
import type { Property, User } from "../../types/domain";
import { supabase } from "../../utils/supabase";

export function PropertyDetailPage({ user }: { user: User | null }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | undefined>();
  const [notice, setNotice] = useState("");
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerRent, setOfferRent] = useState("");

  useEffect(() => {
    if (id) propertyService.getProperty(id, false).then(setProperty);
  }, [id]);

  async function requestViewing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      navigate(`/register?next=/properties/${id}`);
      return;
    }
    if (user.role !== "TENANT") {
      setNotice("Landlord accounts cannot request tenant viewings. Create or switch to a tenant workspace.");
      return;
    }
    if (import.meta.env.VITE_SUPABASE_URL && property) {
      const { data: row } = await supabase.from("properties").select("landlord_id").eq("id", property.id).maybeSingle();
      await supabase.from("viewings").insert({ property_id: property.id, landlord_id: row?.landlord_id, tenant_id: user.id, requested_date: String(new FormData(event.currentTarget).get("date") || new Date().toISOString().slice(0, 10)), requested_time: "14:00", message: String(new FormData(event.currentTarget).get("message") || "") });
    }
    setNotice("Viewing request sent. The landlord will see your verified Tenant Passport status, never your private risk card.");
  }

  async function submitOffer() {
    if (!user) {
      navigate(`/register?next=/properties/${id}`);
      return;
    }
    if (import.meta.env.VITE_SUPABASE_URL && property) {
      const { data: row } = await supabase.from("properties").select("landlord_id").eq("id", property.id).maybeSingle();
      await supabase.from("offers").insert({ property_id: property.id, landlord_id: row?.landlord_id, tenant_id: user.id, offer_rent_pcm: Number(offerRent || property.rentPcm), move_in_date: new Date().toISOString().slice(0, 10), notes: "Submitted from property listing." });
    }
    setOfferOpen(false);
    setNotice("Offer submitted. The landlord can review it from My Properties > Offers.");
  }

  if (!property) return <main className="page"><section className="hero"><h1>Property not found.</h1><Link className="btn light" to="/search">Back to search</Link></section></main>;

  return (
    <main className="page">
      <section className="property-detail">
        <div className="property-media"><img src={property.imageUrl} alt={property.title} /></div>
        <aside className="card sticky-card">
          <span className="badge orange">Verified-ready rental</span>
          <h1>{property.title}</h1>
          <p className="muted">{property.streetName}, {property.area}, {property.city} {property.postcodeDistrict}</p>
          <h2>£{property.rentPcm.toLocaleString("en-GB")} pcm</h2>
          <p>{property.bedrooms} bed · {property.bathrooms} bath · {property.furnishingStatus}</p>
          <form className="form-grid" onSubmit={requestViewing}>
            <p className="form-note">* Required field</p>
            <label>Preferred viewing date *<input name="date" type="date" required /></label>
            <label>Message (optional)<textarea name="message" placeholder="Share your move-in timing and any accessibility needs." /></label>
            {notice && <p className="badge orange">{notice}</p>}
            <button className="btn primary"><CalendarCheck size={18} /> Request viewing</button>
            <Link className="btn" to={`/messages?property=${property.id}`}>Message landlord</Link>
            <button className="btn" type="button" onClick={() => { setOfferOpen(true); setOfferRent(String(property.rentPcm)); }}><FileSignature size={18} /> Send offer</button>
          </form>
        </aside>
      </section>
      {offerOpen && <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="card modal-card form-grid"><h2>Submit Offer</h2><p className="form-note">* Required field</p><label>Offer rent *<input type="number" required value={offerRent} onChange={(event) => setOfferRent(event.target.value)} /></label><label>Notes (optional)<textarea placeholder="Share move-in timing and any useful context for the landlord." /></label><div className="hero-actions"><button className="btn primary" onClick={submitOffer}>Submit Offer</button><button className="btn" onClick={() => setOfferOpen(false)}>Cancel</button></div></div></div>}

      <section className="grid cols-3" style={{ marginTop: 18 }}>
        <article className="card"><ShieldCheck /><h3>Address protected</h3><p className="muted">The exact address is only released after the viewing is approved.</p></article>
        <article className="card"><h3>Description</h3><p className="muted">{property.description}</p></article>
        <article className="card"><h3>APT progression</h3><p className="muted">Referencing, offer, deposit and Assured Periodic Tenancy signing all run through Haaste.</p></article>
      </section>
    </main>
  );
}
