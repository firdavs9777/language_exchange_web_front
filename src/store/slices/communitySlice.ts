import { COMMUNITY_URL } from "../../constants";
import { apiSlice } from "./apiSlice";

export const communityApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder: any) => ({
    getCommunityMembers: builder.query({
      query: () => ({
        url: COMMUNITY_URL,
      }),
      keepUnusedDataFor: 5,
      providesTags: ["Community"],
    }),
    getCommunityDetails: builder.query({
      query: (userId: string) => ({
        url: `${COMMUNITY_URL}/${userId}`,
      }),
      keepUnusedDataFor: 5,
    }),
  }),
});

export const { useGetCommunityMembersQuery, useGetCommunityDetailsQuery } =
  communityApiSlice;
export default communityApiSlice.reducer;
