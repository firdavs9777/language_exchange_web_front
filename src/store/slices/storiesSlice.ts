import {
  MAIN_STORIES,
  USER_STORIES,
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
    // Create new story
    createStory: builder.mutation({
      query: (data: FormData) => ({
        url: MAIN_STORIES,
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
      query: ({ storyId, viewDuration }: { storyId: string; viewDuration?: number }) => ({
        url: `${MAIN_STORIES}/${storyId}/view`,
        method: "POST",
        body: viewDuration ? { viewDuration } : {},
      }),
      keepUnusedDataFor: 5,
      invalidatesTags: ["Stories"],
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
    // Remove reaction
    removeStoryReaction: builder.mutation({
      query: (storyId: string) => ({
        url: `${MAIN_STORIES}/${storyId}/react`,
        method: "DELETE",
      }),
      invalidatesTags: ["Stories"],
    }),
    // Get story reactions (owner only)
    getStoryReactions: builder.query({
      query: (storyId: string) => ({
        url: `${MAIN_STORIES}/${storyId}/reactions`,
      }),
      keepUnusedDataFor: 5,
    }),
    // Reply to story
    replyToStory: builder.mutation({
      query: ({ storyId, message }: { storyId: string; message: string }) => ({
        url: `${MAIN_STORIES}/${storyId}/reply`,
        method: "POST",
        body: { message },
      }),
      invalidatesTags: ["Stories"],
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
    // Answer question box
    answerQuestion: builder.mutation({
      query: ({ storyId, text, isAnonymous }: { storyId: string; text: string; isAnonymous?: boolean }) => ({
        url: `${MAIN_STORIES}/${storyId}/question/answer`,
        method: "POST",
        body: { text, isAnonymous },
      }),
      invalidatesTags: ["Stories"],
    }),
    // Get question responses (owner only)
    getQuestionResponses: builder.query({
      query: (storyId: string) => ({
        url: `${MAIN_STORIES}/${storyId}/question/responses`,
      }),
      keepUnusedDataFor: 5,
    }),
    // Share story
    shareStory: builder.mutation({
      query: ({ storyId, sharedTo, receiverId }: { storyId: string; sharedTo: 'dm' | 'story' | 'external'; receiverId?: string }) => ({
        url: `${MAIN_STORIES}/${storyId}/share`,
        method: "POST",
        body: { sharedTo, receiverId },
      }),
      invalidatesTags: ["Stories"],
    }),
    // Archive story
    archiveStory: builder.mutation({
      query: (storyId: string) => ({
        url: `${MAIN_STORIES}/${storyId}/archive`,
        method: "POST",
      }),
      invalidatesTags: ["Stories"],
    }),
    // Get archived stories
    getArchivedStories: builder.query({
      query: ({ page = 1, limit = 20 }: { page?: number; limit?: number } = {}) => ({
        url: `${MAIN_STORIES}/archive?page=${page}&limit=${limit}`,
      }),
      keepUnusedDataFor: 5,
      providesTags: ["Stories"],
    }),
    // Get my highlights
    getMyHighlights: builder.query({
      query: () => ({
        url: `${MAIN_STORIES}/highlights`,
      }),
      keepUnusedDataFor: 5,
      providesTags: ["Stories"],
    }),
    // Get user's highlights
    getUserHighlights: builder.query({
      query: (userId: string) => ({
        url: `${MAIN_STORIES}/highlights/user/${userId}`,
      }),
      keepUnusedDataFor: 5,
    }),
    // Create highlight
    createHighlight: builder.mutation({
      query: ({ title, storyId, coverImage }: { title: string; storyId?: string; coverImage?: string }) => ({
        url: `${MAIN_STORIES}/highlights`,
        method: "POST",
        body: { title, storyId, coverImage },
      }),
      invalidatesTags: ["Stories"],
    }),
    // Update highlight
    updateHighlight: builder.mutation({
      query: ({ highlightId, title, coverImage }: { highlightId: string; title?: string; coverImage?: string }) => ({
        url: `${MAIN_STORIES}/highlights/${highlightId}`,
        method: "PUT",
        body: { title, coverImage },
      }),
      invalidatesTags: ["Stories"],
    }),
    // Delete highlight
    deleteHighlight: builder.mutation({
      query: (highlightId: string) => ({
        url: `${MAIN_STORIES}/highlights/${highlightId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Stories"],
    }),
    // Add story to highlight
    addStoryToHighlight: builder.mutation({
      query: ({ highlightId, storyId }: { highlightId: string; storyId: string }) => ({
        url: `${MAIN_STORIES}/highlights/${highlightId}/stories`,
        method: "POST",
        body: { storyId },
      }),
      invalidatesTags: ["Stories"],
    }),
    // Remove story from highlight
    removeStoryFromHighlight: builder.mutation({
      query: ({ highlightId, storyId }: { highlightId: string; storyId: string }) => ({
        url: `${MAIN_STORIES}/highlights/${highlightId}/stories/${storyId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Stories"],
    }),
    // Get close friends
    getCloseFriends: builder.query({
      query: () => ({
        url: `${MAIN_STORIES}/close-friends`,
      }),
      keepUnusedDataFor: 5,
      providesTags: ["Stories"],
    }),
    // Add to close friends
    addCloseFriend: builder.mutation({
      query: (userId: string) => ({
        url: `${MAIN_STORIES}/close-friends/${userId}`,
        method: "POST",
      }),
      invalidatesTags: ["Stories"],
    }),
    // Remove from close friends
    removeCloseFriend: builder.mutation({
      query: (userId: string) => ({
        url: `${MAIN_STORIES}/close-friends/${userId}`,
        method: "DELETE",
      }),
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
    }),
  }),
});

export const {
  useGetStoryFeedsQuery,
  useGetMyStoriesQuery,
  useCreateStoryMutation,
  useGetIndividualStoryQuery,
  useDeleteIndividualStoryMutation,
  useGetStoryViewersQuery,
  useMarkIndividualStoryViewedMutation,
  useGetUserStoriesQuery,
  useReactToStoryMutation,
  useRemoveStoryReactionMutation,
  useGetStoryReactionsQuery,
  useReplyToStoryMutation,
  useVoteOnPollMutation,
  useAnswerQuestionMutation,
  useGetQuestionResponsesQuery,
  useShareStoryMutation,
  useArchiveStoryMutation,
  useGetArchivedStoriesQuery,
  useGetMyHighlightsQuery,
  useGetUserHighlightsQuery,
  useCreateHighlightMutation,
  useUpdateHighlightMutation,
  useDeleteHighlightMutation,
  useAddStoryToHighlightMutation,
  useRemoveStoryFromHighlightMutation,
  useGetCloseFriendsQuery,
  useAddCloseFriendMutation,
  useRemoveCloseFriendMutation,
} = storiesApiSlice;
export default storiesApiSlice.reducer;
