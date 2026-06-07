import { useEffect, useState } from "react";
import { referencingService } from "../../app/services";
import { CalendarField } from "../../components/CalendarField";
import type { ReferencingStep, TenantPassport } from "../../types/domain";

export function ReferencingPage() {
  const [steps, setSteps] = useState<ReferencingStep[]>([]);
  const [assessment, setAssessment] = useState<TenantPassport | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  useEffect(() => {
    referencingService.steps().then(setSteps);
    referencingService.tenantPassport().then((result) => {
      setAssessment(result);
      localStorage.setItem("hilltro.affordability.assessment", JSON.stringify({ affordabilityPcm: result.affordabilityPcm, completedAt: result.completionDate }));
    });
  }, []);
  return (
    <main className="page">
      <section className="hero">
        <p className="badge orange">Referencing</p>
        <h1>Complete referencing without the paperwork feeling.</h1>
        <p>Step 1 of 8. Average completion time: 6 minutes. Save and continue later at any point.</p>
        <div className="progress"><span style={{ width: "12.5%" }} /></div>
      </section>
      <section className="workflow">
        <aside className="card step-list">{steps.map((step) => <div key={step.id} className={`step ${step.status}`}>{step.title}</div>)}</aside>
        <article className="card form-grid">
          <h2>Personal details</h2>
          <p className="form-note">* Required field</p>
          <div className="form-grid two">
            <label>First Name *<input autoComplete="given-name" required /></label>
            <label>Middle Name (optional)<input autoComplete="additional-name" /></label>
          </div>
          <label>Last Name *<input autoComplete="family-name" required /></label>
          <CalendarField label="Date of birth *" value={dateOfBirth} onChange={setDateOfBirth} required />
          <label>Current postcode *<input placeholder="NW3 1LH" autoComplete="postal-code" required /></label>
          <button className="btn primary">Save & continue</button>
        </article>
        <aside className="card affordability-assessment-card">
          <span className="badge orange">Your Affordability Assessment</span>
          <h2>You may be able to afford properties up to £{(assessment?.affordabilityPcm || 2800).toLocaleString("en-GB")} per month.</h2>
          <p className="muted">Hilltro can use this result later for property recommendations, offer guidance and search filtering.</p>
        </aside>
      </section>
    </main>
  );
}
