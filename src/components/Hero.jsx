import "../styles/hero.css";
import CTAButtons from "./CTAbuttons";
import bgVideo from "../assets/video/bg_video.mp4";

export default function Hero({ setCurrentPage }) {
  return (
    <section className="hero">
      <video className="hero-video" autoPlay muted loop playsInline>
        <source src={bgVideo} type="video/mp4" />
      </video>
      <div className="hero-content">
        <h1 className="hero-title">Getting a new job made simple</h1>
        <p className="hero-subtitle">
          Kick start your career with us today!
        </p>
        <CTAButtons setCurrentPage={setCurrentPage} />
      </div>
    </section>
  );
}
