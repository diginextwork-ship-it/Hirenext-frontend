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
const JobDetails = lazy(() => import("./pages/JobDetails"));
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
const AdminTasks = lazy(() => import("./pages/admin/AdminTasks"));
const AdminSalaryHistory = lazy(
  () => import("./pages/admin/AdminSalaryHistory"),
);
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
  admintasks: "/admin-panel/tasks",
  adminsalaryhistory: "/admin-panel/salary-history",
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
  "admintasks",
  "adminsalaryhistory",
]);

const normalizePath = (pathname) => {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
};

const getRouteFromPath = (pathname) => {
  const normalizedPath = normalizePath(pathname);
  if (normalizedPath === "/") return { page: "home", params: {} };
  if (normalizedPath === "/jobs") return { page: "jobs", params: {} };
  if (normalizedPath === "/jobs/apply") return { page: "applyjob", params: {} };

  const applyMatch = normalizedPath.match(/^\/jobs\/([^/]+)\/apply$/);
  if (applyMatch) {
    return {
      page: "applyjob",
      params: { jobId: decodeURIComponent(applyMatch[1]) },
    };
  }

  const detailsMatch = normalizedPath.match(/^\/jobs\/([^/]+)$/);
  if (detailsMatch) {
    return {
      page: "jobdetail",
      params: { jobId: decodeURIComponent(detailsMatch[1]) },
    };
  }

  if (normalizedPath === "/contactus") return { page: "contactus", params: {} };
  if (normalizedPath === "/about-us") return { page: "aboutus", params: {} };
  if (normalizedPath === "/gallery") return { page: "gallery", params: {} };
  if (normalizedPath === "/schedule-call") {
    return { page: "schedulecall", params: {} };
  }
  if (normalizedPath === "/recruiter-login") {
    return { page: "recruiterlogin", params: {} };
  }
  if (normalizedPath === "/admin-login") return { page: "adminlogin", params: {} };
  if (normalizedPath === "/admin-panel") return { page: "adminpanel", params: {} };
  if (normalizedPath === "/admin-panel/create-recruiter")
    return { page: "admincreate", params: {} };
  if (normalizedPath === "/admin-panel/recruiter-uploads")
    return { page: "adminuploads", params: {} };
  if (normalizedPath === "/admin-panel/performance")
    return { page: "adminperformance", params: {} };
  if (normalizedPath === "/admin-panel/candidate-submitted-resumes")
    return { page: "admincandidateresumes", params: {} };
  if (normalizedPath === "/admin-panel/manual-selection")
    return { page: "adminmanualselection", params: {} };
  if (normalizedPath === "/admin-panel/revenue")
    return { page: "adminrevenue", params: {} };
  if (normalizedPath === "/admin-panel/attendance")
    return { page: "adminattendance", params: {} };
  if (normalizedPath === "/admin-panel/billing")
    return { page: "adminbilling", params: {} };
  if (normalizedPath === "/admin-panel/tasks")
    return { page: "admintasks", params: {} };
  if (normalizedPath === "/admin-panel/salary-history")
    return { page: "adminsalaryhistory", params: {} };
  return { page: "notfound", params: {} };
};

const buildPathForPage = (page, params = {}) => {
  if (page === "jobdetail" && params.jobId) {
    return `/jobs/${encodeURIComponent(params.jobId)}`;
  }

  if (page === "applyjob" && params.jobId) {
    return `/jobs/${encodeURIComponent(params.jobId)}/apply`;
  }

  if (page === "jobdetail") {
    return PAGE_TO_PATH.jobs;
  }

  return PAGE_TO_PATH[page] || "/";
};

export default function App() {
  const [authSession, setAuthSession] = useState(() => getAuthSession());
  const [currentRoute, setCurrentRoute] = useState(() =>
    getRouteFromPath(window.location.pathname),
  );
  const currentPage = currentRoute.page;
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
      setCurrentRoute({ page: "home", params: {} });
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
      setCurrentRoute(getRouteFromPath(window.location.pathname));
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

  const setCurrentPage = (page, params = {}) => {
    if (ADMIN_ONLY_PAGES.has(page) && !isAdmin) {
      page = "adminlogin";
      params = {};
    }

    const nextPath = buildPathForPage(page, params);
    const activePath = normalizePath(window.location.pathname);
    setCurrentRoute({ page, params });

    if (activePath !== nextPath) {
      window.history.pushState({ page, params }, "", nextPath);
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
      case "jobdetail":
        return (
          <JobDetails
            setCurrentPage={setCurrentPage}
            routeJobId={currentRoute.params?.jobId || ""}
          />
        );
      case "applyjob":
        return (
          <JobApplication
            setCurrentPage={setCurrentPage}
            routeJobId={currentRoute.params?.jobId || ""}
          />
        );
      case "schedulecall":
        return <ScheduleCall setCurrentPage={setCurrentPage} />;
      case "recruiterlogin":
        return <RecruiterLogin />;
      case "adminlogin":
        return (
          <AdminLogin
            onLoginSuccess={(session) => {
              setAuthSession(session || getAuthSession());
              setCurrentRoute({ page: "adminpanel", params: {} });
              const adminPanelPath = PAGE_TO_PATH.adminpanel;
              if (normalizePath(window.location.pathname) !== adminPanelPath) {
                window.history.pushState(
                  { page: "adminpanel" },
                  "",
                  adminPanelPath,
                );
              }
              window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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
      case "admintasks":
        return <AdminTasks setCurrentPage={setCurrentPage} />;
      case "adminsalaryhistory":
        return <AdminSalaryHistory setCurrentPage={setCurrentPage} />;
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
