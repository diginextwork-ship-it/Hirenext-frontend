import { useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import { PhoneCall, User, Calendar, GraduationCap, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import "../styles/buttons.css";
import "../styles/schedule-call.css";
import PageBackButton from "../components/PageBackButton";

const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export default function ScheduleCall({ setCurrentPage }) {
  const formRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!serviceId || !templateId || !publicKey) {
      setStatus({
        type: "error",
        message:
          "Email service is not configured. Please set EmailJS keys in .env before submitting.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      await emailjs.sendForm(serviceId, templateId, formRef.current, {
        publicKey,
      });
      formRef.current.reset();
      setStatus({
        type: "success",
        message: "Your details were sent successfully! Our recruitment team will contact you shortly.",
      });
    } catch (error) {
      const message =
        error?.text ||
        error?.message ||
        "Failed to send details. Please try again.";
      setStatus({
        type: "error",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="schedule-call-page ui-page">
      <section className="schedule-call-container ui-shell">
        <div className="ui-page-back">
          <PageBackButton setCurrentPage={setCurrentPage} />
        </div>
        <div className="schedule-call-header">
          <div className="schedule-badge-pill">
            <PhoneCall size={14} />
            <span>Direct Recruiter Connect</span>
          </div>
          <h1>Schedule a Strategy Call</h1>
          <p>Share your background and career goals, and our team will connect with you.</p>
        </div>

        <div className="schedule-call-card glass-card">
          <form ref={formRef} className="schedule-call-form" onSubmit={handleSubmit}>
            <div className="schedule-field">
              <label htmlFor="user_name">
                <User size={15} />
                <span>Full Name</span>
              </label>
              <input id="user_name" name="user_name" type="text" placeholder="John Doe" required />
            </div>

            <div className="schedule-grid">
              <div className="schedule-field">
                <label htmlFor="user_age">
                  <Calendar size={15} />
                  <span>Age</span>
                </label>
                <input id="user_age" name="user_age" type="number" min="14" max="100" placeholder="24" required />
              </div>
              <div className="schedule-field">
                <label htmlFor="passing_year">
                  <Calendar size={15} />
                  <span>Graduation Year</span>
                </label>
                <input
                  id="passing_year"
                  name="passing_year"
                  type="number"
                  min="1980"
                  max="2100"
                  placeholder="2023"
                  required
                />
              </div>
            </div>

            <div className="schedule-grid">
              <div className="schedule-field">
                <label htmlFor="qualification_type">
                  <GraduationCap size={15} />
                  <span>Qualification Status</span>
                </label>
                <select id="qualification_type" name="qualification_type" required>
                  <option value="">Select Status</option>
                  <option value="Completed">Completed / Latest</option>
                  <option value="Pursuing">Currently Pursuing</option>
                </select>
              </div>
              <div className="schedule-field">
                <label htmlFor="qualification_name">
                  <GraduationCap size={15} />
                  <span>Degree / Specialization</span>
                </label>
                <input id="qualification_name" name="qualification_name" type="text" placeholder="B.Tech Computer Science" required />
              </div>
            </div>

            <button className="btn btn-primary schedule-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="spin-icon" />
                  <span>Booking Call...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Request Callback</span>
                </>
              )}
            </button>

            {status.message && (
              <div className={`schedule-status-banner ${status.type}`}>
                {status.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{status.message}</span>
              </div>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}

