import "../styles/features.css";
import SplitText from "./SplitText";

export default function Features() {
  const handleAnimationComplete = () => {
    console.log("All letters have animated!");
  };

  return (
    <section className="features">
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
          <div className="feature-card">
            <div className="feature-icon">
              <span>⚡</span>
            </div>
            <h3>Quick Turnaround</h3>
            <p>
              Fill your open positions faster with our extensive network of
              qualified candidates.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <span>👥</span>
            </div>
            <h3>Screened Professionals</h3>
            <p>
              Every candidate is thoroughly vetted to ensure they meet your
              standards and culture.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <span>🎯</span>
            </div>
            <h3>Perfect Match</h3>
            <p>
              We take time to understand your needs and match you with the ideal
              candidates.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
