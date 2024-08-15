import { apiSlice } from "./apiSlice";
// Adjust this path based on your project structure
import { COMMENTS, MOMENTS_URL } from "../../constants";

export interface CommentData {
  text: string;
}

export const commentsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder: any) => ({
    getComments: builder.query({
      query: (momentId: string) => ({
        url: `${MOMENTS_URL}/${momentId}/${COMMENTS}`,
        keepUnusedDataFor: 5,
        providesTags: ["Comments"],
      }),
    }),
    addComment: builder.mutation({
      query: (data: any) => ({
        // Access token from Redux state
        url: `${MOMENTS_URL}/${data.momentId}/${COMMENTS}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          text: data.newComment,
        },
      }),
      invalidatesTags: ["Comment"], // Fixed invalidatesTags for correct tag name
    }),
  }),
});

export const { useGetCommentsQuery, useAddCommentMutation } = commentsApiSlice;

export default commentsApiSlice.reducer;
