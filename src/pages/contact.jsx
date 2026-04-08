import { useState } from "react";
import PageBackButton from "../components/PageBackButton";
import { useNotification } from "../context/NotificationContext";
import bgVideo from "../assets/video/bg_video.mp4";
import "../styles/contactus.css";

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  message: "",
};

export default function Contact({ setCurrentPage }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const { addNotification } = useNotification();

  const handleChange = ({ target }) => {
    const { name, value } = target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    addNotification(
      "Thanks for reaching out. Our team will get back to you shortly.",
      "success",
    );
    setFormData(INITIAL_FORM);
  };

  return (
    <main className="contactus-page ui-page">
      <section className="contactus-shell ui-shell">
        <div className="ui-page-back contactus-back">
          <PageBackButton setCurrentPage={setCurrentPage} />
        </div>

        <div className="contactus-panel">
          <video className="contactus-video" autoPlay muted loop playsInline>
            <source src={bgVideo} type="video/mp4" />
          </video>
          <div className="contactus-overlay" aria-hidden="true"></div>

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

              <button type="submit" className="contactus-submit">
                Submit
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
