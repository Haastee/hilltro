import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { HilltroAvatar } from "../components/HilltroAvatar";
import type { User } from "../types/domain";
import { authService } from "./services";
import { assetUrl } from "../utils/asset";
import { HomePage } from "../features/properties/HomePage";
import { SearchPage } from "../features/properties/SearchPage";
import { PropertyDetailPage } from "../features/properties/PropertyDetailPage";
import { LandlordProfilePage } from "../features/properties/LandlordProfilePage";
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
import { ApplicantProfilePage } from "../features/landlord/ApplicantProfilePage";
import { ReferencingPage } from "../features/referencing/ReferencingPage";
import { MessagesPage } from "../features/messages/MessagesPage";
import { PhotographyPage } from "../features/photography/PhotographyPage";
import { AboutPage, ContactPage, FaqPage, HowItWorksPage, LandlordsPage, OfferTermsPage, PrivacyPage, TenantsPage, TermsPage } from "../features/info/InfoPages";
import { LandlordWorkspacePage, TenantWorkspacePage, type LandlordPageKey, type TenantPageKey } from "../features/workspace/WorkspacePages";
import { landlordStats } from "../data/landlordProperties";
import { ProfilePage } from "../features/profile/ProfilePage";

const tenantNav = [
  ["/search", "Search"],
  ["/tenant/saved", "Saved"],
  ["/referencing", "Complete Referencing"],
  ["/tenant/viewings", "Viewings"],
  ["/messages", "Messages"],
  ["/tenant/payments", "Payments"]
];

