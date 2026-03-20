import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

type AiHistoryItem = {
  id: string;
  queryText: string;
  uiType?: string;
  updatedAt?: string;
};

type AiHistoryResponse = {
  success: boolean;
  items: AiHistoryItem[];
};

type AiQueryResponse = Record<string, unknown>;

export const aiReportApi = createApi({
  reducerPath: "aiReportApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/ai-filter",
    credentials: "include",
  }),
  endpoints: (builder) => ({
    runAiQuery: builder.mutation<AiQueryResponse, { query: string; queryDisplay?: string }>({
      query: (body) => ({
        url: "/run",
        method: "POST",
        body,
      }),
    }),
    getAiHistory: builder.query<AiHistoryResponse, { limit?: number }>({
      query: ({ limit = 20 }) => ({
        url: `/history?limit=${limit}`,
        method: "GET",
      }),
    }),
  }),
});

export const { useRunAiQueryMutation, useGetAiHistoryQuery } = aiReportApi;
