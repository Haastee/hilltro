import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { demoProperties } from "../../data/properties";
import { landlordById } from "../../data/landlordProperties";
import { HilltroAvatar, publicLandlordName } from "../../components/HilltroAvatar";
import { PropertyCard } from "./PropertyCard";
import { propertyService } from "../../app/services";
import type { LandlordProfile, Property } from "../../types/domain";
import { landlordTypeForLiveListings } from "../../utils/landlordClassification";

function looksLikeUuid(value?: string) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export function LandlordProfilePage() {
  const { landlordId } = useParams();
  const isRealLandlord = looksLikeUuid(landlordId);
  const [realProperties, setRealProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(isRealLandlord);

  useEffect(() => {
    let active = true;
    if (!isRealLandlord || !landlordId) {
      setRealProperties([]);
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    propertyService.search({})
      .then((items) => {
        if (active) setRealProperties(items.filter((property) => property.landlordId === landlordId && property.status === "LIVE"));
      })
      .catch(() => {
        if (active) setRealProperties([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [isRealLandlord, landlordId]);

  const landlord = useMemo<LandlordProfile>(() => {
    if (!isRealLandlord || !landlordId) return landlordById(landlordId);
    const firstProperty = realProperties[0];
    const liveCount = firstProperty?.landlordLiveListingCount || realProperties.length;
    return {
      id: landlordId,
      userId: landlordId,
      firstName: firstProperty?.landlordFirstName || "Landlord",
      middleName: "",
      lastName: "",
      displayName: firstProperty?.landlordFirstName || "Landlord",
      profilePhotoUrl: firstProperty?.landlordAvatarUrl,
      landlordType: landlordTypeForLiveListings(liveCount),
      propertiesCount: liveCount
    };
  }, [isRealLandlord, landlordId, realProperties]);

  const properties = isRealLandlord ? realProperties : demoProperties.filter((property) => property.landlordId === landlord.id && property.status === "LIVE");
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
      {loading ? <section className="card" style={{ maxWidth: 1320, margin: "0 auto" }}>Loading landlord profile...</section> : (
        properties.length
          ? <section className="grid cols-3">{properties.map((property) => <PropertyCard key={property.id} property={property} />)}</section>
          : <section className="card" style={{ maxWidth: 1320, margin: "0 auto" }}>No active properties are currently listed by this landlord.</section>
      )}
      <div className="hero-actions" style={{ maxWidth: 1320, margin: "24px auto 0" }}><Link className="btn" to="/search">Back to search</Link></div>
    </main>
  );
}
