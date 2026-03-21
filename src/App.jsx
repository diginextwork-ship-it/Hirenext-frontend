import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { NotificationProvider } from "./context/NotificationContext";
import NotificationContainer from "./context/NotificationContainer";
import PageFallback from "./components/PageFallback";
import {
  clearAuthSession,
  getAuthSession,
  SESSION_EXPIRED_EVENT,
} from "./auth/session";

// Lazy-loaded pages — each gets its own chunk
const Home = lazy(() => import("./pages/Home"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Contact = lazy(() => import("./pages/contact"));
const Gallery = lazy(() => import("./pages/Gallery"));
const JobSearch = lazy(() => import("./pages/JobSearch"));
const JobApplication = lazy(() => import("./pages/JobApplication"));
const RecruiterLogin = lazy(() => import("./pages/RecruiterLogin"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const AdminCreateRecruiter = lazy(
  () => import("./pages/admin/AdminCreateRecruiter"),
);
const AdminResumeUploads = lazy(
  () => import("./pages/admin/AdminResumeUploads"),
);
const AdminPerformance = lazy(() => import("./pages/admin/AdminPerformance"));
const AdminCandidateResumes = lazy(
  () => import("./pages/admin/AdminCandidateResumes"),
);
const AdminManualSelection = lazy(
  () => import("./pages/admin/AdminManualSelection"),
);
const AdminRevenue = lazy(() => import("./pages/admin/AdminRevenue"));
const AdminAttendance = lazy(() => import("./pages/admin/AdminAttendance"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling"));
const ErrorPage = lazy(() => import("./pages/ErrorPage"));
const ScheduleCall = lazy(() => import("./pages/ScheduleCall"));

const PAGE_TO_PATH = {
  home: "/",
  jobs: "/jobs",
  applyjob: "/jobs/apply",
  contactus: "/contactus",
  aboutus: "/about-us",
  gallery: "/gallery",
  schedulecall: "/schedule-call",
  recruiterlogin: "/recruiter-login",
  adminlogin: "/admin-login",
  adminpanel: "/admin-panel",
  admincreate: "/admin-panel/create-recruiter",
  adminuploads: "/admin-panel/recruiter-uploads",
  adminperformance: "/admin-panel/performance",
  admincandidateresumes: "/admin-panel/candidate-submitted-resumes",
  adminmanualselection: "/admin-panel/manual-selection",
  adminrevenue: "/admin-panel/revenue",
  adminattendance: "/admin-panel/attendance",
  adminbilling: "/admin-panel/billing",
};

const ADMIN_ONLY_PAGES = new Set([
  "adminpanel",
  "admincreate",
  "adminuploads",
  "adminperformance",
  "admincandidateresumes",
  "adminmanualselection",
  "adminrevenue",
  "adminattendance",
  "adminbilling",
]);

const normalizePath = (pathname) => {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
};

const getPageFromPath = (pathname) => {
  const normalizedPath = normalizePath(pathname);
  if (normalizedPath === "/") return "home";
  if (normalizedPath === "/jobs") return "jobs";
  if (normalizedPath === "/jobs/apply") return "applyjob";
  if (normalizedPath === "/contactus") return "contactus";
  if (normalizedPath === "/about-us") return "aboutus";
  if (normalizedPath === "/gallery") return "gallery";
  if (normalizedPath === "/schedule-call") return "schedulecall";
  if (normalizedPath === "/recruiter-login") return "recruiterlogin";
  if (normalizedPath === "/admin-login") return "adminlogin";
  if (normalizedPath === "/admin-panel") return "adminpanel";
  if (normalizedPath === "/admin-panel/create-recruiter") return "admincreate";
  if (normalizedPath === "/admin-panel/recruiter-uploads")
    return "adminuploads";
  if (normalizedPath === "/admin-panel/performance") return "adminperformance";
  if (normalizedPath === "/admin-panel/candidate-submitted-resumes")
    return "admincandidateresumes";
  if (normalizedPath === "/admin-panel/manual-selection")
    return "adminmanualselection";
  if (normalizedPath === "/admin-panel/revenue") return "adminrevenue";
  if (normalizedPath === "/admin-panel/attendance") return "adminattendance";
  if (normalizedPath === "/admin-panel/billing") return "adminbilling";
  return "notfound";
};

export default function App() {
  const [authSession, setAuthSession] = useState(() => getAuthSession());
  const [currentPage, setCurrentPageState] = useState(() =>
    getPageFromPath(window.location.pathname),
  );
  const isAdmin = useMemo(
    () =>
      String(authSession?.role || "")
        .trim()
        .toLowerCase() === "admin",
    [authSession?.role],
  );
  const guardedPage =
    ADMIN_ONLY_PAGES.has(currentPage) && !isAdmin ? "adminlogin" : currentPage;

  // Listen for session-expired events from authFetch
  useEffect(() => {
    const handleSessionExpired = () => {
      setAuthSession(null);
      setCurrentPageState("home");
      const homePath = PAGE_TO_PATH.home;
      if (normalizePath(window.location.pathname) !== homePath) {
        window.history.replaceState({ page: "home" }, "", homePath);
      }
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPageState(getPageFromPath(window.location.pathname));
      setAuthSession(getAuthSession());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!ADMIN_ONLY_PAGES.has(currentPage) || isAdmin) return;
    const loginPath = PAGE_TO_PATH.adminlogin;
    if (normalizePath(window.location.pathname) !== loginPath) {
      window.history.replaceState({ page: "adminlogin" }, "", loginPath);
    }
  }, [currentPage, isAdmin]);

  const setCurrentPage = (page) => {
    if (ADMIN_ONLY_PAGES.has(page) && !isAdmin) {
      page = "adminlogin";
    }

    const nextPath = PAGE_TO_PATH[page] || "/";
    const activePath = normalizePath(window.location.pathname);
    setCurrentPageState(page);

    if (activePath !== nextPath) {
      window.history.pushState({ page }, "", nextPath);
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  const handleLogout = () => {
    clearAuthSession();
    setAuthSession(null);
    setCurrentPage("home");
  };

  const renderPage = () => {
    switch (guardedPage) {
      case "contactus":
        return <Contact setCurrentPage={setCurrentPage} />;
      case "aboutus":
        return <AboutUs setCurrentPage={setCurrentPage} />;
      case "gallery":
        return <Gallery setCurrentPage={setCurrentPage} />;
      case "jobs":
        return <JobSearch setCurrentPage={setCurrentPage} />;
      case "applyjob":
        return <JobApplication setCurrentPage={setCurrentPage} />;
      case "schedulecall":
        return <ScheduleCall setCurrentPage={setCurrentPage} />;
      case "recruiterlogin":
        return <RecruiterLogin />;
      case "adminlogin":
        return (
          <AdminLogin
            onLoginSuccess={() => {
              setAuthSession(getAuthSession());
              setCurrentPage("adminpanel");
            }}
          />
        );
      case "adminpanel":
        return (
          <AdminPanel setCurrentPage={setCurrentPage} onLogout={handleLogout} />
        );
      case "admincreate":
        return <AdminCreateRecruiter setCurrentPage={setCurrentPage} />;
      case "adminuploads":
        return <AdminResumeUploads setCurrentPage={setCurrentPage} />;
      case "adminperformance":
        return <AdminPerformance setCurrentPage={setCurrentPage} />;
      case "admincandidateresumes":
        return <AdminCandidateResumes setCurrentPage={setCurrentPage} />;
      case "adminmanualselection":
        return <AdminManualSelection setCurrentPage={setCurrentPage} />;
      case "adminrevenue":
        return <AdminRevenue setCurrentPage={setCurrentPage} />;
      case "adminattendance":
        return <AdminAttendance setCurrentPage={setCurrentPage} />;
      case "adminbilling":
        return <AdminBilling setCurrentPage={setCurrentPage} />;
      case "notfound":
        return (
          <ErrorPage
            code={404}
            title="Page not found"
            message="The page you requested does not exist or has been moved."
            onRetry={() => setCurrentPage("home")}
          />
        );
      default:
        return <Home setCurrentPage={setCurrentPage} />;
    }
  };

  if (guardedPage === "notfound") {
    return <Suspense fallback={<PageFallback />}>{renderPage()}</Suspense>;
  }

  return (
    <NotificationProvider>
      <div className="app">
        {currentPage === "home" ? (
          <Navbar setCurrentPage={setCurrentPage} currentPage={currentPage} />
        ) : null}
        <Suspense fallback={<PageFallback />}>{renderPage()}</Suspense>
        <Footer
          setCurrentPage={setCurrentPage}
          minimal={currentPage !== "home"}
          isAdmin={isAdmin}
        />
        <NotificationContainer />
      </div>
    </NotificationProvider>
  );
}
