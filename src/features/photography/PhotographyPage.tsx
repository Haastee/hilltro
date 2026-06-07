import { FormEvent, useState } from "react";
import { photographerService } from "../../app/services";

export function PhotographyPage() {
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await photographerService.request({
      propertyAddress: String(form.get("propertyAddress")),
      contactName: [form.get("firstName"), form.get("middleName"), form.get("lastName")].filter(Boolean).join(" "),
      phone: String(form.get("phone")),
      email: String(form.get("email")),
      preferredDates: String(form.get("preferredDates")),
      notes: String(form.get("notes"))
    });
    setDone(true);
  }
  return (
    <main className="page">
      <section className="hero"><h1>Book Photography with Hilltro.</h1><p>Request professional photography for your listing. A member of the Hilltro photography team will contact you shortly.</p></section>
      <form className="card form-grid" onSubmit={submit} style={{ maxWidth: 760, margin: "0 auto" }} noValidate>
        <p className="form-note">* Required field</p>
        <label>Property address *<input name="propertyAddress" required /></label>
        <div className="form-grid two">
          <label>First Name *<input name="firstName" autoComplete="given-name" required /></label>
          <label>Middle Name (optional)<input name="middleName" autoComplete="additional-name" /></label>
        </div>
        <label>Last Name *<input name="lastName" autoComplete="family-name" required /></label>
        <label>Phone Number *<input name="phone" type="tel" required /></label>
        <label>Email *<input name="email" type="email" required /></label>
        <label>Preferred dates *<input name="preferredDates" required /></label>
        <label>Additional notes (optional)<textarea name="notes" /></label>
        {done && <p className="badge orange">A member of the Hilltro photography team will contact you shortly.</p>}
        <button className="btn primary">Submit request</button>
      </form>
    </main>
  );
}
