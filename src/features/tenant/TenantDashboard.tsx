import { Link } from "react-router-dom";
import { BadgeCheck, CalendarCheck, Check, FileSignature, FileText } from "lucide-react";
import type { User } from "../../types/domain";
import { firstNameForGreeting } from "../../utils/name";
import { HilltroAvatar } from "../../components/HilltroAvatar";
import { savedHomes, savedSearches } from "../../services/engagementService";

export function TenantDashboard({ user }: { user: User }) {
  const homesCount = savedHomes(user.id).length;
  const searchesCount = savedSearches(user.id).length;
  return (
    <main className="page">
      <section className="hero landlord-dashboard-hero tenant-dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="badge orange">Tenant workspace</p>
          <div className="dashboard-profile-line"><HilltroAvatar name={user.firstName} imageUrl={user.profileImageUrl} /><span>Referencing profile</span></div>
          <h1>Complete quick referencing, {firstNameForGreeting(user)}.</h1>
          <p>Receive your private affordability assessment, request viewings, send offers and sign contracts — all in Hilltro.</p>
          <div className="hero-actions"><Link className="btn primary" to="/referencing">Complete referencing</Link><Link className="btn light" to="/search">Search properties</Link></div>
        </div>

        <div className="dashboard-hero-visual tenant-dashboard-visual" aria-hidden="true">
          {/* 1 — referencing */}
          <article className="ll-card tn-dash-card">
            <div className="ll-contract-head">
              <span className="ll-contract-icon"><BadgeCheck size={16} /></span>
              <div><b>Referencing</b><small>Quick, secure checks</small></div>
              <span className="ll-signed"><Check size={11} /> Complete</span>
            </div>
            <div className="tn-fields">
              <div className="tn-field"><span>Full name</span><Check size={14} /></div>
              <div className="tn-field"><span>Current address</span><Check size={14} /></div>
              <div className="tn-field"><span>Employment status</span><Check size={14} /></div>
            </div>
            <div className="tn-progress"><span style={{ width: "100%" }} /></div>
          </article>

          {/* 2 — affordability assessment */}
          <article className="ll-card tn-dash-card">
            <header className="ll-applicant-head">
              <HilltroAvatar name="Emily Dawson" size="md" />
              <div className="ll-applicant-id">
                <b>Emily D. <BadgeCheck size={15} className="ll-verified" /></b>
                <small>Quantitative Analyst · Finance</small>
              </div>
              <span className="ll-signed"><Check size={11} /> Verified</span>
            </header>
            <div className="ll-afford">
              <small>Affordability Assessment</small>
              <b><em>Up to</em> £4,166<span> pcm</span></b>
            </div>
          </article>

          {/* 3 — viewing, offer and contract signing flow */}
          <article className="ll-card tn-dash-card">
            <div className="tn-flow-row">
              <span className="tn-flow-icon"><CalendarCheck size={15} /></span>
              <div><b>Viewing request sent</b><small>Awaiting landlord approval</small></div>
              <span className="ll-signed">Sent</span>
            </div>
            <div className="tn-flow-row">
              <span className="tn-flow-icon"><FileSignature size={15} /></span>
              <div><b>Offer submitted</b><small>£4,000 pcm · 12-month term</small></div>
              <span className="ll-signed">Submitted</span>
            </div>
            <div className="tn-flow-row">
              <span className="tn-flow-icon contract"><FileText size={15} /></span>
              <div><b>Contract ready to sign</b><small>Assured periodic tenancy</small></div>
              <span className="ll-signed"><Check size={11} /> Ready</span>
            </div>
          </article>
        </div>
      </section>

      <section className="grid cols-4">
        <article className="card"><span className="badge">Affordability</span><h2>Pending</h2><p className="muted">Complete referencing to calculate this securely.</p><Link className="btn" to="/tenant/profile">Profile</Link></article>
        <article className="card"><span className="badge">Viewings</span><h2>0</h2><p className="muted">No viewing requests yet.</p><Link className="btn" to="/tenant/viewings">Manage</Link></article>
        <article className="card"><span className="badge">Saved Homes</span><h2>{homesCount}</h2><p className="muted">{homesCount ? "Shortlisted homes ready to compare." : "No saved homes yet."}</p><Link className="btn" to="/tenant/saved">Open saved</Link></article>
        <article className="card"><span className="badge orange">Messages</span><h2>0</h2><p className="muted">No unread conversations yet.</p><Link className="btn" to="/messages">Open messages</Link></article>
      </section>
      <section className="grid cols-3" style={{ marginTop: 18 }}>
        <Link className="card action-card" to="/tenant/saved"><h3>Saved searches</h3><p className="muted">{searchesCount} saved {searchesCount === 1 ? "search" : "searches"} with alert settings.</p></Link>
        <Link className="card action-card" to="/tenant/payments"><h3>Payments</h3><p className="muted">Deposits, rent and receipts.</p></Link>
        <Link className="card action-card" to="/referencing"><h3>Affordability Assessment</h3><p className="muted">Complete referencing once and use the result across Hilltro.</p></Link>
      </section>
    </main>
  );
}
