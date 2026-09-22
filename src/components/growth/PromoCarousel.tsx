import React, { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { PROMO_SLIDES } from "../../data/promoSlides";
import { isSuppressed, recordDismissal } from "./growthGate";

const ROTATE_MS = 6000;

const TONE: Record<"brand" | "banana", string> = {
  brand: "bg-gradient-to-r from-brand to-[#00ACC1] text-white",
  banana: "bg-gradient-to-r from-banana to-[#FFB300] text-gray-900",
};

const PromoCarousel: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    isSuppressed("promo-carousel", {
      pathname: window.location.pathname,
      referrer: document.referrer,
      viewportWidth: window.innerWidth,
    })
  );

  useEffect(() => {
    if (paused || dismissed) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % PROMO_SLIDES.length),
      ROTATE_MS
    );
    return () => window.clearInterval(id);
  }, [paused, dismissed]);

  const dismiss = useCallback(() => {
    recordDismissal("promo-carousel");
    setDismissed(true);
  }, []);

  if (dismissed) return null;

  const slide = PROMO_SLIDES[index];

  return (
    <div
      data-testid="promo-carousel"
      className={`relative ${TONE[slide.tone]}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        data-testid="promo-slide"
        className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3"
      >
        <span aria-hidden className="text-xl">{slide.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{slide.title}</p>
          <p className="truncate text-xs opacity-90">{slide.body}</p>
        </div>
        <a
          href={slide.ctaHref}
          className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-brand-dark"
        >
          {slide.ctaLabel}
        </a>
        <button
          type="button"
          data-testid="promo-dismiss"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="shrink-0 rounded-full p-1 opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-1">
        {PROMO_SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            data-testid="promo-dot"
            onClick={() => setIndex(i)}
            aria-label={`Show announcement ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
            className={`h-1 w-4 rounded-sm ${i === index ? "bg-white" : "bg-white/45"}`}
          />
        ))}
      </div>
    </div>
  );
};

export default PromoCarousel;
