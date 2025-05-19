import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { userApi } from "./userApi";
import { setIsAuthenticated, setUser } from "../features/authSlice";
import { IUser } from "@/app/models/User";


interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface GoogleSignInRequest {
  token: string;
}

interface AuthResponse {
  success: boolean;
  token: string;
  user: IUser;
}

interface LogoutResponse {
  success: boolean;
  message: string;
}

// Define the authApi with TypeScript

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `/api`,
    credentials: "include", // Enable credentials (cookies, auth headers)
  }),
  endpoints: (builder) => ({
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (body) => ({
        url: "/auth/sign-up",
        method: "POST",
        body,
      }),
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser(data.user));
          dispatch(setIsAuthenticated(true));
          await dispatch(userApi.endpoints.getMe.initiate());
        } catch (error) {
          console.error("Register error:", error);
        }
      },
    }),
    googleSignIn: builder.mutation<AuthResponse, GoogleSignInRequest>({
      query: (body) => ({
        url: `/register/${process.env.NEXT_PUBLIC_PROJECT_ID || ""}`,
        method: "POST",
        body,
      }),
      async onQueryStarted(_args, {dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser(data.user));
          dispatch(setIsAuthenticated(true));
          await dispatch(userApi.endpoints.getMe.initiate());
        } catch (error) {
          console.error("Google Sign-In error:", error);
        }
      },
    }),
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({
        url: "/auth/sign-in",
        method: "POST",
        body,
      }),
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser(data.user));
          dispatch(setIsAuthenticated(true));
          await dispatch(userApi.endpoints.getMe.initiate());
        } catch (error) {
          console.error("Login error:", error);
        }
      },
    }),
    logout: builder.query<LogoutResponse, void>({
      query: () => "/logout",
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(setUser(null));
          dispatch(setIsAuthenticated(false));
          dispatch(userApi.util.resetApiState()); // Clear userApi cache
        } catch (error) {
          console.error("Logout error:", error);
        }
      },
    }),
  }),
});

// Export typed hooks
export const {
  useLoginMutation,
  useRegisterMutation,
  useLazyLogoutQuery,
  useGoogleSignInMutation,
} = authApi;