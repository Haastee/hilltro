import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BadgePoundSterling, BriefcaseBusiness, Building2, FileText, Home, MessageSquare, PenLine, Search, ShieldCheck, UploadCloud, UserRound, Zap } from "lucide-react";
import { propertyService } from "../../app/services";
import type { Property } from "../../types/domain";
import { PropertyCard } from "./PropertyCard";
import { primeCentralListings } from "../../data/properties";
import { assetUrl } from "../../utils/asset";
import { HomeHeroRotator } from "./HomeHeroRotator";
import { TenantHero } from "./TenantHero";
import { LandlordHero } from "./LandlordHero";

export function HomePage() {
  const [properties, setProperties] = useState<Property[]>(primeCentralListings);
  const carouselRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    propertyService.search({})
      .then((items) => setProperties(mergeProperties(items.length ? items : primeCentralListings, primeCentralListings).slice(0, 10)))
      .catch(() => setProperties(primeCentralListings));
  }, []);
  return (
    <main>
      <HomeHeroRotator slides={[<TenantHero key="tenant" />, <LandlordHero key="landlord" />]} labels={["For tenants", "For landlords"]} />

      <section className="section-shell">
        <div className="featured-row">
          <h2>Featured Properties</h2>
          <div className="featured-actions">
            <Link className="see-all-link" to="/search">See All</Link>
            <div className="carousel-controls" aria-label="Property carousel controls">
            <button type="button" aria-label="Previous properties" onClick={() => scrollCarousel(carouselRef.current, -1)}><ArrowLeft size={18} /></button>
            <button type="button" aria-label="Next properties" onClick={() => scrollCarousel(carouselRef.current, 1)}><ArrowRight size={18} /></button>
            </div>
          </div>
        </div>
      </section>

      <section className="property-carousel-shell" aria-label="Featured Prime Central London homes">
        <Link className="btn primary mobile-properties-cta" to="/search">See Properties</Link>
        <div
          className="property-carousel"
          ref={carouselRef}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") scrollCarousel(carouselRef.current, 1);
            if (event.key === "ArrowLeft") scrollCarousel(carouselRef.current, -1);
          }}
        >
          {properties.map((property) => <PropertyCard key={property.id} property={property} />)}
        </div>
        {properties.length === 0 && <article className="quiet-empty"><h3>No live listings yet.</h3><p className="muted">Published landlord listings will appear here immediately.</p><Link className="btn secondary" to="/search">Open search</Link></article>}
      </section>

      <section className="home-journey-band" aria-label="How Hilltro works">
        <HomeStepSection
          title="How to Complete Referencing"
          steps={[
            { title: "Provide your personal information.", icon: UserRound },
            { title: "Share your employment and rental history.", icon: BriefcaseBusiness },
            { title: "Receive your affordability assessment.", icon: BadgePoundSterling },
            { title: "Build your verified rental profile.", icon: ShieldCheck },
            { title: "Start viewing and applying for properties.", icon: Home }
          ]}
        />
        <HomeStepSection
          title="How to List Your Property"
          steps={[
            { title: "Upload your property's key information.", icon: UploadCloud },
            { title: "Receive an instant rental guidance estimate.", icon: BadgePoundSterling },
            { title: "Generate a description using our AI assistant.", icon: PenLine },
            { title: "Publish your listing and start receiving enquiries.", icon: Building2 },
            { title: "Manage viewings, offers and communications.", icon: MessageSquare }
          ]}
        />
      </section>
      <section className="stacked-info-section" aria-label="Rental journey guidance">
        <article className="stacked-info-card"><Zap size={28} /><div><h3>Our referencing process takes approximately 6 minutes on average.</h3><p>Complete the steps and be ready to rent your next home.</p></div></article>
        <article className="stacked-info-card"><ShieldCheck size={28} /><div><h3>Is my information secure?</h3><p>Yes. We use trusted providers to process information securely and operate in line with UK GDPR requirements.</p></div></article>
        <article className="stacked-info-card"><FileText size={28} /><div><h3>What happens after my offer is accepted?</h3><p>You will progress through the tenancy process within one platform, including communication, document management and payment coordination.</p></div></article>
      </section>
    </main>
  );
}

function HomeStepSection({ title, steps }: { title: string; steps: Array<{ title: string; icon: typeof UserRound }> }) {
  return (
    <section className="home-step-section">
      <div className="section-heading"><h2>{title}</h2></div>
      <div className={`home-step-flow count-${steps.length}`}>
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div className="home-step-wrap" key={step.title}>
              <article className="home-step-card">
                <span>{index + 1}</span>
                <Icon size={24} />
                <h3>{step.title}</h3>
              </article>
              {index < steps.length - 1 && <ArrowRight className="home-step-arrow" aria-hidden="true" />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function scrollCarousel(element: HTMLDivElement | null, direction: -1 | 1) {
  if (!element) return;
  element.scrollBy({ left: direction * Math.round(element.clientWidth * 0.82), behavior: "smooth" });
}

function mergeProperties(primary: Property[], local: Property[]) {
  const seen = new Set<string>();
  return [...local, ...primary].filter((property) => {
    if (seen.has(property.id)) return false;
    seen.add(property.id);
    return true;
  });
}
