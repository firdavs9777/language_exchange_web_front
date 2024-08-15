import {
  //   USER_PROFILE_URL,
  LOGOUT_URL,
  REGISTER_URL,
  LOGIN_URL,
  USER_PROFILE_URL,
} from "../../constants";
import { apiSlice } from "./apiSlice";

export interface AuthInfo {
  name?: string;
  email: string;
  password: string;
}

export const usersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder: any) => ({
    loginUser: builder.mutation({
      query: (data: AuthInfo) => ({
        url: `${LOGIN_URL}`,
        method: "POST",
        body: data,
      }),
      keepUnusedDataFor: 5,
    }),
    registerUser: builder.mutation({
      query: (data: AuthInfo) => ({
        url: `${REGISTER_URL}`,
        method: "POST",
        body: data,
      }),
      keepUnusedDataFor: 5,
    }),
    getUserProfile: builder.query({
      query: () => ({
        url: `${USER_PROFILE_URL}`,
      }),
      keepUnusedDataFor: 5,
      providesTags: ["User"],
    }),

    logoutUser: builder.mutation({
      query: () => ({
        url: `${LOGOUT_URL}`,
        method: "POST",
      }),
      keepUnusedDataFor: 5,
    }),
    // updateUser: builder.query({
    //     query: (productId: string)=> ({
    //         url:`${PRODUCTS_URL}/${productId}`
    //     }),
    //     keepUnusedDataFor: 5
    // }),
  }),
});
export const {
  useLoginUserMutation,
  useLogoutUserMutation,
  useRegisterUserMutation,
  useGetUserProfileQuery,
} = usersApiSlice;
