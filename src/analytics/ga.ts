// GA4, loaded only after consent (ConsentBar). With no measurement id every
// call is a no-op, which is what tests and local development get.
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_MEASUREMENT_ID: string = process.env.REACT_APP_GA_MEASUREMENT_ID || "";

let loaded = false;

export function loadGa(id: string = GA_MEASUREMENT_ID): boolean {
  if (!id || loaded || typeof document === "undefined") return false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id, { anonymize_ip: true });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  script.setAttribute("data-ga", id);
  document.head.appendChild(script);
  loaded = true;
  return true;
}

export function gaEvent(name: string, params: Record<string, unknown> = {}): void {
  if (!loaded || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", name, params);
}

export function _resetGaForTests(): void {
  loaded = false;
  if (typeof window !== "undefined") {
    delete window.gtag;
    delete window.dataLayer;
  }
}
