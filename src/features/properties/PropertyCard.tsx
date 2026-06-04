import { Link } from "react-router-dom";
import type { Property } from "../../types/domain";

export function PropertyCard({ property }: { property: Property }) {
  return (
    <article className="card property-card">
      <img src={property.imageUrl} alt={property.title} />
      <div className="body">
        <span className="badge">{property.type}</span>
        {property.slightlyAboveBudget && <span className="badge orange" style={{ marginLeft: 8 }}>Slightly Above Your Budget</span>}
        <h3><Link to={`/properties/${property.id}`}>{property.title}</Link></h3>
        <p className="muted">{property.streetName}, {property.area}, {property.city} {property.postcodeDistrict}</p>
        <p><b>£{property.rentPcm.toLocaleString("en-GB")} pcm</b> · {property.bedrooms} bed · {property.bathrooms} bath</p>
        <Link className="btn" to={`/properties/${property.id}`}>View details</Link>
      </div>
    </article>
  );
}
