import { Link } from "react-router-dom";
import { Building2, Search, ShieldCheck, UserRound } from "lucide-react";
import { assetUrl } from "../../utils/asset";

export function TenantHero() {
  return (
    <section className="home-hero">
      <div className="home-hero-copy">
        <p className="eyebrow">Secure lettings platform that connects landlords and tenants</p>
        <h1>Rent in 5 clicks.</h1>
        <p>Quick referencing and seamless controlled letting for tenants and pre-referenced verified tenants for landlords. Everything you need to rent a flat inside one secure platform.</p>
        <div className="hero-actions equal-actions">
          <Link className="btn primary" to="/search"><Search size={18} /> Search Properties</Link>
          <Link className="btn primary" to="/register"><UserRound size={18} /> Create Account</Link>
          <Link className="btn primary" to="/register?role=Landlord"><Building2 size={18} /> List Your Property</Link>
        </div>
      </div>
      <div className="hero-composition" aria-hidden="true">
        <img className="hero-photo hero-photo-main" src={assetUrl("assets/properties/hilltro-luxury-flats-hero.png")} alt="" />
        <img className="hero-photo hero-photo-secondary" src={assetUrl("assets/properties/hilltro-luxury-house-hero.png")} alt="" />
        <div className="ui-preview search-preview">
          <span>Prime Central London</span>
          <b>10 new homes in your area!</b>
          <small>£1,500 - £25,000 pcm</small>
        </div>
        <div className="ui-preview passport-preview">
          <ShieldCheck size={18} />
          <b>5 verified applicants made offers</b>
          <small>Referenced renters are ready for your property.</small>
        </div>
      </div>
    </section>
  );
}
