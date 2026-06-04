import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../utils/supabase";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) {
      setError(error.message);
      return;
    }
    setMessage("Reset link sent. Check your email to continue.");
  }

  return (
    <main className="page auth-page">
      <section className="auth-shell">
        <div className="auth-copy"><p className="badge orange">Password reset</p><h1>Reset access securely.</h1><p>We will email a secure reset link for your Haaste account.</p></div>
        <form className="card form-grid auth-card" onSubmit={submit}>
          <p className="form-note">* Required field</p>
          <label>Email *<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required /></label>
          <button className="btn primary">Send reset link</button>
          {message && <p className="notice success">{message}</p>}
          {error && <p className="notice error">{error}</p>}
        </form>
      </section>
    </main>
  );
}

export function ResetPasswordPage() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) {
      setError("Passwords do not match.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <main className="page auth-page">
      <section className="auth-shell">
        <div className="auth-copy"><p className="badge orange">New password</p><h1>Create a new password.</h1><p>Use a strong password before returning to your workspace.</p></div>
        <form className="card form-grid auth-card" onSubmit={submit}>
          {!done && <><p className="form-note">* Required field</p><label>New Password *<input name="password" type="password" required minLength={8} /></label><label>Confirm Password *<input name="confirm" type="password" required minLength={8} /></label><button className="btn primary">Update password</button></>}
          {error && <p className="notice error">{error}</p>}
          {done && <p className="notice success">Password updated. <Link to="/login">Return to login</Link></p>}
        </form>
      </section>
    </main>
  );
}
