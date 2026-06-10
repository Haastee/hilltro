import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Building2, Eye, FileSignature, Gauge, Home, MessageSquare, Search, ShieldCheck, SlidersHorizontal, UserRound, Zap } from "lucide-react";

export function AboutPage() {
  const values = [
    { title: "Simplicity", copy: "Reduce unnecessary friction throughout the rental journey.", icon: Zap },
    { title: "Transparency", copy: "Create a clearer experience for both sides.", icon: Eye },
    { title: "Control", copy: "Manage communication, viewings and offers from one place.", icon: SlidersHorizontal },
    { title: "Modern Experience", copy: "Bring a traditionally fragmented process into one platform.", icon: Gauge }
  ];
  return (
    <main className="page about-page">
      <section className="hero about-hero premium-about-hero">
        <p className="badge orange">About Hilltro</p>
        <h1>Built by property professionals. Designed for everyone.</h1>
        <p>Hilltro was created by lifelong property professionals who believed renting could be simpler.</p>
        <p>The market lacked transparency, efficiency and trust. We built Hilltro to create a calmer, more connected rental experience for tenants and landlords.</p>
      </section>
      <section className="about-value-grid">
        {values.map((value) => {
          const Icon = value.icon;
          return (
            <article className="about-value-card" key={value.title}>
              <Icon size={24} />
              <h2>{value.title}</h2>
              <p>{value.copy}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}

export function HowItWorksPage() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"tenant" | "landlord">(params.get("role") === "landlord" ? "landlord" : "tenant");
  const journeys = {
    tenant: {
      title: "How to rent a property in 5 clicks",
      steps: [
        { title: "Create an Account", icon: UserRound, description: ["Create your Hilltro account and complete your basic profile information.", "Get started in just a few minutes."] },
        { title: "Complete Referencing", icon: ShieldCheck, description: ["Provide identity, employment and affordability information.", "Our referencing process typically takes only a few minutes to complete."] },
        { title: "Find Properties", icon: Search, description: ["Search available properties using location, maps, filters and saved searches.", "Discover homes that match your requirements."] },
        { title: "Request Viewings & Send Offers", icon: MessageSquare, description: ["Request viewings directly through the platform.", "After viewing a property, submit offers and communicate with landlords from one place."] },
        { title: "Sign Contract & Move In", icon: FileSignature, description: ["Complete your tenancy journey digitally.", "Review documents, sign agreements and prepare for your move without unnecessary paperwork."] }
      ]
    },
    landlord: {
      title: "How to rent out your property in 5 clicks",
      steps: [
        { title: "List Your Property", icon: Home, description: ["List your property completely free of charge.", "Add photos, descriptions and property details in just a few minutes.", "Don't have professional photos? We can help you organise them."] },
        { title: "Receive Referenced Enquiries", icon: ShieldCheck, description: ["Receive viewing requests from applicants who have completed referencing and affordability checks.", "Review applicant information before arranging viewings.", "Spend less time filtering enquiries and more time speaking with serious tenants."] },
        { title: "Manage Viewings", icon: MessageSquare, description: ["Arrange and manage viewings through a single platform.", "Focus on applicants who are genuinely interested and ready to move.", "Keep all communication and scheduling organised in one place."] },
        { title: "Accept Offer", icon: Building2, description: ["Receive offers from tenants after viewings.", "Compare applicants, review affordability information and choose the tenant that best fits your property."] },
        { title: "Sign Contract", icon: FileSignature, description: ["Sign tenancy agreements directly through the platform.", "Need additional clauses? Submit your requirements and our AI-lawyer will add them before signing."] }
      ]
    }
  };
  const current = journeys[mode];
  return (
    <main className="page how-page">
      <section className="hero how-hero">
        <p className="badge orange">How it works</p>
        <h1>One clear rental journey.</h1>
        <p>Hilltro connects tenants and landlords through one calm, secure rental journey.</p>
      </section>
      <JourneyFlow mode={mode} setMode={setMode} title={current.title} steps={current.steps} />
    </main>
  );
}

function JourneyFlow({ mode, setMode, title, steps }: { mode: "tenant" | "landlord"; setMode: (mode: "tenant" | "landlord") => void; title: string; steps: Array<{ title: string; icon: typeof UserRound; description: string[] }> }) {
  return (
    <section className="journey-panel">
      <div className="segmented-control journey-toggle" role="tablist" aria-label="Choose journey">
        <button className={mode === "tenant" ? "active" : ""} type="button" onClick={() => setMode("tenant")}>I am a Tenant</button>
        <button className={mode === "landlord" ? "active" : ""} type="button" onClick={() => setMode("landlord")}>I am a Landlord</button>
      </div>
      <h2>{title}</h2>
      <div className="journey-flow">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div className="journey-step-wrap" key={step.title}>
              <article className="journey-card">
                <span>{index + 1}</span>
                <Icon size={24} />
                <h3>{step.title}</h3>
              </article>
              {index < steps.length - 1 && <ArrowRight className="journey-arrow" aria-hidden="true" />}
            </div>
          );
        })}
      </div>
      <ol className="journey-details">
        {steps.map((step, index) => (
          <li className="journey-detail" key={step.title}>
            <span className="journey-detail-num">{index + 1}</span>
            <div className="journey-detail-body">
              <h3>{step.title}</h3>
              {step.description.map((line) => <p key={line}>{line}</p>)}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FaqPage() {
  const items = [
    ["Do tenants see their risk card?", "No. Landlords see practical verification outcomes and readiness signals. Private risk assessment details remain internal."],
    ["Are contracts still ASTs?", "No. Hilltro uses APT, meaning Assured Periodic Tenancy, across the signing journey."],
    ["Can landlords manage possession?", "Yes. The tenancy record tracks agreement, payment, move-in readiness and possession milestones."],
    ["Does messaging work?", "Yes. Messages support active threads, unread counts, attachments and contact-protection validation."]
  ];
  return (
    <main className="page">
      <section className="hero faq-hero">
        <p className="badge orange">FAQ</p>
        <h1>Clear answers for high-trust rental workflows.</h1>
        <p>Short, practical answers for tenants and landlords using Hilltro for referencing, offers, APT progression and payments.</p>
      </section>
      <section className="faq-list">
        {items.map(([question, answer], index) => (
          <article className="faq-item" key={question}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2>{question}</h2>
              <p>{answer}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

export function PrivacyPage() {
  return <InfoLanding badge="Privacy Policy" title="Privacy built for sensitive rental journeys." body="Hilltro is designed around identity, referencing, banking and tenancy data, with clear controls for profile information, uploaded documents and tenancy records." />;
}

export function OfferTermsPage() {
  return <InfoLanding badge="Offer Terms" title="Offer terms for structured rental applications." body="Hilltro structures rental offers with applicant confirmations, landlord responses, expiry windows and APT progression steps so both sides understand the status of an application." />;
}

export function ContactPage() {
  return <InfoLanding badge="Contact" title="Speak to Hilltro." body="For launch enquiries, landlord onboarding or support, use the final support inbox once configured." />;
}

export function LandlordsPage() {
  return <InfoLanding badge="Landlords" title="Manage applicants, offers and APT progression in one place." body="List properties, review verified applicants, manage viewings and keep rent workflows structured." />;
}

export function TenantsPage() {
  return <InfoLanding badge="Tenants" title="Search, reference and rent with less friction." body="Build your referencing profile once, request viewings, send offers and manage tenancy steps from a secure workspace." />;
}

function InfoLanding({ badge, title, body }: { badge: string; title: string; body: string }) {
  return (
    <main className="page">
      <section className="hero">
        <p className="badge orange">{badge}</p>
        <h1>{title}</h1>
        <p>{body}</p>
      </section>
    </main>
  );
}

export function TermsPage() {
  return (
    <main className="page">
      <section className="hero compact-hero"><p className="badge orange">Legal</p><h1>Hilltro Terms & Conditions.</h1><p>These terms explain the expected standards for using Hilltro to search, reference, list, offer, message and progress residential tenancies.</p></section>
      <section className="grid cols-2">
        <article className="card"><h3>Platform use</h3><p className="muted">Users agree to provide accurate information and use Hilltro workflows for legitimate rental activity only.</p></article>
        <article className="card"><h3>Verification and payments</h3><p className="muted">Identity, referencing, Open Banking, payment and APT signing services will be governed by final provider terms.</p></article>
      </section>
    </main>
  );
}
