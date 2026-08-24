import { useState } from "react";
import emailjs from "@emailjs/browser";
import { Phone, MapPin, Mail, Send, MessageSquare, Loader2 } from "lucide-react";
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
    setIsSubmitting(true);

    try {
      if (isEmailJsConfigured(contactTemplateId)) {
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
      } else {
        const existingMessages = JSON.parse(localStorage.getItem("hirenext_contact_messages") || "[]");
        existingMessages.push({
          ...formData,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem("hirenext_contact_messages", JSON.stringify(existingMessages));
      }

      addNotification(
        "Thank you for contacting Hirenext! Our team has received your message and will reach out shortly.",
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
        <div className="contactus-overlay" aria-hidden="true" />

        <div className="contactus-shell">
          <div className="contactus-intro">
            <span className="contactus-eyebrow">Get In Touch</span>
            <h1>Let&apos;s build your next hiring move together.</h1>
            <p>
              Share what you need and our recruitment experts will connect with you right away.
            </p>
          </div>

          <div className="contactus-bottom">
            <aside className="contactus-info glass-card">
              <p className="contactus-info-label">Direct Communication</p>
              <a
                href="https://maps.app.goo.gl/F7gcbftUCUwLMo1V8"
                target="_blank"
                rel="noreferrer"
                className="contactus-info-link contactus-info-link-location"
              >
                <span className="contactus-info-icon">
                  <MapPin size={18} />
                </span>
                <span>
                  Home Science College Road, Napier Town, Jabalpur, Madhya Pradesh
                </span>
              </a>
              <div className="contactus-info-link">
                <span className="contactus-info-icon">
                  <Phone size={18} />
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
                  <Mail size={18} />
                </span>
                <span>hr@hirenextindia.com</span>
              </a>
            </aside>

            <form className="contactus-form glass-card" onSubmit={handleSubmit}>
              <h2>
                <MessageSquare size={20} className="section-title-icon" />
                <span>Send a Message</span>
              </h2>
              <div className="contactus-form-grid">
                <label className="contactus-field">
                  <span>First Name</span>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    required
                  />
                </label>

                <label className="contactus-field">
                  <span>Last Name</span>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    required
                  />
                </label>
              </div>

              <label className="contactus-field">
                <span>Email Address</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  required
                />
              </label>

              <label className="contactus-field">
                <span>Your Requirement / Message</span>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about your staffing or recruitment needs..."
                  rows="5"
                  required
                />
              </label>

              <button type="submit" className="btn btn-primary contactus-submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="spin-icon" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </section>
    </main>
  );
}

