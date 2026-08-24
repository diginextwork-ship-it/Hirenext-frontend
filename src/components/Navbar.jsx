import { useState, useEffect } from "react";
import { Briefcase, Info, Image as GalleryIcon, PhoneCall, Calendar, Menu, X, Sparkles } from "lucide-react";
import logoImage from "../assets/Logo.png";
import "../styles/navbar.css";

export default function Navbar({ setCurrentPage, currentPage }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      if (currentScrollY > lastScrollY && currentScrollY > 100 && !isMenuOpen) {
        // Scrolling DOWN -> Hide navbar
        setIsNavVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling UP -> Show navbar instantly
        setIsNavVisible(true);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleNavClick = (page) => {
    setCurrentPage(page);
    setIsMenuOpen(false);
  };

  return (
    <header className={`navbar ${isScrolled ? "navbar-scrolled" : ""} ${!isNavVisible ? "navbar-hidden" : ""} ${currentPage === "home" ? "navbar-home" : ""}`}>
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="logo" onClick={() => handleNavClick("home")} role="button" tabIndex={0}>
            <div className="logo-badge-wrapper">
              <img src={logoImage} alt="Hirenext Logo" className="logo-image" />
            </div>
            <span className="logo-brand-name">
              Hire<span className="brand-accent">next</span>
            </span>
          </div>
        </div>

        <button
          className={`hamburger ${isMenuOpen ? "open" : ""}`}
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`navbar-menu ${isMenuOpen ? "open" : ""}`}>
          <div className="navbar-links">
            <button
              type="button"
              className={`nav-link ${currentPage === "jobs" ? "active" : ""}`}
              onClick={() => handleNavClick("jobs")}
            >
              <Briefcase size={16} />
              <span>Explore Jobs</span>
            </button>

            <button
              type="button"
              className={`nav-link ${currentPage === "aboutus" ? "active" : ""}`}
              onClick={() => handleNavClick("aboutus")}
            >
              <Info size={16} />
              <span>About Us</span>
            </button>

            <button
              type="button"
              className={`nav-link ${currentPage === "gallery" ? "active" : ""}`}
              onClick={() => handleNavClick("gallery")}
            >
              <GalleryIcon size={16} />
              <span>Gallery</span>
            </button>

            <button
              type="button"
              className={`nav-link ${currentPage === "contactus" ? "active" : ""}`}
              onClick={() => handleNavClick("contactus")}
            >
              <PhoneCall size={16} />
              <span>Contact</span>
            </button>
          </div>

          <div className="navbar-actions">
            <button
              type="button"
              className="btn btn-schedule-call"
              onClick={() => handleNavClick("schedulecall")}
            >
              <Calendar size={16} />
              <span>Schedule Call</span>
            </button>
            
            <button
              type="button"
              className="btn btn-portal-shortcut"
              onClick={() => handleNavClick("recruiterlogin")}
            >
              <Sparkles size={16} />
              <span>Portals</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

