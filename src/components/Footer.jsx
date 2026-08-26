import { useState } from "react";
import { MapPin, Phone, Mail, Shield, ExternalLink, Heart, Globe, Share2, Building2, Send, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import logoImage from "../assets/Logo.png";
import "../styles/footer.css";

export default function Footer({
  setCurrentPage,
  minimal = false,
  isAdmin = false,
  showDeveloperStrip = true,
}) {
  const currentYear = new Date().getFullYear();
  const [emailInput, setEmailInput] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim();
    if (cleanEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      try {
        const existing = JSON.parse(localStorage.getItem("hirenext_subscribers") || "[]");
        if (!existing.includes(cleanEmail)) {
          existing.push(cleanEmail);
          localStorage.setItem("hirenext_subscribers", JSON.stringify(existing));
        }
      } catch (err) {
        console.warn("Could not save subscriber to localStorage", err);
      }
      setSubscribed(true);
      setEmailInput("");
      setTimeout(() => setSubscribed(false), 6000);
    }
  };

  if (minimal) {
    return (
      <footer className="footer footer-minimal">
        <div className="footer-container">
          <div className="footer-bottom footer-bottom-minimal">
            <img src={logoImage} alt="Hirenext Logo" className="footer-brand-logo" />
            <p>&copy; {currentYear} Hirenext Consulting Pvt Ltd. All rights reserved.</p>
          </div>
          {showDeveloperStrip && (
            <a
              className="footer-developer-strip"
              href="https://www.linkedin.com/in/kushaggra"
              target="_blank"
              rel="noreferrer"
            >
              Designed & Built with <Heart size={12} className="heart-icon" /> by Om Wadhwani
            </a>
          )}
        </div>
      </footer>
    );
  }

  return (
    <footer className="footer">
      <div className="footer-top-accent"></div>

      {/* Pre-Footer Call to Action Banner */}
      <div className="footer-cta-container">
        <div className="footer-cta-card">
          <div className="cta-left">
            <span className="cta-badge">
              <Sparkles size={14} /> READY TO GROW YOUR CAREER OR TEAM?
            </span>
            <h2>Transform your hiring experience with Hirenext today.</h2>
            <p>Whether you're looking for your next executive role or scaling your tech team, we deliver results in 7 days.</p>
          </div>
          <div className="cta-actions">
            <button
              type="button"
              className="cta-btn-primary"
              onClick={() => setCurrentPage("jobs")}
            >
              <span>Explore All Jobs</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="cta-btn-secondary"
              onClick={() => setCurrentPage("schedulecall")}
            >
              <span>Schedule Free Consultation</span>
            </button>
          </div>
        </div>
      </div>

      <div className="footer-container">
        <div className="footer-main">
          {/* Column 1: Brand & Contact Info */}
          <div className="footer-main-left">
            <img src={logoImage} alt="Hirenext Logo" className="footer-brand-logo" />
            <p className="footer-description">
              Pioneering corporate & tech staffing solutions across India with precision candidate matching and dedicated recruiter support.
            </p>
            
            <div className="footer-contact-list">
              <div className="footer-info-item">
                <MapPin size={18} className="info-icon" />
                <span>Home Science College Road, Napier Town, Jabalpur (M.P.)</span>
              </div>
              <div className="footer-info-item">
                <Phone size={18} className="info-icon" />
                <a href="tel:07614085424">0761-4085424</a>
              </div>
              <div className="footer-info-item">
                <Mail size={18} className="info-icon" />
                <a href="mailto:hr@hirenextindia.com">hr@hirenextindia.com</a>
              </div>
            </div>

            <div className="footer-social-row">
              <a href="https://hirenextindia.com" target="_blank" rel="noreferrer" aria-label="Website" className="social-chip">
                <Globe size={16} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="Share" className="social-chip">
                <Share2 size={16} />
              </a>
              <a href="https://hirenextindia.com" target="_blank" rel="noreferrer" aria-label="Corporate" className="social-chip">
                <Building2 size={16} />
              </a>
            </div>

            <div className="footer-actions-group">
              <button
                type="button"
                className="footer-admin-btn"
                onClick={() => setCurrentPage(isAdmin ? "adminpanel" : "adminlogin")}
              >
                <Shield size={16} />
                <span>{isAdmin ? "Admin Dashboard" : "Admin Portal"}</span>
              </button>
            </div>
          </div>

          {/* Column 2: Quick Links & Newsletter Box */}
          <div className="footer-mid-col">
            <div className="footer-nav-grid">
              <div className="footer-nav-col">
                <h4>Candidate Hub</h4>
                <button type="button" onClick={() => setCurrentPage("jobs")}>Explore All Jobs</button>
                <button type="button" onClick={() => setCurrentPage("schedulecall")}>Schedule Consultation</button>
                <button type="button" onClick={() => setCurrentPage("gallery")}>Life at Hirenext</button>
              </div>

              <div className="footer-nav-col">
                <h4>Company</h4>
                <button type="button" onClick={() => setCurrentPage("aboutus")}>About Us</button>
                <button type="button" onClick={() => setCurrentPage("contactus")}>Contact Us</button>
                <button type="button" onClick={() => setCurrentPage("recruiterlogin")}>Recruiter Login</button>
              </div>
            </div>

            <div className="footer-newsletter-box">
              <h4>Stay Informed</h4>
              <p>Get weekly job market insights in your inbox.</p>
              <form onSubmit={handleSubscribe} className="newsletter-form">
                <input
                  type="email"
                  placeholder="Enter your work email..."
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                />
                <button type="submit" className="newsletter-btn">
                  <Send size={15} />
                </button>
              </form>
              {subscribed && (
                <div className="newsletter-success">
                  <CheckCircle2 size={15} />
                  <span>Subscribed! You'll receive our weekly market insights.</span>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Interactive Map & HQ */}
          <div className="footer-map-card">
            <div className="map-badge">Jabalpur HQ</div>
            <iframe
              title="Hirenext Office Map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3668.2831888238793!2d79.92884620000001!3d23.1598622!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3981af1f03fb1043%3A0x1637d2e9412d7205!2sHire%20Next%20Consulting%20Pvt%20Ltd!5e0!3m2!1sen!2sin!4v1771573754458!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>

        {/* Footer Bottom Strip */}
        <div className="footer-bottom">
          <p>&copy; {currentYear} Hirenext Consulting Pvt Ltd. All rights reserved.</p>

          {showDeveloperStrip && (
            <a
              className="footer-developer-strip"
              href="https://www.linkedin.com/in/kushaggra"
              target="_blank"
              rel="noreferrer"
            >
              Meet the Developer <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}



