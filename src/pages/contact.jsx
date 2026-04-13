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

export default function Contact({ setCurrentPage }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addNotification } = useNotification();
  const { serviceId, publicKey, contactTemplateId } = getEmailJsConfig();

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
      await emailjs.send(serviceId, contactTemplateId, {
        form_type: "Contact Us",
        to_email: "Hirenextindia@gmail.com",
        first_name: formData.firstName,
        last_name: formData.lastName,
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        message: formData.message,
      }, {
        publicKey,
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
              <a href="tel:+919893083853" className="contactus-info-link">
                +91 9893083853
              </a>
              <a
                href="https://maps.app.goo.gl/F7gcbftUCUwLMo1V8"
                target="_blank"
                rel="noreferrer"
                className="contactus-info-link"
              >
                Home Science college road, Napier Town, Jabalpur, Madhya
                Pradesh
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
