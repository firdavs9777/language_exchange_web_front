export const BASE_URL =
  process.env.NODE_ENV === "development" ? "http://localhost:5002" : "";
export const MOMENTS_URL = "/api/v1/moments";
export const USERS_URL = "/api/v1/users";
export const LOGIN_URL = "/api/v1/auth/login";
export const REGISTER_URL = "/api/v1/auth/register";
export const LOGOUT_URL = "/api/v1/auth/logout";
export const COMMENTS = "comments";
export const USER_PROFILE_URL = "/api/v1/auth/me";
