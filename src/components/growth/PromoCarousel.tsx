import React, { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { PROMO_SLIDES } from "../../data/promoSlides";
import { isSuppressed, recordDismissal } from "./growthGate";

const ROTATE_MS = 6000;

// Both tones carry dark text. White on the brand gradient is 2.33:1 at
// #00BFA5 -- below AA for the 12-14px type this banner uses. Gray-900 on the
// same gradient is 7.6:1 at the light end and 6.5:1 at the dark end.
const TONE: Record<"brand" | "banana", string> = {
  brand: "bg-gradient-to-r from-brand to-[#00ACC1] text-gray-900",
  banana: "bg-gradient-to-r from-banana to-[#FFB300] text-gray-900",
};

const PromoCarousel: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Hidden until mounted. Suppression depends on viewport, referrer and
  // stored dismissals, none of which exist at prerender time; deciding in an
  // effect keeps the prerendered HTML and the first client render identical.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(
      isSuppressed("promo-carousel", {
        pathname: window.location.pathname,
        referrer: document.referrer,
        viewportWidth: window.innerWidth,
      })
    );
  }, []);

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
      {/* One row on a real screen; two rows below 640px. `truncate` used to
          hold it to one row at every width, which at 360px cut the title to
          "The app d...". Letting the copy wrap instead is only half the fix:
          sharing a 328px row with a CTA pill and a close button leaves the
          text about 150px, which is a four-line title. So the controls drop
          to their own row and the copy gets the full width. */}
      {/* On the spelling of these classes: bootstrap.custom.css is imported
          after Tailwind and ships `!important` utilities under names Tailwind
          also generates -- .px-4, .py-3, .gap-3, .flex-wrap, .pb-5 -- so
          those names here would resolve to Bootstrap's values (.pb-5 is
          3.6rem), not Tailwind's. Arbitrary values and the axis-specific
          gap utilities have no Bootstrap counterpart, so they hold. */}
      <div
        data-testid="promo-slide"
        className="mx-auto flex max-w-5xl items-center gap-x-3 px-[1rem] pb-[1.5rem] pt-[0.75rem] [flex-wrap:wrap] [row-gap:0.5rem] sm:pb-[0.75rem] sm:[flex-wrap:nowrap]"
      >
        <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-1">
          <span aria-hidden className="text-xl">{slide.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold leading-snug">{slide.title}</p>
            <p className="text-xs leading-snug opacity-80">{slide.body}</p>
          </div>
        </div>
        <a
          href={slide.ctaHref}
          className="ml-auto shrink-0 whitespace-nowrap rounded-full bg-gray-900 px-3 py-1.5 text-xs font-extrabold text-white"
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
            className={`h-1 w-4 rounded-sm ${i === index ? "bg-gray-900" : "bg-gray-900/35"}`}
          />
        ))}
      </div>
    </div>
  );
};

export default PromoCarousel;
