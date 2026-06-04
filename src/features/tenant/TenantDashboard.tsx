import { Link } from "react-router-dom";
import type { User } from "../../types/domain";
import { firstNameForGreeting } from "../../utils/name";

export function TenantDashboard({ user }: { user: User }) {
  return (
    <main className="page">
      <section className="hero">
        <p className="badge orange">Tenant workspace</p>
        <h1>Referencing takes 6 minutes on average, {firstNameForGreeting(user)}.</h1>
        <p>Complete your Tenant Passport once, then search, book viewings, submit offers and manage your tenancy without leaving Haaste.</p>
        <div className="hero-actions"><Link className="btn primary" to="/referencing">Complete referencing</Link><Link className="btn light" to="/search">Search properties</Link></div>
      </section>
      <section className="grid cols-4">
        <article className="card"><span className="badge">Affordability</span><h2>£3,250 pcm</h2><p className="muted">Open Banking estimate.</p><Link className="btn" to="/tenant/profile">Profile</Link></article>
        <article className="card"><span className="badge">Viewings</span><h2>2</h2><p className="muted">One awaiting landlord approval.</p><Link className="btn" to="/tenant/viewings">Manage</Link></article>
        <article className="card"><span className="badge">Offers</span><h2>1</h2><p className="muted">Submitted and auditable.</p><Link className="btn" to="/tenant/offers">Open offers</Link></article>
        <article className="card"><span className="badge orange">Messages</span><h2>1 unread</h2><p className="muted">Secure platform communications.</p><Link className="btn" to="/messages">Reply</Link></article>
      </section>
      <section className="grid cols-3" style={{ marginTop: 18 }}>
        <Link className="card action-card" to="/tenant/saved"><h3>Saved homes</h3><p className="muted">Compare shortlisted homes and affordability.</p></Link>
        <Link className="card action-card" to="/tenant/payments"><h3>Payments</h3><p className="muted">Deposits, rent and receipts.</p></Link>
        <Link className="card action-card" to="/referencing"><h3>Tenant Passport</h3><p className="muted">Complete referencing once and reuse it.</p></Link>
      </section>
    </main>
  );
}
