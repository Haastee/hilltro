import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "../../app/services";
import type { User } from "../../types/domain";

export function RegisterPage({ onAuth }: { onAuth: (user: User) => void }) {
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initialRole = params.get("role")?.toLowerCase() === "landlord" ? "LANDLORD" : "TENANT";
  const strong = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!strong) return setError("Password must include uppercase, lowercase, number and special character.");
    if (form.get("terms") !== "on") return setError("You need to agree to Haaste Terms & Conditions before continuing.");
    setLoading(true);
    setError("");
    try {
      const user = await authService.register({
        firstName: String(form.get("firstName")),
        middleName: String(form.get("middleName") || ""),
        lastName: String(form.get("lastName")),
        email: String(form.get("email")),
        phone: `${form.get("country")} ${form.get("phone")}`,
        password,
        role: form.get("role") as User["role"]
      });
      onAuth(user);
      navigate(params.get("next") || (user.role === "LANDLORD" ? "/landlord" : "/tenant"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page auth-page">
      <section className="auth-shell">
        <div className="auth-copy">
          <p className="badge orange">Create account</p>
          <h1>Start with the right workspace.</h1>
          <p>Tenant and landlord accounts branch into different guided experiences immediately after sign up.</p>
        </div>
        <form className="card form-grid auth-card" onSubmit={submit}>
          <p className="form-note">* Required field</p>
          <label>Role *<select name="role" defaultValue={initialRole} required><option value="TENANT">Tenant</option><option value="LANDLORD">Landlord</option></select></label>
          <div className="form-grid two">
            <label>First Name *<input name="firstName" autoComplete="given-name" required /></label>
            <label>Middle Name (optional)<input name="middleName" autoComplete="additional-name" /></label>
          </div>
          <label>Last Name *<input name="lastName" autoComplete="family-name" required /></label>
          <label>Email *<input name="email" type="email" autoComplete="email" required /></label>
          <label>Phone Number *<div className="form-grid two"><select name="country" aria-label="Country code" required><option value="+44">+44 United Kingdom</option><option value="+1">+1 United States</option><option value="+33">+33 France</option></select><input name="phone" type="tel" autoComplete="tel" required /></div></label>
          <label>Password *<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" required /></label>
          <p className={strong ? "badge" : "badge orange"}>{strong ? "Strong password" : "8+ chars, uppercase, lowercase, number, special character"}</p>
          <label className="checkbox-row"><input name="terms" type="checkbox" required /> <span>I agree to Haaste <Link to="/terms">Terms & Conditions</Link> *</span></label>
          {error && <p className="notice error">{error}</p>}
          <button className="btn primary" type="submit" disabled={loading}>{loading ? "Creating account..." : "Create account"}</button>
          <p className="muted">Already have an account? <Link className="strong-link" to="/login">Log in</Link></p>
        </form>
      </section>
    </main>
  );
}
