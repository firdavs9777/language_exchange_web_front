import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { useGetCommunityMembersQuery } from "../../../store/slices/communitySlice";
import MemberCard, { CommunityMemberCard } from "../../community/MemberCard";
import WaveSheet from "../../community/WaveSheet";

/** How many suggestions the strip shows, as the detail page always has. */
const HOW_MANY = 8;
/** Asked for more than shown, because the viewer and the target are filtered out here. */
const PAGE_LIMIT = 12;

export interface SuggestedMembersProps {
  /** The profile being viewed — never suggested back to the viewer. */
  targetUserId: string;
  /**
   * The signed-in user. Filtered out of the results — and, because the
   * endpoint behind this strip is protected, the reason the strip exists at
   * all.
   */
  viewerId?: string;
  /** The profile's native language: what makes a suggestion relevant. */
  language?: string;
  /** The profile's first name, for the heading. */
  name?: string;
}

/**
 * "More members like {name}" — the one thing the old detail page had that the
 * profile page did not.
 *
 * Same query as before (one page of members sharing this profile's language,
 * with the viewer and the profile filtered out client-side, capped at eight),
 * drawn with the list's own `MemberCard` so a suggestion looks exactly like
 * the row it came from. A phone scrolls the strip sideways; from 768px it is
 * a grid, because a horizontal scroller on a wide screen hides half its
 * contents for no reason. Signed-in only: the list endpoint is protected.
 */
const SuggestedMembers: React.FC<SuggestedMembersProps> = ({
  targetUserId,
  viewerId,
  language,
  name,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [waveTarget, setWaveTarget] = useState<CommunityMemberCard | null>(null);

  // `GET /api/v1/auth/users` is behind `protect` (routes/users.js:50), and
  // /community/:userId is a public page — so an anonymous visitor must not
  // fire this at all. Skipping is what keeps the logged-out member page on
  // public endpoints, and the strip renders nothing for them anyway.
  const { data } = useGetCommunityMembersQuery(
    { page: 1, limit: PAGE_LIMIT, language: language || undefined },
    { skip: !language || !viewerId }
  );

  const members = useMemo<CommunityMemberCard[]>(() => {
    const list: CommunityMemberCard[] = (data && data.data) || [];
    if (!Array.isArray(list)) return [];
    return list
      .filter((member) => member && member._id !== targetUserId && member._id !== viewerId)
      .slice(0, HOW_MANY);
  }, [data, targetUserId, viewerId]);

  if (!viewerId || members.length === 0) return null;

  const who = String(name || "").trim().split(" ")[0];

  return (
    <section data-testid="suggested-members">
      <header className="flex items-center justify-between gap-3 px-1 pb-2">
        <h2 className="flex items-center gap-2 text-eyebrow font-extrabold uppercase text-ink-500 dark:text-ink-400">
          <Users className="h-4 w-4 text-brand" aria-hidden />
          {t("communityDetail.suggested.title", { name: who }) ||
            (who ? `More members like ${who}` : "More members")}
        </h2>
        <Link
          to="/communities"
          data-testid="suggested-see-all"
          className="shrink-0 text-xs font-semibold text-brand-deep hover:text-brand-dark dark:text-brand-light"
        >
          {t("communityDetail.suggested.seeAll") || "See all members"}
        </Link>
      </header>

      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 md:mx-0 md:grid md:grid-cols-2 md:overflow-x-visible md:px-0">
        {members.map((member) => (
          <div
            key={member._id}
            data-testid="suggested-member"
            className="w-[min(82%,22rem)] shrink-0 snap-start md:w-auto"
          >
            <MemberCard
              user={member}
              onOpen={(picked) => navigate(`/community/${picked._id}`)}
              onWave={(picked) => setWaveTarget(picked)}
            />
          </div>
        ))}
      </div>

      <WaveSheet
        open={Boolean(waveTarget)}
        targetUser={waveTarget}
        onClose={() => setWaveTarget(null)}
      />
    </section>
  );
};

export default SuggestedMembers;
