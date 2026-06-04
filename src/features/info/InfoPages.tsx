import { Link } from "react-router-dom";
import { CreditCard, FileCheck2, Landmark, ShieldCheck } from "lucide-react";

export function AboutPage() {
  return (
    <main className="page">
      <section className="hero"><p className="badge orange">About Haaste</p><h1>The rental operating system for tenants and landlords.</h1><p>Haaste brings search, identity, referencing, offers, APT signing, deposits and rent collection into one calm workflow.</p></section>
      <section className="grid cols-3">
        <article className="card"><ShieldCheck /><h3>Trust first</h3><p className="muted">Identity, AML and document checks are designed around regulated-provider integration points.</p></article>
        <article className="card"><Landmark /><h3>Money flows</h3><p className="muted">Deposits, rent, payouts and arrears are modelled as auditable operating workflows.</p></article>
        <article className="card"><FileCheck2 /><h3>APT native</h3><p className="muted">The agreement journey uses Assured Periodic Tenancy wording throughout the product.</p></article>
      </section>
    </main>
  );
}

export function PricingPage() {
  return (
    <main className="page">
      <section className="hero"><p className="badge orange">Pricing</p><h1>Simple pricing for a serious rental workflow.</h1><p>Tenants can search and complete a profile. Landlords pay for operations that save time, improve conversion and reduce risk.</p></section>
      <section className="grid cols-3">
        {["Tenant Passport", "Landlord Operations", "Managed Payments"].map((title, index) => (
          <article className="card pricing-card" key={title}>
            <span className="badge">{index === 0 ? "Tenant" : "Landlord"}</span>
            <h2>{title}</h2>
            <p className="muted">{index === 0 ? "Referencing, saved homes, viewings and secure offers." : index === 1 ? "Listings, verified applicants, APT signing and maintenance-ready records." : "Deposits, rent collection, receipts, arrears and payout reconciliation."}</p>
            <h3>{index === 0 ? "Free to start" : "Usage based"}</h3>
            <Link className="btn primary" to="/register">Create account</Link>
          </article>
        ))}
      </section>
    </main>
  );
}

export function FaqPage() {
  const items = [
    ["Do tenants see their risk card?", "No. Landlords see practical verification outcomes and readiness signals. Private risk assessment details remain internal."],
    ["Are contracts still ASTs?", "No. Haaste uses APT, meaning Assured Periodic Tenancy, across the signing journey."],
    ["Can landlords manage possession?", "Yes. The tenancy record tracks agreement, payment, move-in readiness and possession milestones."],
    ["Does messaging work?", "Yes. Messages support active threads, unread counts, attachments and contact-protection validation."]
  ];
  return (
    <main className="page">
      <section className="hero"><p className="badge orange">FAQ</p><h1>Clear answers for high-trust rental workflows.</h1></section>
      <section className="grid cols-2">{items.map(([question, answer]) => <article className="card" key={question}><h3>{question}</h3><p className="muted">{answer}</p></article>)}</section>
    </main>
  );
}

export function TermsPage() {
  return (
    <main className="page">
      <section className="hero compact-hero"><p className="badge orange">Legal</p><h1>Haaste Terms & Conditions.</h1><p>This placeholder structure will be replaced with final legal terms before launch.</p></section>
      <section className="grid cols-2">
        <article className="card"><h3>Platform use</h3><p className="muted">Users agree to provide accurate information and use Haaste workflows for legitimate rental activity only.</p></article>
        <article className="card"><h3>Verification and payments</h3><p className="muted">Identity, referencing, Open Banking, payment and APT signing services will be governed by final provider terms.</p></article>
      </section>
    </main>
  );
}
