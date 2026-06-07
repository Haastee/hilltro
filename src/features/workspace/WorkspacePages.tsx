import { Link } from "react-router-dom";
import { useState } from "react";
import { CreditCard, FileSignature, Home, MessageSquare, Settings, Star, UserRound, UsersRound, WalletCards } from "lucide-react";
import type { User } from "../../types/domain";
import { demoProperties } from "../../data/properties";
import { PropertyCard } from "../properties/PropertyCard";
import { HilltroAvatar } from "../../components/HilltroAvatar";
import { removeSavedHome, savedHomes, savedSearches } from "../../services/engagementService";

const tenantPages = {
  saved: {
    title: "Saved homes",
    intro: "Shortlist homes, compare affordability and keep next actions visible.",
    icon: Star
  },
  viewings: {
    title: "Viewings",
    intro: "Book, reschedule and track landlord-approved viewings.",
    icon: Home
  },
  offers: {
    title: "Offers",
    intro: "Send referenced offers and move approved tenancies into APT signing.",
    icon: FileSignature
  },
  payments: {
    title: "Payments",
    intro: "Track deposits, first month rent, receipts and upcoming rent safely.",
    icon: CreditCard
  },
  profile: {
    title: "Profile",
    intro: "Manage account details, phone verification and privacy controls.",
    icon: UserRound
  }
} as const;

const landlordPages = {
  applications: {
    title: "Interest",
    intro: "Review property interest through offers, viewings and message history.",
    icon: UsersRound
  },
  viewings: {
    title: "Viewings",
    intro: "Approve requests, coordinate slots and record attendance.",
    icon: Home
  },
  offers: {
    title: "Offers",
    intro: "Compare offers, accept one, then progress to APT signing.",
    icon: FileSignature
  },
  payments: {
    title: "Payments",
    intro: "Monitor rent collection, deposits, payouts and reconciliation.",
    icon: WalletCards
  },
  arrears: {
    title: "Arrears",
    intro: "Prioritise overdue rent, communication history and recovery status.",
    icon: CreditCard
  },
  settings: {
    title: "Settings",
    intro: "Manage organisation profile, payout details, users and property defaults.",
    icon: Settings
  }
} as const;

export function TenantWorkspacePage({ page, user }: { page: keyof typeof tenantPages; user: User }) {
  const meta = tenantPages[page];
  const Icon = meta.icon;
  const [, setSavedVersion] = useState(0);
  const homes = savedHomes(user.id);
  const searches = savedSearches(user.id);
  const savedProperties = homes.map((home) => demoProperties.find((property) => property.id === home.propertyId)).filter(Boolean) as typeof demoProperties;
  return (
    <main className="page">
      <section className="hero compact-hero"><p className="badge orange">Tenant workspace</p><h1>{meta.title}</h1><p>{meta.intro}</p></section>
      {page === "saved" ? (
        <section className="saved-workspace">
          <article className="card">
            <p className="eyebrow">Saved Homes</p>
            <h2>{savedProperties.length} saved {savedProperties.length === 1 ? "home" : "homes"}</h2>
            <p className="muted">Individual homes you explicitly saved from property pages.</p>
          </article>
          <article className="card">
            <p className="eyebrow">Saved Searches</p>
            <h2>{searches.length} saved {searches.length === 1 ? "search" : "searches"}</h2>
            <p className="muted">Search criteria and alert preferences saved from the search page.</p>
          </article>
          {savedProperties.length > 0 ? (
            <section className="grid cols-3">
              {savedProperties.map((property) => (
                <div className="saved-property-card" key={property.id}>
                  <PropertyCard property={property} />
                  <button className="btn tertiary destructive-text" type="button" onClick={() => { removeSavedHome(property.id, user.id); setSavedVersion((version) => version + 1); }}>Remove from Saved Homes</button>
                </div>
              ))}
            </section>
          ) : (
            <article className="card empty-state"><h2>No saved homes yet.</h2><p className="muted">Save a property from its listing page and it will appear here.</p><Link className="btn primary" to="/search">Search properties</Link></article>
          )}
          {searches.length > 0 && (
            <section className="saved-search-list">
              {searches.map((search) => <article className="card" key={search.id}><h3>{search.name}</h3><p className="muted">{savedSearchSummary(search.filters)}</p><Link className="btn" to={`/search?${new URLSearchParams(search.filters).toString()}`}>Open search</Link></article>)}
            </section>
          )}
        </section>
      ) : (
        <section className="workspace-layout">
          <article className="card ops-panel">
            <HilltroAvatar name={user.firstName} imageUrl={user.profileImageUrl} />
            <Icon size={30} />
            <h2>{meta.title}</h2>
            <p className="muted">{meta.intro} This workspace is connected to {user.email} and updates the same account state as the dashboard.</p>
            <div className="hero-actions"><Link className="btn primary" to={page === "profile" ? "/referencing" : "/messages"}>{page === "profile" ? "Open referencing profile" : "Message landlord"}</Link><Link className="btn" to="/tenant">Back to dashboard</Link></div>
          </article>
          <aside className="card step-list">
            {["Queued", "In review", "Approved", "APT ready"].map((item, index) => <div className={`step ${index === 1 ? "current" : ""}`} key={item}>{item}<span className="muted"> · {index + 1} item{index ? "s" : ""}</span></div>)}
          </aside>
        </section>
      )}
    </main>
  );
}

function savedSearchSummary(filters: Record<string, string>) {
  const active = Object.entries(filters).filter(([, value]) => value && value !== "Any" && value !== "Any Radius");
  return active.length ? active.map(([key, value]) => `${key}: ${value}`).join(" · ") : "No active criteria";
}

export function LandlordWorkspacePage({ page, user }: { page: keyof typeof landlordPages; user: User }) {
  const meta = landlordPages[page];
  const Icon = meta.icon;
  return (
    <main className="page">
      <section className="hero compact-hero"><p className="badge orange">Landlord operations</p><h1>{meta.title}</h1><p>{meta.intro}</p></section>
      <section className="workspace-layout">
        <article className="card ops-panel">
          <HilltroAvatar name={user.firstName} imageUrl={user.profileImageUrl} />
          <Icon size={30} />
          <h2>{meta.title}</h2>
          <p className="muted">{meta.intro} Activity is recorded against {user.email} for auditability, payments and tenancy progression.</p>
          <div className="hero-actions"><Link className="btn primary" to={page === "settings" ? "/landlord/properties/new" : "/messages"}>{page === "settings" ? "Create listing" : "Open messages"}</Link><Link className="btn" to="/landlord">Back to dashboard</Link></div>
        </article>
        <aside className="card step-list">
          {["Needs attention", "Ready today", "Awaiting tenant", "Completed"].map((item, index) => <div className={`step ${index === 0 ? "current" : ""}`} key={item}>{item}<span className="muted"> · {index + 2}</span></div>)}
        </aside>
      </section>
    </main>
  );
}

export type TenantPageKey = keyof typeof tenantPages;
export type LandlordPageKey = keyof typeof landlordPages;
