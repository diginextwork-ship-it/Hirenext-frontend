import { useEffect, useRef, useState } from "react";
import founderPhoto from "../assets/about/founders_pic.jpeg";
import directorPhoto from "../assets/about/director.jpeg";
import "../styles/about-us.css";

const CLIENTS = [
  "Transcom",
  "IGT Solutions",
  "Aditya Birla Capital",
  "TTEC",
  "Digit",
  "Concentrix",
  "Teleperformance",
  "HDFC Sales",
  "Protium Finance",
  "Paisabazaar",
  "L&T Finance",
  "ICICI Lombard",
  "Policybazaar",
  "Kotak Securities",
];

const EXPERTISE = [
  { icon: "\u260E", label: "BPO & KPO" },
  { icon: "\u{1F6D2}", label: "E-Commerce" },
  { icon: "\u{1F3ED}", label: "Manufacturing" },
  { icon: "\u{1F4BB}", label: "IT" },
  { icon: "\u{1F9FC}", label: "FMCG" },
  { icon: "\u{1F69A}", label: "Logistics" },
  { icon: "\u{1F3E6}", label: "Banking & Finance" },
  { icon: "\u{1F697}", label: "Automobiles" },
  { icon: "\u{1F3D7}", label: "Construction" },
];

const STATS = [
  { num: "2016", label: "Year Founded" },
  { num: "60+", label: "Expert Recruiters" },
  { num: "30K+", label: "Job Seekers Placed" },
  { num: "70+", label: "Corporate Partners" },
];

const MISSION_POINTS = [
  "Provide exceptional recruitment solutions that connect top talent with leading organizations and create mutual growth.",
  "Be a trusted partner through personalized service and long-term relationships with clients and candidates alike.",
  "Transform the recruitment landscape through sharper processes, modern tools, and a higher standard of hiring excellence.",
];

const LEADERS = [
  {
    name: "Shubham Barsaiyan",
    role: "Founder & Director",
    image: founderPhoto,
    imageAlt: "Shubham Barsaiyan, Founder and Director of HireNext",
    accentClass: "coral-av",
    bio:
      "With deep roots in recruitment since 2016, Shubham leads a team of expert recruiters focused on raising the bar for hiring quality across India. His vision of integrity, speed, and personalized service shaped HireNext into a trusted staffing partner.",
  },
  {
    name: "Radhika",
    role: "Director",
    image: directorPhoto,
    imageAlt: "Radhika, Director at HireNext",
    accentClass: "blue-av",
    bio:
      "Radhika leads with clarity, discipline, and a strong people-first mindset that helps HireNext scale teams and partnerships with consistency. Her strategic approach has strengthened delivery across sectors while nurturing an inclusive and high-performing culture.",
  },
];

function useInView(ref) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [ref]);

  return visible;
}

function AnimatedEl({
  children,
  className,
  style,
  delay = 0,
}) {
  const ref = useRef(null);
  const visible = useInView(ref);

  return (
    <div
      ref={ref}
      className={`${className} ${visible ? "visible" : ""}`}
      style={{ ...style, transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

export default function AboutUs({ onBack }) {
  const clientsDoubled = [...CLIENTS, ...CLIENTS];

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    window.history.back();
  };

  return (
    <>
      <nav className="about-topbar">
        <div className="topbar-brand">
          <div className="topbar-logo-dot" />
          <span className="topbar-brand-name">
            Hire<span>NexT</span> India
          </span>
        </div>

        <button
          type="button"
          className="btn-back"
          onClick={handleBack}
          aria-label="Back to previous page"
        >
          <span className="btn-back-arrow" aria-hidden="true">
            &larr;
          </span>
          <span className="btn-back-label">Back</span>
        </button>
      </nav>

      <section className="about-section">
        <div className="about-inner">
          <AnimatedEl className="section-label">About Us</AnimatedEl>

          <AnimatedEl className="section-title">
            <h1>
              Connecting <em>Talent</em>
              <br />
              with Opportunity
            </h1>
          </AnimatedEl>

          <div className="stats-row">
            {STATS.map((stat, index) => (
              <AnimatedEl key={stat.label} className="stat-card" delay={index * 80}>
                <div className="stat-number">{stat.num}</div>
                <div className="stat-label">{stat.label}</div>
              </AnimatedEl>
            ))}
          </div>

          <div className="two-col">
            <AnimatedEl className="story-card">
              <span className="card-tag coral">Our Story</span>
              <h2 className="card-heading">Who We Are</h2>
              <p className="card-body">
                Hire NexT India Consulting is a PAN India recruitment firm founded
                in 2016 by Shubham Barsaiyan. With a dedicated team of 60+
                expert recruiters, we connect strong talent with leading
                organizations across major industry sectors.
              </p>
              <p className="card-body story-card-second">
                Built on integrity, expertise, and personalized service, we
                have grown into a trusted outsourcing partner for 70+
                corporate and multinational companies, delivering manpower that
                creates measurable business results.
              </p>
            </AnimatedEl>

            <AnimatedEl className="mission-card" delay={100}>
              <span className="card-tag white">Mission & Vision</span>
              <h2 className="card-heading">Where We Are Going</h2>
              <div className="mission-items">
                {MISSION_POINTS.map((point) => (
                  <div key={point} className="mission-item">
                    <div className="mission-dot" />
                    <p className="mission-text">{point}</p>
                  </div>
                ))}
              </div>
            </AnimatedEl>
          </div>

          <div className="leaders-section">
            <AnimatedEl className="leaders-heading">
              <h2>Leadership</h2>
            </AnimatedEl>

            <div className="leaders-grid">
              {LEADERS.map((leader, index) => (
                <AnimatedEl
                  key={leader.name}
                  className="leader-card"
                  delay={index * 130}
                >
                  <div className="leader-portrait-wrap">
                    <img
                      src={leader.image}
                      alt={leader.imageAlt}
                      className="leader-portrait"
                    />
                    <div className={`leader-avatar ${leader.accentClass}`}>
                      {leader.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                  </div>

                  <div className="leader-info">
                    <div className="leader-name">{leader.name}</div>
                    <div className="leader-role">{leader.role}</div>
                    <p className="leader-bio">{leader.bio}</p>
                  </div>
                </AnimatedEl>
              ))}
            </div>
          </div>

          <AnimatedEl className="expertise-section">
            <div className="expertise-heading">Our Expertise</div>
            <div className="expertise-grid">
              {EXPERTISE.map((item) => (
                <div key={item.label} className="expertise-pill">
                  <span className="pill-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  {item.label}
                </div>
              ))}
            </div>
          </AnimatedEl>

          <AnimatedEl className="clients-section">
            <div className="clients-heading">Our Clients</div>
            <div className="marquee-wrapper">
              <div className="marquee-track">
                {clientsDoubled.map((client, index) => (
                  <div key={`${client}-${index}`} className="client-chip">
                    {client}
                  </div>
                ))}
              </div>
            </div>
          </AnimatedEl>

          <AnimatedEl className="quote-block">
            <p className="quote-text">
              "If you are looking for a recruitment partner that prioritizes your
              needs and delivers results, you have found us."
            </p>
            <div className="quote-source">Hire NexT India Consulting | est. 2016</div>
          </AnimatedEl>
        </div>
      </section>
    </>
  );
}
