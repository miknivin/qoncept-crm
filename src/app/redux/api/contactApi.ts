import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { IContact } from "@/app/models/Contact";

export type ResponseContact = Omit<IContact, "activities" | "uid"> & { _id: string };

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FilterContactsResponse {
  message: string;
  contacts: ResponseContact[];
  pagination: Pagination;
}

interface FilterParams {
  assignedTo?: string;
  pipelineNames?: string[];
  tags?: string[];
}

interface FilterContactsRequest {
  page?: number;
  limit?: number;
  keyword?: string;
  filter?: FilterParams;
}

interface ContactRequest {
  name: string;
  email: string;
  phone: string;
  userId: string;
  notes?: string;
  tags?: string[];
}

interface ContactResponse {
  message: string;
  contact: IContact;
}

interface UpdateContactsPipelineResponse {
  success: boolean;
  message: string;
  data: ResponseContact[];
}

interface UpdateContactsPipelineRequest {
  contactIds: string[];
  pipelineId: string;
  stageId: string;
  userId: string;
}

interface BatchUpdateContactDragRequest {
  updates: {
    contactId: string;
    pipelineId: string;
    stageId: string;
    order: number;
    userId?: string;
  }[];
}

interface BatchUpdateContactDragResponse {
  success: boolean;
  data: ResponseContact[];
}

export const contactApi = createApi({
  reducerPath: "contactApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    credentials: "include",
  }),
  tagTypes: ["Contacts"],
  endpoints: (builder) => ({
    createContact: builder.mutation<ContactResponse, ContactRequest>({
      query: (body) => ({
        url: "/contacts",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Contacts"],
    }),
    getContacts: builder.query<FilterContactsResponse, FilterContactsRequest>({
      query: ({ page = 1, limit = 10, keyword = "", filter = {} }) => ({
        url: `/contacts/filter?page=${page}&limit=${limit}${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ""}`,
        method: "POST",
        body: filter,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.contacts.map(({ _id }) => ({ type: "Contacts" as const, id: _id })),
              { type: "Contacts", id: "LIST" },
            ]
          : [{ type: "Contacts", id: "LIST" }],
    }),
    updateContactsPipeline: builder.mutation<UpdateContactsPipelineResponse, UpdateContactsPipelineRequest>({
      query: (body) => ({
        url: "/contacts/update-pipeline",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Contacts"],
    }),
    batchUpdateContactDrag: builder.mutation<BatchUpdateContactDragResponse, BatchUpdateContactDragRequest>({
      query: (body) => ({
        url: "/contacts/update-drag/batch",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Contacts"],
    }),
  }),
});

export const {
  useCreateContactMutation,
  useGetContactsQuery,
  useUpdateContactsPipelineMutation,
  useBatchUpdateContactDragMutation,
} = contactApi;