import { useEffect, useState } from "react";
import { referencingService } from "../../app/services";
import type { ReferencingStep } from "../../types/domain";

export function ReferencingPage() {
  const [steps, setSteps] = useState<ReferencingStep[]>([]);
  useEffect(() => { referencingService.steps().then(setSteps); }, []);
  return (
    <main className="page">
      <section className="hero">
        <p className="badge orange">Tenant Passport</p>
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
          <label>Date of birth *<input type="date" required /></label>
          <label>Current postcode *<input placeholder="NW3 1LH" autoComplete="postal-code" required /></label>
          <button className="btn primary">Save & continue</button>
        </article>
      </section>
    </main>
  );
}
