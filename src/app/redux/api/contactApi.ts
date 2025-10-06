/* eslint-disable @typescript-eslint/no-explicit-any */
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { IContact } from "@/app/models/Contact";
import { FilterParams } from "@/components/tables/ContactTableOne";


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
  tags?: { name: string }[]; // Send only name, backend sets user
}

interface UpdateContactResponse {
  success: boolean;
  data: ResponseContact;
}

interface GetContactByIdResponse {
  success: boolean;
  data: ResponseContact;
}

interface AssignContactsRequest {
  contactIds: string[];
  userIds: string[];
  assignType: "every" | "equally" | "roundRobin";
  isAddAsNewLead?: boolean;
}

interface AssignContactsResponse {
  message: string;
}

interface UpdateProbabilityResponse {
  message: string;
  contact: {
    _id: string;
    probability: number;
  };
}

interface UpdateContactNotesRequest {
  id: string;
  tags?: { name: string; user?: string }[];
  notes?: string;
}

interface UpdateContactNotesResponse {
  message: string;
  contact: ResponseContact;
}

interface CreateCalendarEventRequest {
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  extendedProps: { calendar: string };
  contactResponse?: string;
}

export interface Tag {
  user: string;
  name: string;
}
interface GetContactNotesAndTagsResponse {
  message: string;
  notes: string;
  tags: Tag[];
}

interface ContactPayload {
  contacts: any[];
  assignedUsers: string[];
  assignType: "every" | "equally" | "roundRobin";
  addToPipeline: boolean;
}

interface CheckDuplicatesRequest {
  contacts: Partial<IContact>[];
}

interface CheckDuplicatesResponse {
  totalContacts: number;
  duplicateCount: number;
  newCount: number;
  duplicates: { email: string; name: string; phone: string }[];
  newContacts: { email: string; name: string; phone: string }[];
}

interface BulkImportContactsResponse {
  message: string;
  contacts: ResponseContact[];
  failed: { contact: any; error: string }[];
}

interface CreateContactResponseResponse {
  message: string;
}

interface CreateContactResponseResponse {
  message: string;
  id:string;
}

export interface ContactResponseItem {
  _id: string;
  contact: string;
  activity:
    | "HAD_CONVERSATION"
    | "CALLED_NOT_PICKED"
    | "CALLED_INVALID"
    | "CALLED_SWITCHED_OFF"
    | "WHATSAPP_COMMUNICATED"
    | "ONLINE_MEETING_SCHEDULED"
    | "OFFLINE_MEETING_SCHEDULED"
    | "ONLINE_MEETING_CONFIRMED"
    | "OFFLINE_MEETING_CONFIRMED"
    | "PROPOSAL_SHARED"
    | "PAYMENT_DONE_ADVANCE"
    | "PAYMENT_DONE_PENDING"
    | "FULL_PAYMENT_DONE"
    | "PAYMENT_DONE_MONTHLY"
    | "OTHER";
  note?: string;
  date?:string;
  meetingScheduledDate?:any;
  createdAt: string;
  updatedAt: string;
}

interface UpdateContactResponseRequest {
  contactId: string;
  responseId: string;
  activity: ContactResponseItem["activity"];
  note?: string;
}

interface UpdateContactResponseResponse {
  message: string;
}

type GetContactResponsesResponse = ContactResponseItem[];

interface CreateContactResponseRequest {
  contactId: string;
  meetingScheduledDate:any;
  activity: ContactResponseItem["activity"];
  note?: string;
}

interface GetContactResponseByIdResponse {
  message: string;
  data: ContactResponseItem;
}

interface CalendarEventResponse {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  extendedProps: { calendar: string };
  contactResponse: string | null;
}

interface CalendarEventByResponseIdResponse {
  message: string;
  data: CalendarEventResponse;
}

interface UpdateCalendarEventRequest {
  title?: string;
  start?: string;
  end?: string;
  allDay?: boolean;
  extendedProps?: { calendar: string };
  contactResponse?: string;
}


