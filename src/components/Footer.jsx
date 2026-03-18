import logoImage from "../assets/Logo.png";
import "../styles/footer.css";

export default function Footer({ setCurrentPage, minimal = false, isAdmin = false }) {
  const currentYear = new Date().getFullYear();

  if (minimal) {
    return (
      <footer className="footer footer-minimal">
        <div className="footer-container">
          <div className="footer-bottom footer-bottom-minimal">
            <img src={logoImage} alt="hirenext logo" className="footer-brand-logo" />
            <p>&copy; {currentYear} All rights reserved.</p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-main-left">
            <img src={logoImage} alt="hirenext logo" className="footer-brand-logo" />
            <p className="footer-location">
              Location: Home Science college road,Napier Town, Jabalpur (Madhya Pradesh)
            </p>
            
            <button
              type="button"
              className="footer-admin-btn"
              onClick={() => setCurrentPage(isAdmin ? "adminpanel" : "adminlogin")}
            >
              {isAdmin ? "Admin panel" : "Admin login"}
            </button>
          </div>

          <div className="footer-map">
            <iframe
              title="office location map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3668.2831888238793!2d79.92884620000001!3d23.1598622!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3981af1f03fb1043%3A0x1637d2e9412d7205!2sHire%20Next%20Consulting%20Pvt%20Ltd!5e0!3m2!1sen!2sin!4v1771573754458!5m2!1sen!2sin"
              width="600"
              height="450"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {currentYear} All rights reserved.</p>
          <div className="footer-bottom-links">
            
          </div>
        </div>
      </div>
    </footer>
  );
}
