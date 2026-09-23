import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * A block of user-written text that translates on tap, the way the app does.
 *
 * The text itself is the control: tapping it (or pressing Enter/Space while
 * it has focus) reveals a translation line beneath it — a dashed rule and the
 * brand color, matching the hero demo's translated bubbles. Tapping again
 * hides the line; tapping a third time shows the cached translation without
 * asking the server for it again.
 *
 * Translation is a write endpoint behind `protect`, so logged-out visitors get
 * the caller's sign-in prompt (`onRequireLogin`) and nothing else happens.
 *
 * Nothing here reads `window`/`document` during render: `/moments` and
 * `/moment/:id` are prerendered in Node, where only the original text renders.
 */

type TranslationState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "same" }
  | { kind: "done"; translatedText: string };

interface TranslatableTextProps {
  text: string;
  /** Resolves with the server's translation of `text`. */
  onTranslate: () => Promise<{ translatedText: string }>;
  isLoggedIn: boolean;
  onRequireLogin: () => void;
  className?: string;
  as?: "p" | "span";
}

const TranslatableText: React.FC<TranslatableTextProps> = ({
  text,
  onTranslate,
  isLoggedIn,
  onRequireLogin,
  className,
  as = "p",
}) => {
  const { t } = useTranslation();
  const [state, setState] = useState<TranslationState>({ kind: "idle" });
  const [shown, setShown] = useState<boolean>(false);

  const runTranslate = useCallback(() => {
    setState({ kind: "loading" });
    setShown(true);
    onTranslate().then(
      (result) => {
        const translated = ((result && result.translatedText) || "").trim();
        if (!translated) {
          setState({ kind: "error" });
          return;
        }
        // The API never says what language the text was in, so "already in
        // your language" is inferred: the translator handed back what it got.
        if (translated === (text || "").trim()) {
          setState({ kind: "same" });
          return;
        }
        setState({ kind: "done", translatedText: translated });
      },
      () => setState({ kind: "error" })
    );
  }, [onTranslate, text]);

  const activate = useCallback(() => {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    if (shown) {
      setShown(false);
      return;
    }
    // Cached from an earlier tap — show it again without another request.
    if (state.kind === "done" || state.kind === "same") {
      setShown(true);
      return;
    }
    runTranslate();
  }, [isLoggedIn, onRequireLogin, shown, state.kind, runTranslate]);

  // The feed card wraps the whole moment in a <Link>; translating must not
  // navigate away from the feed.
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      activate();
    },
    [activate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
      e.preventDefault();
      e.stopPropagation();
      activate();
    },
    [activate]
  );

  const handleRetry = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      runTranslate();
    },
    [runTranslate]
  );

  const Text = as;
  const Wrapper = as === "span" ? "span" : "div";

  const lineClass =
    "mt-1.5 block overflow-hidden border-t border-dashed border-gray-200 pt-1.5 text-xs text-brand dark:border-gray-600";

  let line: React.ReactNode = null;
  if (shown) {
    if (state.kind === "loading") {
      line = (
        <span
          data-testid="translatable-translation"
          className={`${lineClass} opacity-70`}
        >
          {t("moments_section.translate.loading") || "Translating…"}
        </span>
      );
    } else if (state.kind === "error") {
      line = (
        <span
          data-testid="translatable-translation"
          className={`${lineClass} text-red-500`}
        >
          <button
            type="button"
            data-testid="translatable-retry"
            onClick={handleRetry}
            className="text-inherit underline focus:outline-none"
          >
            {t("moments_section.translate.error") ||
              "Couldn't translate. Tap to retry."}
          </button>
        </span>
      );
    } else if (state.kind === "same") {
      line = (
        <span
          data-testid="translatable-translation"
          className={`${lineClass} text-gray-500 dark:text-gray-400`}
        >
          {t("moments_section.translate.same") || "Already in your language"}
        </span>
      );
    } else if (state.kind === "done") {
      line = (
        <span data-testid="translatable-translation" className={lineClass}>
          {state.translatedText}
        </span>
      );
    }
  }

  return (
    <Wrapper className={className}>
      <Text
        data-testid="translatable-text"
        role="button"
        tabIndex={0}
        aria-expanded={shown}
        aria-label={t("moments_section.translate.tap") || "Tap to translate"}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="block cursor-pointer whitespace-pre-wrap break-words no-underline"
      >
        {text}
      </Text>
      {line}
    </Wrapper>
  );
};

export default TranslatableText;
