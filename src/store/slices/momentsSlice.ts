import { MOMENTS_URL, USERS_URL } from "../../constants";
import { apiSlice } from "./apiSlice";

export const momentsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder: any) => ({
    getMoments: builder.query({
      query: () => ({
        url: MOMENTS_URL,
      }),
      keepUnusedDataFor: 5,
      providesTags: ["Moments"],
    }),
    getMomentDetails: builder.query({
      query: (momentId: string) => ({
        url: `${MOMENTS_URL}/${momentId}`,
      }),
      keepUnusedDataFor: 5,
    }),
    createMoment: builder.mutation({
      query: (data: any) => ({
        url: `${MOMENTS_URL}`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Moment"],
    }),
    uploadMomentPhotos: builder.mutation({
      query: ({
        momentId,
        imageFiles,
      }: {
        momentId: string;
        imageFiles: File[];
      }) => ({
        url: `${MOMENTS_URL}/${momentId}/photo`,
        method: "PUT",
        // headers: {
        //   "Content-Type": "application/json",
        // },
        body: imageFiles,
      }),
      invalidatesTags: ["Moments"],
    }),
    likeMoment: builder.mutation({
      query: ({ momentId, userId }: { momentId: string; userId: string }) => ({
        url: `${MOMENTS_URL}/${momentId}/like`,
        method: "POST",
        body: { userId },
      }),
    }),
    dislikeMoment: builder.mutation({
      query: ({ momentId, userId }: { momentId: string; userId: string }) => ({
        url: `${MOMENTS_URL}/${momentId}/dislike`,
        method: "POST",
        body: { userId },
      }),
    }),
    getMyMoments: builder.query({
      query: ({ userId }: { userId: string }) => ({
        url: `${MOMENTS_URL}/user/${userId}`,
      }),
      keepUnusedDataFor: 5,
    }),
  }),
});
export const {
  useGetMomentsQuery,
  useGetMomentDetailsQuery,
  useCreateMomentMutation,
  useUploadMomentPhotosMutation,
  useLikeMomentMutation,
  useDislikeMomentMutation,
  useGetMyMomentsQuery,
} = momentsApiSlice;

export default momentsApiSlice.reducer;
