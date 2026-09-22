// Carousel copy lives here, not in the component, so changing a slide is a
// data edit. `tone` is deliberately limited to two values: teal means "here is
// the product", banana means "here is an offer".
export interface PromoSlide {
  id: string;
  icon: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  tone: "brand" | "banana";
}

export const PROMO_SLIDES: PromoSlide[] = [
  {
    id: "app-does-more",
    icon: "📱",
    title: "The app does more than the web",
    body: "AI tutor, voice rooms and reels are mobile only",
    ctaLabel: "Get the app",
    ctaHref: "/download",
    tone: "brand",
  },
  {
    id: "vip",
    icon: "🍌",
    title: "VIP from $9.99 a month",
    body: "Unlimited messages, no ads, see who visited you",
    ctaLabel: "See plans",
    ctaHref: "#pricing",
    tone: "banana",
  },
  {
    id: "gatherings",
    icon: "✨",
    title: "New: Gatherings",
    body: "Find a language meetup near you",
    ctaLabel: "Explore",
    ctaHref: "/download",
    tone: "brand",
  },
];
