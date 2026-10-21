import { GA_MEASUREMENT_ID } from "./ga";
import { adsenseClient, autoAdsEnabled } from "../components/ads/adsenseConfig";

/**
 * Whether there is anything for a visitor to consent to or withdraw: GA is
 * configured, or ads actually run (a client id AND auto ads; AdSense sets ad cookies, so the choice matters even
 * with no analytics id). Read on every call so the build-time env stays
 * testable.
 */
export const consentControlsEnabled = (): boolean =>
  !!GA_MEASUREMENT_ID || (!!adsenseClient() && autoAdsEnabled());
