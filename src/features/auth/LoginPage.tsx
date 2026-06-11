import { FormEvent, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { authService } from "../../app/services";
import type { User } from "../../types/domain";
import { FloatingInput } from "../../components/FloatingField";

export function LoginPage({ onAuth }: { onAuth: (user: User) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const passwordRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  function continueToPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setStep(2);
    window.setTimeout(() => passwordRef.current?.focus(), 80);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (passwordValue.length < 8) {
      setError("Enter your full password.");
      return;
    }
    setLoading(true);
    try {
      const user = await authService.login(email, passwordValue);
      setSuccess("Signed in. Opening your workspace...");
      onAuth(user);
      window.setTimeout(() => navigate(user.role === "LANDLORD" ? "/landlord" : "/tenant"), 280);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/email not confirmed|not confirmed|confirm your email/i.test(message)) {
        setError("Please confirm your email first. Open the confirmation link we sent you, then log in.");
      } else {
        setError("Those details did not match an account. Check the password or reset it securely.");
      }
      setPasswordValue("");
      window.setTimeout(() => passwordRef.current?.focus(), 30);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page premium-auth-page">
      <section className="auth-shell premium-auth-shell">
        <div className="auth-copy premium-auth-copy">
          <p className="eyebrow">Secure access</p>
          <h1>Welcome back.</h1>
          <p>Sign in to find, rent, and manage. All in one place.</p>
          <div className="auth-progress"><span style={{ width: step === 1 ? "50%" : "100%" }} /></div>
        </div>

        {step === 1 && (
          <form className="auth-card premium-auth-card" onSubmit={continueToPassword} noValidate>
            <p className="form-note">Step 1 of 2</p>
            <h2>Your email address</h2>
            <FloatingInput label="Email *" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} trailing={<Mail size={18} />} />
            {error && <p className="notice error">{error}</p>}
            <button className="btn primary" type="submit">Continue <ArrowRight size={18} /></button>
            <p className="muted">No account yet? <Link className="strong-link" to="/register">Create one</Link></p>
          </form>
        )}

        {step === 2 && (
          <form className="auth-card premium-auth-card" onSubmit={submit} noValidate>
            <p className="form-note">Step 2 of 2</p>
            <h2>Your password</h2>
            <p className="muted auth-email-preview">{email}</p>
            <FloatingInput label="Password *" ref={passwordRef} name="password" type="password" autoComplete="current-password" required value={passwordValue} onChange={(event) => setPasswordValue(event.target.value)} trailing={<LockKeyhole size={18} />} />
            <div className="form-row"><button className="btn tertiary" type="button" onClick={() => setStep(1)}>Back</button><Link to="/forgot-password">Forgot password?</Link></div>
            {error && <p className="notice error">{error}</p>}
            {success && <p className="notice success">{success}</p>}
            <button className="btn primary" disabled={loading}>{loading ? "Checking..." : "Log in"}</button>
          </form>
        )}
      </section>
    </main>
  );
}
