import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Interface for lean pipeline (only name and _id)
interface LeanPipeline {
  _id: string;
  name: string;
}

// Interface for lean stage
interface LeanStage {
  _id: string;
  pipeline_id: string;
  name: string;
  order: number;
  probability: number;
  created_at: Date;
  updated_at: Date;
}

// Interface for minimal stage (only name and order)
interface MinimalStage {
  _id: string;
  name: string;
  order: number;
}

// Interface for lean contact
interface LeanContact {
  _id: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  assignedTo: Array<{ user: { name: string; email: string }; time: Date }>;
  pipelinesActive: Array<{
    pipeline_id: string;
    stage_id: string;
    order: number;
  }>;
  tags: Array<{ user: { name: string; email: string }; name: string }>;
  user?: { name: string; email: string };
  uid?: number;
  activities: Array<{
    action: string;
    user: { name: string; email: string };
    details: Record<string, unknown>;
    createdAt: Date;
  }>;
  value?:number;
  probability?:number;
  createdAt: Date;
  updatedAt: Date;
}

interface ResponsePipeline {
  _id: string;
  name: string;
  notes?: string | null;
  user: { name: string; email: string };
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

// Interface for pipeline with stages and contacts
interface PipelineWithDetails extends ResponsePipeline {
  stages: LeanStage[];
  contacts: LeanContact[];
}

// Interface for stage request
interface StageRequest {
  name: string;
  order: number;
  probability?: number;
}

// Interface for GET pipelines request parameters
interface GetPipelinesRequest {
  page?: number;
  limit?: number;
  search?: string;
  createdFrom?: string;
  createdTo?: string;
}

interface GetPipelinesResponse {
  pipelines: ResponsePipeline[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

interface GetPipelineByIdResponse {
  pipeline: PipelineWithDetails | null;
}

interface PipelineRequest {
  name: string;
  notes?: string;
  userId: string;
  stages?: StageRequest[];
}

interface PipelineResponse {
  message?: string;
  pipeline: ResponsePipeline;
}

interface GetContactsByStageResponse {
  contacts: LeanContact[];
}

// Interface for lean pipelines response
interface GetAllPipelinesLeanResponse {
  success: boolean;
  data: LeanPipeline[];
}

// Interface for stages by pipelineId response
interface GetStagesByPipelineIdResponse {
  success: boolean;
  data: MinimalStage[];
}

export const pipelineApi = createApi({
  reducerPath: "pipelineApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    credentials: "include",
  }),
  tagTypes: ["Pipelines", "Contacts", "Stages"],
  endpoints: (builder) => ({
    createPipeline: builder.mutation<PipelineResponse, PipelineRequest>({
      query: (body) => ({
        url: "/pipelines",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Pipelines", "Stages"],
    }),
    getPipelines: builder.query<GetPipelinesResponse, GetPipelinesRequest>({
      query: ({ page = 1, limit = 10, search = "", createdFrom = "", createdTo = "" }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(search && { search }),
          ...(createdFrom && { createdFrom }),
          ...(createdTo && { createdTo }),
        });
        return `/pipelines?${params.toString()}`;
      },
      providesTags: ["Pipelines"],
    }),
    getPipelineById: builder.query<GetPipelineByIdResponse, string>({
      query: (id) => `/pipelines/pipeline-by-id/${id}`,
      providesTags: (result, error, id) => [{ type: "Pipelines", id }],
    }),
    getContactsByStage: builder.query<GetContactsByStageResponse, { pipelineId: string; stageId: string }>({
      query: ({ pipelineId, stageId }) => ({
        url: `/contacts/by-stage?pipelineId=${pipelineId}&stageId=${stageId}`,
        method: "GET",
      }),
      providesTags: (result, error, { pipelineId, stageId }) => [
        { type: "Contacts", id: `${pipelineId}-${stageId}` },
      ],
    }),
    getAllPipelinesLean: builder.query<GetAllPipelinesLeanResponse, void>({
      query: () => ({
        url: "/pipelines/names",
        method: "GET",
      }),
      providesTags: ["Pipelines"],
    }),
    getStagesByPipelineId: builder.query<GetStagesByPipelineIdResponse, string>({
      query: (pipelineId) => ({
        url: `/pipelines/stages/${pipelineId}`,
        method: "GET",
      }),
      providesTags: (result, error, pipelineId) => [{ type: "Stages", id: pipelineId }],
    }),
  }),
});

export const {
  useCreatePipelineMutation,
  useGetPipelinesQuery,
  useGetPipelineByIdQuery,
  useGetContactsByStageQuery,
  useGetAllPipelinesLeanQuery,
  useGetStagesByPipelineIdQuery,
} = pipelineApi;