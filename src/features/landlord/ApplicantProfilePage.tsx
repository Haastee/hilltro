import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { MessageSquare, ShieldCheck } from "lucide-react";
import { applicantById, propertyAddress } from "../../data/landlordProperties";
import { HilltroAvatar } from "../../components/HilltroAvatar";
import { supabase } from "../../utils/supabase";

const isUuid = (value?: string) =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function ApplicantProfilePage() {
  const { applicantId } = useParams();
  const [params] = useSearchParams();
  const propertyId = params.get("property") || undefined;
  const real = isUuid(applicantId);

  // Real applicants: the name is disclosed server-side — "First L." while only an
  // offer/viewing links the parties, full name once a deal exists. Demo applicants
  // keep their demo records so the pre-launch experience stays populated.
  const demo = applicantById(applicantId) || applicantById("app-taylor")!;
  const [disclosedName, setDisclosedName] = useState<string | null>(null);

  useEffect(() => {
    if (!real || !applicantId) return;
    supabase.rpc("get_counterparty_profile", { target: applicantId }).then(({ data }) => {
      if (data && typeof data === "object" && "display_name" in data) {
        setDisclosedName((data as { display_name: string | null }).display_name);
      }
    });
  }, [real, applicantId]);

  const applicant = real
    ? {
        id: applicantId!,
        name: disclosedName || "Applicant",
        profileImageUrl: undefined as string | undefined,
        referencingStatus: "In review",
        affordabilityPcm: undefined as number | undefined,
        employmentStatus: "Not supplied",
        moveDate: undefined as string | undefined,
        occupants: undefined as string | undefined,
        pets: undefined as string | undefined
      }
    : demo;

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
