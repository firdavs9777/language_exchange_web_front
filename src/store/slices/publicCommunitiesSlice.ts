import { apiSlice } from "./apiSlice";
import { PUBLIC_COMMUNITIES_URL } from "../../constants";

/**
 * GET /api/v1/public/communities -- controllers/public.js. Active clubs only,
 * sorted by `memberCount` desc, no auth, `Cache-Control: public, max-age=600`.
 */
export interface PublicCommunity {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  /** The languages practised in the club (`[club.language]` today). */
  languages: string[];
}

export const publicCommunitiesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPublicCommunities: builder.query<PublicCommunity[], void>({
      query: () => ({ url: PUBLIC_COMMUNITIES_URL }),
      // The page maps over this, so it must be an array even when the
      // envelope is empty or a future backend answers with a bare list.
      transformResponse: (response: any) => {
        if (Array.isArray(response)) return response;
        const data = response && response.data;
        return Array.isArray(data) ? data : [];
      },
      keepUnusedDataFor: 600,
      // The prerender ships a fulfilled entry in the preloaded state: the first
      // render must match that markup, but a mount must still refresh live data.
      // (RTK reads `refetchOnMountOrArgChange` only from the createApi config or
      // a hook option, so `forceRefetch` is the per-endpoint equivalent --
      // publicStatsSlice.ts says the same thing for the same reason.)
      forceRefetch: () => true,
    }),
  }),
});

export const { useGetPublicCommunitiesQuery } = publicCommunitiesApiSlice;
