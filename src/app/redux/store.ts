import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./rootReducer";
import { authApi } from "./api/authApi";
import { userApi } from "./api/userApi"
import { contactApi } from "./api/contactApi";
import { pipelineApi } from "./api/pipelineApi";
import { calenderApi } from "./api/calenderApi";

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      userApi.middleware, 
      authApi.middleware,
      contactApi.middleware,
      pipelineApi.middleware,
      calenderApi.middleware
    ),
});

export default store;
export type AppDispatch = typeof store.dispatch;
export type AppState = ReturnType<typeof store.getState>;
