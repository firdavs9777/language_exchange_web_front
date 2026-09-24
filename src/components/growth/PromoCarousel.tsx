import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { PROMO_SLIDES, PromoSlide, promoKey } from "../../data/promoSlides";
import { trackEvent } from "../../analytics/track";
import { gaEvent } from "../../analytics/ga";
import StoreLink from "./StoreLink";
import { isSuppressed, recordDismissal } from "./growthGate";

const ROTATE_MS = 6000;
const PLACEMENT = "promo-carousel";

// The screenshots are 480 x ~1100 exports of the real app. The box crops them
// from the top, so the bottom of the phone screen runs off the bottom edge of
// the card -- which is the whole illusion: the app continues past the band.
// Declared here rather than per slide so the four boxes are identical and the
// band's height cannot change when a slide advances.
const IMAGE_W = 480;
const IMAGE_H = 1100;

/**
 * One slide: the argument on the left, the evidence on the right.
 *
 * All four are mounted at once, stacked in a single grid cell, and the ones
 * that are not showing are `invisible` -- which takes them out of the tab
 * order and the accessibility tree without changing the band's height. A
 * mount-per-slide would reload the screenshot on every rotation and flash.
 */
const Slide: React.FC<{ slide: PromoSlide; active: boolean; index: number }> = ({
  slide,
  active,
  index,
}) => {
  const { t } = useTranslation();
  const label = (field: string, fallback: string) =>
    t(promoKey(slide.key, field)) || fallback;

  // `fetchpriority` is spelled lowercase on purpose: React passes unknown
  // all-lowercase attributes through untouched, and the camelCase prop is not
  // in the React 18 typings this TypeScript understands.
  const loadingProps: any =
    index === 0 ? { loading: "eager", fetchpriority: "high" } : { loading: "lazy" };

  const onCtaTap = () => {
    // Measurement is never worth a lost install: both trackers are optional.
    try {
      trackEvent("cta_tap", { placement: PLACEMENT, platform: "web" });
    } catch {
      /* ignored */
    }
    try {
      gaEvent("cta_tap", { placement: PLACEMENT, platform: "web" });
    } catch {
      /* ignored */
    }
  };

  return (
    <div
      data-testid="promo-slide"
      data-active={active ? "true" : "false"}
      id={`promo-panel-${slide.key}`}
      role="tabpanel"
      aria-labelledby={`promo-tab-${slide.key}`}
      aria-hidden={active ? undefined : true}
      className={
        "col-start-1 row-start-1 flex flex-col-reverse transition-opacity duration-500 " +
        "motion-reduce:transition-none sm:grid sm:grid-cols-[minmax(0,1fr)_11rem] " +
        "sm:items-end sm:gap-x-[2rem] lg:grid-cols-[minmax(0,1fr)_13rem] " +
        (active ? "opacity-100" : "pointer-events-none opacity-0 invisible")
      }
    >
      <div className="pb-[2.5rem] pt-[0.75rem] sm:py-[1.75rem]">
        <p className="bt-eyebrow text-brand-light">{label("eyebrow", slide.eyebrow)}</p>
        <p className="mt-[0.5rem] font-display text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl">
          {label("title", slide.title)}
        </p>
        <p className="mt-[0.5rem] max-w-md text-sm leading-relaxed text-ink-300">
          {label("body", slide.body)}
        </p>

        <div className="mt-[1.125rem] flex flex-wrap items-center gap-x-[0.625rem] gap-y-[0.5rem]">
          {/* Below 640px the store is a coin flip we do not have to call:
              /download?go=1 reads the user agent after the hop. Above it,
              there is room to offer both and skip the interstitial. */}
          <a
            href="/download?go=1"
            data-testid="promo-cta"
            onClick={onCtaTap}
            tabIndex={active ? undefined : -1}
            className="inline-flex items-center justify-center rounded-full bg-brand px-[1.125rem] py-[0.5rem] text-sm font-extrabold text-ink-950 sm:hidden"
          >
            {label("cta", slide.cta)}
          </a>
          <span className="hidden gap-x-[0.625rem] sm:flex">
            <StoreLink
              store="ios"
              placement={PLACEMENT}
              variant="button"
              className="rounded-full bg-white px-[1rem] py-[0.5rem] text-sm font-extrabold text-ink-950"
            />
            <StoreLink
              store="android"
              placement={PLACEMENT}
              variant="button"
              className="rounded-full border-[1px] border-white/30 px-[1rem] py-[0.5rem] text-sm font-extrabold text-white"
            />
          </span>
        </div>
      </div>

      {/* Fixed aspect box: the screenshot drops into a slot that already has
          its final size, so nothing on the homepage moves when it arrives. */}
      <div className="relative mx-auto aspect-[480/440] w-[8.75rem] overflow-hidden rounded-t-[1.25rem] border-[1px] border-white/15 bg-white shadow-lift sm:mx-0 sm:aspect-[480/660] sm:w-full">
        <picture>
          <source srcSet={slide.image.webp} type="image/webp" />
          <img
            {...loadingProps}
            src={slide.image.png}
            width={IMAGE_W}
            height={IMAGE_H}
            decoding="async"
            alt={label("alt", slide.image.alt)}
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        </picture>
      </div>
    </div>
  );
};

