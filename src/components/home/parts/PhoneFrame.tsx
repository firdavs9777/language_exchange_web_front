import React from "react";

/** Screenshots in public/images/app/, all exported at the same size. */
export type AppShot = "app-chat" | "app-study" | "app-community" | "app-moments";

export const SHOT_WIDTH = 590;
export const SHOT_HEIGHT = 1278;

export interface PhoneFrameProps {
  shot: AppShot;
  alt: string;
  /** The hero's front phone is the LCP image: it must not wait for lazy loading. */
  eager?: boolean;
  /**
   * Must include a position (`absolute` in the hero, `relative` in feature
   * rows): the frame sets none itself so the two utilities never fight, and
   * the notch is positioned against it.
   */
  className?: string;
}

/**
 * A real app screenshot in a CSS-only device bezel. Nothing about the frame
 * is an image -- one extra request per phone would buy nothing a border and a
 * radius do not already draw. Images are served from public/ (not imported),
 * so they never touch the JS bundle; width/height reserve the box so nothing
 * shifts when they arrive.
 */
const PhoneFrame: React.FC<PhoneFrameProps> = ({ shot, alt, eager = false, className = "" }) => (
  <div
    data-testid="phone-frame"
    className={`rounded-[2.25rem] bg-ink-900 p-[6px] shadow-[0_30px_60px_-20px_rgba(13,19,28,0.45)] ring-1 ring-white/10 sm:rounded-[2.6rem] sm:p-[8px] ${className}`}
  >
    <div className="overflow-hidden rounded-[1.9rem] bg-[#fff] sm:rounded-[2.1rem]">
      <picture>
        <source srcSet={`/images/app/${shot}.webp`} type="image/webp" />
        <img
          src={`/images/app/${shot}.png`}
          alt={alt}
          width={SHOT_WIDTH}
          height={SHOT_HEIGHT}
          loading={eager ? undefined : "lazy"}
          decoding="async"
          className="block h-auto w-full"
        />
      </picture>
    </div>
    <span
      aria-hidden
      className="absolute start-1/2 top-[11px] h-[14px] w-[30%] -translate-x-1/2 rounded-full bg-ink-900 rtl:translate-x-1/2 sm:top-[14px] sm:h-[18px]"
    />
  </div>
);

export default PhoneFrame;
