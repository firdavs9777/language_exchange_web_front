import {
  MAIN_STORIES,
  STORIES_FEED,
  MY_STORIES,
} from "../../constants";
import { apiSlice } from "./apiSlice";

export const storiesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder: any) => ({
    // Get all story feeds
    getStoryFeeds: builder.query({
      query: () => ({
        url: STORIES_FEED,
      }),
      keepUnusedDataFor: 5,
      providesTags: ["Stories"],
    }),
    // Get All my stories
    getMyStories: builder.query({
      query: () => ({
        url: MY_STORIES,
      }),
      keepUnusedDataFor: 5,
      providesTags: ["Stories"],
    }),
    // Upload constraints for video stories. The one stories route that is
    // NOT behind `protect`, so it is safe to call before a session exists.
    getVideoConfig: builder.query({
      query: () => ({
        url: `${MAIN_STORIES}/video-config`,
      }),
      // Server-side constants: refetching them per mount buys nothing.
      keepUnusedDataFor: 600,
    }),
    // Get archived stories
    getArchivedStories: builder.query({
      query: ({ page, limit }: { page?: number; limit?: number } = {}) => ({
        url: `${MAIN_STORIES}/archive`,
        params: { page, limit },
      }),
      keepUnusedDataFor: 5,
      providesTags: ["Stories"],
    }),
    // Archive a story
    archiveStory: builder.mutation({
      query: (storyId: string) => ({
        url: `${MAIN_STORIES}/${storyId}/archive`,
        method: "POST",
      }),
      invalidatesTags: ["Stories"],
    }),
    // Create new story
    createStory: builder.mutation({
      query: (data: any) => ({
        url: MAIN_STORIES,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Stories"],
    }),
    // Create video story
    createVideoStory: builder.mutation({
      query: (data: any) => ({
        url: `${MAIN_STORIES}/video`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Stories"],
    }),
    // Get Individual Story Item
    getIndividualStory: builder.query({
      query: (storyId: string) => ({
        url: `${MAIN_STORIES}/${storyId}`,
      }),
      keepUnusedDataFor: 5,
    }),
    // Delete individual story
    deleteIndividualStory: builder.mutation({
      query: (storyId: string) => ({
        url: `${MAIN_STORIES}/${storyId}`,
        method: "DELETE",
      }),
      keepUnusedDataFor: 5,
      invalidatesTags: ["Stories"],
    }),
    // Mark story as viewed
    markIndividualStoryViewed: builder.mutation({
      query: (storyId: string) => ({
        url: `${MAIN_STORIES}/${storyId}/view`,
        method: "POST",
      }),
      keepUnusedDataFor: 5,
      invalidatesTags: ["Stories"],
    }),
    // Total User Viewers
    getStoryViewers: builder.query({
      query: (storyId: string) => ({
        url: `${MAIN_STORIES}/${storyId}/views`,
      }),
    }),
    // User Specific Stories
    getUserStories: builder.query({
      query: (userId: string) => ({
        url: `${MAIN_STORIES}/user/${userId}`,
      }),
      // Tagged like its siblings so a reaction toggle refetches the stories
      // the viewer is walking through; without it, navigating back to a story
      // showed the pre-reaction snapshot.
      providesTags: ["Stories"],
    }),
    // React to story
    reactToStory: builder.mutation({
      query: ({ storyId, emoji }: { storyId: string; emoji: string }) => ({
        url: `${MAIN_STORIES}/${storyId}/react`,
        method: "POST",
        body: { emoji },
      }),
      invalidatesTags: ["Stories"],
    }),
    // Take a reaction back.
    //
    // This exists because `POST /:id/react` does NOT toggle: the controller
    // calls `story.addReaction(...)`, which replaces the viewer's reaction
    // with the emoji it was given. Re-posting the same emoji therefore left
    // the reaction in place while the UI cleared it. `DELETE /:id/react` is
    // the only way to remove one. The body carries `{ emoji }` for symmetry
    // with the POST — the controller removes by user, not by emoji, so it is
    // informational, but sending it keeps the pair readable at the call site.
    removeReaction: builder.mutation({
      query: ({ storyId, emoji }: { storyId: string; emoji: string }) => ({
        url: `${MAIN_STORIES}/${storyId}/react`,
        method: "DELETE",
        body: { emoji },
      }),
      invalidatesTags: ["Stories"],
    }),
    // Get story reactions
    getStoryReactions: builder.query({
      query: (storyId: string) => ({
        url: `${MAIN_STORIES}/${storyId}/reactions`,
      }),
    }),
    // Reply to story
    replyToStory: builder.mutation({
      query: ({ storyId, message }: { storyId: string; message: string }) => ({
        url: `${MAIN_STORIES}/${storyId}/reply`,
        method: "POST",
        body: { message },
      }),
    }),
    // Vote on poll
    voteOnPoll: builder.mutation({
      query: ({ storyId, optionIndex }: { storyId: string; optionIndex: number }) => ({
        url: `${MAIN_STORIES}/${storyId}/poll/vote`,
        method: "POST",
        body: { optionIndex },
      }),
      invalidatesTags: ["Stories"],
    }),
    // Answer a question sticker.
    //
    // `controllers/stories.js` destructures `{ text, isAnonymous }`. The old
    // body (`{ answer }`) meant every answer this endpoint could have sent
    // would have come back 400 "Answer text is required" — it was never
    // called, so nobody found out.
    answerQuestion: builder.mutation({
      query: ({
        id,
        text,
        isAnonymous,
      }: {
        id: string;
        text: string;
        isAnonymous?: boolean;
      }) => ({
        url: `${MAIN_STORIES}/${id}/question/answer`,
        method: "POST",
        body: { text, isAnonymous: !!isAnonymous },
      }),
    }),
    // Get question responses
    getQuestionResponses: builder.query({
      query: (storyId: string) => ({
        url: `${MAIN_STORIES}/${storyId}/question/responses`,
      }),
    }),
    // Share a story. `sharedTo` is "dm" | "story" | "external"; with "dm" the
    // backend also creates the Message carrying the story card, which is why
    // `receiverId` only travels when there is one (the old `{ userId }` body
    // was read by nothing).
    shareStory: builder.mutation({
      query: ({
        id,
        sharedTo,
        receiverId,
      }: {
        id: string;
        sharedTo: string;
        receiverId?: string;
      }) => ({
        url: `${MAIN_STORIES}/${id}/share`,
        method: "POST",
        body: receiverId ? { sharedTo, receiverId } : { sharedTo },
      }),
    }),
    // Highlights.
    //
    // Both lists carry the "Highlights" tag rather than "Stories": adding a
    // story to a highlight has to refetch the highlight rails, and nothing
    // else — invalidating "Stories" for it would throw away the feed, my
    // stories and the archive on every rename.
    getHighlights: builder.query({
      query: () => ({
        url: `${MAIN_STORIES}/highlights`,
      }),
      providesTags: ["Highlights"],
    }),
    getUserHighlights: builder.query({
      query: (userId: string) => ({
        url: `${MAIN_STORIES}/highlights/user/${userId}`,
      }),
      providesTags: ["Highlights"],
    }),
    createHighlight: builder.mutation({
      // `POST /stories/highlights` reads {title, storyId, coverImage} --
      // singular, and the story it is created FROM. The old `storyIds` array
      // was never a field this route had; nothing it described reached the
      // server.
      query: (data: { title: string; storyId?: string; coverImage?: string }) => ({
        url: `${MAIN_STORIES}/highlights`,
        method: "POST",
        body: data,
      }),
      // "Stories" too: a highlighted story survives the 24h expiry
      // (`isHighlighted`), so my-stories can look different afterwards.
      invalidatesTags: ["Highlights", "Stories"],
    }),
    deleteHighlight: builder.mutation({
      query: (highlightId: string) => ({
        url: `${MAIN_STORIES}/highlights/${highlightId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Highlights", "Stories"],
    }),
    addStoryToHighlight: builder.mutation({
      query: ({
        highlightId,
        storyId,
      }: {
        highlightId: string;
        storyId: string;
      }) => ({
        url: `${MAIN_STORIES}/highlights/${highlightId}/stories`,
        method: "POST",
        body: { storyId },
      }),
      invalidatesTags: ["Highlights", "Stories"],
    }),
    removeStoryFromHighlight: builder.mutation({
      query: ({
        highlightId,
        storyId,
      }: {
        highlightId: string;
        storyId: string;
      }) => ({
        url: `${MAIN_STORIES}/highlights/${highlightId}/stories/${storyId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Highlights", "Stories"],
    }),
    // Rename a highlight or change its cover. The controller only assigns
    // truthy fields, so sending only what changed is the contract, not an
    // optimisation.
    updateHighlight: builder.mutation({
      query: ({
        highlightId,
        title,
        coverImage,
      }: {
        highlightId: string;
        title?: string;
        coverImage?: string;
      }) => {
        const body: { title?: string; coverImage?: string } = {};
        if (title !== undefined) body.title = title;
        if (coverImage !== undefined) body.coverImage = coverImage;
        return {
          url: `${MAIN_STORIES}/highlights/${highlightId}`,
          method: "PUT",
          body,
        };
      },
      invalidatesTags: ["Highlights"],
    }),
    // Close Friends
    getCloseFriends: builder.query({
      query: () => ({
        url: `${MAIN_STORIES}/close-friends`,
      }),
    }),
    addCloseFriend: builder.mutation({
      query: (userId: string) => ({
        url: `${MAIN_STORIES}/close-friends/${userId}`,
        method: "POST",
      }),
    }),
    removeCloseFriend: builder.mutation({
      query: (userId: string) => ({
        url: `${MAIN_STORIES}/close-friends/${userId}`,
        method: "DELETE",
      }),
    }),
  }),
});

export const {
  useGetStoryFeedsQuery,
  useGetMyStoriesQuery,
  useGetArchivedStoriesQuery,
  useArchiveStoryMutation,
  useCreateStoryMutation,
  useCreateVideoStoryMutation,
  useGetIndividualStoryMutation,
  useGetIndividualStoryQuery,
  useDeleteIndividualStoryMutation,
  useGetStoryViewersQuery,
  useMarkIndividualStoryViewedMutation,
  useGetUserStoriesQuery,
  // New hooks
  useReactToStoryMutation,
  useRemoveReactionMutation,
  useGetStoryReactionsQuery,
  useReplyToStoryMutation,
  useVoteOnPollMutation,
  useAnswerQuestionMutation,
  useGetQuestionResponsesQuery,
  useShareStoryMutation,
  useGetHighlightsQuery,
  useGetUserHighlightsQuery,
  useCreateHighlightMutation,
  useDeleteHighlightMutation,
  useAddStoryToHighlightMutation,
  useRemoveStoryFromHighlightMutation,
  useUpdateHighlightMutation,
  useGetVideoConfigQuery,
  useGetCloseFriendsQuery,
  useAddCloseFriendMutation,
  useRemoveCloseFriendMutation,
} = storiesApiSlice;
export default storiesApiSlice.reducer;
