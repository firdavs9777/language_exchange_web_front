import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "./slices/apiSlice";
import momentSliceReducer from "./slices/momentsSlice";
import authSliceReducer from "./slices/authSlice";
import commentsSliceReducer from "./slices/comments";
import chatApiSliceReducer from "./slices/chatSlice";
import storiesApiSliceReducer from "./slices/storiesSlice";

/** A fresh store. The browser makes one; the prerender makes one per route. */
export function makeStore() {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      moments: momentSliceReducer,
      auth: authSliceReducer,
      comments: commentsSliceReducer,
      chats: chatApiSliceReducer,
      stories: storiesApiSliceReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
    devTools: true,
  });
}

const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;

export default store;
