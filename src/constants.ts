export const BASE_URL =
  process.env.NODE_ENV === "development" ? "http://localhost:5003" : "";
export const MOMENTS_URL = "/api/v1/moments";
export const USERS_URL = "/api/v1/users";
export const COMMUNITY_URL = "/api/v1/auth/users";
export const MESSAGES_URL = "/api/v1/messages";
export const LOGIN_URL = "/api/v1/auth/login";
export const REGISTER_URL = "/api/v1/auth/register";
export const LOGOUT_URL = "/api/v1/auth/logout";
export const SEND_EMAIL_CODE = "/api/v1/auth/sendCodeEmail";
export const CONFIRM_EMAIL_CODE = "/api/v1/auth/checkEmailCode";
export const RESET_USER_PASSWORD = "/api/v1/auth/resetpassword";
export const COMMENTS = "comments";
export const USER_PROFILE_URL = "/api/v1/auth/me";
export const USER_PROFILE_UPDATE = "/api/v1/auth/updatedetails";
