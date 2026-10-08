import { apiSlice } from "./apiSlice";

/** GET /api/v1/app-config: the server's public feature flags. */
export interface AppConfig {
  momentSchedulingEnforced?: boolean;
  [flag: string]: any;
}

export const appConfigApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder: any) => ({
    getAppConfig: builder.query({
      query: () => ({ url: "/api/v1/app-config" }),
      transformResponse: (response: any): AppConfig => (response && response.data) || {},
      keepUnusedDataFor: 300,
    }),
  }),
});

export const { useGetAppConfigQuery } = appConfigApiSlice as any;
