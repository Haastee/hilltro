import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Bell, LogOut } from "lucide-react";
import type { User } from "../types/domain";
import { authService } from "./services";
import { assetUrl } from "../utils/asset";
import { HomePage } from "../features/properties/HomePage";
import { SearchPage } from "../features/properties/SearchPage";
import { PropertyDetailPage } from "../features/properties/PropertyDetailPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { LoginPage } from "../features/auth/LoginPage";
import { ForgotPasswordPage, ResetPasswordPage } from "../features/auth/PasswordResetPages";
import { TenantDashboard } from "../features/tenant/TenantDashboard";
import { LandlordDashboard } from "../features/landlord/LandlordDashboard";
import { PropertyOnboarding } from "../features/landlord/PropertyOnboarding";
import { MyPropertiesPage } from "../features/landlord/MyPropertiesPage";
import { PropertyOffersPage } from "../features/landlord/PropertyOffersPage";
import { PropertyGalleryPage } from "../features/landlord/PropertyGalleryPage";
import { PropertyFloorplanPage } from "../features/landlord/PropertyFloorplanPage";
import { PropertyViewingsPage } from "../features/landlord/PropertyViewingsPage";
import { LandlordViewingsPage } from "../features/landlord/LandlordViewingsPage";
import { ReferencingPage } from "../features/referencing/ReferencingPage";
import { MessagesPage } from "../features/messages/MessagesPage";
import { PhotographyPage } from "../features/photography/PhotographyPage";
import { AboutPage, FaqPage, PricingPage, TermsPage } from "../features/info/InfoPages";
import { LandlordWorkspacePage, TenantWorkspacePage, type LandlordPageKey, type TenantPageKey } from "../features/workspace/WorkspacePages";

const tenantNav = [
  ["/tenant/saved", "Saved"],
  ["/tenant/viewings", "Viewings"],
  ["/search", "Search"],
  ["/referencing", "Referencing"],
  ["/messages", "Messages (1)"],
  ["/tenant/payments", "Payments"]
];

const landlordNav = [
  ["/landlord/properties", "My Properties"],
  ["/landlord/viewings", "Viewings"],
  ["/landlord/properties/new", "Create Listing"],
  ["/messages", "Messages (1)"],
  ["/landlord/offers", "Offers"],
  ["/landlord/payments", "Payments"]
];

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    authService.currentUser().then(setUser).finally(() => setAuthReady(true));
  }, []);

  const nav = useMemo(() => {
    if (!user) return [["/", "Home"], ["/search", "Search"], ["/about", "About"], ["/pricing", "Pricing"], ["/faq", "FAQ"], ["/login", "Log in"], ["/register", "Register"]];
    return user.role === "TENANT" ? tenantNav : landlordNav;
  }, [user]);

  const homeTarget = user?.role === "LANDLORD" ? "/landlord" : user?.role === "TENANT" ? "/tenant" : "/";

  async function logout() {
    await authService.logout();
    setUser(null);
    navigate("/");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink className="brand" to={homeTarget} aria-label="Haaste home"><img src={assetUrl("assets/haaste-logo.svg")} alt="Haaste" /></NavLink>
        <nav className="nav">
          {nav.map(([href, label]) => <NavLink key={href} to={href}>{label}</NavLink>)}
        </nav>
        {user && <div className="session"><span className="badge orange"><Bell size={14} /> 1 unread</span><span className="badge">{user.name} · {user.role}</span><button className="btn ghost" onClick={logout}><LogOut size={16} /> Log out</button></div>}
      </header>
      <Routes>
        <Route path="/" element={user ? <Navigate to={homeTarget} /> : <HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/properties/:id" element={<PropertyDetailPage user={user} />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/register" element={<RegisterPage onAuth={setUser} />} />
        <Route path="/login" element={<LoginPage onAuth={setUser} />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/tenant" element={<Protected user={user} ready={authReady} role="TENANT"><TenantDashboard user={user!} /></Protected>} />
        {(["saved", "viewings", "offers", "payments", "profile"] as TenantPageKey[]).map((page) => <Route key={page} path={`/tenant/${page}`} element={<Protected user={user} ready={authReady} role="TENANT"><TenantWorkspacePage page={page} user={user!} /></Protected>} />)}
        <Route path="/referencing" element={<Protected user={user} ready={authReady} role="TENANT"><ReferencingPage /></Protected>} />
        <Route path="/landlord" element={<Protected user={user} ready={authReady} role="LANDLORD"><LandlordDashboard user={user!} /></Protected>} />
        <Route path="/landlord/properties" element={<Protected user={user} ready={authReady} role="LANDLORD"><MyPropertiesPage /></Protected>} />
        <Route path="/landlord/offers" element={<Protected user={user} ready={authReady} role="LANDLORD"><MyPropertiesPage offerGuidance /></Protected>} />
        <Route path="/landlord/properties/:propertyId/gallery" element={<Protected user={user} ready={authReady} role="LANDLORD"><PropertyGalleryPage /></Protected>} />
        <Route path="/landlord/properties/:propertyId/floorplan" element={<Protected user={user} ready={authReady} role="LANDLORD"><PropertyFloorplanPage /></Protected>} />
        <Route path="/landlord/properties/:propertyId/viewings" element={<Protected user={user} ready={authReady} role="LANDLORD"><PropertyViewingsPage /></Protected>} />
        <Route path="/landlord/properties/:propertyId/offers" element={<Protected user={user} ready={authReady} role="LANDLORD"><PropertyOffersPage /></Protected>} />
        <Route path="/landlord/viewings" element={<Protected user={user} ready={authReady} role="LANDLORD"><LandlordViewingsPage /></Protected>} />
        {(["payments", "arrears", "settings"] as LandlordPageKey[]).map((page) => <Route key={page} path={`/landlord/${page}`} element={<Protected user={user} ready={authReady} role="LANDLORD"><LandlordWorkspacePage page={page} user={user!} /></Protected>} />)}
        <Route path="/landlord/properties/new" element={<Protected user={user} ready={authReady} role="LANDLORD"><PropertyOnboarding /></Protected>} />
        <Route path="/messages" element={<Protected user={user} ready={authReady}><MessagesPage /></Protected>} />
        <Route path="/photography" element={<Protected user={user} ready={authReady} role="LANDLORD"><PhotographyPage /></Protected>} />
        <Route path="*" element={<Navigate to={homeTarget} />} />
      </Routes>
    </div>
  );
}

function Protected({ user, ready, role, children }: { user: User | null; ready: boolean; role?: User["role"]; children: JSX.Element }) {
  if (!ready) return <main className="page"><section className="hero compact-hero"><h1>Loading your workspace.</h1></section></main>;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to={user.role === "TENANT" ? "/tenant" : "/landlord"} />;
  return children;
}
