import { Link, useParams } from "react-router-dom";
import { demoProperties } from "../../data/properties";
import { landlordById } from "../../data/landlordProperties";
import { HilltroAvatar, publicLandlordName } from "../../components/HilltroAvatar";
import { PropertyCard } from "./PropertyCard";

export function LandlordProfilePage() {
  const { landlordId } = useParams();
  const landlord = landlordById(landlordId);
  const properties = demoProperties.filter((property) => property.landlordId === landlord.id && property.status === "LIVE");
  return (
    <main className="page">
      <section className="landlord-profile-hero">
        <HilltroAvatar name={publicLandlordName(landlord)} imageUrl={landlord.profilePhotoUrl} size="xl" />
        <div>
          <p className="badge orange">Landlord Profile</p>
          <h1>{publicLandlordName(landlord)}</h1>
          <p className="muted">{landlord.landlordType} · {properties.length} active properties</p>
          {landlord.bio && <p>{landlord.bio}</p>}
        </div>
      </section>
      <section className="section-heading"><h2>Active properties</h2><p>Browse all current listings from this landlord.</p></section>
      <section className="grid cols-3">{properties.map((property) => <PropertyCard key={property.id} property={property} />)}</section>
      <div className="hero-actions" style={{ maxWidth: 1320, margin: "24px auto 0" }}><Link className="btn" to="/search">Back to search</Link></div>
    </main>
  );
}
