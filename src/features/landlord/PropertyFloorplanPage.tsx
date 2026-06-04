import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { managedProperties } from "../../data/landlordProperties";
import { assetUrl } from "../../utils/asset";

export function PropertyFloorplanPage() {
  const { propertyId } = useParams();
  const property = managedProperties.find((item) => item.id === propertyId) || managedProperties[0];
  const [floorplan, setFloorplan] = useState(property.floorplanUrl || "");
  const [editing, setEditing] = useState(!property.floorplanUrl);

  return (
    <main className="page">
      <section className="gallery-header">
        <div><p className="badge orange">Floorplan</p><h1>{property.address}</h1><p className="muted">{floorplan ? "Review and maintain the applicant-facing floorplan." : "Upload a floorplan to improve enquiry quality."}</p></div>
        <div className="hero-actions"><button className="btn primary" onClick={() => setEditing(!editing)}>{floorplan ? "Edit Floorplan" : "Upload Floorplan"}</button><Link className="btn" to="/landlord/properties">Back</Link></div>
      </section>
      <section className="card floorplan-viewer">
        {floorplan ? <img src={floorplan} alt="Property floorplan" /> : <div className="dropzone"><div><b>No floorplan uploaded</b><p className="muted">Floorplans help tenants understand layout before booking a viewing.</p></div></div>}
        {editing && <div className="hero-actions"><button className="btn primary" onClick={() => { setFloorplan(assetUrl("assets/hero-product.png")); setEditing(false); }}>Upload</button><button className="btn" disabled={!floorplan} onClick={() => setFloorplan("")}>Delete</button><button className="btn" onClick={() => setFloorplan(assetUrl("assets/hero-product.png"))}>Replace</button></div>}
      </section>
    </main>
  );
}
