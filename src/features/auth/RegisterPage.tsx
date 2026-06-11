import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, MailCheck, Sparkles } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "../../app/services";
import { CountryDialCodePicker, dialCodeFromPickerValue } from "../../components/CountryDialCodePicker";
import { FloatingInput } from "../../components/FloatingField";
import { ProfilePhotoUpload } from "../../components/ProfilePhotoUpload";
import { defaultCountryDialOption } from "../../data/countries";
import type { User } from "../../types/domain";

type RegistrationState = {
  role: User["role"];
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  country: string;
  phone: string;
  password: string;
  referencingReady: boolean;
  incomeReady: boolean;
  terms: boolean;
  profileImage: File | null;
};

export function RegisterPage({ onAuth }: { onAuth: (user: User) => void }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initialRole = params.get("role")?.toLowerCase() === "landlord" ? "LANDLORD" : "TENANT";
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [values, setValues] = useState<RegistrationState>({
    role: initialRole,
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    country: `${defaultCountryDialOption.countryCode}:${defaultCountryDialOption.dialCode}`,
    phone: "",
    password: "",
    referencingReady: false,
    incomeReady: false,
    terms: false,
    profileImage: null
  });
  const [profilePreview, setProfilePreview] = useState("");

  useEffect(() => {
    if (!values.profileImage) {
      setProfilePreview("");
      return;
    }
    const url = URL.createObjectURL(values.profileImage);
    setProfilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [values.profileImage]);

  const strong = values.password.length >= 8 && /[A-Z]/.test(values.password) && /[a-z]/.test(values.password) && /\d/.test(values.password) && /[^A-Za-z0-9]/.test(values.password);

  async function completeRegistration(profileImage: File | null = values.profileImage) {
    setLoading(true);
    setError("");
    try {
      const result = await authService.register({
        firstName: values.firstName.trim(),
        middleName: values.middleName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: `${dialCodeFromPickerValue(values.country)} ${values.phone.trim()}`,
        password: values.password,
        role: values.role,
        profileImage
      });
      // Email confirmation required: the account exists but has no session yet.
      // Show the "check your email" state — do NOT route into the dashboard,
      // because every authenticated write would silently fail under RLS until
      // the user confirms.
      if (result.status === "confirm") {
        setConfirmEmail(result.email);
        return;
      }
      onAuth(result.user);
      navigate(params.get("next") || (result.user.role === "LANDLORD" ? "/landlord" : "/tenant"));
    } catch (err) {
      setError(registrationErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }
  const steps = useMemo(() => {
    const sharedSteps = [
    {
      eyebrow: "Account type",
      title: "Which workspace do you need?",
      copy: "Personalised experience for tenants and landlords.",
      body: (
        <div className="choice-stack">
          {[
            { value: "TENANT", title: "I am a tenant", copy: "Search homes, complete referencing, book viewings and send offers." },
            { value: "LANDLORD", title: "I am a landlord", copy: "List homes, review applicants, manage offers and progress APTs." }
          ].map((option) => (
            <button type="button" className={`typeform-choice ${values.role === option.value ? "selected" : ""}`} key={option.value} onClick={() => setValues({ ...values, role: option.value as User["role"] })}>
              <span><b>{option.title}</b><small>{option.copy}</small></span>
              {values.role === option.value && <Check size={20} />}
            </button>
          ))}
        </div>
      ),
      valid: true
    },
    {
      eyebrow: "First name",
      title: "What is your first name?",
      copy: "Use your legal first name.",
      body: (
        <div className="form-grid">
          <p className="form-note">* Required field</p>
          <FloatingInput label="First Name *" autoComplete="given-name" value={values.firstName} onChange={(event) => setValues({ ...values, firstName: event.target.value })} required />
        </div>
      ),
      valid: Boolean(values.firstName.trim()),
      error: "Enter your first name before continuing."
    },
    {
      eyebrow: "Middle name",
      title: "Do you have a middle name?",
      copy: "This is optional. You can skip it.",
      body: (
        <div className="form-grid">
          <FloatingInput label="Middle Name (optional)" autoComplete="additional-name" value={values.middleName} onChange={(event) => setValues({ ...values, middleName: event.target.value })} />
        </div>
      ),
      valid: true
    },
    {
      eyebrow: "Last name",
      title: "What is your last name?",
      copy: "Use your legal last name.",
      body: (
        <div className="form-grid">
          <p className="form-note">* Required field</p>
          <FloatingInput label="Last Name *" autoComplete="family-name" value={values.lastName} onChange={(event) => setValues({ ...values, lastName: event.target.value })} required />
        </div>
      ),
      valid: Boolean(values.lastName.trim()),
      error: "Enter your last name before continuing."
    },
    {
      eyebrow: "Email",
      title: "What is your email address?",
      copy: "Use the email you want for account access and tenancy updates.",
      body: (
        <div className="form-grid">
          <p className="form-note">* Required field</p>
          <FloatingInput label="Email *" type="email" autoComplete="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} required />
        </div>
      ),
      valid: Boolean(values.email.includes("@")),
      error: "Enter a valid email address before continuing."
    },
    {
      eyebrow: "Phone number",
      title: "What is your phone number?",
      copy: "We use this for viewing updates and tenancy progress.",
      body: (
        <div className="form-grid">
          <p className="form-note">* Required field</p>
          <div className="form-grid two phone-grid">
            <CountryDialCodePicker value={values.country} onChange={(country) => setValues({ ...values, country })} />
            <FloatingInput label="Phone Number *" type="tel" autoComplete="tel" value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} required />
          </div>
        </div>
      ),
      valid: Boolean(values.phone.trim()),
      error: "Enter your phone number before continuing."
    },
    {
      eyebrow: "Password",
      title: "Create secure access.",
      copy: "Use a strong password because Hilltro protects sensitive referencing and tenancy information.",
      body: (
        <div className="form-grid">
          <p className="form-note">* Required field</p>
          <FloatingInput label="Password *" type="password" autoComplete="new-password" value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} required />
          <p className={strong ? "badge" : "badge orange"}>{strong ? "Strong password" : "8+ chars, uppercase, lowercase, number, special character"}</p>
        </div>
      ),
      valid: strong,
      error: "Create a strong password before continuing."
    }
  ];
  const tenantPrepStep = {
    eyebrow: "Referencing preparation",
    title: "Get ready for referencing.",
    copy: "These answers help Hilltro prepare the right tenant workspace after sign-up.",
    body: (
      <div className="form-grid">
        <p className="form-note">* Required field</p>
        <label className="checkbox-row"><input checked={values.referencingReady} onChange={(event) => setValues({ ...values, referencingReady: event.target.checked })} type="checkbox" /> <span>I understand Hilltro may ask for identity, income and right-to-rent information. *</span></label>
        <label className="checkbox-row"><input checked={values.incomeReady} onChange={(event) => setValues({ ...values, incomeReady: event.target.checked })} type="checkbox" /> <span>I am ready to complete referencing before sending serious offers. *</span></label>
      </div>
    ),
    valid: values.referencingReady && values.incomeReady,
    error: "Confirm both referencing preparation statements before continuing."
  };
  const finalSteps = [
    {
      eyebrow: "Terms",
      title: "Review the platform terms.",
      copy: "Please confirm before we create your account.",
      body: (
        <div className="form-grid">
          <p className="form-note">* Required field</p>
          <label className="checkbox-row"><input checked={values.terms} onChange={(event) => setValues({ ...values, terms: event.target.checked })} type="checkbox" required /> <span>I agree to Hilltro <Link to="/terms">Terms & Conditions</Link> *</span></label>
        </div>
      ),
      valid: values.terms,
      error: "Agree to the terms before creating your account."
    },
    {
      eyebrow: "Profile picture",
      title: "Upload a profile picture (optional)",
      copy: "Add a profile picture so landlords and tenants can recognise you more easily.",
      body: (
        <ProfilePhotoUpload
          file={values.profileImage}
          previewUrl={profilePreview}
          onChange={(profileImage) => setValues({ ...values, profileImage })}
          onSkip={() => {
            setValues({ ...values, profileImage: null });
            completeRegistration(null);
          }}
        />
      ),
      valid: true
    }
  ];
  return values.role === "TENANT" ? [...sharedSteps, tenantPrepStep, ...finalSteps] : [...sharedSteps, ...finalSteps];
  }, [profilePreview, strong, values]);

  const current = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  if (confirmEmail) {
    return (
      <main className="premium-auth-page">
        <section className="auth-shell premium-auth-shell register-typeform-shell">
          <div className="auth-copy premium-auth-copy">
            <p className="eyebrow">Almost there</p>
            <h1>Confirm your email.</h1>
            <p>Your account is created. Confirm your email to activate it and keep your listings secure.</p>
          </div>
          <div className="premium-auth-card typeform-register-card confirm-email-card">
            <span className="confirm-email-icon"><MailCheck size={28} /></span>
            <h2>Check your inbox</h2>
            <p className="muted">We sent a confirmation link to <b>{confirmEmail}</b>. Click it to activate your account, then log in to start listing.</p>
            <p className="muted">Can't find it? Check your spam or promotions folder — the email can take a minute to arrive.</p>
            <div className="hero-actions register-step-actions">
              <Link className="btn primary" to={`/login${confirmEmail ? `?email=${encodeURIComponent(confirmEmail)}` : ""}`}>Go to log in <ArrowRight size={18} /></Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  function next() {
    if (!current.valid) {
      setError(current.error || "Complete the required fields before continuing.");
      return;
    }
    setError("");
    setStep(Math.min(steps.length - 1, step + 1));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Enter/submit on any step before the last must only advance — never call
    // register early (which would signUp with an empty email/password and
    // surface a confusing "anonymous sign-ins are disabled" error).
    if (step < steps.length - 1) return next();
    if (!current.valid) {
      setError(current.error || "Complete the required fields before continuing.");
      return;
    }
    completeRegistration();
  }

  return (
    <main className="premium-auth-page">
      <section className="auth-shell premium-auth-shell register-typeform-shell">
        <div className="auth-copy premium-auth-copy">
          <p className="eyebrow">Create account</p>
          <h1>Start with the right tools.</h1>
          <p>A go-to for the landlords and tenants.</p>
          <div className="auth-progress"><span style={{ width: `${progress}%` }} /></div>
          <p className="muted">Step {step + 1} of {steps.length}</p>
        </div>
        <form className="premium-auth-card typeform-register-card" onSubmit={submit} noValidate>
          <p className="eyebrow">{current.eyebrow}</p>
          <h2>{current.title}</h2>
          <p className="muted">{current.copy}</p>
          {current.body}
          {error && <p className="notice error">{error}</p>}
          <div className="hero-actions register-step-actions">
            {step > 0 && <button className="btn secondary" type="button" onClick={() => { setError(""); setStep(step - 1); }}><ArrowLeft size={18} /> Back</button>}
            {step < steps.length - 1 ? (
              <button className="btn primary" type="button" onClick={next}>Continue <ArrowRight size={18} /></button>
            ) : (
              <button className="btn primary" disabled={loading}>{loading ? "Creating account..." : <><Sparkles size={18} /> Create account</>}</button>
            )}
          </div>
          <p className="muted">Already have an account? <Link className="strong-link" to="/login">Log in</Link></p>
        </form>
      </section>
    </main>
  );
}

function registrationErrorMessage(err: unknown) {
  const message = err instanceof Error ? err.message : "Registration failed.";
  if (/rate limit|too many|email rate/i.test(message)) {
    return "Hilltro has sent too many sign-up emails in a short period. Please wait a few minutes before trying again. If this keeps happening, increase the email rate limits in Supabase Auth settings or use a production email provider.";
  }
  if (/already|registered|exists/i.test(message)) return "An account may already exist for this email. Try logging in or reset your password securely.";
  return message;
}
