import { MOMENTS_URL } from "../../constants";
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
  }),
});
export const {
  useGetMomentsQuery,
  useGetMomentDetailsQuery,
  useCreateMomentMutation,
  useUploadMomentPhotosMutation,
} = momentsApiSlice;

export default momentsApiSlice.reducer;
