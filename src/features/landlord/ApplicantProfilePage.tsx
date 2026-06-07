import { Link, useParams, useSearchParams } from "react-router-dom";
import { MessageSquare, ShieldCheck } from "lucide-react";
import { applicantById, propertyAddress } from "../../data/landlordProperties";
import { HilltroAvatar } from "../../components/HilltroAvatar";

export function ApplicantProfilePage() {
  const { applicantId } = useParams();
  const [params] = useSearchParams();
  const propertyId = params.get("property") || undefined;
  const applicant = applicantById(applicantId) || applicantById("app-taylor")!;
  return (
    <main className="page">
      <section className="applicant-profile-hero">
        <HilltroAvatar name={applicant.name} imageUrl={applicant.profileImageUrl} size="lg" />
        <div>
          <p className="badge orange">Applicant Profile</p>
          <h1>{applicant.name}</h1>
          <p className="muted">{propertyId ? `Interested in ${propertyAddress(propertyId)}` : "Applicant details and communication context."}</p>
        </div>
      </section>
      <section className="grid cols-3">
        <article className="card"><ShieldCheck /><h3>Referencing status</h3><p className="muted">{applicant.referencingStatus}</p></article>
        <article className="card"><h3>Affordability result</h3><p className="muted">{applicant.affordabilityPcm ? `Up to £${applicant.affordabilityPcm.toLocaleString("en-GB")} pcm` : "Not supplied"}</p></article>
        <article className="card"><h3>Employment status</h3><p className="muted">{applicant.employmentStatus}</p></article>
      </section>
      <section className="grid cols-3" style={{ marginTop: 18 }}>
        <article className="card"><h3>Move date</h3><p className="muted">{applicant.moveDate ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(applicant.moveDate)) : "Not supplied"}</p></article>
        <article className="card"><h3>Occupancy</h3><p className="muted">{applicant.occupants || "Not supplied"}</p></article>
        <article className="card"><h3>Pets</h3><p className="muted">{applicant.pets || "Not supplied"}</p></article>
      </section>
      <section className="card applicant-message-card">
        <MessageSquare size={26} />
        <h2>Send Message</h2>
        <p className="muted">Start or continue the property-linked conversation with this applicant.</p>
        <Link className="btn primary" to={`/messages?applicant=${applicant.id}${propertyId ? `&property=${propertyId}` : ""}`}>Open conversation</Link>
      </section>
    </main>
  );
}
