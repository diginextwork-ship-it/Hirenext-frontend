import { useEffect, useMemo, useRef, useState } from "react";

const EASING_MAP = {
  "power3.out": "cubic-bezier(0.22, 1, 0.36, 1)",
};

export default function SplitText({
  text,
  className = "",
  delay = 20,
  duration = 1.25,
  ease = "power3.out",
  splitType = "chars",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = "-100px",
  textAlign = "left",
  onLetterAnimationComplete,
  showCallback = false,
}) {
  const elementRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  const parts = useMemo(() => {
    if (!text) return [];
    if (splitType === "words") return text.split(" ");
    return text.split("");
  }, [text, splitType]);

  useEffect(() => {
    const target = elementRef.current;
    if (!target) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (!isVisible || !showCallback || !onLetterAnimationComplete || !parts.length) return;
    const totalDelayMs = (parts.length - 1) * delay + duration * 1000;
    const timer = window.setTimeout(() => {
      onLetterAnimationComplete();
    }, totalDelayMs);
    return () => window.clearTimeout(timer);
  }, [isVisible, showCallback, onLetterAnimationComplete, parts.length, delay, duration]);

  const timing = EASING_MAP[ease] || "ease-out";

  return (
    <div
      ref={elementRef}
      className={className}
      style={{ textAlign }}
      aria-label={text}
    >
      {parts.map((part, index) => {
        const isSpace = splitType === "chars" && part === " ";
        const token = isSpace ? "\u00A0" : part;
        return (
          <span
            key={`${part}-${index}`}
            style={{
              display: "inline-block",
              whiteSpace: isSpace ? "pre" : "normal",
              opacity: isVisible ? to.opacity : from.opacity,
              transform: `translateY(${isVisible ? to.y : from.y}px)`,
              transitionProperty: "opacity, transform",
              transitionDuration: `${duration}s`,
              transitionTimingFunction: timing,
              transitionDelay: `${index * delay}ms`,
            }}
          >
            {token}
            {splitType === "words" ? "\u00A0" : ""}
          </span>
        );
      })}
    </div>
  );
}
