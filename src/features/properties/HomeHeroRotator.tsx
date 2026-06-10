import { useEffect, useRef, useState, type ReactNode } from "react";

export function HomeHeroRotator({ slides, labels, interval = 6500 }: { slides: ReactNode[]; labels: string[]; interval?: number }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const hasRotated = useRef(false);

  // First rotation is guaranteed: it fires once after `interval` regardless of
  // hover/pause, so the landlord hero always reveals itself at least once. Its
  // timer is set on mount only, so hovering can't reset or block it.
  useEffect(() => {
    if (slides.length < 2) return;
    const id = window.setTimeout(() => {
      hasRotated.current = true;
      setActive((current) => (current + 1) % slides.length);
    }, interval);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subsequent rotations: continuous cycle that respects pause-on-hover/focus.
  // (prefers-reduced-motion is softened to a quick opacity fade via CSS.)
  useEffect(() => {
    if (!hasRotated.current || paused || slides.length < 2) return;
    const id = window.setTimeout(() => setActive((current) => (current + 1) % slides.length), interval);
    return () => window.clearTimeout(id);
  }, [active, paused, slides.length, interval]);

  return (
    <div
      className="hero-rotator"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slides.map((slide, index) => (
        <HeroSlide key={index} active={index === active}>{slide}</HeroSlide>
      ))}
      <div className="hero-rotator-dots" role="tablist" aria-label="Hero highlights">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-label={labels[index] || `Slide ${index + 1}`}
            className={index === active ? "active" : ""}
            onClick={() => setActive(index)}
          />
        ))}
      </div>
    </div>
  );
}

function HeroSlide({ active, children }: { active: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (active) node.removeAttribute("inert");
    else node.setAttribute("inert", "");
  }, [active]);
  return (
    <div ref={ref} className={`hero-slide ${active ? "active" : ""}`} aria-hidden={!active}>
      {children}
    </div>
  );
}