const landlordNav = [
  ["/landlord/properties", "My Properties"],
  ["/landlord/viewings", "Viewings"],
  ["/search", "Search"],
  ["/messages", "Messages"],
  ["/landlord/offers", "Deals"],
  ["/landlord/payments", "Payments"]
];

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    authService.currentUser().then(setUser).finally(() => setAuthReady(true));
  }, []);

  const nav = useMemo(() => {
    if (!user) return [["/", "Home"], ["/search", "Search"], ["/how-it-works", "How it works"], ["/login", "Log in"]];
    if (user.role === "TENANT") return tenantNav;
    const stats = landlordStats();
    return landlordNav.map(([href, label]) => {
          if (href === "/landlord/viewings") return [href, `Viewings (${stats.viewingRequests})`];
          if (href === "/messages") return [href, `Messages (${stats.messages})`];
      if (href === "/landlord/offers") return [href, `Deals (${stats.deals})`];
      return [href, label];
    });
  }, [user]);

  const homeTarget = user?.role === "LANDLORD" ? "/landlord" : user?.role === "TENANT" ? "/tenant" : "/";

  function handleLogoClick(event: React.MouseEvent<HTMLAnchorElement>) {
    setMenuOpen(false);
    if (location.pathname === homeTarget || (!user && location.pathname === "/")) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function logout() {
    await authService.logout();
    setUser(null);
    setMenuOpen(false);
    navigate("/");
  }

  function navClassFor(href: string) {
    const path = location.pathname;
    if (user?.role === "LANDLORD") {
      if (href === "/landlord/properties") return path === "/landlord/properties" || path === "/landlord/properties/new" || /^\/landlord\/properties\/[^/]+\/(gallery|floorplan)$/.test(path) ? "active" : undefined;
      if (href === "/landlord/viewings") return path === "/landlord/viewings" || /^\/landlord\/properties\/[^/]+\/viewings$/.test(path) ? "active" : undefined;
      if (href === "/landlord/offers") return path === "/landlord/offers" || /^\/landlord\/properties\/[^/]+\/offers$/.test(path) ? "active" : undefined;
      if (href === "/messages") return path === "/messages" ? "active" : undefined;
    }
    if (user?.role === "TENANT" && href === "/messages") return path === "/messages" ? "active" : undefined;
    return undefined;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink className="brand" to={homeTarget} aria-label="Hilltro home" onClick={handleLogoClick}><img src={assetUrl("assets/branding/hilltro-logo.svg")} alt="Hilltro" /></NavLink>
        <button className="mobile-menu-button" type="button" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav className={`nav ${menuOpen ? "open" : ""}`}>
          {nav.map(([href, label]) => <NavLink key={href} to={href} className={({ isActive }) => [navClassFor(href) || (isActive ? "active" : undefined), user?.role === "TENANT" && href === "/referencing" ? "nav-attention" : ""].filter(Boolean).join(" ") || undefined} onClick={() => setMenuOpen(false)}>{label}</NavLink>)}
          {user?.role === "LANDLORD" && <NavLink className="nav-primary-cta" to="/landlord/properties/new" onClick={() => setMenuOpen(false)}>Add Property</NavLink>}
          {user && <button className="btn ghost mobile-logout" onClick={logout}><LogOut size={16} /> Log out</button>}
        </nav>
        {user && <div className="session"><NavLink className="avatar-nav-link" to="/profile" aria-label="My Profile"><HilltroAvatar name={user.firstName} imageUrl={user.profileImageUrl} /></NavLink><button className="btn ghost" onClick={logout}><LogOut size={16} /> Log out</button></div>}
      </header>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={user ? <Navigate to={homeTarget} /> : <HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/properties/:id" element={<PropertyDetailPage user={user} />} />
        <Route path="/landlords/:landlordId" element={<LandlordProfilePage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/offer-terms" element={<OfferTermsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/landlords" element={<LandlordsPage />} />
        <Route path="/tenants" element={<TenantsPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/register" element={<RegisterPage onAuth={setUser} />} />
        <Route path="/login" element={<LoginPage onAuth={setUser} />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/profile" element={<Protected user={user} ready={authReady}><ProfilePage user={user!} onUserChange={setUser} /></Protected>} />
        <Route path="/tenant" element={<Protected user={user} ready={authReady} role="TENANT"><TenantDashboard user={user!} /></Protected>} />
        {(["saved", "viewings", "offers", "payments"] as TenantPageKey[]).map((page) => <Route key={page} path={`/tenant/${page}`} element={<Protected user={user} ready={authReady} role="TENANT"><TenantWorkspacePage page={page} user={user!} /></Protected>} />)}
        <Route path="/tenant/searches" element={<Protected user={user} ready={authReady} role="TENANT"><TenantWorkspacePage page="saved" user={user!} /></Protected>} />
        <Route path="/tenant/profile" element={<Protected user={user} ready={authReady} role="TENANT"><ProfilePage user={user!} onUserChange={setUser} /></Protected>} />
        <Route path="/landlord/profile" element={<Protected user={user} ready={authReady} role="LANDLORD"><ProfilePage user={user!} onUserChange={setUser} /></Protected>} />
        <Route path="/referencing" element={<Protected user={user} ready={authReady} role="TENANT"><ReferencingPage /></Protected>} />
        <Route path="/landlord" element={<Protected user={user} ready={authReady} role="LANDLORD"><LandlordDashboard user={user!} /></Protected>} />
        <Route path="/landlord/properties" element={<Protected user={user} ready={authReady} role="LANDLORD"><MyPropertiesPage /></Protected>} />
        <Route path="/landlord/offers" element={<Protected user={user} ready={authReady} role="LANDLORD"><MyPropertiesPage offerGuidance /></Protected>} />
        <Route path="/landlord/properties/:propertyId/gallery" element={<Protected user={user} ready={authReady} role="LANDLORD"><PropertyGalleryPage /></Protected>} />
        <Route path="/landlord/properties/:propertyId/floorplan" element={<Protected user={user} ready={authReady} role="LANDLORD"><PropertyFloorplanPage /></Protected>} />
        <Route path="/landlord/properties/:propertyId/viewings" element={<Protected user={user} ready={authReady} role="LANDLORD"><PropertyViewingsPage /></Protected>} />
        <Route path="/landlord/properties/:propertyId/offers" element={<Protected user={user} ready={authReady} role="LANDLORD"><PropertyOffersPage /></Protected>} />
        <Route path="/landlord/viewings" element={<Protected user={user} ready={authReady} role="LANDLORD"><LandlordViewingsPage /></Protected>} />
        <Route path="/landlord/applicants/:applicantId" element={<Protected user={user} ready={authReady} role="LANDLORD"><ApplicantProfilePage /></Protected>} />
        {(["payments", "arrears", "settings"] as LandlordPageKey[]).map((page) => <Route key={page} path={`/landlord/${page}`} element={<Protected user={user} ready={authReady} role="LANDLORD"><LandlordWorkspacePage page={page} user={user!} /></Protected>} />)}
        <Route path="/landlord/properties/new" element={<Protected user={user} ready={authReady} role="LANDLORD"><PropertyOnboarding /></Protected>} />
        <Route path="/messages" element={<Protected user={user} ready={authReady}><MessagesPage /></Protected>} />
        <Route path="/photography" element={<Protected user={user} ready={authReady} role="LANDLORD"><PhotographyPage /></Protected>} />
        <Route path="*" element={<Navigate to={homeTarget} />} />
      </Routes>
      <Footer />
    </div>
  );
}

function Footer() {
  const links = [
    ["/faq", "FAQ"],
    ["/how-it-works", "How It Works"],
    ["/privacy", "Privacy Policy"],
    ["/terms", "Terms & Conditions"],
    ["/offer-terms", "Offer Terms"],
    ["/about", "About"],
    ["/contact", "Contact"],
    ["/landlords", "Landlords"],
    ["/tenants", "Tenants"]
  ];
  return (
    <footer className="site-footer">
      <div>
        <NavLink className="brand" to="/" aria-label="Hilltro home" onClick={(event) => {
          if (window.location.pathname === "/") {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}><img src={assetUrl("assets/branding/hilltro-logo.svg")} alt="Hilltro" /></NavLink>
        <p>Secure lettings tools for tenants and landlords, built around referencing, offers, APT progression and payment workflows.</p>
      </div>
      <nav className="footer-nav" aria-label="Footer navigation">
        {links.map(([href, label]) => <NavLink key={href} to={href}>{label}</NavLink>)}
      </nav>
      <p className="footer-disclaimer">© 2026 Hilltro. All rights reserved.</p>
    </footer>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

function Protected({ user, ready, role, children }: { user: User | null; ready: boolean; role?: User["role"]; children: JSX.Element }) {
  if (!ready) return <main className="page"><section className="hero compact-hero"><h1>Loading your workspace.</h1></section></main>;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to={user.role === "TENANT" ? "/tenant" : "/landlord"} />;
  return children;
}
