import { Link, useNavigate } from "react-router-dom";
import type { KeyboardEvent, MouseEvent } from "react";
import { useRef, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, Home, House, Landmark, UsersRound } from "lucide-react";
import { HilltroAvatar, publicLandlordName } from "../../components/HilltroAvatar";
import { landlordById } from "../../data/landlordProperties";
import type { Property } from "../../types/domain";
import { trackPropertyEngagement } from "../../services/engagementService";
import { propertyGallery } from "../../utils/propertyMedia";

export function PropertyCard({ property }: { property: Property }) {
  const navigate = useNavigate();
  const landlord = landlordById(property.landlordId);
  const gallery = propertyGallery(property);
  const imageItems = gallery.filter((item) => item.kind !== "video");
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStart = useRef<number | null>(null);
  const active = imageItems[activeIndex] || imageItems[0];
  const TypeIcon = propertyTypeIcon(property.type);

  function moveImage(direction: -1 | 1) {
    setActiveIndex((current) => {
      const next = (current + direction + imageItems.length) % imageItems.length;
      trackPropertyEngagement(property.id, "gallery_view", { source: "property_card", index: next + 1 });
      return next;
    });
  }

  function selectImage(index: number) {
    setActiveIndex(index);
    trackPropertyEngagement(property.id, "gallery_view", { source: "property_card_thumbnail", index: index + 1 });
  }

  function openProperty() {
    trackPropertyEngagement(property.id, "property_view", { source: "property_card" });
    navigate(`/properties/${property.id}`);
  }

  function onCardClick(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("a.property-landlord-strip")) return;
    openProperty();
  }

  function onCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    event.preventDefault();
    openProperty();
  }

  return (
    <article className="property-card clickable-property-card" role="link" tabIndex={0} onClick={onCardClick} onKeyDown={onCardKeyDown} aria-label={`Open ${property.title}`}>
      <div
        className="property-card-gallery"
        onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
        onTouchEnd={(event) => {
          if (touchStart.current === null) return;
          const delta = event.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(delta) > 36) moveImage(delta > 0 ? -1 : 1);
          touchStart.current = null;
        }}
      >
        <Link className="property-image-link" to={`/properties/${property.id}`} onClick={() => trackPropertyEngagement(property.id, "property_view", { source: "property_card_image" })}>
          <img src={active.url} alt={active.title} />
          {active.kind === "floorplan" && <span className="media-label">Floorplan</span>}
        </Link>
        {imageItems.length > 1 && (
          <div className="card-gallery-controls" aria-label="Browse property photos">
            <button type="button" aria-label="Previous image" onClick={() => moveImage(-1)}><ChevronLeft size={18} /></button>
            <button type="button" aria-label="Next image" onClick={() => moveImage(1)}><ChevronRight size={18} /></button>
          </div>
        )}
        <div className="card-thumbnail-strip" aria-label="Property media thumbnails">
          {imageItems.slice(0, 4).map((item, index) => (
            <button type="button" className={index === activeIndex ? "active" : ""} key={item.id} onClick={() => selectImage(index)} aria-label={`Show image ${index + 1}`}>
              <img src={item.thumbnailUrl} alt="" />
              {item.kind === "floorplan" && <span>Plan</span>}
            </button>
          ))}
          {imageItems.length > 4 && <span className="more-media">+{imageItems.length - 4} more</span>}
        </div>
      </div>
      <div className="body">
        <div className="property-card-top">
          <p className="property-price">£{property.rentPcm.toLocaleString("en-GB")} pcm</p>
          <span className="property-type-icon"><TypeIcon size={16} /> {property.type}</span>
        </div>
        <h3><Link to={`/properties/${property.id}`} onClick={() => trackPropertyEngagement(property.id, "property_view", { source: "property_card_title" })}>{property.streetName}, {property.area}</Link></h3>
        <p className="muted">{property.city} {property.postcodeDistrict}</p>
        <p className="property-meta">{property.bedrooms} bed · {property.bathrooms} bath · {property.furnishingStatus}</p>
        <Link className="property-landlord-strip" to={`/landlords/${landlord.id}`}>
          <HilltroAvatar name={publicLandlordName(landlord)} imageUrl={landlord.profilePhotoUrl} size="sm" />
          <span><b>{publicLandlordName(landlord)}</b><small>{landlord.landlordType}</small></span>
        </Link>
        <p className="property-desc">{property.description}</p>
        <div className="property-card-actions">
          {property.slightlyAboveBudget && <span className="badge orange">Slightly above budget</span>}
          <Link className="btn secondary" to={`/properties/${property.id}`} onClick={() => trackPropertyEngagement(property.id, "property_view", { source: "property_card_details" })}>See Details</Link>
        </div>
      </div>
    </article>
  );
}

function propertyTypeIcon(type: string) {
  if (type === "Shared Property") return UsersRound;
  if (type.includes("House") || type === "Bungalow") return House;
  if (type === "Penthouse") return Landmark;
  if (type === "Maisonette") return Home;
  return Building2;
}
