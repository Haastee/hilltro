import { FormEvent, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../../app/services";
import type { User } from "../../types/domain";

export function LoginPage({ onAuth }: { onAuth: (user: User) => void }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [touched, setTouched] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    if (!email.includes("@") || password.length < 8) {
      setError("Enter a valid email and your full password.");
      return;
    }
    setLoading(true);
    try {
      const user = await authService.login(email, password);
      setSuccess("Signed in. Opening your workspace...");
      onAuth(user);
      window.setTimeout(() => navigate(user.role === "LANDLORD" ? "/landlord" : "/tenant"), 280);
    } catch {
      setError("Those details did not match an account. Check the password or reset it securely.");
      setPasswordValue("");
      window.setTimeout(() => passwordRef.current?.focus(), 30);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page auth-page">
      <section className="auth-shell">
        <div className="auth-copy">
          <p className="badge orange">Secure access</p>
          <h1>Welcome back.</h1>
          <p>Sign in to continue referencing, payments, APT signing and property operations inside Haaste.</p>
        </div>
        <form className={`card form-grid auth-card ${error ? "shake" : ""}`} onSubmit={submit}>
          <p className="form-note">* Required field</p>
          <label>Email *<input className={touched && error ? "field-error" : ""} name="email" type="email" autoComplete="email" required /></label>
          <label>Password *<input ref={passwordRef} className={touched && error ? "field-error" : ""} name="password" type="password" autoComplete="current-password" required value={passwordValue} onChange={(event) => setPasswordValue(event.target.value)} /></label>
          <div className="form-row"><Link to="/forgot-password">Forgot Password?</Link><Link className="strong-link" to="/register">Don't have an account? Sign Up</Link></div>
          {error && <p className="notice error">{error}</p>}
          {success && <p className="notice success">{success}</p>}
          <button className="btn primary" disabled={loading}>{loading ? "Checking..." : "Log in"}</button>
        </form>
      </section>
    </main>
  );
}
