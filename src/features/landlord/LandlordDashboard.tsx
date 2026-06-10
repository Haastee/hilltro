import { Link } from "react-router-dom";
import { BadgeCheck, BadgePoundSterling, Check, FileText, MessageSquare } from "lucide-react";
import type { User } from "../../types/domain";
import { firstNameForGreeting } from "../../utils/name";
import { landlordById, landlordStats } from "../../data/landlordProperties";
import { HilltroAvatar } from "../../components/HilltroAvatar";

export function LandlordDashboard({ user }: { user: User }) {
  const stats = landlordStats();
  const profile = landlordById();
  return (
    <main className="page">
      <section className="hero landlord-dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="badge orange">Landlord operations</p>
          <div className="dashboard-profile-line"><HilltroAvatar name={user.firstName} imageUrl={user.profileImageUrl || profile.profilePhotoUrl} /><span>{profile.landlordType}</span></div>
          <h1>Ready to let your next property, {firstNameForGreeting(user)}?</h1>
          <p>Manage listings, verified renters, viewings, offers, rent collection and arrears from one operational workspace.</p>
          <div className="hero-actions"><Link className="btn primary" to="/landlord/properties">My Properties</Link><Link className="btn light" to="/landlord/properties/new">Create listing</Link><Link className="btn light" to="/photography">Book photography</Link></div>
        </div>

        <div className="dashboard-hero-visual" aria-hidden="true">
          {/* Pre-referenced tenants */}
          <article className="ll-card dash-card dash-applicant">
            <header className="dash-applicant-head">
              <HilltroAvatar name="Emily Dawson" size="md" />
              <div className="dash-applicant-id">
                <b>Emily D. <BadgeCheck size={14} className="ll-verified" /></b>
                <small>Pre-referenced · Quantitative Analyst</small>
              </div>
              <span className="dash-tag green">Low risk</span>
            </header>
            <div className="dash-applicant-meta">
              <div><small>Affordability</small><b>Up to £4,166</b></div>
              <div><small>Move-in</small><b>In 2 weeks</b></div>
            </div>
          </article>

          {/* Payment & contract handling */}
          <article className="ll-card dash-card dash-pay">
            <div className="dash-pay-row">
              <span className="dash-pay-icon"><BadgePoundSterling size={16} /></span>
              <div><b>Rent collected</b><small>£4,000 · on time</small></div>
              <span className="dash-ok">Paid</span>
            </div>
            <div className="dash-pay-row">
              <span className="dash-pay-icon contract"><FileText size={16} /></span>
              <div><b>Tenancy agreement</b><small>Deposit protected</small></div>
              <span className="dash-ok"><Check size={11} /> Signed</span>
            </div>
          </article>

          {/* Tenancy management */}
          <article className="ll-card dash-card dash-chat">
            <div className="dash-chat-head"><MessageSquare size={14} /> Tenancy chat</div>
            <div className="dash-bubble tenant">Hi, it looks like my washing machine has stopped working?</div>
            <div className="dash-bubble landlord">No problem — an engineer is on the way.</div>
          </article>

          <p className="dash-all-in">All in Hilltro.</p>
        </div>
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
