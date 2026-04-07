import "../styles/features.css";
import SplitText from "./SplitText";

const FEATURE_CARDS = [
  {
    icon: "01",
    title: "Quick Turnaround",
    copy:
      "Fill open roles faster with a responsive hiring pipeline and curated candidate flow.",
  },
  {
    icon: "02",
    title: "Screened Professionals",
    copy:
      "Every profile is reviewed for fit, quality, and team readiness before it reaches you.",
  },
  {
    icon: "03",
    title: "Precision Matching",
    copy:
      "We align hiring goals, role nuance, and candidate strengths to improve every shortlist.",
  },
];

export default function Features() {
  const handleAnimationComplete = () => {
    console.log("All letters have animated!");
  };

  return (
    <section className="features">
      <div className="features-backdrop" aria-hidden="true"></div>
      <div className="features-container">
        <div className="features-header">
          <SplitText
            text="hiring shouldn't be hard"
            className="features-title"
            delay={22}
            duration={0.65}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 40 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="-100px"
            textAlign="center"
            onLetterAnimationComplete={handleAnimationComplete}
            showCallback
          />
          <SplitText
            text="We understand that landing a first job can be overwhelming."
            className="features-description"
            delay={6}
            duration={0.45}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 20 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="-100px"
            textAlign="center"
          />
          <SplitText
            text="We make it simple to build a high-performing team with expert staffing solutions that fit your unique needs."
            className="features-description"
            delay={5}
            duration={0.4}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 16 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="-100px"
            textAlign="center"
          />
        </div>

        <div className="features-grid">
          {FEATURE_CARDS.map((card, index) => (
            <article
              className="feature-card"
              key={card.title}
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="feature-icon">
                <span>{card.icon}</span>
              </div>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
