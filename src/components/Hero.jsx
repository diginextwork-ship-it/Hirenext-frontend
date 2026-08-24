import { useState } from "react";
import { Sparkles, Search, MapPin, ArrowRight, Users, Briefcase, TrendingUp, CheckCircle2, Command } from "lucide-react";
import "../styles/hero.css";
import CTAButtons from "./CTAbuttons";
import bgVideo from "../assets/video/bg_video.mp4";

export default function Hero({ setCurrentPage }) {
  const [searchRole, setSearchRole] = useState("");

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage("jobs");
  };

  const handleTagClick = (tag) => {
    setSearchRole(tag);
    setCurrentPage("jobs");
  };

  return (
    <section className="hero">
      <video className="hero-video" autoPlay muted loop playsInline>
        <source src={bgVideo} type="video/mp4" />
      </video>
      <div className="hero-overlay" aria-hidden="true"></div>
      <div className="hero-orb hero-orb-left" aria-hidden="true"></div>
      <div className="hero-orb hero-orb-right" aria-hidden="true"></div>
      <div className="hero-grid-pattern" aria-hidden="true"></div>

      <div className="hero-content">
        {/* Status Badge */}
        <div className="hero-badge-container">
          <div className="hero-badge">
            <span className="badge-pulse-dot"></span>
            <Sparkles size={14} className="sparkle-icon" />
            <span>INDIA'S PREMIER TALENT CONSULTANCY</span>
          </div>
        </div>

        {/* Hero Main Headline */}
        <h1 className="hero-title">
          Getting Your <span className="hero-gradient-text">Next Career Move</span> Made Simple.
        </h1>

        <p className="hero-subtitle">
          Pioneering corporate & tech recruitment with precision candidate matching, zero candidate charges, and dedicated recruiter support.
        </p>

        {/* Super Modern Search Widget */}
        <form className="hero-search-box" onSubmit={handleSearchSubmit}>
          <div className="search-input-group">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search job title, skill, or keyword..."
              value={searchRole}
              onChange={(e) => setSearchRole(e.target.value)}
            />
          </div>
          <div className="search-input-divider"></div>
          <div className="search-input-group location-group">
            <MapPin size={20} className="search-icon" />
            <span className="location-tag">All India / Remote</span>
          </div>
          <button type="submit" className="btn-hero-search">
            <span>Explore Jobs</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Popular Tags */}
        <div className="hero-popular-tags">
          <span className="popular-label">Popular Searches:</span>
          {["Software Developer", "HR Manager", "Sales Lead", "Data Analyst", "Remote", "Finance Manager"].map((tag) => (
            <button
              key={tag}
              type="button"
              className="popular-tag-chip"
              onClick={() => handleTagClick(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <CTAButtons setCurrentPage={setCurrentPage} />

        {/* Trust Badges Bar */}
        <div className="hero-trust-bar">
          <div className="trust-item">
            <CheckCircle2 size={16} className="trust-icon" />
            <span>100% Verified Employers</span>
          </div>
          <div className="trust-item">
            <CheckCircle2 size={16} className="trust-icon" />
            <span>Zero Candidate Charges</span>
          </div>
          <div className="trust-item">
            <CheckCircle2 size={16} className="trust-icon" />
            <span>Fast-track Placements</span>
          </div>
        </div>

        {/* Industry Sector Strip */}
        <div className="hero-marquee-container">
          <span className="marquee-title">SPECIALIZED RECRUITMENT DOMAINS</span>
          <div className="marquee-chips">
            {["IT & Tech", "Corporate & HR", "BFSI & Banking", "Healthcare", "Manufacturing", "Sales & Marketing"].map((sector) => (
              <span key={sector} className="company-logo-chip">{sector}</span>
            ))}
          </div>
        </div>

        {/* Hero Metric Stats Grid */}
        <div className="hero-stats-grid">
          <div className="hero-stat-card">
            <div className="stat-icon-box">
              <Users size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-number">10,000+</span>
              <span className="stat-label">Placed Candidates</span>
            </div>
          </div>

          <div className="hero-stat-card">
            <div className="stat-icon-box">
              <Briefcase size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-number">500+</span>
              <span className="stat-label">Hiring Partners</span>
            </div>
          </div>

          <div className="hero-stat-card">
            <div className="stat-icon-box">
              <TrendingUp size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-number">98%</span>
              <span className="stat-label">Placement Success</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}





