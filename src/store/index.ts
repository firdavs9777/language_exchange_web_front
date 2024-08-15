import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "../store/slices/apiSlice";
import momentSliceReducer from "./slices/momentsSlice";
// import cartSliceReducer from '../store/slices/';
import authSliceReducer from "../store/slices/authSlice";
import commentsSliceReducer from "../store/slices/comments";
const rootReducer = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    moments: momentSliceReducer,
    auth: authSliceReducer,
    comments: commentsSliceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
  devTools: true,
});
export type RootState = ReturnType<typeof rootReducer.getState>;

export default rootReducer;