interface PromoBandProps {
  index: number;
  onSelect: (i: number) => void;
  onDismiss: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onPauseChange: (paused: boolean) => void;
}

/**
 * The band itself, split from the gate above it on purpose: PromoCarousel
 * renders nothing at all until it has a DOM to measure, and a component that
 * returns null must not have called useTranslation on the way there -- the
 * prerender would pay for an i18n subscription it never uses.
 */
const PromoBand: React.FC<PromoBandProps> = ({
  index,
  onSelect,
  onDismiss,
  onKeyDown,
  onPauseChange,
}) => {
  const { t } = useTranslation();
  const label = t("growth.promo.label") || "What the BananaTalk app does";

  return (
    <section
      data-testid="promo-carousel"
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={onKeyDown}
      onMouseEnter={() => onPauseChange(true)}
      onMouseLeave={() => onPauseChange(false)}
      onFocus={() => onPauseChange(true)}
      onBlur={() => onPauseChange(false)}
      className="relative overflow-hidden bg-ink-950 text-white"
    >
      {/* One soft teal light source behind the phone, so the band reads as a
          surface rather than as a black rectangle. Decorative, no hit area. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-2/3 bg-gradient-to-l from-brand/25 to-transparent"
      />

      <button
        type="button"
        data-testid="promo-dismiss"
        onClick={onDismiss}
        aria-label={t("growth.promo.dismiss") || "Dismiss app promotion"}
        className="absolute right-[0.5rem] top-[0.5rem] z-20 rounded-full p-[0.375rem] text-ink-300 hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative mx-auto max-w-5xl px-[1rem]">
        <div className="grid">
          {PROMO_SLIDES.map((slide, i) => (
            <Slide key={slide.key} slide={slide} active={i === index} index={i} />
          ))}
        </div>

        <div
          role="tablist"
          aria-label={label}
          className="absolute bottom-[1rem] left-[1rem] flex gap-x-[0.375rem]"
        >
          {PROMO_SLIDES.map((slide, i) => (
            <button
              key={slide.key}
              type="button"
              role="tab"
              id={`promo-tab-${slide.key}`}
              data-testid="promo-dot"
              onClick={() => onSelect(i)}
              aria-controls={`promo-panel-${slide.key}`}
              aria-selected={i === index}
              aria-current={i === index ? "true" : undefined}
              aria-label={t(promoKey(slide.key, "eyebrow")) || slide.eyebrow}
              tabIndex={i === index ? 0 : -1}
              className={`h-[0.25rem] w-[1.5rem] rounded-full ${
                i === index ? "bg-brand" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

const PromoCarousel: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  // Hidden until mounted. Suppression depends on viewport, referrer and
  // stored dismissals, none of which exist at prerender time; deciding in an
  // effect keeps the prerendered HTML and the first client render identical.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(
      isSuppressed(PLACEMENT, {
        pathname: window.location.pathname,
        referrer: document.referrer,
        viewportWidth: window.innerWidth,
      })
    );
    // jsdom has no matchMedia, and neither does every embedded browser.
    try {
      if (typeof window.matchMedia === "function") {
        setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      }
    } catch {
      /* no preference we can read: rotate as usual */
    }
  }, []);

  useEffect(() => {
    if (paused || dismissed || reduceMotion) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % PROMO_SLIDES.length),
      ROTATE_MS
    );
    return () => window.clearInterval(id);
  }, [paused, dismissed, reduceMotion]);

  const dismiss = useCallback(() => {
    recordDismissal(PLACEMENT);
    setDismissed(true);
  }, []);

  const step = useCallback((delta: number) => {
    setIndex((i) => (i + delta + PROMO_SLIDES.length) % PROMO_SLIDES.length);
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      }
    },
    [step]
  );

  if (dismissed) return null;

  return (
    <PromoBand
      index={index}
      onSelect={setIndex}
      onDismiss={dismiss}
      onKeyDown={onKeyDown}
      onPauseChange={setPaused}
    />
  );
};

export default PromoCarousel;
