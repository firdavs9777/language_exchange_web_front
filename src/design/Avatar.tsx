import React from "react";

export interface AvatarProps {
  src?: string;
  /** Drives the initials fallback. */
  name: string;
  size?: 40 | 54 | 72 | 80;
  /**
   * Explicit, never derived from a user object: Community and Profile get
   * this field from controllers/users.js and Moments from
   * controllers/moments.js, so a primitive that reached into a user shape
   * would have to know which one it was holding.
   */
  hasStory?: boolean;
  isOnline?: boolean;
  /** Native-language flag, rendered bottom-left. */
  flag?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 54,
  hasStory = false,
  isOnline = false,
  flag,
}) => {
  const initial = (name || "").trim().charAt(0).toUpperCase() || "?";
  const dot = size >= 72 ? "h-4 w-4" : "h-3 w-3";

  const face = src ? (
    <img
      data-testid="avatar-image"
      src={src}
      alt={name}
      className="h-full w-full rounded-full object-cover"
    />
  ) : (
    <div
      data-testid="avatar-initials"
      role="img"
      aria-label={name || "Unknown user"}
      className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-brand-light to-banana-light font-bold text-brand-dark"
      style={{ fontSize: Math.round(size / 2.7) }}
    >
      {initial}
    </div>
  );

  return (
    <div
      data-testid="avatar"
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      {hasStory ? (
        <div
          data-testid="avatar-story-ring"
          className="h-full w-full rounded-full bg-gradient-to-tr from-brand via-banana to-brand-light p-[3px]"
        >
          <div className="h-full w-full rounded-full bg-surface p-[2px] dark:bg-cardbg-dark">
            {face}
          </div>
        </div>
      ) : (
        face
      )}

      {flag && (
        <span
          data-testid="avatar-flag"
          aria-hidden
          className="absolute -bottom-0.5 -left-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[11px] leading-none shadow-card dark:bg-cardbg-dark"
        >
          {flag}
        </span>
      )}

      {isOnline && (
        <span
          data-testid="avatar-online-dot"
          role="img"
          aria-label="Online"
          className={`absolute -bottom-0.5 -right-0.5 ${dot} rounded-full border-2 border-surface bg-[#4CAF50] dark:border-cardbg-dark`}
        />
      )}
    </div>
  );
};

export default Avatar;
