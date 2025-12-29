import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { BASE_URL } from "../../constants";
import { RootState } from "../index";

const baseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState, endpoint, extra }) => {
    // Retrieve the token from the state
    const token = (getState() as RootState).auth.userInfo?.token;

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    console.log(endpoint);
    // Don't set Content-Type for FormData - browser will set it automatically with boundary
    return headers;
  },
  //   credentials: "include", // Ensure credentials are included with every request
  //   prepareHeaders: (headers) => {
  //     headers.set("Content-Type", "application/json");
  //     return headers;
  //   },
});

export const apiSlice = createApi({
  baseQuery,
  tagTypes: ["Community", "Moments", "Chat", "User", "Stories"],
  refetchOnFocus: false,
  refetchOnReconnect: true,
  endpoints: (builder: any) => ({}),
});
