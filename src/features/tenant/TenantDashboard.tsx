import { Link } from "react-router-dom";
import type { User } from "../../types/domain";
import { firstNameForGreeting } from "../../utils/name";
import { HilltroAvatar } from "../../components/HilltroAvatar";
import { savedHomes, savedSearches } from "../../services/engagementService";

export function TenantDashboard({ user }: { user: User }) {
  const homesCount = savedHomes(user.id).length;
  const searchesCount = savedSearches(user.id).length;
  return (
    <main className="page">
      <section className="hero">
        <p className="badge orange">Tenant workspace</p>
        <div className="dashboard-profile-line"><HilltroAvatar name={user.firstName} imageUrl={user.profileImageUrl} /><span>Referencing profile</span></div>
        <h1>Build your rental profile, {firstNameForGreeting(user)}.</h1>
        <p>Complete referencing once, then use your affordability assessment to search, book viewings, submit offers and manage your tenancy without leaving Hilltro.</p>
        <div className="hero-actions"><Link className="btn primary" to="/referencing">Complete referencing</Link><Link className="btn light" to="/search">Search properties</Link></div>
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
