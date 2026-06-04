import { Link } from "react-router-dom";
import type { User } from "../../types/domain";
import { firstNameForGreeting } from "../../utils/name";

export function LandlordDashboard({ user }: { user: User }) {
  return (
    <main className="page">
      <section className="hero">
        <p className="badge orange">Landlord operations</p>
        <h1>Ready to let your next property, {firstNameForGreeting(user)}?</h1>
        <p>Manage listings, verified renters, viewings, offers, rent collection and arrears from one operational workspace.</p>
        <div className="hero-actions"><Link className="btn primary" to="/landlord/properties">My Properties</Link><Link className="btn light" to="/landlord/properties/new">Create listing</Link><Link className="btn light" to="/photography">Book photography</Link></div>
      </section>
      <section className="grid cols-4">
        <article className="card"><span className="badge">Active listings</span><h2>8</h2><p className="muted">3 require ownership review.</p><Link className="btn" to="/landlord/properties">Manage properties</Link></article>
        <article className="card"><span className="badge">Offers</span><h2>14</h2><p className="muted">Referenced offers and interest ready.</p><Link className="btn" to="/landlord/offers">Review</Link></article>
        <article className="card"><span className="badge">Rent collected</span><h2>£42.8k</h2><p className="muted">This month.</p><Link className="btn" to="/landlord/payments">Payments</Link></article>
        <article className="card"><span className="badge orange">Attention</span><h2>3</h2><p className="muted">Arrears or expiring documents.</p><Link className="btn" to="/landlord/arrears">Resolve</Link></article>
      </section>
      <section className="grid cols-3" style={{ marginTop: 18 }}>
        <Link className="card action-card" to="/landlord/viewings"><h3>Viewings</h3><p className="muted">Approve requests and arrange slots.</p></Link>
        <Link className="card action-card" to="/landlord/offers"><h3>Offers</h3><p className="muted">Accept and progress to APT signing.</p></Link>
        <Link className="card action-card" to="/landlord/settings"><h3>Settings</h3><p className="muted">Organisation, payout and verification settings.</p></Link>
      </section>
    </main>
  );
}
