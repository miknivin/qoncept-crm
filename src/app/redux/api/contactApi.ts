import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { IContact } from "@/app/models/Contact";


export interface ResponseActivity {
  _id: string;
  action:
    | 'CONTACT_CREATED'
    | 'CONTACT_UPDATED'
    | 'TAG_ADDED'
    | 'TAG_REMOVED'
    | 'NOTE_ADDED'
    | 'NOTE_UPDATED'
    | 'PIPELINE_ADDED'
    | 'PIPELINE_STAGE_UPDATED'
    | 'ASSIGNED_TO_UPDATED';
  user: { _id: string; name: string; email?: string };
  details: Record<string, unknown>;
  createdAt: string;
}
export type ResponseContact = Omit<IContact, "uid" | "activities"> & {
  _id: string;
  activities: ResponseActivity[];
};
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

interface UpdateContactRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  userId: string;
}

interface UpdateContactResponse {
  success: boolean;
  data: ResponseContact;
}

interface GetContactByIdResponse {
  success: boolean;
  data: ResponseContact;
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
    getContactById: builder.query<GetContactByIdResponse, string>({
      query: (id) => ({
        url: `/contacts/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Contacts", id }],
    }),
    updateContact: builder.mutation<UpdateContactResponse, UpdateContactRequest>({
      query: ({ id, ...body }) => ({
        url: `/contacts/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Contacts", id }, { type: "Contacts", id: "LIST" }],
    }),
  }),
});

export const {
  useCreateContactMutation,
  useGetContactsQuery,
  useUpdateContactsPipelineMutation,
  useBatchUpdateContactDragMutation,
  useGetContactByIdQuery,
  useUpdateContactMutation
} = contactApi;