export const contactApi = createApi({
  reducerPath: "contactApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    credentials: "include",
  }),
  tagTypes: ["Contacts", "ContactResponses","CalendarEvents"],
  endpoints: (builder) => ({
    createContact: builder.mutation<ContactResponse, ContactRequest>({
      query: (body) => ({
        url: "/contacts",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Contacts"],
    }),
     bulkImportContacts: builder.mutation<BulkImportContactsResponse, ContactPayload>({
      query: (body) => ({
        url: "/contacts/bulk",
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
    checkContactDuplicates: builder.mutation<CheckDuplicatesResponse, CheckDuplicatesRequest>({
      query: (body) => ({
        url: "/contacts/check-duplicates",
        method: "POST",
        body,
      }),
      invalidatesTags: [],
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
    assignContacts: builder.mutation<AssignContactsResponse, AssignContactsRequest>({
      query: (body) => ({
        url: "/contacts/assign",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Contacts"],
    }),
     updateProbability: builder.mutation<UpdateProbabilityResponse, { id: string; probability: number }>({
      query: ({ id, probability }) => ({
        url: `/contacts/probability/${id}`,
        method: "PATCH",
        body: { probability },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Contacts", id }, { type: "Contacts", id: "LIST" }],
    }),
    updateContactNotes: builder.mutation<UpdateContactNotesResponse, UpdateContactNotesRequest>({
      query: ({ id, ...body }) => ({
        url: `/contacts/notes/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Contacts", id }, { type: "Contacts", id: "LIST" }],
    }),
    getContactNotesAndTags: builder.query<GetContactNotesAndTagsResponse, string>({
      query: (id) => ({
        url: `/contacts/notes/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Contacts", id }],
    }),
    createContactResponse: builder.mutation<CreateContactResponseResponse, CreateContactResponseRequest>({
      query: ({ contactId, ...body }) => ({
        url: `/contacts/${contactId}/response`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { contactId }) => [
        { type: "Contacts", id: contactId },
        { type: "ContactResponses", id: contactId },
      ],
    }),
    updateContactResponse: builder.mutation<UpdateContactResponseResponse, UpdateContactResponseRequest>({
      query: ({ contactId, responseId, ...body }) => ({
        url: `/contacts/${contactId}/response/${responseId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { contactId }) => [
        { type: "Contacts", id: contactId },
        { type: "ContactResponses", id: contactId },
      ],
    }),
    getContactResponses: builder.query<GetContactResponsesResponse, string>({
      query: (contactId) => ({
        url: `/contacts/${contactId}/response`,
        method: "GET",
      }),
      providesTags: (result, error, contactId) => [
        { type: "ContactResponses", id: contactId },
      ],
    }),
    getContactResponseById: builder.query<GetContactResponseByIdResponse, { contactId: string; responseId: string }>({
      query: ({ contactId, responseId }) => ({
        url: `/contacts/${contactId}/response/${responseId}`,
        method: "GET",
      }),
      providesTags: (result, error, { contactId }) => [
        { type: "ContactResponses", id: contactId },
      ],
    }),
    createCalendarEvent: builder.mutation<CalendarEventResponse, CreateCalendarEventRequest>({
      query: (body) => ({
        url: "/calendar/meeting",
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { contactResponse }) => [
        { type: "CalendarEvents", id: contactResponse || "LIST" },
      ],
    }),
    updateCalendarEventByResponseId: builder.mutation<CalendarEventByResponseIdResponse, { responseId: string; event: UpdateCalendarEventRequest }>({
      query: ({ responseId, event }) => ({
        url: `/calendar/meeting/${responseId}`,
        method: "PUT",
        body: event,
      }),
      invalidatesTags: (result, error, { responseId }) => [
        { type: "CalendarEvents", id: responseId },
      ],
    }),
    getCalendarEventByResponseId: builder.query<CalendarEventByResponseIdResponse, string>({
      query: (responseId) => ({
        url: `/calendar/meeting/${responseId}`,
        method: "GET",
      }),
      providesTags: (result, error, responseId) => [
        { type: "CalendarEvents", id: responseId },
      ],
    }),
  }),
});

export const {
  useCreateContactMutation,
  useBulkImportContactsMutation,
  useCheckContactDuplicatesMutation,
  useGetContactsQuery,
  useUpdateContactsPipelineMutation,
  useBatchUpdateContactDragMutation,
  useGetContactByIdQuery,
  useUpdateContactMutation,
  useAssignContactsMutation,
  useUpdateProbabilityMutation,
  useUpdateContactNotesMutation,
  useGetContactNotesAndTagsQuery,
  useCreateContactResponseMutation,
  useUpdateContactResponseMutation,
  useGetContactResponsesQuery,
  useGetContactResponseByIdQuery,
  useCreateCalendarEventMutation,
  useUpdateCalendarEventByResponseIdMutation,
  useGetCalendarEventByResponseIdQuery,
} = contactApi;