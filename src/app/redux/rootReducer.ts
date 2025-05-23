import { combineReducers } from "redux";

import { userApi } from "./api/userApi";
import { authApi } from "./api/authApi";
import { userSlice } from "./features/authSlice";
import { contactApi } from "./api/contactApi";
import { pipelineApi } from "./api/pipelineApi";

const rootReducer = combineReducers({
  user: userSlice.reducer,
  [userApi.reducerPath]: userApi.reducer,
  [authApi.reducerPath]: authApi.reducer,
  [contactApi.reducerPath]: contactApi.reducer,
  [pipelineApi.reducerPath]: pipelineApi.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
