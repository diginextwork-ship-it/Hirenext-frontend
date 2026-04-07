import "../styles/hero.css";
import CTAButtons from "./CTAbuttons";
import bgVideo from "../assets/video/bg_video.mp4";

export default function Hero({ setCurrentPage }) {
  return (
    <section className="hero">
      <video className="hero-video" autoPlay muted loop playsInline>
        <source src={bgVideo} type="video/mp4" />
      </video>
      <div className="hero-orb hero-orb-left" aria-hidden="true"></div>
      <div className="hero-orb hero-orb-right" aria-hidden="true"></div>
      <div className="hero-content">
        <span className="hero-eyebrow">Talent search, redesigned</span>
        <h1 className="hero-title">Getting a new job made simple</h1>
        <p className="hero-subtitle">
          A sharper hiring experience for candidates, recruiters, and teams
          that want to move faster with confidence.
        </p>
        <CTAButtons setCurrentPage={setCurrentPage} />
      </div>
    </section>
  );
}
