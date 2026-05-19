import { useState } from "react";
import emailjs from "@emailjs/browser";
import PageBackButton from "../components/PageBackButton";
import { useNotification } from "../context/NotificationContext";
import bgVideo from "../assets/video/bg_video.mp4";
import { getEmailJsConfig, isEmailJsConfigured } from "../utils/emailjs";
import "../styles/contactus.css";

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  message: "",
};

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11 11 0 0 0 3.45.55 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11 11 0 0 0 .55 3.45 1 1 0 0 1-.25 1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 21s6-5.33 6-11a6 6 0 1 0-12 0c0 5.67 6 11 6 11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="10"
        r="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m4 8 8 6 8-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Contact({ setCurrentPage }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addNotification } = useNotification();
  const {
    serviceId,
    publicKey,
    contactServiceId,
    contactPublicKey,
    contactTemplateId,
  } = getEmailJsConfig();

  const handleChange = ({ target }) => {
    const { name, value } = target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isEmailJsConfigured(contactTemplateId)) {
      addNotification(
        "Email service is not configured. Please add the EmailJS environment variables first.",
        "error",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await emailjs.send(contactServiceId || serviceId, contactTemplateId, {
        form_type: "Contact Us",
        to_email: "Hirenextindia@gmail.com",
        first_name: formData.firstName,
        last_name: formData.lastName,
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        message: formData.message,
      }, {
        publicKey: contactPublicKey || publicKey,
      });

      addNotification(
        "Thanks for reaching out. Your message has been emailed successfully.",
        "success",
      );
      setFormData(INITIAL_FORM);
    } catch (error) {
      addNotification(
        error?.text || error?.message || "Failed to send your message. Please try again.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="contactus-page ui-page">
      <div className="ui-page-back contactus-back">
        <PageBackButton setCurrentPage={setCurrentPage} />
      </div>

      <section className="contactus-panel">
        <video className="contactus-video" autoPlay muted loop playsInline>
          <source src={bgVideo} type="video/mp4" />
        </video>
        <div className="contactus-overlay" aria-hidden="true"></div>

        <div className="contactus-shell">
          <div className="contactus-intro">
            <span className="contactus-eyebrow">Contact us</span>
            <h1>Let&apos;s build your next hiring move together.</h1>
            <p>
              Share what you need and our team will connect with you with the
              right next steps.
            </p>
          </div>

          <div className="contactus-bottom">
            <aside className="contactus-info">
              <p className="contactus-info-label">Reach us directly</p>
              <a
                href="https://maps.app.goo.gl/F7gcbftUCUwLMo1V8"
                target="_blank"
                rel="noreferrer"
                className="contactus-info-link contactus-info-link-location"
              >
                <span className="contactus-info-icon">
                  <LocationIcon />
                </span>
                <span>
                  Home Science college road, Napier Town, Jabalpur, Madhya
                  Pradesh
                </span>
              </a>
              <div className="contactus-info-link">
                <span className="contactus-info-icon">
                  <PhoneIcon />
                </span>
                <span className="contactus-phone-links">
                  <a href="tel:+919893083853">+91 9893083853</a>
                  <a href="tel:+917614085424">0761-4085424</a>
                </span>
              </div>
              <a
                href="mailto:hr@hirenextindia.com"
                className="contactus-info-link"
              >
                <span className="contactus-info-icon">
                  <EmailIcon />
                </span>
                <span>hr@hirenextindia.com</span>
              </a>
            </aside>

            <form className="contactus-form" onSubmit={handleSubmit}>
              <h2>Send a message</h2>
              <div className="contactus-form-grid">
                <label className="contactus-field">
                  <span>First name</span>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="First name"
                    required
                  />
                </label>

                <label className="contactus-field">
                  <span>Last name</span>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last name"
                    required
                  />
                </label>
              </div>

              <label className="contactus-field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label className="contactus-field">
                <span>Message</span>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us a little about your requirement"
                  rows="5"
                  required
                />
              </label>

              <button type="submit" className="contactus-submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Submit"}
              </button>
            </form>
          </div>

        </div>
      </section>
    </main>
  );
}
