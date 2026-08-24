import { useState } from "react";
import { Zap, Target, ShieldCheck, Award, Users, FileText, Building2, Briefcase, CheckCircle2, UserCheck, ArrowRight, Sparkles } from "lucide-react";
import "../styles/features.css";

const CANDIDATE_FEATURES = [
  {
    icon: Target,
    title: "Precision Role Matching",
    tagline: "Tailored to your career goals",
    copy: "Get matched with verified tech and management roles aligned with your exact experience, salary expectations, and preferred work location.",
    badge: "Zero Candidate Fees",
  },
  {
    icon: Zap,
    title: "Direct Recruiter Access",
    tagline: "Skip the black hole",
    copy: "Your profile is reviewed directly by senior HR managers and technical hiring leaders with fast-track feedback cycles.",
    badge: "Direct Placement",
  },
  {
    icon: ShieldCheck,
    title: "Verified Hiring Partners",
    tagline: "100% Legitimate Companies",
    copy: "Every employer on our platform is background-verified to ensure safe, transparent, and high-quality employment opportunities.",
    badge: "Verified Employers",
  },
];

const EMPLOYER_FEATURES = [
  {
    icon: UserCheck,
    title: "Pre-Screened Talent Pools",
    tagline: "Ready-to-interview candidates",
    copy: "Access pre-vetted professionals across IT, Software Engineering, HR, Finance, and Operations with verified credentials.",
    badge: "7-Day Hiring",
  },
  {
    icon: Building2,
    title: "Dedicated Account Recruiter",
    tagline: "End-to-end recruitment support",
    copy: "Our experienced consultants manage candidate sourcing, screening, scheduling, and offer negotiations for your team.",
    badge: "Dedicated Support",
  },
  {
    icon: Award,
    title: "High Retention Guarantee",
    tagline: "Quality candidates that stay",
    copy: "We focus on long-term culture fit and skill alignment to reduce churn and build sustainable, high-performing corporate teams.",
    badge: "Guaranteed Fit",
  },
];

const CANDIDATE_STEPS = [
  {
    step: "01",
    title: "Explore Curated Positions",
    desc: "Search top corporate and tech job postings filtered by your domain and experience level.",
    icon: FileText,
  },
  {
    step: "02",
    title: "Submit Profile & Resume",
    desc: "Apply seamlessly to open vacancies with your updated resume and domain preferences.",
    icon: Zap,
  },
  {
    step: "03",
    title: "Interview & Get Hired",
    desc: "Get scheduled for direct interviews and receive offer letter assistance from our team.",
    icon: Award,
  },
];

const EMPLOYER_STEPS = [
  {
    step: "01",
    title: "Share Hiring Requirements",
    desc: "Specify your role requirements, required skillsets, headcount, and budget parameters.",
    icon: Building2,
  },
  {
    step: "02",
    title: "Review Shortlisted Talent",
    desc: "Receive pre-screened profiles and schedule interview rounds directly with qualified candidates.",
    icon: UserCheck,
  },
  {
    step: "03",
    title: "Onboard Top Performers",
    desc: "Finalize candidate selections with comprehensive offer rollout and onboarding support.",
    icon: Briefcase,
  },
];

export default function Features({ setCurrentPage }) {
  const [activeTab, setActiveTab] = useState("candidates");

  const currentFeatures = activeTab === "candidates" ? CANDIDATE_FEATURES : EMPLOYER_FEATURES;
  const currentSteps = activeTab === "candidates" ? CANDIDATE_STEPS : EMPLOYER_STEPS;

  return (
    <section className="features-section">
      <div className="features-container">
        {/* Header Title */}
        <div className="features-header">
          <span className="badge-pill">
            <Sparkles size={14} />
            WHY CHOOSE HIRENEXT
          </span>
          <h2 className="features-main-title">
            Hiring & Job Search, <span className="features-highlight">Redefined</span>.
          </h2>
          <p className="features-subtitle">
            Connecting top Indian professionals with leading hiring organizations through speed, transparency, and dedicated recruiter support.
          </p>

          {/* Interactive Audience Switcher Pill */}
          <div className="audience-toggle-container">
            <button
              type="button"
              className={`toggle-tab ${activeTab === "candidates" ? "active" : ""}`}
              onClick={() => setActiveTab("candidates")}
            >
              <Users size={16} />
              <span>For Job Seekers</span>
            </button>
            <button
              type="button"
              className={`toggle-tab ${activeTab === "employers" ? "active" : ""}`}
              onClick={() => setActiveTab("employers")}
            >
              <Building2 size={16} />
              <span>For Employers</span>
            </button>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="features-grid">
          {currentFeatures.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="feature-card glass-card">
                <div className="feature-card-header">
                  <div className="feature-icon-wrapper">
                    <Icon size={24} />
                  </div>
                  <span className="feature-badge">{card.badge}</span>
                </div>
                <h3 className="feature-card-title">{card.title}</h3>
                <span className="feature-tagline">{card.tagline}</span>
                <p className="feature-copy">{card.copy}</p>
              </article>
            );
          })}
        </div>

        {/* How It Works Workflow Section */}
        <div className="workflow-section glass-card">
          <div className="workflow-header">
            <span className="workflow-eyebrow">SIMPLE 3-STEP PROCESS</span>
            <h3>{activeTab === "candidates" ? "How Candidates Get Hired" : "How Employers Hire Talent"}</h3>
            <p>A streamlined workflow designed for maximum efficiency and zero hassle.</p>
          </div>

          <div className="workflow-grid">
            {currentSteps.map((item) => {
              const StepIcon = item.icon;
              return (
                <div key={item.step} className="workflow-step-card">
                  <div className="step-number-pill">{item.step}</div>
                  <div className="step-icon">
                    <StepIcon size={22} />
                  </div>
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="workflow-footer-cta">
            <button
              type="button"
              className="workflow-cta-btn"
              onClick={() => {
                if (typeof setCurrentPage === "function") {
                  setCurrentPage(activeTab === "candidates" ? "jobs" : "schedulecall");
                }
              }}
            >
              <span>{activeTab === "candidates" ? "Explore Open Positions" : "Schedule Recruitment Call"}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}


