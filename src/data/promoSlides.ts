// The "get the app" carousel, as data. Four slides, each one a thing the app
// does that the web cannot, shown rather than claimed: the copy on the left is
// the argument and the screenshot on the right is the evidence.
//
// The strings here are the English source. The component resolves each one
// through `t("growth.promo.<key>.<field>")` and falls back to the value below,
// so a locale that has not been translated yet renders English instead of a
// raw key (src/utils/i18n.ts returns "" for a missing key on purpose). The key
// list for the translators lives at .superpowers/sdd/promo-keys.json.
//
// Every image is a real screenshot of the shipped app, 480x~1100, exported as
// webp with a png fallback under public/images/app/. The component crops them
// from the top, so what a slide shows is the top of that screen; anything below
// the crop bleeds off the bottom edge of the card.
export interface PromoSlideImage {
  /** Preferred source; served to anything that understands image/webp. */
  webp: string;
  /** Fallback for the handful of browsers that do not. */
  png: string;
  /** What the screenshot shows, for a reader who cannot see it. */
  alt: string;
}

export interface PromoSlide {
  /** Stable id: the React key, the dot's id, and the i18n key segment. */
  key: string;
  image: PromoSlideImage;
  eyebrow: string;
  title: string;
  body: string;
  /** Label on the single "get the app" button shown below 640px. */
  cta: string;
}

const IMAGE_DIR = "/images/app";

export const PROMO_SLIDES: PromoSlide[] = [
  {
    key: "tutor",
    image: {
      webp: `${IMAGE_DIR}/study.webp`,
      png: `${IMAGE_DIR}/study.png`,
      alt: "The BananaTalk Study Hub on a phone, offering Practice with AI, review and daily challenges",
    },
    eyebrow: "AI tutor",
    title: "Fix your Korean as you type",
    body: "Private corrections on every message, plus quizzes and grammar drills between chats.",
    cta: "Get the app",
  },
  {
    key: "voice",
    image: {
      webp: `${IMAGE_DIR}/chat.webp`,
      png: `${IMAGE_DIR}/chat.png`,
      alt: "A BananaTalk chat on a phone, with voice notes and a shared location card",
    },
    eyebrow: "Voice notes & rooms",
    title: "Hear how it really sounds",
    body: "Send voice notes, share where you are, and join live voice rooms with native speakers.",
    cta: "Get the app",
  },
  {
    key: "moments",
    image: {
      webp: `${IMAGE_DIR}/moments.webp`,
      png: `${IMAGE_DIR}/moments.png`,
      alt: "The BananaTalk Moments feed on a phone, with photos posted by other learners",
    },
    eyebrow: "Moments & stories",
    title: "Share your week in two languages",
    body: "Post photos and thoughts; friends read them translated and correct you kindly.",
    cta: "Get the app",
  },
  {
    key: "inbox",
    image: {
      webp: `${IMAGE_DIR}/messages.webp`,
      png: `${IMAGE_DIR}/messages.png`,
      alt: "The BananaTalk inbox on a phone, listing recent conversations with native speakers",
    },
    eyebrow: "Real conversations",
    title: "People who actually write back",
    body: "Your chats, waves and reactions in one inbox — read, translated, answered.",
    cta: "Get the app",
  },
];

/** The i18n path for one field of one slide. */
export function promoKey(slideKey: string, field: string): string {
  return `growth.promo.${slideKey}.${field}`;
}
