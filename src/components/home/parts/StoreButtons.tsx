import React from "react";
import StoreLink, { StorePlacement } from "../../growth/StoreLink";

export interface StoreButtonsProps {
  placement: StorePlacement;
  /** "dark" pills on light backgrounds, "light" pills on the teal CTA band. */
  tone?: "dark" | "light";
  className?: string;
}

// The stores' own two-line lockup ("Download on the / App Store"), skinned
// here. StoreLink owns the URLs, UTM tags and tap tracking.
const BADGE =
  "min-w-[10.5rem] justify-center rounded-2xl px-5 py-2.5 [text-align:start] shadow-lift transition-transform duration-200 motion-safe:hover:-translate-y-0.5 " +
  "[&>div]:flex [&>div]:flex-col [&_.btn-label]:text-[0.68rem] [&_.btn-label]:leading-tight [&_.btn-label]:opacity-80 " +
  "[&_.btn-store]:font-display [&_.btn-store]:text-[1.05rem] [&_.btn-store]:font-bold [&_.btn-store]:leading-tight";

const SKIN = {
  dark: "bg-ink-950 text-[#fff] hover:text-white dark:bg-white dark:text-ink-950 dark:hover:text-ink-950",
  light: "bg-[#fff] text-ink-950 hover:text-ink-950",
};

const StoreButtons: React.FC<StoreButtonsProps> = ({ placement, tone = "dark", className = "" }) => (
  <div className={`flex flex-wrap gap-[0.75rem] ${className}`}>
    <StoreLink store="ios" placement={placement} variant="badge" className={`${BADGE} ${SKIN[tone]}`} />
    <StoreLink store="android" placement={placement} variant="badge" className={`${BADGE} ${SKIN[tone]}`} />
  </div>
);

export default StoreButtons;
