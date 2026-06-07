import { Link } from "react-router-dom";
import type { User } from "../../types/domain";
import { firstNameForGreeting } from "../../utils/name";
import { landlordById, landlordStats } from "../../data/landlordProperties";
import { HilltroAvatar } from "../../components/HilltroAvatar";

export function LandlordDashboard({ user }: { user: User }) {
  const stats = landlordStats();
  const profile = landlordById();
  return (
    <main className="page">
      <section className="hero">
        <p className="badge orange">Landlord operations</p>
        <div className="dashboard-profile-line"><HilltroAvatar name={user.firstName} imageUrl={user.profileImageUrl || profile.profilePhotoUrl} /><span>{profile.landlordType}</span></div>
        <h1>Ready to let your next property, {firstNameForGreeting(user)}?</h1>
        <p>Manage listings, verified renters, viewings, offers, rent collection and arrears from one operational workspace.</p>
        <div className="hero-actions"><Link className="btn primary" to="/landlord/properties">My Properties</Link><Link className="btn light" to="/landlord/properties/new">Create listing</Link><Link className="btn light" to="/photography">Book photography</Link></div>
      </section>
      <section className="grid cols-4">
        <article className="card"><span className="badge">Properties Listed</span><h2>{stats.propertiesListed}</h2><p className="muted">Live properties owned by this landlord.</p><Link className="btn" to="/landlord/properties">Manage properties</Link></article>
        <article className="card"><span className="badge">Viewing Requests</span><h2>{stats.viewingRequests}</h2><p className="muted">Pending or scheduled viewing activity.</p><Link className="btn" to="/landlord/viewings">Review</Link></article>
        <article className="card"><span className="badge">Offers</span><h2>{stats.offers}</h2><p className="muted">Open offers awaiting a landlord decision.</p><Link className="btn" to="/landlord/offers">Review</Link></article>
        <article className="card"><span className="badge orange">Messages</span><h2>{stats.messages}</h2><p className="muted">Property-linked applicant conversations.</p><Link className="btn" to="/messages">Open messages</Link></article>
      </section>
      <section className="grid cols-3" style={{ marginTop: 18 }}>
        <Link className="card action-card" to="/landlord/viewings"><h3>Viewings</h3><p className="muted">Approve requests and arrange slots.</p></Link>
        <Link className="card action-card" to="/landlord/offers"><h3>Offers</h3><p className="muted">Accept and progress to APT signing.</p></Link>
        <Link className="card action-card" to="/landlord/settings"><h3>Settings</h3><p className="muted">Organisation, payout and verification settings.</p></Link>
      </section>
    </main>
  );
}
