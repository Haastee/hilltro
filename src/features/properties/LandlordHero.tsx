import { Fragment } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Building2, Check, ChevronRight, Clock, FileText } from "lucide-react";
import { assetUrl } from "../../utils/asset";
import { HilltroAvatar } from "../../components/HilltroAvatar";

const journey = [
  "List for free",
  "Referenced viewing requests",
  "Show your property",
  "Accept offer",
  "Sign contract"
];

export function LandlordHero() {
  return (
    <section className="home-hero landlord-hero">
      <div className="home-hero-copy">
        <p className="eyebrow">For landlords</p>
        <h1>List your property.<br />Let with confidence.</h1>
        <p>Receive enquiries from pre-referenced tenants, manage viewings, compare applicants, accept offers and progress tenancies — all from one platform.</p>
        <div className="hero-actions landlord-actions">
          <Link className="btn primary" to="/register?role=Landlord"><Building2 size={18} /> List your property</Link>
          <Link className="btn secondary" to="/how-it-works?role=landlord">See how it works</Link>
        </div>
        <ol className="ll-journey" aria-label="Landlord journey">
          {journey.map((label, index) => (
            <Fragment key={label}>
              <li className="ll-journey-step">
                <i>{index + 1}</i>
                <span>{label}</span>
              </li>
              {index < journey.length - 1 && <ChevronRight className="ll-journey-arrow" size={15} aria-hidden="true" />}
            </Fragment>
          ))}
        </ol>
      </div>

      <div className="hero-composition landlord-composition" aria-hidden="true">
        {/* 1 — list property */}
        <article className="ll-card ll-listing">
          <img src={assetUrl("assets/properties/kensington-apartment.png")} alt="" />
          <div className="ll-listing-body">
            <span className="ll-status"><i /> Live</span>
            <b>£4,000 pcm</b>
            <small>Well Road, Hampstead, NW3</small>
            <span className="ll-listing-meta">Listed for free · Maisonette · 2 bed</span>
          </div>
        </article>

        {/* 2 — pre-referenced applicant (focal) */}
        <article className="ll-card ll-applicant">
          <header className="ll-applicant-head">
            <HilltroAvatar name="Emily Dawson" size="md" />
            <div className="ll-applicant-id">
              <b>Emily D. <BadgeCheck size={15} className="ll-verified" /></b>
              <small>Quantitative Analyst · Finance</small>
            </div>
            <span className="ll-timer"><Clock size={12} /> 24h left</span>
          </header>

          <div className="ll-afford">
            <small>Affordability</small>
            <b><em>Up to</em> £4,166<span> pcm</span></b>
          </div>

          <dl className="ll-meta">
            <div><dt>Move-in</dt><dd>In 2 weeks</dd></div>
            <div><dt>Requests</dt><dd>None</dd></div>
          </dl>

          <div className="ll-risk">
            <div className="ll-risk-label">
              <small>Risk score</small>
              <b>Low risk</b>
            </div>
            <div className="ll-risk-meter"><i /></div>
          </div>

          <div className="ll-applicant-actions">
            <span className="btn ll-accept"><Check size={15} /> Accept</span>
            <span className="btn ll-decline">Decline</span>
          </div>
        </article>

        {/* 3 — contract signing */}
        <article className="ll-card ll-contract">
          <div className="ll-contract-head">
            <span className="ll-contract-icon"><FileText size={16} /></span>
            <div>
              <b>Tenancy agreement</b>
              <small>Assured periodic tenancy</small>
            </div>
            <span className="ll-signed"><Check size={11} /> Signed</span>
          </div>
          <div className="ll-sign-field">
            <span className="ll-signature">Emily D.</span>
          </div>
          <div className="ll-contract-status"><Check size={13} /> Completed · deposit protected</div>
        </article>
      </div>
    </section>
  );
}
