import { apiSlice } from "./apiSlice";
import { PUBLIC_STATS_URL } from "../../constants";

/** GET /api/v1/public/stats -- controllers/public.js. `learners` is null under 1,000. */
export interface PublicStats {
  learners: number | null;
  countries: number;
  languages: number;
  generatedAt: string;
}

export const publicStatsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPublicStats: builder.query<PublicStats, void>({
      query: () => ({ url: PUBLIC_STATS_URL }),
      transformResponse: (response: any) => (response && response.data ? response.data : response),
      keepUnusedDataFor: 3600,
    }),
  }),
});

export const { useGetPublicStatsQuery } = publicStatsApiSlice;

/** 12000 -> "12,000". en-US grouping regardless of UI language: the figure sits next to a translated label. */
export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}
